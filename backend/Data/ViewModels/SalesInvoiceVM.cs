using System.ComponentModel.DataAnnotations;

namespace SalesInventoryAPI.Data.ViewModels
    {
    public class SalesInvoiceVM
        {
      
        public int SalesInvoiceID { get; set; }
        public int? SalesRequisitionID { get; set; }
        public string RefNo { get; set; }
        public DateTime? InvoiceDate { get; set; }
        public int? CustomerID { get; set; }
        public string? CustomerName { get; set; }
        public int? CustomerChildID { get; set; }
        public int? SellerID { get; set; }
        public int? WareHouseId { get; set; }
        public int? StatusId { get; set; }
        public int? InvoiceStatusId { get; set; }
        public string? SellerName { get; set; }
        public string PONumber { get; set; }
        public DateTime? PODate { get; set; }
        public string PaymentTerms { get; set; }
        public string Description { get; set; }
        public decimal? TotalAmount { get; set; }
        public decimal? TaxAmount { get; set; }
        public decimal? NetAmount { get; set; }
        public decimal? PaidAmount { get; set; }
        public decimal? OutstandingAmount { get; set; }
        public string PaymentStatus { get; set; }
        public int? PaymentStatusId { get; set; }

        public decimal? TotalQuantity { get; set; }

        public List<SalesInvoiceChildVM> SalesInvoiceChildVMs { get; set; } = new List<SalesInvoiceChildVM>();
        public virtual ICollection<MultipleAttachmentVM>? MultipleAttachments { get; set; } = new List<MultipleAttachmentVM>();
        public List<int>? RemovedSalesInvoiceChildIds { get; set; }
        
        }
    public class SalesInvoiceChildVM
        {
    
        public int SalesInvoiceChildID { get; set; }
        public int? SalesInvoiceID { get; set; }
        public int? ItemID { get; set; }
        public string? ItemName { get; set; }
        public decimal? Quantity { get; set; }
        public decimal? UnitPrice { get; set; }
        public decimal? Tax { get; set; }
        public decimal? TotalPrice { get; set; }
        public decimal? NetPrice { get; set; }
        public int UnitId { get; set; }
        public decimal? GSTPercentage { get; set; }
        public decimal? ItemStockQuantity { get; set; }
        public string? UnitName { get; set; }
        public decimal? ChildTotalQuantity { get; set; }
        public int? ConversionFactor { get; set; }
        public bool? IsSecondaryUnit { get; set; }



        }

    public class SalesInvoiceRequest
        {
        public int? SalesRequisitionID { get; set; }
        public string RefNo { get; set; }
        public DateTime? InvoiceDate { get; set; }
        public int? CustomerID { get; set; }
        public int? CustomerChildID { get; set; }
        public int? SellerID { get; set; }
        public string PONumber { get; set; }
        public DateTime? PODate { get; set; }
        public string PaymentTerms { get; set; }
        public string Description { get; set; }
        public decimal? TotalAmount { get; set; }
        public decimal? TaxAmount { get; set; }
        public decimal? NetAmount { get; set; }
        public decimal? PaidAmount { get; set; }
        public decimal? OutstandingAmount { get; set; }
        public string PaymentStatus { get; set; }

        public decimal? TotalQuantity { get; set; }
        public int? StatusId { get; set; }
        public int? WareHouseId { get; set; }
        public int? InvoiceStatusId { get; set; }
        public List<SalesInvoiceChildRequest> SalesInvoiceChildRequests { get; set; } = new List<SalesInvoiceChildRequest>();
        public virtual ICollection<MultipleAttachmentVM>? MultipleAttachments { get; set; } = new List<MultipleAttachmentVM>();
        }
    public class SalesInvoiceChildRequest
        {
      
     
        public int? SalesInvoiceID { get; set; }
        public int? ItemID { get; set; }
        public decimal? Quantity { get; set; }
        public decimal? UnitPrice { get; set; }
        public decimal? Tax { get; set; }
        public decimal? TotalPrice { get; set; }
        public decimal? NetPrice { get; set; }
        public int UnitId { get; set; }
        public decimal? ChildTotalQuantity { get; set; }
        public int? ConversionFactor { get; set; }
        public bool? IsSecondaryUnit { get; set; }
        public virtual ICollection<MultipleAttachmentVM>? MultipleAttachments { get; set; } = new List<MultipleAttachmentVM>();



        }

    }
