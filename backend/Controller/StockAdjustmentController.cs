using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Org.BouncyCastle.Asn1.Ocsp;
using SalesInventoryAPI.Data;
using SalesInventoryAPI.Data.DTOs;
using SalesInventoryAPI.Data.Services;
using SalesInventoryAPI.Data.ViewModels;
using SalesInventoryAPI.Models;        // your EF entities
using System.Data;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using static SalesInventoryAPI.Models.AppConstants;

namespace SalesInventoryAPI.Controller
    {
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class StockAdjustmentController : ControllerBase
        {
        private readonly InventoryDbContext _context;
        private readonly PermissionService _permissionService;
        private readonly ActivityLogRepository _activityLogRepository;
        private readonly ReviseLogRepository _reviseLogRepository;
        private readonly CodeGenerator _codeGenerator;
        private readonly AppFilesService _appFilesService;


        public StockAdjustmentController (
            InventoryDbContext context,
            PermissionService permissionService,
            ActivityLogRepository activityLogRepository,
            CodeGenerator codeGenerator,
            ReviseLogRepository reviseLogRepository,
            AppFilesService appFilesService)
            {
            _context = context;
            _permissionService = permissionService;
            _activityLogRepository = activityLogRepository;
            _codeGenerator = codeGenerator;
            _reviseLogRepository = reviseLogRepository;
            _appFilesService = appFilesService;
            }

        /// <summary>
        /// GET /api/stockadjustment/{id}
        /// Retrieves a single StockAdjustment by its ID, including its line items and any attachments.
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById ( int id )
            {
            // 1️⃣ Load the StockAdjustment header and its child records in one query:
            //    • Include related StockAdjustmentChildren for eager loading
            //    • AsNoTracking to improve performance since we’re only reading
            var entity = await _context.StockAdjustments
                .Include(s => s.StockAdjustmentChildren)
                .AsNoTracking()
                .FirstOrDefaultAsync(s =>
                    s.StockAdjustmentID == id &&  // match requested ID
                    s.IsActive == 1 &&  // only active records
                    s.IsDeleted == 0     // exclude soft-deleted
                );

            // 2️⃣ If not found, return 404 Not Found
            if (entity == null)
                return NotFound($"StockAdjustment with ID {id} not found.");

            // 3️⃣ Map the EF entity into our view model
            var vm = new StockAdjustmentVM
                {
                // --- Header fields ---
                StockAdjustmentID = entity.StockAdjustmentID,
                RefNo = entity.RefNo,
                Date = entity.Date,
                AdjustmentTypeID = entity.AdjustmentTypeID,
                Description = entity.Description,
                TotalQuantity = entity.TotalQuantity,
                StatusId = entity.StatusId,
                WareHouseId = entity.WareHouseId,

                // --- Child line items ---
                StockAdjustmentChildVMs = entity.StockAdjustmentChildren
                    .Where(c => c.IsActive == 1 && c.IsDeleted == 0)  // only active, non-deleted children
                    .Select(c => new StockAdjustmentChildVM
                        {
                        StockAdjustmentChildID = c.StockAdjustmentChildID,
                        StockAdjustmentID = c.StockAdjustmentID,
                        ItemID = c.ItemID,
                        Quantity = c.Quantity,

                        // ▶ Compute current stock for this item across all active ItemStocks
                        ItemStock = _context.ItemStocks
                            .Where(s => s.ItemID == c.ItemID && s.IsActive == 1)
                            .Sum(s => (decimal?)s.Quantity) ?? 0
                        })
                    .ToList(),

                // --- File attachments ---
                MultipleAttachments = _context.Multipleattachments
                    .Where(m =>
                        m.MenuItemId == 33 &&                       // menu code for StockAdjustment
                        m.ParentTableId == entity.StockAdjustmentID && // link by parent ID
                        m.IsActive == 1 &&
                        m.IsDeleted == 0
                    )
                    .Select(m => new MultipleAttachmentVM
                        {
                        MultipleAttachmentfileId = m.MultipleAttachmentfileId,
                        FileName = m.FileName!,
                        FilePath = m.FilePath!,
                        Referenceno = m.Referenceno!
                        })
                    .ToList()
                };

            // 4️⃣ Return HTTP 200 OK with the fully populated view model
            return Ok(vm);
            }


        /// <summary>
        /// POST /api/stockadjustment
        /// Creates a new StockAdjustment (with line items and optional file attachments) in one atomic operation.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Create (
            [FromForm] string request,              // JSON-serialized StockAdjustmentVM
            [FromForm] List<IFormFile> attachments  // Optional attachments uploaded alongside the form
        )
            {
            // 1️⃣ Deserialize the incoming JSON payload into our view model
            var vm = JsonSerializer.Deserialize<StockAdjustmentVM>(request);
            if (vm == null)
                return BadRequest("Invalid payload.");  // 400 Bad Request if deserialization fails

            // 2️⃣ Start a database transaction to ensure atomicity of our insert + log + attachments
            await using var tx = await _context.Database.BeginTransactionAsync();
            var currentUser = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "System";

            try
                {
                // 3️⃣ Map view model fields to the StockAdjustment entity
                var entity = new StockAdjustment
                    {
                    RefNo = vm.RefNo,                     // Reference number (or generate via CodeGenerator)
                    Date = vm.Date,                      // Movement date
                    AdjustmentTypeID = vm.AdjustmentTypeID,        // e.g. "Increase" or "Decrease"
                    Description = vm.Description,               // Description of adjustment
                    TotalQuantity = vm.TotalQuantity,             // Sum of all child quantities
                    StatusId = 1,                            // Default status (e.g. Pending)
                    WareHouseId = vm.WareHouseId,               // Affected warehouse
                    CreatedBy = currentUser,                  // Audit field
                    CreatedOn = DateTime.Now,                 // Audit field
                    IsActive = 1,                            // Mark record as active
                    IsDeleted = 0                             // Ensure not soft-deleted
                    };

                // 4️⃣ Map each line item in the VM into the entity's child collection
                foreach (var child in vm.StockAdjustmentChildVMs ?? Enumerable.Empty<StockAdjustmentChildVM>())
                    {
                    entity.StockAdjustmentChildren.Add(new StockAdjustmentChild
                        {
                        ItemID = child.ItemID,                   // FK to the Item table
                        Quantity = child.Quantity,                 // Adjustment quantity for this item
                        IsActive = 1,                               // Active child record
                        IsDeleted = 0                                // Not soft-deleted
                        });
                    }

                // 5️⃣ Add the parent entity (and its children) to EF Core for insertion
                await _context.StockAdjustments.AddAsync(entity);
                await _context.SaveChangesAsync();  // Persist to generate entity.StockAdjustmentID

                // 6️⃣ Build a concise payload representing the new state for logging
                var logPayload = new
                    {
                    entity.StockAdjustmentID,
                    entity.RefNo,
                    entity.Date,
                    entity.AdjustmentTypeID,
                    entity.Description,
                    entity.TotalQuantity,
                    entity.StatusId,
                    entity.WareHouseId,
                    Children = entity.StockAdjustmentChildren
                                 .Select(c => new { c.StockAdjustmentChildID, c.ItemID, c.Quantity })
                                 .ToList()
                    };

                // 7️⃣ Create an audit log entry capturing the creation action
                await _activityLogRepository.Create(new ActivityLog
                    {
                    MenuItemId = 33,                            // Identifier for StockAdjustment menu
                    ParentTableId = entity.StockAdjustmentID,      // Link log to this new record
                    ActionType = "Create",
                    OldData = string.Empty,                  // No previous state
                    NewData = JsonSerializer.Serialize(logPayload),
                    UserId = currentUser,                   // Who performed the action
                    Date = DateTime.Now                   // Timestamp of the action
                    });

                // 8️⃣ Handle optional file attachments
                for (int i = 0; i < attachments.Count; i++)
                    {
                    var formFile = attachments[i];
                    // Match metadata by index—front‑end should align indices in MultipleAttachments
                    var metaRef = vm.MultipleAttachments?.ElementAtOrDefault(i)?.Referenceno ?? string.Empty;

                    var appFile = new MultipleAttachment
                        {
                        MenuItemId = 33,                         // StockAdjustment menu code
                        MenuItemName = "Stock Adjustments",
                        ParentTableId = entity.StockAdjustmentID,
                        FileName = formFile.FileName,
                        Referenceno = metaRef,
                        Date = DateTime.Now,
                        CreatedBy = currentUser,
                        CreatedOn = DateTime.Now,
                        IsActive = 1,
                        IsDeleted = 0
                        };
                    // Upload persists DB record and stores the file
                    await _appFilesService.Upload(appFile, formFile);
                    }

                // 9️⃣ Commit the transaction now that all steps succeeded
                await tx.CommitAsync();

                // 🔟 Return HTTP 201 Created with a Location header to the new resource
                return CreatedAtAction(
                    nameof(GetById),
                    new { id = entity.StockAdjustmentID },
                    new { entity.StockAdjustmentID }
                );
                }
            catch (Exception ex)
                {
                // 🔄 On any error, roll back all changes
                await tx.RollbackAsync();
                // Optionally log the exception here
                return StatusCode(500, $"An error occurred while creating StockAdjustment: {ex.Message}");
                }
            }


        /// <summary>
        /// PUT /api/stockadjustment/{id}
        /// Updates an existing StockAdjustment, syncs its child lines, adjusts inventory if approved,
        /// handles file attachments, and logs the changes—all within a single transaction.
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> Update (
            int id,
            [FromForm] string request,              // JSON payload representing updated StockAdjustmentVM
            [FromForm] List<IFormFile> attachments, // New attachments to add
            [FromForm] string removeAttachmentIds   // JSON array of attachment IDs to remove
        )
            {
            // 1️⃣ Deserialize the JSON into our view model and validate IDs
            var vm = JsonSerializer.Deserialize<StockAdjustmentVM>(request);
            if (vm == null || vm.StockAdjustmentID != id)
                return BadRequest("Invalid request data.");

            // Capture the current user for audit fields
            var currentUser = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "System";

            // 2️⃣ Load the existing StockAdjustment with its children
            var entity = await _context.StockAdjustments
                .Include(s => s.StockAdjustmentChildren)
                .FirstOrDefaultAsync(s =>
                    s.StockAdjustmentID == id &&
                    s.IsActive == 1 &&
                    s.IsDeleted == 0
                );
            if (entity == null)
                return NotFound($"StockAdjustment with ID {id} not found.");

            // Determine if this adjustment type affects inventory (e.g., Increase vs. Decrease)
            bool inventoryEffect = await _context.AdjustmentTypes
                .Where(a => a.AdjustmentTypeID == vm.AdjustmentTypeID)
                .Select(a => a.InventoryEffect == 1)
                .FirstOrDefaultAsync();

            // 3️⃣ Begin a transaction to wrap updates, stock changes, and logging
            await using var tx = await _context.Database.BeginTransactionAsync();
            try
                {
                // Deserialize list of attachment IDs the client wants removed
                var toRemove = JsonSerializer.Deserialize<List<int>>(removeAttachmentIds) ?? new List<int>();

                // 4️⃣ Snapshot the old state for the audit log
                var oldPayload = new
                    {
                    entity.StockAdjustmentID,
                    entity.RefNo,
                    entity.Date,
                    entity.AdjustmentTypeID,
                    entity.Description,
                    entity.TotalQuantity,
                    entity.StatusId,
                    entity.WareHouseId,
                    Children = entity.StockAdjustmentChildren
                        .Where(c => c.IsActive == 1 && c.IsDeleted == 0)
                        .Select(c => new { c.StockAdjustmentChildID, c.ItemID, c.Quantity })
                        .ToList()
                    };

                // 5️⃣ Update header fields from the view model
                entity.Date = vm.Date;
                entity.AdjustmentTypeID = vm.AdjustmentTypeID;
                entity.Description = vm.Description;
                entity.TotalQuantity = vm.TotalQuantity;
                entity.StatusId = vm.StatusId;
                entity.WareHouseId = vm.WareHouseId;
                entity.ModifiedBy = currentUser;
                entity.ModifiedOn = DateTime.Now;

                // 6️⃣ Reconcile child lines:
                //    a) Determine which existing children were removed by the client
                var incomingIds = vm.StockAdjustmentChildVMs
                    .Where(c => c.StockAdjustmentChildID > 0)
                    .Select(c => c.StockAdjustmentChildID)
                    .ToList();
                _context.StockAdjustmentChildren.RemoveRange(
                    entity.StockAdjustmentChildren
                        .Where(c => !incomingIds.Contains(c.StockAdjustmentChildID))
                );

                //    b) Update existing children and add new ones
                foreach (var childVm in vm.StockAdjustmentChildVMs)
                    {
                    if (childVm.StockAdjustmentChildID > 0)
                        {
                        // Update an existing child record
                        var child = entity.StockAdjustmentChildren
                            .First(c => c.StockAdjustmentChildID == childVm.StockAdjustmentChildID);
                        child.ItemID = childVm.ItemID;
                        child.Quantity = childVm.Quantity;
                        }
                    else
                        {
                        // Add a brand-new child record
                        entity.StockAdjustmentChildren.Add(new StockAdjustmentChild
                            {
                            ItemID = childVm.ItemID,
                            Quantity = childVm.Quantity,
                            IsActive = 1,
                            IsDeleted = 0
                            });
                        }

                    // 7️⃣ If this adjustment is now approved (and wasn't before), adjust inventory & record stock transaction
                    if (vm.StatusId == Statuses.Approve && oldPayload.StatusId != Statuses.Approve)
                        {
                        // Load or create the warehouse stock entry for this item
                        var stock = await _context.ItemStocks
                            .FirstOrDefaultAsync(s => s.ItemID == childVm.ItemID && s.WarehouseID == entity.WareHouseId);

                        if (stock == null && inventoryEffect)
                            {
                            // Create new stock record if none exists
                            _context.ItemStocks.Add(new ItemStock
                                {
                                ItemID = childVm.ItemID,
                                WarehouseID = entity.WareHouseId,
                                Quantity = childVm.Quantity,
                                IsActive = 1,
                                CreatedBy = currentUser,
                                CreatedOn = DateTime.Now
                                });
                            }
                        else if (stock != null)
                            {
                            // Increase or decrease the existing stock based on the effect
                            stock.Quantity += inventoryEffect
                                ? childVm.Quantity
                                : -childVm.Quantity;
                            stock.ModifiedBy = currentUser;
                            stock.ModifiedOn = DateTime.Now;
                            _context.ItemStocks.Update(stock);
                            }

                        // Record the stock transaction (positive or negative)
                        _context.StockTransactions.Add(new StockTransaction
                            {
                            ItemID = childVm.ItemID,
                            DocumentID = entity.StockAdjustmentID,
                            DocumentType = "Stock Adjustment",
                            CreationDate = DateTime.Now,
                            Quantity = inventoryEffect
                                ? childVm.Quantity
                                : -childVm.Quantity,
                            WarehouseID = entity.WareHouseId,
                            DocumentRefNo = vm.RefNo,
                            IsActive = 1
                            });
                        }
                    }

                // 8️⃣ Persist all changes (header + children + stock entries + transactions)
                await _context.SaveChangesAsync();

                // 9️⃣ Capture the new state for the audit log
                var newPayload = new
                    {
                    entity.StockAdjustmentID,
                    entity.RefNo,
                    entity.Date,
                    entity.AdjustmentTypeID,
                    entity.Description,
                    entity.TotalQuantity,
                    entity.StatusId,
                    entity.WareHouseId,
                    Children = entity.StockAdjustmentChildren
                        .Where(c => c.IsActive == 1 && c.IsDeleted == 0)
                        .Select(c => new { c.StockAdjustmentChildID, c.ItemID, c.Quantity })
                        .ToList()
                    };

                // 🔟 Write the update action to the ActivityLog
                await _activityLogRepository.Create(new ActivityLog
                    {
                    MenuItemId = 33,
                    ParentTableId = entity.StockAdjustmentID,
                    ActionType = "Update",
                    OldData = JsonSerializer.Serialize(oldPayload),
                    NewData = JsonSerializer.Serialize(newPayload),
                    UserId = currentUser,
                    Date = DateTime.Now
                    });

                // 1️⃣1️⃣ Handle new attachments
                for (int i = 0; i < attachments.Count; i++)
                    {
                    var file = attachments[i];
                    var metaRef = vm.MultipleAttachments?.ElementAtOrDefault(i)?.Referenceno ?? "";
                    var appFile = new MultipleAttachment
                        {
                        MenuItemId = 33,
                        MenuItemName = "Stock Adjustments",
                        ParentTableId = entity.StockAdjustmentID,
                        FileName = file.FileName,
                        Referenceno = metaRef,
                        Date = DateTime.Now,
                        CreatedBy = currentUser,
                        CreatedOn = DateTime.Now,
                        IsActive = 1,
                        IsDeleted = 0
                        };
                    await _appFilesService.Upload(appFile, file);
                    }

                // 1️⃣2️⃣ Remove any attachments the client requested deleted
                if (toRemove.Any())
                    {
                    await _appFilesService.RemoveSpecificAttachmentsAsync(
                        menuItemId: 33,
                        parentTableId: id,
                        idsToRemove: toRemove
                    );
                    }

                // 1️⃣3️⃣ Commit the transaction now that all operations succeeded
                await tx.CommitAsync();

                // 1️⃣4️⃣ Return HTTP 204 No Content (successful update)
                return NoContent();
                }
            catch (Exception ex)
                {
                // 🔄 Roll back on any failure and return HTTP 500
                await tx.RollbackAsync();
                return StatusCode(500, $"An error occurred while updating: {ex.Message}");
                }
            }




        // GET /api/StockAdjustment/GetNextStockAdjustmentsRefNumber
        // Generates the next sequential reference number for stock adjustments (e.g. SA-20250001).
        [HttpGet("GetNextStockAdjustmentsRefNumber")]
        public async Task<IActionResult> GetNextStockAdjustmentsRefNumber ( )
            {
            try
                {
                // 1️⃣ Delegate to the CodeGenerator service:
                //    • "stockadjustments" = the database table name
                //    • "RefNo"             = the column to increment
                //    • "SA-2025"           = textual prefix for stock adjustment codes
                //    • 4                   = numeric portion width (pads to 4 digits)
                string ref_no = await _codeGenerator.GenerateReferenceNumber(
                    tableName: "stockadjustments",
                    columnName: "RefNo",
                    prefix: "SA-2025",
                    digits: 4
                );

                // 2️⃣ Wrap the generated code in a simple JSON object and return 200 OK:
                //    { "StockAdjumentRef": "SA-20250001" }
                return Ok(new { StockAdjumentRef = ref_no });
                }
            catch (Exception ex)
                {
                // 💥 If an error occurs (e.g., DB issue), log for diagnostics and return 500:
                Console.WriteLine($"Error generating next stock adjustment ref no: {ex.Message}");
                return StatusCode(500, "Internal server error.");
                }
            }

        /// <summary>
        /// GET /api/StockAdjustment/get-items
        /// Retrieves all active items along with their current stock levels.
        /// </summary>
        [HttpGet("get-items")]
        public async Task<IActionResult> GetAllItems ( )
            {
            try
                {
                var conn = _context.Database.GetDbConnection();
                await conn.OpenAsync();

                var items = new List<ItemsDTO>();

                await using var cmd = conn.CreateCommand();
                cmd.CommandText = "SP_GetAllItemsNames";
                cmd.CommandType = CommandType.StoredProcedure;

                await using var reader = await cmd.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                    {
                    items.Add(new ItemsDTO
                        {
                        ItemId = reader.GetInt32(reader.GetOrdinal("ItemID")),
                        ItemName = reader.GetString(reader.GetOrdinal("ItemName"))
                        });
                    }

                return Ok(items);
                }
            catch (Exception ex)
                {
                // Log exception (recommended)
                return StatusCode(500, "An error occurred while retrieving item names.");
                }
            }

        // GET /api/StockAdjustment/get-AdjustmentTypes
        // Retrieves all active adjustment types along with their inventory effect flag.
        [HttpGet("get-AdjustmentTypes")]
        public async Task<IActionResult> GetAllAdjustmentTypes ( )
            {
            try
                {
                // 1️⃣ Query the AdjustmentTypes table:
                //    • Filter to only include records where IsActive == 1 (enabled) 
                //      and IsDeleted == 0 (not soft-deleted).
                var items = await _context.AdjustmentTypes
                    .Where(a =>
                        a.IsActive == 1 &&
                        a.IsDeleted == 0
                    )
                    // 2️⃣ Project into an anonymous type containing:
                    //    • AdjustmentTypeID   – primary key
                    //    • Name               – human-readable label
                    //    • InventoryEffect    – boolean/int flag indicating stock effect
                    .Select(c => new
                        {
                        c.AdjustmentTypeID,
                        c.Name,
                        c.InventoryEffect
                        })
                    .ToListAsync(); // Execute the query and materialize the list

                // 3️⃣ Return HTTP 200 OK along with the list of adjustment types
                return Ok(items);
                }
            catch (Exception ex)
                {
                // 4️⃣ In case of any error (e.g. DB connectivity), return HTTP 500
                //    and include the exception message for easier debugging.
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }

        // GET /api/StockAdjustment/get-Warehouses
        // Retrieves all active, non-deleted warehouses for use in stock adjustment operations.
        [HttpGet("get-Warehouses")]
        public async Task<IActionResult> GetAllWarehouses ( )
            {
            try
                {
                // 1️⃣ Query the Warehouses table:
                //    • Filter to only active records (IsActive == 1)
                //    • Exclude soft-deleted records (IsDeleted == 0)
                var items = await _context.Warehouses
                    .Where(a =>
                        a.IsActive == 1 &&   // only include enabled warehouses
                        a.IsDeleted == 0     // exclude those marked deleted
                    )
                    // 2️⃣ Project into an anonymous type with only the fields needed by the client:
                    .Select(c => new
                        {
                        c.WarehouseID,       // primary key
                        c.WarehouseName      // warehouse display name
                        })
                    .ToListAsync();         // execute the query asynchronously

                // 3️⃣ Return HTTP 200 OK with the resulting list
                return Ok(items);
                }
            catch (Exception ex)
                {
                // 4️⃣ On error (e.g., database connection issue),
                //    return HTTP 500 with the exception message for debugging.
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }


        // GET /api/stockadjustment/get-all-stockadjustment
        // Returns all active stock adjustments, including warehouse name, adjustment type, and status,
        // ordered by newest first, with a 1-based index for UI display.
        [HttpGet("get-all-stockadjustment")]
        public async Task<IActionResult> GetAllStockAdjustment ( )
            {
            try
                {
                // 1️⃣ Query the StockAdjustments table for active, non-deleted records
                var stockadjustments = await _context.StockAdjustments
                    // 2️⃣ Ensure newest records come first
                    .OrderByDescending(d => d.StockAdjustmentID)
                    // 3️⃣ Filter by active and not soft-deleted
                    .Where(sr => sr.IsActive == 1 && sr.IsDeleted == 0)
                    // 4️⃣ (Redundant) Order again by descending ID to emphasize sort
                    .OrderByDescending(sr => sr.StockAdjustmentID)
                    // 5️⃣ Project each record into an anonymous type with lookup subqueries
                    .Select(s => new
                        {
                        s.StockAdjustmentID,  // primary key
                        s.RefNo,              // reference number
                        s.Date,               // adjustment date

                        // ▶ Lookup the warehouse name by joining on WareHouseId
                        Warehouse = _context.Warehouses
                            .Where(w => w.WarehouseID == s.WareHouseId)
                            .Select(w => w.WarehouseName)
                            .FirstOrDefault(),

                        // ▶ Lookup the adjustment type name by joining on AdjustmentTypeID
                        AdjustmentType = _context.AdjustmentTypes
                            .Where(at => at.AdjustmentTypeID == s.AdjustmentTypeID)
                            .Select(at => at.Name)
                            .FirstOrDefault(),

                        s.StatusId,           // numeric status code

                        // ▶ Lookup the human-readable status name
                        Status = _context.Statuses
                            .Where(si => si.StatusId == s.StatusId)
                            .Select(si => si.StatusName)
                            .FirstOrDefault(),
                        })
                    .ToListAsync();         // execute the query asynchronously

                // 6️⃣ Add a 1-based index to each element for UI ordering
                var indexedStockAdjustments = stockadjustments
                    .Select(( item, index ) => new
                        {
                        Index = index + 1, // row number starting at 1
                        item.StockAdjustmentID,
                        item.RefNo,
                        item.Date,
                        item.Warehouse,
                        item.AdjustmentType,
                        item.StatusId,
                        item.Status
                        })
                    .ToList();

                // 7️⃣ Return HTTP 200 OK with the indexed list
                return Ok(indexedStockAdjustments);
                }
            catch (Exception ex)
                {
                // 8️⃣ On error (e.g., database connectivity), return HTTP 500 with the exception message
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }
        // GET /api/stockadjustment/detail/{id}
        // Retrieves detailed information for a single stock adjustment, including its child lines and any file attachments.
        [HttpGet("detail/{id}")]
        public async Task<IActionResult> DetailById ( int id )
            {
            // 1️⃣ Load the StockAdjustment header plus its children in one go:
            //    • Include the StockAdjustmentChildren collection
            //    • AsNoTracking for performance since we’re only reading
            var entity = await _context.StockAdjustments
                .Include(s => s.StockAdjustmentChildren)
                .AsNoTracking()
                .FirstOrDefaultAsync(s =>
                    s.StockAdjustmentID == id &&  // match the requested ID
                    s.IsActive == 1 &&  // only active records
                    s.IsDeleted == 0     // exclude soft-deleted
                );

            // 2️⃣ If no record is found, return 404 Not Found
            if (entity == null)
                return NotFound($"StockAdjustment with ID {id} not found.");

            // 3️⃣ Map the EF entity into an anonymous view model:
            var vm = new
                {
                // --- Header fields ---
                entity.StockAdjustmentID,           // primary key
                entity.RefNo,                       // reference number
                entity.Date,                        // adjustment date
                entity.AdjustmentTypeID,            // FK to adjustment type
                                                    // ▶ Lookup the adjustment type name for display
                Name = _context.AdjustmentTypes
                    .Where(a => a.AdjustmentTypeID == entity.AdjustmentTypeID)
                    .Select(a => a.Name)
                    .FirstOrDefault(),
                entity.Description,                 // description of the adjustment
                entity.TotalQuantity,               // sum of quantities moved
                entity.StatusId,                    // numeric status code

                // ▶ Warehouse info
                WareHouseId = entity.WareHouseId,
                WarehouseName = _context.Warehouses
                    .Where(w => w.WarehouseID == entity.WareHouseId)
                    .Select(w => w.WarehouseName)
                    .FirstOrDefault(),

                // --- Child line items ---
                StockAdjustmentChildVMs = entity.StockAdjustmentChildren
                    .Where(c => c.IsActive == 1 && c.IsDeleted == 0) // only active children
                    .Select(c => new
                        {
                        c.StockAdjustmentChildID, // child record PK
                        c.StockAdjustmentID,      // parent FK
                        c.ItemID,                 // item being adjusted
                                                  // ▶ Lookup the item name for display
                        ItemName = _context.Items
                            .Where(i => i.ItemId == c.ItemID)
                            .Select(i => i.ItemName)
                            .FirstOrDefault(),
                        c.Quantity               // quantity adjusted
                        })
                    .ToList(),
                MultipleAttachments = _context.Multipleattachments
                        .Where(m =>
                            m.MenuItemId == 33 &&
                            m.ParentTableId == entity.StockAdjustmentID &&
                            m.IsActive == 1 &&
                            m.IsDeleted == 0
                        )
                        .Select(m => new MultipleAttachmentVM
                            {
                            MultipleAttachmentfileId = m.MultipleAttachmentfileId, // file record PK
                            FileName = m.FileName!,                                // original filename
                            FilePath = m.FilePath!,                                // stored path or URL
                            Referenceno = m.Referenceno!                           // client reference number
                            })
                        .ToList()
                };

            return Ok(vm);
            }

        [HttpPut("changestatus/{id}")]
        public async Task<IActionResult> ChangeStatus ( int id )
            {
            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "Unknown";

            // Begin a transaction
            await using var transaction = await _context.Database.BeginTransactionAsync();
            try
                {
                // 1) Load the adjustment with its children
                var stockAdjustment = await _context.StockAdjustments
                    .Include(sa => sa.StockAdjustmentChildren)
                    .FirstOrDefaultAsync(sa =>
                        sa.StockAdjustmentID == id &&
                        sa.IsActive == 1 &&
                        sa.IsDeleted == 0);

                if (stockAdjustment == null)
                    return NotFound("Stock adjustment not found");

                // 2) For each line, check & apply inventory effect
                foreach (var child in stockAdjustment.StockAdjustmentChildren)
                    {
                    // a) previous transaction for this line
                    var prevTx = await _context.StockTransactions
                        .FirstOrDefaultAsync(st =>
                            st.DocumentID == stockAdjustment.StockAdjustmentID &&
                            st.DocumentType == "Stock Adjustment" &&
                            st.ItemID == child.ItemID &&
                            st.IsVoid == 0 &&
                            st.DocumentRefNo == stockAdjustment.RefNo);

                    // b) current stock
                    var itemStock = await _context.ItemStocks
                        .FirstOrDefaultAsync(it => it.ItemID == child.ItemID && it.WarehouseID== stockAdjustment.WareHouseId);

                    // c) does this adjustment add or subtract?
                    var inventoryEffect = await _context.AdjustmentTypes
                        .Where(a => a.AdjustmentTypeID == stockAdjustment.AdjustmentTypeID)
                        .Select(a => a.InventoryEffect == 1)
                        .FirstOrDefaultAsync();

                    var delta = prevTx?.Quantity.GetValueOrDefault() ?? 0;

                    // d) if it *subtracts* and there's not enough on hand → error
                    if (inventoryEffect && (itemStock == null || itemStock.Quantity < delta))
                        {
                        var itemName = await _context.Items
                            .Where(i => i.ItemId == child.ItemID)
                            .Select(i => i.ItemName)
                            .FirstOrDefaultAsync();
                        var warehouseName = await _context.Warehouses
                            .Where(w => w.WarehouseID == stockAdjustment.WareHouseId)
                            .Select(w => w.WarehouseName)
                            .FirstOrDefaultAsync();

                        await transaction.RollbackAsync();

                        var payload = new
                            {
                            message = "Insufficient stock",
                            ItemName = itemName,
                            WarehouseName = warehouseName,
                            AvailableQuantity = itemStock?.Quantity ?? 0
                            };
                        return StatusCode(StatusCodes.Status403Forbidden, payload);
                        }

                    // e) apply stock change
                    itemStock.Quantity = inventoryEffect
                        ? itemStock.Quantity - child.Quantity
                        : itemStock.Quantity + child.Quantity;

                    itemStock.ModifiedBy = currentUserId;
                    itemStock.ModifiedOn = DateTime.Now;
                    _context.ItemStocks.Update(itemStock);

                    // f) record the void transaction
                    _context.StockTransactions.Add(new StockTransaction
                        {
                        ItemID = child.ItemID,
                        DocumentID = stockAdjustment.StockAdjustmentID,
                        Remarks = "Is Void",
                        DocumentType = "Stock Adjustment",
                        CreationDate = DateTime.Now,
                        Quantity = -delta,
                        WarehouseID = stockAdjustment.WareHouseId,
                        IsActive = 1,
                        IsVoid = 1,
                        DocumentRefNo = stockAdjustment.RefNo
                        });
                    }

                // 3) all lines OK → mark voided
                stockAdjustment.StatusId = Statuses.Void;
                _context.StockAdjustments.Update(stockAdjustment);

                // 4) save & commit
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok("Stock adjustment voided successfully");
                }
            catch (Exception ex)
                {
                await transaction.RollbackAsync();
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }

        // GET /api/StockAdjustment/get-ItemStock/{ItemId}/{WareHouseID}
        // Retrieves all active stock records for a specific item in a specified warehouse.
        [HttpGet("get-ItemStock/{ItemId}/{WareHouseID}")]
        public async Task<IActionResult> GetItemStock ( int ItemId, int WareHouseID )
            {
            try
                {
                // 1️⃣ Query the ItemStocks table
                //    • Filter by the provided ItemId
                //    • Filter by the provided WarehouseID
                //    • Only include records marked active (IsActive == 1)
                var items = await _context.ItemStocks
                    .Where(s =>
                        s.ItemID == ItemId &&        // match the requested item
                        s.WarehouseID == WareHouseID &&   // match the requested warehouse
                        s.IsActive == 1               // only include active stock entries
                    )
                    // 2️⃣ Project into an anonymous type containing:
                    //    • ItemStockID         – unique identifier of the stock record
                    //    • ItemID              – the item’s ID
                    //    • ItemStockQuantity   – the current quantity on hand
                    .Select(s => new
                        {
                        s.ItemStockID,
                        s.ItemID,
                        ItemStockQuantity = s.Quantity   // quantity field renamed for clarity
                        })
                    .ToListAsync();  // execute the query and materialize the results as a list

                // 3️⃣ Return HTTP 200 OK with the list of stock records
                return Ok(items);
                }
            catch (Exception ex)
                {
                // 4️⃣ If any exception occurs (e.g., DB error), return HTTP 500
                //    and include the exception message to aid debugging.
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }


        }

    }
    
