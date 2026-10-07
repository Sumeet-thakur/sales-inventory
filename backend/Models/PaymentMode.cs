using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace SalesInventoryAPI.Models
    {
    public class PaymentMode
        {
        [Key]
        
        public int PaymentModeId { get; set; }

       
        public string PaymentModeName { get; set; }

        public string CreatedBy { get; set; }

        public DateTime? CreatedOn { get; set; }

        public string ModifiedBy { get; set; }

        public DateTime? ModifiedOn { get; set; }

       
        public int IsActive { get; set; }

        public int IsDeleted { get; set; }
        }
    }
