using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using SalesInventoryAPI.Data;
using SalesInventoryAPI.Data.Services;
using SalesInventoryAPI.Models;
using System;
using System.Text;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using SalesInventoryAPI.Hubs;

var builder = WebApplication.CreateBuilder(args);

// 1) Configure TokenValidationParameters
var tokenValidationParameter = new TokenValidationParameters
    {
    ValidateIssuerSigningKey = true,
    IssuerSigningKey = new SymmetricSecurityKey(
                                   Encoding.ASCII.GetBytes(builder.Configuration["JWT:Secret"])
                               ),

    ValidateIssuer = true,
    ValidIssuer = builder.Configuration["JWT:Issuer"],

    ValidateAudience = true,
    ValidAudience = builder.Configuration["JWT:Audience"],

    ValidateLifetime = true,
    ClockSkew = TimeSpan.Zero
    };
var frontendOrigins = builder.Configuration
    .GetSection("FrontEnd:URLs")
    .Get<string[]>()
    ?? new[] { builder.Configuration["FrontEnd:URL"]! };

// 2) Register CORS:
const string CorsPolicyName = "AllowMyFrontend";
builder.Services.AddSingleton(tokenValidationParameter);

// 2) Standard service registrations
builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicyName, policy =>
    {
        policy
            .WithOrigins(frontendOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});


builder.Services.AddScoped<ErrorsRepository>();
builder.Services.AddScoped<CodeGenerator>();

builder.Services.AddDbContext<InventoryDbContext>(options =>
    options.UseMySql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        new MySqlServerVersion(new Version(8, 0, 32))
    )
);

builder.Services.AddIdentity<ApplicationUser, IdentityRole>()
    .AddEntityFrameworkStores<InventoryDbContext>()
    .AddDefaultTokenProviders();

builder.Services.AddScoped<PermissionService>();
builder.Services.AddScoped<ActivityLogRepository>();
builder.Services.AddScoped<ReviseLogRepository>();
builder.Services.AddScoped<AppFilesService>();
builder.Services.AddScoped<PendingCountsService>();

// SignalR
builder.Services.AddSignalR();

// optionally register the background broadcaster
builder.Services.AddHostedService<PendingCountsBroadcastService>();

// 3) Add Authentication + JwtBearer with OnTokenValidated
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.SaveToken = true;
    options.RequireHttpsMetadata = true;
    options.TokenValidationParameters = tokenValidationParameter;

    options.Events = new JwtBearerEvents
        {
        OnTokenValidated = async context =>
        {
            //
            // ────── A) “Single‐Session” Check ──────
            //
            //  1) Extract userId and SessionId claim from the validated JWT
            var userId = context.Principal.FindFirstValue(ClaimTypes.NameIdentifier);
            var tokenSessionId = context.Principal.FindFirst("SessionId")?.Value;

            if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(tokenSessionId))
                {
                // Missing a required claim ⇒ reject immediately
                context.Fail("Missing required claims.");
                return;
                }

            // 2) Load the ApplicationUser from the database
            var userManager = context.HttpContext.RequestServices
                                     .GetRequiredService<UserManager<ApplicationUser>>();
            var user = await userManager.FindByIdAsync(userId);

            if (user == null || user.CurrentSessionId != tokenSessionId)
                {
                // If there's no matching SessionId in the DB, fail
                context.Fail("Session is no longer valid.");
                return;
                }

            //
            // ────── B) “Refresh‐Token Revocation” Check ──────
            //
            // (Keep your original logic here—if you still want to revoke tokens by jti)
            var jwtId = context.Principal.FindFirstValue(JwtRegisteredClaimNames.Jti);
            if (!string.IsNullOrEmpty(jwtId))
                {
                var dbContext = context.HttpContext.RequestServices
                                      .GetRequiredService<InventoryDbContext>();
                var refreshToken = await dbContext.RefreshTokens
                    .FirstOrDefaultAsync(rt => rt.JwtId == jwtId);

                if (refreshToken == null || refreshToken.IsRevoked)
                    {
                    context.Fail("This token has been revoked.");
                    return;
                    }
                }

            // If we reach here, both SessionId and refresh‐token checks passed ⇒ allow request
        }
        };
});

builder.Services.AddControllers();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
        {
        In = ParameterLocation.Header,
        Description = "Please enter token",
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        BearerFormat = "JWT",
        Scheme = "bearer"
        });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id   = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});
// register your service

var app = builder.Build();

app.UseStaticFiles();

if (app.Environment.IsDevelopment())
    {
    app.UseSwagger();
    app.UseSwaggerUI();
    }

//app.UseSwagger();
//app.UseSwaggerUI();

app.UseCors(CorsPolicyName);
app.UseHttpsRedirection();

// ────── IMPORTANT: Authentication before Authorization ──────
app.UseAuthentication();
app.UseAuthorization();

app.UseExceptionHandler(exceptionHandlerApp => exceptionHandlerApp.Run(async context =>
{
    var exceptionHandlerFeature = context.Features.Get<IExceptionHandlerFeature>();
    var exception = exceptionHandlerFeature?.Error!;

    var error = new Error
        {
        Date = DateTime.Now,
        ErrorMessage = exception.Message,
        StackTrace = exception.StackTrace
        };

    var repository = context.RequestServices.GetRequiredService<ErrorsRepository>();
    await repository.Create(error);

    await Results
        .BadRequest(new
            {
            type = "error",
            message = "An unexpected exception has occurred",
            status = 500
            })
        .ExecuteAsync(context);
}));

app.MapControllers();



app.MapHub<PendingCountsHub>("/hubs/pendingcounts");
// Seed default users and roles (if you have that logic)
AppDbInitializer.SeedUsersAndRolesAsync(app);

app.Run();
