using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SalesInventoryAPI.Data;
using SalesInventoryAPI.Data.Services;
using SalesInventoryAPI.Data.ViewModels;
using SalesInventoryAPI.Models;
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;

namespace SalesInventoryAPI.Controller
    {
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
        {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly RoleManager<IdentityRole> _roleManager;
        private readonly InventoryDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly TokenValidationParameters _tokenValidationParameters;
        private readonly ActivityLogRepository _activityLogRepository;


        public AuthController ( UserManager<ApplicationUser> userManager, SignInManager<ApplicationUser> signInManager, RoleManager<IdentityRole> roleManager, InventoryDbContext context, IConfiguration configuration, TokenValidationParameters tokenValidationParameters, ActivityLogRepository activityLogRepository )
            {
            _userManager = userManager;
            _roleManager = roleManager;
            _context = context;
            _configuration = configuration;
            _tokenValidationParameters = tokenValidationParameters;
            _activityLogRepository = activityLogRepository;
            _signInManager = signInManager;
            }

        [HttpPost("register-user")]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<IActionResult> Register ( [FromBody] RegisterVM registerVM )
            {
            try
                {
                if (!ModelState.IsValid)
                    {
                    return BadRequest(new { Succeeded = false, Message = "Please, provide all the required fields" });
                    }

                var userExists = await _userManager.FindByEmailAsync(registerVM.EmailAddress);
                if (userExists != null)
                    {
                    return BadRequest(new { Succeeded = false, Message = $"User {registerVM.EmailAddress} already exists" });
                    }

                ApplicationUser newUser = new ApplicationUser()
                    {
                    FirstName = registerVM.FirstName,
                    LastName = registerVM.LastName,
                    Email = registerVM.EmailAddress,
                    UserName = registerVM.UserName,
                    Title = registerVM.Title,
                    Department = registerVM.Department,
                    IsActive = 1,
                    IsDeleted = 0,
                    SecurityStamp = Guid.NewGuid().ToString()
                    };

                var result = await _userManager.CreateAsync(newUser, registerVM.Password);

                if (result.Succeeded)
                    {
                    // Add user Role
                    switch (registerVM.Role)
                        {
                        case UserRoles.Admin:
                            if (!await _roleManager.RoleExistsAsync(UserRoles.Admin))
                                {
                                await _roleManager.CreateAsync(new IdentityRole(UserRoles.Admin));
                                }
                            await _userManager.AddToRoleAsync(newUser, UserRoles.Admin);
                            break;

                        case UserRoles.Accountant:
                            if (!await _roleManager.RoleExistsAsync(UserRoles.Accountant))
                                {
                                await _roleManager.CreateAsync(new IdentityRole(UserRoles.Accountant));
                                }
                            await _userManager.AddToRoleAsync(newUser, UserRoles.Accountant);
                            break;

                        case UserRoles.User:
                            if (!await _roleManager.RoleExistsAsync(UserRoles.User))
                                {
                                await _roleManager.CreateAsync(new IdentityRole(UserRoles.User));
                                }
                            await _userManager.AddToRoleAsync(newUser, UserRoles.User);
                            break;

                        case UserRoles.SalesAdmin:
                            if (!await _roleManager.RoleExistsAsync(UserRoles.SalesAdmin))
                                {
                                await _roleManager.CreateAsync(new IdentityRole(UserRoles.SalesAdmin));
                                }
                            await _userManager.AddToRoleAsync(newUser, UserRoles.SalesAdmin);
                            break;

                        case UserRoles.SuperAdmin:
                            if (!await _roleManager.RoleExistsAsync(UserRoles.SuperAdmin))
                                {
                                await _roleManager.CreateAsync(new IdentityRole(UserRoles.SuperAdmin));
                                }
                            await _userManager.AddToRoleAsync(newUser, UserRoles.SuperAdmin);
                            break;
                        case UserRoles.Warehouse:
                            if (!await _roleManager.RoleExistsAsync(UserRoles.Warehouse))
                                {
                                await _roleManager.CreateAsync(new IdentityRole(UserRoles.Warehouse));
                                }
                            await _userManager.AddToRoleAsync(newUser, UserRoles.Warehouse);
                            break;

                        default:
                            break;
                        }

                    return Ok(new { Succeeded = true, Message = "User created successfully" });
                    }


                var errorMessages = result.Errors.Select(e => e.Description).ToList();

                return BadRequest(new { Succeeded = false, Message = "User could not be created", Errors = errorMessages });
                }
            catch (Exception ex)
                {

                Console.WriteLine($"Error: {ex.Message}");
                return StatusCode(500, "Internal server error.");
                }
            }
        [AllowAnonymous]
        [HttpPost("login-user")]
        public async Task<IActionResult> Login ( [FromBody] LoginVM loginVM )
            {
            if (!ModelState.IsValid)
                return BadRequest("Please, provide all required fields");

            // 1) Fetch user by email
            var user = await _userManager.Users
                .FirstOrDefaultAsync(u => u.Email == loginVM.EmailAddress);

            if (user == null)
                return Unauthorized(new { message = "Invalid email or password" });

            // 2) Check deleted/inactive
            if (user.IsDeleted == 1 && user.IsActive == 0)
                return Unauthorized(new { message = "User deleted or inactive" });

            // 3) Validate password
            if (!await _userManager.CheckPasswordAsync(user, loginVM.Password))
                return Unauthorized(new { message = "Invalid email or password" });

            // ===== NEW: If there's already an active SessionId, block this login =====
            if (!string.IsNullOrEmpty(user.CurrentSessionId))
                {
                // 3A) Look up a non‐revoked refresh token for that user (if any)
                var existingRefresh = await _context.RefreshTokens
                    .Where(rt => rt.UserId == user.Id && !rt.IsRevoked)
                    .OrderByDescending(rt => rt.DateAdded)
                    .FirstOrDefaultAsync();

                _context.RefreshTokens.Update(existingRefresh);
                await _context.SaveChangesAsync();
                user.CurrentSessionId = null;
                await _userManager.UpdateAsync(user);

                }

            // 4) Generate & save a new SessionId in the user record
            var newSessionId = Guid.NewGuid().ToString();
            user.CurrentSessionId = newSessionId;
            await _userManager.UpdateAsync(user);

            // 5) Generate JWT + RefreshToken
            var authResult = await GenerateJWTTokenAsync(user, newSessionId, null);
            return Ok(authResult);
            }




        [HttpPost("refresh-token")]
        public async Task<IActionResult> RefreshToken ( [FromBody] TokenRequestVM tokenRequestVM )
            {
            if (!ModelState.IsValid)
                {
                return BadRequest("Please, provide all required fields");
                }

            var result = await VerifyAndGenerateTokenAsync(tokenRequestVM);
            return Ok(result);
            }

        private async Task<AuthResultVM> VerifyAndGenerateTokenAsync ( TokenRequestVM tokenRequestVM )
            {
            var jwtTokenHandler = new JwtSecurityTokenHandler();
            var storedToken = await _context.RefreshTokens.FirstOrDefaultAsync(x => x.Token == tokenRequestVM.RefreshToken);
            var dbUser = await _userManager.FindByIdAsync(storedToken.UserId);

            try
                {
                var tokenCheckResult = jwtTokenHandler.ValidateToken(tokenRequestVM.Token, _tokenValidationParameters, out var validatedToken);

                return await GenerateJWTTokenAsync(dbUser, null, storedToken);
                }
            catch (SecurityTokenExpiredException)
                {
                if (storedToken.DateExpire >= DateTime.Now)
                    {
                    return await GenerateJWTTokenAsync(dbUser, null, storedToken);
                    }
                else
                    {
                    return await GenerateJWTTokenAsync(dbUser, null, null);
                    }
                }
            }

        private async Task<AuthResultVM> GenerateJWTTokenAsync ( ApplicationUser user, string sessionId, RefreshToken rToken )
            {
            var authClaims = new List<Claim>
    {
        new Claim(ClaimTypes.Name, user.UserName),
        new Claim(ClaimTypes.NameIdentifier, user.Id),
        new Claim(JwtRegisteredClaimNames.Email, user.Email),
        new Claim(JwtRegisteredClaimNames.Sub, user.Email),
        new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
         new Claim("SessionId", sessionId)
    };

            // Add user role claims along with role IDs
            var userRoles = await _userManager.GetRolesAsync(user);
            foreach (var userRole in userRoles)
                {
                // Add role name claim
                authClaims.Add(new Claim(ClaimTypes.Role, userRole));

                // Retrieve role details to get the role ID
                var role = await _roleManager.FindByNameAsync(userRole);
                if (role != null)
                    {
                    // Add a custom claim for RoleId
                    authClaims.Add(new Claim("RoleId", role.Id));
                    }
                }

            var authSigningKey = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(_configuration["JWT:Secret"]));

            var token = new JwtSecurityToken(
                issuer: _configuration["JWT:Issuer"],
                audience: _configuration["JWT:Audience"],
                expires: DateTime.Now.AddHours(1),
                claims: authClaims,
                signingCredentials: new SigningCredentials(authSigningKey, SecurityAlgorithms.HmacSha256));

            var jwtToken = new JwtSecurityTokenHandler().WriteToken(token);

            if (rToken != null)
                {
                var rTokenResponse = new AuthResultVM()
                    {
                    Token = jwtToken,
                    RefreshToken = rToken.Token,
                    ExpiresAt = token.ValidTo
                    };
                return rTokenResponse;
                }

            var refreshToken = new RefreshToken()
                {
                JwtId = token.Id,
                IsRevoked = false,
                UserId = user.Id,
                DateAdded = DateTime.Now,
                DateExpire = DateTime.Now.AddMonths(6),
                Token = Guid.NewGuid().ToString() + "-" + Guid.NewGuid().ToString()
                };
            await _context.RefreshTokens.AddAsync(refreshToken);
            await _context.SaveChangesAsync();

            var response = new AuthResultVM()
                {
                Token = jwtToken,
                RefreshToken = refreshToken.Token,
                ExpiresAt = token.ValidTo
                };

            return response;
            }

        [HttpGet("users-list")]
        public async Task<IActionResult> ListUsers ( )
            {
            List<ApplicationUser> userList = new List<ApplicationUser>();

            // Check if the logged in user is an Admin or SuperAdmin
            bool isAdmin = User.IsInRole("Admin") || User.IsInRole("SuperAdmin");

            if (isAdmin)
                {
                // If admin, retrieve all users
                userList = await _userManager.Users.Where(a=>a.IsDeleted==0 && a.IsActive==1).ToListAsync();
                }
            else
                {
                // Otherwise, only return the logged in user's details.
                // Get the current user's Id from the claims.
                var currentUserId = _userManager.GetUserId(User);
                if (string.IsNullOrEmpty(currentUserId))
                    {
                    return Unauthorized(new { Succeeded = false, Message = "User is not logged in" });
                    }

                var currentUser = await _userManager.FindByIdAsync(currentUserId);
                if (currentUser != null)
                    {
                    userList.Add(currentUser);
                    }
                else
                    {
                    return NotFound(new { Succeeded = false, Message = "User not found" });
                    }
                }

            var users = new List<UsersVM>();

            foreach (var c in userList)
                {
                var roles = await _userManager.GetRolesAsync(c);
                users.Add(new UsersVM()
                    {
                    UsersId = c.Id,
                    FirstName = c.FirstName,
                    LastName = c.LastName,
                    UserName = c.UserName,
                    EmailAddress = c.Email,
                    Password = c.PasswordHash,
                    Role = string.Join(",", roles)
                    });
                }

            // Project into an anonymous type including an index field.
            var indexedUsers = users.Select(( user, index ) => new
                {
                Index = index + 1, // Indexing starts at 1
                user.UsersId,
                user.FirstName,
                user.LastName,
                user.UserName,
                user.EmailAddress,
                user.Password,
                user.Role
                });

            return Ok(indexedUsers);
            }

        [HttpPut("update-user/{id}")]
        public async Task<IActionResult> Update ( string id, [FromBody] UpdateRegisterVM vm )
            {
            // 1. Get current user and check permissions
            var currentUserId = _userManager.GetUserId(User);
            bool isAdmin = User.IsInRole("Admin") || User.IsInRole("SuperAdmin");
            if (!isAdmin && id != currentUserId)
                return Unauthorized(new { Succeeded = false, Message = "Access denied. You can only update your own details." });

            if (!ModelState.IsValid)
                return BadRequest("Please provide all required fields.");

            // 2. Load the existing user
            var user = await _context.Users.FindAsync(id);
            if (user == null)
                return NotFound();

            // 3. Take a snapshot of old data
            var oldData = new
                {
                user.FirstName,
                user.LastName,
                user.Email,
                user.UserName,
                user.Department,
                user.Title
                };

            // 4. Check for email/username conflicts
            var emailOwner = await _userManager.FindByEmailAsync(vm.EmailAddress);
            if (emailOwner != null && emailOwner.Id != id)
                return BadRequest("Email is already in use by another account.");

            var userByName = await _userManager.FindByNameAsync(vm.UserName);
            if (userByName != null && userByName.Id != id)
                return BadRequest("Username is already taken.");

            // 5. Apply updates
            user.FirstName = vm.FirstName;
            user.LastName = vm.LastName;
            user.Email = vm.EmailAddress;
            user.UserName = vm.UserName;
            user.Department = vm.Department;
            user.Title = vm.Title;

            // 6. Wrap in a transaction so both user update and log insert succeed or fail together
            using var tx = await _context.Database.BeginTransactionAsync();
            try
                {
                // 6a. Persist user changes
                var identityResult = await _userManager.UpdateAsync(user);
                if (!identityResult.Succeeded)
                    {
                    // rollback, return errors
                    await tx.RollbackAsync();
                    return BadRequest(identityResult.Errors.Select(e => e.Description));
                    }

                // 6b. Create log entry
                var newData = new
                    {
                    user.FirstName,
                    user.LastName,
                    user.Email,
                    user.UserName,
                    user.Department,
                    user.Title
                    };
                var activityLog = new ActivityLog
                    {
                    MenuItemId = 1,
                    //ParentTableId = user.Id,
                    ActionType = "Update",
                    OldData = JsonSerializer.Serialize(oldData),
                    NewData = JsonSerializer.Serialize(newData),
                    UserId = currentUserId,
                    Date = DateTime.Now
                    };
                await _activityLogRepository.Create(activityLog);

                // 6c. Commit both changes
                await tx.CommitAsync();

                // 7. Return the updated VM
                return Ok(vm);
                }
            catch (Exception ex)
                {
                await tx.RollbackAsync();
                // Ideally use a logging framework instead of Console.WriteLine
                Console.WriteLine($"Error updating user: {ex}");
                return StatusCode(500, "Internal server error.");
                }
            }


        [HttpGet("get-user/{id}")]
        public async Task<IActionResult> GetUserById ( string id )
            {
            // Get the current user's Id
            var currentUserId = _userManager.GetUserId(User);

            // Check if the current user is an Admin or SuperAdmin
            bool isAdmin = User.IsInRole("Admin") || User.IsInRole("SuperAdmin");

            // If not an admin, ensure the requested id matches the current user's id.
            if (!isAdmin && id != currentUserId)
                {
                return Unauthorized(new { Succeeded = false, Message = "Access denied. You can only view your own details." });
                }

            // Validate the id parameter
            if (string.IsNullOrEmpty(id))
                {
                return NotFound(new { Succeeded = false, Message = "Invalid user id." });
                }

            var user = await _userManager.FindByIdAsync(id);
            if (user == null)
                {
                return NotFound(new { Succeeded = false, Message = "User not found." });
                }

            var roles = await _userManager.GetRolesAsync(user);
            var userVm = new UsersVM()
                {
                UsersId = user.Id,
                FirstName = user.FirstName,
                LastName = user.LastName,
                UserName = user.UserName,
                EmailAddress = user.Email,
                Title = user.Title,
                Department = user.Department,
                
                Role = string.Join(",", roles)
                };

            return Ok(userVm);
            }

        [HttpPut("update-user-password/{id}")]
        public async Task<IActionResult> UpdatePassword ( string id, [FromBody] UpdatePasswordVM updatePasswordVM )
            {
            // Get the current logged-in user's Id.
            var currentUserId = _userManager.GetUserId(User);
            // Check if the current user is an Admin or SuperAdmin.
            bool isAdmin = User.IsInRole("Admin") || User.IsInRole("SuperAdmin");

            // Non-admin users can only update their own password.
            if (!isAdmin && id != currentUserId)
                {
                return Unauthorized(new { Succeeded = false, Message = "Access denied. You can only update your own password." });
                }

            try
                {
                if (!ModelState.IsValid)
                    {
                    return BadRequest(new { Succeeded = false, Message = "Please provide all required fields" });
                    }

                var user = await _userManager.FindByIdAsync(id);
                if (user == null)
                    {
                    return NotFound(new { Succeeded = false, Message = "User not found" });
                    }

                // Verify the current password is correct.
                var passwordValid = await _userManager.CheckPasswordAsync(user, updatePasswordVM.CurrentPassword);
                if (!passwordValid)
                    {
                    return BadRequest(new { Succeeded = false, Message = "Current password is incorrect" });
                    }

                if (updatePasswordVM.NewPassword != updatePasswordVM.ConfirmNewPassword)
                    {
                    return BadRequest(new { Succeeded = false, Message = "New password and confirmation do not match" });
                    }

                var result = await _userManager.ChangePasswordAsync(
                    user,
                    updatePasswordVM.CurrentPassword,
                    updatePasswordVM.NewPassword
                );

                if (!result.Succeeded)
                    {
                    return BadRequest(new { Succeeded = false, Message = result.Errors });
                    }

                return Ok(new { Succeeded = true, Message = "Password updated successfully" });
                }
            catch (Exception ex)
                {
                // Log exception (in production, consider using a logging framework)
                Console.WriteLine($"Error: {ex.Message}");
                return StatusCode(500, "Internal server error.");
                }
            }


        [HttpPut("update-user-role/{id}")]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<IActionResult> UpdateUserRole ( string id, [FromBody] UpdateRoleVM updateRoleVM )
            {
            try
                {
                if (!ModelState.IsValid)
                    {
                    return BadRequest(new { Succeeded = false, Message = "Please provide all required fields" });
                    }

                var user = await _userManager.FindByIdAsync(id);
                if (user == null)
                    {
                    return NotFound(new { Succeeded = false, Message = "User not found" });
                    }

                if (user != null)
                    {
                    var currentRoles = await _userManager.GetRolesAsync(user);

                    if (currentRoles.Any())
                        {
                        var removeResult = await _userManager.RemoveFromRolesAsync(user, currentRoles);
                        if (!removeResult.Succeeded)
                            {
                            return BadRequest(new { Succeeded = false, Message = removeResult.Errors });
                            }
                        }

                    IdentityResult result = null;

                    switch (updateRoleVM.Role)
                        {
                        case UserRoles.Admin:
                            if (!await _roleManager.RoleExistsAsync(UserRoles.Admin))
                                {
                                await _roleManager.CreateAsync(new IdentityRole(UserRoles.Admin));
                                }
                            result = await _userManager.AddToRoleAsync(user, UserRoles.Admin);
                            break;

                        case UserRoles.Accountant:
                            if (!await _roleManager.RoleExistsAsync(UserRoles.Accountant))
                                {
                                await _roleManager.CreateAsync(new IdentityRole(UserRoles.Accountant));
                                }
                            result = await _userManager.AddToRoleAsync(user, UserRoles.Accountant);
                            break;

                        case UserRoles.User:
                            if (!await _roleManager.RoleExistsAsync(UserRoles.User))
                                {
                                await _roleManager.CreateAsync(new IdentityRole(UserRoles.User));
                                }
                            result = await _userManager.AddToRoleAsync(user, UserRoles.User);
                            break;

                        case UserRoles.SalesAdmin:
                            if (!await _roleManager.RoleExistsAsync(UserRoles.SalesAdmin))
                                {
                                await _roleManager.CreateAsync(new IdentityRole(UserRoles.SalesAdmin));
                                }
                            result = await _userManager.AddToRoleAsync(user, UserRoles.SalesAdmin);
                            break;

                        case UserRoles.SuperAdmin:
                            if (!await _roleManager.RoleExistsAsync(UserRoles.SuperAdmin))
                                {
                                await _roleManager.CreateAsync(new IdentityRole(UserRoles.SuperAdmin));
                                }
                            result = await _userManager.AddToRoleAsync(user, UserRoles.SuperAdmin);
                            break;
                        case UserRoles.Warehouse:
                            if (!await _roleManager.RoleExistsAsync(UserRoles.Warehouse))
                                {
                                await _roleManager.CreateAsync(new IdentityRole(UserRoles.Warehouse));
                                }
                            result = await _userManager.AddToRoleAsync(user, UserRoles.Warehouse);
                            break;

                        default:
                            return BadRequest(new { Succeeded = false, Message = "Invalid role specified" });
                        }

                    if (!result.Succeeded)
                        {
                        return BadRequest(new { Succeeded = false, Message = result.Errors });
                        }

                    return Ok(new { Succeeded = true, Message = "User role updated successfully" });
                    }

                return BadRequest(new { Succeeded = false, Message = "User not found or invalid request" });
                }
            catch (Exception ex)
                {
                // Log exception
                Console.WriteLine($"Error: {ex.Message}");
                return StatusCode(500, new { Succeeded = false, Message = "Internal server error" });
                }
            }

        [HttpPost("logout")]
        [AllowAnonymous]
        public async Task<IActionResult> Logout ( [FromBody] LogoutRequest logoutRequest )
            {
            if (string.IsNullOrWhiteSpace(logoutRequest.RefreshToken))
                {
                return BadRequest(new { Succeeded = false, Message = "RefreshToken must be provided." });
                }

            // 1) Look up the refresh token row
            var storedToken = await _context.RefreshTokens
                .FirstOrDefaultAsync(rt => rt.Token == logoutRequest.RefreshToken);

            if (storedToken == null)
                {
                // We don’t reveal “Invalid refresh token” vs “Already revoked”—just say “OK” so clients can't probe.
                return Ok(new { Succeeded = true, Message = "Logged out successfully" });
                }

            // 2) Find the corresponding user
            var user = await _userManager.FindByIdAsync(storedToken.UserId);
            if (user != null)
                {
                // Clear out CurrentSessionId
                user.CurrentSessionId = null;
                await _userManager.UpdateAsync(user);
                }

            // 3) Revoke that refresh token row
            storedToken.IsRevoked = true;
            _context.RefreshTokens.Update(storedToken);
            await _context.SaveChangesAsync();

            return Ok(new { Succeeded = true, Message = "Logged out successfully" });
            }



        public class LogoutRequest
            {
            public string RefreshToken { get; set; }
            }

        [HttpPut("admin-update-user-password/{id}")]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<IActionResult> AdminUpdatePassword ( string id, [FromBody] AdminUpdatePasswordVM updatePasswordVM )
            {
            try
                {


                var user = await _userManager.FindByIdAsync(id);
                if (user == null)
                    {
                    return NotFound(new { Succeeded = false, Message = "User not found" });
                    }

                if (updatePasswordVM.NewPassword != updatePasswordVM.ConfirmNewPassword)
                    {
                    return BadRequest(new { Succeeded = false, Message = "New password and confirmation do not match" });
                    }

                // Generate a password reset token and reset the password
                var token = await _userManager.GeneratePasswordResetTokenAsync(user);
                var result = await _userManager.ResetPasswordAsync(user, token, updatePasswordVM.NewPassword);

                if (!result.Succeeded)
                    {
                    return BadRequest(new { Succeeded = false, Message = result.Errors });
                    }

                return Ok(new { Succeeded = true, Message = "Password updated successfully" });
                }
            catch (Exception ex)
                {
                // Log exception details as needed
                Console.WriteLine($"Error: {ex.Message}");
                return StatusCode(500, "Internal server error.");
                }
            }
        [HttpGet("validate-token")]

        public IActionResult ValidateToken ( )
            {
            // If the token is valid, return an OK response.
            return Ok(new { valid = true, message = "Token is valid" });
            }

        [HttpGet("getUsers")]
        public async Task<IActionResult> GetUsers ( )
            {
            try
                {
                // 1️⃣ Get everyone in the Admin and SuperAdmin roles
                var currentUser = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "System";

                // 2️⃣ Load all users and filter out Admins/SuperAdmins
                var allUsers = await _userManager.Users.ToListAsync();
                var filtered = allUsers
                                   .Where(u => currentUser.Contains(u.Id))
                                   .ToList();

                // 3️⃣ Project into your VM
                var result = filtered
                    .Select(u => new 
                        {
                        UsersId = u.Id,
                        UserName = u.UserName,
                        // …any other fields you need
                        })
                    .ToList();

                return Ok(result);
                }
            catch (Exception ex)
                {
                // TODO: log ex somewhere (e.g. _logger.LogError(ex, "GetUsers failure"))
                return StatusCode(500, new
                    {
                    Succeeded = false,
                    Message = "An error occurred while retrieving users.",
                    Details = ex.Message
                    });
                }
            }

        [HttpDelete("delete-user/{id}")]
        public async Task<IActionResult> DeleteUser ( string id )
            {
            // Get the current logged-in user's id.
            var currentUserId = _userManager.GetUserId(User);
            // Determine if the user has admin privileges.
            bool isAdmin = User.IsInRole("Admin") || User.IsInRole("SuperAdmin");

            // Non-admin users can only update their own details.
            if (!isAdmin && id != currentUserId)
                {
                return Unauthorized(new { Succeeded = false, Message = "Access denied. You can only update your own details." });
                }

            try
                {
                if (!ModelState.IsValid)
                    {
                    return BadRequest("Please, provide all the required fields");
                    }

                // Retrieve the user from the context.
                ApplicationUser user = await _context.Users.FindAsync(id);
                if (user == null)
                    {
                    return NotFound();
                    }

                user.IsDeleted = 1;

                // Update the user in the Identity store.
                IdentityResult result = await _userManager.UpdateAsync(user);
                return result.Succeeded
                    ? Ok("User Delete")
                    : BadRequest(result.Errors.Select(e => e.Description));
                }
            catch (Exception ex)
                {
                // Log the exception
                Console.WriteLine($"Error: {ex.Message}");
                return StatusCode(500, "Internal server error.");
                }
            }

        }
    }
