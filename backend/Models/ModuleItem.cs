using System.ComponentModel.DataAnnotations;

namespace SalesInventoryAPI.Models
{
    public class ModuleItem
    {
       
        [Key]
        public int ModuleItemId { get; set; }  // Primary Key

       
        public string ModuleItemName { get; set; }
       
        public int ModuleItemOrder { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? CreatedOn { get; set; }
        public string? ModifiedBy { get; set; }
        public DateTime? ModifiedOn { get; set; }
        public int? IsActive { get; set; }
        // Navigation Property for related MenuItems
        public List<MenuItem> MenuItems { get; set; }
    }
}
