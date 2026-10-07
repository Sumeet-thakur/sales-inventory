using System.ComponentModel.DataAnnotations;

namespace SalesInventoryAPI.Data.ViewModels
    {
    public class PurchaseRequisitionOrderVM
        {
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
        public List<PurchaseRequisitionOrderChildVM> PurchaseRequisitionOrderChildVMs { get; set; } = new List<PurchaseRequisitionOrderChildVM>();
        public List<int>? RemovedPurchaseRequisitionOrderChildIds { get; set; }
        public virtual ICollection<MultipleAttachmentVM>? MultipleAttachments { get; set; } = new List<MultipleAttachmentVM>();
        }
    public class PurchaseRequisitionOrderChildVM
        {
       
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
        }

    public class PurchaseRequisitionOrderRequest
        {
        
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
        public List<PurchaseRequisitionOrderChildRequest> PurchaseRequisitionOrderChildRequests { get; set; } = new List<PurchaseRequisitionOrderChildRequest>();
        public virtual ICollection<MultipleAttachmentVM>? MultipleAttachments { get; set; } = new List<MultipleAttachmentVM>();
        }
    public class PurchaseRequisitionOrderChildRequest
        {

      
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
        }
    }
