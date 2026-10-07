using Microsoft.AspNetCore.Identity;


namespace SalesInventoryAPI.Models
{
    public class ApplicationUser: IdentityUser
    {
        public string FirstName { get; set; }
        public string LastName { get; set; }

        public string? Title { get; set; }
        public string? Department { get; set; }
        public int? IsActive { get; set; } = 1;
        public int? IsDeleted { get; set; } = 0;
        public string? CurrentSessionId { get; set; }
        }
}
