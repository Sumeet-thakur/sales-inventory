using System.ComponentModel.DataAnnotations;

namespace SalesInventoryAPI.Models
{
    public class Unit
    {
        [Key]
        public int UnitId { get; set; }
        public string UnitName { get; set; }
        public string Description { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? CreatedOn { get; set; }
        public string? ModifiedBy { get; set; }
        public DateTime? ModifiedOn { get; set; }
        public int IsActive { get; set; } = 1;
        public int IsDeleted { get; set; } = 0;
    }
}
