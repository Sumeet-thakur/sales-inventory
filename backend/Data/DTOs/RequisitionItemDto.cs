namespace SalesInventoryAPI.Data.DTOs
    {
    public class RequisitionItemDto
        {
        public int SalesRequisitionChildID { get; set; }
        public int SalesRequisitionID { get; set; }
        public int ItemID { get; set; }
        public decimal? Quantity { get; set; }  // <-- remaining
        public int UnitId { get; set; }
        public decimal? NetAmount { get; set; } = 0;
        public string UnitName { get; set; }
        public decimal? ConversionFactor { get; set; }
        public bool IsSecondaryUnit { get; set; }
        public int? ChildTotalQuantity { get; set; }
        public decimal ItemStockQuantity { get; set; }
        public decimal? GSTPercentage { get; set; }
        }

    }
