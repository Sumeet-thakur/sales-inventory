using SalesInventoryAPI.Models;
using System.ComponentModel.DataAnnotations;

namespace SalesInventoryAPI.Data.ViewModels
    {
   
        public class StockAdjustmentVM
            {
            public int StockAdjustmentID { get; set; }

            [StringLength(50)]
            public string RefNo { get; set; }

            public DateTime? Date { get; set; }

            public int? AdjustmentTypeID { get; set; }

            public string Description { get; set; }

            public decimal? TotalQuantity { get; set; }

            public int? StatusId { get; set; }

            public int? WareHouseId { get; set; }
        public ICollection<StockAdjustmentChildVM>? StockAdjustmentChildVMs { get; set; } = new List<StockAdjustmentChildVM>();
        public virtual ICollection<MultipleAttachmentVM>? MultipleAttachments { get; set; } = new List<MultipleAttachmentVM>();
        }

    public class StockAdjustmentChildVM
        {
        public int StockAdjustmentChildID { get; set; }

        public int? StockAdjustmentID { get; set; }

        public int? ItemID { get; set; }

        public decimal? Quantity { get; set; }
        public decimal? ItemStock { get; set; }
        }
    }
