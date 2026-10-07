using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SalesInventoryAPI.Data;
using SalesInventoryAPI.Data.ViewModels;
using SalesInventoryAPI.Models;
using System.Security.Claims;

namespace SalesInventoryAPI.Controller
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class RolesRightsController : ControllerBase
    {
        private readonly RoleManager<IdentityRole> _roleManager;
        private readonly InventoryDbContext _context;
        private readonly ILogger<RolesRightsController> _logger;
        public RolesRightsController(RoleManager<IdentityRole> roleManager, InventoryDbContext context, ILogger<RolesRightsController> logger)
        {
            _roleManager = roleManager;
            _context = context;
            _logger = logger;
        }

        [HttpGet("get-roles")]
        public async Task<IActionResult> GetAllRoles()
        {
            try
            {
                // Retrieve all roles from the database
                var roles = await _roleManager.Roles
                                              .Select(r => new { r.Id, r.Name })
                                              .ToListAsync();

                // Return the list of roles
                return Ok(roles);
            }
            catch (Exception ex)
            {
                // Handle any errors that occur
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("get-rights-menus/{id}")]
        public async Task<IActionResult> GetRightsMenus(int id)
        {
            try
            {
                var rightsmenu = await _context.MenuItems
                    .Where(a => a.IsParent == 1 && a.ModuleItemId == id && a.IsActive == 1)
                    .Select(c => new
                    {
                        c.MenuItemId,
                        c.MenuItemName


                    })
                    .ToListAsync();

                return Ok(rightsmenu);
            }
            catch (Exception ex)
            {
                // Log exception
                Console.WriteLine($"Error: {ex.Message}");
                return StatusCode(500, "Internal server error.");
            }
        }

        [HttpGet("get-modules")]
        public async Task<IActionResult> GetModules()
        {
            try
            {
                var rightsmenu = await _context.ModuleItems
                    .Where(a => a.IsActive == 1)
                    .Select(c => new
                    {
                        c.ModuleItemId,
                        c.ModuleItemName,
                        c.ModuleItemOrder,


                    })
                    .ToListAsync();

                return Ok(rightsmenu);
            }
            catch (Exception ex)
            {
                // Log exception
                Console.WriteLine($"Error: {ex.Message}");
                return StatusCode(500, "Internal server error.");
            }
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpPost("assign-multiple-rights")]
        public async Task<IActionResult> AddMultipleRights([FromBody] List<ManageAppRightVM> manageAppRightsVM)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(new { Succeeded = false, Message = "Please, provide all the required fields" });
                }
                if (manageAppRightsVM == null || !manageAppRightsVM.Any())
                    return BadRequest(new { Succeeded = false, Message = "Please, provide all the required fields" });

                var existingRights = await _context.ManageAppRights
                    .Where(r => r.RoleId == manageAppRightsVM.First().RoleId)
                    .ToListAsync();

                _context.ManageAppRights.RemoveRange(existingRights);

                var newRights = manageAppRightsVM.Select(right => new ManageAppRight
                {
                    RoleId = right.RoleId,
                    MenuItemId = right.MenuItemId,
                    ModuleItemId = right.ModuleItemId,
                    chkView = right.chkView,
                    chkInsert = right.chkInsert,
                    chkUpdate = right.chkUpdate,
                    chkDelete = right.chkDelete,
                    chkPrint = right.chkPrint,
                    chkApprove = right.chkApprove,
                    chkRevise = right.chkRevise,
                    chkVoid = right.chkVoid,
                    CreatedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                    CreatedOn = DateTime.Now,
                    IsActive = true,
                }).ToList();

                await _context.ManageAppRights.AddRangeAsync(newRights);
                await _context.SaveChangesAsync();

                return Ok(new { Succeeded = true, Message = "Rights assigned successfully" });
            }
            catch (Exception ex)
            {
                // Log exception
                Console.WriteLine($"Error: {ex.Message}");
                return StatusCode(500, "Internal server error.");
            }
        }
        
        [HttpGet("get-rights-by-role/{roleId}")]
        public async Task<IActionResult> GetRightsByRole(string roleId)
        {
            try
            {
                var rights = await _context.ManageAppRights
                    .Where(r => r.RoleId == roleId)
                    .Select(r => new ManageAppRightVM
                    {
                        RoleId = r.RoleId,
                        MenuItemId = r.MenuItemId,
                        ModuleItemId = r.ModuleItemId,
                        chkView = r.chkView,
                        chkInsert = r.chkInsert,
                        chkUpdate = r.chkUpdate,
                        chkDelete = r.chkDelete,
                        chkPrint = r.chkPrint,
                        chkApprove = r.chkApprove,
                        chkRevise = r.chkRevise,
                        chkVoid = r.chkVoid,
                        })
                    .ToListAsync();

                return Ok(rights);
            }
            catch (Exception ex)
            {
                // Log exception
                Console.WriteLine($"Error: {ex.Message}");
                return StatusCode(500, "Internal server error.");
            }
        }

        [HttpGet("get-role-id/{roleName}")]
        public async Task<IActionResult> GetFormFilterByRole(string roleName)
        {
            try
            {
                var roleFromIdentity = await _context.Roles
                     .Where(r => r.Name == roleName)
                    .Select(r => new { r.Id }) 
                        .FirstOrDefaultAsync();

                if (roleFromIdentity == null)
                {
                    return NotFound($"No role found with the name '{roleName}'.");
                }

               

                return Ok(roleFromIdentity);
            }
            catch (Exception ex)
            {
                // Log exception
                Console.WriteLine($"Error: {ex.Message}");
                return StatusCode(500, "Internal server error.");
            }
        }
       
        [Authorize(Roles = "SuperAdmin")]
        [HttpGet("get-rights-sub-menus/{id}")]
        public async Task<IActionResult> GetRightsSubMenus(int id)
        {
            try
            {
                var rightsmenu = await _context.MenuItems
                    .Where(a => a.IsParent == 0 && a.ParentId == id && a.IsActive == 1)
                    .Select(c => new
                    {
                        c.MenuItemId,
                        c.MenuItemName


                    })
                    .ToListAsync();

                return Ok(rightsmenu);
            }
            catch (Exception ex)
            {
                // Log exception
                Console.WriteLine($"Error: {ex.Message}");
                return StatusCode(500, "Internal server error.");
            }
        }

    }
}
