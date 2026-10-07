using SalesInventoryAPI.Models;
using System.ComponentModel.DataAnnotations;

namespace SalesInventoryAPI.Data.ViewModels
{
    public class VendorRequest
    {

        public string VendorName { get; set; }
        public int? CityID { get; set; }
        public string ContactNo { get; set; }
        public string Email { get; set; }
        public string Address { get; set; }
        public string NTNNo { get; set; }
        public decimal? OpeningBalance { get; set; }
        public decimal? CreditLimit { get; set; }
        public string CreditDays { get; set; }
       

        public List<VendorChildRequest> VendorChildRequests { get; set; } = new List<VendorChildRequest>();


    }

    public class VendorChildRequest
    {
        public int VendorChildID { get; set; }
        public int? VendorID { get; set; }
        public string BranchName { get; set; }
        public int? CityId { get; set; }
        public List<ContactPersonVendorRequest> ContactPersonVendorRequests { get; set; } = new List<ContactPersonVendorRequest>();
    }

    public class ContactPersonVendorRequest
    {

        public int ContactPersonID { get; set; }
        public int? VendorID { get; set; }
        public int? VendorChildID { get; set; }
        public string ContactPersonName { get; set; }
        public string Designation { get; set; }
        public string Address { get; set; }
        public string PhoneNo { get; set; }
        public string MobileNo { get; set; }
        public string Email { get; set; }



    }
    public class VendorVM
    {
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
       
        public DateTime? ModifiedOn { get; set; }

        public List<VendorChildVM> VendorChildVMs { get; set; } = new List<VendorChildVM>();
        public List<int>? RemovedCustomerChildIds { get; set; }

    }

    public class VendorChildVM 
    {
        public int VendorChildID { get; set; }
        public int? VendorID { get; set; }
        public string BranchName { get; set; }
        public int? CityId { get; set; }



        public List<ContactPersonVendorVM> ContactPersonVendorVMs { get; set; } = new List<ContactPersonVendorVM>();
        public List<int>? RemovedContactPersonVendorIds { get; set; }
    }

    public class ContactPersonVendorVM
    {
       
        public int ContactPersonID { get; set; }
        public int? VendorID { get; set; }
        public int? VendorChildID { get; set; }
        public string ContactPersonName { get; set; }
        public string Designation { get; set; }
        public string Address { get; set; }
        public string PhoneNo { get; set; }
        public string MobileNo { get; set; }
        public string Email { get; set; }
        


    }


   
}
