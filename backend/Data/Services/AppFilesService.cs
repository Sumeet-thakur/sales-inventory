using Microsoft.EntityFrameworkCore;
using SalesInventoryAPI.Models;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;

namespace SalesInventoryAPI.Data.Services
    {
    public class AppFilesService
        {
        private readonly InventoryDbContext _context;
        private readonly ILogger<AppFilesService> _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public AppFilesService (
            InventoryDbContext context,
            ILogger<AppFilesService> logger,
            IHttpContextAccessor httpContextAccessor )
            {
            _context = context;
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
            }

        public async Task<MultipleAttachment> Upload ( MultipleAttachment appFile, IFormFile formFile )
            {
            try
                {
                string savedFilePath = await SaveFileAsync(formFile);
                // Normalize the path so it uses forward slashes.
                savedFilePath = savedFilePath.Replace("\\", "/");
                appFile.FilePath = savedFilePath;
                await _context.Multipleattachments.AddAsync(appFile);
                await _context.SaveChangesAsync();

                // Return the created activityLog, which now includes its generated ActivityLogId.
                return appFile;
                }
            catch (Exception ex)
                {
                _logger.LogError(ex, "An error occurred while creating error record");
                throw;
                }
            }
        public async Task RemoveAttachmentsAsync ( int menuItemId, int parentTableId )
            {
            var existing = await _context.Multipleattachments
                .Where(m => m.MenuItemId == menuItemId && m.ParentTableId == parentTableId)
                .ToListAsync();
            var user = _httpContextAccessor.HttpContext?.User;
            var currentUserId = user?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                                ?? "Unknown";

            foreach (var file in existing)
                {
                // delete file from disk
                var fullPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", file.FilePath);
                if (File.Exists(fullPath))
                    File.Delete(fullPath);

                _context.Multipleattachments.Remove(file);
                }
            await _context.SaveChangesAsync();
            }
        private async Task<string> SaveFileAsync ( IFormFile file )
            {
            var uploadsDirectory = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "Uploads");

            if (!Directory.Exists(uploadsDirectory))
                {
                Directory.CreateDirectory(uploadsDirectory);
                }

            var imageFileName = Guid.NewGuid() + Path.GetExtension(file.FileName);
            var fullPath = Path.Combine(uploadsDirectory, imageFileName);

            using (var stream = new FileStream(fullPath, FileMode.Create))
                {
                file.CopyTo(stream);
                }

            return Path.Combine("Uploads", imageFileName);
            }

        public async Task RemoveSpecificAttachmentsAsync ( int menuItemId, int parentTableId, List<int> idsToRemove )
            {
            var user = _httpContextAccessor.HttpContext?.User;
            var currentUserId = user?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                                ?? "Unknown";
            var toDelete = await _context.Multipleattachments
                .Where(m =>
                    m.MenuItemId == menuItemId &&
                    m.ParentTableId == parentTableId &&
                    idsToRemove.Contains(m.MultipleAttachmentfileId)
                ).ToListAsync();

            foreach (var file in toDelete)
                {
                var fullPath = Path.Combine(
                    Directory.GetCurrentDirectory(),
                    "wwwroot",
                    file.FilePath
                );
                if (File.Exists(fullPath))
                    File.Delete(fullPath);
                file.IsDeleted = 1;
                file.ModifiedBy = currentUserId;
                file.ModifiedOn = DateTime.Now;
                _context.Multipleattachments.Update(file);
                }
            await _context.SaveChangesAsync();
            }

        }
    }
