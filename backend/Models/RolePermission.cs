using System.ComponentModel.DataAnnotations;

namespace SalesInventoryAPI.Models
{
    public class RolePermission
    {
        [Key]
        public int RolePermissionId { get; set; }

        public int ResourceId { get; set; }
        public int RoleId { get; set; }
        public int CreatedBy { get; set; }
        public DateTime? CreatedOn { get; set; }
        public int? ModifiedBy { get; set; }
        public DateTime? ModifiedOn { get; set; }
    }
}
