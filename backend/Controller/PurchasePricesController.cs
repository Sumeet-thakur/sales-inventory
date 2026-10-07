using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SalesInventoryAPI.Data.Services;
using SalesInventoryAPI.Data;
using Microsoft.EntityFrameworkCore;
using SalesInventoryAPI.Data.ViewModels;
using SalesInventoryAPI.Models;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using SalesInventoryAPI.Data.DTOs;
using System.Data;

namespace SalesInventoryAPI.Controller
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class PurchasePricesController : ControllerBase
        {
        private readonly InventoryDbContext _context;
        private readonly PermissionService _permissionService;
        private readonly ActivityLogRepository _activityLogRepository;
        private readonly CodeGenerator _codeGenerator;

        // Constructor injection for database context, permission service and activity log repository.
        public PurchasePricesController ( InventoryDbContext context, PermissionService permissionService, ActivityLogRepository activityLogRepository, CodeGenerator codeGenerator )
            {
            _context = context;
            _permissionService = permissionService;
            _activityLogRepository = activityLogRepository;
            _codeGenerator = codeGenerator;

            }

        [HttpGet("GetNextPurchasePricesRefNumber")]
        public async Task<IActionResult> GetNextPurchasePricesRefNumber ( )
            {
            try
                {
                string ref_no = await _codeGenerator.GenerateReferenceNumber("purchaseprices", "PurchasePriceRefNumber", "PLP", 4);
                return Ok(new { PriceRefNumber = ref_no });
                }
            catch (Exception ex)
                {
                // Log the exception and return an error status.
                Console.WriteLine($"Error: {ex.Message}");
                return StatusCode(500, "Internal server error.");
                }
            }
        // GET: api/PurchasePrices/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById ( int id )
            {
            var entity = await _context.PurchasePrices.Include(pp => pp.PurchasePriceListItems).FirstOrDefaultAsync(pp => pp.PurchasePriceId == id && pp.IsDeleted == 0 && pp.IsActive == 1);

            if (entity == null)
                return NotFound($"PurchasePrice with ID {id} not found.");

            // Map to VM
            var vm = new PurchasePriceVM
                {
                PurchasePriceId = entity.PurchasePriceId,
                PurchasePriceRefNumber = entity.PurchasePriceRefNumber,
                PurchasePriceDate = entity.PurchasePriceDate,
                PurchasePriceListItemVMs = entity.PurchasePriceListItems
                    .Where(c => c.IsDeleted == 0 && c.IsActive == 1)
                    .Select(c => new PurchasePriceListItemVM
                        {
                        PurchasePriceListItemChilId = c.PurchasePriceListItemChilId,
                        PurchasePriceId = c.PurchasePriceId,
                        ItemId = c.ItemId,
                        Description = c.Description,
                        TotalQuantity = c.TotalQuantity,
                        OldPurchasePrice = c.OldPurchasePrice,
                        NewPurchasePrice = c.NewPurchasePrice,
                        Date = c.Date,

                        })
                    .ToList()
                };

            return Ok(vm);
            }

        // POST: api/PurchasePrices
        [HttpPost]
        public async Task<IActionResult> Create ( [FromBody] PurchasePriceVM request )
            {
            if (request == null)
                return BadRequest("Request body cannot be null.");

            await using var transaction = await _context.Database.BeginTransactionAsync();
            try
                {
                // 1) Build the PurchasePrice + its list-items
                var currentUser = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "System";
                var entity = new PurchasePrice
                    {
                    PurchasePriceRefNumber = request.PurchasePriceRefNumber,
                    PurchasePriceDate = request.PurchasePriceDate,
                    IsActive = 1,
                    IsDeleted = 0,
                    CreatedBy = currentUser,
                    CreatedOn = DateTime.Now
                    };

                foreach (var child in request.PurchasePriceListItemVMs)
                    {
                    entity.PurchasePriceListItems.Add(new PurchasePriceListItem
                        {
                        ItemId = child.ItemId,
                        Description = "",
                        TotalQuantity = child.TotalQuantity ?? 0,
                        OldPurchasePrice = child.OldPurchasePrice ?? 0,
                        NewPurchasePrice = child.NewPurchasePrice ?? 0,
                        Date = DateTime.Now,
                        IsActive = 1,
                        IsDeleted = 0,
                        CreatedBy = currentUser,
                        CreatedOn = DateTime.Now
                        });
                    }

                // 2) Add to EF change tracker
                await _context.PurchasePrices.AddAsync(entity);

                // 3) Update master Item.PurchasePrice for each child
                foreach (var child in request.PurchasePriceListItemVMs)
                    {
                    if (child.ItemId == null) continue;
                    var item = await _context.Items.FindAsync(child.ItemId.Value);
                    if (item != null)
                        {
                        item.PurchasePrice = child.NewPurchasePrice ?? item.PurchasePrice;
                        _context.Items.Update(item);
                        }
                    }

                // 4) Persist to database
                await _context.SaveChangesAsync();

                // 5) Activity log
                //    Build a minimal payload to capture what changed
                var logPayload = new
                    {
                    Parent = new
                        {
                        entity.PurchasePriceId,
                        entity.PurchasePriceRefNumber,
                        entity.PurchasePriceDate
                        },
                    Children = request.PurchasePriceListItemVMs
                        .Select(c => new
                            {
                            c.ItemId,
                            c.TotalQuantity,
                            c.OldPurchasePrice,
                            c.NewPurchasePrice
                            })
                        .ToList()
                    };

                await _activityLogRepository.Create(new ActivityLog
                    {
                    MenuItemId = 31,                                 // your menu/item code
                    ParentTableId = entity.PurchasePriceId,             // the real PK
                    ActionType = "Create",
                    OldData = string.Empty,
                    NewData = System.Text.Json.JsonSerializer.Serialize(logPayload),
                    UserId = currentUser,
                    Date = DateTime.Now
                    });

                // 6) Commit transaction
                await transaction.CommitAsync();

                // 7) Return CreatedAt with new ID
                return CreatedAtAction(
                    nameof(GetById),
                    new { id = entity.PurchasePriceId },
                    new { entity.PurchasePriceId }
                );
                }
            catch (Exception ex)
                {
                await transaction.RollbackAsync();
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }


        // PUT: api/PurchasePrices/5
        [HttpPut("{id}")]
        public async Task<IActionResult> Update ( int id, [FromBody] PurchasePriceVM request )
            {
            if (request == null || request.PurchasePriceId != id)
                return BadRequest("Invalid request data.");

            await using var transaction = await _context.Database.BeginTransactionAsync();

            try
                {
                // 1) Load parent + existing children
                var entity = await _context.PurchasePrices
                    .Include(pp => pp.PurchasePriceListItems)
                    .FirstOrDefaultAsync(pp => pp.PurchasePriceId == id
                                            && pp.IsDeleted == 0
                                            && pp.IsActive == 1);
                if (entity == null)
                    return NotFound($"PurchasePrice with ID {id} not found.");

                // 2) Capture old state for logging
                var oldData = new
                    {
                    Parent = new
                        {
                        entity.PurchasePriceId,
                        entity.PurchasePriceRefNumber,
                        entity.PurchasePriceDate
                        },
                    Children = entity.PurchasePriceListItems
                        .Select(c => new
                            {
                            c.PurchasePriceListItemChilId,  // if you have an ID
                            c.ItemId,
                            c.TotalQuantity,
                            c.OldPurchasePrice,
                            c.NewPurchasePrice
                            })
                        .ToList()
                    };

                // 3) Update parent fields
                var currentUser = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "System";
                entity.PurchasePriceRefNumber = request.PurchasePriceRefNumber;
                entity.PurchasePriceDate = request.PurchasePriceDate;
                entity.ModifiedBy = currentUser;
                entity.ModifiedOn = DateTime.Now;

                // 4) Remove old children
                _context.PurchasePriceListItems.RemoveRange(entity.PurchasePriceListItems);
                entity.PurchasePriceListItems.Clear();

                // 5) Add new children from request
                foreach (var child in request.PurchasePriceListItemVMs)
                    {
                    entity.PurchasePriceListItems.Add(new PurchasePriceListItem
                        {
                        ItemId = child.ItemId,
                        Description = "",
                        TotalQuantity = child.TotalQuantity ?? 0,
                        OldPurchasePrice = child.OldPurchasePrice ?? 0,
                        NewPurchasePrice = child.NewPurchasePrice ?? 0,
                        Date = DateTime.Now,
                        IsActive = 1,
                        IsDeleted = 0,
                        CreatedBy = entity.CreatedBy,
                        CreatedOn = entity.CreatedOn,
                        ModifiedBy = entity.ModifiedBy,
                        ModifiedOn = entity.ModifiedOn
                        });
                    }

                // 6) Update each Item.PurchasePrice master record
                foreach (var child in request.PurchasePriceListItemVMs)
                    {
                    if (!child.ItemId.HasValue) continue;
                    var item = await _context.Items.FindAsync(child.ItemId.Value);
                    if (item != null)
                        {
                        item.PurchasePrice = child.NewPurchasePrice ?? item.PurchasePrice;
                        _context.Items.Update(item);
                        }
                    }

                // 7) Save all changes
                _context.PurchasePrices.Update(entity);
                await _context.SaveChangesAsync();

                // 8) Capture new state for logging
                var newData = new
                    {
                    Parent = new
                        {
                        entity.PurchasePriceId,
                        entity.PurchasePriceRefNumber,
                        entity.PurchasePriceDate
                        },
                    Children = request.PurchasePriceListItemVMs
                        .Select(c => new
                            {
                            c.ItemId,
                            c.TotalQuantity,
                            c.OldPurchasePrice,
                            c.NewPurchasePrice
                            })
                        .ToList()
                    };

                // 9) Write ActivityLog
                await _activityLogRepository.Create(new ActivityLog
                    {
                    MenuItemId = 31,
                    ParentTableId = entity.PurchasePriceId,
                    ActionType = "Update",
                    OldData = System.Text.Json.JsonSerializer.Serialize(oldData),
                    NewData = System.Text.Json.JsonSerializer.Serialize(newData),
                    UserId = currentUser,
                    Date = DateTime.Now
                    });

                // 10) Commit transaction
                await transaction.CommitAsync();

                return Ok(new { entity.PurchasePriceId });
                }
            catch (Exception ex)
                {
                await transaction.RollbackAsync();
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
        [HttpGet]
        public async Task<IActionResult> GetAllPurchasePrices ( )
            {


            try
                {
                // Query the database for active price lists and count their related items.
                var purchaseList = (await _context.PurchasePrices
                    .Where(b => b.IsActive == 1 && b.IsDeleted == 0)
                    .Select(c => new
                        {
                        c.PurchasePriceId,
                        c.PurchasePriceRefNumber,
                        c.PurchasePriceDate,
                        // Count items that are associated with this PriceList.
                        ItemCount = _context.PurchasePriceListItems.Count(i => i.PurchasePriceId == c.PurchasePriceId)
                        })
                    .ToListAsync()).Select(( c, index ) => new
                        {
                        Index = index + 1,
                        c.PurchasePriceId,
                        c.PurchasePriceRefNumber,
                        c.PurchasePriceDate,
                        c.ItemCount
                        });

                return Ok(purchaseList);
                }
            catch (Exception ex)
                {
                // Log the exception and return an error status.
                Console.WriteLine($"Error: {ex.Message}");
                return StatusCode(500, "Internal server error.");
                }
            }

        [HttpGet("DetailById/{id}")]
        public async Task<IActionResult> DetailById ( int id )
            {
            var entity = await _context.PurchasePrices.Include(pp => pp.PurchasePriceListItems).FirstOrDefaultAsync(pp => pp.PurchasePriceId == id && pp.IsDeleted == 0 && pp.IsActive == 1);

            if (entity == null)
                return NotFound($"PurchasePrice with ID {id} not found.");

            // Map to VM
            var vm = new 
                {
                PurchasePriceId = entity.PurchasePriceId,
                PurchasePriceRefNumber = entity.PurchasePriceRefNumber,
                PurchasePriceDate = entity.PurchasePriceDate,
                Date = entity.CreatedOn,
                PurchasePriceListItemVMs = entity.PurchasePriceListItems
                
                    .Where(c => c.IsDeleted == 0 && c.IsActive == 1)
                    .Select(c => new 
                        {
                        PurchasePriceListItemChilId = c.PurchasePriceListItemChilId,
                        PurchasePriceId = c.PurchasePriceId,
                        ItemId = c.ItemId,
                       ItemName=_context.Items.Where(i=>i.ItemId==c.ItemId).Select(i=>i.ItemName).FirstOrDefault(),
                        TotalQuantity = c.TotalQuantity,
                        OldPurchasePrice = c.OldPurchasePrice,
                        NewPurchasePrice = c.NewPurchasePrice,
                       

                        })
                    .ToList()
                };

            return Ok(vm);
            }
        [HttpGet("activity_log/PurchasePrice/{id}")]
        public async Task<IActionResult> GetActivityLogsForPurchasePrice ( int id )
            {
            try
                {
                var logs = await _context.ActivityLogs
                    .Where(a => a.MenuItemId == 31)
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
                    // Left join with PurchasePrices
                    .GroupJoin(
                        _context.PurchasePrices,
                        temp => temp.a.ParentTableId,
                        b => b.PurchasePriceId,
                        ( temp, PurchasePrices ) => new { temp.a, temp.user, PurchasePrices }
                    )
                    .SelectMany(
                        temp => temp.PurchasePrices.DefaultIfEmpty(),
                        ( temp, PurchasePrice ) => new { temp.a, temp.user, PurchasePrice }
                    )
                    // Apply filter for UnitId = 1 (ensure Unit is not null)
                    .Where(x => x.PurchasePrice != null && x.PurchasePrice.PurchasePriceId == id)
                    // Project to the desired shape
                    .Select(x => new
                        {
                        x.a.ActionType,
                        x.a.OldData,
                        x.a.NewData,
                        PurchasePriceRefNumber = x.PurchasePrice.PurchasePriceRefNumber,
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

        [HttpGet("GetItemPurchasePrice/{ItemId}")]
        public async Task<IActionResult> GetPriceListItemChild ( int ItemId )
            {
            // Build a request object to return
            var request = new PurchasePriceListItemVM
                {
                ItemId = ItemId
                };

            // Look up the customer price
            var purchasePrice = await _context.Items
                .Where(ic =>
                    ic.ItemId == request.ItemId )
                .Select(ic => ic.PurchasePrice)
                .FirstOrDefaultAsync();

            if (purchasePrice == null)
                return NotFound("No matching record found.");

            // Populate OldNetPrice for front-end forms
            request.OldPurchasePrice = Convert.ToInt32(purchasePrice.Value);
            return Ok(request);
            }

        }


    }
