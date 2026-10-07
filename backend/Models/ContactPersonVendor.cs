using System.ComponentModel.DataAnnotations;

namespace SalesInventoryAPI.Models
{
    public class ContactPersonVendor
    {
        [Key]
        public int ContactPersonID { get; set; }
        public int? VendorID { get; set; }
        public int? VendorChildID { get; set; }
        public string ContactPersonName { get; set; }
        public string Designation { get; set; }
        public string Address { get; set; }
        public string PhoneNo { get; set; }
        public string MobileNo { get; set; }
        public string Email { get; set; }
        public int IsActive { get; set; } = 1;
        public int IsDeleted { get; set; } = 0;
        public string CreatedBy { get; set; }
        public DateTime? CreatedOn { get; set; }
        public string ModifiedBy { get; set; }
        public DateTime? ModifiedOn { get; set; }


    }
}