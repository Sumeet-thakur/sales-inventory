using SalesInventoryAPI.Data.ViewModels;
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SalesInventoryAPI.Models
    {
    public class StockAdjustment
        {
        [Key]
        public int StockAdjustmentID { get; set; }

        [StringLength(50)]
        public string RefNo { get; set; }

        public DateTime? Date { get; set; }

        public int? AdjustmentTypeID { get; set; }

        public string? Description { get; set; }

        public decimal? TotalQuantity { get; set; }

        public int? StatusId { get; set; }

        public int? WareHouseId { get; set; }

        public int? IsActive { get; set; } = 1;

        public string? CreatedBy { get; set; }

        public DateTime? CreatedOn { get; set; }

        public string? ModifiedBy { get; set; }

        public DateTime? ModifiedOn { get; set; }

        public int? IsDeleted { get; set; } = 0;

        public ICollection<StockAdjustmentChild>? StockAdjustmentChildren { get; set; } = new List<StockAdjustmentChild>();

        }

    public class StockAdjustmentChild
        {
        [Key]
        public int StockAdjustmentChildID { get; set; }

        public int? StockAdjustmentID { get; set; }

        public int? ItemID { get; set; }

        public decimal? Quantity { get; set; }

        public int IsActive { get; set; } = 1;

        public int IsDeleted { get; set; } = 0;

        
        }
    }
