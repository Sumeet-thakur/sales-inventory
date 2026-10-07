using Microsoft.AspNetCore.Mvc;
using SalesInventoryAPI.Models;
using SalesInventoryAPI.Data;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using SalesInventoryAPI.Data.ViewModels;
using Org.BouncyCastle.Asn1.Ocsp;
using System.Globalization;
using SalesInventoryAPI.Data.Services;
using System.Threading.Channels;
using System.Data;
using Microsoft.AspNetCore.Authorization;
namespace SalesInventoryAPI.Controller
    {
    [Authorize]
    [ApiController]
[Route("api/[controller]")]
public class ItemController : ControllerBase
    {
    private readonly InventoryDbContext _context;
    private readonly PermissionService _permissionService;
    private readonly ActivityLogRepository _activityLogRepository;
    // Constructor: Injects the database context used by the controller.
    public ItemController(InventoryDbContext context, PermissionService permissionService, ActivityLogRepository activityLogRepository)
        {
        _context = context;
        _permissionService = permissionService;
        _activityLogRepository = activityLogRepository;
        }

    /// <summary>
    /// Retrieves all items along with related details such as unit, brand, and item group.
    /// Uses left joins to include related data even if some associations are missing.
    /// </summary>
    /// <returns>A list of items with their associated unit, brand, and group names.</returns>

    [HttpGet]
    public async Task<IActionResult> GetAllItems()
        {
        string roleId = await GetUserRoleIdAsync();
        if (!await _permissionService.HasPermission(roleId, "Items", "Inventory System", "View"))
            return Forbid();

        try
            {
            var indexedItems = (await _context.Items .Where(item=>item.IsActive==1 && item.IsDeleted==0)
                // Left join with Units (active and not deleted)
                .GroupJoin(
                    _context.Units.Where(u => u.IsActive == 1 && u.IsDeleted == 0),
                    item => item.UnitId,
                    unit => unit.UnitId,
                    (item, units) => new { item, units }
                )
                .SelectMany(
                    x => x.units.DefaultIfEmpty(),
                    (x, unit) => new { x.item, unit }
                )
                // Left join with Brands (active and not deleted)
                .GroupJoin(
                    _context.Brands.Where(b => b.IsActive == 1 && b.IsDeleted == 0),
                    x => x.item.BrandId,
                    brand => brand.BrandId,
                    (x, brands) => new { x.item, x.unit, brands }
                )
                .SelectMany(
                    x => x.brands.DefaultIfEmpty(),
                    (x, brand) => new { x.item, x.unit, brand }
                )
                // Left join with ItemGroups (active and not deleted)
                .GroupJoin(
                    _context.ItemGroups.Where(g => g.IsActive == 1 && g.IsDeleted == 0),
                    x => x.item.ItemGroupId,
                    group => group.ItemGroupId,
                    (x, groups) => new { x.item, x.unit, x.brand, groups }
                )
                .SelectMany(
                    x => x.groups.DefaultIfEmpty(),
                    (x, group) => new
                        {
                        x.item.ItemId,
                        x.item.ItemName,
                        x.item.ItemCode,
                        // Use conditional operator to ensure non-null values.
                        BrandName = x.brand != null ? x.brand.BrandName : string.Empty,
                        ItemGroupName = group != null ? group.ItemGroupName : string.Empty,
                        UnitName = x.unit != null ? x.unit.UnitName : string.Empty
                        }
                )
                .ToListAsync())
                .Select((item, index) => new
                    {
                    Index = index + 1, // Indexing starts at 1
                    item.ItemId,
                    item.ItemName,
                    item.ItemCode,
                    item.BrandName,
                    item.ItemGroupName,
                    item.UnitName
                    })
                .ToList();

            return Ok(indexedItems);
            }
        catch (Exception ex)
            {
            // Log exception details and return an internal server error.
            Console.WriteLine($"Error: {ex.Message}");
            return StatusCode(500, "Internal server error.");
            }
        }


    /// <summary>
    /// Adds a new item to the inventory.
    /// Accepts form data including an optional image file.
    /// Checks for duplicate item name and code before insertion.
    /// </summary>
    /// <param name="itemRequest">The item data sent from the client.</param>
    /// <param name="imageFile">An optional image file for the item.</param>
    /// <returns>Returns the newly created ItemId if successful.</returns>
    [HttpPost("AddItem")]
    public async Task<IActionResult> AddItem([FromForm] ItemRequest itemRequest, IFormFile? imageFile)
        {
        string roleId = await GetUserRoleIdAsync();
        if (!await _permissionService.HasPermission(roleId, "Items", "Inventory System", "Insert"))
            return Forbid();

        if (itemRequest == null)
            return BadRequest("Item data is null.");

            var checkItemCode = await _context.Items
                .FirstOrDefaultAsync(i => i.ItemCode.Trim() == itemRequest.ItemCode.Trim() && i.IsActive == 1 && i.IsDeleted == 0);
            if (checkItemCode != null)
                return BadRequest(new { Succeeded = false, Message = "Item code already exists." });

            // Begin a transaction.
            using var transaction = await _context.Database.BeginTransactionAsync();

        try
            {
            // Check if the item name already exists.
            //var checkItemName = await _context.Items
            //    .FirstOrDefaultAsync(i => i.ItemName == itemRequest.ItemName && i.IsActive == 1 && i.IsDeleted == 0);
            //if (checkItemName != null)
            //    return BadRequest(new { Succeeded = false, Message = "Item name already exists." });

            // Check if the item code already exists.
           

            // Handle image upload if an image file is provided.
            if (imageFile != null)
                {
                var imagePath = SaveImage(imageFile);
                // Normalize path separators.
                itemRequest.ImagePath = imagePath.Replace("\\", "/");
                }

            // Create a new item record.
            var newItem = new Item
                {
                ItemName = itemRequest.ItemName,
                ItemCode = itemRequest.ItemCode,
                ItemDescription = itemRequest.ItemDescription,
                BrandId = (int)itemRequest.BrandId,
                ItemGroupId = (int)itemRequest.ItemGroupId,
                UnitId = (int)itemRequest.UnitId,
                SecondaryUnitID = itemRequest.SecondaryUnitID.HasValue ? itemRequest.SecondaryUnitID.Value :0,
                ConversionFactor = itemRequest.ConversionFactor.HasValue ? itemRequest.ConversionFactor.Value : 0,
                PurchasePrice = (decimal)itemRequest.PurchasePrice,
                StartingQuantity = (decimal)itemRequest.StartingQuantity,
                Weight = (decimal)itemRequest.Weight,
                Height = (decimal)itemRequest.Height,
                Length = (decimal)itemRequest.Length,
                Width = (decimal)itemRequest.Width,
                GSTPercentage = (decimal)itemRequest.GSTPercentage,
                MaximumStock = (int)itemRequest.MaximumStock,
                MinimumStock = (int)itemRequest.MinimumStock,
                ImagePath = itemRequest.ImagePath,
                CreatedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                CreatedOn = DateTime.Now,
                IsActive = 1,
                IsDeleted = 0
                };

            _context.Items.Add(newItem);
            var changes = await _context.SaveChangesAsync();

            // Prepare a list to capture inserted customer categories.
            var insertedCategories = new List<ItemCustomerCategory>();

            if (itemRequest.ItemCustomerCategories != null && itemRequest.ItemCustomerCategories.Any())
                {
                foreach (var cat in itemRequest.ItemCustomerCategories)
                    {
                    var itemCustomerCategory = new ItemCustomerCategory
                        {
                        ItemId = newItem.ItemId,
                        CustomerCategoryId = cat.CustomerCategoryId,
                        CustomerPrice = cat.CustomerPrice,
                        CreatedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                        CreatedOn = DateTime.Now,
                        IsActive = 1,
                        IsDeleted = 0
                        };

                    _context.ItemCustomerCategories.Add(itemCustomerCategory);
                    insertedCategories.Add(itemCustomerCategory);
                    }
                await _context.SaveChangesAsync();
                }

            if (changes > 0)
                {
                // Build a log object with the new item's essential details.
                var logItem = new
                    {
                    Item = new
                        {
                        newItem.ItemId,
                        newItem.ItemName,
                        newItem.ItemCode,
                        newItem.ItemDescription,
                        newItem.BrandId,
                        newItem.ItemGroupId,
                        newItem.UnitId,
                        newItem.SecondaryUnitID,
                        newItem.ConversionFactor,
                        newItem.PurchasePrice,
                        newItem.Weight,
                        newItem.Height,
                        newItem.Length,
                        newItem.Width,
                        newItem.GSTPercentage,
                        newItem.MaximumStock,
                        newItem.MinimumStock,
                        newItem.StartingQuantity,
                        newItem.ImagePath,
                        newItem.CreatedOn
                        },
                    ItemCustomerCategories = insertedCategories.Select(cat => new
                        {
                        cat.ItemId, // assuming auto-generated
                        cat.CustomerCategoryId,
                        cat.CustomerPrice
                        })
                    };

                var activityLog = new ActivityLog
                    {
                    MenuItemId = 17,
                    ParentTableId = newItem.ItemId,
                    ActionType = "Create",
                    OldData = "",
                    NewData = System.Text.Json.JsonSerializer.Serialize(logItem),
                    UserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                    Date = DateTime.Now
                    };

                await _activityLogRepository.Create(activityLog);

                var ItemStock = new ItemStock 
                    {
                    ItemID= newItem.ItemId,
                      WarehouseID=1,
                      Quantity=newItem.StartingQuantity,
                      IsActive=1,
                      CreatedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                      CreatedOn = DateTime.Now
                    };
                _context.ItemStocks.Add(ItemStock);
                var StockTransaction = new StockTransaction 
                    {
                    ItemID = newItem.ItemId,
                    DocumentID = newItem.ItemId,
                    Remarks="initial stock",
                    DocumentType="Items",
                    CreationDate = DateTime.Now,
                    Quantity = newItem.StartingQuantity,
                    WarehouseID = 1,
                    IsActive=1

                    };
                _context.StockTransactions.Add(StockTransaction);
                await _context.SaveChangesAsync();
                }


            await transaction.CommitAsync();

            return Ok(new { ItemId = newItem.ItemId });
            }
        catch (Exception ex)
            {
            // Roll back the transaction if any errors occur.
            await transaction.RollbackAsync();
            Console.WriteLine($"Error: {ex.Message}");
            return StatusCode(500, "Internal server error.");
            }
        }



    /// <summary>
    /// Updates an existing item by its ID.
    /// Accepts updated item data as form data along with an optional new image file.
    /// Processes updates for main item fields as well as associated customer category records.
    /// </summary>
    /// <param name="id">The ID of the item to update.</param>
    /// <param name="itemVM">The updated item details.</param>
    /// <param name="imageFile">An optional new image file.</param>
    /// <returns>Returns a success message if update is successful.</returns>
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateItemById(int id, [FromForm] ItemVM itemVM, IFormFile? imageFile)
        {
        string roleId = await GetUserRoleIdAsync();
        if (!await _permissionService.HasPermission(roleId, "Items", "Inventory System", "Update"))
            return Forbid();

        if (itemVM == null)
            return BadRequest("Item data is null.");

        // Begin a transaction.
        using var transaction = await _context.Database.BeginTransactionAsync();

        try
            {
            // Retrieve the existing item.
            var existingItem = await _context.Items
                .FirstOrDefaultAsync(i => i.ItemId == id && i.IsActive == 1 && i.IsDeleted == 0);

            if (existingItem == null)
                return NotFound($"Item with ID {id} not found.");
            // Retrieve associated customer category records.
            var itemCustomerCategoriesEntities = await _context.ItemCustomerCategories
                .Where(item => item.ItemId == id && item.IsDeleted == 0)
                .ToListAsync();

            // Capture the old state for logging.
            var oldlogItem = new
                {
                Item = new
                    {
                    existingItem.ItemId,
                existingItem.ItemName,
                existingItem.ItemCode,
                existingItem.ItemDescription,
                existingItem.BrandId,
                existingItem.ItemGroupId,
                existingItem.UnitId,
                existingItem.SecondaryUnitID,
                existingItem.ConversionFactor,
                existingItem.PurchasePrice,
                existingItem.Weight,
                existingItem.Height,
                existingItem.Length,
                existingItem.Width,
                existingItem.GSTPercentage,
                existingItem.MaximumStock,
                existingItem.MinimumStock,
                existingItem.StartingQuantity,
                existingItem.ImagePath,
                existingItem.CreatedOn
                    },
                ItemCustomerCategories = itemCustomerCategoriesEntities
                    .Where(a => a.IsActive == 1 && a.IsDeleted == 0)
                    .Select(item => new ItemCustomerCategoryVM
                        {
                        ItemCustomerCatId = item.ItemCustomerCatId,
                        ItemId = item.ItemId,
                        CustomerCategoryId = item.CustomerCategoryId,
                        CustomerPrice = item.CustomerPrice,
                        })
                    .ToList()
                };

            // Handle new image upload if provided.
            if (imageFile != null)
                {
                var imagePath = SaveImage(imageFile);
                existingItem.ImagePath = imagePath.Replace("\\", "/");
                }

            // Update main item fields with values from the view model.
            existingItem.ItemName = itemVM.ItemName;
            existingItem.ItemCode = itemVM.ItemCode;
            existingItem.ItemDescription = itemVM.ItemDescription;
            existingItem.BrandId = itemVM.BrandId.HasValue ? itemVM.BrandId.Value : existingItem.BrandId;
            existingItem.ItemGroupId = itemVM.ItemGroupId.HasValue ? itemVM.ItemGroupId.Value : existingItem.ItemGroupId;
            existingItem.UnitId = itemVM.UnitId.HasValue ? itemVM.UnitId.Value : existingItem.UnitId;
            existingItem.SecondaryUnitID = itemVM.SecondaryUnitID.HasValue ? itemVM.SecondaryUnitID.Value : existingItem.SecondaryUnitID;
            existingItem.ConversionFactor = itemVM.ConversionFactor.HasValue ? itemVM.ConversionFactor.Value : existingItem.ConversionFactor;
            existingItem.PurchasePrice = itemVM.PurchasePrice.HasValue ? itemVM.PurchasePrice.Value : existingItem.PurchasePrice;
            existingItem.Weight = itemVM.Weight.HasValue ? itemVM.Weight.Value : existingItem.Weight;
            existingItem.Height = itemVM.Height.HasValue ? itemVM.Height.Value : existingItem.Height;
            existingItem.Length = itemVM.Length.HasValue ? itemVM.Length.Value : existingItem.Length;
            existingItem.Width = itemVM.Width.HasValue ? itemVM.Width.Value : existingItem.Width;
            existingItem.GSTPercentage = itemVM.GSTPercentage.HasValue ? itemVM.GSTPercentage.Value : existingItem.GSTPercentage;
            existingItem.MinimumStock = itemVM.MinimumStock.HasValue ? itemVM.MinimumStock.Value : existingItem.MinimumStock;
            existingItem.MaximumStock = itemVM.MaximumStock.HasValue ? itemVM.MaximumStock.Value : existingItem.MaximumStock;
            existingItem.StartingQuantity = itemVM.StartingQuantity.HasValue ? itemVM.StartingQuantity.Value : existingItem.StartingQuantity;
            existingItem.ModifiedOn = DateTime.Now;
            existingItem.ModifiedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            // Retrieve current active customer category records for the item.
            var existingCategories = await _context.ItemCustomerCategories
                .Where(c => c.ItemId == id && c.IsDeleted == 0)
                .ToListAsync();

            // Process incoming customer category records.
            if (itemVM.ItemCustomerCategories != null && itemVM.ItemCustomerCategories.Any())
                {
                foreach (var incomingCat in itemVM.ItemCustomerCategories)
                    {
                    // Skip records that do not have a valid CustomerCategoryId.
                    if (!incomingCat.CustomerCategoryId.HasValue || incomingCat.CustomerCategoryId.Value == 0)
                        continue;

                    // If an ID is provided, update the existing record.
                    if (incomingCat.ItemCustomerCatId.HasValue && incomingCat.ItemCustomerCatId.Value > 0)
                        {
                        var dbCat = existingCategories
                            .FirstOrDefault(c => c.ItemCustomerCatId == incomingCat.ItemCustomerCatId.Value);
                        if (dbCat != null)
                            {
                            dbCat.CustomerCategoryId = incomingCat.CustomerCategoryId.Value;
                            dbCat.CustomerPrice = incomingCat.CustomerPrice.HasValue ? incomingCat.CustomerPrice.Value : dbCat.CustomerPrice;
                            dbCat.ModifiedOn = DateTime.Now;
                            dbCat.ModifiedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                            }
                        }
                    else
                        {
                        // Otherwise, add a new customer category record.
                        var newCat = new ItemCustomerCategory
                            {
                            ItemId = id,
                            CustomerCategoryId = incomingCat.CustomerCategoryId.Value,
                            CustomerPrice = incomingCat.CustomerPrice.HasValue ? incomingCat.CustomerPrice.Value : 0,
                            CreatedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                            CreatedOn = DateTime.Now,
                            IsActive = 1,
                            IsDeleted = 0
                            };
                        _context.ItemCustomerCategories.Add(newCat);
                        }
                    }
                }

            // Process any customer category records that need to be removed.
            if (itemVM.RemovedItemCustomerCategoryIds != null && itemVM.RemovedItemCustomerCategoryIds.Any())
                {
                foreach (var removedId in itemVM.RemovedItemCustomerCategoryIds)
                    {
                    var removeCat = existingCategories.FirstOrDefault(c => c.ItemCustomerCatId == removedId);
                    if (removeCat != null)
                        {
                        removeCat.IsDeleted = 1;
                        removeCat.ModifiedOn = DateTime.Now;
                        removeCat.ModifiedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                        }
                    }
                }

            // Save all changes.
            await _context.SaveChangesAsync();

            // Build the new state log for the updated item.
            var newlogItem = new
                {
                existingItem.ItemId,
                existingItem.ItemName,
                existingItem.ItemCode,
                existingItem.ItemDescription,
                existingItem.BrandId,
                existingItem.ItemGroupId,
                existingItem.UnitId,
                existingItem.SecondaryUnitID,
                existingItem.ConversionFactor,
                existingItem.PurchasePrice,
                existingItem.Weight,
                existingItem.Height,
                existingItem.Length,
                existingItem.Width,
                existingItem.GSTPercentage,
                existingItem.MaximumStock,
                existingItem.MinimumStock,
                existingItem.StartingQuantity,
                existingItem.ImagePath,
                existingItem.CreatedOn
                };

            // Retrieve updated customer category records.
            var updatedCategories = await _context.ItemCustomerCategories
                .Where(c => c.ItemId == id && c.IsDeleted == 0)
                .Select(c => new
                    {
                    c.ItemId,
                    c.CustomerCategoryId,
                    c.CustomerPrice
                    })
                .ToListAsync();

            // Create the activity log.
            var activityLog = new ActivityLog
                {
                MenuItemId = 17,
                ParentTableId = existingItem.ItemId,
                ActionType = "Update",
                OldData = System.Text.Json.JsonSerializer.Serialize(oldlogItem),
                NewData = System.Text.Json.JsonSerializer.Serialize(new { Item = newlogItem, ItemCustomerCategories = updatedCategories }),
                UserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                Date = DateTime.Now
                };

            await _activityLogRepository.Create(activityLog);

            // Commit the transaction.
            await transaction.CommitAsync();

            return Ok(new { message = "Item updated successfully." });
            }
        catch (Exception ex)
            {
            // Roll back the transaction if any errors occur.
            await transaction.RollbackAsync();
            Console.WriteLine($"Error: {ex.Message}");
            return StatusCode(500, "Internal server error.");
            }
        }



    /// <summary>
    /// Deletes an item by its ID.
    /// Also deletes the associated image file if it exists.
    /// </summary>
    /// <param name="id">The ID of the item to delete.</param>
    /// <returns>Returns a success message if deletion is successful.</returns>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteItem(int id)
        {
        string roleId = await GetUserRoleIdAsync();
        if (!await _permissionService.HasPermission(roleId, "Items", "Inventory System", "Delete"))
            return Forbid();

        try
            {
            // Retrieve the item record by ID.
            var item = await _context.Items.FirstOrDefaultAsync(c => c.ItemId == id);

            if (item == null)
                return NotFound("Item not found.");

            // If an image exists, delete the file from the server.
            if (!string.IsNullOrEmpty(item.ImagePath))
                {
                DeleteImage(item.ImagePath);
                }
            item.IsDeleted = 1;
            _context.Items.Update(item);
            await _context.SaveChangesAsync();

            return Ok("Item deleted successfully.");
            }
        catch (Exception ex)
            {
            // Log the error details and return an internal server error.
            Console.WriteLine($"Error: {ex.Message}");
            return StatusCode(500, "Internal server error.");
            }
        }

    /// <summary>
    /// Retrieves a single item by its ID along with its associated customer category records.
    /// Maps the data into an ItemVM view model for client consumption.
    /// </summary>
    /// <param name="id">The ID of the item to retrieve.</param>
    /// <returns>An ItemVM object containing item details and customer category information.</returns>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetItemById(int id)
        {
        string roleId = await GetUserRoleIdAsync();
        if (!await _permissionService.HasPermission(roleId, "Items", "Inventory System", "Update"))
            return Forbid();

        try
            {
            // Retrieve the item record ensuring it is active and not deleted.
            var itemEntity = await _context.Items
                .FirstOrDefaultAsync(it => it.ItemId == id && it.IsActive == 1 && it.IsDeleted == 0);

            if (itemEntity == null)
                {
                return NotFound($"PriceList with ID {id} not found.");
                }

            // Retrieve associated customer category records.
            var itemCustomerCategoriesEntities = await _context.ItemCustomerCategories
                .Where(item => item.ItemId == id && item.IsDeleted == 0)
                .ToListAsync();

            // Map the item and its customer categories to the view model.
            var itemListVM = new ItemVM
                {
                ItemId = itemEntity.ItemId,
                ItemName = itemEntity.ItemName,
                ItemCode = itemEntity.ItemCode,
                ItemDescription = itemEntity.ItemDescription,
                BrandId = itemEntity.BrandId,
                ItemGroupId = itemEntity.ItemGroupId,
                UnitId = itemEntity.UnitId,
                SecondaryUnitID = itemEntity.SecondaryUnitID,
                ConversionFactor = itemEntity.ConversionFactor,
                PurchasePrice = itemEntity.PurchasePrice,
                Weight = itemEntity.Weight,
                Height = itemEntity.Height,
                Length = itemEntity.Length,
                Width = itemEntity.Width,
                GSTPercentage = itemEntity.GSTPercentage,
                MaximumStock = itemEntity.MaximumStock,
                MinimumStock = itemEntity.MinimumStock,
                StartingQuantity = itemEntity.StartingQuantity,
                ImagePath = itemEntity.ImagePath,
                ItemCustomerCategories = itemCustomerCategoriesEntities
                    .Where(a => a.IsActive == 1 && a.IsDeleted == 0)
                    .Select(item => new ItemCustomerCategoryVM
                        {
                        ItemCustomerCatId = item.ItemCustomerCatId,
                        ItemId = item.ItemId,
                        CustomerCategoryId = item.CustomerCategoryId,
                        CustomerPrice = item.CustomerPrice,
                        })
                    .ToList()
                };

            return Ok(itemListVM);
            }
        catch (Exception ex)
            {
            // Log any error and return an internal server error.
            Console.WriteLine($"Error: {ex.Message}");
            return StatusCode(500, "Internal server error.");
            }
        }
    [HttpGet("detail/{id}")]
    public async Task<IActionResult> DetailItemById(int id)
        {
        string roleId = await GetUserRoleIdAsync();
        if (!await _permissionService.HasPermission(roleId, "Items", "Inventory System", "View"))
            return Forbid();

        try
            {
            // Retrieve the item record ensuring it is active and not deleted.
            var itemEntity = await _context.Items
                .FirstOrDefaultAsync(it => it.ItemId == id && it.IsActive == 1 && it.IsDeleted == 0);

            if (itemEntity == null)
                {
                return NotFound($"PriceList with ID {id} not found.");
                }

            // Retrieve associated customer category records.
            var itemCustomerCategoriesEntities = await _context.ItemCustomerCategories
                .Where(item => item.ItemId == id && item.IsDeleted == 0)
                .ToListAsync();

            // Map the item and its customer categories to the view model.
            var itemListDetail = new
                {
                ItemId = itemEntity.ItemId,
                ItemName = itemEntity.ItemName,
                ItemCode = itemEntity.ItemCode,
                ItemDescription = itemEntity.ItemDescription,

                BrandName = _context.Brands.Where(c => c.BrandId == itemEntity.BrandId).Select(c => c.BrandName).FirstOrDefault(),

                ItemGroupName = _context.ItemGroups.Where(c => c.ItemGroupId == itemEntity.ItemGroupId).Select(c => c.ItemGroupName).FirstOrDefault(),

                UnitName = _context.Units.Where(c => c.UnitId == itemEntity.UnitId).Select(c => c.UnitName).FirstOrDefault(),
                SecondaryUnit = _context.Units.Where(c => c.UnitId == itemEntity.SecondaryUnitID).Select(c => c.UnitName).FirstOrDefault(),
                ConversionFactor = itemEntity.ConversionFactor,
                PurchasePrice = itemEntity.PurchasePrice,
                Weight = itemEntity.Weight,
                Height = itemEntity.Height,
                Length = itemEntity.Length,
                Width = itemEntity.Width,
                GSTPercentage = itemEntity.GSTPercentage,
                MaximumStock = itemEntity.MaximumStock,
                MinimumStock = itemEntity.MinimumStock,
                StartingQuantity = itemEntity.StartingQuantity,
                ImagePath = itemEntity.ImagePath,
                CreatedOn = itemEntity.CreatedOn,
                ItemCustomerCategories = itemCustomerCategoriesEntities
                    .Where(a => a.IsActive == 1 && a.IsDeleted == 0)
                    .Select(item => new
                        {
                        ItemCustomerCatId = item.ItemCustomerCatId,
                        ItemId = item.ItemId,

                        CustomerCategoryName = _context.CustomerCategories.Where(c => c.CustomerCategoryId == item.CustomerCategoryId).Select(c => c.CustomerCategoryName).FirstOrDefault(),
                        CustomerPrice = item.CustomerPrice,
                        })
                    .ToList()
                };

            return Ok(itemListDetail);
            }
        catch (Exception ex)
            {
            // Log any error and return an internal server error.
            Console.WriteLine($"Error: {ex.Message}");
            return StatusCode(500, "Internal server error.");
            }
        }

    #region Image (Save and Delete)
    /// <summary>
    /// Saves an uploaded image to the server's file system.
    /// Creates the Uploads directory if it doesn't exist.
    /// </summary>
    /// <param name="imageFile">The image file to be saved.</param>
    /// <returns>The relative path of the saved image.</returns>
    private string SaveImage(IFormFile imageFile)
        {
        var uploadsDirectory = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "Uploads");

        if (!Directory.Exists(uploadsDirectory))
            {
            Directory.CreateDirectory(uploadsDirectory);
            }

        var imageFileName = Guid.NewGuid() + Path.GetExtension(imageFile.FileName);
        var fullPath = Path.Combine(uploadsDirectory, imageFileName);

        using (var stream = new FileStream(fullPath, FileMode.Create))
            {
            imageFile.CopyTo(stream);
            }

        return Path.Combine("Uploads", imageFileName);
        }

    /// <summary>
    /// Deletes an image from the server given its relative path.
    /// </summary>
    /// <param name="relativePath">The relative path to the image file.</param>
    private void DeleteImage(string relativePath)
        {
        var fullPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", relativePath);

        if (System.IO.File.Exists(fullPath))
            {
            System.IO.File.Delete(fullPath);
            }
        }
    #endregion

    #region Fetch Data for DropDown

    /// <summary>
    /// Retrieves all active and non-deleted item groups for use in dropdown lists.
    /// </summary>
    /// <returns>A list of item groups containing IDs and names.</returns>
    [HttpGet("get-groups")]
    public async Task<IActionResult> GetAllGroup()
        {
        try
            {
            var itemGroups = await _context.ItemGroups
                .Where(a => a.IsActive == 1 && a.IsDeleted == 0)
                .Select(c => new
                    {
                    c.ItemGroupId,
                    c.ItemGroupName
                    })
                .ToListAsync();

            return Ok(itemGroups);
            }
        catch (Exception ex)
            {
            return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

    /// <summary>
    /// Retrieves all active and non-deleted brands for use in dropdown lists.
    /// </summary>
    /// <returns>A list of brands containing IDs and names.</returns>
    [HttpGet("get-brands")]
    public async Task<IActionResult> GetAllBrands()
        {
        try
            {
            var itemBrands = await _context.Brands
                .Where(a => a.IsActive == 1 && a.IsDeleted == 0)
                .Select(c => new
                    {
                    c.BrandId,
                    c.BrandName
                    })
                .ToListAsync();

            return Ok(itemBrands);
            }
        catch (Exception ex)
            {
            return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

    [HttpGet("activity_log/item/{id}")]
    public async Task<IActionResult> GetActivityLogsForItems(int id)
        {
        try
            {
            var logs = await _context.ActivityLogs
                .Where(a => a.MenuItemId == 17)
                // Left join with Users
                .GroupJoin(
                    _context.Users,
                    a => a.UserId,
                    u => u.Id,
                    (a, users) => new { a, users }
                )
                .SelectMany(
                    temp => temp.users.DefaultIfEmpty(),
                    (temp, user) => new { temp.a, user }
                )
                // Left join with Items
                .GroupJoin(
                    _context.Items,
                    temp => temp.a.ParentTableId,
                    b => b.ItemId,
                    (temp, Items) => new { temp.a, temp.user, Items }
                )
                .SelectMany(
                    temp => temp.Items.DefaultIfEmpty(),
                    (temp, item) => new { temp.a, temp.user, item }
                )
                // Apply filter for itemId = 1 (ensure item is not null)
                .Where(x => x.item != null && x.item.ItemId == id)
                // Project to the desired shape
                .Select(x => new
                    {
                    x.a.ActionType,
                    x.a.OldData,
                    x.a.NewData,
                    itemName = x.item.ItemName,
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

   
    [HttpGet("GetAllItemStockSP")]
    public async Task<IActionResult> GetAllItemStockSP ( )
        {
        try
            {
            var conn = _context.Database.GetDbConnection();
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = "SP_GetAllItemStock";
            cmd.CommandType = CommandType.StoredProcedure;

            if (conn.State != ConnectionState.Open)
                await conn.OpenAsync();

            await using var reader = await cmd.ExecuteReaderAsync();
            var items = new List<ItemStockDto>();

            while (await reader.ReadAsync())
                {
                items.Add(new ItemStockDto
                    {
                    ItemID = Convert.ToInt32(reader["ItemID"]),
                    ItemCode = reader["ItemCode"] as string,
                    BrandName = reader["BrandName"] as string,
                    ItemGroupName = reader["ItemGroupName"] as string,
                    ItemName = reader["ItemName"] as string,
                    Quantity = reader["Quantity"] as decimal?,
                    WarehouseName = reader["WarehouseName"] as string,
                    GSTPercentage = reader["GSTPercentage"] as decimal?,
                    Prices = reader["Prices"] as string
                    });
                }

            // add 1-based index for each row
            var result = items
                .Select(( it, idx ) => new
                    {
                    Index = idx + 1,
                    it.ItemID,
                    it.ItemCode,
                    it.BrandName,
                    it.ItemGroupName,
                    it.ItemName,
                    it.Quantity,
                    it.WarehouseName,
                    it.GSTPercentage,
                    it.Prices
                    })
                .ToList();

            return Ok(result);
            }
        catch (Exception ex)
            {
            // TODO: log with ILogger
            return StatusCode(500, "An error occurred while fetching item stocks.");
            }
        }
    private async Task<string> GetUserRoleIdAsync()
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
    /// <summary>
    /// Retrieves all active and non-deleted units for use in dropdown lists.
    /// </summary>
    /// <returns>A list of units containing IDs and names.</returns>
    [HttpGet("get-units")]
    public async Task<IActionResult> GetAllUnits()
        {
        try
            {
            var itemUnits = await _context.Units
                .Where(a => a.IsActive == 1 && a.IsDeleted == 0)
                .Select(c => new
                    {
                    c.UnitId,
                    c.UnitName
                    })
                .ToListAsync();

            return Ok(itemUnits);
            }
        catch (Exception ex)
            {
            return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

    [HttpGet("GetItemStockDashboard")]
    public async Task<IActionResult> GetItemStockDashboard ( )
        {
        try
            {
            var conn = _context.Database.GetDbConnection();
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = "SP_GetItemStockDashboard";
            cmd.CommandType = CommandType.StoredProcedure;

            if (conn.State != ConnectionState.Open)
                await conn.OpenAsync();

            await using var reader = await cmd.ExecuteReaderAsync();
            var items = new List<ItemStockDashboardDto>();

            while (await reader.ReadAsync())
                {
                items.Add(new ItemStockDashboardDto
                    {
                    ItemID = Convert.ToInt32(reader["ItemID"]),
                    ItemCode = reader["ItemCode"] as string,
                   
                    ItemName = reader["ItemName"] as string,
                    Quantity = reader["Quantity"] as decimal?,
                   
                    });
                }

            // add 1-based index for each row
            var result = items
                .Select(( it, idx ) => new
                    {
                    Index = idx + 1,
                    it.ItemID,
                    it.ItemCode,
                 
                    it.ItemName,
                    it.Quantity,
                   
                    })
                .ToList();

            return Ok(result);
            }
        catch (Exception ex)
            {
            // TODO: log with ILogger
            return StatusCode(500, "An error occurred while fetching item stocks.");
            }
        }
    [HttpGet("GetDataForDashboard")]
    public async Task<IActionResult> GetDataForDashboard ( )
        {
        var conn = _context.Database.GetDbConnection();
        try
            {
            await conn.OpenAsync();

            using var cmd = conn.CreateCommand();
            cmd.CommandText = "GetDataForDashboard";
            cmd.CommandType = System.Data.CommandType.StoredProcedure;

            using var reader = await cmd.ExecuteReaderAsync();
            if (await reader.ReadAsync())
                {
                var dto = new DashboardDto
                    {
                    // you can also use reader.GetOrdinal if you prefer
                    ItemsCount = reader.GetInt32(reader.GetOrdinal("ItemsCount")),
                    TotalSales = reader.GetDecimal(reader.GetOrdinal("TotalSales")),
                    TotalPurchases = reader.GetDecimal(reader.GetOrdinal("TotalPurchases")) ,
                    CustomersCount = reader.GetInt32(reader.GetOrdinal("CustomersCount")) ,
                    VendorsCount = reader.GetInt32(reader.GetOrdinal("VendorsCount")) ,
                    PurchaseInvoicesCount = reader.GetInt32(reader.GetOrdinal("PurchaseInvoicesCount")) ,
                    SalesInvoicesCount = reader.GetInt32(reader.GetOrdinal("SalesInvoicesCount")),
                    QuantitySold = reader.GetInt32(reader.GetOrdinal("QuantitySold")),
                    ItemName = reader.GetString(reader.GetOrdinal("ItemName")),
                    };
                return Ok(dto);
                }

            // no rows → return zeros
            return Ok(new DashboardDto());
            }
        catch (Exception ex)
            {
            // _logger.LogError(ex, "Error fetching dashboard data");
            return StatusCode(500, "An error occurred while loading dashboard data.");
            }
        finally
            {
            if (conn.State == System.Data.ConnectionState.Open)
                await conn.CloseAsync();
            }
        }
    /// <summary>
    /// Retrieves all active and non-deleted customer categories for use in dropdown lists.
    /// </summary>
    /// <returns>A list of customer categories containing IDs and names.</returns>
    [HttpGet("get-customerCategories")]
    public async Task<IActionResult> GetAllCustomerCategories()
        {
        try
            {
            var customerCategorys = await _context.CustomerCategories
                .Where(a => a.IsActive == 1 && a.IsDeleted == 0)
                .Select(c => new
                    {
                    c.CustomerCategoryId,
                    c.CustomerCategoryName
                    })
                .ToListAsync();

            return Ok(customerCategorys);
            }
        catch (Exception ex)
            {
            return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
        }
    #endregion

    public class ItemStockDto
        {
        public int ItemID { get; set; }
        public string ItemCode { get; set; }
        public string BrandName { get; set; }
        public string ItemGroupName { get; set; }
        public string ItemName { get; set; }
        public decimal? Quantity { get; set; }
        public string WarehouseName { get; set; }
        public decimal? GSTPercentage { get; set; }
        public string? Prices { get; set; }
        }
    public class ItemStockDashboardDto
        {
        public int ItemID { get; set; }
        public string ItemCode { get; set; }
       
        public string ItemName { get; set; }
        public decimal? Quantity { get; set; }
     
        }
    public class DashboardDto
        {
        public int ItemsCount { get; set; }
        public decimal TotalSales { get; set; }
        public decimal QuantitySold { get; set; }
        public decimal TotalPurchases { get; set; }
        public int CustomersCount { get; set; }
        public int VendorsCount { get; set; }
        public int PurchaseInvoicesCount { get; set; }
        public int SalesInvoicesCount { get; set; }
        public string ItemName { get; set; }
        }
    }
