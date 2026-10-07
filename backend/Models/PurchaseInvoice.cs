using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace SalesInventoryAPI.Models
    {
    public class PurchaseInvoice
        {
        [Key]
        public int PurchaseInvoiceID { get; set; }

        public int? PurchaseReceiveID { get; set; }


        public string? RefNo { get; set; }

        public DateTime? InvoiceDate { get; set; }

        public int? VendorID { get; set; }

        public int? VendorChildID { get; set; }

        public string? PaymentTerms { get; set; }

        public string? Description { get; set; }

        
        public decimal? TotalNetAmount { get; set; }

        public int? StatusId { get; set; }

        public string? CreatedBy { get; set; }

        public DateTime? CreatedOn { get; set; }

        public string? ModifiedBy { get; set; }

        public DateTime? ModifiedOn { get; set; }

      
        public decimal? TotalQuantity { get; set; }

        public int? IsActive { get; set; } = 1;

        public int? WarehouseID { get; set; }
        public int? IsDeleted { get; set; } = 0;
        public virtual ICollection<PurchaseInvoiceChild> PurchaseInvoiceChildren { get; set; }
= new List<PurchaseInvoiceChild>();
       
        }
    public class PurchaseInvoiceChild
        {
        [Key]
        public int PurchaseInvoiceChildID { get; set; }

        public int? PurchaseInvoiceID { get; set; }

        public int? ItemID { get; set; }

        public int? UnitId { get; set; }

        public bool? IsSecondaryUnit { get; set; }

        public int? ConversionFactor { get; set; }

        
        public decimal? Quantity { get; set; }

      
        public decimal? ChildTotalQuantity { get; set; }

     
        public decimal? NetPrice { get; set; }

      
        public decimal? TotalPrice { get; set; }

        public int? IsActive { get; set; } = 1;

        public int? IsDeleted { get; set; } = 0;

       
        }
    }
