using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace SalesInventoryAPI.Models
    {
    public class StockTransaction
        {
        [Key]
        public int StockTransactionID { get; set; }

        public int? ItemID { get; set; }

        [StringLength(45)]
        public int? WarehouseID { get; set; }

        public decimal? Quantity { get; set; }

        [StringLength(255)]
        public string? DocumentType { get; set; }
        public string? Remarks { get; set; }

        public int? DocumentID { get; set; }

        public DateTime? CreationDate { get; set; }

        public int? IsActive { get; set; } = 1;
        public int? IsVoid { get; set; } = 0;
        public string? DocumentRefNo { get; set; } 

      
        }
    }
