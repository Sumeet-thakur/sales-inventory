using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SalesInventoryAPI.Models
{
    public class ManageAppRight
    {
        [Key]
        public int RightsId { get; set; }
        public string RoleId { get; set; }

        [ForeignKey(nameof(MenuItemId))]
        public int MenuItemId { get; set; }
        public int ModuleItemId { get; set; }
        public bool chkView { get; set; }
        public bool chkInsert { get; set; }
        public bool chkUpdate { get; set; }
        public bool chkDelete { get; set; }
        public bool chkPrint { get; set; }
        public bool chkApprove { get; set; }
        public bool chkRevise { get; set; }
        public bool chkVoid { get; set; }
        public bool IsActive { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? CreatedOn { get; set; }
        public string? ModifiedBy { get; set; }
        public DateTime? ModifiedOn { get; set; }
        // Navigation Property for related MenuItem
        public MenuItem MenuItem { get; set; }

    }
}
