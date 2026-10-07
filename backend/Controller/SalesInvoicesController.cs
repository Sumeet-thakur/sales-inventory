using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using SalesInventoryAPI.Data;
using SalesInventoryAPI.Data.Services;
using SalesInventoryAPI.Data.ViewModels;
using SalesInventoryAPI.Models;
using static SalesInventoryAPI.Models.AppConstants;
using System.Net.Mime;
using System.Text.Json;
using System.Net.Mail;
using Org.BouncyCastle.Asn1.Ocsp;
using MySqlConnector;
using System.Data;
using SalesInventoryAPI.Data.DTOs;
using Microsoft.AspNetCore.Authorization;

namespace SalesInventoryAPI.Controller
    {
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class SalesInvoicesController : ControllerBase
        {
        private readonly InventoryDbContext _context;
        private readonly PermissionService _permissionService;
        private readonly ActivityLogRepository _activityLogRepository;
        private readonly ReviseLogRepository _reviseLogRepository;
        private readonly CodeGenerator _codeGenerator;
        private readonly AppFilesService _appFilesService;

        public SalesInvoicesController (
            InventoryDbContext context,
            PermissionService permissionService,
            ActivityLogRepository activityLogRepository,
            ReviseLogRepository reviseLogRepository,
            CodeGenerator codeGenerator,
            AppFilesService appFilesService )
            {
            _context = context;
            _permissionService = permissionService;
            _activityLogRepository = activityLogRepository;
            _reviseLogRepository = reviseLogRepository;
            _codeGenerator = codeGenerator;
            _appFilesService = appFilesService;
            }

        [HttpPost("Create")]
        public async Task<IActionResult> Create (
    [FromForm] string request,
    [FromForm] List<IFormFile> attachments )
            {
            var _request = JsonSerializer.Deserialize<SalesInvoiceRequest>(request);
            if (_request == null) return BadRequest("Invalid payload.");


            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "Unknown";

            await using var transaction = await _context.Database.BeginTransactionAsync();
            try
                {
                // 1) Map parent
                var invoice = new SalesInvoice
                    {
                    SalesRequisitionID = _request.SalesRequisitionID,
                    RefNo = _request.RefNo,
                    InvoiceDate = _request.InvoiceDate,
                    CustomerID = _request.CustomerID,
                    CustomerChildID = _request.CustomerChildID,
                    SellerID = _request.SellerID,
                    PONumber = _request.PONumber,
                    PODate = _request.PODate,
                    PaymentTerms = _request.PaymentTerms,
                    Description = _request.Description,
                    TotalAmount = _request.TotalAmount,
                    TaxAmount = _request.TaxAmount,
                    NetAmount = _request.NetAmount,
                    PaidAmount = _request.PaidAmount,
                    OutstandingAmount = _request.OutstandingAmount,
                    PaymentStatus = _request.PaymentStatus,
                    TotalQuantity = _request.TotalQuantity,
                    CreatedBy = currentUserId,
                    CreatedOn = DateTime.Now,
                    WareHouseId = _request.WareHouseId,
                    IsActive = 1,
                    IsDeleted = 0,
                    StatusId = 1,
                    InvoiceStatusId = 0
                    };

                // 2) Map children (note the SalesInvoiceID assignment)
                foreach (var childReq in _request.SalesInvoiceChildRequests)
                    {
                    invoice.SalesInvoiceChildren.Add(new SalesInvoiceChild
                        {
                        SalesInvoiceID = invoice.SalesInvoiceID,    // ← parent FK
                        ItemID = childReq.ItemID,
                        Quantity = childReq.Quantity,
                        UnitPrice = childReq.UnitPrice,
                        Tax = childReq.Tax,
                        TotalPrice = childReq.TotalPrice,
                        NetPrice = childReq.NetPrice,
                        UnitId = childReq.UnitId,
                        ChildTotalQuantity = childReq.ChildTotalQuantity,
                        ConversionFactor = childReq.ConversionFactor,
                        IsSecondaryUnit = childReq.IsSecondaryUnit,
                        IsActive = 1,
                        IsDeleted = 0
                        });
                    }

                // 3) Persist all
                _context.SalesInvoices.Add(invoice);
                await _context.SaveChangesAsync();

                // 4) Log activity (unchanged)
                var childrenLog = invoice.SalesInvoiceChildren
                    .Select(c => new
                        {
                        c.SalesInvoiceChildID,
                        c.ItemID,
                        c.Quantity,
                        c.UnitId,
                        c.UnitPrice,
                        c.Tax
                        })
                    .ToList();

                var logPayload = new
                    {
                    invoice.SalesInvoiceID,
                    invoice.RefNo,
                    invoice.InvoiceDate,
                    invoice.TotalAmount,
                    invoice.Description,
                    Children = childrenLog
                    };

                await _activityLogRepository.Create(new ActivityLog
                    {
                    MenuItemId = 25,
                    ParentTableId = invoice.SalesInvoiceID,
                    ActionType = "Create",
                    OldData = string.Empty,
                    NewData = System.Text.Json.JsonSerializer.Serialize(logPayload),
                    UserId = currentUserId,
                    Date = DateTime.Now
                    });

                foreach (var formFile in attachments)
                    {
                    // match metadata by index (ensure front-end appends in same order)
                    var metaRef = _request.MultipleAttachments.ElementAtOrDefault(attachments.IndexOf(formFile))?.Referenceno ?? "";

                    var appFile = new MultipleAttachment
                        {
                        MenuItemId = 25,
                        MenuItemName = "Sales Invoice",
                        ParentTableId = invoice.SalesInvoiceID,
                        FileName = formFile.FileName,
                        Referenceno = metaRef,
                        Date = DateTime.Now,
                        CreatedBy = currentUserId,
                        CreatedOn = DateTime.Now,
                        IsActive = 1,
                        IsDeleted = 0
                        };
                    await _appFilesService.Upload(appFile, formFile);
                    }

                await transaction.CommitAsync();
                return Ok(invoice);
                }
            catch (Exception ex)
                {
                await transaction.RollbackAsync();
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }

        // Sample GET for CreatedAtAction or client retrieval
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById ( int id )
            {
            // 1) Pull invoice + its non‑deleted children into memory
            var vm = await _context.SalesInvoices
                .Where(i => i.SalesInvoiceID == id && i.IsDeleted == 0)
                .Select(i => new
                    {
                    Parent = i,
                    Children = i.SalesInvoiceChildren
                        .Where(c => c.IsDeleted == 0)
                        .Select(c => new
                            {
                            c.SalesInvoiceChildID,
                            c.SalesInvoiceID,
                            c.ItemID,
                            c.Quantity,
                            c.UnitPrice,
                            c.Tax,
                            c.TotalPrice,
                            c.NetPrice,
                            c.UnitId,
                            c.ChildTotalQuantity,
                            c.ConversionFactor,
                            c.IsSecondaryUnit
                            })
                        .ToList()
                    })
                .FirstOrDefaultAsync();

            if (vm == null)
                return NotFound();

            var attachments = await _context.Multipleattachments
     .Where(m =>
         m.MenuItemId == 25 &&
         m.ParentTableId == id &&
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

            // 2) Map into your VM, appending UnitName + " secondary" suffix
            var result = new SalesInvoiceVM
                {
                SalesInvoiceID = vm.Parent.SalesInvoiceID,
                SalesRequisitionID = vm.Parent.SalesRequisitionID,
                RefNo = vm.Parent.RefNo,
                InvoiceDate = vm.Parent.InvoiceDate,
                CustomerID = vm.Parent.CustomerID,
                CustomerChildID = vm.Parent.CustomerChildID,
                SellerID = vm.Parent.SellerID,
                WareHouseId = vm.Parent.WareHouseId,
                PONumber = vm.Parent.PONumber,
                PODate = vm.Parent.PODate,
                PaymentTerms = vm.Parent.PaymentTerms,
                Description = vm.Parent.Description,
                TotalAmount = vm.Parent.TotalAmount,
                TaxAmount = vm.Parent.TaxAmount,
                NetAmount = vm.Parent.NetAmount,
                PaidAmount = vm.Parent.PaidAmount,
                OutstandingAmount = vm.Parent.OutstandingAmount,
                PaymentStatus = vm.Parent.PaymentStatus,
                PaymentStatusId = vm.Parent.PaymentStatusId,
                TotalQuantity = vm.Parent.TotalQuantity,
                StatusId = vm.Parent.StatusId,
                InvoiceStatusId = vm.Parent.InvoiceStatusId,

                SalesInvoiceChildVMs = vm.Children
                    .Select(c => new SalesInvoiceChildVM
                        {
                        SalesInvoiceChildID = c.SalesInvoiceChildID,
                        SalesInvoiceID = c.SalesInvoiceID,
                        ItemID = c.ItemID,
                        Quantity = c.Quantity,
                        UnitPrice = c.UnitPrice,
                        Tax = c.Tax,
                        TotalPrice = c.TotalPrice,
                        NetPrice = c.NetPrice,
                        UnitId = c.UnitId,
                        ChildTotalQuantity = c.ChildTotalQuantity,
                        ConversionFactor = c.ConversionFactor,
                        IsSecondaryUnit = c.IsSecondaryUnit,
                        UnitName = _context.Units.Where(u => u.UnitId == c.UnitId).Select(u => u.UnitName).FirstOrDefault() + ((c.IsSecondaryUnit ?? false) ? " secondary" : ""),
                        ItemStockQuantity = _context.ItemStocks.Where(s => s.ItemID == c.ItemID && s.WarehouseID== vm.Parent.WareHouseId).Select(s => s.Quantity).FirstOrDefault() ?? 0,
                        GSTPercentage = _context.Items
                            .Where(i => i.ItemId == c.ItemID)
                            .Select(i => i.GSTPercentage)
                            .FirstOrDefault(),
                        })
                    .ToList(),

                RemovedSalesInvoiceChildIds = null,
                MultipleAttachments = attachments
                };

            return Ok(result);
            }

        // GET /api/SalesInvoices/detailsalesinvoice/{id}
        // Retrieves a detailed view of a specific SalesInvoice, including customer, seller,
        // warehouse, line items, and file attachments.
        [HttpGet("detailsalesinvoice/{id}")]
        public async Task<IActionResult> DetailsalesinvoicebyId ( int id )
            {
            // 1️⃣ Query the SalesInvoices table for an active (non-deleted) invoice by ID
            var vm = await _context.SalesInvoices
                .Where(i =>
                    i.SalesInvoiceID == id &&  // match the requested invoice ID
                    i.IsDeleted == 0       // exclude soft-deleted records
                )
                // 2️⃣ Project into an anonymous DTO with required fields and lookups:
                .Select(i => new
                    {
                    // --- Invoice header details ---
                    i.SalesInvoiceID,
                    i.SalesRequisitionID,
                    i.RefNo,
                    i.InvoiceDate,
                    i.CustomerID,
                    // ▶ Lookup the customer's display name
                    CustomerName = _context.Customers
                        .Where(c => c.CustomerId == i.CustomerID)
                        .Select(c => c.CustomerName)
                        .FirstOrDefault(),
                    i.CustomerChildID,
                    i.SellerID,
                    // ▶ Lookup the seller's name
                    SellerName = _context.Sellers
                        .Where(s => s.SellerId == i.SellerID)
                        .Select(s => s.SellerName)
                        .FirstOrDefault(),
                    // ▶ Lookup the warehouse name
                    WarehouseName = _context.Warehouses
                        .Where(w => w.WarehouseID == i.WareHouseId)
                        .Select(w => w.WarehouseName)
                        .FirstOrDefault(),
                    i.PONumber,
                    i.PODate,
                    i.PaymentTerms,
                    i.Description,
                    i.TotalAmount,
                    i.TaxAmount,
                    i.NetAmount,
                    i.PaidAmount,
                    i.OutstandingAmount,
                    i.PaymentStatus,
                    i.TotalQuantity,
                    i.StatusId,
                    i.InvoiceStatusId,
                    i.PaymentStatusId,

                    // --- Line items ---
                    SalesInvoiceChildVMs = i.SalesInvoiceChildren
                        .Where(c => c.IsDeleted == 0)  // only include non-deleted lines
                        .Select(c => new
                            {
                            c.SalesInvoiceChildID,
                            c.SalesInvoiceID,
                            c.ItemID,
                            // ▶ Lookup the item name
                            ItemName = _context.Items
                                .Where(it => it.ItemId == c.ItemID)
                                .Select(it => it.ItemName + ' ' + '(' + it.ItemCode + ')')
                                .FirstOrDefault(),
                            c.Quantity,
                            c.UnitPrice,
                            c.Tax,
                            c.TotalPrice,
                            c.NetPrice,
                            c.UnitId,
                            // ▶ Lookup the unit name and append " secondary" if flagged
                            UnitName = _context.Units
                                .Where(u => u.UnitId == c.UnitId)
                                .Select(u => u.UnitName)
                                .FirstOrDefault()
                                + ((c.IsSecondaryUnit ?? false) ? " secondary" : ""),
                            c.ChildTotalQuantity,
                            c.ConversionFactor,
                            c.IsSecondaryUnit
                            })
                        .ToList(),

                    // --- File attachments ---
                    MultipleAttachments = _context.Multipleattachments
                        .Where(m =>
                            m.MenuItemId == 25 &&                  // code for SalesInvoice menu
                            m.ParentTableId == i.SalesInvoiceID &&    // link by invoice ID
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
                .FirstOrDefaultAsync();  // execute and get single result or null

            // 3️⃣ If no invoice found, return HTTP 404 Not Found
            if (vm == null)
                return NotFound();

            // 4️⃣ Otherwise, return HTTP 200 OK with the detailed invoice DTO
            return Ok(vm);
            }



        /// <summary>
        /// PUT /api/SalesInvoices/Update/{id}
        /// Updates an existing SalesInvoice, including its line items, stock adjustments if approved,
        /// file attachments, and logs all changes within a single transaction.
        /// </summary>
        [HttpPut("Update/{id}")]
        public async Task<IActionResult> Update (
            int id,
            [FromForm] string request,               // JSON payload of SalesInvoiceVM
            [FromForm] List<IFormFile> attachments,  // New attachments to upload
            [FromForm] string removeAttachmentIds    // JSON array of attachment IDs to delete
        )
            {
            // 1️⃣ Deserialize incoming JSON into view model and validate ID
            var vm = JsonSerializer.Deserialize<SalesInvoiceVM>(request);
            if (vm == null || vm.SalesInvoiceID != id)
                return BadRequest("Invalid request data.");

            // 2️⃣ Load the existing invoice and its child lines
            var invoice = await _context.SalesInvoices
                .Include(i => i.SalesInvoiceChildren)
                .FirstOrDefaultAsync(i =>
                    i.SalesInvoiceID == id &&
                    i.IsDeleted == 0
                );
            if (invoice == null)
                return NotFound($"No invoice with ID {id}");

            // 3️⃣ Capture pre-update state for audit logging
            var originalStatus = invoice.StatusId;
            var oldChildrenLog = invoice.SalesInvoiceChildren
                .Where(c => c.IsDeleted == 0)
                .Select(c => new { c.SalesInvoiceChildID, c.ItemID, c.Quantity, c.UnitId, c.UnitPrice, c.Tax })
                .ToList();
            var oldPayload = new
                {
                invoice.SalesInvoiceID,
                invoice.RefNo,
                invoice.InvoiceDate,
                invoice.TotalAmount,
                invoice.Description,
                invoice.StatusId,
                Children = oldChildrenLog
                };

            // 4️⃣ Begin transaction for atomicity
            await using var tx = await _context.Database.BeginTransactionAsync();
            var currentUser = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "System";
            try
                {
                // Deserialize IDs of attachments to remove
                var toRemove = JsonSerializer.Deserialize<List<int>>(removeAttachmentIds) ?? new List<int>();

                // 5️⃣ Update invoice header fields from the view model
                invoice.SalesRequisitionID = vm.SalesRequisitionID;
                invoice.RefNo = vm.RefNo;
                invoice.InvoiceDate = vm.InvoiceDate;
                invoice.CustomerID = vm.CustomerID;
                invoice.CustomerChildID = vm.CustomerChildID;
                invoice.SellerID = vm.SellerID;
                invoice.PONumber = vm.PONumber;
                invoice.PODate = vm.PODate;
                invoice.PaymentTerms = vm.PaymentTerms;
                invoice.Description = vm.Description;
                invoice.TotalAmount = vm.TotalAmount;
                invoice.TaxAmount = vm.TaxAmount;
                invoice.NetAmount = vm.NetAmount;
                invoice.PaidAmount = vm.PaidAmount;
                invoice.OutstandingAmount = vm.OutstandingAmount;
                invoice.PaymentStatus = vm.PaymentStatus;
                invoice.TotalQuantity = vm.TotalQuantity;
                invoice.StatusId = vm.StatusId;
                // Recalculate statuses if needed when approving
                invoice.InvoiceStatusId = vm.StatusId == Statuses.Approve ? 1 : vm.InvoiceStatusId;
                invoice.PaymentStatusId = vm.StatusId == Statuses.Approve ? 1 : vm.PaymentStatusId;
                invoice.WareHouseId = vm.WareHouseId;
                invoice.ModifiedBy = currentUser;
                invoice.ModifiedOn = DateTime.Now;

                // 6️⃣ Upsert child line items:
                foreach (var childReq in vm.SalesInvoiceChildVMs)
                    {
                    if (childReq.SalesInvoiceChildID > 0)
                        {
                        // Update existing child
                        var existing = invoice.SalesInvoiceChildren
                            .FirstOrDefault(c => c.SalesInvoiceChildID == childReq.SalesInvoiceChildID);
                        if (existing != null)
                            {
                            existing.ItemID = childReq.ItemID;
                            existing.Quantity = childReq.Quantity;
                            existing.UnitPrice = childReq.UnitPrice;
                            existing.Tax = childReq.Tax;
                            existing.TotalPrice = childReq.TotalPrice;
                            existing.NetPrice = childReq.NetPrice;
                            existing.UnitId = childReq.UnitId;
                            existing.ChildTotalQuantity = childReq.ChildTotalQuantity;
                            existing.ConversionFactor = childReq.ConversionFactor;
                            existing.IsSecondaryUnit = childReq.IsSecondaryUnit;
                            existing.IsActive = 1;
                            }
                        }
                    else
                        {
                        // Add new child record
                        invoice.SalesInvoiceChildren.Add(new SalesInvoiceChild
                            {
                            SalesInvoiceID = invoice.SalesInvoiceID,
                            ItemID = childReq.ItemID,
                            Quantity = childReq.Quantity,
                            UnitPrice = childReq.UnitPrice,
                            Tax = childReq.Tax,
                            TotalPrice = childReq.TotalPrice,
                            NetPrice = childReq.NetPrice,
                            UnitId = childReq.UnitId,
                            ChildTotalQuantity = childReq.ChildTotalQuantity,
                            ConversionFactor = childReq.ConversionFactor,
                            IsSecondaryUnit = childReq.IsSecondaryUnit,
                            IsActive = 1,
                            IsDeleted = 0
                            });
                        }
                    // 7️⃣ If this invoice is now approved (and wasn't before), subtract stock & log transaction
                    if (vm.StatusId == Statuses.Approve && originalStatus != Statuses.Approve)
                        {
                        var stock = await _context.ItemStocks
                            .FirstOrDefaultAsync(s => s.ItemID == childReq.ItemID && s.WarehouseID == invoice.WareHouseId);
                        if (stock != null)
                            {
                            stock.Quantity -= childReq.ChildTotalQuantity;
                            stock.ModifiedBy = currentUser;
                            stock.ModifiedOn = DateTime.Now;
                            _context.ItemStocks.Update(stock);
                            }
                        _context.StockTransactions.Add(new StockTransaction
                            {
                            ItemID = childReq.ItemID,
                            DocumentID = invoice.SalesInvoiceID,
                            DocumentType = "Sales Invoice",
                            CreationDate = DateTime.Now,
                            Quantity = -childReq.ChildTotalQuantity,
                            WarehouseID = vm.WareHouseId,
                            DocumentRefNo = invoice.RefNo,
                            IsActive = 1
                            });
                        }
                    }

                // 8️⃣ Persist all header, children, stock and transaction updates
                await _context.SaveChangesAsync();

                // 9️⃣ Capture the new state for audit log
                var newChildrenLog = invoice.SalesInvoiceChildren
                    .Where(c => c.IsDeleted == 0)
                    .Select(c => new { c.SalesInvoiceChildID, c.ItemID, c.Quantity, c.UnitId, c.UnitPrice, c.Tax })
                    .ToList();
                var newPayload = new
                    {
                    invoice.SalesInvoiceID,
                    invoice.RefNo,
                    invoice.InvoiceDate,
                    invoice.TotalAmount,
                    invoice.Description,
                    invoice.StatusId,
                    Children = newChildrenLog
                    };

                // 🔟 Log the update action
                await _activityLogRepository.Create(new ActivityLog
                    {
                    MenuItemId = 25,
                    ParentTableId = invoice.SalesInvoiceID,
                    ActionType = "Update",
                    OldData = JsonSerializer.Serialize(oldPayload),
                    NewData = JsonSerializer.Serialize(newPayload),
                    UserId = currentUser,
                    Date = DateTime.Now
                    });

                // 1️⃣1️⃣ Log a revision if it was previously approved
                if (originalStatus == Statuses.Approve)
                    {
                    await _reviseLogRepository.Create(new Reviselog
                        {
                        MenuItemId = 25,
                        ParentTableId = invoice.SalesInvoiceID,
                        ActionType = "Revise",
                        OldData = JsonSerializer.Serialize(oldPayload),
                        NewData = JsonSerializer.Serialize(newPayload),
                        UserId = currentUser,
                        Date = DateTime.Now
                        });
                    }

                // 1️⃣2️⃣ Handle new attachments
                for (int i = 0; i < attachments.Count; i++)
                    {
                    var file = attachments[i];
                    var metaRef = vm.MultipleAttachments.ElementAtOrDefault(i)?.Referenceno ?? string.Empty;
                    var appFile = new MultipleAttachment
                        {
                        MenuItemId = 25,
                        MenuItemName = "Sales Invoice",
                        ParentTableId = invoice.SalesInvoiceID,
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

                // 1️⃣3️⃣ Remove attachments the client marked for deletion
                if (toRemove.Any())
                    {
                    await _appFilesService.RemoveSpecificAttachmentsAsync(
                        menuItemId: 25,
                        parentTableId: id,
                        idsToRemove: toRemove
                    );
                    }

                // 1️⃣4️⃣ Commit the transaction
                await tx.CommitAsync();

                // 1️⃣5️⃣ Return HTTP 200 OK with the updated invoice entity
                return Ok(invoice);
                }
            catch (Exception ex)
                {
                // 🔄 Roll back and return HTTP 500 on error
                await tx.RollbackAsync();
                return StatusCode(500, $"Error updating invoice: {ex.Message}");
                }
            }


        // GET /api/SalesInvoices/GetNextSalesInvoiceRefNumber
        // Generates the next sequential Sales Invoice number (e.g. INV-20250001)
        // by delegating to the CodeGenerator service.
        [HttpGet("GetNextSalesInvoiceRefNumber")]
        public async Task<IActionResult> GetNextSalesInvoiceRefNumber ( )
            {
            try
                {
                // 1️⃣ Request a new reference number from CodeGenerator:
                //    • "salesinvoices" = database table name
                //    • "RefNo"         = the column to increment
                //    • "INV-2025"      = prefix for this fiscal year
                //    • 4               = numeric portion padded to 4 digits
                string ref_no = await _codeGenerator.GenerateReferenceNumber(
                    tableName: "salesinvoices",
                    columnName: "RefNo",
                    prefix: "INV-2025",
                    digits: 4
                );

                // 2️⃣ Wrap the generated code in a simple JSON object and return 200 OK:
                //    { "SalesInvoiceRefNumber": "INV-20250001" }
                return Ok(new { SalesInvoiceRefNumber = ref_no });
                }
            catch (Exception ex)
                {
                // 💥 If an error occurs (e.g., database or generator failure),
                //    log it to the console for diagnostics.
                Console.WriteLine($"Error generating sales invoice ref no: {ex.Message}");

                // 3️⃣ Return a generic 500 Internal Server Error to the client.
                return StatusCode(500, "Internal server error.");
                }
            }


        // GET /api/SalesInvoices/get-salesRequisition
        // Retrieves all approved sales requisitions that have NOT yet been converted into invoices.
        [HttpGet("get-salesRequisition")]
        public async Task<IActionResult> GetAllSalesRequisition ( )
            {
            try
                {
                // 1️⃣ Build a LINQ query against the SalesRequisitions table
                var salesRequisitions = await _context.SalesRequisitions
                    .Where(r =>
                        r.IsActive == 1 &&                // only include active records
                        r.IsDeleted == 0 &&                // exclude soft-deleted ones
                        r.StatusId == Statuses.Approve && // only those that have been approved
                                                          // Exclude any requisition that already has a matching invoice
                        !_context.SalesInvoices
                            .Any(si => si.SalesRequisitionID == r.SalesRequisitionID)
                    )
                    // 2️⃣ Project each qualifying requisition into a lightweight anonymous DTO
                    .Select(r => new
                        {
                        r.SalesRequisitionID,               // primary key
                        r.RefNo,                             // reference number for display
                        r.SellerID,                          // foreign key to Sellers
                        r.CustomerID,                        // foreign key to Customers

                        // ▶ Lookup the seller's name in the Sellers table
                        SellerName = _context.Sellers
                            .Where(s => s.SellerId == r.SellerID)
                            .Select(s => s.SellerName)
                            .FirstOrDefault(),

                        // ▶ Lookup the customer's name in the Customers table
                        CustomerName = _context.Customers
                            .Where(c => c.CustomerId == r.CustomerID)
                            .Select(c => c.CustomerName)
                            .FirstOrDefault(),
                        })
                    .ToListAsync();  // 3️⃣ Execute the query asynchronously and return a list

                // 4️⃣ Return HTTP 200 OK with the list of DTOs
                return Ok(salesRequisitions);
                }
            catch (Exception ex)
                {
                // 5️⃣ On any error (e.g. database connectivity), return HTTP 500 with details
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }

        /// <summary>
        /// GET /api/SalesInvoices/get-SalesRequisitionItems/{id}/{customerId}
        /// Retrieves all line items for a specific Sales Requisition, calculates the remaining
        /// invoicable quantity per item (based on prior invoices), and includes pricing and stock info.
        /// </summary>
        [HttpGet("get-SalesRequisitionItems/{id}/{customerId}")]
        public async Task<IActionResult> GetSalesRequisitionItems ( int id, int customerId )
            {
            try
                {
                // 1) Customer‐category lookup
                var customerCategoryId = await _context.Customers
                    .Where(c => c.CustomerId == customerId)
                    .Select(c => c.CustomerCategoryId)
                    .FirstOrDefaultAsync();

                // 2) All invoice IDs tied to this requisition
                var invoiceIds = await _context.SalesInvoices
                    .Where(si => si.SalesRequisitionID == id && si.StatusId!=Statuses.Void)
                    .Select(si => si.SalesInvoiceID)
                    .ToListAsync();

                // 3) Sum up already‐invoiced qty per ItemID AND per unit‐type (no filtering here)
                var existingQuantities = await _context.SalesInvoiceChildren
                    .Where(ic => invoiceIds.Contains(ic.SalesInvoiceID!.Value))
                    .GroupBy(ic => new
                        {
                        ic.ItemID,
                        IsSecondary = (ic.IsSecondaryUnit ?? false),
                        ConversionFactor = ic.ConversionFactor
                        })
                    .Select(g => new
                        {
                        ItemID = g.Key.ItemID!,
                        IsSecondaryUnit = g.Key.IsSecondary,
                        ConversionFactor = g.Key.ConversionFactor,
                        Quantity = g.Sum(ic => ic.Quantity)
                        })
                    .ToListAsync();

                // 4) Build lookup keyed by (ItemID, IsSecondaryUnit, ConversionFactor)
                var invoicedMap = existingQuantities
                    .ToDictionary(
                        x => (x.ItemID, x.IsSecondaryUnit, x.ConversionFactor),
                        x => x.Quantity
                    );

                // 5) Load requisition‐child rows
                var requisitionItems = await _context.SalesRequisitionChilds
                    .Where(c => c.SalesRequisitionID == id)
                    .Select(c => new RequisitionItemDto
                        {
                        SalesRequisitionChildID = c.SalesRequisitionChildID,
                        SalesRequisitionID = c.SalesRequisitionID,
                        ItemID = c.ItemID!.Value,
                        UnitId = c.UnitId!.Value,
                        NetAmount = _context.ItemCustomerCategories
                                                      .Where(ic =>
                                                          ic.ItemId == c.ItemID
                                                       && ic.CustomerCategoryId == customerCategoryId)
                                                      .Select(ic => ic.CustomerPrice)
                                                      .FirstOrDefault()??0,
                        UnitName = _context.Units
                                                      .Where(u => u.UnitId == c.UnitId)
                                                      .Select(u => u.UnitName)
                                                      .FirstOrDefault()
                                                  + ((c.IsSecondaryUnit ?? false) ? " secondary" : ""),
                        ConversionFactor = c.ConversionFactor,
                        IsSecondaryUnit = c.IsSecondaryUnit ?? false,
                        ChildTotalQuantity = c.ChildTotalQuantity,
                        ItemStockQuantity = 0,
                        GSTPercentage = _context.Items
                                                      .Where(i => i.ItemId == c.ItemID)
                                                      .Select(i => i.GSTPercentage)
                                                      .FirstOrDefault(),
                        Quantity = 0m  // placeholder
                        })
                    .ToListAsync();

                // 6) Compute remaining qty in‐memory, converting secondary units to primary
                foreach (var dto in requisitionItems)
                    {
                    var key = (dto.ItemID, dto.IsSecondaryUnit, dto.ConversionFactor);
                    invoicedMap.TryGetValue(((int? ItemID, bool IsSecondaryUnit, int? ConversionFactor))key, out var invoicedQty);
                    var qty = invoicedQty ?? 0m;

                    // if it's a secondary‐unit line, convert invoicedQty * ConversionFactor to primary units
                    var already = dto.IsSecondaryUnit
                        ? qty * dto.ConversionFactor
                        : qty;

                    dto.Quantity = dto.ChildTotalQuantity - already;
                    }

                return Ok(requisitionItems);
                }
            catch (Exception ex)
                {
                // TODO: inject & use ILogger<YourController> to log the exception
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }


        [HttpGet("get-sellers")]
        public async Task<IActionResult> GetAllSellers ( )
            {
            try
                {
                var items = await _context.Sellers
                    .Where(a => a.IsActive == 1 && a.IsDeleted == 0)
                    .Select(c => new
                        {
                        c.SellerId,
                        c.SellerName
                        })
                    .ToListAsync();

                return Ok(items);
                }
            catch (Exception ex)
                {
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }

        // GET /api/SalesInvoices
        // Retrieves all active, non-deleted sales invoices with customer and various status names,
        // then adds a 1-based index for UI display.
        [HttpGet]
        public async Task<IActionResult> GetAllSalesInvoice ( )
            {
            try
                {
                // 1️⃣ Query SalesInvoices table for active, non-deleted records
                var saleInvoice = await _context.SalesInvoices
                    .Where(a =>
                        a.IsActive == 1 &&      // only active invoices
                        a.IsDeleted == 0        // exclude soft-deleted
                    )
                    // 2️⃣ Project into an anonymous type with only needed fields and lookups
                    .Select(s => new
                        {
                        s.SalesInvoiceID,                // primary key of invoice
                        s.RefNo,                          // invoice reference number
                        s.InvoiceDate,                    // date of invoice
                        s.CustomerID,                     // FK to Customer
                        s.NetAmount,                      // total net amount after tax
                        s.StatusId,                       // numeric invoice status code
                        s.PaidAmount,                     // amount already paid
                        s.OutstandingAmount,              // remaining balance
                        s.InvoiceStatusId,                // numeric invoice-specific status
                        s.PaymentStatusId,                // numeric payment status
                                                          // ▶ Lookup customer name from Customers table
                        CustomerName = _context.Customers
                            .Where(c => c.CustomerId == s.CustomerID)
                            .Select(c => c.CustomerName)
                            .FirstOrDefault(),
                        // ▶ Lookup status name from Statuses table
                        StatusName = _context.Statuses
                            .Where(n => n.StatusId == s.StatusId)
                            .Select(n => n.StatusName)
                            .FirstOrDefault(),
                        // ▶ Lookup invoice status name from InvoiceStatuses table
                        InvoiceStatusName = _context.InvoiceStatuses
                            .Where(i => i.InvoiceStatusId == s.InvoiceStatusId)
                            .Select(i => i.InvoiceStatusName)
                            .FirstOrDefault(),
                        // ▶ Lookup payment status name from PaymentStatus table
                        PaymentStatusName = _context.PaymentStatus
                            .Where(p => p.PaymentStatusId == s.PaymentStatusId)
                            .Select(p => p.PaymentStatusName)
                            .FirstOrDefault(),
                        })
                    .ToListAsync();  // 3️⃣ Execute query and load results

                // 4️⃣ Add a 1-based index for ordering in the UI
                var indexedInvoices = saleInvoice
                    .Select(( invoice, index ) => new
                        {
                        Index = index + 1,  // start counting at 1
                        invoice.SalesInvoiceID,
                        invoice.RefNo,
                        invoice.InvoiceDate,
                        invoice.CustomerID,
                        invoice.NetAmount,
                        invoice.CustomerName,
                        invoice.StatusId,
                        invoice.InvoiceStatusId,
                        invoice.OutstandingAmount,
                        invoice.PaidAmount,
                        invoice.StatusName,
                        invoice.InvoiceStatusName,
                        invoice.PaymentStatusId,
                        invoice.PaymentStatusName
                        })
                    .ToList();

                // 5️⃣ Return HTTP 200 OK with the indexed list of invoices
                return Ok(indexedInvoices);
                }
            catch (Exception ex)
                {
                // 6️⃣ On error (e.g., DB connectivity issues), log exception and return HTTP 500
                Console.WriteLine($"Error fetching sales invoices: {ex.Message}");
                return StatusCode(500, "Internal server error.");
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
        // PUT /api/SalesInvoices/changestatus/{id}
        // Voids a sales invoice if no active payments exist, rolls back associated stock, and marks the invoice as void.
        [HttpPut("changestatus/{id}")]
        public async Task<IActionResult> ChangeStatus ( int id )
            {
            // 1️⃣ Identify the user performing the void operation
            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "Unknown";

            // 2️⃣ Begin a database transaction to ensure all-or-nothing behavior
            await using var transaction = await _context.Database.BeginTransactionAsync();
            try
                {
                // 3️⃣ Load the invoice header plus its child lines
                var invoice = await _context.SalesInvoices
                    .Include(si => si.SalesInvoiceChildren)
                    .FirstOrDefaultAsync(si =>
                        si.SalesInvoiceID == id &&
                        si.IsActive == 1 &&
                        si.IsDeleted == 0
                    );
                if (invoice == null)
                    return NotFound("Sales invoice not found");

                // 4️⃣ Gather all related payment IDs to verify they’re fully voided first
                var paymentReceivedIds = await _context.PaymentReceivedChildren
                    .Where(prc => prc.SalesInvoiceID == id)
                    .Select(prc => prc.PaymentReceivedID)
                    .Distinct()
                    .ToListAsync();

                if (paymentReceivedIds.Any())
                    {
                    // 5️⃣ Check if any related payment remains non-void
                    var hasUnvoidedPayments = await _context.PaymentReceived
                        .Where(pr =>
                            paymentReceivedIds.Contains(pr.PaymentReceivedID) &&
                            pr.StatusId != Statuses.Void
                        )
                        .AnyAsync();
                    if (hasUnvoidedPayments)
                        return BadRequest("Cannot void invoice until all related payments are voided.");
                    }

                // 6️⃣ Reverse stock for each line item on the invoice
                foreach (var child in invoice.SalesInvoiceChildren)
                    {
                    // a) Find the original stock transaction that added this quantity
                    var prevTx = await _context.StockTransactions
                        .FirstOrDefaultAsync(st =>
                            st.DocumentID == invoice.SalesInvoiceID &&
                            st.DocumentType == "Sales Invoice" &&
                            st.ItemID == child.ItemID &&
                            st.IsVoid == 0 &&
                            st.DocumentRefNo == invoice.RefNo
                        );
                    if (prevTx == null)
                        continue; // No transaction found, skip

                    // b) Load the current stock record for the item
                    var itemStock = await _context.ItemStocks
                        .FirstOrDefaultAsync(it =>
                            it.ItemID == child.ItemID &&
                            it.WarehouseID == invoice.WareHouseId
                        );

                    // c) Calculate how many units to add back (negative of original quantity)
                    var delta = -prevTx.Quantity.GetValueOrDefault();

                    // d) Update the on-hand stock quantity
                    itemStock.Quantity += delta;
                    itemStock.ModifiedBy = currentUserId;
                    itemStock.ModifiedOn = DateTime.Now;
                    _context.ItemStocks.Update(itemStock);

                    // e) Record a voided stock transaction entry
                    _context.StockTransactions.Add(new StockTransaction
                        {
                        ItemID = child.ItemID,
                        DocumentID = invoice.SalesInvoiceID,
                        DocumentType = "Sales Invoice",
                        DocumentRefNo = invoice.RefNo,
                        Remarks = "Is Void",
                        CreationDate = DateTime.Now,
                        Quantity = delta,
                        WarehouseID = invoice.WareHouseId,
                        IsActive = 1,
                        IsVoid = 1
                        });
                    }

                // 7️⃣ Finally mark the invoice itself as void
                invoice.StatusId = Statuses.Void;
                _context.SalesInvoices.Update(invoice);

                // 8️⃣ Persist all changes (stock, transactions, invoice status)
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                // 9️⃣ Return success message
                return Ok("Sales invoice status changed to Void.");
                }
            catch (Exception ex)
                {
                // 🔄 Roll back all changes on error
                await transaction.RollbackAsync();
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }




        // PUT /api/SalesInvoices/changeinvoicestatus/{invoiceId}/{newStatusId}
        // Transitions a sales invoice through its valid status flow (e.g. Open -> DeliveryChallanIssued -> OutForDelivery -> Delivered -> GRNIssued).
        // Ensures no active payments exist before voiding, and records the new status within a transaction.
        [HttpPut("changeinvoicestatus/{invoiceId}/{newStatusId}")]
        public async Task<IActionResult> ChangeInvoiceStatus ( int invoiceId, int newStatusId )
            {
            // 1️⃣ Begin a database transaction so all changes can be rolled back on failure
            await using var transaction = await _context.Database.BeginTransactionAsync();
            try
                {
                // 2️⃣ Load the target invoice, including child items (if stock adjustments or checks are needed downstream)
                var invoice = await _context.SalesInvoices
                    .Include(si => si.SalesInvoiceChildren)
                    .FirstOrDefaultAsync(si =>
                        si.SalesInvoiceID == invoiceId &&  // match by ID
                        si.IsActive == 1 &&          // ensure it's active
                        si.IsDeleted == 0 &&          // ensure not deleted
                        si.StatusId == Statuses.Approve  // must be in "Approved" state to change further
                    );
                if (invoice == null)
                    return NotFound($"Invoice {invoiceId} not found or not approved.");

                // 3️⃣ Validate the current InvoiceStatusId is set (non-zero)
                if (invoice.InvoiceStatusId == 0)
                    return BadRequest("Invoice must be approved before changing status.");

                // 4️⃣ Transition logic: only allow valid step-by-step status progression
                switch (invoice.InvoiceStatusId)
                    {
                    case InvoiceStatuses.Open when newStatusId == InvoiceStatuses.DeliveryChallanIssued:
                        invoice.InvoiceStatusId = InvoiceStatuses.DeliveryChallanIssued;
                        break;

                    case InvoiceStatuses.DeliveryChallanIssued when newStatusId == InvoiceStatuses.OutForDelivery:
                        invoice.InvoiceStatusId = InvoiceStatuses.OutForDelivery;
                        break;

                    case InvoiceStatuses.OutForDelivery when newStatusId == InvoiceStatuses.Delivered:
                        invoice.InvoiceStatusId = InvoiceStatuses.Delivered;
                        break;

                    case InvoiceStatuses.Delivered when newStatusId == InvoiceStatuses.GRNIssued:
                        invoice.InvoiceStatusId = InvoiceStatuses.GRNIssued;
                        break;

                    default:
                        // 5️⃣ If the requested transition doesn’t match any valid step, return an error
                        return BadRequest("Invalid status transition sequence.");
                    }

                // 6️⃣ Persist the updated status to the database
                _context.SalesInvoices.Update(invoice);
                await _context.SaveChangesAsync();

                // 7️⃣ Commit the transaction now that everything succeeded
                await transaction.CommitAsync();

                // 8️⃣ Return HTTP 200 OK with the invoiceId and newStatusId for confirmation
                return Ok(new { invoiceId, newStatusId });
                }
            catch (Exception ex)
                {
                // 🔄 On any exception, roll back the transaction for consistency
                await transaction.RollbackAsync();
                // TODO: Inject ILogger and log detailed exception in production
                return StatusCode(500, $"Could not update status: {ex.Message}");
                }
            }



        [HttpGet("get-salesRequisitionEdit/{SalesInvoiceID}")]
        public async Task<IActionResult> GetAllSalesRequisitionEdit ( int SalesInvoiceID )
            {
            try
                {
                var salesRequisitions = await _context.SalesRequisitions
                    .Where(r =>
                        r.IsActive == 1 &&
                        r.IsDeleted == 0 &&
                        _context.SalesInvoices.Any(si => si.SalesRequisitionID == r.SalesRequisitionID && si.SalesInvoiceID == SalesInvoiceID && si.IsActive == 1 && si.IsDeleted == 0)
                    )
                    .Select(r => new
                        {
                        r.SalesRequisitionID,
                        r.RefNo,
                        r.SellerID,
                        r.CustomerID,
                        SellerName = _context.Sellers
                                            .Where(s => s.SellerId == r.SellerID)
                                            .Select(s => s.SellerName)
                                            .FirstOrDefault(),
                        CustomerName = _context.Customers
                                            .Where(c => c.CustomerId == r.CustomerID)
                                            .Select(c => c.CustomerName)
                                            .FirstOrDefault(),
                        })
                    .ToListAsync();

                return Ok(salesRequisitions);
                }
            catch (Exception ex)
                {
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }
        [HttpGet("get-warehouse")]
        public async Task<IActionResult> GetAllWarehouses ( )
            {
            try
                {
                var warehouses = await _context.Warehouses
                    .Where(a => a.IsActive == 1 && a.IsDeleted == 0)
                    .Select(c => new
                        {
                        c.WarehouseID,
                        c.WarehouseName
                        })
                    .ToListAsync();

                return Ok(warehouses);
                }
            catch (Exception ex)
                {
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }

        [HttpGet("GetSalesInvoiceReport/{id}")]
        public async Task<IActionResult> GetSalesInvoiceReport ( int id )
            {
            var invoice = await _context.SalesInvoices
                // 1) filter header
                .Where(si => si.SalesInvoiceID == id
                          && si.IsActive == 1
                          && si.IsDeleted == 0)
                // 2) join to customer
                .Join(_context.Customers,
                      si => si.CustomerID,
                      cus => cus.CustomerId,
                      ( si, cus ) => new { si, cus })
                // 3) join to seller
                .Join(_context.Sellers,
                      tmp => tmp.si.SellerID,
                      sel => sel.SellerId,
                      ( tmp, sel ) => new { tmp.si, tmp.cus, sel })
                // 4) project header + build items list
                .Select(x => new SalesInvoiceDto
                    {
                    // header fields
                    SalesInvoiceID = x.si.SalesInvoiceID,
                    RefNo = x.si.RefNo,
                    InvoiceDate = x.si.InvoiceDate,
                    CustomerName = x.cus.CustomerName,
                    Address = x.cus.Address,
                    SellerName = x.sel.SellerName,

                    // init totals (will sum below)
                    QuantityCTN = 0,
                    QuantityPCS = 0,
                    TotalQtyPCS = 0,
                    TotalPrice = 0,

                    // child items
                    Items = _context.SalesInvoiceChildren
                        .Where(sic => sic.SalesInvoiceID == x.si.SalesInvoiceID)
                        .Join(_context.Items,
                              sic => sic.ItemID,
                              it => it.ItemId,
                              ( sic, it ) => new { sic, it })
                        .Join(_context.Brands,
                              y => y.it.BrandId,
                              br => br.BrandId,
                              ( y, br ) => new { y.sic, y.it, br })
                        .Join(_context.Units,
                              z => z.sic.UnitId,
                              un => un.UnitId,
                              ( z, un ) => new { z.sic, z.it, z.br, un })
                        .Select(y => new SalesInvoiceItemDto
                            {
                            ItemID = y.sic.ItemID ?? 0,
                            BrandName = y.br.BrandName,
                            ItemName = y.it.ItemName,
                            PackingPCSperCTN = y.sic.ConversionFactor,
                            QuantityCTN = y.sic.IsSecondaryUnit == true
                                              ? (y.sic.Quantity ?? 0)
                                              : 0,
                            QuantityPCS = y.sic.IsSecondaryUnit == false
                                              ? (y.sic.Quantity ?? 0)
                                              : 0,
                            TotalQtyPCS = y.sic.ChildTotalQuantity,
                            UnitPrice = y.sic.UnitPrice,
                            GSTPercentage = y.it.GSTPercentage,
                            SalesTaxPerUnit = y.sic.Tax,
                            NetPrice = y.sic.NetPrice,
                            TotalPrice = y.sic.TotalPrice
                            })
                        .ToList()
                    })
                .SingleOrDefaultAsync();

            if (invoice == null)
                return NotFound();

            // compute grand totals
            invoice.QuantityCTN = invoice.Items.Sum(i => i.QuantityCTN);
            invoice.QuantityPCS = invoice.Items.Sum(i => i.QuantityPCS);
            invoice.TotalQtyPCS = invoice.Items.Sum(i => i.TotalQtyPCS ?? 0m);
            invoice.TotalPrice = invoice.Items.Sum(i => i.TotalPrice ?? 0m);

            return Ok(invoice);
            }

        [HttpGet("GetSalesRequisitionsSP")]
        public async Task<IActionResult> GetSalesRequisitionsSP ( )
            {
            try
                {
                // 1) prepare command
                var conn = _context.Database.GetDbConnection();
                await using var cmd = conn.CreateCommand();
                cmd.CommandText = "SP_GetSalesRequisitions";
                cmd.CommandType = CommandType.StoredProcedure;

                // 2) open connection
                if (conn.State != ConnectionState.Open)
                    await conn.OpenAsync();

                // 3) execute and read all rows
                var requisitions = new List<GetSalesRequisitionDto>();
                await using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                    {
                    requisitions.Add(new GetSalesRequisitionDto
                        {
                        SalesRequisitionID = Convert.ToInt32(reader["SalesRequisitionID"]),
                        RefNo = reader["RefNo"].ToString()!,
                        SellerID = Convert.ToInt32(reader["SellerID"]),
                        CustomerID = Convert.ToInt32(reader["CustomerID"]),
                        CustomerName = reader["CustomerName"].ToString()!,
                        SellerName = reader["SellerName"].ToString()!
                        });
                    }

                // 4) return
                if (!requisitions.Any())
                    return NotFound("No sales requisitions found.");

                return Ok(requisitions);
                }
            catch (Exception ex)
                {
                // ideally log ex here…
                return StatusCode(500, "An error occurred while retrieving sales requisitions.");
                }
            }


        [HttpGet("GetSalesInvoiceReportSP/{id}")]
        public async Task<IActionResult> GetSalesInvoiceReportSP ( int id )
            {
            try
                {
                var conn = _context.Database.GetDbConnection();
                await using var cmd = conn.CreateCommand();
                cmd.CommandText = "SP_GetSalesInvoiceReport";
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.Parameters.Add(new MySqlParameter("p_SalesInvoiceID", MySqlDbType.Int32)
                    {
                    Direction = ParameterDirection.Input,
                    Value = id
                    });

                if (conn.State != ConnectionState.Open)
                    await conn.OpenAsync();

                await using var reader = await cmd.ExecuteReaderAsync();

                SalesInvoiceDto invoice = null;
                if (await reader.ReadAsync())
                    {
                    invoice = new SalesInvoiceDto
                        {
                        SalesInvoiceID = Convert.ToInt32(reader["SalesInvoiceID"]),
                        RefNo = reader["RefNo"].ToString(),
                        InvoiceDate = reader["InvoiceDate"] as DateTime?,
                        PONumber = reader["PONumber"].ToString(),
                        CustomerName = reader["CustomerName"].ToString(),
                        Address = reader["Address"].ToString(),
                        SellerName = reader["SellerName"].ToString(),
                        QuantityCTN = Convert.ToDecimal(reader["QuantityCTN"]),
                        QuantityPCS = Convert.ToDecimal(reader["QuantityPCS"]),
                        TotalQtyPCS = Convert.ToDecimal(reader["TotalQtyPCS"]),
                        TotalPrice = Convert.ToDecimal(reader["TotalPrice"]),
                        Items = new List<SalesInvoiceItemDto>()
                        };
                    }
                else
                    {
                    return NotFound();
                    }

                if (await reader.NextResultAsync())
                    {
                    while (await reader.ReadAsync())
                        {
                        invoice.Items.Add(new SalesInvoiceItemDto
                            {
                            ItemID = Convert.ToInt32(reader["ItemID"]),
                            BrandName = reader["BrandName"].ToString(),
                            ItemName = reader["ItemName"].ToString(),
                            PackingPCSperCTN = Convert.ToInt32(reader["PackingPCSperCTN"]),
                            QuantityCTN = Convert.ToDecimal(reader["quantityCTN"]),
                            QuantityPCS = Convert.ToDecimal(reader["quantityPCS"]),
                            TotalQtyPCS = reader["TotalQtyPCS"] as decimal?,
                            UnitPrice = reader["UnitPrice"] as decimal?,
                            GSTPercentage = reader["GSTPercentage"] as decimal?,
                            SalesTaxPerUnit = reader["SalesTaxPerUnit"] as decimal?,
                            NetPrice = reader["NetPrice"] as decimal?,
                            TotalPrice = reader["TotalPrice"] as decimal?
                            });
                        }
                    }

                return Ok(invoice);
                }
            catch (Exception ex)
                {
                // TODO: log exception (ex) via ILogger
                return StatusCode(500, "An error occurred while retrieving the invoice.");
                }
            }

        [HttpGet("GetSalesInvoiceDeliverySP/{id}")]
        public async Task<IActionResult> GetSalesInvoiceDeliverySP ( int id )
            {
            try
                {
                var conn = _context.Database.GetDbConnection();
                await using var cmd = conn.CreateCommand();
                cmd.CommandText = "SP_GetSalesDeliveryChallan";
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.Parameters.Add(new MySqlParameter("p_SalesInvoiceID", MySqlDbType.Int32)
                    {
                    Direction = ParameterDirection.Input,
                    Value = id
                    });

                if (conn.State != ConnectionState.Open)
                    await conn.OpenAsync();

                await using var reader = await cmd.ExecuteReaderAsync();

                SalesInvoiceDeliveryChallanDto invoice = null;
                if (await reader.ReadAsync())
                    {
                    invoice = new SalesInvoiceDeliveryChallanDto
                        {
                        SalesInvoiceID = Convert.ToInt32(reader["SalesInvoiceID"]),
                        RefNo = reader["RefNo"].ToString(),
                        InvoiceDate = reader["InvoiceDate"] as DateTime?,
                        PONumber = reader["PONumber"].ToString(),
                        CustomerName = reader["CustomerName"].ToString(),
                        Address = reader["Address"].ToString(),
                        SellerName = reader["SellerName"].ToString(),
                        QuantityCTN = Convert.ToDecimal(reader["QuantityCTN"]),
                        QuantityPCS = Convert.ToDecimal(reader["QuantityPCS"]),
                        TotalQtyPCS = Convert.ToDecimal(reader["TotalQtyPCS"]),
                        // TotalPrice = Convert.ToDecimal(reader["TotalPrice"]),
                        Items = new List<SalesInvoiceDeliveryChallanItemDto>()
                        };
                    }
                else
                    {
                    return NotFound();
                    }

                if (await reader.NextResultAsync())
                    {
                    while (await reader.ReadAsync())
                        {
                        invoice.Items.Add(new SalesInvoiceDeliveryChallanItemDto
                            {
                            ItemID = Convert.ToInt32(reader["ItemID"]),
                            BrandName = reader["BrandName"].ToString(),
                            ItemName = reader["ItemName"].ToString(),
                            PackingPCSperCTN = Convert.ToInt32(reader["PackingPCSperCTN"]),
                            QuantityCTN = Convert.ToDecimal(reader["quantityCTN"]),
                            QuantityPCS = Convert.ToDecimal(reader["quantityPCS"]),
                            TotalQtyPCS = reader["TotalQtyPCS"] as decimal?,
                            // UnitPrice = reader["UnitPrice"] as decimal?,
                            // GSTPercentage = reader["GSTPercentage"] as decimal?,
                            // SalesTaxPerUnit = reader["SalesTaxPerUnit"] as decimal?,
                            // NetPrice = reader["NetPrice"] as decimal?,
                            // TotalPrice = reader["TotalPrice"] as decimal?
                            });
                        }
                    }

                return Ok(invoice);
                }
            catch (Exception ex)
                {
                // TODO: log exception (ex) via ILogger
                return StatusCode(500, "An error occurred while retrieving the invoice.");
                }
            }
        [HttpGet("SalesInvoiceForDashBoard")]
        public async Task<IActionResult> GetSalesInvoiceForDashBoard ( )
            {
            try
                {
                var top3 = await _context.SalesInvoices
                    .Where(a => a.IsActive == 1 && a.IsDeleted == 0)
                    // pick the 3 you want; here: most recent by date
                    .OrderByDescending(s => s.RefNo)
                    .Take(3)
                    .Select(s => new
                        {
                        s.SalesInvoiceID,
                        s.RefNo,
                        s.InvoiceDate,
                        
                        s.NetAmount
                        })
                    .ToListAsync();

                // add 1-based index
                var indexed = top3
                    .Select(( sales, idx ) => new
                        {
                        Index = idx + 1,
                        sales.SalesInvoiceID,
                        sales.RefNo,
                        sales.InvoiceDate,
                       
                        sales.NetAmount,
                        
                        })
                    .ToList();

                return Ok(indexed);
                }
            catch (Exception ex)
                {
                Console.WriteLine($"Error: {ex.Message}");
                return StatusCode(500, "Internal server error.");
                }
            }

        [HttpGet("get-ItemStock/{ItemId}/{WareHouseID}")]
        public async Task<IActionResult> GetItemStock (int ItemId,int WareHouseID )
            {
            try
                {
                var items = await _context.ItemStocks
                    .Where(a => a.ItemID == ItemId && a.WarehouseID== WareHouseID && a.IsActive == 1)
                    .Select(c => new
                        {
                        c.ItemStockID,
                        c.ItemID,
                        ItemStockQuantity=c.Quantity
                        })
                    .ToListAsync();

                return Ok(items);
                }
            catch (Exception ex)
                {
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }

        }
    }
