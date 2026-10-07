// Hubs/PresenceHub.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using SalesInventoryAPI.Data.Services;
using SalesInventoryAPI.Helpers;
namespace SalesInventoryAPI.Hubs
    {


    [Authorize] // Require that the user is authenticated
    public class PresenceHub : Hub
        {
        private readonly IConnectionMapping<string> _connections;
        private readonly IUserService _userService;
        public PresenceHub (
            IConnectionMapping<string> connections,
            IUserService userService )
            {
            _connections = connections;
            _userService = userService;
            }

        public override async Task OnConnectedAsync ( )
            {
            // Context.UserIdentifier is set by SignalR if you configure it (see Program.cs)
            var userId = Context.UserIdentifier;
            _connections.Add(userId, Context.ConnectionId);

            // (Optional) You could notify others that this user is now “online”
            // await Clients.Others.SendAsync("UserCameOnline", userId);

            await base.OnConnectedAsync();
            }

        public override async Task OnDisconnectedAsync ( Exception? exception )
            {
            var userId = Context.UserIdentifier;
            _connections.Remove(userId, Context.ConnectionId);

            // If there are no more open connections for this user,
            // treat it as a “full logout”
            if (!_connections.GetConnections(userId).Any())
                {
                // Call your logout logic here
                await _userService.LogoutOnDisconnectAsync(userId);
                }

            await base.OnDisconnectedAsync(exception);
            }
        }

    }
