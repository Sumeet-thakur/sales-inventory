namespace SalesInventoryAPI.Data.ViewModels
    {
    public class StockMovementChildVM
        {
        public int StockMovementChildID { get; set; }
        public int? StockMovementID { get; set; }
        public int? ItemID { get; set; }
        public decimal? Quantity { get; set; }

        }
    }
