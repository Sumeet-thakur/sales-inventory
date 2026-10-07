using SalesInventoryAPI.Models;
using System.ComponentModel.DataAnnotations;

namespace SalesInventoryAPI.Data.ViewModels
    {
    public class PurchaseReceiveVM
        {
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
     

       
        public virtual ICollection<PurchaseReceiveChildVM> PurchaseReceiveChildVMs { get; set; }
= new List<PurchaseReceiveChildVM>();
        public virtual ICollection<MultipleAttachmentVM>? MultipleAttachments { get; set; } = new List<MultipleAttachmentVM>();
        }

    public class PurchaseReceiveChildVM
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

        public bool? IsNewFromRevision { get; set; }


        }
    }
