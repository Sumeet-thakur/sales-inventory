namespace SalesInventoryAPI.Data.ViewModels
{
    public class ManageAppRightVM
    {
        public string RoleId { get; set; }
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
    }
}
