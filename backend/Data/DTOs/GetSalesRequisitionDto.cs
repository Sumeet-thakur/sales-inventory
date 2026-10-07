namespace SalesInventoryAPI.Data.DTOs
    {
    public class GetSalesRequisitionDto
        {
        public int? SalesRequisitionID { get; set; }
        public string RefNo { get; set; } = null!;
        public int SellerID { get; set; }
        public int CustomerID { get; set; }
        public string CustomerName { get; set; } = null!;
        public string SellerName { get; set; } = null!;
        }
    }
