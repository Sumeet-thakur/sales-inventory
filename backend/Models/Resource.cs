using System.ComponentModel.DataAnnotations;

namespace SalesInventoryAPI.Models
{
    public class Resource
    {
        [Key]
        public int ResourceId { get; set; }
        public string Name { get; set; }
        public string Action { get; set; }
        public string Type { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? CreatedOn { get; set; }
        public string? ModifiedBy { get; set; }
        public DateTime? ModifiedOn { get; set; }
    }
}
