using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Org.BouncyCastle.Utilities;
using SalesInventoryAPI.Data.ViewModels;
using SalesInventoryAPI.Models;
using static SalesInventoryAPI.Models.AppConstants;

namespace SalesInventoryAPI.Data
{
    public class InventoryDbContext : IdentityDbContext<ApplicationUser, IdentityRole, string>
    {
        public InventoryDbContext(DbContextOptions<InventoryDbContext> options) : base(options) { }
        public DbSet<City> Cities { get; set; }
        public DbSet<CustomerCategory> CustomerCategories { get; set; }
        public DbSet<Customer> Customers { get; set; }
        public DbSet<CustomerChild> CustomerChilds { get; set; }
        public DbSet<ContactPersonCustomer> ContactPersonCustomers { get; set; }
        public DbSet<Seller> Sellers { get; set; }
        public DbSet<Brand> Brands { get; set; }
        public DbSet<ItemGroup> ItemGroups { get; set; }
        public DbSet<Unit> Units { get; set; }
        public DbSet<Item> Items { get; set; }
        public DbSet<ItemCustomerCategory> ItemCustomerCategories { get; set; }
        public DbSet<SalesRequisition> SalesRequisitions { get; set; }
       
        public DbSet<ModuleItem> ModuleItems { get; set; }
        public DbSet<MenuItem> MenuItems { get; set; }
        public DbSet<ManageAppRight> ManageAppRights { get; set; }

        public DbSet<SalesRequisitionChild> SalesRequisitionChilds { get; set; }
        public DbSet<SalesRequisitionChildFiles> SalesRequisitionChildFiles { get; set; }
        public DbSet<RefreshToken> RefreshTokens { get; set; }
        public DbSet<Error> Errors { get; set; }
        public DbSet<ActivityLog> ActivityLogs { get; set; }
        public DbSet<Reviselog> ReviseLogs { get; set; }


        public DbSet<Vendor> Vendors { get; set; }
        public DbSet<VendorChild> VendorChilds { get; set; }
        public DbSet<ContactPersonVendor> ContactPersonVendors { get; set; }
        public DbSet<Warehouse> Warehouses { get; set; }
        public DbSet<PriceList> PriceLists { get; set; }
        public DbSet<Status> Statuses { get; set; }
        public DbSet<InvoiceStatus> InvoiceStatuses { get; set; }
        public DbSet<PriceListItemChild> PriceListItemChildren { get; set; }
        public DbSet<PurchaseRequisitionOrder> PurchaseRequisitionOrders { get; set; }
        public DbSet<PurchaseRequisitionOrderChild> PurchaseRequisitionOrderChildren { get; set; }
        public DbSet<SalesInvoice> SalesInvoices { get; set; }
        public DbSet<SalesInvoiceChild> SalesInvoiceChildren { get; set; }
        public DbSet<PaymentMode> PaymentModes { get; set; }
        public DbSet<PaymentStatus> PaymentStatus { get; set; }
        public DbSet<PaymentReceived> PaymentReceived { get; set; }
        public DbSet<PaymentReceivedChild> PaymentReceivedChildren { get; set; }
        public DbSet<MultipleAttachment> Multipleattachments { get; set; }
        public DbSet<PurchaseReceive> PurchaseReceives { get; set; }
        public DbSet<PurchaseReceiveChild> PurchaseReceiveChildren { get; set; }
        public DbSet<PurchasePrice> PurchasePrices { get; set; }
        public DbSet<PurchasePriceListItem> PurchasePriceListItems { get; set; }
        public DbSet<PurchaseInvoice> PurchaseInvoices { get; set; }
        public DbSet<PurchaseInvoiceChild> PurchaseInvoiceChildren { get; set; }
        public DbSet<AdjustmentType> AdjustmentTypes { get; set; }
        public DbSet<StockAdjustment> StockAdjustments { get; set; }
        public DbSet<StockAdjustmentChild> StockAdjustmentChildren { get; set; }
        public DbSet<StockTransaction> StockTransactions { get; set; }
        public DbSet<ItemStock> ItemStocks { get; set; }
        public DbSet<StockMovement> StockMovements { get; set; }
        public DbSet<StockMovementChild> StockMovementChildren { get; set; }
       

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<RefreshToken>(entity =>
            {
                entity.HasKey(b => b.TokenId);
            });


            modelBuilder.Entity<IdentityUserLogin<string>>()
           .HasKey(l => l.UserId);


            modelBuilder.Entity<IdentityUserRole<string>>()
            .HasKey(ur => new { ur.UserId, ur.RoleId });

            modelBuilder.Entity<IdentityUserToken<string>>()
            .HasKey(ut => new { ut.UserId, ut.LoginProvider, ut.Name });


            modelBuilder.Entity<ItemGroup>(entity =>
            {
                entity.HasKey(b => b.ItemGroupId);
            });
            modelBuilder.Entity<Item>(entity =>
            {
                entity.HasKey(b => b.ItemId);
            });

            modelBuilder.Entity<CustomerCategory>(entity =>
            {
                entity.HasKey(b => b.CustomerCategoryId);
            });

            modelBuilder.Entity<Seller>(entity =>
            {
                entity.HasKey(b => b.SellerId);
            });

            modelBuilder.Entity<Brand>(entity =>
            {
                entity.HasKey(b => b.BrandId); 
            });

            modelBuilder.Entity<Unit>(entity =>
            {
                entity.HasKey(b => b.UnitId);
            });

            modelBuilder.Entity<Warehouse>(entity =>
            {
                entity.HasKey(b => b.WarehouseID);
            });

            modelBuilder.Entity<Customer>()
                      .HasKey(c => c.CustomerId);

            modelBuilder.Entity<Customer>()
                .HasMany(c => c.CustomerChilds)
                .WithOne()
                .HasForeignKey(cc => cc.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<CustomerChild>()
                .HasKey(cc => cc.CustomerChildId);

            modelBuilder.Entity<CustomerChild>()
                .HasMany(cc => cc.ContactPersons)
                .WithOne()
                .HasForeignKey(cp => cp.CustomerChildId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ContactPersonCustomer>()
                .HasKey(cp => cp.ContactPersonId);


            modelBuilder.Entity<SalesRequisition>()
                     .HasKey(c => c.SalesRequisitionID);

            modelBuilder.Entity<SalesRequisition>()
                .HasMany(c => c.SalesRequisitionChilds)
                .WithOne()
                .HasForeignKey(cc => cc.SalesRequisitionID)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<SalesRequisitionChild>()
                .HasKey(cc => cc.SalesRequisitionChildID);


            modelBuilder.Entity<RefreshToken>(entity =>
            {
                entity.HasKey(r => r.TokenId); // Primary key
                entity.Property(r => r.Token).IsRequired(); // Token is required
                entity.Property(r => r.JwtId).IsRequired(); // JwtId is required
                entity.Property(r => r.UserId).IsRequired(); // UserId is required
                entity.HasOne(r => r.User)
                    .WithMany() // Assuming a one-to-many relationship
                    .HasForeignKey(r => r.UserId)
                    .OnDelete(DeleteBehavior.Cascade); // Configure the foreign key relationship
            });
            modelBuilder.Entity<Resource>(entity =>
            {
                entity.HasKey(b => b.ResourceId);
            });

            modelBuilder.Entity<RolePermission>(entity =>
            {
                entity.HasKey(b => b.RolePermissionId);
            });

            modelBuilder.Entity<ModuleItem>()
            .Property(b => b.IsActive)
             .HasDefaultValue(0);

            modelBuilder.Entity<MenuItem>(entity =>
            {
                entity.Property(b => b.IsActive)
                      .HasDefaultValue(0);

                entity.HasOne(m => m.ModuleItem)
                      .WithMany(m => m.MenuItems)
                      .HasForeignKey(m => m.ModuleItemId);
            });

            modelBuilder.Entity<ManageAppRight>()
                .HasOne(m => m.MenuItem)
                .WithMany(m => m.ManageAppRights)
                .HasForeignKey(m => m.MenuItemId);


            modelBuilder.Entity<Error>(entity =>
            {
                entity.HasKey(b => b.ErrorId);
            });
            modelBuilder.Entity<ActivityLog>(entity =>
            {
                entity.HasKey(b => b.ActivityLogId);
            });
            modelBuilder.Entity<Reviselog>(entity =>
            {
                entity.HasKey(b => b.ReviseLogId);
            });

            modelBuilder.Entity<PriceList>(entity =>
            {
                entity.HasKey(b => b.PriceListId);
            });
            modelBuilder.Entity<PriceListItemChild>(entity =>
            {
                entity.HasKey(b => b.PriceListItemChildId);
            });
            modelBuilder.Entity<ItemCustomerCategory>(entity =>
            {
                entity.HasKey(b => b.ItemCustomerCatId);
            });



            modelBuilder.Entity<Vendor>()
                      .HasKey(c => c.VendorID);

            modelBuilder.Entity<Vendor>()
                .HasMany(c => c.VendorChilds)
                .WithOne()
                .HasForeignKey(cc => cc.VendorID)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<VendorChild>()
                .HasKey(cc => cc.VendorChildID);

            modelBuilder.Entity<VendorChild>()
                .HasMany(cc => cc.ContactPersonVendors)
                .WithOne()
                .HasForeignKey(cp => cp.VendorChildID)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ContactPersonVendor>()
                .HasKey(cp => cp.ContactPersonID);

            modelBuilder.Entity<SalesRequisitionChildFiles>()
                .HasKey(cc => cc.SalesRequisitionChildFileID);
            
            modelBuilder.Entity<Status>()
                .HasKey(cc => cc.StatusId);

            modelBuilder.Entity<PurchaseRequisitionOrder>()
               .HasKey(cc => cc.PurchaseRequisitionOrderID); 

            modelBuilder.Entity<PurchaseRequisitionOrderChild>()
               .HasKey(cc => cc.PurchaseRequisitionOrderChildID);

            modelBuilder.Entity<SalesInvoice>()
               .HasKey(cc => cc.SalesInvoiceID);
            
            modelBuilder.Entity<SalesInvoiceChild>()
               .HasKey(cc => cc.SalesInvoiceChildID);

            modelBuilder.Entity<InvoiceStatus>()
               .HasKey(cc => cc.InvoiceStatusId);
            modelBuilder.Entity<PaymentMode>()
               .HasKey(cc => cc.PaymentModeId);
            modelBuilder.Entity<PaymentStatus>()
               .HasKey(cc => cc.PaymentStatusId);
            modelBuilder.Entity<PaymentReceived>()
               .HasKey(cc => cc.PaymentReceivedID);
            modelBuilder.Entity<PaymentReceivedChild>()
               .HasKey(cc => cc.PaymentReceivedChildID);
            modelBuilder.Entity<MultipleAttachment>()
               .HasKey(cc => cc.MultipleAttachmentfileId);


            modelBuilder.Entity<PurchasePrice>()
              .HasKey(cc => cc.PurchasePriceId);
            modelBuilder.Entity<PurchasePriceListItem>()
               .HasKey(cc => cc.PurchasePriceListItemChilId);
            modelBuilder.Entity<PurchaseInvoice>()
               .HasKey(cc => cc.PurchaseInvoiceID); 
            modelBuilder.Entity<PurchaseInvoiceChild>()
               .HasKey(cc => cc.PurchaseInvoiceChildID);
            modelBuilder.Entity<AdjustmentType>()
              .HasKey(cc => cc.AdjustmentTypeID);              
            modelBuilder.Entity<ItemStock>()
              .HasKey(cc => cc.ItemStockID);   
            modelBuilder.Entity<StockMovement>()
              .HasKey(cc => cc.StockMovementID);    
            modelBuilder.Entity<StockMovementChild>()
              .HasKey(cc => cc.StockMovementChildID);
            }





    }
}
