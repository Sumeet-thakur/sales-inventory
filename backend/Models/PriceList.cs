using System.ComponentModel.DataAnnotations;

namespace SalesInventoryAPI.Models
{
    public class PriceList
    {
        [Key]
        public int PriceListId { get; set; }
        public string PriceRefNumber { get; set; }
        public DateTime? PriceDate { get; set; }
      
        public string? CreatedBy { get; set; }
        public DateTime? CreatedOn { get; set; }
        public string? ModifiedBy { get; set; }
        public DateTime? ModifiedOn { get; set; }
        public int? IsActive { get; set; } = 1;
        public int? IsDeleted { get; set; } = 0;
    }

    public class PriceListItemChild
    {
        [Key]
        public int PriceListItemChildId { get; set; }
        public int PriceListId { get; set; }
        public int ItemId { get; set; }
        public int? CustomerCategoryId { get; set; }
        public string? Description { get; set; }
        public int TotalQuantity { get; set; }
        public int OldNetPrice { get; set; }
        public int NewNetPrice { get; set; }
        public DateTime Date { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? CreatedOn { get; set; }
        public string? ModifiedBy { get; set; }
        public DateTime? ModifiedOn { get; set; }
        public int? IsActive { get; set; } = 1;
        public int? IsDeleted { get; set; } = 0;
    }
}
