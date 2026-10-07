namespace SalesInventoryAPI.Models
{
    public class City
    {
        public int CityId { get; set; }
        public string CityName { get; set; }
        public int? IsActive { get; set; } = 1;
        public string? CreatedBy { get; set; }
        public DateTime? CreatedOn { get; set; }
        public string? ModifiedBy { get; set; }
        public DateTime? ModifiedOn { get; set; }
        public int? IsDeleted { get; set; } = 0;
    }
}
