using SalesInventoryAPI.Models;

namespace SalesInventoryAPI.Data.Services
{

    public class ActivityLogRepository
    {
        private readonly InventoryDbContext _context;
        private readonly ILogger<ActivityLogRepository> _logger;
        public ActivityLogRepository(InventoryDbContext context, ILogger<ActivityLogRepository> logger)
        {
            _context = context;
            _logger = logger;
        }
        public async Task<ActivityLog> Create(ActivityLog activityLog)
        {
            try
            {
                
                await _context.ActivityLogs.AddAsync(activityLog);
                await _context.SaveChangesAsync();

                // Return the created activityLog, which now includes its generated ActivityLogId.
                return activityLog;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while creating error record");
                throw; 
            }
        
        }
    }
}
