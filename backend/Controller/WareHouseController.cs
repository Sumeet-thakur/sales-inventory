using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SalesInventoryAPI.Data;
using SalesInventoryAPI.Data.Services;
using SalesInventoryAPI.Data.ViewModels;
using SalesInventoryAPI.Models;
using System.Security.Claims;
using System.Text.Json;


namespace SalesInventoryAPI.Controller
    {
    [Authorize]
    [ApiController]
[Route("api/[controller]")]

public class WareHouseController : ControllerBase
{
    private readonly InventoryDbContext _context;
    private readonly PermissionService _permissionService;
    private readonly ActivityLogRepository _activityLogRepository;
  
    public WareHouseController(InventoryDbContext context,PermissionService permissionService, ActivityLogRepository activityLogRepository)
    {
        _context = context;
        _permissionService = permissionService;
        _activityLogRepository = activityLogRepository;
    }

        // GET /api/Warehouse
        // Returns all active, non-deleted warehouses with an index for display,
        // but only if the user has "View" permission on the Warehouse menu.
        [HttpGet]
        public async Task<IActionResult> GetAllWareHouses ( )
            {
            // 1️⃣ Permission check: fetch current user's role and ensure they can view warehouses
            string roleId = await GetUserRoleIdAsync();
            if (!await _permissionService.HasPermission(roleId, "Warehouse", "Inventory System", "View"))
                return Forbid();  // 403 Forbidden if user lacks the required permission

            try
                {
                // 2️⃣ Query the Warehouses table for active, non-deleted records
                var warehouses = await _context.Warehouses
                    .Where(a => a.IsActive == 1 && a.IsDeleted == 0)
                    // 3️⃣ Project into a lightweight anonymous type containing only needed fields
                    .Select(c => new
                        {
                        c.WarehouseID,
                        c.WarehouseName,
                        c.Address
                        })
                    .ToListAsync();  // Execute the query and materialize the list

                // 4️⃣ Add a 1-based index for UI ordering
                var indexedWarehouses = warehouses
                    .Select(( c, index ) => new
                        {
                        Index = index + 1,  // Start counting at 1
                        c.WarehouseID,
                        c.WarehouseName,
                        c.Address
                        });

                // 5️⃣ Return HTTP 200 OK with the indexed list
                return Ok(indexedWarehouses);
                }
            catch (Exception ex)
                {
                // 6️⃣ On any exception (e.g., database error), log and return HTTP 500
                Console.WriteLine($"Error fetching warehouses: {ex.Message}");
                return StatusCode(500, "Internal server error.");
                }
            }


        // POST /api/Warehouse
        // Creates a new Warehouse record, sets audit fields, and logs the creation action.
        [HttpPost]
        public async Task<IActionResult> AddWareHouse ( [FromBody] Warehouse wareHouse )
            {
            // 1️⃣ Permission check: ensure the user can insert a warehouse
            string roleId = await GetUserRoleIdAsync();
            if (!await _permissionService.HasPermission(roleId, "Warehouse", "Inventory System", "Insert"))
                return Forbid();  // 403 if lacking permission

            // 2️⃣ Validate payload
            if (wareHouse == null)
                return BadRequest("Warehouse data is null.");

            var checkwarehouse = await _context.Warehouses.FirstOrDefaultAsync(i => i.WarehouseName.Trim() == wareHouse.WarehouseName.Trim());
            if (checkwarehouse != null)
                return BadRequest(new { Succeeded = false, Message = "Warehouse Name already exists." });

            // 3️⃣ Begin a database transaction for atomicity
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
                {
                // 4️⃣ Populate audit fields on the new entity
                wareHouse.CreatedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                wareHouse.CreatedOn = DateTime.Now;
                wareHouse.IsActive = 1;   // mark as active by default

                // 5️⃣ Add the warehouse entity to EF Core's change tracker
                await _context.Warehouses.AddAsync(wareHouse);
                var changes = await _context.SaveChangesAsync();  // persist to DB

                // 6️⃣ If insert succeeded, write an entry to the ActivityLog
                if (changes > 0)
                    {
                    // Build a simple object capturing the new warehouse’s key fields
                    var logWareHouse = new
                        {
                        wareHouse.WarehouseName,
                        wareHouse.Address,
                        wareHouse.WarehouseContactPerson,
                        wareHouse.ContactNo,
                        wareHouse.Capacity
                        };

                    // Create and save the activity log record
                    var activityLog = new ActivityLog
                        {
                        MenuItemId = 11,                             // code for Warehouse menu
                        ParentTableId = wareHouse.WarehouseID,          // link log to this new warehouse
                        ActionType = "Create",
                        OldData = string.Empty,
                        NewData = JsonSerializer.Serialize(logWareHouse),
                        UserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                        Date = DateTime.Now
                        };
                    await _activityLogRepository.Create(activityLog);
                    }

                // 7️⃣ Commit the transaction so all changes become permanent
                await transaction.CommitAsync();

                // 8️⃣ Return HTTP 200 OK with the created Warehouse object
                return Ok(wareHouse);
                }
            catch (Exception ex)
                {
                // 🔄 On error, roll back any changes made during this transaction
                await transaction.RollbackAsync();
                Console.WriteLine($"Error adding warehouse: {ex.Message}");
                return StatusCode(500, "Internal server error.");
                }
            }



        // PUT /api/Warehouse/{id}
        // Updates an existing Warehouse record after validating permissions and input, with audit logging.
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateWareHouse ( int id, [FromBody] Warehouse wareHouse )
            {
            // 1️⃣ Permission check: ensure the user has "Update" rights on the Warehouse menu
            string roleId = await GetUserRoleIdAsync();
            if (!await _permissionService.HasPermission(roleId, "Warehouse", "Inventory System", "Update"))
                return Forbid();  // HTTP 403 if unauthorized

            // 2️⃣ Validate the payload: must not be null and URL ID must match body ID
            if (wareHouse == null || id != wareHouse.WarehouseID)
                return BadRequest("Invalid warehouse data");  // 400 Bad Request on mismatch

            // 3️⃣ Begin a database transaction for atomicity
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
                {
                // 4️⃣ Load the existing warehouse, ensuring it's active and not soft-deleted
                var existingWareHouse = await _context.Warehouses
                    .FirstOrDefaultAsync(b =>
                        b.WarehouseID == id &&
                        b.IsActive == 1 &&
                        b.IsDeleted == 0
                    );

                // 4.a) If no record found, return 404 Not Found
                if (existingWareHouse == null)
                    return NotFound("Warehouse not found");

                // 5️⃣ Capture the original state for auditing before making changes
                var oldWareHouse = new
                    {
                    existingWareHouse.WarehouseName,
                    existingWareHouse.Address,
                    existingWareHouse.WarehouseContactPerson,
                    existingWareHouse.ContactNo,
                    existingWareHouse.Capacity
                    };

                // 6️⃣ Apply updates from the incoming model
                existingWareHouse.WarehouseName = wareHouse.WarehouseName;
                existingWareHouse.Address = wareHouse.Address;
                existingWareHouse.WarehouseContactPerson = wareHouse.WarehouseContactPerson;
                existingWareHouse.ContactNo = wareHouse.ContactNo;
                existingWareHouse.Capacity = wareHouse.Capacity;
                existingWareHouse.ModifiedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                existingWareHouse.ModifiedOn = DateTime.Now;

                // 7️⃣ Mark entity as modified and save changes
                _context.Warehouses.Update(existingWareHouse);
                var changes = await _context.SaveChangesAsync();

                // 8️⃣ If the update succeeded, log the changes
                if (changes > 0)
                    {
                    // Prepare the new state snapshot for the audit log
                    var newWareHouse = new
                        {
                        wareHouse.WarehouseName,
                        wareHouse.Address,
                        wareHouse.WarehouseContactPerson,
                        wareHouse.ContactNo,
                        wareHouse.Capacity
                        };

                    // Create and persist the audit log entry
                    var activityLog = new ActivityLog
                        {
                        MenuItemId = 11,                    // Warehouse menu code
                        ParentTableId = wareHouse.WarehouseID, // link to this warehouse
                        ActionType = "Update",
                        OldData = System.Text.Json.JsonSerializer.Serialize(oldWareHouse),
                        NewData = System.Text.Json.JsonSerializer.Serialize(newWareHouse),
                        UserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                        Date = DateTime.Now
                        };
                    await _activityLogRepository.Create(activityLog);
                    }

                // 9️⃣ Commit the transaction now that changes and logging succeeded
                await transaction.CommitAsync();

                // 🔟 Return HTTP 200 OK with the updated warehouse entity
                return Ok(existingWareHouse);
                }
            catch (Exception ex)
                {
                // 🔄 On any error, roll back the transaction
                await transaction.RollbackAsync();
                Console.WriteLine($"Error updating warehouse: {ex.Message}");
                return StatusCode(500, "Internal server error.");
                }
            }

        // GET /api/Warehouse/{id}
        // Retrieves a single warehouse by its ID for editing, after validating "Update" permission.
        [HttpGet("{id}")]
        public async Task<IActionResult> GetWareHouseById ( int id )
            {
            // 1️⃣ Permission check: only users with the "Update" right on Warehouse may fetch this.
            string roleId = await GetUserRoleIdAsync();
            if (!await _permissionService.HasPermission(roleId, "Warehouse", "Inventory System", "Update"))
                return Forbid();  // 403 Forbidden if the user lacks permission

            try
                {
                // 2️⃣ Query the Warehouses table:
                //    • Filter by requested ID
                //    • Exclude soft-deleted records (IsDeleted == 0)
                //    • Project into an anonymous DTO containing only the fields needed by the client
                var warehouse = await _context.Warehouses
                    .Where(w => w.WarehouseID == id && w.IsDeleted == 0)
                    .Select(w => new
                        {
                        w.WarehouseID,               // Primary key
                        w.WarehouseName,             // Name of the warehouse
                        w.Address,                   // Physical address
                        w.Capacity,                  // Storage capacity
                        w.WarehouseContactPerson,    // Contact person name
                        w.ContactNo                  // Contact phone number
                        })
                    .FirstOrDefaultAsync();         // Returns null if no match

                // 3️⃣ If no warehouse was found, return 404 Not Found
                if (warehouse == null)
                    return NotFound("Warehouse not found");

                // 4️⃣ Otherwise, return HTTP 200 OK with the projected warehouse data
                return Ok(warehouse);
                }
            catch (Exception ex)
                {
                // 5️⃣ On unexpected errors (e.g., DB connection issues), return 500 Internal Server Error
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }

        // GET /api/Warehouse/detail/{id}
        // Returns detailed information for a single warehouse, including creation timestamp,
        // after verifying the user has "View" permission on the Warehouse menu.
        [HttpGet("detail/{id}")]
        public async Task<IActionResult> DetailWareHouseById ( int id )
            {
            // 1️⃣ Permission check: ensure current user can view warehouse records
            string roleId = await GetUserRoleIdAsync();
            if (!await _permissionService.HasPermission(roleId, "Warehouse", "Inventory System", "View"))
                return Forbid();  // HTTP 403 if user lacks the required permission

            try
                {
                // 2️⃣ Query the Warehouses table:
                //    • Filter by the requested ID
                //    • Exclude soft-deleted records (IsDeleted == 0)
                //    • Project into an anonymous type with only the fields needed
                var warehouse = await _context.Warehouses
                    .Where(w =>
                        w.WarehouseID == id &&
                        w.IsDeleted == 0
                    )
                    .Select(w => new
                        {
                        w.WarehouseID,               // Primary key
                        w.WarehouseName,             // Name for display
                        w.Address,                   // Physical address
                        w.Capacity,                  // Storage capacity
                        w.WarehouseContactPerson,    // Contact person at the facility
                        w.ContactNo,                 // Contact phone number
                        w.CreatedOn                   // Timestamp when this record was created
                        })
                    .FirstOrDefaultAsync();          // Executes the query; returns null if not found

                // 3️⃣ If no matching warehouse exists, return 404 Not Found
                if (warehouse == null)
                    return NotFound("Warehouse not found");

                // 4️⃣ Otherwise, return HTTP 200 OK with the detailed warehouse info
                return Ok(warehouse);
                }
            catch (Exception ex)
                {
                // 5️⃣ On unexpected errors (e.g., database issues), return HTTP 500
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }



        // DELETE /api/Warehouse/{id}
        // Soft-deletes an existing warehouse record by setting IsDeleted flag,
        // after verifying the user has "Delete" permission on the Warehouse menu.
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteWareHouse ( int id )
            {
            // 1️⃣ Permission check: ensure user has the "Delete" right
            string roleId = await GetUserRoleIdAsync();
            if (!await _permissionService.HasPermission(roleId, "Warehouse", "Inventory System", "Delete"))
                return Forbid();  // HTTP 403 if unauthorized

            try
                {
                // 2️⃣ Load the warehouse to delete (only active, non-deleted records)
                var existingWareHouse = await _context.Warehouses
                    .FirstOrDefaultAsync(w =>
                        w.WarehouseID == id &&
                        w.IsActive == 1 &&
                        w.IsDeleted == 0
                    );

                // 2.a) If not found, return 404 Not Found
                if (existingWareHouse == null)
                    return NotFound("Warehouse not found");

                // 3️⃣ Perform a soft-delete by marking IsDeleted = 1
                existingWareHouse.IsDeleted = 1;

                // 4️⃣ Update audit fields to track who and when
                existingWareHouse.ModifiedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                existingWareHouse.ModifiedOn = DateTime.Now;

                // 5️⃣ Persist the soft-delete to the database
                _context.Warehouses.Update(existingWareHouse);
                await _context.SaveChangesAsync();

                // 6️⃣ Return HTTP 200 OK with the updated entity
                return Ok(existingWareHouse);
                }
            catch (Exception ex)
                {
                // 7️⃣ On error, log for diagnostics and return HTTP 500
                Console.WriteLine($"Error deleting warehouse: {ex.Message}");
                return StatusCode(500, "Internal server error.");
                }
            }


        // GET /api/Warehouse/activity_log/warehouse/{id}
        // Retrieves the audit trail for a specific warehouse (MenuItemId = 11), 
        // including the action taken, previous & new data, warehouse name, and the user who performed the action.
        [HttpGet("activity_log/warehouse/{id}")]
        public async Task<IActionResult> GetActivityLogsForWarehouse ( int id )
            {
            try
                {
                // 1️⃣ Start from the ActivityLogs table, filtering to only entries for the Warehouse menu
                var logs = await _context.ActivityLogs
                    .Where(a => a.MenuItemId == 11)

                    // 2️⃣ LEFT JOIN to Users to fetch the username for each log entry
                    .GroupJoin(
                        _context.Users,
                        log => log.UserId,    // key in ActivityLogs
                        user => user.Id,       // key in Users
                        ( log, users ) => new { log, users }
                    )
                    .SelectMany(
                        temp => temp.users.DefaultIfEmpty(),       // include logs even if the user record no longer exists
                        ( temp, user ) => new { temp.log, user }
                    )

                    // 3️⃣ LEFT JOIN to Warehouses to associate each log entry with its warehouse record
                    .GroupJoin(
                        _context.Warehouses,
                        temp => temp.log.ParentTableId,     // ParentTableId stores the WarehouseID
                        warehouse => warehouse.WarehouseID,      // primary key in Warehouses
                        ( temp, whs ) => new { temp.log, temp.user, whs }
                    )
                    .SelectMany(
                        temp => temp.whs.DefaultIfEmpty(),        // include logs even if the warehouse record is missing
                        ( temp, wh ) => new { temp.log, temp.user, wh }
                    )

                    // 4️⃣ Filter to only the audit entries for the requested WarehouseID
                    .Where(x => x.wh != null && x.wh.WarehouseID == id)

                    // 5️⃣ Project into the shape the client expects
                    .Select(x => new
                        {
                        x.log.ActionType,                          // e.g. "Create", "Update", "Delete"
                        x.log.OldData,                             // JSON string of the previous state
                        x.log.NewData,                             // JSON string of the new state
                        WarehouseName = x.wh.WarehouseName,        // the name of the warehouse for context
                        UserName = x.user != null
                                         ? x.user.UserName         // the username who performed the action
                                         : null,
                        x.log.Date                                 // timestamp of the action
                        })
                    .ToListAsync();                                // execute the combined query

                // 6️⃣ Return HTTP 200 OK with the list of audit entries
                return Ok(logs);
                }
            catch (Exception ex)
                {
                // 7️⃣ On error, return HTTP 500 with a descriptive message
                return StatusCode(500, "An error occurred while retrieving activity logs: " + ex.Message);
                }
            }

        /// <summary>
        /// Helper method to retrieve the current user's role ID from the AspNetUserRoles table.
        /// Returns null if the user is not authenticated or has no role assigned.
        /// </summary>
        private async Task<string> GetUserRoleIdAsync ( )
            {
            // 1️⃣ Extract the user’s unique identifier from the JWT claims
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            // 1.a) If no userId claim is present, the user is not authenticated
            if (string.IsNullOrEmpty(userId))
                {
                return null;
                }

            // 2️⃣ Query the UserRoles table for the first role associated with this user
            //    • Where UserId matches
            //    • Select only the RoleId column
            //    • FirstOrDefaultAsync returns null if the user has no roles
            var userRole = await _context.UserRoles
                .Where(ur => ur.UserId == userId)
                .Select(ur => ur.RoleId)
                .FirstOrDefaultAsync();

            // 3️⃣ Return the found role ID (or null if none)
            return userRole;
            }
        }
}

