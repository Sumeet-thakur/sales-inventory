using System.ComponentModel.DataAnnotations;

namespace SalesInventoryAPI.Models
{
    public class CustomerChild
    {
        [Key]
        public int CustomerChildId { get; set; }
        public string BranchName { get; set; }

        // Foreign key
        public int CustomerId { get; set; }
        public int? CityID { get; set; }
        public string? CreatedBy { get; set; }

        public DateTime? CreatedOn { get; set; }
        public string? ModifiedBy { get; set; }
        public DateTime? ModifiedOn { get; set; }
        public int? IsActive { get; set; } = 1;
        public int? IsDeleted { get; set; } = 0;

        public List<ContactPersonCustomer> ContactPersons { get; set; } = new List<ContactPersonCustomer>();
    }

}
