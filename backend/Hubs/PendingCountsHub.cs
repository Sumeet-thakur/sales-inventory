// in Hubs/PendingCountsHub.cs
using Microsoft.AspNetCore.SignalR;
using SalesInventoryAPI.Data.DTOs;
using SalesInventoryAPI.Data.Services;

namespace SalesInventoryAPI.Hubs
    {
    public class PendingCountsHub : Hub
        {
        private readonly PendingCountsService _pendingCountsService;

        public PendingCountsHub ( PendingCountsService pendingCountsService )
            {
            _pendingCountsService = pendingCountsService;
            }

        // callable by clients to fetch immediately
        public async Task GetPendingCounts ( )
            {
            var data = await _pendingCountsService.GetPendingCountsAsync();
            await Clients.Caller.SendAsync("ReceivePendingCounts", data);
            }
        }
    }
