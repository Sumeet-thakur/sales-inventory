using SalesInventoryAPI.Models;

namespace SalesInventoryAPI.Data.Services
    {
    public class ReviseLogRepository
        {
        private readonly InventoryDbContext _context;
        private readonly ILogger<ReviseLogRepository> _logger;
        public ReviseLogRepository(InventoryDbContext context, ILogger<ReviseLogRepository> logger)
            {
            _context = context;
            _logger = logger;
            }
        public async Task<Reviselog> Create(Reviselog reviseLog)
            {
            try
                {

                await _context.ReviseLogs.AddAsync(reviseLog);
                await _context.SaveChangesAsync();

                // Return the created activityLog, which now includes its generated ActivityLogId.
                return reviseLog;
                }
            catch (Exception ex)
                {
                _logger.LogError(ex, "An error occurred while creating error record");
                throw;
                }

            }
        }
    }
