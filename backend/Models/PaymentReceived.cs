using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace SalesInventoryAPI.Models
    {
    [Table("paymentreceived")]
    public class PaymentReceived
        {
        [Key]
     
        public int PaymentReceivedID { get; set; }

        public string RefNo { get; set; }

        public DateTime? PaymentDate { get; set; }

        public int? CustomerID { get; set; }

     
        public decimal? PaymentAmount { get; set; }

        public int? PaymentModeId { get; set; }

        public string? ReceivedBy { get; set; }

       

        public int? IsActive { get; set; }

        public int? IsDeleted { get; set; }
        public int? StatusId { get; set; }

        public string? CreatedBy { get; set; }

        public DateTime? CreatedOn { get; set; }

        public string? ModifiedBy { get; set; }

        public DateTime? ModifiedOn { get; set; }

       
        public string ReferenceNumber { get; set; }


        public virtual ICollection<PaymentReceivedChild> PaymentReceivedChildren { get; set; }
= new List<PaymentReceivedChild>();

        }

    public class PaymentReceivedChild
        {
        [Key]

        public int PaymentReceivedChildID { get; set; }

        // Foreign key to PaymentReceived
        public int? PaymentReceivedID { get; set; }

        // Foreign key to SalesInvoices
        public int? SalesInvoiceID { get; set; }

        public int? IsActive { get; set; }

        public int? IsDeleted { get; set; }


        public decimal? PaidAmount { get; set; }


        }
    }
