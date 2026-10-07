using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace SalesInventoryAPI.Models
    {
    [Table("multipleattachments")]
    public class MultipleAttachment
        {
        [Key]
      
        public int MultipleAttachmentfileId { get; set; }

        public int? MenuItemId { get; set; }

        
        public string? MenuItemName { get; set; }

        public int? ParentTableId { get; set; }

        
        public string? FileName { get; set; }
        public string? FilePath { get; set; }

      
        public string? Referenceno { get; set; }

        public DateTime? Date { get; set; }

        public string? CreatedBy { get; set; }

        public DateTime? CreatedOn { get; set; }

        public string? ModifiedBy { get; set; }

        public DateTime? ModifiedOn { get; set; }

        public int? IsActive { get; set; }

        public int? IsDeleted { get; set; }
        }
    }
