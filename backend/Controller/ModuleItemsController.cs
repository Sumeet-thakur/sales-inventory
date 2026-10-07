using System;
using System.Collections.Generic;
using System.Drawing.Drawing2D;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
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
    public class ModuleItemsController : ControllerBase
    {
        private readonly InventoryDbContext _context;

        public ModuleItemsController(InventoryDbContext context)
        {
            _context = context;
        }

        // GET: api/ModuleItems
        [HttpGet]
        public async Task<IActionResult> GetAllModules()
        {
            try
            {
                var modules = await _context.ModuleItems
                     .Where(d => d.IsActive == 1)
                    .Select(c => new
                    {
                        c.ModuleItemId,
                        c.ModuleItemName,
                       c.ModuleItemOrder
                        
                    })
                    .ToListAsync();

                return Ok(modules);
            }
            catch (Exception ex)
            {
                // Log exception
                Console.WriteLine($"Error: {ex.Message}");
                return StatusCode(500, "Internal server error.");
            }
        }

        [HttpGet("get-module/{id}")]
        public async Task<IActionResult> GetModuleById(int id)
        {
            try
            {
                var brand = await _context.ModuleItems
                    .Where(b => b.ModuleItemId == id && b.IsActive==1)
                    .Select(b => new
                    {
                        b.ModuleItemName,
                        b.ModuleItemOrder,
                     
                    })
                    .FirstOrDefaultAsync();

                if (brand == null)
                {
                    return NotFound("Module Item not found.");
                }

                return Ok(brand);
            }
            catch (Exception ex)
            {
                // Log exception
                Console.WriteLine($"Error: {ex.Message}");
                return StatusCode(500, "Internal server error.");
            }
        }

        [HttpPost("create-module")]
        public async Task<IActionResult> AddModule([FromBody] ModuleItemVM moduleItemVm)
        {
           

            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(new { Succeeded = false, Message = "Please, provide all the required fields" });
                }
                if (moduleItemVm == null) return BadRequest(new { Succeeded = false, Message = "Please, provide all the required fields" });

                if (moduleItemVm.ModuleItemOrder <= 0) return BadRequest(new { Succeeded = false, Message = "Please, provide valid Module order Value" });

                ModuleItem moduleItem = new ModuleItem()
                {
                    ModuleItemName= moduleItemVm.ModuleItemName,
                    ModuleItemOrder=moduleItemVm.ModuleItemOrder,
                    CreatedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                    CreatedOn = DateTime.Now,
                    IsActive = 1,
                };
                await _context.ModuleItems.AddAsync(moduleItem);
                await _context.SaveChangesAsync();

                return Ok(new { Succeeded = true, Message = "Module created successfully" });
            }
            catch (Exception ex)
            {
                // Log exception
                Console.WriteLine($"Error: {ex.Message}");
                return StatusCode(500, "Internal server error.");
            }
        }
        [HttpPut("update-module/{id}")]
        public async Task<IActionResult> UpdateModuleItem(int id, [FromBody] ModuleItemVM moduleItemVm)
        {

            try
            {
                if (moduleItemVm == null )
                    return BadRequest("Invalid module data.");

                var existingModule = await _context.ModuleItems.FirstOrDefaultAsync(b => b.ModuleItemId == id && b.IsActive ==1);
                if (existingModule == null) return NotFound("Module not found.");

                existingModule.ModuleItemName = moduleItemVm.ModuleItemName;
                existingModule.ModuleItemOrder = moduleItemVm.ModuleItemOrder;
                existingModule.ModifiedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                existingModule.ModifiedOn = DateTime.Now;

                _context.ModuleItems.Update(existingModule);
                await _context.SaveChangesAsync();

                return Ok(existingModule);
            }
            catch (Exception ex)
            {
                // Log exception
                Console.WriteLine($"Error: {ex.Message}");
                return StatusCode(500, "Internal server error.");
            }
        }


        [HttpDelete("delete-module/{id}")]
        public async Task<IActionResult> DeleteModuleItem(int id)
        {

            try
            {
                var existingModule = await _context.ModuleItems.FirstOrDefaultAsync(b => b.ModuleItemId == id && b.IsActive == 1);
                if (existingModule == null) return NotFound("Module not found.");

               
                existingModule.IsActive = 0;
                existingModule.ModifiedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                existingModule.ModifiedOn = DateTime.Now;

                _context.ModuleItems.Update(existingModule);
                await _context.SaveChangesAsync();

                return Ok(existingModule);
            }
            catch (Exception ex)
            {
                // Log exception
                Console.WriteLine($"Error: {ex.Message}");
                return StatusCode(500, "Internal server error.");
            }
        }


        private bool ModuleItemExists(int id)
        {
            return _context.ModuleItems.Any(e => e.ModuleItemId == id);
        }
    }
}
