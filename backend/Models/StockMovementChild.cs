using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SalesInventoryAPI.Models
    {
   
    public class StockMovementChild
        {
        [Key]
        public int StockMovementChildID { get; set; }

        public int? StockMovementID { get; set; }

        public int? ItemID { get; set; }

       
        public decimal? Quantity { get; set; }

        public int IsActive { get; set; } = 1;

        public int IsDeleted { get; set; } = 0;

        
        
        }
    }
