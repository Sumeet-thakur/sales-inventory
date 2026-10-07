using System.ComponentModel.DataAnnotations;

namespace SalesInventoryAPI.Models
{
    public class UpdateRoleVM
    {
        [Required]
        public string Role { get; set; }
    }
}
