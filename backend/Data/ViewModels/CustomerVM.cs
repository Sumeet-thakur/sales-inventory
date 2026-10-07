using SalesInventoryAPI.Models;

namespace SalesInventoryAPI.Data.ViewModels
{
    public class CustomerRequest
    {
        public string CustomerName { get; set; }
        public int? CityID { get; set; }
        public string? ContactNo { get; set; }
        public string? Email { get; set; }
        public string? Address { get; set; }
        public string? NTNNo { get; set; }
        public decimal? OpeningBalance { get; set; }
        public decimal? CreditLimit { get; set; }
        public int? CreditDays { get; set; }
        public string? CustomerCategory { get; set; }
        public int? CustomerCategoryId { get; set; }
        public List<CustomerChildRequest>? customerChildRequests { get; set; }
    }
    public class CustomerChildRequest
    {
        public string? BranchName { get; set; }
        public int? CustomerId { get; set; }
        public int? CityID { get; set; }
        public List<ContactPersonCustomerRequest>? contactPersonCustomerRequests { get; set; }
    }
    public class ContactPersonCustomerRequest
    {
        public int? CustomerId { get; set; }
        public int? CustomerChildId { get; set; }

        public string? ContactPersonName { get; set; }
        public string? Designation { get; set; }
        public string? Address { get; set; }
        public string? PhoneNo { get; set; }
        public string? MobileNo { get; set; }
        public string? Email { get; set; }
    }
    public class CustomerVM
    {
        public int CustomerId { get; set; }
        public string? CustomerName { get; set; }
        public int? CityID { get; set; }
        public string? ContactNo { get; set; }
        public string? Email { get; set; }
        public string? Address { get; set; }
        public string? NTNNo { get; set; }
        public decimal? OpeningBalance { get; set; }
        public decimal? CreditLimit { get; set; }
        public int? CreditDays { get; set; }
        public string? CustomerCategory { get; set; }
        public int? CustomerCategoryId { get; set; }
        public List<CustomerChildVM>? CustomerChildVMs { get; set; }
        public List<int>? RemovedCustomerChildIds { get; set; }

    }
    public class CustomerChildVM
    {
        public int CustomerChildId { get; set; }
        public string? BranchName { get; set; }
        public int? CustomerId { get; set; }
        public int? CityID { get; set; }
        public List<ContactPersonCustomerVM>? contactPersonCustomerVMs { get; set; }
        public List<int>? RemovedContactPersonIds { get; set; }

    }
    public class ContactPersonCustomerVM
    {
        public int ContactPersonId { get; set; }

        public int? CustomerId { get; set; }
        public int? CustomerChildId { get; set; }

        public string? ContactPersonName { get; set; }
        public string? Designation { get; set; }
        public string? Address { get; set; }
        public string? PhoneNo { get; set; }
        public string? MobileNo { get; set; }
        public string? Email { get; set; }
    }

}
