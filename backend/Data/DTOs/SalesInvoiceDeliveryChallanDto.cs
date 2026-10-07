namespace SalesInventoryAPI.Data.DTOs
    {
    public class SalesInvoiceDeliveryChallanDto
        {
        public int SalesInvoiceID { get; set; }
        public string RefNo { get; set; }
        public DateTime? InvoiceDate { get; set; }
        public string PONumber { get; set; }
        public string CustomerName { get; set; }
        public string Address { get; set; }
        public string SellerName { get; set; }

        // ← new grand-total properties
        public decimal QuantityCTN { get; set; }
        public decimal QuantityPCS { get; set; }
        public decimal TotalQtyPCS { get; set; }


        public List<SalesInvoiceDeliveryChallanItemDto> Items { get; set; } = new();
        }
    }
