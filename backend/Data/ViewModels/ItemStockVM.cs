namespace SalesInventoryAPI.Data.ViewModels
    {
    public class ItemStockVM
        {
        public int ItemStockID { get; set; }
        public int? ItemID { get; set; }
        public int? WarehouseID { get; set; }
        public decimal? Quantity { get; set; }
        public int? IsActive { get; set; }
        }
    }
