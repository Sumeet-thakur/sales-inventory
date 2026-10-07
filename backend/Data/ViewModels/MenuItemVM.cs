using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SalesInventoryAPI.Data.ViewModels
{
    public class MenuItemVM
    {
        [Required]
        public string MenuItemName { get; set; }

        [Required]
        public int ModuleItemId { get; set; }

        [Required]
        public int MenuItemOrder { get; set; }
       
        public string Controller { get; set; }

       
        public string Action { get; set; }


        [Required]
        public int ParentId { get; set; }
        [Required]
        public int IsParent { get; set; }
    }
}
