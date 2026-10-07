using Microsoft.AspNetCore.Mvc;
using SalesInventoryAPI.Models;
using SalesInventoryAPI.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using System.Security.Claims;
using SalesInventoryAPI.Data.Services;
using SalesInventoryAPI.Data.ViewModels;
using Microsoft.IdentityModel.Logging;
using Microsoft.AspNetCore.Authorization;

namespace SalesInventoryAPI.Controller
    {

    [Authorize]
[ApiController]
[Route("api/[controller]")]
public class SellerController : ControllerBase
    {
    private readonly InventoryDbContext _context;
    private readonly PermissionService _permissionService;
    private readonly ActivityLogRepository _activityLogRepository;

    public SellerController(InventoryDbContext context, PermissionService permissionService, ActivityLogRepository activityLogRepository)
        {
        _context = context;
        _permissionService = permissionService;
        _activityLogRepository = activityLogRepository;
        }
        /// <summary>
        /// GET /api/Seller
        /// Returns a list of all active, non-deleted sellers with an index for UI display.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAllSellers ( )
            {
            // 1) Check "View" permission for the Seller menu
            string roleId = await GetUserRoleIdAsync();
            if (!await _permissionService.HasPermission(roleId, "Seller", "Inventory System", "View"))
                return Forbid();

            try
                {
                // 2) Query active sellers and project into lightweight DTO
                var sellers = await _context.Sellers
                    .Where(a => a.IsActive == 1 && a.IsDeleted == 0)
                    .Select(c => new
                        {
                        c.SellerId,
                        c.SellerName,
                        c.ContactNo,
                        c.Email
                        })
                    .ToListAsync();

                // 3) Add a 1-based index for ordering in the UI
                var indexedSellers = sellers
                    .Select(( seller, index ) => new
                        {
                        Index = index + 1,
                        seller.SellerId,
                        seller.SellerName,
                        seller.ContactNo,
                        seller.Email
                        })
                    .ToList();

                return Ok(indexedSellers);
                }
            catch (Exception ex)
                {
                // 4) Return 500 on failure
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }


        /// <summary>
        /// POST /api/Seller
        /// Creates a new seller record, sets audit fields, and logs the creation.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> AddSeller ( [FromBody] Seller seller )
            {
            // 1) Check "Insert" permission
            string roleId = await GetUserRoleIdAsync();
            if (!await _permissionService.HasPermission(roleId, "Seller", "Inventory System", "Insert"))
                return Forbid();

            // 2) Validate payload
            if (seller == null)
                return BadRequest("Seller data is null");

            var trimmedSellerName = seller.SellerName.Trim();

            var checkSellerName = await _context.Sellers
                .FirstOrDefaultAsync(i => i.SellerName.Trim() == trimmedSellerName);
            
            if (checkSellerName != null)
                return BadRequest(new { Succeeded = false, Message = "Seller Name already exists." });

            // 3) Begin transaction for atomicity
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
                {
                // 4) Set audit flags
                seller.IsActive = 1;
                seller.CreatedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                seller.CreatedOn = DateTime.Now;

                // 5) Persist new seller
                await _context.Sellers.AddAsync(seller);
                var changes = await _context.SaveChangesAsync();

                // 6) If insert succeeded, write activity log
                if (changes > 0)
                    {
                    var logSeller = new
                        {
                        seller.SellerName,
                        seller.CityID,
                        seller.ContactNo,
                        seller.Email,
                        seller.Address
                        };

                    var activityLog = new ActivityLog
                        {
                        MenuItemId = 14,                   // Seller menu code
                        ParentTableId = seller.SellerId,   // Link to new seller
                        ActionType = "Create",
                        OldData = string.Empty,
                        NewData = System.Text.Json.JsonSerializer.Serialize(logSeller),
                        UserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                        Date = DateTime.Now
                        };

                    await _activityLogRepository.Create(activityLog);
                    }

                // 7) Commit transaction
                await transaction.CommitAsync();
                return Ok(seller);
                }
            catch (Exception ex)
                {
                // 8) Rollback on error
                await transaction.RollbackAsync();
                Console.WriteLine($"Error: {ex.Message}");
                return StatusCode(500, "Internal server error.");
                }
                }


        // DELETE /api/Seller/{id}
        // Permanently deletes a seller record by its ID.
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteSeller ( int id )
            {
            try
                {
                // 1️⃣ Attempt to load the seller from the database.
                //    We do not filter by IsActive/IsDeleted here since deletion is permanent.
                var seller = await _context.Sellers
                    .FirstOrDefaultAsync(c => c.SellerId == id);

                // 2️⃣ If no seller is found with the given ID, return a 404 Not Found.
                if (seller == null)
                    {
                    return NotFound("Seller not found");
                    }

                // 3️⃣ Remove the seller entity from EF Core’s change tracker.
                //    This will issue a DELETE when SaveChangesAsync() is called.
                seller.IsDeleted = 1;
                _context.Sellers.Update(seller);

                // 4️⃣ Persist the deletion to the database.
                await _context.SaveChangesAsync();

                // 5️⃣ Return HTTP 200 OK with a confirmation message.
                return Ok("Seller deleted successfully");
                }
            catch (Exception ex)
                {
                // 💥 If any exception occurs (e.g., DB error), return HTTP 500 with details.
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }

        // GET /api/Seller/{id}
        // Retrieves a single seller by ID for editing, after checking Update permissions.
        [HttpGet("{id}")]
        public async Task<IActionResult> GetSellerById ( int id )
            {
            // 1️⃣ Check if the current user has the "Update" permission on the Seller menu.
            string roleId = await GetUserRoleIdAsync();
            if (!await _permissionService.HasPermission(roleId, "Seller", "Inventory System", "Update"))
                return Forbid();  // 403 if not authorized

            try
                {
                // 2️⃣ Load the seller matching the given ID, only if active and not deleted.
                var seller = await _context.Sellers
                    .Where(b =>
                        b.SellerId == id &&
                        b.IsActive == 1 &&  // only active records
                        b.IsDeleted == 0      // exclude soft-deleted
                    )
                    // 3️⃣ Project into a lightweight anonymous type for the client.
                    .Select(b => new
                        {
                        b.SellerId,
                        b.SellerName,
                        b.CityID,
                        b.ContactNo,
                        b.Email,
                        b.Address
                        })
                    .FirstOrDefaultAsync();  // return null if not found

                // 4️⃣ If no record found, return 404 Not Found.
                if (seller == null)
                    return NotFound("Seller not found");

                // 5️⃣ Otherwise, return 200 OK with the seller details.
                return Ok(seller);
                }
            catch (Exception ex)
                {
                // 6️⃣ On exception (e.g., database error), return 500 with the error message.
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }




        // PUT /api/Seller/{id}
        // Updates an existing seller record after validating permissions and payload.
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateSeller ( int id, [FromBody] Seller seller )
            {
            // 1️⃣ Check "Update" permission on the Seller menu.
            string roleId = await GetUserRoleIdAsync();
            if (!await _permissionService.HasPermission(roleId, "Seller", "Inventory System", "Update"))
                return Forbid();  // 403 Forbidden if user lacks permission

            // 2️⃣ Validate request payload: ensure body is not null and IDs match.
            if (seller == null || id != seller.SellerId)
                return BadRequest("Invalid seller data");  // 400 Bad Request on mismatch

            // 3️⃣ Begin database transaction for atomicity of update + logging.
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
                {
                // 4️⃣ Load the existing seller record (active & not soft-deleted).
                var existingSeller = await _context.Sellers
                    .FirstOrDefaultAsync(b =>
                        b.SellerId == id &&
                        b.IsActive == 1 &&
                        b.IsDeleted == 0
                    );

                // 4.a) If no matching record is found, return 404 Not Found.
                if (existingSeller == null)
                    return NotFound("Seller not found");

                // 5️⃣ Capture the old state for audit logging.
                var oldSeller = new
                    {
                    existingSeller.SellerName,
                    existingSeller.CityID,
                    existingSeller.ContactNo,
                    existingSeller.Email,
                    existingSeller.Address
                    };

                // 6️⃣ Apply updates from the incoming model.
                existingSeller.SellerName = seller.SellerName;
                existingSeller.CityID = seller.CityID;
                existingSeller.ContactNo = seller.ContactNo;
                existingSeller.Email = seller.Email;
                existingSeller.Address = seller.Address;
                existingSeller.ModifiedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                existingSeller.ModifiedOn = DateTime.Now;

                // 7️⃣ Persist the updated entity.
                _context.Sellers.Update(existingSeller);
                var changes = await _context.SaveChangesAsync();

                // 8️⃣ If the update succeeded (changes > 0), record an audit log.
                if (changes > 0)
                    {
                    var newSeller = new
                        {
                        seller.SellerName,
                        seller.CityID,
                        seller.ContactNo,
                        seller.Email,
                        seller.Address
                        };

                    var activityLog = new ActivityLog
                        {
                        MenuItemId = 14,                      // Seller menu code
                        ParentTableId = seller.SellerId,         // Link log to this seller
                        ActionType = "Update",
                        OldData = System.Text.Json.JsonSerializer.Serialize(oldSeller),
                        NewData = System.Text.Json.JsonSerializer.Serialize(newSeller),
                        UserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                        Date = DateTime.Now
                        };

                    await _activityLogRepository.Create(activityLog);
                    }

                // 9️⃣ Commit the transaction to finalize the update + log.
                await transaction.CommitAsync();

                // 1️⃣0️⃣ Return HTTP 200 OK with the updated entity.
                return Ok(existingSeller);
                }
            catch (Exception ex)
                {
                // 🔄 On error, roll back all changes.
                await transaction.RollbackAsync();
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }


        // GET /api/Seller/detail/{id}
        // Returns detailed information for a single seller, including city name and creation timestamp.
        [HttpGet("detail/{id}")]
        public async Task<IActionResult> DetailSellerById ( int id )
            {
            // 1️⃣ Permission check: ensure the user has "View" rights on the Seller menu.
            string roleId = await GetUserRoleIdAsync();
            if (!await _permissionService.HasPermission(roleId, "Seller", "Inventory System", "View"))
                return Forbid();  // HTTP 403 if not authorized

            try
                {
                // 2️⃣ Fetch the seller record by ID, filtering out inactive/deleted entries.
                //    Use LINQ to project directly into an anonymous result.
                var seller = await _context.Sellers
                    .Where(s =>
                        s.SellerId == id &&
                        s.IsActive == 1 &&    // must be active
                        s.IsDeleted == 0       // must not be soft-deleted
                    )
                    .Select(s => new
                        {
                        s.SellerId,            // primary key
                        s.SellerName,          // seller's name
                                               // ▶ Lookup the CityName from the Cities table for display
                        CityName = _context.Cities
                            .Where(c => c.CityId == s.CityID)
                            .Select(c => c.CityName)
                            .FirstOrDefault(),
                        s.ContactNo,           // contact phone
                        s.Email,               // contact email
                        s.Address,             // full address
                        s.CreatedOn            // timestamp when this seller was created
                        })
                    .FirstOrDefaultAsync();   // get a single record or null if none match

                // 3️⃣ If not found, return HTTP 404 Not Found
                if (seller == null)
                    return NotFound("Seller not found");

                // 4️⃣ Otherwise, return HTTP 200 OK with the detailed seller info
                return Ok(seller);
                }
            catch (Exception ex)
                {
                // 5️⃣ On any unexpected error (e.g., DB connectivity), return HTTP 500
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }


        // GET /api/Seller/get-cities
        // Returns the complete list of cities (ID + Name) for dropdowns or lookups.
        [HttpGet("get-cities")]
        public async Task<IActionResult> GetAllCities ( )
            {
            try
                {
                // 1️⃣ Query the Cities table and project into an anonymous type:
                //    • c.CityId   → the primary key
                //    • c.CityName → human-readable name
                var cities = await _context.Cities
                    .Select(c => new
                        {
                        c.CityId,
                        c.CityName
                        })
                    .ToListAsync();  // Execute the query asynchronously

                // 2️⃣ Return HTTP 200 OK with the list of { CityId, CityName } objects
                return Ok(cities);
                }
            catch (Exception ex)
                {
                // 💥 If any exception occurs (e.g., DB connection issue),
                //    return HTTP 500 with the error message for easier debugging.
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }


        // GET /api/Seller/activity_log/seller/{id}
        // Retrieves the audit trail for a specific seller (MenuItemId = 14).
        [HttpGet("activity_log/seller/{id}")]
        public async Task<IActionResult> GetActivityLogsForSeller ( int id )
            {
            try
                {
                // 1️⃣ Start with ActivityLogs, filtering entries for the Seller menu (MenuItemId = 14)
                var logs = await _context.ActivityLogs
                    .Where(a => a.MenuItemId == 14)

                    // 2️⃣ LEFT JOIN to Users to fetch the username for each log entry
                    .GroupJoin(
                        _context.Users,
                        log => log.UserId,    // key in ActivityLogs
                        user => user.Id,       // key in Users
                        ( log, users ) => new { log, users }
                    )
                    .SelectMany(
                        temp => temp.users.DefaultIfEmpty(),      // include logs even if user is missing
                        ( temp, user ) => new { temp.log, user }
                    )

                    // 3️⃣ LEFT JOIN to Sellers to link each log entry back to its seller
                    .GroupJoin(
                        _context.Sellers,
                        temp => temp.log.ParentTableId,          // ParentTableId is the SellerId
                        sel => sel.SellerId,                    // primary key in Sellers
                        ( temp, sellers ) => new { temp.log, temp.user, sellers }
                    )
                    .SelectMany(
                        temp => temp.sellers.DefaultIfEmpty(),  // include logs even if seller record is missing
                        ( temp, seller ) => new { temp.log, temp.user, seller }
                    )

                    // 4️⃣ Filter only the entries for the requested seller ID
                    .Where(x => x.seller != null && x.seller.SellerId == id)

                    // 5️⃣ Project into a client-friendly shape:
                    .Select(x => new
                        {
                        x.log.ActionType,                         // e.g. "Create", "Update", "Delete"
                        x.log.OldData,                            // serialized JSON before change
                        x.log.NewData,                            // serialized JSON after change
                        SellerName = x.seller.SellerName,         // seller’s name for context
                        UserName = x.user != null
                                      ? x.user.UserName           // the username who performed the action
                                      : null,
                        x.log.Date                                // timestamp of the action
                        })
                    .ToListAsync();                                // execute the query asynchronously

                // 6️⃣ Return HTTP 200 OK with the list of audit log entries
                return Ok(logs);
                }
            catch (Exception ex)
                {
                // 7️⃣ On any exception, return HTTP 500 with a generic error message
                return StatusCode(500, "An error occurred while retrieving activity logs: " + ex.Message);
                }
            }

        /// <summary>
        /// Helper method to fetch the current user's role ID from the AspNetUserRoles table.
        /// Returns null if the user is not authenticated or has no role assigned.
        /// </summary>
        private async Task<string> GetUserRoleIdAsync ( )
            {
            // 1️⃣ Retrieve the user's ID from the JWT claims.
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            // 1.a) If there's no user ID in the claims, the user isn't authenticated.
            if (string.IsNullOrEmpty(userId))
                {
                return null;
                }

            // 2️⃣ Look up the first role associated with this user in the UserRoles table.
            //    - This assumes one role per user; adjust if multiple roles are possible.
            var userRole = await _context.UserRoles
                .Where(ur => ur.UserId == userId)
                .Select(ur => ur.RoleId)
                .FirstOrDefaultAsync();

            // 3️⃣ Return the found role ID (or null if none).
            return userRole;
            }

        }
    }
