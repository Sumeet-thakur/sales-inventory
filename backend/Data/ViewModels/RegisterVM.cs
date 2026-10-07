using System.ComponentModel.DataAnnotations;

namespace SalesInventoryAPI.Data.ViewModels
{
    public class RegisterVM
    {
        public string FirstName { get; set; }

        public string LastName { get; set; }

        [Required]
        public string EmailAddress { get; set; }

        [Required]
        public string UserName { get; set; }

        [Required]
        public string Password { get; set; }

        public string Role { get; set; }
        public string? Title { get; set; }
        public string? Department { get; set; }
        }
}
