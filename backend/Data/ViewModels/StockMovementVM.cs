namespace SalesInventoryAPI.Data.ViewModels
    {
    public class StockMovementVM
        {
        public int StockMovementID { get; set; }
        public string RefNo { get; set; }

        public DateTime? Date { get; set; }

        public int? To_WareHouseId { get; set; }

        public int? From_WareHouseId { get; set; }

        public string? Description { get; set; }

        public decimal? TotalQuantity { get; set; }

        public int? StatusId { get; set; }
        public ICollection<StockMovementChildVM>? StockMovementChildVMs { get; set; } = new List<StockMovementChildVM>();
        public virtual ICollection<MultipleAttachmentVM>? MultipleAttachments { get; set; } = new List<MultipleAttachmentVM>();
        public List<int>? RemovedStockMovementChildIds { get; set; }
        }
    }
