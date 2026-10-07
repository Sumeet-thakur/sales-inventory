using Microsoft.AspNetCore.Mvc;
using SalesInventoryAPI.Models;
using SalesInventoryAPI.Data;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using SalesInventoryAPI.Data.Services;
using Microsoft.AspNetCore.Authorization;
using System.Text.Json;
using SalesInventoryAPI.Data.ViewModels;
namespace SalesInventoryAPI.Controller
    {
    [Authorize]
    [ApiController]
[Route("api/[controller]")]
public class UnitController : ControllerBase
{
    private readonly InventoryDbContext _context;
    private readonly PermissionService _permissionService;
    private readonly ActivityLogRepository _activityLogRepository;

    public UnitController(InventoryDbContext context, PermissionService permissionService, ActivityLogRepository activityLogRepository)
    {
        _context = context;
        _permissionService = permissionService;
        _activityLogRepository = activityLogRepository;
    }

        // GET /api/Unit
        // Retrieves all active, non-deleted units with an index for display,
        // after verifying the user has "View" permission on the Unit menu.
        [HttpGet]
        public async Task<IActionResult> GetAllUnits ( )
            {
            // 1️⃣ Permission check: ensure the current user can view units
            string roleId = await GetUserRoleIdAsync();
            if (!await _permissionService.HasPermission(roleId, "Unit", "Inventory System", "View"))
                return Forbid();  // HTTP 403 if not authorized

            try
                {
                // 2️⃣ Query the Units table for active, non-deleted records
                var units = await _context.Units
                    .Where(a =>
                        a.IsActive == 1 &&    // include only units marked active
                        a.IsDeleted == 0      // exclude soft-deleted units
                    )
                    // 3️⃣ Project into an anonymous type with only the fields the client needs
                    .Select(c => new
                        {
                        c.UnitId,        // primary key
                        c.UnitName,      // display name
                        c.Description    // optional description of the unit
                        })
                    .ToListAsync();     // execute the query and materialize the list

                // 4️⃣ Add a 1-based index for UI ordering
                var indexedUnits = units
                    .Select(( unit, index ) => new
                        {
                        Index = index + 1,  // row number starting at 1
                        unit.UnitId,
                        unit.UnitName,
                        unit.Description
                        })
                    .ToList();

                // 5️⃣ Return HTTP 200 OK with the indexed list of units
                return Ok(indexedUnits);
                }
            catch (Exception ex)
                {
                // 6️⃣ On any exception (e.g., database error), log for diagnostics and return HTTP 500
                Console.WriteLine($"Error fetching units: {ex.Message}");
                return StatusCode(500, "Internal server error.");
                }
            }


        // GET /api/Unit/{id}
        // Retrieves a single unit by its ID for editing, after checking "Update" permission.
        [HttpGet("{id}")]
        public async Task<IActionResult> GetUnitById ( int id )
            {
            // 1️⃣ Permission check: ensure the current user has the "Update" right on the Unit menu
            string roleId = await GetUserRoleIdAsync();
            if (!await _permissionService.HasPermission(roleId, "Unit", "Inventory System", "Update"))
                return Forbid();  // 403 Forbidden if the user lacks permission

            try
                {
                // 2️⃣ Query the Units table:
                //    • Filter to the specific UnitId
                //    • Only include active (IsActive == 1), non-deleted (IsDeleted == 0) records
                //    • Project into an anonymous DTO with only the fields the client needs
                var unit = await _context.Units
                    .Where(u =>
                        u.UnitId == id &&
                        u.IsActive == 1 &&
                        u.IsDeleted == 0
                    )
                    .Select(u => new
                        {
                        u.UnitId,       // primary key
                        u.UnitName,     // display name
                        u.Description   // optional descriptive text
                        })
                    .FirstOrDefaultAsync();  // returns null if no match

                // 3️⃣ If no matching unit is found, return 404 Not Found
                if (unit == null)
                    return NotFound("Unit not found.");

                // 4️⃣ Otherwise, return HTTP 200 OK with the unit data
                return Ok(unit);
                }
            catch (Exception ex)
                {
                // 5️⃣ On any unexpected error (e.g., database connectivity issue),
                //    log for diagnostics and return HTTP 500 Internal Server Error
                Console.WriteLine($"Error fetching unit by ID: {ex.Message}");
                return StatusCode(500, "Internal server error.");
                }
            }


        // POST /api/Unit
        // Creates a new Unit record, sets audit fields, and logs the creation action.
        [HttpPost]
        public async Task<IActionResult> AddUnit ( [FromBody] Unit unit )
            {
            // 1️⃣ Permission check: ensure the user is allowed to insert units
            string roleId = await GetUserRoleIdAsync();
            if (!await _permissionService.HasPermission(roleId, "Unit", "Inventory System", "Insert"))
                return Forbid();  // 403 Forbidden if unauthorized

            // 2️⃣ Validate incoming payload
            if (unit == null)
                return BadRequest("Unit data is null.");  // 400 Bad Request on missing body
            var checkUnitName = await _context.Units
               .FirstOrDefaultAsync(i => i.UnitName.Trim() == unit.UnitName.Trim() );
            if (checkUnitName != null)
                return BadRequest(new { Succeeded = false, Message = "Unit Name already exists." });

            // 3️⃣ Begin a database transaction so we can roll back on failure
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
                {

                // 4️⃣ Populate audit fields on the new entity
                unit.CreatedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                unit.CreatedOn = DateTime.Now;
                unit.IsActive = 1;   // mark as active
                unit.IsDeleted = 0;   // ensure not deleted

                // 5️⃣ Add the new Unit to EF Core’s change tracker
                await _context.Units.AddAsync(unit);
                var changes = await _context.SaveChangesAsync();  // persist to DB

                // 6️⃣ If insertion succeeded, write an ActivityLog entry
                if (changes > 0)
                    {
                    // a) Build a minimal snapshot of the new unit’s data
                    var logUnit = new
                        {
                        unit.UnitId,
                        unit.UnitName,
                        unit.Description,
                        unit.CreatedOn
                        };

                    // b) Create and save the audit log record
                    var activityLog = new ActivityLog
                        {
                        MenuItemId = 15,                                      // code for "Unit" menu
                        ParentTableId = unit.UnitId,                             // link log to this unit
                        ActionType = "Create",
                        OldData = string.Empty,                            // no previous state
                        NewData = JsonSerializer.Serialize(logUnit),       // serialized new state
                        UserId = unit.CreatedBy,                         // who performed the action
                        Date = DateTime.Now
                        };
                    await _activityLogRepository.Create(activityLog);
                    }

                // 7️⃣ Commit the transaction to finalize both insert and log
                await transaction.CommitAsync();

                // 8️⃣ Return HTTP 200 OK with the created unit entity
                return Ok(unit);
                }
            catch (Exception ex)
                {
                // 🔄 Roll back the transaction on any error
                await transaction.RollbackAsync();
                Console.WriteLine($"Error adding unit: {ex.Message}");  // log locally for debugging
                return StatusCode(500, "Internal server error.");       // generic 500 to client
                }
            }



        // PUT /api/Unit/{id}
        // Updates an existing Unit after validating permissions and request data, 
        // wraps the update and audit log in a transaction for atomicity.
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUnit ( int id, [FromBody] Unit unit )
            {
            // 1️⃣ Permission check: ensure the user has the "Update" right on the Unit menu
            string roleId = await GetUserRoleIdAsync();
            if (!await _permissionService.HasPermission(roleId, "Unit", "Inventory System", "Update"))
                return Forbid();  // 403 Forbidden if unauthorized

            // 2️⃣ Validate payload: must not be null and URL ID must match the body ID
            if (unit == null || id != unit.UnitId)
                return BadRequest("Invalid unit data.");  // 400 Bad Request on mismatch

            // 3️⃣ Begin a database transaction for atomic update + logging
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
                {
                // 4️⃣ Retrieve the existing unit record, only if active and not soft-deleted
                var existingUnit = await _context.Units
                    .FirstOrDefaultAsync(u =>
                        u.UnitId == id &&
                        u.IsActive == 1 &&
                        u.IsDeleted == 0
                    );
                if (existingUnit == null)
                    return NotFound("Unit not found.");  // 404 if no matching record

                // 5️⃣ Snapshot the old state for audit logging
                var oldUnit = new
                    {
                    existingUnit.UnitId,
                    existingUnit.UnitName,
                    existingUnit.Description,
                    existingUnit.CreatedOn
                    };

                // 6️⃣ Apply updates to the entity fields
                existingUnit.UnitName = unit.UnitName;
                existingUnit.Description = unit.Description;
                existingUnit.ModifiedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                existingUnit.ModifiedOn = DateTime.Now;

                // 7️⃣ Mark the entity as modified and save changes
                _context.Units.Update(existingUnit);
                var changes = await _context.SaveChangesAsync();

                // 8️⃣ If the update succeeded, create an audit log entry
                if (changes > 0)
                    {
                    // a) Build a snapshot of the new state
                    var newUnit = new
                        {
                        unit.UnitId,
                        unit.UnitName,
                        unit.Description,
                        unit.CreatedOn
                        };

                    // b) Create and persist the ActivityLog record
                    var activityLog = new ActivityLog
                        {
                        MenuItemId = 15,                              // code for the Unit menu
                        ParentTableId = unit.UnitId,                     // link to the updated unit
                        ActionType = "Update",                        // type of action
                        OldData = JsonSerializer.Serialize(oldUnit),// previous state as JSON
                        NewData = JsonSerializer.Serialize(newUnit),// new state as JSON
                        UserId = existingUnit.ModifiedBy,          // who performed the update
                        Date = DateTime.Now                     // timestamp
                        };
                    await _activityLogRepository.Create(activityLog);
                    }

                // 9️⃣ Commit the transaction to finalize both update and log
                await transaction.CommitAsync();

                // 🔟 Return HTTP 200 OK with the updated entity
                return Ok(existingUnit);
                }
            catch (Exception ex)
                {
                // 🔄 On error, roll back the transaction
                await transaction.RollbackAsync();
                Console.WriteLine($"Error updating unit: {ex.Message}");
                return StatusCode(500, "Internal server error.");
                }
            }



        // DELETE /api/Unit/{id}
        // Soft-deletes a unit by setting its IsDeleted flag to 1, only if it's active and not already deleted.
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUnit ( int id )
            {
            try
                {
                // 1️⃣ Load the unit record by ID, ensuring it is currently active and not deleted
                var unit = await _context.Units
                    .FirstOrDefaultAsync(c =>
                        c.UnitId == id &&
                        c.IsActive == 1 &&
                        c.IsDeleted == 0
                    );

                // 1.a) If no matching active unit exists, return 404 Not Found
                if (unit == null)
                    return NotFound("Unit not found.");

                // 2️⃣ Mark the unit as deleted (soft-delete)
                unit.IsDeleted = 1;

                // 3️⃣ Update the entity in EF Core’s change tracker
                _context.Units.Update(unit);

                // 4️⃣ Persist the change to the database
                await _context.SaveChangesAsync();

                // 5️⃣ Return HTTP 200 OK with a confirmation message
                return Ok("Unit deleted successfully.");
                }
            catch (Exception ex)
                {
                // 6️⃣ On any exception (e.g., DB error), log for diagnostics and return HTTP 500
                Console.WriteLine($"Error deleting unit: {ex.Message}");
                return StatusCode(500, "Internal server error.");
                }
            }


        // GET /api/Unit/detail/{id}
        // Retrieves detailed information for a single unit, after validating "View" permission.
        [HttpGet("detail/{id}")]
        public async Task<IActionResult> DetailUnitById ( int id )
            {
            // 1️⃣ Permission check: ensure user has the "View" right on the Unit menu
            string roleId = await GetUserRoleIdAsync();
            if (!await _permissionService.HasPermission(roleId, "Unit", "Inventory System", "View"))
                return Forbid();  // HTTP 403 if not authorized

            try
                {
                // 2️⃣ Query the Units table:
                //    • Filter for the specific UnitId
                //    • Only include active, non-deleted records
                //    • Project into an anonymous type with the fields needed by the client
                var unit = await _context.Units
                    .Where(u =>
                        u.UnitId == id &&
                        u.IsActive == 1 &&
                        u.IsDeleted == 0
                    )
                    .Select(u => new
                        {
                        u.UnitId,       // primary key
                        u.UnitName,     // display name
                        u.Description,  // description text
                        u.CreatedOn     // timestamp of creation
                        })
                    .FirstOrDefaultAsync();  // return single record or null

                // 3️⃣ If no matching unit found, return 404 Not Found
                if (unit == null)
                    return NotFound("Unit not found.");

                // 4️⃣ Return HTTP 200 OK with the detailed unit info
                return Ok(unit);
                }
            catch (Exception ex)
                {
                // 5️⃣ On unexpected errors (e.g., database issues), log and return HTTP 500
                Console.WriteLine($"Error retrieving unit details: {ex.Message}");
                return StatusCode(500, "Internal server error.");
                }
            }

        // GET /api/Unit/activity_log/unit/{id}
        // Retrieves the audit trail for a specific Unit (MenuItemId = 15),
        // including who performed each action and the unit’s name for context.
        [HttpGet("activity_log/unit/{id}")]
        public async Task<IActionResult> GetActivityLogsForUnit ( int id )
            {
            try
                {
                // 1️⃣ Start from the ActivityLogs table, filtering entries for the Unit menu
                var logs = await _context.ActivityLogs
                    .Where(a => a.MenuItemId == 15)

                    // 2️⃣ LEFT JOIN to Users to get the username for each log entry
                    .GroupJoin(
                        _context.Users,
                        log => log.UserId,   // key on ActivityLogs.UserId
                        user => user.Id,      // key on Users.Id
                        ( log, users ) => new { log, users }
                    )
                    .SelectMany(
                        temp => temp.users.DefaultIfEmpty(),      // preserve logs even if user record is missing
                        ( temp, user ) => new { temp.log, user }
                    )

                    // 3️⃣ LEFT JOIN to Units to associate each log with its unit record
                    .GroupJoin(
                        _context.Units,
                        temp => temp.log.ParentTableId,          // ActivityLogs.ParentTableId stores the UnitId
                        u => u.UnitId,                        // Units.UnitId is the primary key
                        ( temp, units ) => new { temp.log, temp.user, units }
                    )
                    .SelectMany(
                        temp => temp.units.DefaultIfEmpty(),     // preserve logs even if unit record is missing
                        ( temp, unit ) => new { temp.log, temp.user, unit }
                    )

                    // 4️⃣ Filter to only the entries for the requested UnitId
                    .Where(x => x.unit != null && x.unit.UnitId == id)

                    // 5️⃣ Project into a client-friendly shape
                    .Select(x => new
                        {
                        x.log.ActionType,                         // e.g. "Create", "Update", "Delete"
                        x.log.OldData,                            // JSON snapshot of previous state
                        x.log.NewData,                            // JSON snapshot of new state
                        UnitName = x.unit.UnitName,               // the name of the unit for context
                        UserName = x.user != null
                                      ? x.user.UserName           // username who performed the action
                                      : null,
                        x.log.Date                                // timestamp of the action
                        })
                    .ToListAsync();                             // execute the combined query

                // 6️⃣ Return HTTP 200 OK with the list of audit entries
                return Ok(logs);
                }
            catch (Exception ex)
                {
                // 7️⃣ On error (e.g., DB failure), return HTTP 500 with a generic message
                return StatusCode(500, "An error occurred while retrieving activity logs: " + ex.Message);
                }
            }


        /// <summary>
        /// Retrieves the current user's role ID from the AspNetUserRoles table.
        /// Returns null if the user is not authenticated or has no role assigned.
        /// </summary>
        private async Task<string> GetUserRoleIdAsync ( )
            {
            // 1️⃣ Extract the user's unique identifier from their claims
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            // 1.a) If there's no userId in the claims, the user is unauthenticated
            if (string.IsNullOrEmpty(userId))
                {
                return null;
                }

            // 2️⃣ Query the UserRoles table for any roles linked to this user:
            //    • Filter by UserId
            //    • Project only the RoleId
            //    • FirstOrDefaultAsync returns null if the user has no roles
            var userRole = await _context.UserRoles
                .Where(ur => ur.UserId == userId)
                .Select(ur => ur.RoleId)
                .FirstOrDefaultAsync();

            // 3️⃣ Return the found RoleId, or null if none was found
            return userRole;
            }

        }
    }



