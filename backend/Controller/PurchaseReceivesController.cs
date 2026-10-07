using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SalesInventoryAPI.Data.Services;
using SalesInventoryAPI.Data;
using Microsoft.EntityFrameworkCore;
using static SalesInventoryAPI.Models.AppConstants;
using SalesInventoryAPI.Data.ViewModels;
using SalesInventoryAPI.Models;
using SalesInventoryAPI.Data.DTOs;
using System.Security.Claims;
using System.Text.Json;
using MySqlConnector;
using System.Data;
using Microsoft.AspNetCore.Authorization;

namespace SalesInventoryAPI.Controller
    {
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class PurchaseReceivesController : ControllerBase
        {
        private readonly InventoryDbContext _context;
        private readonly PermissionService _permissionService;
        private readonly ActivityLogRepository _activityLogRepository;
        private readonly ReviseLogRepository _reviseLogRepository;
        private readonly CodeGenerator _codeGenerator;
        private readonly AppFilesService _appFilesService;
        public PurchaseReceivesController ( InventoryDbContext context, PermissionService permissionService, ActivityLogRepository activityLogRepository, ReviseLogRepository reviseLogRepository, CodeGenerator codeGenerator, AppFilesService appFilesService )
            {
            _context = context;
            _permissionService = permissionService;
            _activityLogRepository = activityLogRepository;
            _reviseLogRepository = reviseLogRepository;
            _codeGenerator = codeGenerator;
            _appFilesService = appFilesService;


            }

        [HttpGet("get-vendor")]
        public async Task<IActionResult> GetAllVendors ( )
            {
            try
                {
                var vendors = await _context.Vendors
                    .Where(a => a.IsActive == 1 && a.IsDeleted == 0)
                    .Select(c => new
                        {
                        c.VendorID,
                        c.VendorName
                        })
                    .ToListAsync();

                return Ok(vendors);
                }
            catch (Exception ex)
                {
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }

        [HttpGet("get-purchase-requistion")]
        public async Task<IActionResult> GePurchaseRequistion ( )
            {
            try
                {
                var vendors = await _context.PurchaseRequisitionOrders
                    .Where(a => a.IsActive == 1 && a.IsDeleted == 0 && a.StatusId == Statuses.Approve &&
                     !_context.PurchaseReceives.Any(si => si.PurchaseRequisitionOrderID == a.PurchaseRequisitionOrderID)
                    )
                    .Select(c => new
                        {
                        c.PurchaseRequisitionOrderID,
                        c.RefNo,
                        c.VendorID
                        })
                    .ToListAsync();

                return Ok(vendors);
                }
            catch (Exception ex)
                {
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }

        [HttpGet("get-purchase-requistion-edit/{id}")]
        public async Task<IActionResult> GePurchaseRequistionEdit (int id )
            {
            try
                {
                var vendors = await _context.PurchaseRequisitionOrders
                    .Where(a => a.IsActive == 1 && a.IsDeleted == 0 &&
                    _context.PurchaseReceives.Any(pr => pr.PurchaseRequisitionOrderID == pr.PurchaseRequisitionOrderID && pr.PurchaseReceiveID ==id && pr.IsActive == 1 && pr.IsDeleted == 0)

                    )
                    .Select(c => new
                        {
                        c.PurchaseRequisitionOrderID,
                        c.RefNo,
                        c.VendorID
                        })
                    .ToListAsync();

                return Ok(vendors);
                }
            catch (Exception ex)
                {
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }

        [HttpGet("GetNextPurchaseReceivedRefNumber")]
        public async Task<IActionResult> GetNextPurchaseRefNumber ( )
            {
            try
                {
                string ref_no = await _codeGenerator.GenerateReferenceNumber("purchasereceives", "RefNo", "PR-2025", 4);
                return Ok(new { PurchaseRefNumber = ref_no });
                }
            catch (Exception ex)
                {
                // Log the exception and return an error status.
                Console.WriteLine($"Error: {ex.Message}");
                return StatusCode(500, "Internal server error.");
                }
            }

        [HttpGet("get-PurchasesRequisitionItems{id}")]
        public async Task<IActionResult> GetPurchasesRequisitionItems ( int id )
            {
            try
                {
                var SalesRequisitions = await _context.PurchaseRequisitionOrderChildren
                    .Where(a => a.PurchaseRequisitionOrderID == id)
                    .Select(c => new
                        {
                        c.PurchaseRequisitionOrderChildID,
                        c.PurchaseRequisitionOrderID,
                        c.ItemID,
                        ItemName = _context.Items.Where(i => i.ItemId == c.ItemID).Select(i => i.ItemName).FirstOrDefault(),
                        c.Quantity,
                        c.UnitId,
                        UnitName = _context.Units
                    .Where(u => u.UnitId == c.UnitId)
                    .Select(u => u.UnitName)
                    .FirstOrDefault()
                    + ((c.IsSecondaryUnit ?? false)
                ? " secondary"
                : ""),
                        c.ConversionFactor,
                        c.IsSecondaryUnit,
                        c.ChildTotalQuantity,
                        GSTPercentage = _context.Items
                            .Where(i => i.ItemId == c.ItemID)
                            .Select(i => i.GSTPercentage)
                            .FirstOrDefault(),
                        })
                    .ToListAsync();

                return Ok(SalesRequisitions);
                }
            catch (Exception ex)
                {
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }

        // POST /api/PurchaseReceive
        // Creates a new PurchaseReceive record along with its line items and optional file attachments.
        [HttpPost]
        public async Task<IActionResult> Add (
            [FromForm] string request,              // JSON-serialized PurchaseReceiveVM from the client
            [FromForm] List<IFormFile> attachments  // Optional list of files uploaded with the form
        )
            {
            // 1️⃣ Deserialize the JSON payload into our view model
            var vm = JsonSerializer.Deserialize<PurchaseReceiveVM>(request);
            if (vm == null)
                return BadRequest("Invalid payload."); // Return 400 if JSON is malformed

            // 2️⃣ Identify the current user for audit fields
            var currentUser = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "System";

            // 3️⃣ Begin a database transaction to ensure atomicity
            await using var tx = await _context.Database.BeginTransactionAsync();
            try
                {
                // 4️⃣ Build the PurchaseReceive entity from the VM
                var entity = new PurchaseReceive
                    {
                    RefNo = vm.RefNo,
                    Date = vm.Date,
                    VendorID = vm.VendorID,
                    VendorChildID = vm.VendorChildID,
                    PurchaseRequisitionOrderID = vm.PurchaseRequisitionOrderID,
                    PaymentTerms = vm.PaymentTerms,
                    Description = vm.Description,
                    TotalQuantity = vm.TotalQuantity,
                    StatusId = vm.StatusId,
                    IsActive = 1,
                    IsDeleted = 0,
                    CreatedBy = currentUser,
                    CreatedOn = DateTime.Now
                    };

                // 5️⃣ Map each child VM into the entity’s line-item collection
                foreach (var childVm in vm.PurchaseReceiveChildVMs)
                    {
                    entity.PurchaseReceiveChildren.Add(new PurchaseReceiveChild
                        {
                        ItemID = childVm.ItemID,
                        UnitId = childVm.UnitId,
                        IsSecondaryUnit = childVm.IsSecondaryUnit,
                        Quantity = childVm.Quantity,
                        ConversionFactor = childVm.ConversionFactor,
                        ChildTotalQuantity = childVm.ChildTotalQuantity,
                        // If the VM explicitly includes IsActive/IsDeleted flags, respect them; otherwise default
                        IsActive = childVm.IsActive ?? 1,
                        IsDeleted = childVm.IsDeleted ?? 0
                        });
                    }

                // 6️⃣ Persist the header and line items in one go
                _context.PurchaseReceives.Add(entity);
                await _context.SaveChangesAsync();

                // 7️⃣ Prepare a payload for the activity log, capturing the new state
                var newChildrenLog = entity.PurchaseReceiveChildren
                    .Select(c => new
                        {
                        c.PurchaseReceiveChildID,
                        c.ItemID,
                        c.UnitId,
                        c.Quantity
                        })
                    .ToList();

                var newPayload = JsonSerializer.Serialize(new
                    {
                    entity.PurchaseReceiveID,
                    entity.RefNo,
                    entity.Date,
                    entity.VendorID,
                    entity.PurchaseRequisitionOrderID,
                    entity.PaymentTerms,
                    entity.Description,
                    entity.TotalQuantity,
                    Children = newChildrenLog
                    });

                // 8️⃣ Write a “Create” entry into the ActivityLogs table
                await _activityLogRepository.Create(new ActivityLog
                    {
                    MenuItemId = 29,                          // Identifier for PurchaseReceive menu
                    ParentTableId = entity.PurchaseReceiveID,   // Link the log to this new record
                    ActionType = "Create",
                    OldData = string.Empty,               // No previous state
                    NewData = newPayload,                 // Serialized new state
                    UserId = currentUser,
                    Date = DateTime.Now
                    });

                // 9️⃣ Handle file attachments: upload each using AppFilesService
                for (int i = 0; i < attachments.Count; i++)
                    {
                    var file = attachments[i];
                    // Match metadata by index order—frontend must align MultipleAttachments list
                    var metaRef = vm.MultipleAttachments
                        .ElementAtOrDefault(i)?.Referenceno ?? "";

                    var appFile = new MultipleAttachment
                        {
                        MenuItemId = 29,
                        MenuItemName = "Purchase Receive",
                        ParentTableId = entity.PurchaseReceiveID,
                        FileName = file.FileName,
                        Referenceno = metaRef,
                        Date = DateTime.Now,
                        CreatedBy = currentUser,
                        CreatedOn = DateTime.Now,
                        IsActive = 1,
                        IsDeleted = 0
                        };
                    // Upload persists both DB record and physical file
                    await _appFilesService.Upload(appFile, file);
                    }

                // 🔟 Commit the transaction now that everything succeeded
                await tx.CommitAsync();

                // 1️⃣1️⃣ Return HTTP 201 Created with a Location header to the new resource
                return CreatedAtAction(
                    nameof(GetById),
                    new { id = entity.PurchaseReceiveID },
                    entity
                );
                }
            catch (Exception ex)
                {
                // 🔄 On failure, roll back everything
                await tx.RollbackAsync();
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }

        // PUT: api/PurchaseReceives/5
        // PUT /api/PurchaseReceive/{id}
        // Updates an existing PurchaseReceive record, its line items, and attachments in one atomic operation.
        [HttpPut("{id}")]
        public async Task<IActionResult> Update (
            int id,
            [FromForm] string request,               // JSON payload representing the updated PurchaseReceiveVM
            [FromForm] List<IFormFile> attachments,  // New files uploaded in this update
            [FromForm] string removeAttachmentIds    // JSON array of attachment IDs the client wants removed
        )
            {
            // 1️⃣ Deserialize the JSON form-field into our view model
            var vm = JsonSerializer.Deserialize<PurchaseReceiveVM>(request);
            if (vm == null || vm.PurchaseReceiveID != id)
                return BadRequest("Invalid request data.");

            // 2️⃣ Identify who is making the change
            var currentUser = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "System";

            // 3️⃣ Start a transaction so we can rollback on any failure
            await using var tx = await _context.Database.BeginTransactionAsync();
            try
                {
                // 4️⃣ Load the existing PurchaseReceive and its children
                var entity = await _context.PurchaseReceives
                    .Include(x => x.PurchaseReceiveChildren)
                    .FirstOrDefaultAsync(x =>
                        x.PurchaseReceiveID == id &&
                        x.IsActive == 1 &&
                        x.IsDeleted == 0);

                if (entity == null)
                    return NotFound($"PurchaseReceive with ID {id} not found.");

                // 5️⃣ Decode the list of attachments the client asked to remove
                var toRemove = JsonSerializer.Deserialize<List<int>>(removeAttachmentIds)
                               ?? new List<int>();

                // 6️⃣ Capture the original state for auditing
                var originalStatus = entity.StatusId;
                var oldPayload = new
                    {
                    entity.PurchaseReceiveID,
                    entity.RefNo,
                    entity.Date,
                    entity.VendorID,
                    entity.VendorChildID,
                    entity.PurchaseRequisitionOrderID,
                    entity.PaymentTerms,
                    entity.Description,
                    entity.TotalQuantity,
                    entity.StatusId,
                    Children = entity.PurchaseReceiveChildren
                        .Where(c => c.IsActive == 1 && c.IsDeleted == 0)
                        .Select(c => new {
                            c.PurchaseReceiveChildID,
                            c.ItemID,
                            c.UnitId,
                            c.Quantity,
                            c.ConversionFactor,
                            c.ChildTotalQuantity
                            })
                        .ToList()
                    };

                // 7️⃣ Apply updates to the parent PurchaseReceive fields
                entity.RefNo = vm.RefNo;
                entity.Date = vm.Date;
                entity.VendorID = vm.VendorID;
                entity.VendorChildID = vm.VendorChildID;
                entity.PurchaseRequisitionOrderID = vm.PurchaseRequisitionOrderID;
                entity.PaymentTerms = vm.PaymentTerms;
                entity.Description = vm.Description;
                entity.TotalQuantity = vm.TotalQuantity;
                entity.StatusId = vm.StatusId;
                entity.ModifiedBy = currentUser;
                entity.ModifiedOn = DateTime.Now;

                // 8️⃣ Clear out old child items (we’ll re-add afresh)
                _context.PurchaseReceiveChildren.RemoveRange(entity.PurchaseReceiveChildren);
                entity.PurchaseReceiveChildren.Clear();

                // 9️⃣ Map new children from the VM into the entity
                foreach (var childVm in vm.PurchaseReceiveChildVMs)
                    {
                    entity.PurchaseReceiveChildren.Add(new PurchaseReceiveChild
                        {
                        ItemID = childVm.ItemID,
                        UnitId = childVm.UnitId,
                        IsSecondaryUnit = childVm.IsSecondaryUnit,
                        Quantity = childVm.Quantity,
                        ConversionFactor = childVm.ConversionFactor,
                        ChildTotalQuantity = childVm.ChildTotalQuantity,
                        IsActive = childVm.IsActive ?? 1,
                        IsDeleted = childVm.IsDeleted ?? 0
                        });
                    }

                // 🔟 Persist all parent and child updates
                _context.PurchaseReceives.Update(entity);
                await _context.SaveChangesAsync();

                // 1️⃣1️⃣ Build the new state payload for auditing
                var newPayload = new
                    {
                    entity.PurchaseReceiveID,
                    entity.RefNo,
                    entity.Date,
                    entity.VendorID,
                    entity.VendorChildID,
                    entity.PurchaseRequisitionOrderID,
                    entity.PaymentTerms,
                    entity.Description,
                    entity.TotalQuantity,
                    entity.StatusId,
                    Children = entity.PurchaseReceiveChildren.Select(c => new {
                        c.PurchaseReceiveChildID,
                        c.ItemID,
                        c.UnitId,
                        c.Quantity,
                        c.ConversionFactor,
                        c.ChildTotalQuantity
                        }).ToList()
                    };

                // 1️⃣2️⃣ Log the update action
                await _activityLogRepository.Create(new ActivityLog
                    {
                    MenuItemId = 29,  // PurchaseReceive menu code
                    ParentTableId = entity.PurchaseReceiveID,
                    ActionType = "Update",
                    OldData = JsonSerializer.Serialize(oldPayload),
                    NewData = JsonSerializer.Serialize(newPayload),
                    UserId = currentUser,
                    Date = DateTime.Now
                    });

                // 1️⃣3️⃣ If this record was previously approved, record a revision log
                if (originalStatus == Statuses.Approve)
                    {
                    await _reviseLogRepository.Create(new Reviselog
                        {
                        MenuItemId = 29,
                        ParentTableId = entity.PurchaseReceiveID,
                        ActionType = "Revise",
                        OldData = JsonSerializer.Serialize(oldPayload),
                        NewData = JsonSerializer.Serialize(newPayload),
                        UserId = currentUser,
                        Date = DateTime.Now
                        });
                    }

                // 1️⃣4️⃣ Handle new attachments: upload each file in the order sent
                for (int i = 0; i < attachments.Count; i++)
                    {
                    var formFile = attachments[i];
                    // Match upload metadata by index from vm.MultipleAttachments
                    var metaRef = vm.MultipleAttachments
                        .ElementAtOrDefault(i)?.Referenceno ?? "";

                    var appFile = new MultipleAttachment
                        {
                        MenuItemId = 29,
                        MenuItemName = "Purchase Receive",
                        ParentTableId = id,
                        FileName = formFile.FileName,
                        Referenceno = metaRef,
                        Date = DateTime.Now,
                        CreatedBy = currentUser,
                        CreatedOn = DateTime.Now,
                        IsActive = 1,
                        IsDeleted = 0
                        };
                    await _appFilesService.Upload(appFile, formFile);
                    }

                // 1️⃣5️⃣ Remove any attachments the client marked for deletion
                if (toRemove.Any())
                    {
                    await _appFilesService.RemoveSpecificAttachmentsAsync(
                        menuItemId: 29,
                        parentTableId: id,
                        idsToRemove: toRemove
                    );
                    }

                // 1️⃣6️⃣ Commit the transaction now that everything has succeeded
                await tx.CommitAsync();

                // 1️⃣7️⃣ Return HTTP 200 OK with the updated entity
                return Ok(entity);
                }
            catch (Exception ex)
                {
                // 🔄 Roll back on error and return 500
                await tx.RollbackAsync();
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }


        // GET /api/PurchaseReceive/{id}
        // Loads a PurchaseReceive by ID, including its line items and any file attachments.
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById ( int id )
            {
            try
                {
                // 1️⃣ Load the PurchaseReceive header plus all its children in one go.
                //    • Filters only active (IsActive == 1), non-deleted (IsDeleted == 0) records.
                var entity = await _context.PurchaseReceives
                    .Include(x => x.PurchaseReceiveChildren)
                    .FirstOrDefaultAsync(x =>
                        x.PurchaseReceiveID == id &&
                        x.IsActive == 1 &&
                        x.IsDeleted == 0
                    );

                // 1.a) If none found, return 404 Not Found
                if (entity == null)
                    return NotFound($"PurchaseReceive with ID {id} not found.");

                // 2️⃣ Separately load any attachments for this PurchaseReceive.
                //    • MenuItemId = 29 links to the PurchaseReceive menu
                //    • ParentTableId = the PurchaseReceiveID
                var attachments = await _context.Multipleattachments
                    .Where(m =>
                        m.MenuItemId == 29 &&
                        m.ParentTableId == entity.PurchaseReceiveID &&
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
                    .ToListAsync();

                // 3️⃣ Map all data into the PurchaseReceiveVM for the client
                var vm = new PurchaseReceiveVM
                    {
                    // --- Header fields ---
                    PurchaseReceiveID = entity.PurchaseReceiveID,
                    RefNo = entity.RefNo,
                    Date = entity.Date,
                    VendorID = entity.VendorID,
                    VendorChildID = entity.VendorChildID,
                    PurchaseRequisitionOrderID = entity.PurchaseRequisitionOrderID,
                    PaymentTerms = entity.PaymentTerms,
                    Description = entity.Description,
                    TotalQuantity = entity.TotalQuantity,
                    StatusId = entity.StatusId,

                    // --- Line items: only active, non-deleted children ---
                    PurchaseReceiveChildVMs = entity.PurchaseReceiveChildren
                        .Where(c => c.IsActive == 1 && c.IsDeleted == 0)
                        .Select(c => new PurchaseReceiveChildVM
                            {
                            PurchaseReceiveChildID = c.PurchaseReceiveChildID,
                            PurchaseReceiveID = c.PurchaseReceiveID,
                            ItemID = c.ItemID,
                            UnitId = c.UnitId,
                            IsSecondaryUnit = c.IsSecondaryUnit,
                            Quantity = c.Quantity,
                            ConversionFactor = c.ConversionFactor,
                            ChildTotalQuantity = c.ChildTotalQuantity,
                            IsActive = c.IsActive,
                            IsDeleted = c.IsDeleted
                            })
                        .ToList(),

                    // --- File attachments loaded above ---
                    MultipleAttachments = attachments
                    };

                // 4️⃣ Return the assembled view model with HTTP 200 OK
                return Ok(vm);
                }
            catch (Exception ex)
                {
                // 5️⃣ On unexpected errors, return HTTP 500 with the exception message
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }


        [HttpGet("get-units-by-item/{id}")]
        public async Task<IActionResult> GetUnitsByItem ( int id )
            {
            try
                {
                // Retrieve the item from the database by the given id.
                var item = await _context.Items.FirstOrDefaultAsync(i => i.ItemId == id);

                // If not found, return a NotFound result.
                if (item == null)
                    return NotFound($"Item with id {id} not found.");

                // Create a list to hold our unit DTOs.
                var units = new List<UnitDTO>();
                int indexCounter = 1;

                // Add the primary unit if available.
                if (item.UnitId.HasValue && item.UnitId.Value > 0)
                    {
                    units.Add(new UnitDTO
                        {
                        index = indexCounter++, // assign and increment counter
                        UnitId = item.UnitId.Value,
                        UnitName = _context.Units
                                           .Where(c => c.UnitId == item.UnitId)
                                           .Select(c => c.UnitName)
                                           .FirstOrDefault(),
                        IsSecondaryUnit = false
                        });
                    }

                // If SecondaryUnitID exists and is greater than zero, add it as a secondary unit.
                if (item.SecondaryUnitID.HasValue && item.SecondaryUnitID.Value > 0)
                    {
                    units.Add(new UnitDTO
                        {
                        index = indexCounter++, // assign next index value
                        UnitId = item.SecondaryUnitID.Value,
                        UnitName = _context.Units
                                           .Where(c => c.UnitId == item.SecondaryUnitID)
                                           .Select(c => c.UnitName)
                                           .FirstOrDefault(),
                        IsSecondaryUnit = true
                        });
                    }

                // Return the list of unit details.
                return Ok(units);
                }
            catch (Exception ex)
                {
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }

        // GET /api/PurchaseReceive/get-conversionfactor?ItemtId={id}&UnitId={unitId}&IsSecondaryUnit={true|false}
        // Returns the conversion factor for a given item’s secondary unit, if applicable.
        [HttpGet("get-conversionfactor")]
        public async Task<IActionResult> GetItemConversionFactor ( [FromQuery] ConversionFactorDTO conversionFactorDTO )
            {
            try
                {
                // 1️⃣ If the client indicates this is not a secondary-unit lookup,
                //    then no conversion applies—return 404 to signal “not found.”
                if (!conversionFactorDTO.IsSecondaryUnit)
                    {
                    return NotFound("Item has no conversion factor for the primary unit.");
                    }

                // 2️⃣ Query the Items table for the matching item/secondary unit:
                //    • Filter by ItemId, SecondaryUnitID, active, and not deleted.
                //    • Project only the ConversionFactor value.
                var items = await _context.Items
                    .Where(a =>
                        a.ItemId == conversionFactorDTO.ItemtId &&
                        a.SecondaryUnitID == conversionFactorDTO.UnitId &&
                        a.IsActive == 1 &&
                        a.IsDeleted == 0
                    )
                    .Select(c => new
                        {
                        c.ConversionFactor    // how many base units per this secondary unit
                        })
                    .ToListAsync();            // execute and return a list (usually one element)

                // 3️⃣ Return HTTP 200 OK with the list of conversion factors.
                return Ok(items);
                }
            catch (Exception ex)
                {
                // 4️⃣ On error (e.g., DB issues), return HTTP 500 with the exception message.
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }

        // GET /api/PurchaseReceive/get-items
        // Retrieves a list of all active, non-deleted items for use in dropdowns or lookups.
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

        // GET /api/PurchaseReceive/get-all-Purchasesreceived
        // Retrieves all active, non-deleted PurchaseReceives with vendor & status names, plus a 1-based index for UI display.
        [HttpGet("get-all-Purchasesreceived")]
        public async Task<IActionResult> GetAllPurchasesReceived ( )
            {
            try
                {
                // 1️⃣ Query PurchaseReceives table for active, non-deleted entries
                var paymentReceiveds = await _context.PurchaseReceives
                    .Where(a =>
                        a.IsActive == 1 &&     // only include records marked active
                        a.IsDeleted == 0       // exclude soft-deleted records
                    )
                    // 2️⃣ Project into an anonymous type to return only necessary fields
                    .Select(p => new
                        {
                        p.PurchaseReceiveID,  // primary key
                        p.RefNo,              // reference number
                        p.Date,               // date of receipt
                        p.TotalQuantity,      // total quantity received
                                              // ▶ Lookup the vendor name by joining to Vendors table on VendorID
                        VendorName = _context.Vendors
                            .Where(u => u.VendorID == p.VendorID)
                            .Select(u => u.VendorName)
                            .FirstOrDefault(),
                        p.StatusId,           // numeric status code
                                              // ▶ Lookup human-readable status name by joining to Statuses table on StatusId
                        StatusName = _context.Statuses
                            .Where(s => s.StatusId == p.StatusId)
                            .Select(s => s.StatusName)
                            .FirstOrDefault()
                        })
                    .ToListAsync();          // execute query and materialize results

                // 3️⃣ Add a 1-based index for display purposes in the UI
                var indexedPaymentReceiveds = paymentReceiveds
                    .Select(( pr, index ) => new
                        {
                        Index = index + 1,       // first item gets Index = 1
                        pr.PurchaseReceiveID,
                        pr.RefNo,
                        pr.Date,
                        pr.TotalQuantity,
                        pr.VendorName,
                        pr.StatusId,
                        pr.StatusName
                        })
                    .ToList();

                // 4️⃣ Return HTTP 200 OK with the indexed list of receipts
                return Ok(indexedPaymentReceiveds);
                }
            catch (Exception ex)
                {
                // 💥 If an exception occurs (e.g., database error), return HTTP 500 with the error message
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }


        // GET /api/PurchaseReceive/detail-get-by/{id}
        // Loads a PurchaseReceive by ID, including its children and attachments, and returns a detailed view model.
        [HttpGet("detail-get-by/{id}")]
        public async Task<IActionResult> DetailGetById ( int id )
            {
            try
                {
                // 1️⃣ Load the PurchaseReceive header plus all its line items in one query
                //    • Filter by matching ID, active flag, and not-deleted flag
                var entity = await _context.PurchaseReceives
                    .Include(x => x.PurchaseReceiveChildren)
                    .FirstOrDefaultAsync(x =>
                        x.PurchaseReceiveID == id &&
                        x.IsActive == 1 &&
                        x.IsDeleted == 0
                    );

                // 2️⃣ If no record found, return 404 Not Found
                if (entity == null)
                    return NotFound($"PurchaseReceive with ID {id} not found.");

                // 3️⃣ Separately load any file attachments for this PurchaseReceive
                //    • MenuItemId = 29 identifies the PurchaseReceive menu
                //    • ParentTableId = the PurchaseReceiveID
                var attachments = await _context.Multipleattachments
                    .Where(m =>
                        m.MenuItemId == 29 &&
                        m.ParentTableId == entity.PurchaseReceiveID &&
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
                    .ToListAsync();

                // 4️⃣ Map the EF entity and attachments into an anonymous view model
                var vm = new
                    {
                    // --- Header fields ---
                    entity.PurchaseReceiveID,
                    entity.RefNo,
                    entity.Date,
                    entity.VendorID,
                    // ▶ Lookup the vendor’s name for display
                    VendorName = _context.Vendors
                        .Where(c => c.VendorID == entity.VendorID)
                        .Select(c => c.VendorName)
                        .FirstOrDefault(),
                    entity.PurchaseRequisitionOrderID,
                    entity.PaymentTerms,
                    entity.Description,
                    entity.TotalQuantity,
                    entity.StatusId,
                    entity.IsActive,
                    entity.IsDeleted,
                    entity.CreatedBy,
                    entity.CreatedOn,
                    entity.ModifiedBy,
                    entity.ModifiedOn,

                    // --- Child line items ---
                    PurchaseReceiveChildVMs = entity.PurchaseReceiveChildren
                        .Where(c => c.IsActive == 1 && c.IsDeleted == 0)
                        .Select(c => new
                            {
                            c.PurchaseReceiveChildID,
                            c.PurchaseReceiveID,
                            c.ItemID,
                            // ▶ Lookup the item’s name for display
                            ItemName = _context.Items
                                .Where(u => u.ItemId == c.ItemID)
                               .Select(u => u.ItemName + ' ' + '(' + u.ItemCode+')')
                                .FirstOrDefault(),
                            c.UnitId,
                            c.IsSecondaryUnit,
                            c.Quantity,
                            c.ConversionFactor,
                            c.ChildTotalQuantity,
                            // ▶ Lookup the unit’s name and append “ secondary” if flagged
                            UnitName = _context.Units
                                .Where(u => u.UnitId == c.UnitId)
                                .Select(u => u.UnitName)
                                .FirstOrDefault()
                                + ((c.IsSecondaryUnit ?? false) ? " secondary" : ""),
                            c.IsActive,
                            c.IsDeleted
                            })
                        .ToList(),

                    // --- File attachments loaded earlier ---
                    MultipleAttachments = attachments
                    };

                // 5️⃣ Return HTTP 200 OK with the populated view model
                return Ok(vm);
                }
            catch (Exception ex)
                {
                // 6️⃣ On error (e.g., database exception), return HTTP 500 with the message
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }

        [HttpPut("changestatusPurchasesReceived/{id}")]
        public async Task<IActionResult> ChangeStatusPurchasesReceived ( int id )
            {
            // Begin a transaction
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
                {
                // Fetch the SalesRequisition (including its child items)
                var purchaseReceives = await _context.PurchaseReceives
                    .Include(c => c.PurchaseReceiveChildren)
                    .FirstOrDefaultAsync(c => c.PurchaseReceiveID == id && c.IsActive == 1 && c.IsDeleted == 0);

                if (purchaseReceives == null)
                    {
                    return NotFound("Payment Received not found");
                    }

                var purchaseInvoices = await _context.PurchaseInvoices
                    .Include(pr => pr.PurchaseInvoiceChildren)
                          .Where(pr => pr.PurchaseReceiveID == id
                                && pr.IsActive == 1
                                && pr.IsDeleted == 0).Select(prc => prc.PurchaseInvoiceID)    // your FK on the child
                     .Distinct()
                     .ToListAsync();
                if (purchaseInvoices.Count > 0)
                    {
                    // 3) See if any of those parents have a non-void status
                    var hasUnvoidedpurchaseInvoices = await _context.PurchaseInvoices
                        .Where(pr => purchaseInvoices.Contains(pr.PurchaseInvoiceID)
                                  && pr.StatusId != Statuses.Void)
                        .AnyAsync();

                    if (hasUnvoidedpurchaseInvoices)
                        return BadRequest("Cannot void Received until all related Invoices are voided.");
                    }

                // Update the status to 4
                purchaseReceives.StatusId = Statuses.Void;

                // Mark the SalesRequisition as updated.
                _context.PurchaseReceives.Update(purchaseReceives);

                // Save changes within the transaction.
                await _context.SaveChangesAsync();

                // Commit the transaction
                await transaction.CommitAsync();

                return Ok("Payment Received status changed successfully");
                }
            catch (Exception ex)
                {
                // Rollback the transaction on error
                await transaction.RollbackAsync();
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }
        [HttpGet("activity_log/PurchaseReceives/{id}")]
        public async Task<IActionResult> GetActivityLogsForPurchaseReceives ( int id )
            {
            try
                {
                var logs = await _context.ActivityLogs
                    .Where(a => a.MenuItemId == 29)
                    // Left join with Users
                    .GroupJoin(
                        _context.Users,
                        a => a.UserId,
                        u => u.Id,
                        ( a, users ) => new { a, users }
                    )
                    .SelectMany(
                        temp => temp.users.DefaultIfEmpty(),
                        ( temp, user ) => new { temp.a, user }
                    )
                    // Left join with PurchaseReceives
                    .GroupJoin(
                        _context.PurchaseReceives,
                        temp => temp.a.ParentTableId,
                        b => b.PurchaseReceiveID,
                        ( temp, PurchaseReceives ) => new { temp.a, temp.user, PurchaseReceives }
                    )
                    .SelectMany(
                        temp => temp.PurchaseReceives.DefaultIfEmpty(),
                        ( temp, PurchaseReceive ) => new { temp.a, temp.user, PurchaseReceive }
                    )
                    // Apply filter for UnitId = 1 (ensure Unit is not null)
                    .Where(x => x.PurchaseReceive != null && x.PurchaseReceive.PurchaseReceiveID == id)
                    // Project to the desired shape
                    .Select(x => new
                        {
                        x.a.ActionType,
                        x.a.OldData,
                        x.a.NewData,
                        PurchaseReceiveRefNo = x.PurchaseReceive.RefNo,
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

        // GET /api/PurchaseReceive/GetPurchasesReceiveReportSP/{id}
        // Executes the SP_GetPurchasesReceiveReport stored procedure to retrieve
        // both the summary (header) and detailed (line-item) rows in a single round-trip.
        [HttpGet("GetPurchasesReceiveReportSP/{id}")]
        public async Task<IActionResult> GetPurchasesReceiveReportSP ( int id )
            {
            try
                {
                // 1️⃣ Obtain the raw ADO.NET connection from EF Core's DbContext
                var conn = _context.Database.GetDbConnection();

                // 2️⃣ Create and configure the command for our stored procedure
                await using var cmd = conn.CreateCommand();
                cmd.CommandText = "SP_GetPurchasesReceiveReport";
                cmd.CommandType = CommandType.StoredProcedure;

                // 3️⃣ Add the input parameter (@p_PurchaseReceiveID)
                cmd.Parameters.Add(new MySqlParameter("p_PurchaseReceiveID", MySqlDbType.Int32)
                    {
                    Direction = ParameterDirection.Input,
                    Value = id
                    });

                // 4️⃣ Open the connection if it's not already open
                if (conn.State != ConnectionState.Open)
                    await conn.OpenAsync();

                // 5️⃣ Execute the stored procedure and get a forward-only reader
                await using var reader = await cmd.ExecuteReaderAsync();

                // 6️⃣ Read the first result set: the header/summary row
                PurchaseReceiveDto receive = null;
                if (await reader.ReadAsync())
                    {
                    // Map each column from the reader into our DTO
                    receive = new PurchaseReceiveDto
                        {
                        PurchaseReceiveID = Convert.ToInt32(reader["PurchaseReceiveID"]),
                        RefNo = reader["RefNo"].ToString(),
                        Date = reader["Date"] as DateTime?,
                        VendorName = reader["VendorName"].ToString(),
                        Address = reader["Address"].ToString(),
                        QuantityCTN = Convert.ToDecimal(reader["QuantityCTN"]),
                        QuantityPCS = Convert.ToDecimal(reader["QuantityPCS"]),
                        TotalQtyPCS = Convert.ToDecimal(reader["TotalQtyPCS"]),
                        Items = new List<PurchaseReceiveItemDto>()  // prepare for detail rows
                        };
                    }
                else
                    {
                    // 6.a) If no header row, the ID does not exist → return 404
                    return NotFound();
                    }

                // 7️⃣ Advance to the second result set: the line-item details
                if (await reader.NextResultAsync())
                    {
                    while (await reader.ReadAsync())
                        {
                        // For each detail row, build a PurchaseReceiveItemDto
                        receive.Items.Add(new PurchaseReceiveItemDto
                            {
                            ItemID = Convert.ToInt32(reader["ItemID"]),
                            BrandName = reader["BrandName"].ToString(),
                            ItemName = reader["ItemName"].ToString(),
                            PackingPCSperCTN = Convert.ToInt32(reader["PackingPCSperCTN"]),
                            QuantityCTN = Convert.ToDecimal(reader["QuantityCTN"]),
                            QuantityPCS = Convert.ToDecimal(reader["QuantityPCS"]),
                            TotalQtyPCS = Convert.ToDecimal(reader["TotalQtyPCS"])
                            });
                        }
                    }

                // 8️⃣ Return the assembled DTO (header + details) with HTTP 200 OK
                return Ok(receive);
                }
            catch (Exception ex)
                {
                // 🔄 On any error (e.g., SP failure, connection issues), return generic 500
                // TODO: Replace with ILogger to capture exception details in production
                return StatusCode(500, "An error occurred while retrieving the purchase receive report.");
                }
            }

        }
    }


