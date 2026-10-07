using Microsoft.AspNetCore.Mvc;
using SalesInventoryAPI.Controller;
using SalesInventoryAPI.Models;
using static System.Runtime.InteropServices.JavaScript.JSType;
using Error = SalesInventoryAPI.Models.Error;

namespace SalesInventoryAPI.Data.Services
{
    public class ErrorsRepository
    {

        private readonly InventoryDbContext _context;
        private readonly ILogger<ErrorsRepository> _logger;
        public ErrorsRepository(InventoryDbContext context, ILogger<ErrorsRepository> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<Guid> Create(Error error)
        {
            try
            {
                // Truncate error details if necessary
                error.ErrorMessage = error.ErrorMessage != null && error.ErrorMessage.Length > 1000
                    ? error.ErrorMessage.Substring(0, 1000)
                    : error.ErrorMessage;
                error.StackTrace = error.StackTrace != null && error.StackTrace.Length > 4000
                    ? error.StackTrace.Substring(0, 4000)
                    : error.StackTrace;
                error.ErrorId = Guid.NewGuid();
                await _context.Errors.AddRangeAsync(error);
                await _context.SaveChangesAsync();

                return error.ErrorId;
            }
            catch (Exception ex)
            {

                _logger.LogError(ex, "An error occurred while creating error record");
                throw; // Propagate the exception to the caller
            }
        }
    }
}
