using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace SalesInventoryAPI.Models
    {
    public class PaymentStatus
        {
        [Key]
        public int PaymentStatusId { get; set; }
        public string PaymentStatusName { get; set; }
        public string CreatedBy { get; set; }
        public DateTime? CreatedOn { get; set; }

        public string? ModifiedBy { get; set; }

        public DateTime? ModifiedOn { get; set; }

        public int? IsActive { get; set; }

        public int? IsDeleted { get; set; }
        }
    }
