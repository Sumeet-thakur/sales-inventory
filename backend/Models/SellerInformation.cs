using System.ComponentModel.DataAnnotations;

namespace SalesInventoryAPI.Models
{
    public class Seller
    {
        [Key]
        public int SellerId { get; set; }
        public string SellerName { get; set; }
        public int? CityID { get; set; }
        public string ContactNo { get; set; }
        public string Email { get; set; }
        public string Address { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? CreatedOn { get; set; }
        public string? ModifiedBy { get; set; }
        public DateTime? ModifiedOn { get; set; }
        public int IsActive { get; set; } = 1;
        public int IsDeleted { get; set; }
    }
}
