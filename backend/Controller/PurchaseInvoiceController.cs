using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SalesInventoryAPI.Data.Services;
using SalesInventoryAPI.Data;
using static SalesInventoryAPI.Models.AppConstants;
using Microsoft.EntityFrameworkCore;
using SalesInventoryAPI.Data.ViewModels;
using SalesInventoryAPI.Models;
using System.Text.Json;
using SalesInventoryAPI.Data.DTOs;
using System.Security.Claims;
using System.Net.Mail;
using Org.BouncyCastle.Asn1.Ocsp;
using MySqlConnector;
using System.Data;
using Microsoft.AspNetCore.Authorization;

namespace SalesInventoryAPI.Controller
    {
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class PurchaseInvoiceController : ControllerBase
        {
        private readonly InventoryDbContext _context;
        private readonly PermissionService _permissionService;
        private readonly ActivityLogRepository _activityLogRepository;
        private readonly ReviseLogRepository _reviseLogRepository;
        private readonly CodeGenerator _codeGenerator;
        private readonly AppFilesService _appFilesService;

        public PurchaseInvoiceController (
            InventoryDbContext context,
            PermissionService permissionService,
            ActivityLogRepository activityLogRepository,
            ReviseLogRepository reviseLogRepository,
            CodeGenerator codeGenerator,
            AppFilesService appFilesService)
            {
            _context = context;
            _permissionService = permissionService;
            _activityLogRepository = activityLogRepository;
            _reviseLogRepository = reviseLogRepository;
            _codeGenerator = codeGenerator;
            _appFilesService = appFilesService;
            }

        // Responds to GET /api/PurchaseInvoice/GetNextPurchaseInvoiceRefNumber
        [HttpGet("GetNextPurchaseInvoiceRefNumber")]
        public async Task<IActionResult> GetNextPurchaseInvoiceRefNumber ( )
            {
            try
                {
                // 1️⃣ Ask the CodeGenerator service to mint a new, unique invoice number:
                //    • "purchaseinvoices" = the DB table
                //    • "RefNo"          = the column we’re incrementing
                //    • "PI-2025"        = the textual prefix for all codes
                //    • 4                = pad numeric portion to 4 digits (e.g. PI-20250001)
                string ref_no = await _codeGenerator.GenerateReferenceNumber(
                    tableName: "purchaseinvoices",
                    columnName: "RefNo",
                    prefix: "PI-2025",
                    digits: 4
                );

                // 2️⃣ Wrap it in a simple JSON object and return HTTP 200 OK:
                //    { "PurchaseInvoiceRefNumber": "PI-20250001" }
                return Ok(new { PurchaseInvoiceRefNumber = ref_no });
                }
            catch (Exception ex)
                {
                // 💥 Something went wrong at code generation or DB layer:
                //    - Log details to console for troubleshooting.
                //    - Return a generic 500 so clients know it failed (but don’t expose internal details).
                Console.WriteLine($"Error generating next invoice ref no: {ex.Message}");
                return StatusCode(500, "Internal server error.");
                }
            }

        // GET /api/PurchaseInvoice/get-purchase-received
        // Returns a list of approved PurchaseReceives that have not yet been invoiced.
        [HttpGet("get-purchase-received")]
        public async Task<IActionResult> GePurchaseReceived ( )
            {
            try
                {
                // 1️⃣ Query the PurchaseReceives table:
                //    - a.IsActive == 1  → only include active records
                //    - a.IsDeleted == 0 → exclude soft-deleted records
                //    - a.StatusId == Statuses.Approve → only those marked “Approved”
                //    - !_context.PurchaseInvoices.Any(...) → ensure this receive hasn’t already been invoiced
                var purchaseReceives = await _context.PurchaseReceives
                    .Where(a =>
                        a.IsActive == 1 &&
                        a.IsDeleted == 0 &&
                        a.StatusId == Statuses.Approve &&
                        !_context.PurchaseInvoices
                            .Any(si => si.PurchaseReceiveID == a.PurchaseReceiveID)
                    )
                    // 2️⃣ Project into an anonymous DTO with just the fields the client needs:
                    .Select(pr => new
                        {
                        pr.PurchaseReceiveID,  // primary key for selection
                        pr.RefNo,              // reference number to display
                        pr.VendorID            // vendor identifier for lookup
                        })
                    .ToListAsync();

                // 3️⃣ Return HTTP 200 with the results array
                return Ok(purchaseReceives);
                }
            catch (Exception ex)
                {
                // 💥 If anything goes wrong (e.g., DB outage), catch and return a 500:
                //    - Include the exception message for easier debugging by API consumers.
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }

        // GET /api/PurchaseInvoice/get-purchase-receivedEdit/{PurchaseInvoiceID}
        // Returns the PurchaseReceive entries already linked to the specified invoice ID (used when editing).
        [HttpGet("get-purchase-receivedEdit/{PurchaseInvoiceID}")]
        public async Task<IActionResult> GePurchaseReceivedEdit ( int PurchaseInvoiceID )
            {
            try
                {
                // 1️⃣ Filter PurchaseReceives:
                //    - only active, non-deleted records
                //    - and where there exists a PurchaseInvoice matching both:
                //       • PurchaseReceiveID == a.PurchaseReceiveID
                //       • PurchaseInvoiceID  == the provided ID (so it’s already tied to this invoice)
                var purchaseReceives = await _context.PurchaseReceives
                    .Where(a =>
                        a.IsActive == 1 &&
                        a.IsDeleted == 0 &&
                        _context.PurchaseInvoices
                            .Any(pi =>
                                pi.PurchaseReceiveID == a.PurchaseReceiveID &&
                                pi.PurchaseInvoiceID == PurchaseInvoiceID
                            )
                    )
                    // 2️⃣ Project into a lean anonymous object for the front-end:
                    .Select(pr => new
                        {
                        pr.PurchaseReceiveID,  // the PK of the receive
                        pr.RefNo,              // display reference number
                        pr.VendorID            // vendor identifier for additional lookups
                        })
                    .ToListAsync();

                // 3️⃣ Return HTTP 200 OK with the matching receives
                return Ok(purchaseReceives);
                }
            catch (Exception ex)
                {
                // 💥 On any exception, return a 500 with the error message
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
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


        // GET /api/PurchaseInvoice/{id}
        // Retrieves a single PurchaseInvoice by its ID, including its line items and any file attachments.
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById ( int id )
            {
            // 1️⃣ Query the PurchaseInvoices table for the matching ID,
            //    only include active, non-deleted records.
            var invoice = await _context.PurchaseInvoices
                .Where(i =>
                    i.PurchaseInvoiceID == id &&
                    i.IsActive == 1 &&
                    i.IsDeleted == 0
                )
                // 2️⃣ Eager-load related child items to avoid separate queries later.
                .Include(i => i.PurchaseInvoiceChildren)
                // 3️⃣ Project the result into our PurchaseInvoiceVM view model.
                .Select(i => new PurchaseInvoiceVM
                    {
                    // --- Header fields ---
                    PurchaseInvoiceID = i.PurchaseInvoiceID,
                    PurchaseReceiveID = i.PurchaseReceiveID,
                    RefNo = i.RefNo,
                    InvoiceDate = i.InvoiceDate,
                    VendorID = i.VendorID,
                    VendorChildID = i.VendorChildID,
                    WarehouseID = i.WarehouseID,
                    PaymentTerms = i.PaymentTerms,
                    Description = i.Description,
                    TotalNetAmount = i.TotalNetAmount,
                    StatusId = i.StatusId,
                    TotalQuantity = i.TotalQuantity,

                    // --- Line items: only active, non-deleted children ---
                    PurchaseInvoiceChildVMs = i.PurchaseInvoiceChildren
                        .Where(c =>
                            c.IsActive == 1 &&
                            c.IsDeleted == 0
                        )
                        .Select(c => new PurchaseInvoiceChildVM
                            {
                            PurchaseInvoiceChildID = c.PurchaseInvoiceChildID,
                            PurchaseInvoiceID = c.PurchaseInvoiceID,
                            ItemID = c.ItemID,
                            UnitId = c.UnitId,
                            IsSecondaryUnit = c.IsSecondaryUnit,
                            ConversionFactor = c.ConversionFactor,
                            Quantity = c.Quantity,
                            ChildTotalQuantity = c.ChildTotalQuantity,
                            NetPrice = c.NetPrice,
                            TotalPrice = c.TotalPrice
                            })
                        .ToList(),

                    // --- Attachments: query MultipleAttachments table by menu & parent ID ---
                    MultipleAttachments = _context.Multipleattachments
                        .Where(m =>
                            m.MenuItemId == 30 &&                    // 30 = PurchaseInvoice menu code
                            m.ParentTableId == i.PurchaseInvoiceID &&   // link by invoice ID
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
                    })
                .FirstOrDefaultAsync();  // Execute the query and get a single result or null

            // 4️⃣ If no matching invoice found, return HTTP 404
            if (invoice == null)
                return NotFound($"PurchaseInvoice with ID {id} not found.");

            // 5️⃣ Otherwise, return HTTP 200 OK with the populated view model
            return Ok(invoice);
            }


        // POST /api/PurchaseInvoice
        // Creates a new PurchaseInvoice (with line items and attachments) in one atomic operation.
        [HttpPost]
        public async Task<IActionResult> Create (
            [FromForm] string request,           // JSON payload for the invoice, sent as a form field
            [FromForm] List<IFormFile> attachments  // Optional file attachments, sent in the same form
        )
            {
            // Parse the JSON string into our view model
            var vm = JsonSerializer.Deserialize<PurchaseInvoiceVM>(request);
            if (vm == null)
                return BadRequest("Invalid payload.");  // 400 if JSON is malformed

            // 1️⃣ Ensure we have an invoice reference number:
            //    • If client sent vm.RefNo use it; otherwise generate one.
            var refNo = vm.RefNo
                ?? await _codeGenerator.GenerateReferenceNumber(
                       tableName: "purchaseinvoices",
                       columnName: "RefNo",
                       prefix: "PI-2025",
                       digits: 4
                   );
            // Capture the current user for audit fields
            var currentUser = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "System";

            // 2️⃣ Map the VM properties into a new EF entity
            var entity = new PurchaseInvoice
                {
                PurchaseReceiveID = vm.PurchaseReceiveID,
                RefNo = refNo,
                InvoiceDate = vm.InvoiceDate,
                VendorID = vm.VendorID,
                VendorChildID = vm.VendorChildID,
                WarehouseID = vm.WarehouseID,
                PaymentTerms = vm.PaymentTerms,
                Description = vm.Description,
                TotalNetAmount = vm.TotalNetAmount,
                StatusId = 1,               // default: New / Pending
                TotalQuantity = vm.TotalQuantity,
                IsActive = 1,               // mark as active
                IsDeleted = 0,               // not deleted
                CreatedBy = currentUser,
                CreatedOn = DateTime.Now
                };

            // Add each child line item from the VM to the entity's navigation collection
            foreach (var c in vm.PurchaseInvoiceChildVMs)
                {
                entity.PurchaseInvoiceChildren.Add(new PurchaseInvoiceChild
                    {
                    ItemID = c.ItemID,
                    UnitId = c.UnitId,
                    IsSecondaryUnit = c.IsSecondaryUnit,
                    ConversionFactor = c.ConversionFactor,
                    Quantity = c.Quantity,
                    ChildTotalQuantity = c.ChildTotalQuantity,
                    NetPrice = c.NetPrice,
                    TotalPrice = c.TotalPrice,
                    IsActive = 1,
                    IsDeleted = 0
                    });
                }

            // 3️⃣ Open a database transaction to ensure atomicity
            await using var tx = await _context.Database.BeginTransactionAsync();
            try
                {
                // 4️⃣ Persist the invoice header and its child items
                await _context.PurchaseInvoices.AddAsync(entity);
                await _context.SaveChangesAsync();

                // 5️⃣ Prepare a lightweight payload to record in the activity log
                var logPayload = new
                    {
                    InvoiceId = entity.PurchaseInvoiceID,
                    entity.RefNo,
                    entity.InvoiceDate,
                    entity.VendorID,
                    Children = entity.PurchaseInvoiceChildren
                                   .Select(c => new { c.PurchaseInvoiceChildID, c.ItemID, c.Quantity, c.NetPrice })
                                   .ToList()
                    };

                // 6️⃣ Write a Create action into the audit table
                await _activityLogRepository.Create(new ActivityLog
                    {
                    MenuItemId = 30,                              // code for PurchaseInvoice menu
                    ParentTableId = entity.PurchaseInvoiceID,        // link log to this invoice
                    ActionType = "Create",
                    OldData = string.Empty,
                    NewData = JsonSerializer.Serialize(logPayload),
                    UserId = currentUser,
                    Date = DateTime.Now
                    });

                // 7️⃣ Handle any uploaded attachments
                //    Assumes front-end metadata in vm.MultipleAttachments aligns by index with attachments
                for (int i = 0; i < attachments.Count; i++)
                    {
                    var formFile = attachments[i];
                    // Get the corresponding referenceno metadata
                    var metaRef = vm.MultipleAttachments.ElementAtOrDefault(i)?.Referenceno ?? "";

                    // Build the attachment entity
                    var appFile = new MultipleAttachment
                        {
                        MenuItemId = 30,
                        MenuItemName = "Purchase Invoice",
                        ParentTableId = entity.PurchaseInvoiceID,
                        FileName = formFile.FileName,
                        Referenceno = metaRef,
                        Date = DateTime.Now,
                        CreatedBy = currentUser,
                        CreatedOn = DateTime.Now,
                        IsActive = 1,
                        IsDeleted = 0
                        };
                    // Upload the file via our file service
                    await _appFilesService.Upload(appFile, formFile);
                    }

                // 8️⃣ Commit the transaction to finalize all changes
                await tx.CommitAsync();

                // 9️⃣ Return HTTP 201 Created, pointing to the newly created resource
                return CreatedAtAction(
                    nameof(GetById),
                    new { id = entity.PurchaseInvoiceID },
                    entity
                );
                }
            catch (Exception ex)
                {
                // 🔄 Roll back everything if any step fails
                await tx.RollbackAsync();
                // Return a 500 with the error message for debugging
                return StatusCode(500, $"Could not create PurchaseInvoice: {ex.Message}");
                }
            }


        // PUT /api/PurchaseInvoice/{id}
        // Updates an existing PurchaseInvoice (header, lines, attachments, and stock) in one transaction.
        [HttpPut("{id}")]
        public async Task<IActionResult> Update (
            int id,
            [FromForm] string request,             // JSON string containing the updated PurchaseInvoiceVM
            [FromForm] List<IFormFile> attachments, // New attachments to add
            [FromForm] string removeAttachmentIds   // JSON array of attachment IDs to remove
        )
            {
            // 1️⃣ Parse the incoming JSON into our view model
            var vm = JsonSerializer.Deserialize<PurchaseInvoiceVM>(request);
            if (vm == null)
                return BadRequest("Invalid payload."); // 400 if JSON cannot be parsed

            // 2️⃣ Begin a DB transaction to ensure all-or-nothing updates
            await using var tx = await _context.Database.BeginTransactionAsync();
            try
                {
                // 2.a) Identify current user for audit fields
                var currentUser = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "System";

                // 2.b) Load the existing invoice and its active children in one query
                var entity = await _context.PurchaseInvoices
                    .Include(i => i.PurchaseInvoiceChildren
                        .Where(c => c.IsActive == 1 && c.IsDeleted == 0))
                    .FirstOrDefaultAsync(i => i.PurchaseInvoiceID == id);

                if (entity == null)
                    return NotFound($"PurchaseInvoice with ID {id} not found.");

                // Track the original status for later stock adjustments or revise logs
                var originalStatus = entity.StatusId;

                // 3️⃣ Snapshot the old state for the audit log
                var oldPayload = new
                    {
                    entity.PurchaseReceiveID,
                    entity.InvoiceDate,
                    entity.VendorID,
                    entity.VendorChildID,
                    entity.PaymentTerms,
                    entity.Description,
                    entity.TotalNetAmount,
                    entity.StatusId,
                    entity.TotalQuantity,
                    entity.WarehouseID,
                    Children = entity.PurchaseInvoiceChildren
                        .Select(c => new
                            {
                            c.PurchaseInvoiceChildID,
                            c.ItemID,
                            c.Quantity,
                            c.ChildTotalQuantity,
                            c.NetPrice,
                            c.TotalPrice
                            })
                        .ToList()
                    };

                // 4️⃣ Update invoice header fields from the view model
                entity.PurchaseReceiveID = vm.PurchaseReceiveID;
                entity.InvoiceDate = vm.InvoiceDate;
                entity.VendorID = vm.VendorID;
                entity.VendorChildID = vm.VendorChildID;
                entity.PaymentTerms = vm.PaymentTerms;
                entity.Description = vm.Description;
                entity.TotalNetAmount = vm.TotalNetAmount;
                entity.StatusId = vm.StatusId;
                entity.TotalQuantity = vm.TotalQuantity;
                entity.WarehouseID = vm.WarehouseID;
                entity.ModifiedBy = currentUser;
                entity.ModifiedOn = DateTime.Now;

                // 5️⃣ Reconcile line items:
                //    a) Build a dictionary of existing child entities by ID
                var existing = entity.PurchaseInvoiceChildren
                    .ToDictionary(c => c.PurchaseInvoiceChildID!);

                //    b) Prepare a new list to hold the final set of children
                var kept = new List<PurchaseInvoiceChild>();

                //    c) Loop through incoming child VMs
                foreach (var childVm in vm.PurchaseInvoiceChildVMs)
                    {
                    if (childVm.PurchaseInvoiceChildID > 0
                        && existing.TryGetValue(childVm.PurchaseInvoiceChildID, out var childEntity))
                        {
                        // ✅ Existing child: update its properties
                        childEntity.ItemID = childVm.ItemID;
                        childEntity.UnitId = childVm.UnitId;
                        childEntity.IsSecondaryUnit = childVm.IsSecondaryUnit;
                        childEntity.ConversionFactor = childVm.ConversionFactor;
                        childEntity.Quantity = childVm.Quantity;
                        childEntity.ChildTotalQuantity = childVm.ChildTotalQuantity;
                        childEntity.NetPrice = childVm.NetPrice;
                        childEntity.TotalPrice = childVm.TotalPrice;

                        kept.Add(childEntity);
                        existing.Remove(childVm.PurchaseInvoiceChildID);
                        }
                    else
                        {
                        // ➕ New child: create and add to the kept list
                        var added = new PurchaseInvoiceChild
                            {
                            PurchaseInvoiceID = id,
                            ItemID = childVm.ItemID,
                            UnitId = childVm.UnitId,
                            IsSecondaryUnit = childVm.IsSecondaryUnit,
                            ConversionFactor = childVm.ConversionFactor,
                            Quantity = childVm.Quantity,
                            ChildTotalQuantity = childVm.ChildTotalQuantity,
                            NetPrice = childVm.NetPrice,
                            TotalPrice = childVm.TotalPrice,
                            IsActive = 1,
                            IsDeleted = 0
                            };
                        kept.Add(added);
                        }

                    // 5.d) If status just flipped to “Approve”, update stock & record transaction
                    if (vm.StatusId == Statuses.Approve && originalStatus != Statuses.Approve)
                        {
                        // i) Adjust or create ItemStock
                        var stock = await _context.ItemStocks
                            .FirstOrDefaultAsync(a => a.ItemID == childVm.ItemID && a.WarehouseID == entity.WarehouseID);
                        if (stock != null)
                            {
                            stock.Quantity += childVm.ChildTotalQuantity;
                            stock.ModifiedBy = currentUser;
                            stock.ModifiedOn = DateTime.Now;
                            _context.ItemStocks.Update(stock);
                            }
                        else
                            {
                            // No existing stock row: insert new
                            var newStock = new ItemStock
                                {
                                ItemID = childVm.ItemID,
                                WarehouseID = entity.WarehouseID,
                                Quantity = childVm.ChildTotalQuantity,
                                IsActive = 1,
                                CreatedBy = currentUser,
                                CreatedOn = DateTime.Now
                                };
                            _context.ItemStocks.Add(newStock);
                            }

                        // ii) Log the stock transaction
                        var txRecord = new StockTransaction
                            {
                            ItemID = childVm.ItemID,
                            DocumentID = entity.PurchaseInvoiceID,
                            DocumentType = "Purchases Invoice",
                            Remarks = "",
                            CreationDate = DateTime.Now,
                            Quantity = childVm.ChildTotalQuantity,
                            WarehouseID = vm.WarehouseID,
                            DocumentRefNo = entity.RefNo,
                            IsActive = 1
                            };
                        _context.StockTransactions.Add(txRecord);
                        }
                    }

                //    e) Any existing children left in the dictionary were removed by the client → soft-delete them
                foreach (var toDelete in existing.Values)
                    {
                    toDelete.IsDeleted = 1;
                    toDelete.IsActive = 0;
                    }

                //    f) Replace the entity’s children navigation property
                entity.PurchaseInvoiceChildren = kept;

                // 6️⃣ Handle attachments:
                //    a) Deserialize list of IDs to remove
                var toRemove = JsonSerializer.Deserialize<List<int>>(removeAttachmentIds) ?? new List<int>();
                //    b) Upload any new attachments
                for (int i = 0; i < attachments.Count; i++)
                    {
                    var f = attachments[i];
                    var metaRef = vm.MultipleAttachments.ElementAtOrDefault(i)?.Referenceno ?? "";
                    var appFile = new MultipleAttachment
                        {
                        MenuItemId = 30,
                        MenuItemName = "Purchase Invoice",
                        ParentTableId = id,
                        FileName = f.FileName,
                        Referenceno = metaRef,
                        Date = DateTime.Now,
                        CreatedBy = currentUser,
                        CreatedOn = DateTime.Now,
                        IsActive = 1,
                        IsDeleted = 0
                        };
                    await _appFilesService.Upload(appFile, f);
                    }
                //    c) Remove any attachments marked for deletion
                if (toRemove.Any())
                    await _appFilesService.RemoveSpecificAttachmentsAsync(30, id, toRemove);

                // 7️⃣ Persist all changes (invoice, children, stock, transactions)
                await _context.SaveChangesAsync();

                // 7.a) Build new payload for logging
                var newPayload = new
                    {
                    Invoice = entity,
                    Children = entity.PurchaseInvoiceChildren
                        .Select(c => new {
                            c.PurchaseInvoiceChildID,
                            c.ItemID,
                            c.Quantity,
                            c.ChildTotalQuantity,
                            c.NetPrice,
                            c.TotalPrice
                            }).ToList()
                    };

                // 7.b) Write an Update action into the activity log
                await _activityLogRepository.Create(new ActivityLog
                    {
                    MenuItemId = 30,
                    ParentTableId = id,
                    ActionType = "Update",
                    OldData = JsonSerializer.Serialize(oldPayload),
                    NewData = JsonSerializer.Serialize(newPayload),
                    UserId = currentUser,
                    Date = DateTime.Now
                    });

                // 7.c) If original status was already Approved, also write a Revise log
                if (originalStatus == Statuses.Approve)
                    {
                    await _reviseLogRepository.Create(new Reviselog
                        {
                        MenuItemId = 30,
                        ParentTableId = id,
                        ActionType = "Revise",
                        OldData = JsonSerializer.Serialize(oldPayload),
                        NewData = JsonSerializer.Serialize(newPayload),
                        UserId = currentUser,
                        Date = DateTime.Now
                        });
                    }

                // 8️⃣ Commit the transaction now that everything succeeded
                await tx.CommitAsync();

                // 9️⃣ Return HTTP 204 No Content (updated successfully)
                return NoContent();
                }
            catch (Exception ex)
                {
                // 🔄 On error, roll everything back
                await tx.RollbackAsync();
                return StatusCode(500, $"Could not update PurchaseInvoice: {ex.Message}");
                }
            }




        // GET /api/PurchaseInvoice/get-conversionfactor?ItemtId={id}&UnitId={unitId}&IsSecondaryUnit={true|false}
        // Returns the conversion factor if the requested unit is the secondary unit for the given item.
        [HttpGet("get-conversionfactor")]
        public async Task<IActionResult> GetItemConversionFactor ( [FromQuery] ConversionFactorDTO conversionFactorDTO )
            {
            try
                {
                // 1️⃣ If client indicates this is not a secondary-unit lookup, bail out early.
                //    Primary unit implies no conversion is necessary.
                if (!conversionFactorDTO.IsSecondaryUnit)
                    {
                    return NotFound("Item has no conversion factor for the primary unit.");
                    }

                // 2️⃣ Query the Items table for the matching ItemId and SecondaryUnitID,
                //    only active, non-deleted records.
                //    Returns the numeric ConversionFactor.
                var items = await _context.Items
                    .Where(a =>
                        a.ItemId == conversionFactorDTO.ItemtId &&    // match the item
                        a.SecondaryUnitID == conversionFactorDTO.UnitId &&     // match the secondary unit
                        a.IsActive == 1 &&                              // ensure active record
                        a.IsDeleted == 0                                 // ensure not deleted
                    )
                    .Select(c => new
                        {
                        c.ConversionFactor   // project only the value we need
                        })
                    .ToListAsync();  // execute query

                // 3️⃣ Return HTTP 200 OK and the list of conversion factors (usually a single element).
                return Ok(items);
                }
            catch (Exception ex)
                {
                // 💥 If anything goes wrong, return HTTP 500 with the exception message.
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }

        // GET /api/PurchaseInvoice/get-items
        // Retrieves a list of all active, non-deleted items for selection lists.
        //[HttpGet("get-items")]
        //public async Task<IActionResult> GetAllItems ( )
        //    {
        //    try
        //        {
        //        // 1️⃣ Query the Items table:
        //        //    • a.IsActive == 1: only include items marked active
        //        //    • a.IsDeleted == 0: exclude soft-deleted items
        //        var items = await _context.Items
        //            .Where(a => a.IsActive == 1 && a.IsDeleted == 0)
        //             // 2️⃣ Project into an anonymous type with only the fields the UI needs:
        //             .Select(c => new { ItemId = c.ItemId, ItemName = c.ItemName + " - " + c.ItemCode })
        //            .ToListAsync();  // Execute the query and load into a list

        //        // 3️⃣ Return HTTP 200 OK with the resulting item list
        //        return Ok(items);
        //        }
        //    catch (Exception ex)
        //        {
        //        // 💥 If any exception occurs (e.g., database error),
        //        //    return HTTP 500 with the error message for easier debugging
        //        return StatusCode(500, $"Internal server error: {ex.Message}");
        //        }
        //    }

        // GET /api/PurchaseInvoice/get-PurchaseReceivedItems/{id}
        // Returns the detail lines for a specific PurchaseReceive, enriched with pricing and unit info.
        [HttpGet("get-PurchaseReceivedItems/{id}")]
        public async Task<IActionResult> GetPurchaseReceivedItems ( int id )
            {
            try
                {
                // 1️⃣ Fetch the corresponding PurchaseRequisitionOrderID from PurchaseReceives:
                //    • Only consider the record if it's active & not deleted.
                var prOrderId = await _context.PurchaseReceives
                    .Where(pr =>
                        pr.PurchaseReceiveID == id &&
                        pr.IsActive == 1 &&
                        pr.IsDeleted == 0
                    )
                    .Select(pr => pr.PurchaseRequisitionOrderID)
                    .FirstOrDefaultAsync();

                // 1.a) If no parent receive found, return 404 Not Found
                if (prOrderId == null)
                    return NotFound($"PurchaseReceive {id} not found.");

                // 2️⃣ Query child lines for this receive:
                //    • Active & not deleted.
                //    • Project into an anonymous object with sub‐queries for pricing & unit names.
                var list = await _context.PurchaseReceiveChildren
                    .Where(c =>
                        c.PurchaseReceiveID == id &&
                        c.IsActive == 1 &&
                        c.IsDeleted == 0
                    )
                    .Select(c => new
                        {
                        c.PurchaseReceiveChildID,  // Line item ID
                        c.PurchaseReceiveID,       // Parent receive ID
                        c.ItemID,                  // Item being received
                        c.Quantity,                // Qty in base units
                        c.UnitId,                  // Unit ID used

                        // ▶ NetAmount: look up the unit price from the original requisition order
                        NetAmount = _context.PurchaseRequisitionOrderChildren
                            .Where(pc =>
                                pc.PurchaseRequisitionOrderID == prOrderId &&
                                pc.ItemID == c.ItemID &&
                                pc.IsActive == 1 &&
                                pc.IsDeleted == 0
                            )
                            .Select(pc => pc.UnitPrice)
                            .FirstOrDefault(),

                        // ▶ UnitName: fetch the unit’s name, append " secondary" if flagged
                        UnitName = _context.Units
                            .Where(u =>
                                u.UnitId == c.UnitId &&
                                u.IsActive == 1 &&
                                u.IsDeleted == 0
                            )
                            .Select(u => u.UnitName)
                            .FirstOrDefault()
                                  + ((c.IsSecondaryUnit ?? false) ? " secondary" : ""),

                        c.ConversionFactor,         // How many base units per this unit
                        c.IsSecondaryUnit,          // Was this a secondary unit?
                        c.ChildTotalQuantity,       // Qty in the chosen unit

                        // ▶ GSTPercentage: look up the GST rate for the item
                        GSTPercentage = _context.Items
                            .Where(i =>
                                i.ItemId == c.ItemID &&
                                i.IsActive == 1 &&
                                i.IsDeleted == 0
                            )
                            .Select(i => i.GSTPercentage)
                            .FirstOrDefault()
                        })
                    .ToListAsync(); // Execute the query

                // 3️⃣ Return HTTP 200 OK with the enriched line-item list
                return Ok(list);
                }
            catch (Exception ex)
                {
                //  On error, return 500 with details for easier debugging
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }

        // GET /api/PurchaseInvoice/get-units-by-item/{id}
        // Returns the primary and (if present) secondary units for a given item.
        [HttpGet("get-units-by-item/{id}")]
        public async Task<IActionResult> GetUnitsByItem ( int id )
            {
            try
                {
                // 1️⃣ Load the item record by its ID (includes primary and secondary unit IDs).
                var item = await _context.Items
                    .FirstOrDefaultAsync(i => i.ItemId == id);

                // 1.a) If the item doesn't exist or was soft-deleted, return 404 Not Found.
                if (item == null)
                    return NotFound($"Item with id {id} not found.");

                // 2️⃣ Prepare a list to accumulate unit details (DTOs) to return.
                var units = new List<UnitDTO>();
                int indexCounter = 1;  // We'll use this to keep units in a predictable order.

                // 3️⃣ If the item has a primary UnitId defined, fetch and include it.
                if (item.UnitId.HasValue && item.UnitId.Value > 0)
                    {
                    // Lookup the unit's display name from the Units table
                    var primaryUnitName = await _context.Units
                        .Where(u => u.UnitId == item.UnitId.Value && u.IsActive == 1 && u.IsDeleted == 0)
                        .Select(u => u.UnitName)
                        .FirstOrDefaultAsync();

                    units.Add(new UnitDTO
                        {
                        index = indexCounter++,             // assign current index, then increment
                        UnitId = item.UnitId.Value,         // the primary unit's ID
                        UnitName = primaryUnitName,         // human-readable name
                        IsSecondaryUnit = false             // mark as primary
                        });
                    }

                // 4️⃣ If the item also has a SecondaryUnitID, fetch and include that too.
                if (item.SecondaryUnitID.HasValue && item.SecondaryUnitID.Value > 0)
                    {
                    // Lookup the secondary unit's name
                    var secondaryUnitName = await _context.Units
                        .Where(u => u.UnitId == item.SecondaryUnitID.Value && u.IsActive == 1 && u.IsDeleted == 0)
                        .Select(u => u.UnitName)
                        .FirstOrDefaultAsync();

                    units.Add(new UnitDTO
                        {
                        index = indexCounter++,              // next index in sequence
                        UnitId = item.SecondaryUnitID.Value, // the secondary unit's ID
                        UnitName = secondaryUnitName,        // human-readable name
                        IsSecondaryUnit = true               // mark as secondary
                        });
                    }

                // 5️⃣ Return HTTP 200 OK with the assembled list of UnitDTOs
                return Ok(units);
                }
            catch (Exception ex)
                {
                // 💥 On unexpected errors, return HTTP 500 with the exception message
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }

        // GET /api/PurchaseInvoice/get-all-PurchasesInvoices
        // Returns a list of all active PurchaseInvoices with vendor and status names, plus an index for ordering.
        [HttpGet("get-all-PurchasesInvoices")]
        public async Task<IActionResult> GetAllPurchasesInvoices ( )
            {
            try
                {
                // 1️⃣ Query all active, non-deleted PurchaseInvoice records
                var paymentReceiveds = await _context.PurchaseInvoices
                    .Where(a => a.IsActive == 1 && a.IsDeleted == 0)
                    // 2️⃣ Project into an anonymous type containing only the needed fields
                    .Select(p => new
                        {
                        p.PurchaseInvoiceID,                  // Primary key
                        p.RefNo,                              // Invoice reference number
                        p.InvoiceDate,                        // Date of invoice
                        p.TotalQuantity,                      // Total quantity invoiced
                        p.TotalNetAmount,                     // Total net amount
                                                              // ▶ Lookup the vendor name from Vendors table
                        VendorName = _context.Vendors
                            .Where(u => u.VendorID == p.VendorID)
                            .Select(u => u.VendorName)
                            .FirstOrDefault(),
                        p.StatusId,                           // Status ID (e.g. Pending, Approved)
                                                              // ▶ Lookup the human-readable status name
                        StatusName = _context.Statuses
                            .Where(s => s.StatusId == p.StatusId)
                            .Select(s => s.StatusName)
                            .FirstOrDefault()
                        })
                    .ToListAsync(); // Execute the query and load results

                // 3️⃣ Add a 1-based index for UI display
                var indexedPaymentReceiveds = paymentReceiveds
                    .Select(( pr, index ) => new
                        {
                        Index = index + 1,                   // 1-based row number
                        pr.PurchaseInvoiceID,
                        pr.RefNo,
                        pr.InvoiceDate,
                        pr.TotalQuantity,
                        pr.TotalNetAmount,
                        pr.VendorName,
                        pr.StatusId,
                        pr.StatusName
                        })
                    .ToList();

                // 4️⃣ Return HTTP 200 OK with the indexed list
                return Ok(indexedPaymentReceiveds);
                }
            catch (Exception ex)
                {
                // 💥 On exception, return HTTP 500 with error details
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }

        // GET /api/PurchaseInvoice/detail-get-by/{id}
        // Retrieves a detailed view of a single PurchaseInvoice, including vendor/warehouse names,
        // line items (with item names & unit names), and any file attachments.
        [HttpGet("detail-get-by/{id}")]
        public async Task<IActionResult> DetailById ( int id )
            {
            // 1️⃣ Fetch the PurchaseInvoice header + its children in one query:
            //    • Filter by ID, active flag, and not-deleted flag.
            //    • Include the PurchaseInvoiceChildren navigation property for eager loading.
            var invoice = await _context.PurchaseInvoices
                .Where(i =>
                    i.PurchaseInvoiceID == id &&
                    i.IsActive == 1 &&
                    i.IsDeleted == 0
                )
                .Include(i => i.PurchaseInvoiceChildren)

                // 2️⃣ Project the result into an anonymous object for return:
                .Select(i => new
                    {
                    // ---- Header fields ----
                    PurchaseInvoiceID = i.PurchaseInvoiceID,         // Primary key
                    PurchaseReceiveID = i.PurchaseReceiveID,         // Linked receive order
                    RefNo = i.RefNo,                     // Invoice reference number
                    InvoiceDate = i.InvoiceDate,               // Date of the invoice
                    VendorID = i.VendorID,                  // Vendor FK
                                                            // ▶ Lookup vendor name from Vendors table
                    VendorName = _context.Vendors
                                          .Where(v => v.VendorID == i.VendorID)
                                          .Select(v => v.VendorName)
                                          .FirstOrDefault(),
                    // ▶ Lookup warehouse name from Warehouses table
                    WarehouseName = _context.Warehouses
                                          .Where(w => w.WarehouseID == i.WarehouseID)
                                          .Select(w => w.WarehouseName)
                                          .FirstOrDefault(),
                    PaymentTerms = i.PaymentTerms,               // Payment terms text
                    Description = i.Description,                // Any description
                    TotalNetAmount = i.TotalNetAmount,             // Invoice total
                    StatusId = i.StatusId,                   // Numeric status code
                    TotalQuantity = i.TotalQuantity,              // Sum of quantities

                    // ---- Line items ----
                    PurchaseInvoiceChildVMs = i.PurchaseInvoiceChildren
                        .Where(c =>
                            c.IsActive == 1 &&   // Only include active lines
                            c.IsDeleted == 0      // Exclude soft-deleted
                        )
                        .Select(c => new
                            {
                            c.PurchaseInvoiceChildID,               // Line item PK
                            c.PurchaseInvoiceID,                    // FK back to invoice
                            ItemID = c.ItemID,              // Item FK
                                                            // ▶ Lookup the human-readable item name
                            ItemName = _context.Items
                                .Where(it => it.ItemId == c.ItemID)
                               .Select(it => it.ItemName + ' ' + '(' + it.ItemCode + ')')
                                .FirstOrDefault(),
                            UnitId = c.UnitId,              // Unit FK
                                                            // ▶ Unit name + " secondary" suffix if flagged
                            UnitName = _context.Units
                                .Where(u => u.UnitId == c.UnitId)
                                .Select(u => u.UnitName)
                                .FirstOrDefault()
                                + ((c.IsSecondaryUnit ?? false) ? " secondary" : ""),
                            IsSecondaryUnit = c.IsSecondaryUnit,  // Boolean flag
                            ConversionFactor = c.ConversionFactor, // How many base units
                            Quantity = c.Quantity,         // Quantity in chosen unit
                            ChildTotalQuantity = c.ChildTotalQuantity, // Quantity in base units
                            NetPrice = c.NetPrice,         // Price per unit
                            TotalPrice = c.TotalPrice        // NetPrice * Quantity
                            })
                        .ToList(),

                    // ---- Attachments ----
                    MultipleAttachments = _context.Multipleattachments
                        .Where(m =>
                            m.MenuItemId == 30 &&               // 30 = PurchaseInvoice menu
                            m.ParentTableId == i.PurchaseInvoiceID && // Link by invoice ID
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
                    })
                .FirstOrDefaultAsync(); // Execute query and get single result or null

            // 3️⃣ If nothing was found, return 404 Not Found
            if (invoice == null)
                return NotFound($"PurchaseInvoice with ID {id} not found.");

            // 4️⃣ Otherwise, return HTTP 200 OK with the detailed invoice object
            return Ok(invoice);
            }

        // PUT /api/PurchaseInvoice/changestatusPurchasesInvoice/{id}
        // Voids an existing PurchaseInvoice by reversing its stock transactions.
        [HttpPut("changestatusPurchasesInvoice/{id}")]
        public async Task<IActionResult> ChangeStatusPurchasesInvoice ( int id )
            {
            // 1️⃣ Identify the user performing this action (for auditing).
            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "Unknown";

            // 2️⃣ Start an explicit DB transaction so we can roll back on any failure.
            await using var transaction = await _context.Database.BeginTransactionAsync();
            try
                {
                // 3️⃣ Load the target invoice and its line items.
                var purchase = await _context.PurchaseInvoices
                    .Include(c => c.PurchaseInvoiceChildren)
                    .FirstOrDefaultAsync(c =>
                        c.PurchaseInvoiceID == id &&
                        c.IsActive == 1 &&
                        c.IsDeleted == 0);

                // 4️⃣ If the invoice doesn't exist, return 404 immediately.
                if (purchase == null)
                    return NotFound("Purchase Invoice not found");

                // 5️⃣ For each line item, reverse its original stock addition:
                foreach (var child in purchase.PurchaseInvoiceChildren)
                    {
                    // a) Find the original stock transaction for this invoice/line
                    var prevStock = await _context.StockTransactions
                        .FirstOrDefaultAsync(st =>
                            st.DocumentID == purchase.PurchaseInvoiceID &&
                            st.DocumentType == "Purchases Invoice" &&
                            st.ItemID == child.ItemID &&
                            st.IsVoid == 0 &&               // only non-voided
                            st.DocumentRefNo == purchase.RefNo);

                    // b) Load the current ItemStock record for this item & warehouse
                    var itemStock = await _context.ItemStocks
                        .FirstOrDefaultAsync(it =>
                            it.ItemID == child.ItemID &&
                            it.WarehouseID == purchase.WarehouseID);

                    // c) Determine how many units we need to subtract
                    var delta = prevStock?.Quantity.GetValueOrDefault() ?? 0;

                    // d) If there's no stock record or not enough on hand, abort:
                    if (itemStock == null || itemStock.Quantity < delta)
                        {
                        // Fetch human-friendly names for the response
                        var itemName = await _context.Items
                            .Where(i => i.ItemId == child.ItemID)
                            .Select(i => i.ItemName)
                            .FirstOrDefaultAsync();
                        var warehouseName = await _context.Warehouses
                            .Where(w => w.WarehouseID == purchase.WarehouseID)
                            .Select(w => w.WarehouseName)
                            .FirstOrDefaultAsync();

                        // Roll back all interim changes
                        await transaction.RollbackAsync();

                        // Return 403 Forbidden with structured details
                        return StatusCode(
                            StatusCodes.Status403Forbidden,
                            new
                                {
                                message = "Insufficient stock",
                                ItemName = itemName,
                                WarehouseName = warehouseName,
                                AvailableQuantity = itemStock?.Quantity ?? 0
                                }
                        );
                        }

                    // e) Otherwise, decrement the on-hand quantity
                    itemStock.Quantity -= delta;
                    itemStock.ModifiedBy = currentUserId;
                    itemStock.ModifiedOn = DateTime.Now;
                    _context.ItemStocks.Update(itemStock);

                    // f) Record a void transaction entry (negative quantity)
                    _context.StockTransactions.Add(new StockTransaction
                        {
                        ItemID = child.ItemID,
                        DocumentID = purchase.PurchaseInvoiceID,
                        DocumentType = "Purchases Invoice",
                        Remarks = "Is Void",
                        CreationDate = DateTime.Now,
                        Quantity = -delta,                 // reverse
                        WarehouseID = purchase.WarehouseID,
                        IsActive = 1,
                        IsVoid = 1,                      // mark as void
                        DocumentRefNo = purchase.RefNo
                        });
                    }

                // 6️⃣ All lines reversed successfully → mark the invoice’s status as “Void”
                purchase.StatusId = Statuses.Void;
                _context.PurchaseInvoices.Update(purchase);

                // 7️⃣ Persist all updates and commit transaction
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                // 8️⃣ Return success
                return Ok("Purchase invoice voided successfully");
                }
            catch (Exception ex)
                {
                // 🔄 On any unexpected error, roll everything back and return 500
                await transaction.RollbackAsync();
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }


        // GET /api/PurchaseInvoice/activity_log/PurchaseInvoice/{id}
        // Retrieves the audit trail for a specific PurchaseInvoice (menu code = 30).
        [HttpGet("activity_log/PurchaseInvoice/{id}")]
        public async Task<IActionResult> GetActivityLogsForPurchaseInvoice ( int id )
            {
            try
                {
                // 1️⃣ Start with the ActivityLogs table, filtering only entries for PurchaseInvoice (MenuItemId = 30)
                var logs = await _context.ActivityLogs
                    .Where(a => a.MenuItemId == 30)

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

                    // 3️⃣ LEFT JOIN to PurchaseInvoices to link each log back to its invoice
                    .GroupJoin(
                        _context.PurchaseInvoices,
                        temp => temp.log.ParentTableId,          // ParentTableId holds PurchaseInvoiceID
                        inv => inv.PurchaseInvoiceID,          // primary key in PurchaseInvoices
                        ( temp, invoices ) => new { temp.log, temp.user, invoices }
                    )
                    .SelectMany(
                        temp => temp.invoices.DefaultIfEmpty(),  // preserve logs even if invoice record is missing
                        ( temp, invoice ) => new { temp.log, temp.user, invoice }
                    )

                    // 4️⃣ Filter to only the logs related to the requested invoice ID
                    .Where(x => x.invoice != null && x.invoice.PurchaseInvoiceID == id)

                    // 5️⃣ Project the combined data into a simple DTO for the client
                    .Select(x => new
                        {
                        x.log.ActionType,                        // e.g. "Create", "Update", "Approve"
                        x.log.OldData,                           // serialized JSON of previous state
                        x.log.NewData,                           // serialized JSON of new state
                        PurchasePriceRefNumber = x.invoice.RefNo, // invoice reference number for display
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

        // GET /api/PurchaseInvoice/get-warehouse
        // Returns a list of all active, non-deleted warehouses for dropdowns or lookups.
        [HttpGet("get-warehouse")]
        public async Task<IActionResult> GetAllWarehouses ( )
            {
            try
                {
                // 1️⃣ Query the Warehouses table:
                //    • a.IsActive == 1  → include only active records
                //    • a.IsDeleted == 0 → exclude soft-deleted records
                var warehouses = await _context.Warehouses
                    .Where(a => a.IsActive == 1 && a.IsDeleted == 0)

                    // 2️⃣ Project into an anonymous type with only the fields needed by the client:
                    .Select(c => new
                        {
                        c.WarehouseID,    // primary key
                        c.WarehouseName   // human-readable name
                        })
                    .ToListAsync();     // execute the query and materialize the list

                // 3️⃣ Return HTTP 200 OK with the resulting list of warehouses
                return Ok(warehouses);
                }
            catch (Exception ex)
                {
                // 💥 If any exception occurs (e.g., database error), return HTTP 500
                //    with the error message for easier debugging by the client.
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }


        // GET /api/PurchaseInvoice/GetPurchasesInvoiceReportSP/{id}
        // Executes the stored procedure SP_GetPurchasesInvoiceReport to fetch
        // both header and line-item details in one round-trip.
        [HttpGet("GetPurchasesInvoiceReportSP/{id}")]
        public async Task<IActionResult> GetPurchasesInvoiceReportSP ( int id )
            {
            try
                {
                // 1️⃣ Obtain the raw ADO.NET connection from EF Core
                var conn = _context.Database.GetDbConnection();

                // 2️⃣ Create a MySqlCommand for the stored procedure
                await using var cmd = conn.CreateCommand();
                cmd.CommandText = "SP_GetPurchasesInvoiceReport";
                cmd.CommandType = CommandType.StoredProcedure;

                // 3️⃣ Add the input parameter for the SP
                cmd.Parameters.Add(new MySqlParameter("p_PurchasesInvoiceID", MySqlDbType.Int32)
                    {
                    Direction = ParameterDirection.Input,
                    Value = id
                    });

                // 4️⃣ Ensure the connection is open
                if (conn.State != ConnectionState.Open)
                    await conn.OpenAsync();

                // 5️⃣ Execute the SP and get a data reader
                await using var reader = await cmd.ExecuteReaderAsync();

                // 6️⃣ Read the first result set: header row (invoice summary)
                PurchaseInvoiceDto invoice = null;
                if (await reader.ReadAsync())
                    {
                    // Map the columns of the header row into our DTO
                    invoice = new PurchaseInvoiceDto
                        {
                        PurchaseInvoiceID = Convert.ToInt32(reader["PurchaseInvoiceID"]),
                        RefNo = reader["RefNo"].ToString(),
                        InvoiceDate = reader["InvoiceDate"] as DateTime?,
                        VendorName = reader["VendorName"].ToString(),
                        Address = reader["Address"].ToString(),
                        QuantityCTN = Convert.ToDecimal(reader["QuantityCTN"]),
                        QuantityPCS = Convert.ToDecimal(reader["QuantityPCS"]),
                        TotalQtyPCS = Convert.ToDecimal(reader["TotalQtyPCS"]),
                        Items = new List<PurchaseInvoiceItemDto>()  // prepare list for details
                        };
                    }
                else
                    {
                    // No header row returned → invoice not found
                    return NotFound();
                    }

                // 7️⃣ Move to the second result set: line‐item rows
                if (await reader.NextResultAsync())
                    {
                    while (await reader.ReadAsync())
                        {
                        // For each detail row, map into PurchaseInvoiceItemDto and add to the list
                        invoice.Items.Add(new PurchaseInvoiceItemDto
                            {
                            ItemID = Convert.ToInt32(reader["ItemID"]),
                            BrandName = reader["BrandName"].ToString(),
                            ItemName = reader["ItemName"].ToString(),
                            PackingPCSperCTN = Convert.ToInt32(reader["PackingPCSperCTN"]),
                            QuantityCTN = Convert.ToDecimal(reader["QuantityCTN"]),
                            QuantityPCS = Convert.ToDecimal(reader["QuantityPCS"]),
                            TotalQtyPCS = Convert.ToDecimal(reader["TotalQtyPCS"]),
                            GSTPercentage = reader["GSTPercentage"] as decimal?,
                            NetPrice = reader["NetPrice"] as decimal?,
                            TotalPrice = reader["TotalPrice"] as decimal?
                            });
                        }
                    }

                // 8️⃣ Return the assembled DTO (header + items) with HTTP 200 OK
                return Ok(invoice);
                }
            catch (Exception ex)
                {
                // 🔄 On error, log or handle as needed, then return generic 500
                // TODO: Replace Console.WriteLine with ILogger injection as best practice
                Console.WriteLine($"SP report error: {ex}");
                return StatusCode(500, "An error occurred while retrieving the purchase invoice.");
                }
            }
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

        }
    }


