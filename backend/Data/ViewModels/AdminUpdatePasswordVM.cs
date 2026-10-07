using System.ComponentModel.DataAnnotations;

namespace SalesInventoryAPI.Data.ViewModels
{
    public class AdminUpdatePasswordVM
    {
       
        public string NewPassword { get; set; }

      
        public string ConfirmNewPassword { get; set; }
    }
}
