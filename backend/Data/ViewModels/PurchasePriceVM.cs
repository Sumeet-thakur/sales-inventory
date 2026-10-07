using SalesInventoryAPI.Models;
using System.ComponentModel.DataAnnotations;

namespace SalesInventoryAPI.Data.ViewModels
    {
    public class PurchasePriceVM
        {


        public int PurchasePriceId { get; set; }

        public string PurchasePriceRefNumber { get; set; }

        public DateTime? PurchasePriceDate { get; set; }




        public virtual ICollection<PurchasePriceListItemVM> PurchasePriceListItemVMs { get; set; }
= new List<PurchasePriceListItemVM>();
        }
    public class PurchasePriceListItemVM
        {


        public int PurchasePriceListItemChilId { get; set; }

        public int? PurchasePriceId { get; set; }

        public int? ItemId { get; set; }


        public string? Description { get; set; }

        public int? TotalQuantity { get; set; }

        public int? OldPurchasePrice { get; set; }

        public int? NewPurchasePrice { get; set; }

        public DateTime? Date { get; set; }


        }
    }
