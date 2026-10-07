using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SalesInventoryAPI.Data.Services;
using SalesInventoryAPI.Data;
using SalesInventoryAPI.Data.ViewModels;
using SalesInventoryAPI.Models;
using System.Security.Claims;
using SalesInventoryAPI.Data.DTOs;
using System.Text.Json;
using MySqlConnector;
using System.Data;
using static SalesInventoryAPI.Models.AppConstants;
using Microsoft.AspNetCore.Authorization;

namespace SalesInventoryAPI.Controller
    {
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class PurchaseRequisitionOrderController : ControllerBase
        {
        private readonly InventoryDbContext _context;
        private readonly PermissionService _permissionService;
        private readonly ActivityLogRepository _activityLogRepository;
        private readonly ReviseLogRepository _reviseLogRepository;
        private readonly CodeGenerator _codeGenerator;
        private readonly AppFilesService _appFilesService;

        public PurchaseRequisitionOrderController(InventoryDbContext context, PermissionService permissionService, ActivityLogRepository activityLogRepository, CodeGenerator codeGenerator, ReviseLogRepository reviseLogRepository, AppFilesService appFilesService )
            {
            _context = context;
            _permissionService = permissionService;
            _activityLogRepository = activityLogRepository;
            _reviseLogRepository = reviseLogRepository;
            _codeGenerator = codeGenerator;
            _appFilesService = appFilesService;
            }
        [HttpPost("AddPurchaseRequisitionOrder")]
        public async Task<IActionResult> AddPurchaseRequisitionOrder( [FromForm] string request,             // JSON payload
    [FromForm] List<IFormFile> attachments  )
            {
            var vm = JsonSerializer.Deserialize<PurchaseRequisitionOrderRequest>(request);
            if (vm == null) return BadRequest("Invalid payload.");
            // Start a new transaction.
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
                {
                // Map the request to the DB model for the parent record.
                var purchaseOrder = new PurchaseRequisitionOrder
                    {
                    RefNo = vm.RefNo,
                    Date = vm.Date,
                    VendorID = vm.VendorID,
                    DeliveryDate = vm.DeliveryDate,
                    PaymentTerms = vm.PaymentTerms,
                    Description = vm.Description,
                    TotalAmount = vm.TotalAmount,
                    TotalQuantity = vm.TotalQuantity,
                    StatusId = vm.StatusId,
                    IsActive = 1,      // Assuming 1 means active
                    IsDeleted = 0,     // Assuming 0 means not deleted
                    CreatedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value, // Replace with actual user info if available
                    CreatedOn = DateTime.Now
                    };

                // Add the parent record to the context and save to generate an ID.
                _context.PurchaseRequisitionOrders.Add(purchaseOrder);
                await _context.SaveChangesAsync();

                // Map and add child records if provided.
                if (vm.PurchaseRequisitionOrderChildRequests != null && vm.PurchaseRequisitionOrderChildRequests.Any())
                    {
                    foreach (var childReq in vm.PurchaseRequisitionOrderChildRequests)
                        {
                        var child = new PurchaseRequisitionOrderChild
                            {
                            // Now that purchaseOrder has an ID, set it as the foreign key for the child record.
                            PurchaseRequisitionOrderID = purchaseOrder.PurchaseRequisitionOrderID,
                            ItemID = childReq.ItemID,
                            Quantity = childReq.Quantity,
                            UnitId = childReq.UnitId,
                            UnitPrice = childReq.UnitPrice,
                            Tax = childReq.Tax,
                            ChildTotalPrice = childReq.ChildTotalPrice,
                            ConversionFactor = childReq.ConversionFactor,
                            IsSecondaryUnit = childReq.IsSecondaryUnit,
                            ChildTotalQuantity = childReq.ChildTotalQuantity,
                            IsActive = 1,
                            IsDeleted = 0
                            };

                        _context.PurchaseRequisitionOrderChildren.Add(child);
                        }

                    await _context.SaveChangesAsync();
                    }

                // Retrieve the child records for logging.
                var children = await _context.PurchaseRequisitionOrderChildren
                    .Where(c => c.PurchaseRequisitionOrderID == purchaseOrder.PurchaseRequisitionOrderID)
                    .Select(c => new
                        {
                        c.PurchaseRequisitionOrderChildID,
                        c.ItemID,
                        c.Quantity,
                        c.UnitId,
                        c.UnitPrice,
                        c.Tax
                        })
                    .ToListAsync();

                // Log activity if any changes were made.
                // Populate the log object with the required fields including the child record details.
                var logPurchaseRequisitionOrder = new
                    {
                    purpurchaseOrder = purchaseOrder.PurchaseRequisitionOrderID,
                    purchaseOrder.RefNo,
                    purchaseOrder.Date,
                    purchaseOrder.VendorID,
                    purchaseOrder.TotalAmount,
                    purchaseOrder.TotalQuantity,
                    purchaseOrder.Description,
                    Children = children
                    };

                var activityLog = new ActivityLog
                    {
                    MenuItemId = 28,
                    ParentTableId = purchaseOrder.PurchaseRequisitionOrderID,
                    ActionType = "Create",
                    OldData = string.Empty,
                    NewData = System.Text.Json.JsonSerializer.Serialize(logPurchaseRequisitionOrder),
                    UserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                    Date = DateTime.Now
                    };

                await _activityLogRepository.Create(activityLog);

                foreach (var formFile in attachments)
                    {
                    // match metadata by index (ensure front-end appends in same order)
                    var metaRef = vm.MultipleAttachments.ElementAtOrDefault(attachments.IndexOf(formFile))?.Referenceno ?? "";

                    var appFile = new MultipleAttachment
                        {
                        MenuItemId = 28,
                        MenuItemName = "Purchase Requisition",
                        ParentTableId = purchaseOrder.PurchaseRequisitionOrderID,
                        FileName = formFile.FileName,
                        Referenceno = metaRef,
                        Date = DateTime.Now,
                        CreatedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                        CreatedOn = DateTime.Now,
                        IsActive = 1,
                        IsDeleted = 0
                        };
                    await _appFilesService.Upload(appFile, formFile);
                    }
                // Commit the transaction if all operations complete successfully.
                await transaction.CommitAsync();

                // Return a 200 OK response along with the created order.
                return Ok(purchaseOrder);
                }
            catch (Exception ex)
                {
                // Roll back the transaction on error.
                await transaction.RollbackAsync();
                return StatusCode(500, $"An error occurred while processing the request: {ex.Message}");
                }
            }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdatePurchaseRequisitionOrder( int id,
    [FromForm] string request,
    [FromForm] List<IFormFile> attachments,
    [FromForm] string removeAttachmentIds  // JSON array of ints
)
            {
            var model = JsonSerializer.Deserialize<PurchaseRequisitionOrderVM>(request);
            if (model == null || model.PurchaseRequisitionOrderID != id)
                return BadRequest("Invalid request data.");
            var currentUser = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "System";

            // Start a new transaction.
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
                {
                var toRemove = JsonSerializer.Deserialize<List<int>>(removeAttachmentIds) ?? new List<int>();
                // Retrieve the existing order along with its children.
                var purchaseOrder = await _context.PurchaseRequisitionOrders
                    .Include(o => o.PurchaseRequisitionOrderChildren)
                    .FirstOrDefaultAsync(o => o.PurchaseRequisitionOrderID == id);

                if (purchaseOrder == null)
                    {
                    return NotFound("Purchase requisition order not found.");
                    }
                int checkRevise = purchaseOrder.StatusId;
                var olddata = new
                    {
                    purchaseOrder.PurchaseRequisitionOrderID,
                    purchaseOrder.RefNo,
                    purchaseOrder.Date,
                    purchaseOrder.VendorID,
                    purchaseOrder.TotalAmount,
                    purchaseOrder.TotalQuantity,
                    purchaseOrder.Description
                    // Add additional fields if necessary.
                    };

                // Update the parent order's properties.
                purchaseOrder.RefNo = model.RefNo;
                purchaseOrder.Date = model.Date;
                purchaseOrder.VendorID = model.VendorID;
                purchaseOrder.DeliveryDate = model.DeliveryDate;
                purchaseOrder.PaymentTerms = model.PaymentTerms;
                purchaseOrder.Description = model.Description;
                purchaseOrder.TotalAmount = model.TotalAmount;
                purchaseOrder.TotalQuantity = model.TotalQuantity;
                purchaseOrder.StatusId = model.StatusId;
                purchaseOrder.ModifiedBy = "System"; // Replace with actual user info if available.
                purchaseOrder.ModifiedOn = DateTime.Now;

                // Process each child provided in the view model.
                foreach (var childVm in model.PurchaseRequisitionOrderChildVMs)
                    {
                    if (childVm.PurchaseRequisitionOrderChildID > 0)
                        {
                        // Update an existing child record.
                        var existingChild = purchaseOrder.PurchaseRequisitionOrderChildren
                            .FirstOrDefault(c => c.PurchaseRequisitionOrderChildID == childVm.PurchaseRequisitionOrderChildID);

                        if (existingChild != null)
                            {
                            existingChild.ItemID = childVm.ItemID;
                            existingChild.Quantity = childVm.Quantity;
                            existingChild.UnitId = childVm.UnitId;
                            existingChild.UnitPrice = childVm.UnitPrice;
                            existingChild.ChildTotalPrice = childVm.ChildTotalPrice;
                            existingChild.ConversionFactor = childVm.ConversionFactor;
                            existingChild.IsSecondaryUnit = childVm.IsSecondaryUnit;
                            existingChild.ChildTotalQuantity = childVm.ChildTotalQuantity;
                            existingChild.Tax = childVm.Tax;
                            }
                        }
                    else
                        {
                        // Add a new child record.
                        var newChild = new PurchaseRequisitionOrderChild
                            {
                            PurchaseRequisitionOrderID = id,
                            ItemID = childVm.ItemID,
                            Quantity = childVm.Quantity,
                            UnitId = childVm.UnitId,
                            UnitPrice = childVm.UnitPrice,
                            ChildTotalPrice = childVm.ChildTotalPrice,
                            ConversionFactor = childVm.ConversionFactor,
                            IsSecondaryUnit = childVm.IsSecondaryUnit,
                            ChildTotalQuantity = childVm.ChildTotalQuantity,
                            Tax = childVm.Tax,
                            IsActive = 1,
                            IsDeleted = 0
                            };
                        _context.PurchaseRequisitionOrderChildren.Add(newChild);
                        }
                    }

                // Remove any child records that were marked for deletion.
                if (model.RemovedPurchaseRequisitionOrderChildIds != null && model.RemovedPurchaseRequisitionOrderChildIds.Any())
                    {
                    foreach (var childId in model.RemovedPurchaseRequisitionOrderChildIds)
                        {
                        var childToRemove = purchaseOrder.PurchaseRequisitionOrderChildren
                            .FirstOrDefault(c => c.PurchaseRequisitionOrderChildID == childId);
                        if (childToRemove != null)
                            {
                            _context.PurchaseRequisitionOrderChildren.Remove(childToRemove);
                            }
                        }
                    }

                // Save the changes (update parent, update/add/remove children).
                var changes = await _context.SaveChangesAsync();

                // If changes were saved, log the activity.
                if (changes > 0)
                    {
                    var logData = new
                        {
                        purchaseOrder.PurchaseRequisitionOrderID,
                        purchaseOrder.RefNo,
                        purchaseOrder.Date,
                        purchaseOrder.VendorID,
                        purchaseOrder.TotalAmount,
                        purchaseOrder.TotalQuantity,
                        purchaseOrder.Description
                        // Add additional fields if necessary.
                        };

                    var activityLog = new ActivityLog
                        {
                        MenuItemId = 28,
                        ParentTableId = purchaseOrder.PurchaseRequisitionOrderID,
                        ActionType = "Update",
                        OldData = System.Text.Json.JsonSerializer.Serialize(olddata),
                        NewData = System.Text.Json.JsonSerializer.Serialize(logData),
                        UserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                        Date = DateTime.Now
                        };

                    await _activityLogRepository.Create(activityLog);
                    }
                if (checkRevise == 3)
                    {
                    var reviseData = new
                        {
                        purchaseOrder.PurchaseRequisitionOrderID,
                        purchaseOrder.RefNo,
                        purchaseOrder.Date,
                        purchaseOrder.VendorID,
                        purchaseOrder.TotalAmount,
                        purchaseOrder.TotalQuantity,
                        purchaseOrder.Description
                        // Add additional fields if necessary.
                        };
                    var reviseLog = new Reviselog
                        {
                        MenuItemId = 28,
                        ParentTableId = purchaseOrder.PurchaseRequisitionOrderID,
                        ActionType = "Revise",
                        OldData = System.Text.Json.JsonSerializer.Serialize(olddata),
                        NewData = System.Text.Json.JsonSerializer.Serialize(reviseData),
                        UserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                        Date = DateTime.Now
                        };

                    await _reviseLogRepository.Create(reviseLog);
                    }


                foreach (var formFile in attachments)
                    {
                    // match metadata by index (ensure front-end appends in same order)
                    var metaRef = model.MultipleAttachments.ElementAtOrDefault(attachments.IndexOf(formFile))?.Referenceno ?? "";

                    var appFile = new MultipleAttachment
                        {
                        MenuItemId = 28,
                        MenuItemName = "Purchase Requisition",
                        ParentTableId = purchaseOrder.PurchaseRequisitionOrderID,
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
                if (toRemove.Any())
                    {
                    await _appFilesService.RemoveSpecificAttachmentsAsync(
                        menuItemId: 28,
                        parentTableId: id,
                        idsToRemove: toRemove
                    );
                    }
                    await transaction.CommitAsync();

                    // Return the updated order.
                    return Ok(purchaseOrder);
                    
                }
            catch (Exception ex)
                {
                await transaction.RollbackAsync();
                return StatusCode(500, $"An error occurred while processing the update: {ex.Message}");
                }
            }
        [HttpGet("{id}")]
        public async Task<IActionResult> GetPurchaseOrderById(int id)
            {
            try
                {
                // Retrieve the purchase order with its children,
                // filtering only active (IsActive == 1) and non-deleted (IsDeleted == 0) records.
                var orderEntity = await _context.PurchaseRequisitionOrders
                    .Include(o => o.PurchaseRequisitionOrderChildren)
                    .FirstOrDefaultAsync(o => o.PurchaseRequisitionOrderID == id && o.IsActive == 1 && o.IsDeleted == 0);

                if (orderEntity == null)
                    {
                    return NotFound("Purchase order not found.");
                    }

                // Map the entity to the view model.
                var orderVm = new PurchaseRequisitionOrderVM
                    {
                    PurchaseRequisitionOrderID = orderEntity.PurchaseRequisitionOrderID,
                    RefNo = orderEntity.RefNo,
                    Date = orderEntity.Date,
                    VendorID = orderEntity.VendorID,
                    DeliveryDate = orderEntity.DeliveryDate,
                    PaymentTerms = orderEntity.PaymentTerms,
                    Description = orderEntity.Description,
                    TotalAmount = orderEntity.TotalAmount,
                    TotalQuantity = orderEntity.TotalQuantity,
                    StatusId = orderEntity.StatusId,
                    PurchaseRequisitionOrderChildVMs = orderEntity.PurchaseRequisitionOrderChildren.Select(child => new PurchaseRequisitionOrderChildVM
                        {
                        PurchaseRequisitionOrderChildID = child.PurchaseRequisitionOrderChildID,
                        PurchaseRequisitionOrderID = child.PurchaseRequisitionOrderID,
                        ItemID = child.ItemID,
                        Quantity = child.Quantity,
                        UnitId = child.UnitId,
                        UnitPrice = child.UnitPrice,
                        Tax = child.Tax,
                        ChildTotalPrice = child.ChildTotalPrice,
                        ConversionFactor = child.ConversionFactor,
                        IsSecondaryUnit = child.IsSecondaryUnit,
                        ChildTotalQuantity = child.ChildTotalQuantity
                        }).ToList() ,
                    MultipleAttachments = _context.Multipleattachments
                        .Where(m =>
                            m.MenuItemId == 28 &&
                            m.ParentTableId == orderEntity.PurchaseRequisitionOrderID &&
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

                return Ok(orderVm);
                }
            catch (Exception ex)
                {
                // In case of an exception, log and return a 500 error.
                return StatusCode(500, $"An error occurred while retrieving the purchase order: {ex.Message}");
                }
            }
        [HttpGet("detailPurchaseOrderBy/{id}")]
        public async Task<IActionResult> DetailPurchaseOrderById(int id)
            {
            try
                {
                // Retrieve the purchase order with its children,
                // filtering only active (IsActive == 1) and non-deleted (IsDeleted == 0) records.
                var orderEntity = await _context.PurchaseRequisitionOrders
                    .Include(o => o.PurchaseRequisitionOrderChildren)
                    .FirstOrDefaultAsync(o => o.PurchaseRequisitionOrderID == id && o.IsActive == 1 && o.IsDeleted == 0);

                if (orderEntity == null)
                    {
                    return NotFound("Purchase order not found.");
                    }

                // Map the entity to the view model.
                var orderVm = new
                    {
                    PurchaseRequisitionOrderID = orderEntity.PurchaseRequisitionOrderID,
                    RefNo = orderEntity.RefNo,
                    Date = orderEntity.Date,
                    VendorID = orderEntity.VendorID,
                    VendorName = _context.Vendors.Where(v => v.VendorID == orderEntity.VendorID).Select(v => v.VendorName).FirstOrDefault(),
                    DeliveryDate = orderEntity.DeliveryDate,
                    PaymentTerms = orderEntity.PaymentTerms,
                    Description = orderEntity.Description,
                    TotalAmount = orderEntity.TotalAmount,
                    TotalQuantity = orderEntity.TotalQuantity,
                    StatusId = orderEntity.StatusId,
                   
                    PurchaseRequisitionOrderChildVMs = orderEntity.PurchaseRequisitionOrderChildren.Select(child => new
                        {
                        PurchaseRequisitionOrderChildID = child.PurchaseRequisitionOrderChildID,
                        PurchaseRequisitionOrderID = child.PurchaseRequisitionOrderID,
                        ItemID = child.ItemID,
                        ItemName = _context.Items.Where(v => v.ItemId == child.ItemID).Select(u => u.ItemName + ' ' + '(' + u.ItemCode + ')').FirstOrDefault(),
                        Quantity = child.Quantity,
                        UnitId = child.UnitId,
                        UnitName = _context.Units.Where(v => v.UnitId == child.UnitId).Select(v => v.UnitName).FirstOrDefault(),
                        UnitPrice = child.UnitPrice,
                        Tax = child.Tax,
                        ChildTotalPrice = child.ChildTotalPrice,
                        ConversionFactor = child.ConversionFactor,
                        IsSecondaryUnit = child.IsSecondaryUnit,
                        ChildTotalQuantity = child.ChildTotalQuantity
                        }).ToList() ,
                    MultipleAttachments = _context.Multipleattachments
                        .Where(m =>
                            m.MenuItemId == 28 &&
                            m.ParentTableId == orderEntity.PurchaseRequisitionOrderID &&
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
                        .ToList(),
                    };

                return Ok(orderVm);
                }
            catch (Exception ex)
                {
                // In case of an exception, log and return a 500 error.
                return StatusCode(500, $"An error occurred while retrieving the purchase order: {ex.Message}");
                }
            }



        [HttpGet("GetNextPurchaseRefNumber")]
        public async Task<IActionResult> GetNextPurchaseRefNumber()
            {
            try
                {
                string ref_no = await _codeGenerator.GenerateReferenceNumber("purchaserequisitionorders", "RefNo", "PO-2025", 4);
                return Ok(new { PurchaseRefNumber = ref_no });
                }
            catch (Exception ex)
                {
                // Log the exception and return an error status.
                Console.WriteLine($"Error: {ex.Message}");
                return StatusCode(500, "Internal server error.");
                }
            }

        [HttpGet("get-vendor")]
        public async Task<IActionResult> GetAllVendors()
            {
            try
                {
                var items = await _context.Vendors
                    .Where(a => a.IsActive == 1 && a.IsDeleted == 0)
                    .Select(c => new
                        {
                        c.VendorID,
                        c.VendorName
                        })
                    .ToListAsync();

                return Ok(items);
                }
            catch (Exception ex)
                {
                return StatusCode(500, $"Internal server error: {ex.Message}");
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

        [HttpGet("get-units-by-item/{id}")]
        public async Task<IActionResult> GetUnitsByItem(int id)
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
        [HttpGet("get-conversionfactor")]
        public async Task<IActionResult> GetItemConversionFactor([FromQuery] ConversionFactorDTO conversionFactorDTO)
            {
            try
                {
                if (!conversionFactorDTO.IsSecondaryUnit)
                    {
                    return NotFound("Item has not conversion Factor");
                    }
                var items = await _context.Items
                    .Where(a => a.ItemId == conversionFactorDTO.ItemtId &&
                                a.SecondaryUnitID == conversionFactorDTO.UnitId &&
                                a.IsActive == 1 && a.IsDeleted == 0)
                    .Select(c => new
                        {
                        c.ConversionFactor
                        })
                    .ToListAsync();

                return Ok(items);
                }
            catch (Exception ex)
                {
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }
        [HttpGet("PurchaseRequisitions")]
        public async Task<IActionResult> GetAllPurchaseRequisitions()
            {
            try
                {
                var purchaseRequisitions = await _context.PurchaseRequisitionOrders.OrderByDescending(d => d.PurchaseRequisitionOrderID)
                    .Where(sr => sr.IsActive == 1 && sr.IsDeleted == 0)
                    .OrderByDescending(sr => sr.PurchaseRequisitionOrderID)
                    .Select(c => new
                        {
                        c.PurchaseRequisitionOrderID,
                        c.RefNo,
                        c.Date,
                        VendorName = _context.Vendors.Where(v => v.VendorID == c.VendorID).Select(v => v.VendorName).FirstOrDefault(),
                        c.StatusId,
                        Status = _context.Statuses.Where(s => s.StatusId == c.StatusId).Select(s => s.StatusName).FirstOrDefault(),
                        })
                    .ToListAsync();

                var indexedsalesRequisitions = purchaseRequisitions.Select((s, index) => new
                    {
                    Index = index + 1,  // Using index + 1 so that indexing starts at 1
                    s.PurchaseRequisitionOrderID,
                    s.RefNo,
                    s.Date,
                    s.VendorName,
                    s.StatusId,
                    s.Status
                    }).ToList();

                return Ok(indexedsalesRequisitions);
                }
            catch (Exception ex)
                {
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }
        

    [HttpPut("changestatus/{id}")]
        public async Task<IActionResult> ChangeStatusPurchaseRequisition(int id)
            {
            // Begin a transaction
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
                {
                // Fetch the SalesRequisition (including its child items)
                var purchaseRequisition = await _context.PurchaseRequisitionOrders
                    .Include(c => c.PurchaseRequisitionOrderChildren)
                    .FirstOrDefaultAsync(c => c.PurchaseRequisitionOrderID == id && c.IsActive == 1 && c.IsDeleted == 0);

                if (purchaseRequisition == null)
                    {
                    return NotFound("SalesRequisition not found");
                    }
                var purchaseReceiveds = await _context.PurchaseReceives
                     .Include(pr => pr.PurchaseReceiveChildren)
                     .Where(pr => pr.PurchaseRequisitionOrderID == id
                                                && pr.IsActive == 1
                                                && pr.IsDeleted == 0).Select(prc => prc.PurchaseReceiveID)    // your FK on the child
                  .Distinct()
                  .ToListAsync();
                if (purchaseReceiveds.Count > 0)
                    {
                    // 3) See if any of those parents have a non-void status
                    var hasUnvoidedpurchaseReceived = await _context.PurchaseReceives
                        .Where(pr => purchaseReceiveds.Contains(pr.PurchaseReceiveID)
                                  && pr.StatusId != Statuses.Void)
                        .AnyAsync();

                    if (hasUnvoidedpurchaseReceived)
                        return BadRequest("Cannot void Requisition until all related Receives are voided.");
                    }

                // Update the status to 4
                purchaseRequisition.StatusId = Statuses.Void;

                // Mark the SalesRequisition as updated.
                _context.PurchaseRequisitionOrders.Update(purchaseRequisition);

                // Save changes within the transaction.
                await _context.SaveChangesAsync();

                // Commit the transaction
                await transaction.CommitAsync();

                return Ok("SalesRequisition status changed successfully");
                }
            catch (Exception ex)
                {
                // Rollback the transaction on error
                await transaction.RollbackAsync();
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }
        [HttpGet("activity_log/PurchaseRequisitionOrder/{id}")]
        public async Task<IActionResult> GetActivityLogsForPurchaseRequisitionOrder ( int id )
            {
            try
                {
                var logs = await _context.ActivityLogs
                    .Where(a => a.MenuItemId == 28)
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
                    // Left join with PurchaseRequisitionOrder
                    .GroupJoin(
                        _context.PurchaseRequisitionOrders,
                        temp => temp.a.ParentTableId,
                        b => b.PurchaseRequisitionOrderID,
                        ( temp, PurchaseRequisitionOrders ) => new { temp.a, temp.user, PurchaseRequisitionOrders }
                    )
                    .SelectMany(
                        temp => temp.PurchaseRequisitionOrders.DefaultIfEmpty(),
                        ( temp, PurchaseRequisitionOrder ) => new { temp.a, temp.user, PurchaseRequisitionOrder }
                    )
                    // Apply filter for UnitId = 1 (ensure Unit is not null)
                    .Where(x => x.PurchaseRequisitionOrder != null && x.PurchaseRequisitionOrder.PurchaseRequisitionOrderID == id)
                    // Project to the desired shape
                    .Select(x => new
                        {
                        x.a.ActionType,
                        x.a.OldData,
                        x.a.NewData,
                        PurchaseRequisitionOrderRefNo = x.PurchaseRequisitionOrder.RefNo,
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
        [HttpGet("GetPurchaseRequisitionOrderReportSP/{id}")]
        public async Task<IActionResult> GetPurchaseRequisitionOrderReportSP ( int id )
            {
            try
                {
                var conn = _context.Database.GetDbConnection();
                await using var cmd = conn.CreateCommand();
                cmd.CommandText = "SP_GetPurchaseRequisitionOrder";
                cmd.CommandType = CommandType.StoredProcedure;

                cmd.Parameters.Add(new MySqlParameter("p_PurchaseRequisitionOrderID", MySqlDbType.Int32)
                    {
                    Direction = ParameterDirection.Input,
                    Value = id
                    });

                if (conn.State != ConnectionState.Open)
                    await conn.OpenAsync();

                await using var reader = await cmd.ExecuteReaderAsync();

                // 1) Read header with totals
                PurchaseRequisitionOrderDto order = null;
                if (await reader.ReadAsync())
                    {
                    order = new PurchaseRequisitionOrderDto
                        {
                        PurchaseRequisitionOrderID = Convert.ToInt32(reader["PurchaseRequisitionOrderID"]),
                        RefNo = reader["RefNo"].ToString(),
                        Date = reader["Date"] as DateTime?,
                        VendorName = reader["VendorName"].ToString(),
                        Address = reader["Address"].ToString(),
                        QuantityCTN = Convert.ToDecimal(reader["QuantityCTN"]),
                        QuantityPCS = Convert.ToDecimal(reader["QuantityPCS"]),
                        TotalQtyPCS = Convert.ToDecimal(reader["TotalQtyPCS"]),
                        TotalAmount = Convert.ToDecimal(reader["TotalAmount"]),
                        Items = new List<PurchaseRequisitionOrderItemDto>()
                        };
                    }
                else
                    {
                    return NotFound();
                    }

                // 2) Read child item rows
                if (await reader.NextResultAsync())
                    {
                    while (await reader.ReadAsync())
                        {
                        order.Items.Add(new PurchaseRequisitionOrderItemDto
                            {
                            ItemID = Convert.ToInt32(reader["ItemID"]),
                            BrandName = reader["BrandName"].ToString(),
                            ItemName = reader["ItemName"].ToString(),
                            PackingPCSperCTN = Convert.ToInt32(reader["PackingPCSperCTN"]),
                            QuantityCTN = Convert.ToDecimal(reader["QuantityCTN"]),
                            QuantityPCS = Convert.ToDecimal(reader["QuantityPCS"]),
                            TotalQtyPCS = Convert.ToDecimal(reader["TotalQtyPCS"]),
                            UnitPrice = Convert.ToDecimal(reader["UnitPrice"]),
                            TotalAmount = Convert.ToDecimal(reader["TotalAmount"])
                            });
                        }
                    }

                return Ok(order);
                }
            catch (Exception ex)
                {
                // TODO: Log the exception using ILogger
                return StatusCode(500, "An error occurred while retrieving the requisition order report.");
                }
            }
        }
        }



