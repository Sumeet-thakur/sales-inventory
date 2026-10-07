using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace SalesInventoryAPI.Models
    {
    public class PurchaseRequisitionOrder
        {
        [Key]
        
        public int PurchaseRequisitionOrderID { get; set; }
        public string RefNo { get; set; }
        public DateTime? Date { get; set; }
        public int? VendorID { get; set; }
        //public int? VendorChildID { get; set; }
        public DateTime? DeliveryDate { get; set; }
        public string PaymentTerms { get; set; }
        public string Description { get; set; }
        public decimal? TotalAmount { get; set; }
        public decimal? TotalQuantity { get; set; }
        public int StatusId { get; set; }
        public int IsActive { get; set; }
        public int IsDeleted { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? CreatedOn { get; set; }
        public string? ModifiedBy { get; set; }
        public DateTime? ModifiedOn { get; set; }

        public virtual ICollection<PurchaseRequisitionOrderChild> PurchaseRequisitionOrderChildren { get; set; }
     = new List<PurchaseRequisitionOrderChild>();
        }

    public class PurchaseRequisitionOrderChild
        {
        [Key]
        
        public int PurchaseRequisitionOrderChildID { get; set; }
        public int? PurchaseRequisitionOrderID { get; set; }
        public int? ItemID { get; set; }
       
        public decimal? Quantity { get; set; }
        public int? UnitId { get; set; }
        public decimal? UnitPrice { get; set; }
        public decimal? Tax { get; set; }
        public int? ChildTotalPrice { get; set; }
        public int? ConversionFactor { get; set; }
        public bool? IsSecondaryUnit { get; set; }
        public int? ChildTotalQuantity { get; set; }
        public int? IsActive { get; set; }
        public int? IsDeleted { get; set; }

      
        }
    }
