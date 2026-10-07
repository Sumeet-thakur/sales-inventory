using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SalesInventoryAPI.Data;
using SalesInventoryAPI.Data.ViewModels;
using SalesInventoryAPI.Models;
using SalesInventoryAPI.Data.Services;
using MySqlConnector;

namespace SalesInventoryAPI.Controller
    {
    [Route("api/[controller]")]
    [ApiController]
    public class AdjustmentTypeController : ControllerBase
        {
        private readonly InventoryDbContext _context;
        private readonly PermissionService _permissionService;
        private readonly ActivityLogRepository _activityLogRepository;

        public AdjustmentTypeController (
            InventoryDbContext context,
            PermissionService permissionService,
            ActivityLogRepository activityLogRepository )
            {
            _context = context;
            _permissionService = permissionService;
            _activityLogRepository = activityLogRepository;
            }

        // GET: api/AdjustmentType/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById ( int id )
            {
            var entity = await _context.AdjustmentTypes
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.AdjustmentTypeID == id && a.IsDeleted == 0 && a.IsActive == 1);

            if (entity == null)
                return NotFound($"AdjustmentType with ID {id} not found.");

            var vm = new AdjustmentTypeVM
                {
                AdjustmentTypeID = entity.AdjustmentTypeID,
                Name = entity.Name,
                Description = entity.Description,
                InventoryEffect = (int)entity.InventoryEffect
                };

            return Ok(vm);
            }

        // POST: api/AdjustmentType
        [HttpPost]
        public async Task<IActionResult> Create ( [FromBody] AdjustmentTypeVM request )
            {
            if (request == null)
                return BadRequest("Request body cannot be null.");

            var checkAdjustmentType = await _context.AdjustmentTypes.FirstOrDefaultAsync(i => i.Name.Trim() == request.Name.Trim());
            if (checkAdjustmentType != null)
                return BadRequest(new { Succeeded = false, Message = "Adjustment Type Name already exists." });

            await using var tx = await _context.Database.BeginTransactionAsync();
            try
                {
                var now = DateTime.Now;
                var user = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "System";

                var entity = new AdjustmentType
                    {
                    Name = request.Name,
                    Description = request.Description,
                    InventoryEffect = request.InventoryEffect,
                    CreatedBy = user,
                    CreatedOn = now,
                    IsActive = 1,
                    IsDeleted = 0
                    };

                _context.AdjustmentTypes.Add(entity);
                await _context.SaveChangesAsync();

               
                var logPayload = new
                    {
                    entity.AdjustmentTypeID,
                    entity.Name,
                    entity.Description,
                    entity.InventoryEffect,
                    entity.CreatedBy,
                    entity.CreatedOn
                    };

              
                await _activityLogRepository.Create(new ActivityLog
                    {
                    MenuItemId = 32,
                    ParentTableId = entity.AdjustmentTypeID,
                    ActionType = "Create",
                    OldData = string.Empty,
                    NewData = System.Text.Json.JsonSerializer.Serialize(logPayload),
                    UserId = user,
                    Date = now
                    });

                
                await tx.CommitAsync();

                return CreatedAtAction(
                    nameof(GetById),
                    new { id = entity.AdjustmentTypeID },
                    new { entity.AdjustmentTypeID });
                }
            catch (Exception ex)
                {
                await tx.RollbackAsync();
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }


        // PUT: api/AdjustmentType/5
        [HttpPut("{id}")]
        public async Task<IActionResult> Update ( int id, [FromBody] AdjustmentTypeVM request )
            {
            if (request == null || request.AdjustmentTypeID != id)
                return BadRequest("Invalid request data.");

            await using var tx = await _context.Database.BeginTransactionAsync();
            try
                {
                // 1) Load the existing entity, including any children if needed
                var entity = await _context.AdjustmentTypes
                    .FirstOrDefaultAsync(a => a.AdjustmentTypeID == id && a.IsDeleted == 0 && a.IsActive == 1);

                if (entity == null)
                    return NotFound($"AdjustmentType with ID {id} not found.");

                // 2) Capture the “old” snapshot
                var oldPayload = new
                    {
                    entity.AdjustmentTypeID,
                    entity.Name,
                    entity.Description,
                    entity.InventoryEffect,
                    entity.ModifiedBy,
                    entity.ModifiedOn
                    };

                // 3) Apply your updates
                var user = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "System";
                entity.Name = request.Name;
                entity.Description = request.Description;
                entity.InventoryEffect = request.InventoryEffect;
                entity.ModifiedBy = user;
                entity.ModifiedOn = DateTime.Now;

                _context.AdjustmentTypes.Update(entity);
                await _context.SaveChangesAsync();

                // 4) Capture the “new” snapshot
                var newPayload = new
                    {
                    entity.AdjustmentTypeID,
                    entity.Name,
                    entity.Description,
                    entity.InventoryEffect,
                    entity.ModifiedBy,
                    entity.ModifiedOn
                    };

                // 5) Log the change
                await _activityLogRepository.Create(new ActivityLog
                    {
                    MenuItemId = 32,
                    ParentTableId = entity.AdjustmentTypeID,
                    ActionType = "Update",
                    OldData = System.Text.Json.JsonSerializer.Serialize(oldPayload),
                    NewData = System.Text.Json.JsonSerializer.Serialize(newPayload),
                    UserId = user,
                    Date = DateTime.Now
                    });

                // 6) Commit the transaction
                await tx.CommitAsync();

                return Ok(new { entity.AdjustmentTypeID });
                }
            catch (Exception ex)
                {
                await tx.RollbackAsync();
                return StatusCode(500, $"Internal server error: {ex.Message}");
                }
            }
        [HttpGet]

        public async Task<IActionResult> GetAllAdjustmentTypes ( )
            {
            

            try
                {
                var adjustmentTypes = await _context.AdjustmentTypes
                    .Where(b => b.IsActive == 1 && b.IsDeleted == 0)
                    .Select(c => new
                        {
                        c.AdjustmentTypeID,
                        c.Name,
                        c.Description,
                        c.InventoryEffect
                        })
                    .ToListAsync();

                var indexedadjustmentTypes = adjustmentTypes.Select(( adjustmentType, index ) => new
                    {
                    Index = index + 1,  // Using index + 1 so that indexing starts at 1
                    adjustmentType.AdjustmentTypeID,
                    adjustmentType.Name,
                    adjustmentType.Description,
                    adjustmentType.InventoryEffect,
                   
                    }).ToList();

                return Ok(indexedadjustmentTypes);
                }
            catch (Exception ex)
                {
                // Log exception
                Console.WriteLine($"Error: {ex.Message}");
                return StatusCode(500, "Internal server error.");
                }
            }

        [HttpGet("detail-by-id/{id}")]
        public async Task<IActionResult> DetailById ( int id )
            {
            var entity = await _context.AdjustmentTypes
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.AdjustmentTypeID == id && a.IsDeleted == 0 && a.IsActive == 1);

            if (entity == null)
                return NotFound($"AdjustmentType with ID {id} not found.");

            var vm = new AdjustmentTypeVM
                {
                AdjustmentTypeID = entity.AdjustmentTypeID,
                Name = entity.Name,
                Description = entity.Description,
                InventoryEffect = (int)entity.InventoryEffect
                };

            return Ok(vm);
            }
        [HttpGet("activity_log/adjustmenttype/{id}")]
        public async Task<IActionResult> GetActivityLogsForAdjustmenttype ( int id )
            {
            try
                {
                var logs = await _context.ActivityLogs
                    .Where(a => a.MenuItemId == 32)
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
                    // Left join with AdjustmentTypes
                    .GroupJoin(
                        _context.AdjustmentTypes,
                        temp => temp.a.ParentTableId,
                        b => b.AdjustmentTypeID,
                        ( temp, adjustmentTypes ) => new { temp.a, temp.user, adjustmentTypes }
                    )
                    .SelectMany(
                        temp => temp.adjustmentTypes.DefaultIfEmpty(),
                        ( temp, adjustmentType ) => new { temp.a, temp.user, adjustmentType }
                    )
                    // Apply filter for BrandID = 1 (ensure brand is not null)
                    .Where(x => x.adjustmentType != null && x.adjustmentType.AdjustmentTypeID == id)
                    // Project to the desired shape
                    .Select(x => new
                        {
                        x.a.ActionType,
                        x.a.OldData,
                        x.a.NewData,
                        AdjustmentTypeName = x.adjustmentType.Name,
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

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAdjustmentType ( int id )
            {

          

            try
                {
                var adjustmentType = await _context.AdjustmentTypes.FirstOrDefaultAsync(c => c.AdjustmentTypeID == id);

                if (adjustmentType == null) return NotFound("Brand not found.");
                adjustmentType.IsDeleted = 1;
                _context.AdjustmentTypes.Update(adjustmentType);
                int result = await _context.SaveChangesAsync();

                if (result > 0)
                    {
                    var logadjustmentType = new
                        {
                        adjustmentType.AdjustmentTypeID,
                        adjustmentType.Name,
                        adjustmentType.Description  ,
                        adjustmentType.InventoryEffect
                        };
                    var activityLog = new ActivityLog
                        {
                        MenuItemId = 32,
                        ParentTableId = adjustmentType.AdjustmentTypeID,
                        ActionType = "Delete",
                        OldData = "",
                        NewData = System.Text.Json.JsonSerializer.Serialize(logadjustmentType),
                        UserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                        Date = DateTime.Now
                        };
                    await _activityLogRepository.Create(activityLog);
                    }

                return Ok("AdjustmentTypes deleted successfully.");
                }
            catch (Exception ex)
                {
                if (ex.InnerException is MySqlException mysqlEx && mysqlEx.Number == 1451)
                    {
                    return BadRequest(new { message = "This brand cannot be deleted because it is associated with existing items." });
                    }
                // Log exception
                Console.WriteLine($"Error: {ex.Message}");
                return StatusCode(500, "Internal server error.");
                }
            }
        }

    }
