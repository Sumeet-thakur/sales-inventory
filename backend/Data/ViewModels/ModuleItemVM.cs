using System.ComponentModel.DataAnnotations;

namespace SalesInventoryAPI.Data.ViewModels
{
    public class ModuleItemVM
    {

        [Required]
        public string ModuleItemName { get; set; }
        [Required]
        public int ModuleItemOrder { get; set; }
    }
}
