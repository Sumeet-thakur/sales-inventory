using System.ComponentModel.DataAnnotations;

namespace SalesInventoryAPI.Data.ViewModels
{
    public class PriceListRequest
    {

        public string PriceRefNumber { get; set; }
        public string? PriceDate { get; set; }
       

       
        public List<PriceListItemChildRequest>? Items { get; set; }

    }

    public class PriceListItemChildRequest
    {

        public int ItemId { get; set; }
        public int? CustomerCategoryId { get; set; }
        public string Description { get; set; }
        public int TotalQuantity { get; set; }
        public int OldNetPrice { get; set; }
        public int NewNetPrice { get; set; }

    }


    public class PriceListVM
    {
        public int PriceListId { get; set; }
        public string PriceRefNumber { get; set; }
        public string? PriceDate { get; set; }
        public List<PriceListItemChildVM>? Items { get; set; }

        public List<int>? RemovedItemIds { get; set; }

    }

    public class PriceListItemChildVM
    {
        public int PriceListItemChildId { get; set; }
        public int PriceListId { get; set; }
        public int ItemId { get; set; }
        public int? CustomerCategoryId { get; set; }
        public string Description { get; set; }
        public int TotalQuantity { get; set; }
        public int OldNetPrice { get; set; }
        public int NewNetPrice { get; set; }

    }


}
