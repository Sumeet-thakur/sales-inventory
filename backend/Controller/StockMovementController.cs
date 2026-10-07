using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using SalesInventoryAPI.Data;
using SalesInventoryAPI.Data.ViewModels;
using SalesInventoryAPI.Models;
using SalesInventoryAPI.Data.Services;
using static SalesInventoryAPI.Models.AppConstants;
using Microsoft.AspNetCore.Authorization;
using Org.BouncyCastle.Asn1.Ocsp;

namespace SalesInventoryAPI.Controller
    {
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class StockMovementsController : ControllerBase
        {
        private readonly InventoryDbContext _context;
        private readonly PermissionService _permissionService;
        private readonly ActivityLogRepository _activityLogRepository;
        private readonly ReviseLogRepository _reviseLogRepository;
        private readonly AppFilesService _appFilesService;
        private readonly CodeGenerator _codeGenerator;

        public StockMovementsController (
            InventoryDbContext context,
            PermissionService permissionService,
            ActivityLogRepository activityLogRepository,
            ReviseLogRepository reviseLogRepository,
            AppFilesService appFilesService ,
                CodeGenerator codeGenerator
        )
            {
            _context = context;
            _permissionService = permissionService;
            _activityLogRepository = activityLogRepository;
            _reviseLogRepository = reviseLogRepository;
            _appFilesService = appFilesService;
            _codeGenerator = codeGenerator;
            }

        // GET: api/StockMovements/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById ( int id )
            {
            var entity = await _context.StockMovements
                .Include(sm => sm.StockMovementChildren)
                .FirstOrDefaultAsync(sm =>
                    sm.StockMovementID == id &&
                    sm.IsDeleted == 0 &&
                    sm.IsActive == 1);

            if (entity == null)
                return NotFound($"StockMovement with ID {id} not found.");

            // Map to VM
            var vm = new 
                {
                StockMovementID = entity.StockMovementID,
                RefNo = entity.RefNo,
                Date = entity.Date,
                To_WareHouseId = entity.To_WareHouseId,
                From_WareHouseId = entity.From_WareHouseId,
                Description = entity.Description,
                TotalQuantity = entity.TotalQuantity,
                StatusId = entity.StatusId,
                StockMovementChildVMs = entity.StockMovementChildren
                    .Where(c => c.IsDeleted == 0 && c.IsActive == 1)
                    .Select(c => new 
                        {
                        StockMovementChildID = c.StockMovementChildID,
                        StockMovementID = c.StockMovementID,
                        ItemID = c.ItemID,
                        Quantity = c.Quantity,
                        ItemStock = _context.ItemStocks
                            .Where(s => s.ItemID == c.ItemID && s.IsActive == 1)
                            .Sum(s => (decimal?)s.Quantity) ?? 0
                        })
                    .ToList()
                };

            return Ok(vm);
            }

      
        // POST /api/StockMovement
        // Creates a new stock movement (transfer) record along with its child lines and optional attachments.
        [HttpPost]
        public async Task<IActionResult> Create (
            [FromForm] string request,              // JSON payload representing StockMovementVM
            [FromForm] List<IFormFile> attachments  // Optional files attached to the movement
        )
            {
            // 1️⃣ Deserialize the incoming JSON into our view model
            var vm = JsonSerializer.Deserialize<StockMovementVM>(request);
            if (vm == null)
                return BadRequest("Invalid payload.");  // 400 if JSON is malformed

            // 2️⃣ Begin a database transaction to ensure atomicity
            await using var tx = await _context.Database.BeginTransactionAsync();
            try
                {
                // 2.a) Identify the current user for audit fields
                var currentUser = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "System";

                // 3️⃣ Build the StockMovement entity from the view model
                var entity = new StockMovement
                    {
                    RefNo = vm.RefNo,
                    Date = vm.Date,
                    From_WareHouseId = vm.From_WareHouseId,
                    To_WareHouseId = vm.To_WareHouseId,
                    Description = vm.Description,
                    TotalQuantity = vm.TotalQuantity,
                    StatusId = vm.StatusId,
                    IsActive = 1,
                    IsDeleted = 0,
                    CreatedBy = currentUser,
                    CreatedOn = DateTime.Now
                    };

                // 4️⃣ Map each child line from the VM into the entity’s StockMovementChildren
                foreach (var childVm in vm.StockMovementChildVMs ?? Enumerable.Empty<StockMovementChildVM>())
                    {
                    // Skip any null or invalid items
                    if (childVm.ItemID == null)
                        continue;

                    entity.StockMovementChildren.Add(new StockMovementChild
                        {
                        ItemID = childVm.ItemID.Value,
                        Quantity = childVm.Quantity ?? 0,
                        IsActive = 1,
                        IsDeleted = 0
                        });
                    }

                // 5️⃣ Attach the new entity (with children) to EF Core’s change tracker
                await _context.StockMovements.AddAsync(entity);

                // 6️⃣ Prepare an activity log payload capturing the new state
                var logPayload = new
                    {
                    entity.StockMovementID,
                    entity.RefNo,
                    entity.Date,
                    entity.From_WareHouseId,
                    entity.To_WareHouseId,
                    entity.Description,
                    entity.TotalQuantity,
                    entity.StatusId,
                    Children = entity.StockMovementChildren
                                 .Select(c => new { c.StockMovementChildID, c.ItemID, c.Quantity })
                                 .ToList()
                    };

                // 7️⃣ Write a "Create" entry to the activity log
                await _activityLogRepository.Create(new ActivityLog
                    {
                    MenuItemId = 33,                         // code for StockMovement menu
                    ParentTableId = entity.StockMovementID,     // link log to this movement
                    ActionType = "Create",
                    OldData = string.Empty,               // no previous state
                    NewData = JsonSerializer.Serialize(logPayload),
                    UserId = currentUser,
                    Date = DateTime.Now
                    });

                // 8️⃣ Handle any file attachments the client submitted
                for (int i = 0; i < attachments.Count; i++)
                    {
                    var file = attachments[i];
                    // Match metadata by index—frontend must align MultipleAttachments accordingly
                    var metaRef = vm.MultipleAttachments
                        .ElementAtOrDefault(i)?.Referenceno ?? "";

                    var appFile = new MultipleAttachment
                        {
                        MenuItemId = 35,                     // code for attachment menu
                        MenuItemName = "Stock Movements",
                        ParentTableId = entity.StockMovementID,
                        FileName = file.FileName,
                        Referenceno = metaRef,
                        Date = DateTime.Now,
                        CreatedBy = currentUser,
                        CreatedOn = DateTime.Now,
                        IsActive = 1,
                        IsDeleted = 0
                        };
                    // Upload persists both DB record and the physical file
                    await _appFilesService.Upload(appFile, file);
                    }

                // 9️⃣ Persist everything to the database (header, children, attachments)
                await _context.SaveChangesAsync();

                // 🔟 Commit the transaction now that all steps succeeded
                await tx.CommitAsync();

                // 1️⃣1️⃣ Return HTTP 201 Created, pointing to the new movement’s GetById endpoint
                return CreatedAtAction(
                    nameof(GetById),
                    new { id = entity.StockMovementID },
                    new { entity.StockMovementID }
                );
                }
            catch (Exception ex)
                {
                // 🔄 On error, roll back any pending changes
                await tx.RollbackAsync();
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }

        // PUT: api/StockMovements/5
        [HttpPut("{id}")]
        public async Task<IActionResult> Update ( int id,
     [FromForm] string request,
     [FromForm] List<IFormFile> attachments,
     [FromForm] string removeAttachmentIds
 )
            {
            var vm = JsonSerializer.Deserialize<StockMovementVM>(request);
            if (vm == null || vm.StockMovementID != id)
                return BadRequest("Invalid request data.");
            if (id != vm.StockMovementID)
                return BadRequest("ID mismatch.");

            var currentUser = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "System";

            // 1) Load existing parent + children
            var entity = await _context.StockMovements
                .Include(sm => sm.StockMovementChildren)
                .FirstOrDefaultAsync(sm =>
                    sm.StockMovementID == id &&
                    sm.IsActive == 1 &&
                    sm.IsDeleted == 0);

            if (entity == null)
                return NotFound($"StockMovement with ID {id} not found.");

            // Determine old StatusId for logging / inventory purposes
            var oldStatus = entity.StatusId;

           

            // 2) Begin transaction
            await using var tx = await _context.Database.BeginTransactionAsync();
            try
                {
                // 3) Capture old payload
                var oldPayload = new
                    {
                    entity.StockMovementID,
                    entity.RefNo,
                    entity.Date,
                    entity.To_WareHouseId,
                    entity.From_WareHouseId,
                    entity.Description,
                    entity.TotalQuantity,
                    entity.StatusId,
                    Children = entity.StockMovementChildren
                        .Where(c => c.IsActive == 1 && c.IsDeleted == 0)
                        .Select(c => new
                            {
                            c.StockMovementChildID,
                            c.ItemID,
                            c.Quantity
                            })
                        .ToList()
                    };

                // 4) Update parent fields
                entity.RefNo = vm.RefNo;
                entity.Date = vm.Date;
                entity.To_WareHouseId = vm.To_WareHouseId;
                entity.From_WareHouseId = vm.From_WareHouseId;
                entity.Description = vm.Description;
                entity.TotalQuantity = vm.TotalQuantity;
                entity.StatusId = vm.StatusId;
                entity.ModifiedBy = currentUser;
                entity.ModifiedOn = DateTime.Now;

                // 5) Synchronize children:
                var incomingIds = vm.StockMovementChildVMs
                    .Where(c => c.StockMovementChildID > 0)
                    .Select(c => c.StockMovementChildID)
                    .ToList();

                // Remove any children no longer present
                //_context.StockMovementChildren.RemoveRange(
                //    entity.StockMovementChildren
                //        .Where(c => !incomingIds.Contains(c.StockMovementChildID))
                //);
                //entity.StockMovementChildren.RemoveAll(c => !incomingIds.Contains(c.StockMovementChildID));

                // Update existing children and add new ones
                foreach (var childVm in vm.StockMovementChildVMs)
                    {
                    if (childVm.StockMovementChildID > 0)
                        {
                        // Update existing
                        var child = entity.StockMovementChildren
                            .First(c => c.StockMovementChildID == childVm.StockMovementChildID);

                        child.ItemID = childVm.ItemID;
                        child.Quantity = childVm.Quantity ?? 0;
                        }
                    else
                        {
                        // New child
                        entity.StockMovementChildren.Add(new StockMovementChild
                            {
                            ItemID = childVm.ItemID,
                            Quantity = childVm.Quantity ?? 0,
                            IsActive = 1,
                            IsDeleted = 0
                            });
                        }
                    }

                // 6) If status changed to Approve and it was not previously approved,
                //    adjust inventory accordingly
                if (vm.StatusId == Statuses.Approve && oldStatus != Statuses.Approve)
                    {
                    foreach (var appVm in vm.StockMovementChildVMs)
                        {
                        if (appVm.ItemID == null) continue;

                        // Decrease from “From_WareHouse”
                        var fromStock = await _context.ItemStocks
                            .Where(isr => isr.ItemID == appVm.ItemID && isr.WarehouseID == vm.From_WareHouseId)
                            .FirstOrDefaultAsync();
                        if (fromStock != null)
                            {
                            fromStock.Quantity -= (appVm.Quantity ?? 0);
                            fromStock.ModifiedBy = currentUser;
                            fromStock.ModifiedOn = DateTime.Now;
                            _context.ItemStocks.Update(fromStock);
                            }

                        // Increase in “To_WareHouse”
                        var toStock = await _context.ItemStocks
                            .Where(isr => isr.ItemID == appVm.ItemID && isr.WarehouseID == vm.To_WareHouseId)
                            .FirstOrDefaultAsync();
                        if (toStock != null)
                            {
                            toStock.Quantity += (appVm.Quantity ?? 0);
                            toStock.ModifiedBy = currentUser;
                            toStock.ModifiedOn = DateTime.Now;
                            _context.ItemStocks.Update(toStock);
                            }
                        else
                            {
                            await _context.ItemStocks.AddAsync(new ItemStock
                                {
                                ItemID = appVm.ItemID.Value,
                                WarehouseID = vm.To_WareHouseId,
                                Quantity = appVm.Quantity ?? 0,
                                IsActive = 1,
                                CreatedBy=currentUser,
                                CreatedOn = DateTime.Now
                                });
                            }

                        // Create stock transactions for both warehouses
                        var outTxn = new StockTransaction
                            {
                            ItemID = appVm.ItemID.Value,
                            WarehouseID = vm.From_WareHouseId,
                            Quantity =-appVm.Quantity ?? 0,
                            DocumentType = "StockMovement",
                            DocumentID = entity.StockMovementID,
                            Remarks = $"Received to WH:{vm.To_WareHouseId}",
                            CreationDate = DateTime.Now,
                            IsActive = 1,
                            DocumentRefNo = vm.RefNo
                            };
                        await _context.StockTransactions.AddAsync(outTxn);

                        var inTxn = new StockTransaction
                            {
                            ItemID = appVm.ItemID.Value,
                            WarehouseID = vm.To_WareHouseId,
                            Quantity = appVm.Quantity ?? 0,
                            DocumentType = "StockMovement",
                            DocumentID = entity.StockMovementID,
                            Remarks = $"Moved from WH:{vm.From_WareHouseId}",
                            CreationDate = DateTime.Now,
                            IsActive = 1,
                            DocumentRefNo = vm.RefNo
                            };
                        await _context.StockTransactions.AddAsync(inTxn);
                        }
                    }

                // 7) Persist changes
                _context.StockMovements.Update(entity);
                await _context.SaveChangesAsync();

                // 8) Build new payload for logging
                var newPayload = new
                    {
                    entity.StockMovementID,
                    entity.RefNo,
                    entity.Date,
                    entity.To_WareHouseId,
                    entity.From_WareHouseId,
                    entity.Description,
                    entity.TotalQuantity,
                    entity.StatusId,
                    Children = entity.StockMovementChildren
                        .Where(c => c.IsActive == 1 && c.IsDeleted == 0)
                        .Select(c => new
                            {
                            c.StockMovementChildID,
                            c.ItemID,
                            c.Quantity
                            })
                        .ToList()
                    };

                // 9) Write activity log
                await _activityLogRepository.Create(new ActivityLog
                    {
                    MenuItemId = 35, // e.g. the “menu ID” for stock adjustments
                    ParentTableId = entity.StockMovementID,
                    ActionType = "Update",
                    OldData = JsonSerializer.Serialize(oldPayload),
                    NewData = JsonSerializer.Serialize(newPayload),
                    UserId = currentUser,
                    Date = DateTime.Now
                    });

                // 10) If original was approved and now edited, write a revise log
                if (oldStatus == Statuses.Approve && vm.StatusId == Statuses.Approve)
                    {
                    await _reviseLogRepository.Create(new Reviselog
                        {
                        MenuItemId = 35,
                        ParentTableId = entity.StockMovementID,
                        ActionType = "Revise",
                        OldData = JsonSerializer.Serialize(oldPayload),
                        NewData = JsonSerializer.Serialize(newPayload),
                        UserId = currentUser,
                        Date = DateTime.Now
                        });
                    }

                // 11) Commit transaction
                await tx.CommitAsync();
                return NoContent();
                }
            catch (Exception ex)
                {
                await tx.RollbackAsync();
                return StatusCode(500, $"Could not update StockMovement: {ex.Message}");
                }
            }
        // GET /api/StockMovement/GetNextStockMovementsRefNumber
        // Generates the next sequential reference number for stock movements (e.g. SM-20250001).
        [HttpGet("GetNextStockMovementsRefNumber")]
        public async Task<IActionResult> GetNextStockAdjustmentsRefNumber ( )
            {
            try
                {
                // 1️⃣ Ask the CodeGenerator service to build a new ref no:
                //    • "stockmovements" = database table name
                //    • "RefNo"          = column to increment
                //    • "SM-2025"        = textual prefix for stock movements
                //    • 4                = number width (pads numeric part to 4 digits)
                string ref_no = await _codeGenerator.GenerateReferenceNumber(
                    tableName: "stockmovements",
                    columnName: "RefNo",
                    prefix: "SM-2025",
                    digits: 4
                );

                // 2️⃣ Return HTTP 200 OK with a simple JSON payload
                //    { "StockMovementRef": "SM-20250001" }
                return Ok(new { StockMovementRef = ref_no });
                }
            catch (Exception ex)
                {
                // 💥 If anything goes wrong (e.g., DB error), log for diagnostics and return 500
                Console.WriteLine($"Error generating stock movement ref: {ex.Message}");
                return StatusCode(500, "Internal server error.");
                }
            }
        // GET /api/StockMovement/get-items
        // Returns all active items along with their total on-hand stock quantity.
        [HttpGet("get-items")]
        public async Task<IActionResult> GetAllItems ( )
            {
            try
                {
                // 1️⃣ Query the Items table for active, non-deleted items
                var items = await _context.Items
                    .Where(i =>
                        i.IsActive == 1 &&    // include only active items
                        i.IsDeleted == 0      // exclude soft-deleted records
                    )
                    // 2️⃣ Project each item into an anonymous type containing:
                    //    • ItemId       → primary key
                    //    • ItemName     → human-readable name
                    //    • ItemStock    → sum of all active stock records for this item
                    .Select(i => new
                        {
                        i.ItemId,
                        ItemName = i.ItemName + " - " + i.ItemCode,
                        // ▶ Aggregate the Quantity from ItemStocks; returns 0 if no matching rows
                        ItemStock = _context.ItemStocks
                            .Where(s =>
                                s.ItemID == i.ItemId &&
                                s.IsActive == 1
                            )
                            .Sum(s => (decimal?)s.Quantity) ?? 0
                        })
                    .ToListAsync(); // Execute the query and materialize the list

                // 3️⃣ Return HTTP 200 OK with the resulting list
                return Ok(items);
                }
            catch (Exception ex)
                {
                // 4️⃣ On exception (e.g., DB error), return HTTP 500 with the error message
                return StatusCode(StatusCodes.Status500InternalServerError,
                                  $"Internal server error: {ex.Message}");
                }
            }

        // GET /api/StockMovement/get-Warehouses
        // Retrieves all active, non-deleted warehouses for selection purposes.
        [HttpGet("get-Warehouses")]
        public async Task<IActionResult> GetAllWarehouses ( )
            {
            try
                {
                // 1️⃣ Query the Warehouses table:
                //    • a.IsActive == 1  → only include records marked active
                //    • a.IsDeleted == 0 → exclude soft-deleted records
                var items = await _context.Warehouses
                    .Where(a =>
                        a.IsActive == 1 &&
                        a.IsDeleted == 0
                    )
                    // 2️⃣ Project into a minimal anonymous type with only necessary fields:
                    .Select(c => new
                        {
                        c.WarehouseID,   // primary key of the warehouse
                        c.WarehouseName  // display name for UI dropdowns
                        })
                    .ToListAsync();    // execute the query and materialize results

                // 3️⃣ Return HTTP 200 OK with the list of warehouses
                return Ok(items);
                }
            catch (Exception ex)
                {
                // 4️⃣ On any failure (e.g., DB error), return HTTP 500 with the exception message
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }


        // GET /api/StockMovement/get-all-stockmovement
        // Returns a list of all active, non-deleted stock movements, with warehouse names and status, ordered newest first.
        [HttpGet("get-all-stockmovement")]
        public async Task<IActionResult> GetAllStockMovement ( )
            {
            try
                {
                // 1️⃣ Query StockMovements table:
                //    • Filter IsActive == 1 and IsDeleted == 0 to include only valid records
                //    • Order by StockMovementID descending to get newest first
                var stockmovement = await _context.StockMovements
                    .Where(sr => sr.IsActive == 1 && sr.IsDeleted == 0)
                    .OrderByDescending(sr => sr.StockMovementID)

                    // 2️⃣ Project into an anonymous type with the fields the client needs:
                    .Select(s => new
                        {
                        s.StockMovementID,  // Primary key
                        s.RefNo,            // Movement reference number
                        s.Date,             // Date of movement

                        // ▶ Fetch the "To" warehouse name by joining on To_WareHouseId
                        To_Warehouse = _context.Warehouses
                            .Where(w => w.WarehouseID == s.To_WareHouseId)
                            .Select(w => w.WarehouseName)
                            .FirstOrDefault(),

                        // ▶ Fetch the "From" warehouse name by joining on From_WareHouseId
                        From_Warehouse = _context.Warehouses
                            .Where(w => w.WarehouseID == s.From_WareHouseId)
                            .Select(w => w.WarehouseName)
                            .FirstOrDefault(),

                        s.StatusId,  // Numeric status code

                        // ▶ Lookup the human-readable status name from Statuses table
                        Status = _context.Statuses
                            .Where(si => si.StatusId == s.StatusId)
                            .Select(si => si.StatusName)
                            .FirstOrDefault()
                        })
                    .ToListAsync();  // Execute the query asynchronously

                // 3️⃣ Add a 1-based index for UI display (optional)
                var indexedStockMovements = stockmovement
                    .Select(( s, index ) => new
                        {
                        Index = index + 1,        // Row number starting at 1
                        s.StockMovementID,
                        s.RefNo,
                        s.Date,
                        s.To_Warehouse,
                        s.From_Warehouse,
                        s.StatusId,
                        s.Status
                        })
                    .ToList();

                // 4️⃣ Return the result with HTTP 200 OK
                return Ok(indexedStockMovements);
                }
            catch (Exception ex)
                {
                // 💥 On error, return HTTP 500 with the exception message for debugging
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }

        // GET /api/StockMovement/detail/{id}
        // Returns detailed information for a single StockMovement, including its child lines and current stock levels.
        [HttpGet("detail/{id}")]
        public async Task<IActionResult> DetailById ( int id )
            {
            // 1️⃣ Load the StockMovement header along with all its children in one query
            var entity = await _context.StockMovements
                .Include(sm => sm.StockMovementChildren)    // eager-load child items
                .FirstOrDefaultAsync(sm =>
                    sm.StockMovementID == id &&             // match by requested ID
                    sm.IsActive == 1 &&           // only active records
                    sm.IsDeleted == 0               // exclude soft-deleted
                );

            // 1.a) If not found, return HTTP 404 Not Found
            if (entity == null)
                return NotFound($"StockMovement with ID {id} not found.");

            // 2️⃣ Map the EF entity into a simpler anonymous view model
            var vm = new
                {
                // --- Header fields ---
                entity.StockMovementID,                     // primary key
                entity.RefNo,                               // reference number
                entity.Date,                                // date of movement

                // ▶ Lookup destination warehouse name
                To_WareHouseId = entity.To_WareHouseId,
                To_WareHouseName = _context.Warehouses
                    .Where(w => w.WarehouseID == entity.To_WareHouseId)
                    .Select(w => w.WarehouseName)
                    .FirstOrDefault(),

                // ▶ Lookup source warehouse name
                From_WareHouseId = entity.From_WareHouseId,
                From_WareHouseName = _context.Warehouses
                    .Where(w => w.WarehouseID == entity.From_WareHouseId)
                    .Select(w => w.WarehouseName)
                    .FirstOrDefault(),

                entity.Description,                         // description of movement
                entity.TotalQuantity,                       // total items moved
                entity.StatusId,                            // numeric status code

                // --- Child lines ---
                StockMovementChildVMs = entity.StockMovementChildren
                    .Where(c => c.IsActive == 1 && c.IsDeleted == 0)  // only active, non-deleted children
                    .Select(c => new
                        {
                        c.StockMovementChildID,            // child record PK
                        c.StockMovementID,                 // back-reference to parent
                        c.ItemID,                          // item being moved

                        // ▶ Lookup item name for display
                        ItemName = _context.Items
                            .Where(i => i.ItemId == c.ItemID)
                            .Select(i => i.ItemName)
                            .FirstOrDefault(),

                        c.Quantity,                        // quantity moved
                                                           // ▶ Calculate current on-hand stock for this item
                        ItemStock = _context.ItemStocks
                            .Where(s => s.ItemID == c.ItemID && s.IsActive == 1)
                            .Sum(s => (decimal?)s.Quantity) ?? 0
                        })
                    .ToList()  // materialize the child list
                };

            // 3️⃣ Return HTTP 200 OK with the detailed view model
            return Ok(vm);
            }


        // GET /api/StockMovement/get-ItemStock/{ItemId}/{WareHouseID}
        // Retrieves the current stock records for a specific item in a specific warehouse.
        [HttpGet("get-ItemStock/{ItemId}/{WareHouseID}")]
        public async Task<IActionResult> GetItemStock ( int ItemId, int WareHouseID )
            {
            try
                {
                // 1️⃣ Query the ItemStocks table:
                //    • Filter by the given ItemId and WarehouseID
                //    • Only include active stock entries (IsActive == 1)
                var items = await _context.ItemStocks
                    .Where(a =>
                        a.ItemID == ItemId &&     // match the requested item
                        a.WarehouseID == WareHouseID &&// match the requested warehouse
                        a.IsActive == 1             // only active records
                    )
                    // 2️⃣ Project the results into an anonymous type
                    //    containing the keys and the current quantity
                    .Select(c => new
                        {
                        c.ItemStockID,               // primary key of the stock record
                        c.ItemID,                    // the item’s ID
                        ItemStockQuantity = c.Quantity  // the on-hand quantity
                        })
                    .ToListAsync(); // Execute the query asynchronously

                // 3️⃣ Return HTTP 200 OK with the list of stock record DTOs
                return Ok(items);
                }
            catch (Exception ex)
                {
                // 4️⃣ On any exception (e.g., DB error), return HTTP 500 with the error message
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }

        [HttpPut("changestatus/{id}")]
        public async Task<IActionResult> ChangeStatus ( int id )
            {
            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "Unknown";

            // 1) Begin a transaction
            await using var transaction = await _context.Database.BeginTransactionAsync();
            try
                {
                // 2) Load the StockMovement and its children
                var stockMovement = await _context.StockMovements
                    .Include(sm => sm.StockMovementChildren)
                    .FirstOrDefaultAsync(sm =>
                        sm.StockMovementID == id &&
                        sm.IsActive == 1 &&
                        sm.IsDeleted == 0);

                if (stockMovement == null)
                    return NotFound("Stock adjustment not found.");

                // For readability, extract once:
                int? fromWHId = stockMovement.From_WareHouseId;
                int? toWHId = stockMovement.To_WareHouseId;

                if (!fromWHId.HasValue || !toWHId.HasValue)
                    return BadRequest("From/To warehouse IDs must be set before changing status.");

                // 3) For each child line, adjust inventory
                foreach (var child in stockMovement.StockMovementChildren)
                    {
                    // Use the child’s total quantity (assuming ChildTotalQuantity holds the moved amount)
                    decimal? moveQty = child.Quantity;

                    if (moveQty <= 0)
                        {
                        // Skip any zero‐quantity lines
                        continue;
                        }

                    // 3a) Fetch or create the “from” stock row
                    var fromStock = await _context.ItemStocks
                        .Where(isr =>
                            isr.ItemID == child.ItemID &&
                            isr.WarehouseID == fromWHId.Value &&
                            isr.IsActive == 1)
                        .FirstOrDefaultAsync();

                    //if (fromStock == null)
                    //    {
                    //    // If no row exists, initialize a brand-new record with zero stock,
                    //    // then we will subtract below.
                    //    fromStock = new ItemStock
                    //        {
                    //        ItemID = child.ItemID.Value,
                    //        WarehouseID = fromWHId.Value,
                    //        Quantity = 0m,
                    //        IsActive = 1,
                    //        CreatedBy = currentUserId,
                    //        CreatedOn = DateTime.Now
                    //        };
                    //    _context.ItemStocks.Add(fromStock);
                    //    // We do NOT call SaveChanges here; we will save everything later
                    //    }

                    // 3b) Fetch or create the “to” stock row
                    var toStock = await _context.ItemStocks
                        .Where(isr =>
                            isr.ItemID == child.ItemID &&
                            isr.WarehouseID == toWHId.Value &&
                            isr.IsActive == 1)
                        .FirstOrDefaultAsync();

                    //if (toStock == null)
                    //    {
                    //    toStock = new ItemStock
                    //        {
                    //        ItemID = child.ItemID.Value,
                    //        WarehouseID = toWHId.Value,
                    //        Quantity = 0m,
                    //        IsActive = 1,
                    //        CreatedBy = currentUserId,
                    //        CreatedOn = DateTime.Now
                    //        };
                    //    _context.ItemStocks.Add(toStock);
                    //    }

                    // 3c) Subtract moveQty from “fromStock”
                    fromStock.Quantity += moveQty;
                    fromStock.ModifiedBy = currentUserId;
                    fromStock.ModifiedOn = DateTime.Now;
                    _context.ItemStocks.Update(fromStock);

                    // 3d) Add moveQty to “toStock”
                    toStock.Quantity -= moveQty;
                    toStock.ModifiedBy = currentUserId;
                    toStock.ModifiedOn = DateTime.Now;
                    _context.ItemStocks.Update(toStock);

                    // 3e) Create a negative transaction for “from” warehouse
                    var outTxn = new StockTransaction
                        {
                        ItemID = child.ItemID.Value,
                        WarehouseID = fromWHId.Value,
                        Quantity = -moveQty,
                        DocumentType = "StockMovement",
                        DocumentID = stockMovement.StockMovementID,
                        Remarks = $"Moved to WH:{toWHId.Value}",
                        CreationDate = DateTime.Now,
                        IsActive = 1,
                        DocumentRefNo = stockMovement.RefNo
                        };
                    await _context.StockTransactions.AddAsync(outTxn);

                    // 3f) Create a positive transaction for “to” warehouse
                    var inTxn = new StockTransaction
                        {
                        ItemID = child.ItemID.Value,
                        WarehouseID = toWHId.Value,
                        Quantity = +moveQty,
                        DocumentType = "StockMovement",
                        DocumentID = stockMovement.StockMovementID,
                        Remarks = $"Received from WH:{fromWHId.Value}",
                        CreationDate = DateTime.Now,
                        IsActive = 1,
                        DocumentRefNo = stockMovement.RefNo
                        };
                    await _context.StockTransactions.AddAsync(inTxn);
                    }

                // 4) All child adjustments succeeded → mark parent as Void
                stockMovement.StatusId = Statuses.Void;
                stockMovement.ModifiedBy = currentUserId;
                stockMovement.ModifiedOn = DateTime.Now;
                _context.StockMovements.Update(stockMovement);

                // 5) Commit everything in one shot
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok("Stock adjustment voided successfully.");
                }
            catch (Exception ex)
                {
                await transaction.RollbackAsync();
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }
        // GET /api/PurchaseInvoice/activity_log/StockMovemoment/{id}
        // Retrieves the audit trail for a specific StockMovemoment (menu code = 35).
        [HttpGet("activity_log/StockMovemoment/{id}")]
        public async Task<IActionResult> GetActivityLogsForStockMovemoment ( int id )
            {
            try
                {
                // 1️⃣ Start with the ActivityLogs table, filtering only entries for PurchaseInvoice (MenuItemId = 35)
                var logs = await _context.ActivityLogs
                    .Where(a => a.MenuItemId == 35)

                    // 2️⃣ LEFT JOIN to Users to fetch the username for each log entry
                    .GroupJoin(
                        _context.Users,
                        log => log.UserId,   // key from ActivityLogs
                        user => user.Id,      // key from Users
                        ( log, users ) => new { log, users }
                    )
                    .SelectMany(
                        temp => temp.users.DefaultIfEmpty(),     // preserve logs even if user record is missing
                        ( temp, user ) => new { temp.log, user }
                    )

                    // 3️⃣ LEFT JOIN to StockMovements to link each log back to its invoice
                    .GroupJoin(
                        _context.StockMovements,
                        temp => temp.log.ParentTableId,          // ParentTableId holds StockMovementID
                        inv => inv.StockMovementID,          // primary key in StockMovements
                        ( temp, stockmovements ) => new { temp.log, temp.user, stockmovements }
                    )
                    .SelectMany(
                        temp => temp.stockmovements.DefaultIfEmpty(),  // preserve logs even if invoice record is missing
                        ( temp, stockmovements ) => new { temp.log, temp.user, stockmovements }
                    )

                    // 4️⃣ Filter to only the logs related to the requested invoice ID
                    .Where(x => x.stockmovements != null && x.stockmovements.StockMovementID == id)

                    // 5️⃣ Project the combined data into a simple DTO for the client
                    .Select(x => new
                        {
                        x.log.ActionType,                        // e.g. "Create", "Update", "Approve"
                        x.log.OldData,                           // serialized JSON of previous state
                        x.log.NewData,                           // serialized JSON of new state
                        StockMovementRefNumber = x.stockmovements.RefNo, // invoice reference number for display
                        UserName = x.user != null
                                  ? x.user.UserName             // username who performed the action
                                  : null,
                        x.log.Date                              // timestamp of the action
                        })
                    .ToListAsync();                             // execute the query

                // 6️⃣ Return HTTP 200 OK with the list of log entries
                return Ok(logs);
                }
            catch (Exception ex)
                {
                // 💥 On error, return 500 with the error message
                return StatusCode(500, "An error occurred while retrieving activity logs: " + ex.Message);
                }
            }


        }
    }
