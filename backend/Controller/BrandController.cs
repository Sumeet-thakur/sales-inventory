using Microsoft.AspNetCore.Mvc;
using SalesInventoryAPI.Models;
using SalesInventoryAPI.Data;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;
using SalesInventoryAPI.Data.Services;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using SalesInventoryAPI.Data.ViewModels;
namespace SalesInventoryAPI.Controller
    {
    [Authorize]
[ApiController]
[Route("api/[controller]")]
public class BrandController : ControllerBase
{
    private readonly InventoryDbContext _context;
    private readonly PermissionService _permissionService;
    private readonly ActivityLogRepository _activityLogRepository;

    public BrandController(InventoryDbContext context, PermissionService permissionService, ActivityLogRepository activityLogRepository )
    {
        _context = context;
        _permissionService = permissionService;
        _activityLogRepository = activityLogRepository;
    }

    [HttpGet]
    
    public async Task<IActionResult> GetAllBrands()
    {
        string roleId = await GetUserRoleIdAsync();
        if (!await _permissionService.HasPermission(roleId, "Brands", "Inventory System", "View"))
            return Forbid();

        try
        {
            var brands = await _context.Brands
                .Where(b=>b.IsActive==1 && b.IsDeleted==0)
                .Select(c => new
                {
                    c.BrandId,
                    c.BrandName,
                    c.Description,
                    ItemCount = _context.Items.Count(i => i.BrandId == c.BrandId) // Count items
                })
                .ToListAsync();

            var indexedBrands = brands.Select((brand, index) => new
            {
                Index = index + 1,  // Using index + 1 so that indexing starts at 1
                brand.BrandId,
                brand.BrandName,
                brand.Description,
                brand.ItemCount
            }).ToList();

            return Ok(indexedBrands);
        }
        catch (Exception ex)
        {
            // Log exception
            Console.WriteLine($"Error: {ex.Message}");
            return StatusCode(500, "Internal server error.");
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetBrandById(int id)
    {
        try
        {
            var brand = await _context.Brands
                .Where(b => b.BrandId == id && b.IsActive == 1 && b.IsDeleted == 0)
                .Select(b => new
                {
                    b.BrandId,
                    b.BrandName,
                    b.Description
                })
                .FirstOrDefaultAsync();

            if (brand == null)
            {
                return NotFound("Brand not found.");
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

    [HttpPost]
    public async Task<IActionResult> AddBrand([FromBody] Brand brand)
    {
        string roleId = await GetUserRoleIdAsync();
        if (!await _permissionService.HasPermission(roleId, "Brands", "Inventory System", "Insert"))
            return Forbid();
      
        if (brand == null) return BadRequest("Brand data is null.");

            var existingBrands = await _context.Brands
                  .FirstOrDefaultAsync(b => b.BrandName == brand.BrandName && b.IsActive == 1 && b.IsDeleted == 0);
            if (existingBrands == null)
                return NotFound("Brand not found");

            var checkBrandName = await _context.Brands
                  .FirstOrDefaultAsync(i => i.BrandName.Trim() == brand.BrandName.Trim() && i.IsActive == 1 && i.IsDeleted == 0);
            if (checkBrandName != null)
                return BadRequest(new { Succeeded = false, Message = "Brand Name already exists." });

            try
        {
            brand.CreatedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value; // Placeholder user
            brand.CreatedOn = DateTime.Now;
            brand.IsActive = 1;

            await _context.Brands.AddAsync(brand);
            var result = await _context.SaveChangesAsync();
            int rowid = brand.BrandId;

            if (result > 0)
            {
                var logBrand = new
                {
                    brand.BrandId,
                    brand.BrandName,
                    brand.Description
                };
                var activityLog = new ActivityLog
                {
                    MenuItemId = 9,
                    ParentTableId = rowid,
                    ActionType = "Create",      
                    OldData = "",     
                    NewData = System.Text.Json.JsonSerializer.Serialize(logBrand),
                    UserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                    Date = DateTime.Now
                };
                await _activityLogRepository.Create(activityLog);
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

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateBrand(int id, [FromBody] Brand brand)
    {
        string roleId = await GetUserRoleIdAsync();
        if (!await _permissionService.HasPermission(roleId, "Brands", "Inventory System", "Update"))
            return Forbid();

        if (brand == null || id != brand.BrandId)
            return BadRequest("Invalid brand data.");

        try
        {
            var existingBrand = await _context.Brands.FirstOrDefaultAsync(b => b.BrandId == id && b.IsActive == 1 && b.IsDeleted == 0);
            if (existingBrand == null) return NotFound("Brand not found.");

            // Clone the original data to preserve the old values for logging
            var oldDataClone = new
            {
                existingBrand.BrandId,
                existingBrand.BrandName,
                existingBrand.Description
            };

            // Update the brand with new values
            existingBrand.BrandName = brand.BrandName;
            existingBrand.Description = brand.Description;
            existingBrand.ModifiedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            existingBrand.ModifiedOn = DateTime.Now;

            _context.Brands.Update(existingBrand);
            var result = await _context.SaveChangesAsync();

            if (result > 0)
            {
                var newLogBrand = new
                {
                    brand.BrandId,
                    brand.BrandName,
                    brand.Description
                };

                var activityLog = new ActivityLog
                {
                    MenuItemId = 9,
                    ParentTableId = brand.BrandId,
                    ActionType = "Update",
                    OldData = JsonSerializer.Serialize(oldDataClone),
                    NewData = JsonSerializer.Serialize(newLogBrand),
                    UserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                    Date = DateTime.Now
                };
                await _activityLogRepository.Create(activityLog);
            }

            return Ok(existingBrand);
        }
        catch (Exception ex)
        {
            // Log the exception details as needed
            Console.WriteLine($"Error: {ex.Message}");
            return StatusCode(500, "Internal server error.");
        }
    }


    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteBrand(int id)
    {

        string roleId = await GetUserRoleIdAsync();
        if (!await _permissionService.HasPermission(roleId, "Brands", "Inventory System", "Delete"))
            return Forbid();

        try
        {
            var brand = await _context.Brands.FirstOrDefaultAsync(c => c.BrandId == id);

            if (brand == null) return NotFound("Brand not found.");
            brand.IsDeleted = 1;
            _context.Brands.Update(brand);
            int result=await _context.SaveChangesAsync();

            if (result > 0)
            {
                var logBrand = new
                {
                    brand.BrandId,
                    brand.BrandName,
                    brand.Description
                };
                var activityLog = new ActivityLog
                {
                    MenuItemId = 9,
                    ParentTableId = brand.BrandId,
                    ActionType = "Delete",
                    OldData = "",
                    NewData = System.Text.Json.JsonSerializer.Serialize(logBrand),
                    UserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                    Date = DateTime.Now
                };
                await _activityLogRepository.Create(activityLog);
            }

            return Ok("Brand deleted successfully.");
        }
        catch (Exception ex)
        {
            if (ex.InnerException is MySqlException mysqlEx && mysqlEx.Number == 1451)
            {
                return BadRequest(new { message = "This brand cannot be deleted because it is associated with existing items." });
            }
            // Log exception
            Console.WriteLine($"Error: {ex.Message}");
            return StatusCode(500, "Internal server error.");
        }
    }
    [HttpGet("activity_log")]
    public async Task<IActionResult> GetActivityLogs()
    {
        try
        {
            var logs = await _context.ActivityLogs
                .Where(a => a.MenuItemId == 9)
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
                // Left join with Brands
                .GroupJoin(
                    _context.Brands,
                    temp => temp.a.ParentTableId,
                    b => b.BrandId,
                    (temp, brands) => new { temp.a, temp.user, brands }
                )
                .SelectMany(
                    temp => temp.brands.DefaultIfEmpty(),
                    (temp, brand) => new
                    {
                        temp.a.ActivityLogId,
                        temp.a.ActionType,
                        temp.a.OldData,
                        temp.a.NewData,
                        BrandName = brand != null ? brand.BrandName : null,
                        UserName = temp.user != null ? temp.user.UserName : null,
                        temp.a.Date
                    }
                )
                .ToListAsync();

            return Ok(logs);
        }
        catch (Exception ex)
        {
            // Log the exception details (ex) as needed using your logging mechanism
            return StatusCode(500, "An error occurred while retrieving activity logs.");
        }
    }
    [HttpGet("detail/{id}")]
    public async Task<IActionResult> DetailBrandById(int id)
    {
        string roleId = await GetUserRoleIdAsync();
        if (!await _permissionService.HasPermission(roleId, "Brands", "Inventory System", "View"))
            return Forbid();

        try
        {
            var brand = await _context.Brands
                .Where(b => b.BrandId == id && b.IsActive == 1 && b.IsDeleted == 0)
                .Select(b => new
                {
                    b.BrandId,
                    b.BrandName,
                    b.Description,
                    b.CreatedOn
                })
                .FirstOrDefaultAsync();

            if (brand == null)
            {
                return NotFound("Brand not found.");
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
    [HttpGet("activity_log/brand/{id}")]
    public async Task<IActionResult> GetActivityLogsForBrand(int id)
    {
        try
        {
            var logs = await _context.ActivityLogs
                .Where(a => a.MenuItemId == 9)
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
                // Left join with Brands
                .GroupJoin(
                    _context.Brands,
                    temp => temp.a.ParentTableId,
                    b => b.BrandId,
                    (temp, brands) => new { temp.a, temp.user, brands }
                )
                .SelectMany(
                    temp => temp.brands.DefaultIfEmpty(),
                    (temp, brand) => new { temp.a, temp.user, brand }
                )
                // Apply filter for BrandID = 1 (ensure brand is not null)
                .Where(x => x.brand != null && x.brand.BrandId == id)
                // Project to the desired shape
                .Select(x => new
                {
                    x.a.ActionType,
                    x.a.OldData,
                    x.a.NewData,
                    BrandName = x.brand.BrandName,
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



