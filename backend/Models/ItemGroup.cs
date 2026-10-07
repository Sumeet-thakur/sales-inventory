using System.ComponentModel.DataAnnotations;

namespace SalesInventoryAPI.Models
{
    public class ItemGroup
    {
        [Key]
        public int ItemGroupId { get; set; }
        public string ItemGroupName { get; set; }
        public string Description { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? CreatedOn { get; set; }
        public string? ModifiedBy { get; set; }
        public int IsActive { get; set; } = 1;
        public int IsDeleted { get; set; } = 0;
        public DateTime? ModifiedOn { get; set; }
    }
}
