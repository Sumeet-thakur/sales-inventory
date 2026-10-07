using Microsoft.EntityFrameworkCore;
using System.Data;
using System.Threading.Tasks;

namespace SalesInventoryAPI.Data.Services
{
    public class CodeGenerator
    {
        private readonly InventoryDbContext _context;
        public CodeGenerator(InventoryDbContext context)
        {
            _context = context;
        }

        public async Task<string> GenerateReferenceNumber(string tableName, string columnName, string prefix,int digits)
        {
            string query = $"SELECT MAX({columnName}) FROM {tableName} WHERE {columnName} LIKE '{prefix}-%' AND IsActive=1 AND IsDeleted=0 ";
            string lastRefNo = null;
            var connection = _context.Database.GetDbConnection();

            try
            {
                // Open connection if not already open.
                if (connection.State != ConnectionState.Open)
                {
                    await connection.OpenAsync();
                }

                using (var command = connection.CreateCommand())
                {
                    command.CommandText = query;
                    var result = await command.ExecuteScalarAsync();
                    lastRefNo = (result == DBNull.Value || result == null) ? null : result.ToString();
                }
            }
            finally
            {
                // Ensure the connection is closed if it was opened.
                if (connection.State == ConnectionState.Open)
                {
                    await connection.CloseAsync();
                }
            }

            int nextNumber = 1;
            if (!string.IsNullOrEmpty(lastRefNo))
                {
                string[] parts = lastRefNo.Split('-');
                // Get the last element regardless of the number of parts
                string lastPart = parts[parts.Length - 1];

                if (int.TryParse(lastPart, out int lastNumber))
                    {
                    nextNumber = lastNumber + 1;
                    }
                }

            return $"{prefix}-{nextNumber.ToString().PadLeft(digits, '0')}";
        }
    }
}
