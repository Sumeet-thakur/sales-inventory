using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace SalesInventoryAPI.Models
    {
    public class PurchaseReceive
        {
        [Key]
       
        public int PurchaseReceiveID { get; set; }

        
        public string RefNo { get; set; }

        public DateTime? Date { get; set; }

        public int? VendorID { get; set; }

        public int? VendorChildID { get; set; }

        public int? PurchaseRequisitionOrderID { get; set; }

        public string? PaymentTerms { get; set; }

        public string? Description { get; set; }
        public decimal? TotalQuantity { get; set; }
        public int? StatusId { get; set; }
        public int? IsActive { get; set; } = 1;
        public int? IsDeleted { get; set; } = 0;
        public string? CreatedBy { get; set; }
        public DateTime? CreatedOn { get; set; }

        public string? ModifiedBy { get; set; }

        public DateTime? ModifiedOn { get; set; }
        public virtual ICollection<PurchaseReceiveChild> PurchaseReceiveChildren { get; set; }
= new List<PurchaseReceiveChild>();
        }

    public class PurchaseReceiveChild
        {
        [Key]
      
        public int PurchaseReceiveChildID { get; set; }

        // Foreign key to PurchaseReceive
        public int? PurchaseReceiveID { get; set; }

        // Foreign key to Items
        public int? ItemID { get; set; }

        public int? UnitId { get; set; }

        public bool? IsSecondaryUnit { get; set; }

       
        public decimal? Quantity { get; set; }

        public int? ConversionFactor { get; set; }

       
        public decimal? ChildTotalQuantity { get; set; }

        public int? IsActive { get; set; }

        public int? IsDeleted { get; set; }

       
        }
    }
