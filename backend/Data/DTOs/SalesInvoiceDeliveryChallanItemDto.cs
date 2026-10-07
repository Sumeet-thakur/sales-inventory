namespace SalesInventoryAPI.Data.DTOs
    {
    public class SalesInvoiceDeliveryChallanItemDto
        {
        public int ItemID { get; set; }                  // <-- add here itemId
        public string BrandName { get; set; }
        public string ItemName { get; set; }
        public int? PackingPCSperCTN { get; set; }
        public decimal QuantityCTN { get; set; }
        public decimal QuantityPCS { get; set; }
        public decimal? TotalQtyPCS { get; set; }

        }
    }
