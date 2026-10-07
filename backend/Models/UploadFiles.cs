namespace SalesInventoryAPI.Models
    {
    public class UploadFiles 
        {
        public IFormFile File { get; set; }

        // your extra property
        public string ReferenceNo { get; set; }
        }
    }
