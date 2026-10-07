using System.ComponentModel.DataAnnotations;

namespace SalesInventoryAPI.Models
{
    public class VendorChild
    {
        [Key]
        public int VendorChildID { get; set; }
        public int? VendorID { get; set; }
        public string BranchName { get; set; }
        public int? CityID { get; set; }
        public int IsActive { get; set; } = 1;
        public int IsDeleted { get; set; } = 0;
        public string CreatedBy { get; set; }
        public DateTime? CreatedOn { get; set; }
        public string ModifiedBy { get; set; }
        public DateTime? ModifiedOn { get; set; }

        public List<ContactPersonVendor> ContactPersonVendors { get; set; } = new List<ContactPersonVendor>();


    }

}
