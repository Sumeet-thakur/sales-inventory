namespace SalesInventoryAPI.Data.DTOs
    {
    public class InvoiceNumberDto
        {
        public int SalesInvoiceID { get; set; }
        public string RefNo { get; set; } = default!;
        public int PaymentStatusId { get; set; }
        public DateTime InvoiceDate { get; set; }
        public decimal NetAmount { get; set; }
        public decimal OutstandingAmount { get; set; }
        }
    }
