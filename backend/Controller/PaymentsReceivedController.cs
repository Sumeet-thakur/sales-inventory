using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SalesInventoryAPI.Data.Services;
using SalesInventoryAPI.Data;
using Microsoft.EntityFrameworkCore;
using static SalesInventoryAPI.Models.AppConstants;
using SalesInventoryAPI.Data.ViewModels;
using SalesInventoryAPI.Models;
using System.Security.Claims;
using System.Text.Json;
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
    public class PaymentsReceivedController : ControllerBase
        {
        private readonly InventoryDbContext _context;
        private readonly PermissionService _permissionService;
        private readonly ActivityLogRepository _activityLogRepository;
        private readonly ReviseLogRepository _reviseLogRepository;
        private readonly CodeGenerator _codeGenerator;
        private readonly AppFilesService _appFilesService;
        public PaymentsReceivedController ( InventoryDbContext context, PermissionService permissionService, ActivityLogRepository activityLogRepository, CodeGenerator codeGenerator, ReviseLogRepository reviseLogRepository, AppFilesService appFilesService )
            {
            _context = context;
            _permissionService = permissionService;
            _activityLogRepository = activityLogRepository;
            _codeGenerator = codeGenerator;
            _reviseLogRepository = reviseLogRepository;
            _appFilesService = appFilesService;

            }

        [HttpPost("AddPaymentReceived")]
        public async Task<IActionResult> AddPaymentReceived (
    [FromForm] string request,             // JSON payload
    [FromForm] List<IFormFile> attachments // multiple files
)
            {
            var vm = JsonSerializer.Deserialize<PaymentReceivedVM>(request);
            if (vm == null) return BadRequest("Invalid payload.");

            var currentUser = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "System";

            await using var tx = await _context.Database.BeginTransactionAsync();
            try
                {
                // 1) Map VM → EF entity
                var payment = new PaymentReceived
                    {
                    RefNo = vm.RefNo,
                    PaymentDate = vm.PaymentDate,
                    CustomerID = vm.CustomerID,
                    PaymentAmount = vm.PaymentAmount,
                    PaymentModeId = vm.PaymentModeId,
                    ReceivedBy = vm.ReceivedBy,
                    ReferenceNumber = vm.ReferenceNumber,
                    StatusId = Statuses.Draft,
                    IsActive = 1,
                    IsDeleted = 0,
                    CreatedBy = currentUser,
                    CreatedOn = DateTime.Now,
                    PaymentReceivedChildren = new List<PaymentReceivedChild>()
                    };

                // 2) Map each child VM → EF child entity
                foreach (var childVm in vm.PaymentReceivedChildVMs)
                    {
                    payment.PaymentReceivedChildren.Add(new PaymentReceivedChild
                        {
                        SalesInvoiceID = childVm.SalesInvoiceID,
                        PaidAmount = childVm.PaidAmount,
                        IsActive = 1,
                        IsDeleted = 0
                        });
                    }

                // 3) Persist the new payment
                _context.PaymentReceived.Add(payment);
                await _context.SaveChangesAsync();

                // 4) Build ActivityLog payload
                var newChildrenLog = payment.PaymentReceivedChildren.Select(c => new
                    {
                    c.PaymentReceivedChildID,
                    c.SalesInvoiceID,
                    c.PaidAmount
                    }).ToList();

                var newPayload = System.Text.Json.JsonSerializer.Serialize(new
                    {
                    payment.PaymentReceivedID,
                    payment.RefNo,
                    payment.PaymentDate,
                    payment.CustomerID,
                    payment.PaymentAmount,
                    payment.PaymentModeId,
                    payment.ReceivedBy,
                    payment.ReferenceNumber,
                    Children = newChildrenLog
                    });

                // 5) Write ActivityLog
                await _activityLogRepository.Create(new ActivityLog
                    {
                    MenuItemId = 26,  // ← adjust to your PaymentsReceived menu ID
                    ParentTableId = payment.PaymentReceivedID,
                    ActionType = "Create",
                    OldData = null,
                    NewData = newPayload,
                    UserId = currentUser,
                    Date = DateTime.Now
                    });


                foreach (var formFile in attachments)
                    {
                    // match metadata by index (ensure front-end appends in same order)
                    var metaRef = vm.MultipleAttachments.ElementAtOrDefault(attachments.IndexOf(formFile))?.Referenceno ?? "";

                    var appFile = new MultipleAttachment
                        {
                        MenuItemId = 26,
                        MenuItemName = "PaymentReceived",
                        ParentTableId = payment.PaymentReceivedID,
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


                // 6) Commit
                await tx.CommitAsync();

                return Ok(payment);
                }
            catch (Exception ex)
                {
                await tx.RollbackAsync();
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update (
    int id,
    [FromForm] string request,
    [FromForm] List<IFormFile> attachments,
    [FromForm] string removeAttachmentIds  // JSON array of ints
)
            {
            // 1) Deserialize VM
            var vm = JsonSerializer.Deserialize<PaymentReceivedVM>(request);
            if (vm == null || vm.PaymentReceivedID != id)
                return BadRequest("Invalid request data.");

            await using var tx = await _context.Database.BeginTransactionAsync();
            try
                {
                // 2) Load existing payment + children
                var payment = await _context.PaymentReceived
                    .Include(p => p.PaymentReceivedChildren)
                    .FirstOrDefaultAsync(p => p.PaymentReceivedID == id);
                if (payment == null)
                    return NotFound($"PaymentReceived with ID {id} not found.");
                var toRemove = JsonSerializer.Deserialize<List<int>>(removeAttachmentIds) ?? new List<int>();


                var currentUser = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "System";
                var originalStatus = payment.StatusId;
                var checkRevise = originalStatus == Statuses.Approve;

                // 3) Capture old payload for logs
                var oldChildrenLog = payment.PaymentReceivedChildren
                    .Where(c => c.IsDeleted == 0)
                    .Select(c => new
                        {
                        c.PaymentReceivedChildID,
                        c.SalesInvoiceID,
                        c.PaidAmount
                        })
                    .ToList();
                var oldPayload = new
                    {
                    payment.PaymentReceivedID,
                    payment.RefNo,
                    payment.PaymentDate,
                    payment.CustomerID,
                    payment.PaymentAmount,
                    payment.PaymentModeId,
                    payment.ReceivedBy,
                    payment.ReferenceNumber,
                    Children = oldChildrenLog
                    };

               // //4) Remove old attachments
               //await _appFilesService.RemoveAttachmentsAsync(
               //    menuItemId: 26,
               //    parentTableId: id
               //);

                // 5) Update scalar props
                payment.RefNo = vm.RefNo;
                payment.PaymentDate = vm.PaymentDate;
                payment.CustomerID = vm.CustomerID;
                payment.PaymentAmount = vm.PaymentAmount;
                payment.PaymentModeId = vm.PaymentModeId;
                payment.ReceivedBy = vm.ReceivedBy;
                payment.StatusId = vm.StatusId;
                payment.ReferenceNumber = vm.ReferenceNumber;
                payment.ModifiedBy = currentUser;
                payment.ModifiedOn = DateTime.Now;

                // 6) Replace children
                _context.PaymentReceivedChildren.RemoveRange(payment.PaymentReceivedChildren);
                payment.PaymentReceivedChildren.Clear();
                foreach (var childVm in vm.PaymentReceivedChildVMs)
                    {
                    payment.PaymentReceivedChildren.Add(new PaymentReceivedChild
                        {
                        SalesInvoiceID = childVm.SalesInvoiceID,
                        PaidAmount = childVm.PaidAmount,
                        IsActive = 1,
                        IsDeleted = 0
                        });

                    // Update SalesInvoice status if approving or revising
                    if (vm.StatusId == Statuses.Approve || checkRevise)
                        {
                        var paymentStatus = await GetPaymentStatus(
                            childVm.SalesInvoiceID,
                            childVm.PaidAmount
                        );
                        var salesInvoice = await _context.SalesInvoices
                            .FirstOrDefaultAsync(s => s.SalesInvoiceID == childVm.SalesInvoiceID);
                        if (salesInvoice != null)
                            {
                            salesInvoice.PaymentStatusId = paymentStatus;
                            if (salesInvoice.PaidAmount != 0) {
                                salesInvoice.OutstandingAmount -= childVm.PaidAmount;
                                salesInvoice.PaidAmount += childVm.PaidAmount;
                                if (salesInvoice.PaidAmount == salesInvoice.NetAmount)
                                    {
                                    salesInvoice.PaymentStatusId = PaymentStatuses.Paid;
                                    salesInvoice.InvoiceStatusId = InvoiceStatuses.PaymentReceived;
                                    }
                                else if (salesInvoice.OutstandingAmount < salesInvoice.NetAmount)
                                    {
                                    salesInvoice.PaymentStatusId = PaymentStatuses.PartialPaid;
                                    salesInvoice.InvoiceStatusId = InvoiceStatuses.Open;
                                    }
                                else if (salesInvoice.OutstandingAmount > salesInvoice.NetAmount)
                                    {
                                    salesInvoice.PaymentStatusId = PaymentStatuses.OverPaid;
                                    salesInvoice.InvoiceStatusId = InvoiceStatuses.Open;
                                    }

                                }
                            else
                                {
                                salesInvoice.PaidAmount = childVm.PaidAmount;
                                salesInvoice.OutstandingAmount = salesInvoice.NetAmount - salesInvoice.PaidAmount;
                                if (paymentStatus == PaymentStatuses.Paid)
                                    salesInvoice.InvoiceStatusId = InvoiceStatuses.PaymentReceived;
                                }
                                _context.SalesInvoices.Update(salesInvoice);
                            }
                        }
                    }

                _context.PaymentReceived.Update(payment);
                await _context.SaveChangesAsync();

                // 7) Upload new attachments
                for (int i = 0; i < attachments.Count; i++)
                    {
                    var formFile = attachments[i];
                    var metaRef = vm.MultipleAttachments.ElementAtOrDefault(i)?.Referenceno ?? "";

                    var appFile = new MultipleAttachment
                        {
                        MenuItemId = 26,
                        MenuItemName = "PaymentReceived",
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

                // 8) Build new payload for logs
                var newChildrenLog = payment.PaymentReceivedChildren
                    .Where(c => c.IsDeleted == 0)
                    .Select(c => new
                        {
                        c.PaymentReceivedChildID,
                        c.SalesInvoiceID,
                        c.PaidAmount
                        })
                    .ToList();
                var newPayload = new
                    {
                    payment.PaymentReceivedID,
                    payment.RefNo,
                    payment.PaymentDate,
                    payment.CustomerID,
                    payment.PaymentAmount,
                    payment.PaymentModeId,
                    payment.ReceivedBy,
                    payment.ReferenceNumber,
                    Children = newChildrenLog
                    };

                // 9) Write ActivityLog
                await _activityLogRepository.Create(new ActivityLog
                    {
                    MenuItemId = 26,
                    ParentTableId = payment.PaymentReceivedID,
                    ActionType = "Update",
                    OldData = JsonSerializer.Serialize(oldPayload),
                    NewData = JsonSerializer.Serialize(newPayload),
                    UserId = currentUser,
                    Date = DateTime.Now
                    });

                // 10) If originally Approved, write a ReviseLog
                if (originalStatus == Statuses.Approve)
                    {
                    await _reviseLogRepository.Create(new Reviselog
                        {
                        MenuItemId = 26,
                        ParentTableId = payment.PaymentReceivedID,
                        ActionType = "Revise",
                        OldData = JsonSerializer.Serialize(oldPayload),
                        NewData = JsonSerializer.Serialize(newPayload),
                        UserId = currentUser,
                        Date = DateTime.Now
                        });
                    }

                if (toRemove.Any())
                    {
                    await _appFilesService.RemoveSpecificAttachmentsAsync(
                        menuItemId: 26,
                        parentTableId: id,
                        idsToRemove: toRemove
                    );
                    }

                await tx.CommitAsync();
                return Ok(payment);
                }
            catch (Exception ex)
                {
                await tx.RollbackAsync();

                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }


        [HttpGet("{id}")]
        public async Task<IActionResult> GetById ( int id )
            {
            var vm = await _context.PaymentReceived
                .Where(p => p.PaymentReceivedID == id
                         && p.IsActive == 1
                         && p.IsDeleted == 0)
                .Select(p => new PaymentReceivedVM
                    {
                    PaymentReceivedID = p.PaymentReceivedID,
                    RefNo = p.RefNo,
                    PaymentDate = p.PaymentDate,
                    CustomerID = p.CustomerID,
                    PaymentAmount = p.PaymentAmount,
                    PaymentModeId = p.PaymentModeId,
                    ReceivedBy = p.ReceivedBy,
                    ReferenceNumber = p.ReferenceNumber,
                    StatusId = p.StatusId,

                    // children as before
                    PaymentReceivedChildVMs = p.PaymentReceivedChildren
                        .Where(c => c.IsActive == 1 && c.IsDeleted == 0)
                        .Select(c => new PaymentReceivedChildVM
                            {
                            PaymentReceivedChildID = c.PaymentReceivedChildID,
                            PaymentReceivedID = c.PaymentReceivedID,
                            SalesInvoiceID = c.SalesInvoiceID,
                            PaidAmount = c.PaidAmount
                            })
                        .ToList(),

                    // ← here’s the magic: fetch attachments by hand
                    MultipleAttachments = _context.Multipleattachments
                        .Where(m =>
                            m.MenuItemId == 26 &&
                            m.ParentTableId == p.PaymentReceivedID &&
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
                .FirstOrDefaultAsync();

            if (vm == null)
                return NotFound($"PaymentReceived with ID {id} not found.");

            return Ok(vm);
            }

        [HttpGet("detailpaymentreceived/{id}")]
        public async Task<IActionResult> DetailById ( int id )
            {
            try
                {
                var payment = await _context.PaymentReceived
                    .Where(p => p.PaymentReceivedID == id
                             && p.IsActive == 1
                             && p.IsDeleted == 0)
                    .Include(p => p.PaymentReceivedChildren)
                    .Select(p => new
                        {
                        PaymentReceivedID = p.PaymentReceivedID,
                        RefNo = p.RefNo,
                        PaymentDate = p.PaymentDate,
                        CustomerID = p.CustomerID,
                        CustomerName = _context.Customers.Where(c => c.CustomerId == p.CustomerID).Select(c => c.CustomerName).FirstOrDefault(),
                        PaymentAmount = p.PaymentAmount,
                        PaymentModeId = p.PaymentModeId,
                        PaymentModeName = _context.PaymentModes.Where(c => c.PaymentModeId == p.PaymentModeId).Select(c => c.PaymentModeName).FirstOrDefault(),
                        ReceivedBy = _context.Users.Where(u => u.Id == p.ReceivedBy).Select(u => u.UserName).FirstOrDefault(),
                        ReferenceNumber = p.ReferenceNumber,
                        StatusId = p.StatusId,
                        StatusName = _context.Statuses.Where(s => s.StatusId == p.StatusId).Select(s => s.StatusName).FirstOrDefault(),
                        PaymentReceivedChildVMs = p.PaymentReceivedChildren
                                                    .Where(c => c.IsActive == 1 && c.IsDeleted == 0)
                                                    .Select(c => new
                                                        {
                                                        PaymentReceivedChildID = c.PaymentReceivedChildID,
                                                        PaymentReceivedID = c.PaymentReceivedID,
                                                        SalesInvoiceID = c.SalesInvoiceID,
                                                        PaidAmount = c.PaidAmount,
                                                        RefNo = _context.SalesInvoices.Where(s => s.SalesInvoiceID == c.SalesInvoiceID).Select(s => s.RefNo).FirstOrDefault(),
                                                        PaymentStatusId = _context.SalesInvoices.Where(s => s.SalesInvoiceID == c.SalesInvoiceID).Select(s => s.PaymentStatusId).FirstOrDefault(),
                                                        InvoiceDate = _context.SalesInvoices.Where(s => s.SalesInvoiceID == c.SalesInvoiceID).Select(s => s.InvoiceDate).FirstOrDefault(),
                                                        NetAmount = _context.SalesInvoices.Where(s => s.SalesInvoiceID == c.SalesInvoiceID).Select(s => s.NetAmount).FirstOrDefault(),
                                                        OutstandingAmount = _context.SalesInvoices.Where(s => s.SalesInvoiceID == c.SalesInvoiceID).Select(s => s.OutstandingAmount).FirstOrDefault(),

                                                        })
                                                    .ToList(),
                        MultipleAttachments = _context.Multipleattachments
                        .Where(m =>
                            m.MenuItemId == 26 &&
                            m.ParentTableId == p.PaymentReceivedID &&
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
                    .FirstOrDefaultAsync();

                if (payment == null)
                    return NotFound($"PaymentReceived with ID {id} not found.");

                return Ok(payment);
                }
            catch (Exception ex)
                {
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }

        [HttpGet("get-all-paymentreceived")]
        public async Task<IActionResult> GetAllPaymentReceived ( )
            {
            try
                {
                var paymentReceiveds = await _context.PaymentReceived
                    .Where(a => a.IsActive == 1 && a.IsDeleted == 0)
                    .Select(p => new
                        {
                        p.PaymentReceivedID,
                        p.RefNo,
                        p.PaymentDate,
                        p.PaymentAmount,
                        CustomerName = _context.Customers.Where(u => u.CustomerId == p.CustomerID).Select(u => u.CustomerName).FirstOrDefault(),
                        PaymentModeName = _context.PaymentModes.Where(u => u.PaymentModeId == p.PaymentModeId).Select(u => u.PaymentModeName).FirstOrDefault(),
                        p.StatusId,
                        StatusName = _context.Statuses.Where(s => s.StatusId == p.StatusId).Select(s => s.StatusName).FirstOrDefault()

                        })
                    .ToListAsync();

                var indexedpaymentReceiveds = paymentReceiveds.Select(( pr, index ) => new
                    {
                    Index = index + 1,  // Using index + 1 so that indexing starts at 1
                    pr.PaymentReceivedID,
                    pr.RefNo,
                    pr.PaymentDate,
                    pr.PaymentAmount,
                    pr.CustomerName,
                    pr.PaymentModeName,
                    pr.StatusId,
                    pr.StatusName

                    }).ToList();

                return Ok(indexedpaymentReceiveds);
                }
            catch (Exception ex)
                {
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }


        [HttpGet("GetNextPaymentRefNumber")]
        public async Task<IActionResult> GetNextPriceRefNumber ( )
            {
            try
                {
                string ref_no = await _codeGenerator.GenerateReferenceNumber("paymentreceived", "RefNo", "REC-2025", 3);
                return Ok(new { PaymentRefNumber = ref_no });
                }
            catch (Exception ex)
                {
                // Log the exception and return an error status.
                Console.WriteLine($"Error: {ex.Message}");
                return StatusCode(500, "Internal server error.");
                }
            }


        [HttpGet("get-paymentmode")]
        public async Task<IActionResult> GetPaymentMode ( )
            {
            try
                {
                var items = await _context.PaymentModes
                    .Where(a => a.IsActive == 1 && a.IsDeleted == 0)
                    .Select(c => new
                        {
                        c.PaymentModeId,
                        c.PaymentModeName
                        })
                    .ToListAsync();

                return Ok(items);
                }
            catch (Exception ex)
                {
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }

        [HttpGet("get-invoicenumber/{customerID}")]
        public async Task<IActionResult> GetInvoiceNumber ( int customerID )
            {
            try
                {
                var items = await _context.SalesInvoices
                    // base filters
                    .Where(si =>
                        si.IsActive == 1 &&
                        si.IsDeleted == 0 &&
                        si.CustomerID == customerID &&
                        si.StatusId == Statuses.Approve &&
                        si.PaymentStatusId != PaymentStatuses.Paid
                    )
                    // LEFT JOIN to children
                    .GroupJoin(
                        _context.PaymentReceivedChildren,
                        si => si.SalesInvoiceID,
                        prc => prc.SalesInvoiceID,
                        ( si, prcGroup ) => new { si, prcGroup }
                    )
                    .SelectMany(
                        x => x.prcGroup.DefaultIfEmpty(),
                        ( x, prc ) => new { x.si, prc }
                    )
                    // LEFT JOIN to non-void payments
                    .GroupJoin(
                        _context.PaymentReceived.Where(pc => pc.StatusId != Statuses.Void),
                        x => x.prc != null ? x.prc.PaymentReceivedID : -1,
                        pc => pc.PaymentReceivedID,
                        ( x, pcGroup ) => new { x.si, x.prc, pcGroup }
                    )
                    .SelectMany(
                        x => x.pcGroup.DefaultIfEmpty(),
                        ( x, pc ) => new { x.si, pc }
                    )
                    // only invoices with NO non-void payment (pc == null)
                    .Where(x => x.pc == null)
                    // project just the fields you need
                    .Select(x => new
                        {
                        x.si.SalesInvoiceID,
                        x.si.RefNo,
                        x.si.PaymentStatusId,
                        x.si.InvoiceDate,
                        x.si.NetAmount,
                        x.si.OutstandingAmount
                        })
                    // collapse duplicates
                    .Distinct()
                    .ToListAsync();

                return Ok(items);
                }
            catch (Exception ex)
                {
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }

        [HttpGet("GetInvoiceNumbersSP/{customerId}")]
        public async Task<IActionResult> GetInvoiceNumbersSP ( int customerId )
            {
            try
                {
                // 1) prepare command
                var conn = _context.Database.GetDbConnection();
                await using var cmd = conn.CreateCommand();
                cmd.CommandText = "SP_GetInvoiceNumber";
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.Parameters.Add(new MySqlParameter("p_CustomerID", MySqlDbType.Int32)
                    {
                    Direction = ParameterDirection.Input,
                    Value = customerId
                    });

                // 2) open connection
                if (conn.State != ConnectionState.Open)
                    await conn.OpenAsync();

                // 3) execute and read all rows
                var invoices = new List<InvoiceNumberDto>();
                await using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                    {
                    invoices.Add(new InvoiceNumberDto
                        {
                        SalesInvoiceID = Convert.ToInt32(reader["SalesInvoiceID"]),
                        RefNo = reader["RefNo"].ToString()!,
                        PaymentStatusId = Convert.ToInt32(reader["PaymentStatusId"]),
                        InvoiceDate = reader["InvoiceDate"] as DateTime? ?? default,
                        NetAmount = Convert.ToDecimal(reader["NetAmount"]),
                        OutstandingAmount = Convert.ToDecimal(reader["OutstandingAmount"])
                        });
                    }

                // 4) return
                if (!invoices.Any())
                    return NotFound($"No invoices found for customer {customerId}.");

                return Ok(invoices);
                }
            catch (Exception ex)
                {
                // ideally log ex here…
                return StatusCode(500, "An error occurred while retrieving invoice numbers.");
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
        [HttpPut("changestatus/{id}")]
        public async Task<IActionResult> ChangeStatusSalesRequisition ( int id )
            {
            // 1. Start a DB transaction
            await using var transaction = await _context.Database.BeginTransactionAsync();
            try
                {
                // 2. Load the PaymentReceived along with its children
                var paymentReceived = await _context.PaymentReceived
                    .Include(pr => pr.PaymentReceivedChildren)
                    .FirstOrDefaultAsync(pr => pr.PaymentReceivedID == id
                                               && pr.IsActive == 1
                                               && pr.IsDeleted == 0);

                if (paymentReceived == null)
                    return NotFound("Payment Received not found");

                // 3. Process each child record
                foreach (var child in paymentReceived.PaymentReceivedChildren)
                    {
                    var salesInvoice = await _context.SalesInvoices
                        .FirstOrDefaultAsync(si => si.SalesInvoiceID == child.SalesInvoiceID
                                                   && si.IsActive == 1
                                                   && si.IsDeleted == 0);

                    if (salesInvoice == null)
                        {
                        await transaction.RollbackAsync();
                        return BadRequest($"SalesInvoice ID {child.SalesInvoiceID} not found.");
                        }

                    // reverse the payment that was applied
                    decimal reversal = (decimal)child.PaidAmount;

                    // get current PaidAmount (or 0 if null)
                    decimal currentPaid = salesInvoice.PaidAmount ?? 0m;

                    // subtract and clamp to zero
                    decimal updatedPaid = currentPaid - reversal;
                    salesInvoice.PaidAmount = updatedPaid > 0m ? updatedPaid : 0m;

                    // recalc OutstandingAmount as NetAmount minus PaidAmount
                    // (also clamp if you’d like)
                    decimal net = (decimal)salesInvoice.NetAmount;
                    decimal paidNow = salesInvoice.PaidAmount ?? 0m;
                    decimal outstanding = net - paidNow;
                    salesInvoice.OutstandingAmount = outstanding > 0m ? outstanding : 0m;

                    // recompute status
                    if (salesInvoice.OutstandingAmount == salesInvoice.NetAmount)
                        {
                        salesInvoice.PaymentStatusId = PaymentStatuses.Unpaid;
                        salesInvoice.InvoiceStatusId = InvoiceStatuses.Open;
                        }
                    else if (salesInvoice.PaidAmount == salesInvoice.NetAmount)
                        {
                        salesInvoice.PaymentStatusId = PaymentStatuses.Paid;
                        }
                    else if (salesInvoice.PaidAmount < salesInvoice.NetAmount)
                        {
                        salesInvoice.PaymentStatusId = PaymentStatuses.PartialPaid;
                        }
                    else { 
                        salesInvoice.PaymentStatusId = PaymentStatuses.OverPaid;
                        }
                    _context.SalesInvoices.Update(salesInvoice);
                    }
                // 4. Finally, void the PaymentReceived
                paymentReceived.StatusId = Statuses.Void;
                _context.PaymentReceived.Update(paymentReceived);

                // 5. Persist *all* changes and commit
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok("Payment Received status changed successfully");
                }
            catch (Exception ex)
                {
                // 6. Any thrown exception → rollback
                await transaction.RollbackAsync();
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }


        private async Task<string> GetUserRoleIdAsync ( )
            {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                {
                return null; // User not authenticated
                }

            var userRole = await _context.UserRoles
                .Where(ur => ur.UserId == userId)
                .Select(ur => ur.RoleId)
                .FirstOrDefaultAsync();

            return userRole;
            }

        private async Task<int> GetPaymentStatus ( int? SalesInvoiceID, decimal? PaidAmount )
            {
            int _PaymentStatus = 0;

            var invoicePaidAmount = _context.SalesInvoices
                .Where(s => s.SalesInvoiceID == SalesInvoiceID && s.IsActive == 1 && s.IsDeleted == 0)
                .Select(s => s.NetAmount)
                .FirstOrDefault();

            switch (invoicePaidAmount)
                {
                case var amount when amount == PaidAmount:
                    _PaymentStatus = 3; // Paid
                    break;
                case var amount when amount < PaidAmount:
                    _PaymentStatus = 4; // Overpaid
                    break;
                case var amount when amount > PaidAmount:
                    _PaymentStatus = 2; // Partial
                    break;
                default:
                    _PaymentStatus = 0; // Default case (if needed)
                    break;
                }

            return _PaymentStatus;
            }
        [HttpGet("download-file")]
        public IActionResult DownloadFile ( )
            {
            var filePath = "path_to_your_file";
            var mimeType = "application/octet-stream"; // or the actual MIME type

            var fileName = "your_filename.ext";
            var fileBytes = System.IO.File.ReadAllBytes(filePath);

            return File(fileBytes, mimeType, fileName);
            }

        }
    }



