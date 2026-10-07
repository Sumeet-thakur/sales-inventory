namespace SalesInventoryAPI.Data.DTOs
    {
    public class PurchaseReceiveItemDto
        {
        public int ItemID { get; set; }
        public string BrandName { get; set; }
        public string ItemName { get; set; }
        public int PackingPCSperCTN { get; set; }
        //public string UnitName { get; set; } // Required for CONCAT unit + "secondary"
        public decimal QuantityCTN { get; set; }
        public decimal QuantityPCS { get; set; }
        public decimal TotalQtyPCS { get; set; }
        }
    }
