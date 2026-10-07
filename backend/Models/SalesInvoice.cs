using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace SalesInventoryAPI.Models
    {
    public class SalesInvoice
        {
        [Key]
        public int SalesInvoiceID { get; set; }
        public int? SalesRequisitionID { get; set; }
        public string RefNo { get; set; }
        public DateTime? InvoiceDate { get; set; }
        public int? CustomerID { get; set; }
        public int? CustomerChildID { get; set; }
        public int? SellerID { get; set; }
        public int? WareHouseId { get; set; }
        public int? InvoiceStatusId { get; set; }
        public int? PaymentStatusId { get; set; }
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
        public int? StatusId { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? CreatedOn { get; set; }
        public string? ModifiedBy { get; set; }
        public DateTime? ModifiedOn { get; set; }
        public decimal? TotalQuantity { get; set; }
        public int IsActive { get; set; } = 1;
        public int IsDeleted { get; set; } = 0;

        public virtual ICollection<SalesInvoiceChild> SalesInvoiceChildren { get; set; }
= new List<SalesInvoiceChild>();

        }


    public class SalesInvoiceChild
        {
        [Key]
        public int SalesInvoiceChildID { get; set; }
        public int? SalesInvoiceID { get; set; }
        public int? ItemID { get; set; }
        public decimal? Quantity { get; set; }
        public decimal? UnitPrice { get; set; }
        public decimal? Tax { get; set; }
        public decimal? TotalPrice { get; set; }
        public decimal? NetPrice { get; set; }
        public decimal? ChildTotalQuantity { get; set; }
        public int? ConversionFactor { get; set; }
        public bool? IsSecondaryUnit { get; set; }
        public int UnitId { get; set; }
        public int? IsDeleted { get; set; }
       
        public int? IsActive { get; set; }

        
        }
    }
