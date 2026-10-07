namespace SalesInventoryAPI.Data.DTOs
    {
    public class PurchaseReceiveDto
        {
        public int PurchaseReceiveID { get; set; }
        public string RefNo { get; set; }
        public DateTime? Date { get; set; }
        public string VendorName { get; set; }
        public string Address { get; set; }
        public decimal QuantityCTN { get; set; }
        public decimal QuantityPCS { get; set; }
        public decimal TotalQtyPCS { get; set; }
        public List<PurchaseReceiveItemDto> Items { get; set; }
        }
    }
