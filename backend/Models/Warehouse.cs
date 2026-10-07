using System.ComponentModel.DataAnnotations;

namespace SalesInventoryAPI.Models
{
    public class Warehouse
    {
        [Key]
        public int WarehouseID { get; set; }
        public string WarehouseName { get; set; }
        public string Address { get; set; }
        public string WarehouseContactPerson { get; set; }
        public string ContactNo { get; set; }
        public string? Capacity { get; set; }
        public int? IsActive { get; set; }=1;
        public int? IsDeleted { get; set; }=0;
        public string? CreatedBy { get; set; }
        public DateTime CreatedOn { get; set; }
        public string? ModifiedBy { get; set; }
        public DateTime ModifiedOn { get; set; }
    }
}
