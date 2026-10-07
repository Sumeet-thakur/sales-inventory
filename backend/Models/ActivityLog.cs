using System.ComponentModel.DataAnnotations;

namespace SalesInventoryAPI.Models
{
    public class ActivityLog
    {
        [Key]
        public int ActivityLogId { get; set; }
        public int MenuItemId { get; set; }
        public int ParentTableId { get; set; }
        public string ActionType { get; set; }
        public string? OldData { get; set; }
        public string? NewData { get; set; }
        public string? UserId { get; set; }
        public DateTime Date { get; set; }
    }
}
