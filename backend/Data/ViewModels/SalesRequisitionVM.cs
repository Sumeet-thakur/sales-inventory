using SalesInventoryAPI.Models;
using System.ComponentModel.DataAnnotations;

namespace SalesInventoryAPI.Data.ViewModels
    {
    public class SalesRequisitionVM
        {
        
        public int SalesRequisitionID { get; set; }
        public string RefNo { get; set; }
        public DateTime? Date { get; set; }
        public int CustomerID { get; set; }
        public int SellerID { get; set; }
        public int CustomerChildID { get; set; }
        public int StatusId { get; set; }

        public string Description { get; set; }
        public decimal? TotalQuantity { get; set; }
        public List<SalesRequisitionChildVM> SalesRequisitionChildVMs { get; set; } = new List<SalesRequisitionChildVM>();
        public List<SalesRequisitionChildFilesVM> salesRequisitionChildFileVMs { get; set; } = new List<SalesRequisitionChildFilesVM>();
        public List<int>? RemovedSalesRequisitionChildIds { get; set; }
        public List<int>? RemovedSalesRequisitionFilesIds { get; set; }
        public virtual ICollection<MultipleAttachmentVM>? MultipleAttachments { get; set; } = new List<MultipleAttachmentVM>();

        }

    public class SalesRequisitionChildVM
        {
  
        public int SalesRequisitionChildID { get; set; }
        public int SalesRequisitionID { get; set; }
        public int? ItemID { get; set; }
        public decimal? Quantity { get; set; }
        public int? UnitId { get; set; }
        public string? ItemName { get; set; }
        public string? UnitName { get; set; }
        public int? ConversionFactor { get; set; }
        public bool? IsSecondaryUnit { get; set; }
        public int? ChildTotalQuantity { get; set; }
        }


    public class SalesRequisitionChildFilesVM
        {
        public int SalesRequisitionChildFileID { get; set; }
        public int SalesRequisitionID { get; set; }
        public string? FilePath { get; set; }
        public string? Referenceno { get; set; }
        // This property is used when a new file is uploaded.
        public IFormFile? UploadedFile { get; set; }
        }


    public class SalesRequisitionRequest
        {

       
        public string RefNo { get; set; }
        public DateTime? Date { get; set; }
        public int? CustomerID { get; set; }
        public int? SellerID { get; set; }
        public int? CustomerChildID { get; set; }
        public int StatusId { get; set; }
        public string? Description { get; set; }
        public decimal? TotalQuantity { get; set; }
        public List<SalesRequisitionChildRequest>? SalesRequisitionChildRequests { get; set; } = new List<SalesRequisitionChildRequest>();
        public List<SalesRequisitionChildFilesRequest>? salesRequisitionChildFilesRequests { get; set; } = new List<SalesRequisitionChildFilesRequest>();
        public virtual ICollection<MultipleAttachmentVM>? MultipleAttachments { get; set; } = new List<MultipleAttachmentVM>();

        }

    public class SalesRequisitionChildRequest
        {

        public int SalesRequisitionChildID { get; set; }
        public int SalesRequisitionID { get; set; }
        public int? ItemID { get; set; }
        public decimal? Quantity { get; set; }
        public int? UnitId { get; set; }
        public int? ConversionFactor { get; set; }
        public bool? IsSecondaryUnit { get; set; }
        public int? ChildTotalQuantity { get; set; }

        }


    public class SalesRequisitionChildFilesRequest
        {

        public int SalesRequisitionChildFileID { get; set; }
        public int SalesRequisitionID { get; set; }

        public string? FilePath { get; set; }
        public string? Referenceno { get; set; }



        }
    }
