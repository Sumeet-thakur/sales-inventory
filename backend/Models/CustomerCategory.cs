using System.ComponentModel.DataAnnotations;

namespace SalesInventoryAPI.Models
{
    public class CustomerCategory
    {
        [Key]
        public int CustomerCategoryId { get; set; }
        public string CustomerCategoryName { get; set; }
        public string Description { get; set; }
        public int? IsActive { get; set; } = 1;
        public string? CreatedBy { get; set; }
        public DateTime? CreatedOn { get; set; }
        public string? ModifiedBy { get; set; }
        public DateTime? ModifiedOn { get; set; }
        public int? IsDeleted { get; set; } = 0;

    }
}
