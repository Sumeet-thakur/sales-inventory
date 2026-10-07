// in Data/Services/PendingCountsService.cs
using Microsoft.EntityFrameworkCore;
using SalesInventoryAPI.Data.DTOs;
using System.Data;

namespace SalesInventoryAPI.Data.Services
    {
    public class PendingCountsService
        {
        private readonly InventoryDbContext _context;

        public PendingCountsService ( InventoryDbContext context )
            {
            _context = context;
            }

        // pulled out from the controller: returns DTOs directly
        public async Task<List<PendingCountDto>> GetPendingCountsAsync ( )
            {
            var results = new List<PendingCountDto>();
            var conn = _context.Database.GetDbConnection();
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = "SP_GetPendingCount";
            cmd.CommandType = CommandType.StoredProcedure;

            if (conn.State != ConnectionState.Open)
                await conn.OpenAsync();

            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
                {
                results.Add(new PendingCountDto
                    {
                    Table = reader.GetString("Table"),
                    Count_StatusId_2 = reader.GetInt32("Count_StatusId_2")
                    });
                }

            return results;
            }
        }
    }
