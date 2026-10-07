using System.ComponentModel.DataAnnotations;

namespace SalesInventoryAPI.Models
{
    public class UpdatePasswordVM
    {
        [Required]
        public string CurrentPassword { get; set; }

        [Required]
        [StringLength(100, MinimumLength = 8)]
        public string NewPassword { get; set; }

        [Required]
        [Compare(nameof(NewPassword))]
        public string ConfirmNewPassword { get; set; }


    }
}
