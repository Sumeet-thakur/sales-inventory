namespace SalesInventoryAPI.Data.DTOs
    {
    public class PurchaseInvoiceDto
        {
        public int PurchaseInvoiceID { get; set; }
        public string RefNo { get; set; }
        public DateTime? InvoiceDate { get; set; }
        public string VendorName { get; set; }
        public string Address { get; set; }
        public decimal QuantityCTN { get; set; }
        public decimal QuantityPCS { get; set; }
        public decimal TotalQtyPCS { get; set; }
        public decimal TotalPrice { get; set; }
        public List<PurchaseInvoiceItemDto> Items { get; set; }
        }
    }
