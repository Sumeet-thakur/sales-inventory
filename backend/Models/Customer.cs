using System.ComponentModel.DataAnnotations;

namespace SalesInventoryAPI.Models
{
    public class Customer
    {
        [Key]
        public int CustomerId { get; set; }
        public string CustomerName { get; set; }
        public int? CityID { get; set; }
        public string ContactNo { get; set; }
        public string Email { get; set; }
        public string Address { get; set; }
        public string NTNNo { get; set; }
        public decimal? OpeningBalance { get; set; }
        public decimal? CreditLimit { get; set; }
        public int? CreditDays { get; set; }
        public string? CustomerCategory { get; set; }
        public int? CustomerCategoryId { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? CreatedOn { get; set; }
        public string? ModifiedBy { get; set; }
        public DateTime? ModifiedOn { get; set; }
        public int? IsActive { get; set; } = 1;
        public int? IsDeleted { get; set; } = 0;

        public List<CustomerChild> CustomerChilds { get; set; } = new List<CustomerChild>();
    }

}
