namespace SalesInventoryAPI.Data.ViewModels
{
    public class MainMenuListVM
    {
        public string Icon { get; set; }
        public string Label { get; set; }
        public string Path { get; set; }

        public List<ChildMainMenuListVM>? childMainMenuListVMs { get; set; }
    }
    public class ChildMainMenuListVM
    {
        public string Icon { get; set; }
        public string Label { get; set; }
        public string Path { get; set; }
    }
}
