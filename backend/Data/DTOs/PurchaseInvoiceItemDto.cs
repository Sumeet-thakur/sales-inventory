namespace SalesInventoryAPI.Data.DTOs
    {
    public class PurchaseInvoiceItemDto
        {
        public int ItemID { get; set; }
        public string BrandName { get; set; }
        public string ItemName { get; set; }
        public int PackingPCSperCTN { get; set; }
        public decimal QuantityCTN { get; set; }
        public decimal QuantityPCS { get; set; }
        public decimal TotalQtyPCS { get; set; }

        public decimal? GSTPercentage { get; set; }

        public decimal? NetPrice { get; set; }
        public decimal? TotalPrice { get; set; }
        }
    }
