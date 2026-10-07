using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SalesInventoryAPI.Data.Services;
using SalesInventoryAPI.Data;
using SalesInventoryAPI.Models;
using SalesInventoryAPI.Data.ViewModels;
using System.Security.Claims;
using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Http.HttpResults;
using Org.BouncyCastle.Asn1.Ocsp;
using Microsoft.AspNetCore.Authorization;
using SalesInventoryAPI.Data.DTOs;
using System.Data;

namespace SalesInventoryAPI.Controller
    {
    // Require authentication on all actions in this controller
    [Authorize]
    // Base route: /api/PriceList
    [Route("api/[controller]")]
    [ApiController]
    public class PriceListController : ControllerBase
        {
        private readonly InventoryDbContext _context;
        private readonly PermissionService _permissionService;
        private readonly ActivityLogRepository _activityLogRepository;
        private readonly CodeGenerator _codeGenerator;

        /// <summary>
        /// Constructor: injects EF Core context, permission checker, activity logger, and code generator
        /// </summary>
        public PriceListController (
            InventoryDbContext context,
            PermissionService permissionService,
            ActivityLogRepository activityLogRepository,
            CodeGenerator codeGenerator )
            {
            _context = context;
            _permissionService = permissionService;
            _activityLogRepository = activityLogRepository;
            _codeGenerator = codeGenerator;
            }

        /// <summary>
        /// POST /api/PriceList
        /// Creates a new price list header and its child items in a single transaction.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> CreatePriceList ( [FromBody] PriceListRequest request )
            {
            // 1) Permission: ensure user can insert price lists
            string roleId = await GetUserRoleIdAsync();
            if (!await _permissionService.HasPermission(roleId, "Price Lists", "Inventory System", "Insert"))
                return Forbid();

            // 2) Validate request payload
            if (request == null)
                return BadRequest("Request body cannot be null.");

            // 3) Begin DB transaction for atomicity
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
                {
                // 4) Map request to PriceList entity
                var priceList = new PriceList
                    {
                    PriceRefNumber = request.PriceRefNumber,
                    // Parse the incoming date string (yyyy-MM-dd)
                    PriceDate = DateTime.ParseExact(request.PriceDate, "yyyy-MM-dd", CultureInfo.InvariantCulture),
                    CreatedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                    CreatedOn = DateTime.Now,
                    IsActive = 1,
                    IsDeleted = 0
                    };

                // 5) Persist header to generate its ID
                _context.PriceLists.Add(priceList);
                await _context.SaveChangesAsync();

                // List used to collect inserted child items for logging
                var insertedItems = new List<PriceListItemChild>();

                // 6) Process each child item in the request
                if (request.Items != null && request.Items.Any())
                    {
                    foreach (var item in request.Items)
                        {
                        // Map to child entity
                        var priceListItemChild = new PriceListItemChild
                            {
                            PriceListId = priceList.PriceListId,
                            ItemId = (int)item.ItemId,
                            CustomerCategoryId = item.CustomerCategoryId,
                            Description = item.Description,
                            TotalQuantity = item.TotalQuantity,
                            OldNetPrice = item.OldNetPrice,
                            NewNetPrice = item.NewNetPrice,
                            Date = DateTime.Now,
                            CreatedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                            CreatedOn = DateTime.Now,
                            IsActive = 1,
                            IsDeleted = 0
                            };

                        // Add to EF context and our tracking list
                        _context.PriceListItemChildren.Add(priceListItemChild);
                        insertedItems.Add(priceListItemChild);

                        // 7) Update the corresponding ItemCustomerCategory price
                        var itemCustomerCategory = await _context.ItemCustomerCategories
                            .FirstOrDefaultAsync(pl =>
                                pl.ItemId == item.ItemId &&
                                pl.CustomerCategoryId == item.CustomerCategoryId &&
                                pl.IsActive == 1 &&
                                pl.IsDeleted == 0);

                        if (itemCustomerCategory != null)
                            {
                            itemCustomerCategory.CustomerPrice = item.NewNetPrice;
                            itemCustomerCategory.ModifiedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                            itemCustomerCategory.ModifiedOn = DateTime.Now;
                            _context.ItemCustomerCategories.Update(itemCustomerCategory);
                            }
                        }
                    }

                // 8) Save all pending changes (header + children + price updates)
                var changes = await _context.SaveChangesAsync();

                // 9) If anything was saved, record an audit log of what changed
                if (changes > 0)
                    {
                    // Build a lightweight log payload
                    var logPriceAdjustment = new
                        {
                        PriceList = new
                            {
                            priceList.PriceListId,
                            priceList.PriceRefNumber,
                            priceList.PriceDate
                            },
                        PriceListItems = insertedItems.Select(item => new
                            {
                            item.PriceListItemChildId,
                            item.PriceListId,
                            item.ItemId,
                            item.CustomerCategoryId,
                            item.Description,
                            item.TotalQuantity,
                            item.OldNetPrice,
                            item.NewNetPrice
                            })
                        };

                    // Persist the activity log
                    var activityLog = new ActivityLog
                        {
                        MenuItemId = 16,                            // identifies “Price Lists” menu
                        ParentTableId = priceList.PriceListId,      // links log to this PriceList
                        ActionType = "Create",
                        OldData = "",                               // none, since this is a create
                        NewData = System.Text.Json.JsonSerializer.Serialize(logPriceAdjustment),
                        UserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                        Date = DateTime.Now
                        };

                    await _activityLogRepository.Create(activityLog);
                    }

                // 10) Commit the transaction to make everything permanent
                await transaction.CommitAsync();

                // 11) Return the new PriceListId so frontend can redirect or display
                return Ok(new { PriceListId = priceList.PriceListId });
                }
            catch (Exception ex)
                {
                // On error, roll back and return a 500
                await transaction.RollbackAsync();
                Console.WriteLine($"Error creating price list: {ex.Message}");
                return StatusCode(500, "Internal server error.");
                }
            }

        /// <summary>
        /// GET /api/PriceList
        /// List all active price lists with a count of their items.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAllPriceLists ( )
            {
            // 1) Permission: ensure user can view price lists
            string roleId = await GetUserRoleIdAsync();
            if (!await _permissionService.HasPermission(roleId, "Price Lists", "Inventory System", "View"))
                return Forbid();

            try
                {
                // 2) Query headers and compute child item counts
                var priceLists = (await _context.PriceLists
                    .Where(b => b.IsActive == 1 && b.IsDeleted == 0)
                    .Select(c => new
                        {
                        c.PriceListId,
                        c.PriceRefNumber,
                        c.PriceDate,
                        // Inline count of matching child rows
                        ItemCount = _context.PriceListItemChildren.Count(i => i.PriceListId == c.PriceListId)
                        })
                    .ToListAsync())
                    // 3) Add an Index property for UI ordering
                    .Select(( c, index ) => new
                        {
                        Index = index + 1,
                        c.PriceListId,
                        c.PriceRefNumber,
                        c.PriceDate,
                        c.ItemCount
                        });

                return Ok(priceLists);
                }
            catch (Exception ex)
                {
                Console.WriteLine($"Error listing price lists: {ex.Message}");
                return StatusCode(500, "Internal server error.");
                }
            }

        /// <summary>
        /// GET /api/PriceList/{id}
        /// Retrieve a single price list for editing, including its items.
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetPriceListById ( int id )
            {
            // 1) Permission: ensure user can update price lists
            string roleId = await GetUserRoleIdAsync();
            if (!await _permissionService.HasPermission(roleId, "Price Lists", "Inventory System", "Update"))
                return Forbid();

            try
                {
                // 2) Fetch header
                var priceListEntity = await _context.PriceLists
                    .FirstOrDefaultAsync(pl => pl.PriceListId == id && pl.IsActive == 1 && pl.IsDeleted == 0);

                if (priceListEntity == null)
                    return NotFound($"PriceList with ID {id} not found.");

                // 3) Fetch all non-deleted child items
                var priceListItemsEntities = await _context.PriceListItemChildren
                    .Where(item => item.PriceListId == id && item.IsDeleted == 0)
                    .ToListAsync();

                // 4) Map to the view model
                var priceListVM = new PriceListVM
                    {
                    PriceListId = priceListEntity.PriceListId,
                    PriceRefNumber = priceListEntity.PriceRefNumber,
                    PriceDate = priceListEntity.PriceDate?.ToString("yyyy-MM-dd"),
                    Items = priceListItemsEntities
                        .Where(a => a.IsActive == 1 && a.IsDeleted == 0)
                        .Select(item => new PriceListItemChildVM
                            {
                            PriceListItemChildId = item.PriceListItemChildId,
                            PriceListId = item.PriceListId,
                            ItemId = item.ItemId,
                            CustomerCategoryId = item.CustomerCategoryId,
                            Description = item.Description,
                            TotalQuantity = item.TotalQuantity,
                            OldNetPrice = item.OldNetPrice,
                            NewNetPrice = item.NewNetPrice
                            })
                        .ToList()
                    };

                return Ok(priceListVM);
                }
            catch (Exception ex)
                {
                Console.WriteLine($"Error fetching price list by ID: {ex.Message}");
                return StatusCode(500, "Internal server error.");
                }
            }

        /// <summary>
        /// GET /api/PriceList/detail/{id}
        /// Retrieve a single price list for read-only details, including item and category names.
        /// </summary>
        [HttpGet("detail/{id}")]
        public async Task<IActionResult> DetailPriceListById ( int id )
            {
            // 1) Permission: ensure user can view details
            string roleId = await GetUserRoleIdAsync();
            if (!await _permissionService.HasPermission(roleId, "Price Lists", "Inventory System", "View"))
                return Forbid();

            try
                {
                // 2) Fetch header
                var priceListEntity = await _context.PriceLists
                    .FirstOrDefaultAsync(pl => pl.PriceListId == id && pl.IsActive == 1 && pl.IsDeleted == 0);

                if (priceListEntity == null)
                    return NotFound($"PriceList with ID {id} not found.");

                // 3) Fetch child items
                var priceListItemsEntities = await _context.PriceListItemChildren
                    .Where(item => item.PriceListId == id && item.IsDeleted == 0)
                    .ToListAsync();

                // 4) Build an anonymous detail object
                var priceListDetail = new
                    {
                    PriceListId = priceListEntity.PriceListId,
                    PriceRefNumber = priceListEntity.PriceRefNumber,
                    PriceDate = priceListEntity.PriceDate,
                    CreatedOn = priceListEntity.CreatedOn,
                    Items = priceListItemsEntities
                        .Where(a => a.IsActive == 1 && a.IsDeleted == 0)
                        .Select(item => new
                            {
                            item.PriceListItemChildId,
                            item.PriceListId,
                            // Inline query for item name
                            ItemName = _context.Items
                                .Where(c => c.ItemId == item.ItemId)
                                .Select(c => c.ItemName)
                                .FirstOrDefault(),
                            // Inline query for category name
                            CustomerCategoryName = _context.CustomerCategories
                                .Where(c => c.CustomerCategoryId == item.CustomerCategoryId)
                                .Select(c => c.CustomerCategoryName)
                                .FirstOrDefault(),
                            item.Description,
                            item.TotalQuantity,
                            item.OldNetPrice,
                            item.NewNetPrice
                            })
                        .ToList()
                    };

                return Ok(priceListDetail);
                }
            catch (Exception ex)
                {
                Console.WriteLine($"Error fetching detail view: {ex.Message}");
                return StatusCode(500, "Internal server error.");
                }
            }

        /// <summary>
        /// PUT /api/PriceList/{id}
        /// Update an existing price list and its items, log what’s changed.
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdatePriceListById ( int id, [FromBody] PriceListVM priceListVM )
            {
            // 1) Permission: ensure user can update
            string roleId = await GetUserRoleIdAsync();
            if (!await _permissionService.HasPermission(roleId, "Price Lists", "Inventory System", "Update"))
                return Forbid();

            // 2) Start transaction
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
                {
                // 3) Load existing header
                var existingPriceList = await _context.PriceLists
                    .FirstOrDefaultAsync(pl => pl.PriceListId == id && pl.IsDeleted == 0);

                if (existingPriceList == null)
                    return NotFound($"PriceList with ID {id} not found.");

                // 4) Load current child items
                var existingItems = await _context.PriceListItemChildren
                    .Where(x => x.PriceListId == id && x.IsDeleted == 0)
                    .ToListAsync();

                // 5) Capture oldData snapshot for the audit log
                var oldData = new
                    {
                    PriceList = new
                        {
                        existingPriceList.PriceListId,
                        existingPriceList.PriceRefNumber,
                        existingPriceList.PriceDate
                        },
                    PriceListItems = existingItems.Select(item => new
                        {
                        item.PriceListItemChildId,
                        item.PriceListId,
                        item.ItemId,
                        item.CustomerCategoryId,
                        item.Description,
                        item.TotalQuantity,
                        item.OldNetPrice,
                        item.NewNetPrice
                        }).ToList()
                    };

                // 6) Update header fields
                existingPriceList.PriceRefNumber = priceListVM.PriceRefNumber;
                if (!string.IsNullOrWhiteSpace(priceListVM.PriceDate))
                    {
                    existingPriceList.PriceDate = DateTime.Parse(priceListVM.PriceDate);
                    }
                existingPriceList.ModifiedOn = DateTime.Now;
                existingPriceList.ModifiedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                // 7) Process incoming child items
                var incomingItems = priceListVM.Items ?? new List<PriceListItemChildVM>();
                foreach (var incomingItem in incomingItems)
                    {
                    // a) If it exists, update; if not, add new
                    var dbItem = existingItems.FirstOrDefault(x => x.PriceListItemChildId == incomingItem.PriceListItemChildId);
                    if (dbItem == null)
                        {
                        // New child record
                        var newItem = new PriceListItemChild
                            {
                            PriceListId = id,
                            ItemId = incomingItem.ItemId,
                            CustomerCategoryId = incomingItem.CustomerCategoryId,
                            Description = incomingItem.Description,
                            TotalQuantity = incomingItem.TotalQuantity,
                            OldNetPrice = incomingItem.OldNetPrice,
                            NewNetPrice = incomingItem.NewNetPrice,
                            Date = DateTime.Now,
                            CreatedOn = DateTime.Now,
                            CreatedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                            IsActive = 1,
                            IsDeleted = 0
                            };
                        _context.PriceListItemChildren.Add(newItem);
                        }
                    else
                        {
                        // Update existing child record
                        dbItem.ItemId = incomingItem.ItemId;
                        dbItem.CustomerCategoryId = incomingItem.CustomerCategoryId;
                        dbItem.Description = incomingItem.Description;
                        dbItem.TotalQuantity = incomingItem.TotalQuantity;
                        dbItem.OldNetPrice = incomingItem.OldNetPrice;
                        dbItem.NewNetPrice = incomingItem.NewNetPrice;
                        dbItem.ModifiedOn = DateTime.Now;
                        dbItem.ModifiedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                        }

                    // b) Update the related ItemCustomerCategory price
                    var itemCustomerCategory = await _context.ItemCustomerCategories
                        .FirstOrDefaultAsync(pl =>
                            pl.ItemId == incomingItem.ItemId &&
                            pl.CustomerCategoryId == incomingItem.CustomerCategoryId &&
                            pl.IsActive == 1 &&
                            pl.IsDeleted == 0);

                    if (itemCustomerCategory != null)
                        {
                        itemCustomerCategory.CustomerPrice = incomingItem.NewNetPrice;
                        itemCustomerCategory.ModifiedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                        itemCustomerCategory.ModifiedOn = DateTime.Now;
                        _context.ItemCustomerCategories.Update(itemCustomerCategory);
                        }
                    }

                // 8) Handle deletions:
                if (priceListVM.RemovedItemIds != null && priceListVM.RemovedItemIds.Any())
                    {
                    // Mark specified IDs as deleted
                    foreach (var removedId in priceListVM.RemovedItemIds)
                        {
                        var removedItem = existingItems.FirstOrDefault(x => x.PriceListItemChildId == removedId);
                        if (removedItem != null)
                            {
                            removedItem.IsDeleted = 1;
                            removedItem.ModifiedOn = DateTime.Now;
                            removedItem.ModifiedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                            }
                        }
                    }
                else
                    {
                    // Or infer deletions by comparing incoming vs existing
                    var incomingIds = incomingItems.Select(x => x.PriceListItemChildId).ToList();
                    var itemsToRemove = existingItems.Where(x => !incomingIds.Contains(x.PriceListItemChildId)).ToList();
                    foreach (var removeItem in itemsToRemove)
                        {
                        removeItem.IsDeleted = 1;
                        removeItem.ModifiedOn = DateTime.Now;
                        removeItem.ModifiedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                        }
                    }

                // 9) Save all updates
                var changes = await _context.SaveChangesAsync();

                // 10) If updates applied, capture new state and log the activity
                if (changes > 0)
                    {
                    var updatedItems = await _context.PriceListItemChildren
                        .Where(x => x.PriceListId == id && x.IsDeleted == 0)
                        .Select(item => new
                            {
                            item.PriceListItemChildId,
                            item.PriceListId,
                            item.ItemId,
                            item.CustomerCategoryId,
                            item.Description,
                            item.TotalQuantity,
                            item.OldNetPrice,
                            item.NewNetPrice
                            })
                        .ToListAsync();

                    var newData = new
                        {
                        PriceList = new
                            {
                            existingPriceList.PriceListId,
                            existingPriceList.PriceRefNumber,
                            existingPriceList.PriceDate
                            },
                        PriceListItems = updatedItems
                        };

                    var activityLog = new ActivityLog
                        {
                        MenuItemId = 16,
                        ParentTableId = existingPriceList.PriceListId,
                        ActionType = "Update",
                        OldData = System.Text.Json.JsonSerializer.Serialize(oldData),
                        NewData = System.Text.Json.JsonSerializer.Serialize(newData),
                        UserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                        Date = DateTime.Now
                        };

                    await _activityLogRepository.Create(activityLog);
                    }

                // 11) Commit final transaction
                await transaction.CommitAsync();

                return Ok(new { message = "PriceList updated successfully." });
                }
            catch (Exception ex)
                {
                // Rollback on any error
                await transaction.RollbackAsync();
                Console.WriteLine($"Error updating price list: {ex.Message}");
                return StatusCode(500, "Internal server error.");
                }
            }

        /// <summary>
        /// DELETE /api/PriceList/{id}
        /// Soft-delete a price list (mark as deleted) without removing data.
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePriceList ( int id )
            {
            // Permission: ensure user can delete
            string roleId = await GetUserRoleIdAsync();
            if (!await _permissionService.HasPermission(roleId, "Price Lists", "Inventory System", "Delete"))
                return Forbid();

            try
                {
                // Fetch the active record
                var pricelist = await _context.PriceLists
                    .FirstOrDefaultAsync(c => c.PriceListId == id && c.IsActive == 1 && c.IsDeleted == 0);

                if (pricelist == null)
                    return NotFound("PriceList not found");

                // Soft-delete flags
                pricelist.IsDeleted = 1;
                pricelist.ModifiedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                pricelist.ModifiedOn = DateTime.Now;

                // Persist change
                _context.PriceLists.Update(pricelist);
                await _context.SaveChangesAsync();

                return Ok("PriceList deleted successfully");
                }
            catch (Exception ex)
                {
                Console.WriteLine($"Error deleting price list: {ex.Message}");
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }

        /// <summary>
        /// Helper: fetches the current user’s role ID from AspNetUserRoles.
        /// Returns null if user is not authenticated.
        /// </summary>
        private async Task<string> GetUserRoleIdAsync ( )
            {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return null;

            // Lookup the first role assigned to this user
            var userRole = await _context.UserRoles
                .Where(ur => ur.UserId == userId)
                .Select(ur => ur.RoleId)
                .FirstOrDefaultAsync();

            return userRole;
            }

        /// <summary>
        /// GET /api/PriceList/get-groups
        /// Returns all active item groups for dropdowns.
        /// </summary>
        [HttpGet("get-groups")]
        public async Task<IActionResult> GetAllGroups ( )
            {
            try
                {
                var groups = await _context.ItemGroups
                    .Where(a => a.IsActive == 1)
                    .Select(r => new { r.ItemGroupId, r.ItemGroupName })
                    .ToListAsync();

                return Ok(groups);
                }
            catch (Exception ex)
                {
                Console.WriteLine($"Error loading item groups: {ex.Message}");
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }

        /// <summary>
        /// GET /api/PriceList/autocomplete?query=...
        /// Simple search endpoint for item names.
        /// </summary>
        [HttpGet("autocomplete")]
        public async Task<IActionResult> AutocompleteItems ( string query )
            {
            try
                {
                var items = await _context.Items
                    .Where(s =>
                        s.IsActive == 1 &&
                        s.IsDeleted == 0 &&
                        (string.IsNullOrEmpty(query) || s.ItemName.Contains(query)))
                    .Select(c => new { id = c.ItemId, label = c.ItemName })
                    .ToListAsync();

                return Ok(items);
                }
            catch (Exception ex)
                {
                Console.WriteLine($"Error in autocomplete: {ex.Message}");
                return StatusCode(500, "Internal server error.");
                }
            }

        /// <summary>
        /// GET /api/PriceList/GetNextPriceRefNumber
        /// Generates the next sequential reference (e.g. PLS000123).
        /// </summary>
        [HttpGet("GetNextPriceRefNumber")]
        public async Task<IActionResult> GetNextPriceRefNumber ( )
            {
            try
                {
                // Delegates to CodeGenerator service
                string ref_no = await _codeGenerator.GenerateReferenceNumber(
                    "PriceLists", "PriceRefNumber", "PLS", 6);
                return Ok(new { PriceRefNumber = ref_no });
                }
            catch (Exception ex)
                {
                Console.WriteLine($"Error generating ref no: {ex.Message}");
                return StatusCode(500, "Internal server error.");
                }
            }

        /// <summary>
        /// GET /api/PriceList/get-items
        /// Returns all active items for selection lists.
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

        /// <summary>
        /// GET /api/PriceList/GetPriceListItemChild/{ItemId}/{CustomerCategoryId}
        /// Retrieves the current customer price for a specific item-category pair.
        /// </summary>
        [HttpGet("GetPriceListItemChild/{ItemId}/{CustomerCategoryId}")]
        public async Task<IActionResult> GetPriceListItemChild ( int ItemId, int CustomerCategoryId )
            {
            // Build a request object to return
            var request = new PriceListItemChildRequest
                {
                ItemId = ItemId,
                CustomerCategoryId = CustomerCategoryId
                };

            // Look up the customer price
            var customerCategory = await _context.ItemCustomerCategories
                .Where(ic =>
                    ic.ItemId == request.ItemId &&
                    ic.CustomerCategoryId == request.CustomerCategoryId)
                .Select(ic => ic.CustomerPrice)
                .FirstOrDefaultAsync();

            if (customerCategory == null)
                return NotFound("No matching record found.");

            // Populate OldNetPrice for front-end forms
            request.OldNetPrice = Convert.ToInt32(customerCategory.Value);
            return Ok(request);
            }

        /// <summary>
        /// GET /api/PriceList/GetItemCategories/{ItemId}
        /// Lists all customer categories that apply to the given item.
        /// </summary>
        [HttpGet("GetItemCategories/{ItemId}")]
        public async Task<IActionResult> GetItemCategories ( int ItemId )
            {
            var result = await _context.ItemCustomerCategories
                .Where(ic =>
                    ic.ItemId == ItemId &&
                    ic.IsActive == 1 &&
                    ic.IsDeleted == 0)
                .GroupJoin(
                    _context.CustomerCategories.Where(cc => cc.IsActive == 1 && cc.IsDeleted == 0),
                    ic => ic.CustomerCategoryId,
                    cc => cc.CustomerCategoryId,
                    ( ic, ccGroup ) => new { ic, ccGroup }
                )
                .SelectMany(
                    x => x.ccGroup.DefaultIfEmpty(),
                    ( x, cc ) => new
                        {
                        CustomerCategoryId = cc != null ? cc.CustomerCategoryId : x.ic.CustomerCategoryId,
                        CustomerCategoryName = cc != null ? cc.CustomerCategoryName : ""
                        }
                )
                .GroupBy(x => new { x.CustomerCategoryId, x.CustomerCategoryName })
                .Select(g => g.First())
                .ToListAsync();

            if (result == null || result.Count == 0)
                return NotFound("No customer categories found for the given item.");

            return Ok(result);
            }

        /// <summary>
        /// GET /api/PriceList/activity_log/priceadjusment/{id}
        /// Returns audit logs for a specific price list ID.
        /// </summary>
        [HttpGet("activity_log/priceadjusment/{id}")]
        public async Task<IActionResult> GetActivityLogsForPriceadjusment ( int id )
            {
            try
                {
                // Fetch logs for MenuItemId=16 (price lists), join to Users and PriceLists
                var logs = await _context.ActivityLogs
                    .Where(a => a.MenuItemId == 16)
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
                    .GroupJoin(
                        _context.PriceLists,
                        temp => temp.a.ParentTableId,
                        b => b.PriceListId,
                        ( temp, PriceLists ) => new { temp.a, temp.user, PriceLists }
                    )
                    .SelectMany(
                        temp => temp.PriceLists.DefaultIfEmpty(),
                        ( temp, pricelist ) => new { temp.a, temp.user, pricelist }
                    )
                    .Where(x => x.pricelist != null && x.pricelist.PriceListId == id)
                    .Select(x => new
                        {
                        x.a.ActionType,
                        x.a.OldData,
                        x.a.NewData,
                        pricelistName = x.pricelist.PriceRefNumber,
                        UserName = x.user != null ? x.user.UserName : null,
                        x.a.Date
                        })
                    .ToListAsync();

                return Ok(logs);
                }
            catch (Exception ex)
                {
                Console.WriteLine($"Error retrieving activity logs: {ex.Message}");
                return StatusCode(500, "An error occurred while retrieving activity logs: " + ex.Message);
                }
            }
        }
    }
