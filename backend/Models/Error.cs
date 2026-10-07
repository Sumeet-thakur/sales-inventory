using System.ComponentModel.DataAnnotations;
namespace SalesInventoryAPI.Models
{
    public class Error
    {
        [Key]
        public Guid ErrorId { get; set; }
        public string ErrorMessage { get; set; } = null!;
        public string? StackTrace { get; set; }
        public DateTime Date { get; set; }
    }

}
