using SalesInventoryAPI.Models;
using System.ComponentModel.DataAnnotations;

namespace SalesInventoryAPI.Data.ViewModels
    {
    public class PaymentReceivedVM
        {
        
        public int? PaymentReceivedID { get; set; }

        public string? RefNo { get; set; }
        public DateTime? PaymentDate { get; set; }

        public int? CustomerID { get; set; }

        public decimal? PaymentAmount { get; set; }
        public int? PaymentModeId { get; set; }
        public int? StatusId { get; set; }
        public string? ReceivedBy { get; set; }
        public string ReferenceNumber { get; set; }
        public virtual ICollection<PaymentReceivedChildVM>? PaymentReceivedChildVMs { get; set; }= new List<PaymentReceivedChildVM>();
        public virtual ICollection<MultipleAttachmentVM>? MultipleAttachments { get; set; }= new List<MultipleAttachmentVM>();


        }

    public class PaymentReceivedChildVM
        {
       
        public int? PaymentReceivedChildID { get; set; }

        // Foreign key to PaymentReceived
        public int? PaymentReceivedID { get; set; }

        // Foreign key to SalesInvoices
        public int? SalesInvoiceID { get; set; }
        public decimal? PaidAmount { get; set; }


        }

    public class MultipleAttachmentVM
        {
        public int MultipleAttachmentfileId { get; set; }
        public string FileName { get; set; }
        public string FilePath { get; set; }
        public string Referenceno { get; set; }
        }
    }
