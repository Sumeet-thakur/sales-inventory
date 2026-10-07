// PendingCountsBroadcastService.cs
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using SalesInventoryAPI.Data.Services;
using SalesInventoryAPI.Hubs;

namespace SalesInventoryAPI.Data.Services
    {
    public class PendingCountsBroadcastService : BackgroundService
        {
        private readonly IHubContext<PendingCountsHub> _hubContext;
        private readonly IServiceProvider _provider;
        private readonly TimeSpan _interval = TimeSpan.FromSeconds(3);

        public PendingCountsBroadcastService (
            IHubContext<PendingCountsHub> hubContext,
            IServiceProvider provider )
            {
            _hubContext = hubContext;
            _provider = provider;
            }

        protected override async Task ExecuteAsync ( CancellationToken stoppingToken )
            {
            while (!stoppingToken.IsCancellationRequested)
                {
                // create a scope so we can resolve scoped services
                using var scope = _provider.CreateScope();
                var pendingService = scope
                    .ServiceProvider
                    .GetRequiredService<PendingCountsService>();

                // fetch data within the scope
                var data = await pendingService.GetPendingCountsAsync();

                // broadcast out to all connected clients
                await _hubContext
                    .Clients
                    .All
                    .SendAsync("ReceivePendingCounts", data, cancellationToken: stoppingToken);

                // wait before repeating
                await Task.Delay(_interval, stoppingToken);
                }
            }
        }
    }
