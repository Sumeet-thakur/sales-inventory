namespace SalesInventoryAPI.Data.ViewModels
{
    public class ItemRequest
    {

        public string ItemName { get; set; }
        public string? ItemCode { get; set; }
        public string? ItemDescription { get; set; }
        public string? ModelNo { get; set; }
        public int? BrandId { get; set; }
        public int? ItemGroupId { get; set; }
        public int? UnitId { get; set; }
        public int? SecondaryUnitID { get; set; }
        public int? ConversionFactor { get; set; }
        public string? UnitDescription { get; set; }
        public string? HSCode { get; set; }
        public decimal? GSTPercentage { get; set; }
        public decimal? PurchasePrice { get; set; }
        //public int CustomerCategoryId { get; set; }
        public string? CustomerCategory { get; set; }
        public decimal? SellingPrice { get; set; }
        public decimal? StartingQuantity { get; set; }
        public string? StockStatus { get; set; }
        public decimal? Weight { get; set; }
        public decimal? Height { get; set; }
        public decimal? Length { get; set; }
        public decimal? Width { get; set; }
        public int? MinimumStock { get; set; }
        public int? MaximumStock { get; set; }
        public string? ImagePath { get; set; }

        public List<ItemCustomerCategoryRequest>? ItemCustomerCategories { get; set; }

    }

    public class ItemCustomerCategoryRequest
    {

        public int ItemId { get; set; }
        public int CustomerCategoryId { get; set; }
        public decimal CustomerPrice { get; set; }

    }


    public class ItemVM
    {
        public int ItemId { get; set; }
        public string ItemName { get; set; }
        public string ItemCode { get; set; }
        public string ItemDescription { get; set; }
        public string? ModelNo { get; set; }
        public int? BrandId { get; set; }
        public int? ItemGroupId { get; set; }
        public int? UnitId { get; set; }
        public int? SecondaryUnitID { get; set; }
        public int? ConversionFactor { get; set; }
        public string? UnitDescription { get; set; }
        public string? HSCode { get; set; }
        public decimal? GSTPercentage { get; set; }
        public decimal? PurchasePrice { get; set; }
        //public int CustomerCategoryId { get; set; }
        public string? CustomerCategory { get; set; }
        public decimal? SellingPrice { get; set; }
        public decimal? StartingQuantity { get; set; }
        public string? StockStatus { get; set; }
        public decimal? Weight { get; set; }
        public decimal? Height { get; set; }
        public decimal? Length { get; set; }
        public decimal? Width { get; set; }
        public int? MinimumStock { get; set; }
        public int? MaximumStock { get; set; }
        public string? ImagePath { get; set; }
        public List<ItemCustomerCategoryVM>? ItemCustomerCategories { get; set; }

        public List<int>? RemovedItemCustomerCategoryIds { get; set; }

    }

    public class ItemCustomerCategoryVM
    {
        public int? ItemCustomerCatId { get; set; }
        public int? ItemId { get; set; }
        public int? CustomerCategoryId { get; set; }
        public decimal? CustomerPrice { get; set; }

    }
}
