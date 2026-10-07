using Microsoft.AspNetCore.Mvc;
using SalesInventoryAPI.Models;
using SalesInventoryAPI.Data;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using SalesInventoryAPI.Data.Services;
using Microsoft.AspNetCore.Authorization;

namespace SalesInventoryAPI.Controller
    {
    [Authorize]
    [ApiController]
[Route("api/[controller]")]
public class ItemGroupController : ControllerBase
{
    private readonly InventoryDbContext _context;
    private readonly PermissionService _permissionService;
    private readonly ActivityLogRepository _activityLogRepository;

    public ItemGroupController(InventoryDbContext context, PermissionService permissionService, ActivityLogRepository activityLogRepository) 
    {
        _context = context;
        _permissionService = permissionService;
        _activityLogRepository = activityLogRepository;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllItemGroup()
    {
        string roleId = await GetUserRoleIdAsync();
        if (!await _permissionService.HasPermission(roleId, "ItemGroup", "Inventory System", "View"))
            return Forbid();

        try
        {
            var itemGroups =( await _context.ItemGroups
                .Where(a=>a.IsActive ==1 && a.IsDeleted==0)
                .Select(c => new
                {
                    c.ItemGroupId,
                    c.ItemGroupName,
                    c.Description
                })
                .ToListAsync())
                .Select((c, index) => new
                {
                    Index = index + 1,
                    c.ItemGroupId,
                    c.ItemGroupName,
                    c.Description
                })
                .ToList(); ;

            return Ok(itemGroups);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Internal server error: {ex.Message}");
        }
    }

    [HttpPost]
    public async Task<IActionResult> AddItemGroup([FromBody] ItemGroup itemGroup)
        {
        string roleId = await GetUserRoleIdAsync();
        if (!await _permissionService.HasPermission(roleId, "ItemGroup", "Inventory System", "Insert"))
            return Forbid();

        if (itemGroup == null)
            return BadRequest("ItemGroup data is null");

            var trimmedItemGroup = itemGroup.ItemGroupName.Trim();

            var checkItemGroup = await _context.ItemGroups.FirstOrDefaultAsync(i => i.ItemGroupName.Trim() == trimmedItemGroup);
            if (checkItemGroup != null)
                return BadRequest(new { Succeeded = false, Message = "Item Group Name already exists." });
            // Begin a transaction.
            using var transaction = await _context.Database.BeginTransactionAsync();

        try
            {
            itemGroup.CreatedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            itemGroup.CreatedOn = DateTime.Now;
            itemGroup.IsActive = 1;
            itemGroup.IsDeleted = 0;

            await _context.ItemGroups.AddAsync(itemGroup);
            var changes = await _context.SaveChangesAsync();
            if (changes > 0)
                {
                // Build a log object with the new item's essential details.
                var logItemGroup = new
                    {
                    itemGroup.ItemGroupId,
                    itemGroup.ItemGroupName,
                    itemGroup.Description,
                    itemGroup.CreatedOn

                    };

                var activityLog = new ActivityLog
                    {
                    MenuItemId = 10,
                    ParentTableId = itemGroup.ItemGroupId,
                    ActionType = "Create",
                    OldData = "",
                    NewData = System.Text.Json.JsonSerializer.Serialize(logItemGroup),
                    UserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                    Date = DateTime.Now
                    };

                await _activityLogRepository.Create(activityLog);
                }
            // Commit the transaction.
            await transaction.CommitAsync();

            return Ok(itemGroup);
            }
        catch (Exception ex)
            {
            // Roll back the transaction if an error occurs.
            await transaction.RollbackAsync();
            Console.WriteLine($"Error: {ex.Message}");
            return StatusCode(500, "Internal server error.");
            }
        }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteItemGroup(int id)
    {
        string roleId = await GetUserRoleIdAsync();
        if (!await _permissionService.HasPermission(roleId, "ItemGroup", "Inventory System", "Delete"))
            return Forbid();

        try
        {
            var itemGroup = await _context.ItemGroups.FirstOrDefaultAsync(c => c.ItemGroupId == id && c.IsActive == 1 && c.IsDeleted == 0);

            if (itemGroup == null)
            {
                return NotFound("ItemGroup not found");
            }

            // Remove the itemGroup
            _context.ItemGroups.Remove(itemGroup);

            await _context.SaveChangesAsync();
            return Ok("ItemGroup deleted successfully");
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Internal server error: {ex.Message}");
        }
    }

    
    [HttpGet("{id}")]
    public async Task<IActionResult> GetItemGroupById(int id)
    {
        string roleId = await GetUserRoleIdAsync();
        if (!await _permissionService.HasPermission(roleId, "ItemGroup", "Inventory System", "Update"))
            return Forbid();

        try
        {
            var itemGroup = await _context.ItemGroups
                .Where(b => b.ItemGroupId == id && b.IsActive == 1 && b.IsDeleted == 0)
                .Select(b => new
                {
                    b.ItemGroupId,
                    b.ItemGroupName,
                    b.Description
                })
                .FirstOrDefaultAsync();

            if (itemGroup == null)
            {
                return NotFound("ItemGroup not found");
            }

            return Ok(itemGroup);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Internal server error: {ex.Message}");
        }
    }



    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateItemGroup(int id, [FromBody] ItemGroup itemGroup)
        {
        string roleId = await GetUserRoleIdAsync();
        if (!await _permissionService.HasPermission(roleId, "ItemGroup", "Inventory System", "Update"))
            return Forbid();

        if (itemGroup == null || id != itemGroup.ItemGroupId)
            return BadRequest("Invalid itemGroup data");

            var checkItemGroup = await _context.ItemGroups
                .FirstOrDefaultAsync(i => i.ItemGroupName == itemGroup.ItemGroupName);
            if (checkItemGroup != null)
                return BadRequest(new { Succeeded = false, Message = "ItemGroup Name already exists." });

            // Begin a transaction.
            using var transaction = await _context.Database.BeginTransactionAsync();

        try
            {
            var existingItemGroup = await _context.ItemGroups
                .FirstOrDefaultAsync(b => b.ItemGroupId == id && b.IsActive == 1 && b.IsDeleted == 0);
            if (existingItemGroup == null)
                return NotFound("ItemGroup not found");
            var oldItemGroup = new
                {
                existingItemGroup.ItemGroupId,
                existingItemGroup.ItemGroupName,
                existingItemGroup.Description,
                existingItemGroup.CreatedOn

                };
            // Update fields.
            existingItemGroup.ItemGroupName = itemGroup.ItemGroupName;
            existingItemGroup.Description = itemGroup.Description;
            existingItemGroup.ModifiedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            existingItemGroup.ModifiedOn = DateTime.Now;

            _context.ItemGroups.Update(existingItemGroup);
            var changes = await _context.SaveChangesAsync();
            if (changes > 0)
                {
                // Build a log object with the new item's essential details.
                var newItemGroup = new
                    {
                    itemGroup.ItemGroupId,
                    itemGroup.ItemGroupName,
                    itemGroup.Description,
                    itemGroup.CreatedOn

                    };

                var activityLog = new ActivityLog
                    {
                    MenuItemId = 10,
                    ParentTableId = itemGroup.ItemGroupId,
                    ActionType = "Update",
                    OldData = System.Text.Json.JsonSerializer.Serialize(oldItemGroup),
                    NewData = System.Text.Json.JsonSerializer.Serialize(newItemGroup),
                    UserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                    Date = DateTime.Now
                    };

                await _activityLogRepository.Create(activityLog);
                }

            // Commit the transaction.
            await transaction.CommitAsync();

            return Ok(existingItemGroup);
            }
        catch (Exception ex)
            {
            // Roll back the transaction if an error occurs.
            await transaction.RollbackAsync();
            Console.WriteLine($"Error: {ex.Message}");
            return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }


    [HttpGet("detail/{id}")]
    public async Task<IActionResult> DetailItemGroupById(int id)
        {
        string roleId = await GetUserRoleIdAsync();
        if (!await _permissionService.HasPermission(roleId, "ItemGroup", "Inventory System", "View"))
            return Forbid();

        try
            {
            var itemGroup = await _context.ItemGroups
                .Where(b => b.ItemGroupId == id && b.IsActive == 1 && b.IsDeleted == 0)
                .Select(b => new
                    {
                    b.ItemGroupId,
                    b.ItemGroupName,
                    b.Description,
                    b.CreatedOn
                    })
                .FirstOrDefaultAsync();

            if (itemGroup == null)
                {
                return NotFound("ItemGroup not found");
                }

            return Ok(itemGroup);
            }
        catch (Exception ex)
            {
            return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    [HttpGet("activity_log/itemgroup/{id}")]
    public async Task<IActionResult> GetActivityLogsForItemGroup(int id)
        {
        try
            {
            var logs = await _context.ActivityLogs
                .Where(a => a.MenuItemId == 10)
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
                // Left join with ItemGroups
                .GroupJoin(
                    _context.ItemGroups,
                    temp => temp.a.ParentTableId,
                    b => b.ItemGroupId,
                    (temp, ItemGroups) => new { temp.a, temp.user, ItemGroups }
                )
                .SelectMany(
                    temp => temp.ItemGroups.DefaultIfEmpty(),
                    (temp, ItemGroup) => new { temp.a, temp.user, ItemGroup }
                )
                // Apply filter for UnitId = 1 (ensure Unit is not null)
                .Where(x => x.ItemGroup != null && x.ItemGroup.ItemGroupId == id)
                // Project to the desired shape
                .Select(x => new
                    {
                    x.a.ActionType,
                    x.a.OldData,
                    x.a.NewData,
                    ItemGroupName = x.ItemGroup.ItemGroupName,
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
