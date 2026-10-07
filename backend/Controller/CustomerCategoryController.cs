using Microsoft.AspNetCore.Mvc;
using SalesInventoryAPI.Models;
using SalesInventoryAPI.Data;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using SalesInventoryAPI.Data.Services;
using NuGet.Protocol.Plugins;
using Microsoft.AspNetCore.Authorization;
using Org.BouncyCastle.Asn1.Ocsp;

namespace SalesInventoryAPI.Controller
    {
    [Authorize]
    [ApiController]
[Route("api/[controller]")]
public class CustomerCategoryController : ControllerBase
{
    private readonly InventoryDbContext _context;
    private readonly PermissionService _permissionService;
    private readonly ActivityLogRepository _activityLogRepository;


    public CustomerCategoryController(InventoryDbContext context, PermissionService permissionService, ActivityLogRepository activityLogRepository)
    {
        _context = context;
        _permissionService = permissionService;
        _activityLogRepository = activityLogRepository;
    }

  

    [HttpGet]
    public async Task<IActionResult> GetAllCustomerCategories()
    {
        string roleId = await GetUserRoleIdAsync();
        if (!await _permissionService.HasPermission(roleId, "CustomerCategory", "Inventory System", "View"))
            return Forbid();

        try
        {
            var customerCategorys =(await _context.CustomerCategories
                .Where(a=>a.IsActive==1 && a.IsDeleted==0)
                .Select(c => new
                {
                    c.CustomerCategoryId,
                    c.CustomerCategoryName,
                    c.Description
                })
                .ToListAsync()).Select((c, index) => new
                {
                    Index = index + 1,
                    c.CustomerCategoryId,
                    c.CustomerCategoryName,
                    c.Description
                }).ToList();

            return Ok(customerCategorys);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Internal server error: {ex.Message}");
        }
    }

    [HttpPost]
    public async Task<IActionResult> AddCustomerCategory([FromBody] CustomerCategory customerCategory)
        {
        string roleId = await GetUserRoleIdAsync();
        if (!await _permissionService.HasPermission(roleId, "CustomerCategory", "Inventory System", "Insert"))
                return Forbid();

           

            if (customerCategory == null)
            return BadRequest("CustomerCategory data is null");

            var checkcustomerCategory = await _context.CustomerCategories.FirstOrDefaultAsync(i => i.CustomerCategoryName.Trim() == customerCategory.CustomerCategoryName.Trim());
            if (checkcustomerCategory != null)
                return BadRequest(new { Succeeded = false, Message = "Customer Category Name already exists." });

            // Begin a transaction.
            using var transaction = await _context.Database.BeginTransactionAsync();

        try
            {
            customerCategory.CreatedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            customerCategory.CreatedOn = DateTime.Now;
            customerCategory.IsActive = 1;
            customerCategory.IsDeleted = 0;

            await _context.CustomerCategories.AddAsync(customerCategory);
            var changes = await _context.SaveChangesAsync();

            // If changes were saved, log the activity with only the required fields.
            if (changes > 0)
                {
                var logcustomerCategory = new
                {
                    customerCategory.CustomerCategoryName,
                    customerCategory.Description
                    


                    };

                var activityLog = new ActivityLog
                    {
                    MenuItemId = 13,
                    ParentTableId = customerCategory.CustomerCategoryId,
                    ActionType = "Create",
                    OldData = "",
                    NewData = System.Text.Json.JsonSerializer.Serialize(logcustomerCategory),
                    UserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                    Date = DateTime.Now
                    };

                await _activityLogRepository.Create(activityLog);
                }


            // Commit the transaction if all operations succeed.
            await transaction.CommitAsync();

            return Ok(customerCategory);
            }
        catch (Exception ex)
            {
            // Roll back the transaction in case of error.
            await transaction.RollbackAsync();
            Console.WriteLine($"Error: {ex.Message}");
            return StatusCode(500, "Internal server error.");
            }
        }


    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCustomerCategory(int id)
    {
        string roleId = await GetUserRoleIdAsync();
        if (!await _permissionService.HasPermission(roleId, "CustomerCategory", "Inventory System", "Delete"))
            return Forbid();

        try
        {
            var customerCategory = await _context.CustomerCategories.FirstOrDefaultAsync(c => c.CustomerCategoryId == id && c.IsActive == 1 && c.IsDeleted == 0);

            if (customerCategory == null)
            {
                return NotFound("CustomerCategory not found");
            }


            customerCategory.IsDeleted = 1;

            customerCategory.ModifiedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            customerCategory.ModifiedOn = DateTime.Now;

            _context.CustomerCategories.Update(customerCategory);
            await _context.SaveChangesAsync();
            
            return Ok("CustomerCategory deleted successfully");
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Internal server error: {ex.Message}");
        }
    }

    
    [HttpGet("{id}")]
    public async Task<IActionResult> GetCustomerCategoryById(int id)
    {
        string roleId = await GetUserRoleIdAsync();
        if (!await _permissionService.HasPermission(roleId, "CustomerCategory", "Inventory System", "Update"))
            return Forbid();

        try
        {
            var customerCategory = await _context.CustomerCategories
                .Where(b => b.CustomerCategoryId == id && b.IsActive == 1 && b.IsDeleted == 0)
                .Select(b => new
                {
                    b.CustomerCategoryId,
                    b.CustomerCategoryName,
                    b.Description
                })
                .FirstOrDefaultAsync();

            if (customerCategory == null)
            {
                return NotFound("CustomerCategory not found");
            }

            return Ok(customerCategory);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Internal server error: {ex.Message}");
        }
    }

    [HttpGet("detail/{id}")]
    public async Task<IActionResult> DetailCustomerCategoryById(int id)
        {
        string roleId = await GetUserRoleIdAsync();
        if (!await _permissionService.HasPermission(roleId, "CustomerCategory", "Inventory System", "View"))
            return Forbid();

        try
            {
            var customerCategory = await _context.CustomerCategories
                .Where(b => b.CustomerCategoryId == id && b.IsActive == 1 && b.IsDeleted == 0)
                .Select(b => new
                    {
                    b.CustomerCategoryId,
                    b.CustomerCategoryName,
                    b.Description,
                    b.CreatedOn
                    })
                .FirstOrDefaultAsync();

            if (customerCategory == null)
                {
                return NotFound("CustomerCategory not found");
                }

            return Ok(customerCategory);
            }
        catch (Exception ex)
            {
            return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }


    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCustomerCategory(int id, [FromBody] CustomerCategory customerCategory)
        {
        string roleId = await GetUserRoleIdAsync();
        if (!await _permissionService.HasPermission(roleId, "CustomerCategory", "Inventory System", "Update"))
            return Forbid();

        if (customerCategory == null || id != customerCategory.CustomerCategoryId)
            return BadRequest("Invalid customerCategory data");

        // Begin a transaction.
        using var transaction = await _context.Database.BeginTransactionAsync();

        try
            {
            var existingCustomerCategory = await _context.CustomerCategories
                .FirstOrDefaultAsync(b => b.CustomerCategoryId == id && b.IsActive == 1 && b.IsDeleted == 0);
            if (existingCustomerCategory == null)
                return NotFound("CustomerCategory not found");
            var oldcustomerCategory = new
                {
                existingCustomerCategory.CustomerCategoryName ,
            existingCustomerCategory.Description ,



            };

            existingCustomerCategory.CustomerCategoryName = customerCategory.CustomerCategoryName;
            existingCustomerCategory.Description = customerCategory.Description;
            existingCustomerCategory.ModifiedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            existingCustomerCategory.ModifiedOn = DateTime.Now;

            _context.CustomerCategories.Update(existingCustomerCategory);
            var changes = await _context.SaveChangesAsync();

            // If changes were saved, log the activity with only the required fields.
            if (changes > 0)
                {
                var newcustomerCategory = new
                    {
                    customerCategory.CustomerCategoryName,
                    customerCategory.Description



                    };

                var activityLog = new ActivityLog
                    {
                    MenuItemId = 13,
                    ParentTableId = customerCategory.CustomerCategoryId,
                    ActionType = "Update",
                    OldData = System.Text.Json.JsonSerializer.Serialize(oldcustomerCategory),
                    NewData = System.Text.Json.JsonSerializer.Serialize(newcustomerCategory),
                    UserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                    Date = DateTime.Now
                    };

                await _activityLogRepository.Create(activityLog);
                }



            // Commit the transaction if everything succeeds.
            await transaction.CommitAsync();

            return Ok(existingCustomerCategory);
            }
        catch (Exception ex)
            {
            // Roll back the transaction if any errors occur.
            await transaction.RollbackAsync();
            return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    [HttpGet("activity_log/customercategory/{id}")]
    public async Task<IActionResult> GetActivityLogsForCustomerCategory(int id)
        {
        try
            {
            var logs = await _context.ActivityLogs
                .Where(a => a.MenuItemId == 13)
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
                // Left join with Customercategory
                .GroupJoin(
                    _context.CustomerCategories,
                    temp => temp.a.ParentTableId,
                    b => b.CustomerCategoryId,
                    (temp, CustomerCategories) => new { temp.a, temp.user, CustomerCategories }
                )
                .SelectMany(
                    temp => temp.CustomerCategories.DefaultIfEmpty(),
                    (temp, customercategory) => new { temp.a, temp.user, customercategory }
                )
                // Apply filter for PriceListId = 1 (ensure pricelist is not null)
                .Where(x => x.customercategory != null && x.customercategory.CustomerCategoryId == id)
                // Project to the desired shape
                .Select(x => new
                    {
                    x.a.ActionType,
                    x.a.OldData,
                    x.a.NewData,
                    CustomerCategoryName = x.customercategory.CustomerCategoryName,
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
