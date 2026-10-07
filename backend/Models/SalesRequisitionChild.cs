using System.ComponentModel.DataAnnotations;

namespace SalesInventoryAPI.Models
{
    public class SalesRequisitionChild
    {
        [Key]
        public int SalesRequisitionChildID { get; set; }
        public int SalesRequisitionID { get; set; }
        public int? ItemID { get; set; }
        public decimal? Quantity { get; set; }
        public int? UnitId { get; set; }
        public int? ConversionFactor { get; set; }
        public bool? IsSecondaryUnit { get; set; }
        public int? ChildTotalQuantity { get; set; }

        }
}
