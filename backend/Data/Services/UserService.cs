// Services/UserService.cs
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SalesInventoryAPI.Models;

namespace SalesInventoryAPI.Data.Services
    {

    public interface IUserService
        {
        Task LogoutOnDisconnectAsync ( string userId );
        }

    public class UserService : IUserService
        {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly InventoryDbContext _context;

        public UserService (
            UserManager<ApplicationUser> userManager,
            InventoryDbContext context )
            {
            _userManager = userManager;
            _context = context;
            }

        public async Task LogoutOnDisconnectAsync ( string userId )
            {
            // 1) Find the user
            var user = await _userManager.Users
                .FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null) return;

            // 2) Clear whatever “session” or “CurrentSessionId” you have
            user.CurrentSessionId = null;

            // 3) Revoke any active refresh tokens (so they can’t silently refresh again)
            var activeTokens = await _context.RefreshTokens
                .Where(rt => rt.UserId == userId && !rt.IsRevoked)
                .ToListAsync();

            foreach (var rt in activeTokens)
                {
                rt.IsRevoked = true;
                }

            await _context.SaveChangesAsync();

            // (Optional) You could broadcast to other hubs if needed
            // e.g. notify other users that this user went offline
            }
        }

    }
