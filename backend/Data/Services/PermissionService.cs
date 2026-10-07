using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
namespace SalesInventoryAPI.Data.Services
{
    public class PermissionService
    {
        private readonly InventoryDbContext _context;
        public PermissionService(InventoryDbContext context)
        {
            _context = context;
        }
        public async Task<bool> HasPermission(string roleId, string menuItemName, string moduleItemName, string action)
        {
            return await _context.ManageAppRights
                .Include(r => r.MenuItem)
                .ThenInclude(m => m.ModuleItem)
                .Where(r => r.RoleId == roleId
                         && r.MenuItem.MenuItemName == menuItemName
                         && r.MenuItem.ModuleItem.ModuleItemName == moduleItemName)
                .AnyAsync(r =>
                    (action == "View" && r.chkView) ||
                    (action == "Insert" && r.chkInsert) ||
                    (action == "Update" && r.chkUpdate) ||
                    (action == "Delete" && r.chkDelete) ||
                    (action == "Print" && r.chkPrint)
                );
        }
    }
}
