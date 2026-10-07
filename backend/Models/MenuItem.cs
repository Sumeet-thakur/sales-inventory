using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SalesInventoryAPI.Models
{
    public class MenuItem
    {
        public MenuItem()
        {
            IsActive = 0;  // Default value initialization
            ManageAppRights = new HashSet<ManageAppRight>();  // Collection initialization
        }

        [Key]
        public int MenuItemId { get; set; }  // Primary Key
        public string MenuItemName { get; set; }

        [ForeignKey(nameof(ModuleItemId))]
        public int ModuleItemId { get; set; }  // Foreign Key

        public int MenuItemOrder { get; set; }
        public string Controller { get; set; }
        public string Action { get; set; }

        public string? CreatedBy { get; set; }
        public DateTime? CreatedOn { get; set; }
        public string? ModifiedBy { get; set; }
        public DateTime? ModifiedOn { get; set; }

        public int? IsActive { get; set; }
        public int? ParentId { get; set; }
        public int? IsParent { get; set; }
        public string? Icon { get; set; }
        public string? Label { get; set; }
        public string? Path { get; set; }

        // Navigation Property for related ModuleItem
        public ModuleItem ModuleItem { get; set; }
        // Navigation Property for related ManageAppRights
        public ICollection<ManageAppRight> ManageAppRights { get; set; }
    }
}
