namespace SalesInventoryAPI.Data.DTOs
    {
    public class SalesRequisitionDto
        {
        public int SalesRequisitionID { get; set; }
        public string RefNo { get; set; }
        public DateTime? Date { get; set; }
        public string CustomerName { get; set; }
        public string Address { get; set; }
        public string SellerName { get; set; }
        public decimal QuantityCTN { get; set; }
        public decimal QuantityPCS { get; set; }
        public decimal TotalQtyPCS { get; set; }

        public List<SalesRequisitionItemDto> Items { get; set; }

        }
        }
