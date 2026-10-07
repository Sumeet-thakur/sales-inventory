using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SalesInventoryAPI.Models
    {
  
    public class StockMovement
        {
        [Key]
        public int StockMovementID { get; set; }

      
        public string RefNo { get; set; }

        public DateTime? Date { get; set; }

        public int? To_WareHouseId { get; set; }

        public int? From_WareHouseId { get; set; }

        public string? Description { get; set; }

        public decimal? TotalQuantity { get; set; }

        public int? StatusId { get; set; }

        public int IsActive { get; set; } = 1;

        public string? CreatedBy { get; set; }

        public DateTime? CreatedOn { get; set; }

        public string? ModifiedBy { get; set; }

        public DateTime? ModifiedOn { get; set; }

        public int IsDeleted { get; set; } = 0;

        public virtual ICollection<StockMovementChild> StockMovementChildren { get; set; }
     = new List<StockMovementChild>();
        }
    }
