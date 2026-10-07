using System;
using System.Collections.Generic;
using System.Drawing.Drawing2D;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SalesInventoryAPI.Data;
using SalesInventoryAPI.Data.ViewModels;
using SalesInventoryAPI.Models;

namespace SalesInventoryAPI.Controller
{
    [Route("api/[controller]")]
    [ApiController]
  
    public class MenuItemsController : ControllerBase
    {
        private readonly InventoryDbContext _context;
        private readonly ILogger<MenuItemsController> _logger;
        public MenuItemsController(InventoryDbContext context, ILogger<MenuItemsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpPost("create-menu")]
        public async Task<IActionResult> AddMenu([FromBody] MenuItemVM menuItemVM)
        {


            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(new { Succeeded = false, Message = "Please, provide all the required fields" });
                }
                if (menuItemVM == null) return BadRequest(new { Succeeded = false, Message = "Please, provide all the required fields" });

                if (menuItemVM.MenuItemOrder <= 0) return BadRequest(new { Succeeded = false, Message = "Please, provide valid Module order Value" });

                MenuItem menuItem = new MenuItem()
                {
                    MenuItemName = menuItemVM.MenuItemName,
                    ModuleItemId = menuItemVM.ModuleItemId,
                    MenuItemOrder = menuItemVM.MenuItemOrder,
                    Controller = menuItemVM.Controller,
                    Action = menuItemVM.Action,
                    ParentId = menuItemVM.ParentId,
                    IsParent = menuItemVM.IsParent,
                    CreatedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                    CreatedOn = DateTime.Now,
                    IsActive = 1,
                };
                await _context.MenuItems.AddAsync(menuItem);
                await _context.SaveChangesAsync();

                return Ok(new { Succeeded = true, Message = "Menu created successfully" });
            }
            catch (Exception ex)
            {
                // Log exception
                Console.WriteLine($"Error: {ex.Message}");
                return StatusCode(500, "Internal server error.");
            }
        }

        [HttpGet("main-menu-list")]
        public async Task<IActionResult> GetMainMenuList()
        {
            string roleId = await GetUserRoleIdAsync();

            var menuList = await _context.MenuItems
                 .Where(m => m.ParentId == 0
                             && m.IsParent == 1
                             && m.IsActive == 1
                            )
                 .Select(m => new MainMenuListVM
                 {
                     Icon = m.Icon,
                     Label = m.Label,
                     Path = m.Path,
                     childMainMenuListVMs = _context.MenuItems
                         .Where(c => c.ParentId == m.MenuItemId
                                     && c.IsParent == 0
                                     && c.IsActive == 1
                                     && c.ManageAppRights.Any(r => r.RoleId == roleId && r.chkView))
                         .Select(c => new ChildMainMenuListVM
                         {
                             Icon = c.Icon,
                             Label = c.Label,
                             Path = c.Path
                         })
                         .ToList()
                 })
                 .ToListAsync();

            return Ok(menuList);
        }

        private async Task<string> GetUserRoleIdAsync()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return null; // User not authenticated
            }

            var userRole = await _context.UserRoles
                .Where(ur => ur.UserId == userId)
                .Select(ur => ur.RoleId)
                .FirstOrDefaultAsync();

            return userRole;
        }
    }
}
