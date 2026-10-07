using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace SalesInventoryAPI.Models
    {
    public class ItemStock
        {
        [Key]
        public int ItemStockID { get; set; }

        public int? ItemID { get; set; }

        public int? WarehouseID { get; set; }

        public decimal? Quantity { get; set; }

        public int? IsActive { get; set; } = 1;
        public string? CreatedBy { get; set; }
        public DateTime? CreatedOn { get; set; }
        public string? ModifiedBy { get; set; }
        public DateTime? ModifiedOn { get; set; }



        }
    }
