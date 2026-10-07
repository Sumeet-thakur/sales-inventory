using System.ComponentModel.DataAnnotations;

namespace SalesInventoryAPI.Models
{
    public class SalesRequisition
    {
        [Key]
        public int SalesRequisitionID { get; set; }
        public string RefNo { get; set; }
        public DateTime? Date { get; set; }
        public int CustomerID { get; set; }
        public int SellerID { get; set; }
        public int CustomerChildID { get; set; }
        public int StatusId { get; set; }
        public int IsActive { get; set; } = 1;
        public int IsDeleted { get; set; } = 0;
      
        public string Description { get; set; }
        
        public decimal? TotalQuantity { get; set; }
        public string CreatedBy { get; set; }
        public DateTime? CreatedOn { get; set; }
        public string? ModifiedBy { get; set; }
        public DateTime? ModifiedOn { get; set; }
        public List<SalesRequisitionChild> SalesRequisitionChilds { get; set; } = new List<SalesRequisitionChild>();
        //public List<SalesRequisitionChildFiles> salesRequisitionChildFiles { get; set; } = new List<SalesRequisitionChildFiles>();
    }

    public class SalesRequisitionChildFiles
        {
        [Key]
        public int SalesRequisitionChildFileID { get; set; }
        public int SalesRequisitionID { get; set; }

        public string? FilePath { get; set; }
        public string? Referenceno { get; set; }



        }
    }
