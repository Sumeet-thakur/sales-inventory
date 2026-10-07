using System.ComponentModel.DataAnnotations;

namespace SalesInventoryAPI.Data.ViewModels
    {
    public class PurchaseInvoiceVM
        {
  
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


        public int? WarehouseID { get;  set; }

        public decimal? TotalQuantity { get; set; }

       
        public virtual ICollection<PurchaseInvoiceChildVM> PurchaseInvoiceChildVMs { get; set; }
= new List<PurchaseInvoiceChildVM>();
        public virtual ICollection<MultipleAttachmentVM>? MultipleAttachments { get; set; } = new List<MultipleAttachmentVM>();

        }
    public class PurchaseInvoiceChildVM
        {
       
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

      

        }
    }
