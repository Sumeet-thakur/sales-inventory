using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SalesInventoryAPI.Data;
using SalesInventoryAPI.Data.Services;
using SalesInventoryAPI.Data.ViewModels;
using SalesInventoryAPI.Models;

namespace SalesInventoryAPI.Controller
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class CitiesController : ControllerBase
        {
        private readonly InventoryDbContext _context;
        private readonly PermissionService _permissionService;
        private readonly ActivityLogRepository _activityLogRepository;
        public CitiesController(InventoryDbContext context, PermissionService permissionService, ActivityLogRepository activityLogRepository    )
            {
            _context = context;
            _permissionService = permissionService;
            _activityLogRepository = activityLogRepository;
            }

        // GET: api/Cities
        [HttpGet]
        public async Task<IActionResult> GetAllCities()
            {
            string roleId = await GetUserRoleIdAsync();
            if (!await _permissionService.HasPermission(roleId, "Cities", "Inventory System", "View"))
                return Forbid();

            try
                {
                var cities = await _context.Cities
                    .Where(a => a.IsActive == 1 && a.IsDeleted == 0)
                    .Select(c => new
                        {
                        c.CityId,
                        c.CityName,


                        })
                    .ToListAsync();
                var indexedCities = cities.Select((city, index) => new
                    {
                    Index = index + 1,  // Using index + 1 so that indexing starts at 1
                    city.CityId,
                    city.CityName,
                    }).ToList();

                return Ok(indexedCities);
                }
            catch (Exception ex)
                {
                // Log exception
                Console.WriteLine($"Error: {ex.Message}");
                return StatusCode(500, "Internal server error.");
                }
            }
        // GET: api/Cities/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetCityById(int id)
            {
            try
                {
                var city = await _context.Cities
                    .Where(b => b.CityId == id && b.IsDeleted == 0)
                    .Select(b => new
                        {
                        b.CityId,
                        b.CityName
                        })
                    .FirstOrDefaultAsync();

                if (city == null)
                    {
                    return NotFound("ItemGroup not found");
                    }

                return Ok(city);
                }
            catch (Exception ex)
                {
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }

        // PUT: api/Cities/5
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateCity(int id, [FromBody] City city)
            {
            if (city == null)
                return BadRequest("City data is null.");

            if (id != city.CityId)
                return BadRequest("Invalid City data");

            // Begin a transaction.
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
                {
                var existingCity = await _context.Cities
                    .FirstOrDefaultAsync(b => b.CityId == id && b.IsActive == 1 && b.IsDeleted == 0);
                if (existingCity == null)
                    return NotFound("City not found");

                var oldCity = new
                    {
                    existingCity.CityId,
                    existingCity.CityName,
                    existingCity.CreatedOn

                    };

                // Update fields.
                existingCity.CityName = city.CityName;
                existingCity.ModifiedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                existingCity.ModifiedOn = DateTime.Now;

                _context.Cities.Update(existingCity);
                var changes = await _context.SaveChangesAsync();
                if (changes > 0)
                    {
                    // Build a log object with the new item's essential details.
                    var newCity = new
                        {
                        city.CityId,
                        city.CityName,
                        city.CreatedOn

                        };

                    var activityLog = new ActivityLog
                        {
                        MenuItemId = 20,
                        ParentTableId = city.CityId,
                        ActionType = "Update",
                        OldData = System.Text.Json.JsonSerializer.Serialize(oldCity),
                        NewData = System.Text.Json.JsonSerializer.Serialize(newCity),
                        UserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                        Date = DateTime.Now
                        };

                    await _activityLogRepository.Create(activityLog);
                    }
                await transaction.CommitAsync();

                return Ok(existingCity);
                }
            catch (Exception ex)
                {
                // Roll back the transaction if an error occurs.
                await transaction.RollbackAsync();
                Console.WriteLine($"Error: {ex.Message}");
                return StatusCode(500, "Internal server error.");
                }
            }



        [HttpPost]
        public async Task<IActionResult> AddCity([FromBody] City city)
            {
            if (city == null)
                return BadRequest("City data is null.");

            var checkCityName = await _context.Cities.FirstOrDefaultAsync(i => i.CityName == city.CityName );
            if (checkCityName != null)
                return BadRequest(new { Succeeded = false, Message = "City Name already exists." });

            // Begin a transaction.
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
                {
                city.CreatedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                city.CreatedOn = DateTime.Now;
                city.IsActive = 1;
                city.IsDeleted = 0;

                await _context.Cities.AddAsync(city);
                var changes=await _context.SaveChangesAsync();
                if (changes > 0)
                    {
                    // Build a log object with the new item's essential details.
                    var logCity = new
                        {
                        city.CityId,
                        city.CityName,
                        city.CreatedOn
                       
                        };

                    var activityLog = new ActivityLog
                        {
                        MenuItemId = 20,
                        ParentTableId = city.CityId,
                        ActionType = "Create",
                        OldData = "",
                        NewData = System.Text.Json.JsonSerializer.Serialize(logCity),
                        UserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                        Date = DateTime.Now
                        };

                    await _activityLogRepository.Create(activityLog);
                    }
                // Commit the transaction if all operations succeed.
                await transaction.CommitAsync();

                return Ok(city);
                }
            catch (Exception ex)
                {
                // Roll back the transaction if any errors occur.
                await transaction.RollbackAsync();
                Console.WriteLine($"Error: {ex.Message}");
                return StatusCode(500, "Internal server error.");
                }
            }



        // DELETE: api/Cities/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCity(int id)
            {

            try
                {
                var existingCity = await _context.Cities.FirstOrDefaultAsync(b => b.CityId == id && b.IsActive == 1 && b.IsDeleted == 0);
                if (existingCity == null)
                    return NotFound("ItemGroup not found");


                existingCity.IsDeleted = 1;


                existingCity.ModifiedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                existingCity.ModifiedOn = DateTime.Now;

                _context.Cities.Update(existingCity);
                await _context.SaveChangesAsync();

                return Ok(existingCity);
                }
            catch (Exception ex)
                {
                // Log exception
                Console.WriteLine($"Error: {ex.Message}");
                return StatusCode(500, "Internal server error.");
                }
            }
        [HttpGet("detail/{id}")]
        public async Task<IActionResult> DetailCityById(int id)
            {
            try
                {
                var city = await _context.Cities
                    .Where(b => b.CityId == id && b.IsDeleted == 0)
                    .Select(b => new
                        {
                        b.CityId,
                        b.CityName,
                        b.CreatedOn
                        })
                    .FirstOrDefaultAsync();

                if (city == null)
                    {
                    return NotFound("ItemGroup not found");
                    }

                return Ok(city);
                }
            catch (Exception ex)
                {
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }

        [HttpGet("activity_log/city/{id}")]
        public async Task<IActionResult> GetActivityLogsForCity(int id)
            {
            try
                {
                var logs = await _context.ActivityLogs
                    .Where(a => a.MenuItemId == 20)
                    // Left join with Users
                    .GroupJoin(
                        _context.Users,
                        a => a.UserId,
                        u => u.Id,
                        (a, users) => new { a, users }
                    )
                    .SelectMany(
                        temp => temp.users.DefaultIfEmpty(),
                        (temp, user) => new { temp.a, user }
                    )
                    // Left join with Cities
                    .GroupJoin(
                        _context.Cities,
                        temp => temp.a.ParentTableId,
                        b => b.CityId,
                        (temp, Cities) => new { temp.a, temp.user, Cities }
                    )
                    .SelectMany(
                        temp => temp.Cities.DefaultIfEmpty(),
                        (temp, City) => new { temp.a, temp.user, City }
                    )
                    // Apply filter for CityId = 1 (ensure City is not null)
                    .Where(x => x.City != null && x.City.CityId == id)
                    // Project to the desired shape
                    .Select(x => new
                        {
                        x.a.ActionType,
                        x.a.OldData,
                        x.a.NewData,
                        CityName = x.City.CityName,
                        UserName = x.user != null ? x.user.UserName : null,
                        x.a.Date
                        })
                    .ToListAsync();

                return Ok(logs);
                }
            catch (Exception ex)
                {
                // Optionally log the exception details
                return StatusCode(500, "An error occurred while retrieving activity logs: " + ex.Message);
                }
            }
        

        private async Task<string> GetUserRoleIdAsync()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                // Return null if the user is not authenticated.
                return null;
            }

            var userRole = await _context.UserRoles
                .Where(ur => ur.UserId == userId)
                .Select(ur => ur.RoleId)
                .FirstOrDefaultAsync();

            return userRole;
        }
    }
}
