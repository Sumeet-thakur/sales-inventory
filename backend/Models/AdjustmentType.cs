using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace SalesInventoryAPI.Models
    {
    public class AdjustmentType
        {
        [Key]
        public int AdjustmentTypeID { get; set; }

       
        public string? Name { get; set; }

        public string? Description { get; set; }

     
        public int? InventoryEffect { get; set; } 

        
        public int? IsActive { get; set; } = 1;

        public int? IsDeleted { get; set; } = 0;

        public string? CreatedBy { get; set; }

        public DateTime? CreatedOn { get; set; }

        public string? ModifiedBy { get; set; }

        public DateTime? ModifiedOn { get; set; }
        }
    }
