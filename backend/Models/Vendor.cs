using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
namespace SalesInventoryAPI.Models
{
    public class Vendor
{
        [Key]
        public int VendorID { get; set; }
    public string VendorName { get; set; }
    public int? CityID { get; set; }
    public string ContactNo { get; set; }
    public string Email { get; set; }
    public string Address { get; set; }
    public string NTNNo { get; set; }
    public decimal? OpeningBalance { get; set; }
    public decimal? CreditLimit { get; set; }
    public string CreditDays { get; set; }
    public int IsActive { get; set; } = 1;
    public int IsDeleted { get; set; } = 0;
    public string? CreatedBy { get; set; }
    public DateTime? CreatedOn { get; set; }
    public string? ModifiedBy { get; set; }
    public DateTime? ModifiedOn { get; set; }

        public List<VendorChild> VendorChilds { get; set; } = new List<VendorChild>();

    }
}





