using Microsoft.AspNetCore.Identity;
using SalesInventoryAPI.Models;

namespace SalesInventoryAPI.Data
{
    public class AppDbInitializer
    {
        public static async Task SeedUsersAndRolesAsync(IApplicationBuilder applicationBuilder)
        {
            using (var serviceScope = applicationBuilder.ApplicationServices.CreateScope())
            {

                //Roles
                var roleManager = serviceScope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();

                if (!await roleManager.RoleExistsAsync(UserRoles.Admin))
                    await roleManager.CreateAsync(new IdentityRole(UserRoles.Admin));

                if (!await roleManager.RoleExistsAsync(UserRoles.User))
                    await roleManager.CreateAsync(new IdentityRole(UserRoles.User)); 

                if (!await roleManager.RoleExistsAsync(UserRoles.Accountant))
                    await roleManager.CreateAsync(new IdentityRole(UserRoles.Accountant)); 

                if (!await roleManager.RoleExistsAsync(UserRoles.SuperAdmin))
                    await roleManager.CreateAsync(new IdentityRole(UserRoles.SuperAdmin));
                
                if (!await roleManager.RoleExistsAsync(UserRoles.Warehouse))
                    await roleManager.CreateAsync(new IdentityRole(UserRoles.Warehouse));

                if (!await roleManager.RoleExistsAsync(UserRoles.SalesAdmin))
                    await roleManager.CreateAsync(new IdentityRole(UserRoles.SalesAdmin));

                //Users
                var userManager = serviceScope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
                
                //string adminUserEmail = "admin@darosoft.com";
                //var adminUser = await userManager.FindByEmailAsync(adminUserEmail);
                //if (adminUser == null)
                //{
                //    var newAdminUser = new ApplicationUser()
                //    {
                //        FirstName = "Admin User",
                //        LastName = "Admin User",
                //        UserName = "admin-user",
                //        Email = adminUserEmail,
                //        EmailConfirmed = true,
                //        IsActive=1,
                //        IsDeleted=0
                //    };
                //    await userManager.CreateAsync(newAdminUser, "Coding@1234?");
                //    await userManager.AddToRoleAsync(newAdminUser, UserRoles.Admin);
                //}


               //string appUserEmail = "user@darosoft.com";

                //var appUser = await userManager.FindByEmailAsync(appUserEmail);
                //if (appUser == null)
                //{
                //    var newAppUser = new ApplicationUser()
                //    {
                //        FirstName = "Application User",
                //        LastName = "Application User",
                //        UserName = "app-user",
                //        Email = appUserEmail,
                //        EmailConfirmed = true,
                //        IsActive = 1,
                //        IsDeleted = 0
                //        };
                //    await userManager.CreateAsync(newAppUser, "Coding@1234?");
                //    await userManager.AddToRoleAsync(newAppUser, UserRoles.User);
                //}

                string SuperadminUserEmail = "superadmin@darosoft.com";
                var Superadmin = await userManager.FindByEmailAsync(SuperadminUserEmail);
                if (Superadmin == null)
                {
                    var newAdminUser = new ApplicationUser()
                    {
                        FirstName = "Super User",
                        LastName = "Super User",
                        UserName = "Super-user",
                        Email = SuperadminUserEmail,
                        EmailConfirmed = true,
                        IsActive = 1,
                        IsDeleted = 0
                        };
                    await userManager.CreateAsync(newAdminUser, "Coding@1234?");
                    await userManager.AddToRoleAsync(newAdminUser, UserRoles.SuperAdmin);
                }
            }
        }
    }
}
