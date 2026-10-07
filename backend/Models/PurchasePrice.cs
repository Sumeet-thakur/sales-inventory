using SalesInventoryAPI.Data.ViewModels;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace SalesInventoryAPI.Models
    {
    public class PurchasePrice
        {
        [Key]

        public int PurchasePriceId { get; set; }

        [StringLength(255)]
        public string? PurchasePriceRefNumber { get; set; }

        public DateTime? PurchasePriceDate { get; set; }

        public string? CreatedBy { get; set; }

        public DateTime? CreatedOn { get; set; }

        public string? ModifiedBy { get; set; }

        public DateTime? ModifiedOn { get; set; }

        public int IsActive { get; set; } = 1;

        public int IsDeleted { get; set; } = 0;
        public virtual ICollection<PurchasePriceListItem> PurchasePriceListItems { get; set; }
= new List<PurchasePriceListItem>();
        }

    

    public class PurchasePriceListItem
        {
        [Key]
       
        public int PurchasePriceListItemChilId { get; set; }

        public int? PurchasePriceId { get; set; }
     
        public int? ItemId { get; set; }
     
        [StringLength(255)]
        public string? Description { get; set; }

        public int? TotalQuantity { get; set; }

        public int? OldPurchasePrice { get; set; }

        public int? NewPurchasePrice { get; set; }

        public DateTime? Date { get; set; }

        public string? CreatedBy { get; set; }
        public DateTime? CreatedOn { get; set; }

        public string? ModifiedBy { get; set; }
        public DateTime? ModifiedOn { get; set; }

        public int IsActive { get; set; } = 1;
        public int IsDeleted { get; set; } = 0;
        }

    }
