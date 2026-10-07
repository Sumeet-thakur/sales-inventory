namespace SalesInventoryAPI.Data.ViewModels
    {
    public class StockTransactionVM
        {
        public int StockTransactionID { get; set; }
        public int? ItemID { get; set; }
        public int? WarehouseID { get; set; }
        public decimal? Quantity { get; set; }
        public string? DocumentType { get; set; }
        public string? Remarks { get; set; }
        public int? DocumentID { get; set; }
        public DateTime? CreationDate { get; set; }
        public int IsActive { get; set; }
        }
    }
