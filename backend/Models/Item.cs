using System.ComponentModel.DataAnnotations;

namespace SalesInventoryAPI.Models
{
    public class Item
    {
        [Key]
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
        
        public string? CustomerCategory { get; set; }
        public decimal? SellingPrice { get; set; }
        public string? StockStatus { get; set; }
        public decimal? Weight { get; set; }
        public decimal? Height { get; set; }
        public decimal? Length { get; set; }
        public decimal? Width { get; set; }
        public string? ImagePath { get; set; }
        public int? MinimumStock { get; set; }
        public int? MaximumStock { get; set; }
        public decimal? StartingQuantity { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? CreatedOn { get; set; }
        public string? ModifiedBy { get; set; }
        public DateTime? ModifiedOn { get; set; }
        public int? IsActive { get; set; } = 1;
        public int? IsDeleted { get; set; } = 0;
    }

    public class ItemCustomerCategory
    {
        [Key]
        public int ItemCustomerCatId { get; set; }
        public int? ItemId { get; set; }
        public int? CustomerCategoryId { get; set; }
        public decimal? CustomerPrice { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? CreatedOn { get; set; }
        public string? ModifiedBy { get; set; }
        public DateTime? ModifiedOn { get; set; }
        public int? IsActive { get; set; } = 1;
        public int? IsDeleted { get; set; } = 0;
    }
}
