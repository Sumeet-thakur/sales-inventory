using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using SalesInventoryAPI.Data;
using SalesInventoryAPI.Data.DTOs;
using SalesInventoryAPI.Data.Services;
using SalesInventoryAPI.Data.ViewModels;
using SalesInventoryAPI.Models;
using System.Security.Claims;
using System.Text.Json.Serialization;
using System.Text.Json;
using static SalesInventoryAPI.Models.AppConstants;
using MySqlConnector;
using System.Data;
using Microsoft.AspNetCore.Authorization;

namespace SalesInventoryAPI.Controller
    {
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class SalesRequisitionController : ControllerBase
        {
        private readonly InventoryDbContext _context;
        private readonly CodeGenerator _codeGenerator;
        private readonly IWebHostEnvironment _hostEnvironment;
        private readonly ActivityLogRepository _activityLogRepository;
        private readonly ReviseLogRepository _reviseLogRepository;
        private readonly AppFilesService _appFilesService;

        public SalesRequisitionController ( InventoryDbContext context, CodeGenerator codeGenerator, IWebHostEnvironment hostEnvironment, ReviseLogRepository reviseLogRepository, ActivityLogRepository activityLogRepository, AppFilesService appFilesService )
            {
            _context = context;
            _codeGenerator = codeGenerator;
            _hostEnvironment = hostEnvironment;
            _reviseLogRepository = reviseLogRepository;
            _activityLogRepository = activityLogRepository;
            _appFilesService = appFilesService;

            }

        [HttpGet]
        public async Task<IActionResult> GetAllSalesRequisitions ( )
            {
            try
                {
                var salesRequisitions = await _context.SalesRequisitions.OrderByDescending(d => d.SalesRequisitionID)
                    .Where(sr => sr.IsActive == 1 && sr.IsDeleted == 0)
                    .OrderByDescending(sr => sr.SalesRequisitionID)
                    .Select(c => new
                        {
                        c.SalesRequisitionID,
                        c.RefNo,
                        c.Date,
                        CustomerName = _context.Customers.Where(c => c.CustomerId == c.CustomerId).Select(c => c.CustomerName).FirstOrDefault(),
                        c.StatusId,
                        Status = _context.Statuses.Where(s => s.StatusId == c.StatusId).Select(s => s.StatusName).FirstOrDefault(),
                        })
                    .ToListAsync();

                var indexedsalesRequisitions = salesRequisitions.Select(( s, index ) => new
                    {
                    Index = index + 1,  // Using index + 1 so that indexing starts at 1
                    s.SalesRequisitionID,
                    s.RefNo,
                    s.Date,
                    s.CustomerName,
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

        [HttpGet("{id}")]
        public async Task<IActionResult> GetSalesRequisitionById ( int id )
            {
            try
                {
                // Fetch the SalesRequisition along with its child items and file records.
                var salesRequisition = await _context.SalesRequisitions
                    .Include(sr => sr.SalesRequisitionChilds)
                    
                    .FirstOrDefaultAsync(sr => sr.SalesRequisitionID == id && sr.IsActive == 1 && sr.IsDeleted == 0);

                if (salesRequisition == null)
                    {
                    return NotFound("SalesRequisition not found.");
                    }
                var attachments = await _context.Multipleattachments
.Where(m =>
    m.MenuItemId == 23 &&
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

                // Map the DB model to the ViewModel.
                var vm = new SalesRequisitionVM
                    {
                    SalesRequisitionID = salesRequisition.SalesRequisitionID,
                    RefNo = salesRequisition.RefNo,
                    Date = salesRequisition.Date,
                    CustomerID = salesRequisition.CustomerID,
                    SellerID = salesRequisition.SellerID,
                    CustomerChildID = salesRequisition.CustomerChildID,
                    StatusId = salesRequisition.StatusId, // Added mapping for StatusId
                    Description = salesRequisition.Description,
                    TotalQuantity = salesRequisition.TotalQuantity,
                    // Map the child items.
                    SalesRequisitionChildVMs = salesRequisition.SalesRequisitionChilds.Select(child => new SalesRequisitionChildVM
                        {
                        SalesRequisitionChildID = child.SalesRequisitionChildID,
                        SalesRequisitionID = child.SalesRequisitionID,
                        ItemID = child.ItemID,
                        ItemName = _context.Items.Where(u => u.ItemId == child.ItemID).Select(u => u.ItemName).FirstOrDefault(),
                        Quantity = child.Quantity,
                        UnitId = child.UnitId,
                        UnitName = _context.Units.Where(u => u.UnitId == child.UnitId).Select(u => u.UnitName).FirstOrDefault() + ((child.IsSecondaryUnit ?? false) ? " secondary" : ""),
                        ConversionFactor = child.ConversionFactor,
                        IsSecondaryUnit = child.IsSecondaryUnit,
                        ChildTotalQuantity = child.ChildTotalQuantity,
                        }).ToList(),
                    // Map the file records.
                   
                    // Initialize removed IDs lists as empty.
                    RemovedSalesRequisitionChildIds = new List<int>(),
                    RemovedSalesRequisitionFilesIds = new List<int>(),
                    MultipleAttachments = attachments
                    };

                return Ok(vm);
                }
            catch (Exception ex)
                {
                // Log the exception as needed, e.g. with a logging framework.
                Console.WriteLine($"Error: {ex.Message}");
                return StatusCode(500, "Internal server error.");
                }
            }

        [HttpPost("AddSalesRequisition")]
        public async Task<IActionResult> AddSalesRequisition (
    [FromForm] string request,
    [FromForm] List<IFormFile> attachments )
            {
            var _request = JsonSerializer.Deserialize<SalesRequisitionRequest>(request);
            if (_request == null) return BadRequest("Invalid payload.");

            // Verify status exists
            var status = await _context.Statuses
                .FirstOrDefaultAsync(i => i.StatusId == _request.StatusId);
            if (status == null)
                return NotFound($"Status with id {_request.StatusId} was not found.");

            await using var transaction = await _context.Database.BeginTransactionAsync();
            try
                {
                // 1) Map to entity
                var salesRequisition = new SalesRequisition
                    {
                    RefNo = _request.RefNo,
                    Date = _request.Date,
                    CustomerID = _request.CustomerID ?? 0,
                    SellerID = _request.SellerID ?? 0,
                    CustomerChildID = _request.CustomerChildID ?? 0,
                    StatusId = _request.StatusId,
                    Description = _request.Description,
                    TotalQuantity = _request.TotalQuantity ?? 0,
                    CreatedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "System",
                    CreatedOn = DateTime.Now,
                    SalesRequisitionChilds = new List<SalesRequisitionChild>()
                    
                    };

                // 2) Add children
                if (_request.SalesRequisitionChildRequests != null)
                    {
                    foreach (var childReq in _request.SalesRequisitionChildRequests)
                        {
                        salesRequisition.SalesRequisitionChilds.Add(new SalesRequisitionChild
                            {
                            ItemID = childReq.ItemID,
                            Quantity = childReq.Quantity ?? 0,
                            UnitId = childReq.UnitId ?? 0,
                            ConversionFactor = childReq.ConversionFactor ?? 0,
                            IsSecondaryUnit = childReq.IsSecondaryUnit ?? false,
                            ChildTotalQuantity = childReq.ChildTotalQuantity ?? 0
                            });
                        }
                    }

                // 3) Add files

                // 4) Persist the new SalesRequisition
                _context.SalesRequisitions.Add(salesRequisition);
                await _context.SaveChangesAsync();

                // 5) Build log payload
                var newPayload = System.Text.Json.JsonSerializer.Serialize(new
                    {
                    salesRequisition.SalesRequisitionID,
                    salesRequisition.RefNo,
                    salesRequisition.Date,
                    salesRequisition.CustomerID,
                    salesRequisition.SellerID,
                    salesRequisition.CustomerChildID,
                    salesRequisition.StatusId,
                    salesRequisition.Description,
                    salesRequisition.TotalQuantity,
                    Children = salesRequisition.SalesRequisitionChilds.Select(c => new
                        {
                        c.SalesRequisitionChildID,
                        c.ItemID,
                        c.Quantity,
                        c.UnitId,
                        c.ChildTotalQuantity
                        })
                   
                    });

                var currentUser = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "System";

                // 6) Create ActivityLog
                await _activityLogRepository.Create(new ActivityLog
                    {
                    MenuItemId = 23,                            // adjust to your menu ID
                    ParentTableId = salesRequisition.SalesRequisitionID,
                    ActionType = "Create",
                    OldData = null,
                    NewData = newPayload,
                    UserId = currentUser,
                    Date = DateTime.Now
                    });
                foreach (var formFile in attachments)
                    {
                    // match metadata by index (ensure front-end appends in same order)
                    var metaRef = _request.MultipleAttachments.ElementAtOrDefault(attachments.IndexOf(formFile))?.Referenceno ?? "";

                    var appFile = new MultipleAttachment
                        {
                        MenuItemId = 23,
                        MenuItemName = "Sales Requisitions",
                        ParentTableId = salesRequisition.SalesRequisitionID,
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
                // 7) Commit everything
                await transaction.CommitAsync();

                return Ok(salesRequisition);
                }
            catch (Exception ex)
                {
                await transaction.RollbackAsync();
                Console.WriteLine($"[AddSalesRequisition] error: {ex}");
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateSalesRequisition (
     int id,
     [FromForm] string request,
     [FromForm] List<IFormFile> attachments,
     [FromForm] string removeAttachmentIds
 )
            {
            // 1) Deserialize and validate
            var updatedReq = JsonSerializer.Deserialize<SalesRequisitionVM>(request);
            if (updatedReq == null || updatedReq.SalesRequisitionID != id)
                return BadRequest("Invalid request data.");

            var currentUser = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "Unknown";

            // 2) Begin transaction
            await using var tx = await _context.Database.BeginTransactionAsync();
            try
                {
                // 3) Load existing requisition, children & files
                var existing = await _context.SalesRequisitions
                    .Include(sr => sr.SalesRequisitionChilds)
                   
                    .FirstOrDefaultAsync(sr =>
                        sr.SalesRequisitionID == id &&
                        sr.IsActive == 1 && sr.IsDeleted == 0
                    );

                if (existing == null)
                    return NotFound("SalesRequisition not found.");

                // 4) Parse list of file-IDs to remove
                var toRemove = JsonSerializer.Deserialize<List<int>>(removeAttachmentIds)
                               ?? new List<int>();

                // 5) Capture old payload for logging
                var oldPayload = JsonSerializer.Serialize(new
                    {
                    existing.SalesRequisitionID,
                    existing.RefNo,
                    existing.Date,
                    existing.CustomerID,
                    existing.SellerID,
                    existing.CustomerChildID,
                    existing.StatusId,
                    existing.Description,
                    existing.TotalQuantity,
                    Children = existing.SalesRequisitionChilds.Select(c => new
                        {
                        c.SalesRequisitionChildID,
                        c.ItemID,
                        c.Quantity,
                        c.UnitId,
                        c.ChildTotalQuantity
                        })
                    }, new JsonSerializerOptions { ReferenceHandler = ReferenceHandler.IgnoreCycles });

                var originalStatus = existing.StatusId;

                // 6) Apply parent updates
                existing.RefNo = updatedReq.RefNo;
                existing.Date = updatedReq.Date;
                existing.CustomerID = updatedReq.CustomerID;
                existing.SellerID = updatedReq.SellerID;
                existing.CustomerChildID = updatedReq.CustomerChildID;
                existing.StatusId = updatedReq.StatusId;
                existing.Description = updatedReq.Description;
                existing.TotalQuantity = updatedReq.TotalQuantity;
                existing.ModifiedBy = currentUser;
                existing.ModifiedOn = DateTime.Now;

                // 7) Delete flagged children
                if (updatedReq.RemovedSalesRequisitionChildIds?.Any() == true)
                    {
                    foreach (var cid in updatedReq.RemovedSalesRequisitionChildIds)
                        {
                        existing.SalesRequisitionChilds.RemoveAll(c => c.SalesRequisitionChildID == cid);
                        _context.SalesRequisitionChilds.RemoveRange(
                            _context.SalesRequisitionChilds.Where(c => c.SalesRequisitionChildID == cid)
                        );
                        }
                    }

                // 8) Add or update children
                foreach (var vm in updatedReq.SalesRequisitionChildVMs)
                    {
                    if (vm.SalesRequisitionChildID == 0)
                        {
                        _context.SalesRequisitionChilds.Add(new SalesRequisitionChild
                            {
                            SalesRequisitionID = id,
                            ItemID = vm.ItemID,
                            Quantity = vm.Quantity,
                            UnitId = vm.UnitId,
                            ConversionFactor = vm.ConversionFactor,
                            IsSecondaryUnit = vm.IsSecondaryUnit,
                            ChildTotalQuantity = vm.ChildTotalQuantity
                            });
                        }
                    else
                        {
                        var child = existing.SalesRequisitionChilds
                                          .First(c => c.SalesRequisitionChildID == vm.SalesRequisitionChildID);
                        child.ItemID = vm.ItemID;
                        child.Quantity = vm.Quantity;
                        child.UnitId = vm.UnitId;
                        child.ConversionFactor = vm.ConversionFactor;
                        child.IsSecondaryUnit = vm.IsSecondaryUnit;
                        child.ChildTotalQuantity = vm.ChildTotalQuantity;
                        _context.Entry(child).State = EntityState.Modified;
                        }
                    }

                // 9) Delete flagged files
                if (updatedReq.RemovedSalesRequisitionFilesIds?.Any() == true)
                    {
                    foreach (var fid in updatedReq.RemovedSalesRequisitionFilesIds)
                        {
                      
                        _context.SalesRequisitionChildFiles.RemoveRange(
                            _context.SalesRequisitionChildFiles.Where(f => f.SalesRequisitionChildFileID == fid)
                        );
                        }
                    }

                // 10) Persist parent, children & file deletions
                await _context.SaveChangesAsync();

                // 11) Handle new attachments
                for (int i = 0; i < attachments.Count; i++)
                    {
                    var formFile = attachments[i];
                    var metaRef = updatedReq.MultipleAttachments
                                      .ElementAtOrDefault(i)?
                                      .Referenceno
                                  ?? "";

                    var appFile = new MultipleAttachment
                        {
                        MenuItemId = 23,                   // adjust to your menu‐ID
                        MenuItemName = "Sales Requisition",
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

                // 12) Remove any old attachments on disk/db
                if (toRemove.Any())
                    {
                    await _appFilesService.RemoveSpecificAttachmentsAsync(
                        menuItemId: 23,
                        parentTableId: id,
                        idsToRemove: toRemove
                    );
                    }

                // 13) Commit transaction
                await tx.CommitAsync();

                // 14) Log activity & revise if needed
                var newPayload = JsonSerializer.Serialize(new
                    {
                    existing.SalesRequisitionID,
                    existing.RefNo,
                    existing.Date,
                    existing.CustomerID,
                    existing.SellerID,
                    existing.CustomerChildID,
                    existing.StatusId,
                    existing.Description,
                    existing.TotalQuantity,
                    Children = existing.SalesRequisitionChilds.Select(c => new
                        {
                        c.SalesRequisitionChildID,
                        c.ItemID,
                        c.Quantity,
                        c.UnitId,
                        c.ChildTotalQuantity
                        })
                  
                    });

                await _activityLogRepository.Create(new ActivityLog
                    {
                    MenuItemId = 23,
                    ParentTableId = existing.SalesRequisitionID,
                    ActionType = "Update",
                    OldData = oldPayload,
                    NewData = newPayload,
                    UserId = currentUser,
                    Date = DateTime.Now
                    });

                if (originalStatus == Statuses.Approve)
                    {
                    await _reviseLogRepository.Create(new Reviselog
                        {
                        MenuItemId = 23,
                        ParentTableId = existing.SalesRequisitionID,
                        ActionType = "Revise",
                        OldData = oldPayload,
                        NewData = newPayload,
                        UserId = currentUser,
                        Date = DateTime.Now
                        });
                    }

                return Ok("SalesRequisition updated successfully.");
                }
            catch (Exception ex)
                {
                await tx.RollbackAsync();
                Console.WriteLine($"[UpdateSalesRequisition] {ex}");
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }


        [HttpGet("detail/{id}")]
        public async Task<IActionResult> DetailSalesRequisitionById ( int id )
            {
            try
                {
                // Fetch the SalesRequisition along with its child items and file records.
                var salesRequisition = await _context.SalesRequisitions
                    .Include(sr => sr.SalesRequisitionChilds)
                    
                    .FirstOrDefaultAsync(sr => sr.SalesRequisitionID == id && sr.IsActive == 1 && sr.IsDeleted == 0);

                if (salesRequisition == null)
                    {
                    return NotFound("SalesRequisition not found.");
                    }

                var attachments = await _context.Multipleattachments
  .Where(m =>
      m.MenuItemId == 23 &&
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
                // Map the DB model to the ViewModel.
                var vm = new SalesRequisitionVM
                    {
                    SalesRequisitionID = salesRequisition.SalesRequisitionID,
                    RefNo = salesRequisition.RefNo,
                    Date = salesRequisition.Date,
                    CustomerID = salesRequisition.CustomerID,
                    SellerID = salesRequisition.SellerID,
                    CustomerChildID = salesRequisition.CustomerChildID,
                    StatusId = salesRequisition.StatusId, // Added mapping for StatusId
                    Description = salesRequisition.Description,
                    TotalQuantity = salesRequisition.TotalQuantity,
                    // Map the child items.
                    SalesRequisitionChildVMs = salesRequisition.SalesRequisitionChilds.Select(child => new SalesRequisitionChildVM
                        {
                        SalesRequisitionChildID = child.SalesRequisitionChildID,
                        SalesRequisitionID = child.SalesRequisitionID,
                        ItemID = child.ItemID,
                        Quantity = child.Quantity,
                        ItemName = _context.Items.Where(u => u.ItemId == child.ItemID).Select(it => it.ItemName + ' ' + '(' + it.ItemCode + ')').FirstOrDefault(),
                        UnitName = _context.Units.Where(u => u.UnitId == child.UnitId).Select(u => u.UnitName).FirstOrDefault() + ((child.IsSecondaryUnit ?? false) ? " secondary" : ""),
                        UnitId = child.UnitId,
                        ConversionFactor = child.ConversionFactor,
                        IsSecondaryUnit = child.IsSecondaryUnit,
                        ChildTotalQuantity = child.ChildTotalQuantity,
                        }).ToList(),
                    // Map the file records.
                
                    // Initialize removed IDs lists as empty.
                    RemovedSalesRequisitionChildIds = new List<int>(),
                    RemovedSalesRequisitionFilesIds = new List<int>(),
                    MultipleAttachments = attachments
                    };

                return Ok(vm);
                }
            catch (Exception ex)
                {
                // Log the exception as needed, e.g. with a logging framework.
                Console.WriteLine($"Error: {ex.Message}");
                return StatusCode(500, "Internal server error.");
                }
            }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteSalesRequisition ( int id )
            {
            try
                {
                var salesRequisition = await _context.SalesRequisitions
                    .Include(c => c.SalesRequisitionChilds)
                    .FirstOrDefaultAsync(c => c.SalesRequisitionID == id);

                if (salesRequisition == null)
                    {
                    return NotFound("SalesRequisition not found");
                    }

                _context.SalesRequisitionChilds.RemoveRange(salesRequisition.SalesRequisitionChilds);

                // Remove the salesRequisition
                _context.SalesRequisitions.Remove(salesRequisition);

                await _context.SaveChangesAsync();
                return Ok("SalesRequisition deleted successfully");
                }
            catch (Exception ex)
                {
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }
        [HttpPut("changestatus/{id}")]
        public async Task<IActionResult> ChangeStatusSalesRequisition ( int id )
            {
            // Begin a transaction
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
                {
                // Fetch the SalesRequisition (including its child items)
                var salesRequisition = await _context.SalesRequisitions
                    .Include(c => c.SalesRequisitionChilds)
                    .FirstOrDefaultAsync(c => c.SalesRequisitionID == id && c.IsActive == 1 && c.IsDeleted == 0);

                if (salesRequisition == null)
                    {
                    return NotFound("SalesRequisition not found");
                    }

                var salesInvoiceIds = await _context.SalesInvoices
                  .Where(prc => prc.SalesRequisitionID == id)
                  .Select(prc => prc.SalesInvoiceID)    // your FK on the child
                  .Distinct()
                  .ToListAsync();

                if (salesInvoiceIds.Count > 0)
                    {
                    // 3) See if any of those parents have a non-void status
                    var hasUnvoidedSalesInvoice = await _context.SalesInvoices
                        .Where(pr => salesInvoiceIds.Contains(pr.SalesInvoiceID)
                                  && pr.StatusId != Statuses.Void)
                        .AnyAsync();

                    if (hasUnvoidedSalesInvoice)
                        return BadRequest("Cannot void invoice until all related payments are voided.");
                    }

                // Update the status to Void
                salesRequisition.StatusId = Statuses.Void;

                // Mark the SalesRequisition as updated.
                _context.SalesRequisitions.Update(salesRequisition);

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

        [HttpGet("GetNextSaleRefNumber")]
        public async Task<IActionResult> GetNextSaleRefNumber ( )
            {
            try
                {
                string ref_no = await _codeGenerator.GenerateReferenceNumber("salesrequisitions", "RefNo", "SR-2025", 4);
                return Ok(new { SaleRefNumber = ref_no });
                }
            catch (Exception ex)
                {
                // Log the exception and return an error status.
                Console.WriteLine($"Error: {ex.Message}");
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
        [HttpGet("get-customers")]
        public async Task<IActionResult> GetAllCustomers ( )
            {
            try
                {
                var items = await _context.Customers
                    .Where(a => a.IsActive == 1 && a.IsDeleted == 0)
                    .Select(c => new
                        {
                        c.CustomerId,
                        c.CustomerName
                        })
                    .ToListAsync();

                return Ok(items);
                }
            catch (Exception ex)
                {
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
        [HttpGet("get-conversionfactor")]
        public async Task<IActionResult> GetItemConversionFactor ( [FromQuery] ConversionFactorDTO conversionFactorDTO )
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
        [HttpGet("GetSalesRequisitionReportSP/{id}")]
        public async Task<IActionResult> GetSalesRequisitionReportSP ( int id )
            {
            try
                {
                var conn = _context.Database.GetDbConnection();
                await using var cmd = conn.CreateCommand();
                cmd.CommandText = "SP_GetSalesRequisitionReport";
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.Parameters.Add(new MySqlParameter("p_SalesRequisitionID", MySqlDbType.Int32)
                    {
                    Direction = ParameterDirection.Input,
                    Value = id
                    });

                if (conn.State != ConnectionState.Open)
                    await conn.OpenAsync();

                await using var reader = await cmd.ExecuteReaderAsync();

                // 1) Read the header / grand‐total row
                SalesRequisitionDto requisition = null;
                if (await reader.ReadAsync())
                    {
                    requisition = new SalesRequisitionDto
                        {
                        SalesRequisitionID = Convert.ToInt32(reader["SalesRequisitionID"]),
                        RefNo = reader["RefNo"].ToString(),
                        Date = reader["Date"] as DateTime?,
                        CustomerName = reader["CustomerName"].ToString(),
                        Address = reader["Address"].ToString(),
                        SellerName = reader["SellerName"].ToString(),
                        QuantityCTN = Convert.ToDecimal(reader["QuantityCTN"]),
                        QuantityPCS = Convert.ToDecimal(reader["QuantityPCS"]),
                        TotalQtyPCS = Convert.ToDecimal(reader["TotalQtyPCS"]),
                        Items = new List<SalesRequisitionItemDto>()
                        };
                    }
                else
                    {
                    return NotFound();
                    }

                // 2) Move to detail rows and populate Items
                if (await reader.NextResultAsync())
                    {
                    while (await reader.ReadAsync())
                        {
                        requisition.Items.Add(new SalesRequisitionItemDto
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

                return Ok(requisition);
                }
            catch (Exception ex)
                {
                // TODO: inject and use ILogger to log ex
                return StatusCode(500, "An error occurred while retrieving the requisition.");
                }
            }
        [HttpGet("GetPendingCountsSP")]
        public async Task<IActionResult> GetPendingCountsSP ( )
            {
            try
                {
                var results = new List<PendingCountDto>();

                // Get the raw DB connection
                var conn = _context.Database.GetDbConnection();
                await using var cmd = conn.CreateCommand();
                cmd.CommandText = "SP_GetPendingCount";
                cmd.CommandType = CommandType.StoredProcedure;

                if (conn.State != ConnectionState.Open)
                    await conn.OpenAsync();

                // Execute and read each row into our DTO
                await using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                    {
                    results.Add(new PendingCountDto
                        {
                        Table = reader.GetString("Table"),
                        Count_StatusId_2 = reader.GetInt32("Count_StatusId_2")
                        });
                    }

                return Ok(results);
                }
            catch (Exception ex)
                {
                // TODO: inject and use ILogger<DashboardController> to log the exception
                return StatusCode(500, "An error occurred while retrieving pending counts.");
                }
            }
        }


    }




