namespace SalesInventoryAPI.Models
    {
    public  class AppConstants
        {
        public  class Statuses
            {
            public const int Draft = 1;
            public const int Pending = 2;
            public const int Approve =3;
            public const int Void = 4;

            }

        public class InvoiceStatuses
            {
            public const int Open = 1;
            public const int DeliveryChallanIssued = 2;
            public const int OutForDelivery = 3;
            public const int Delivered = 4;
            public const int GRNIssued = 5;
            public const int PaymentReceived = 6;

            }
        public class PaymentStatuses
            {
            public const int Unpaid = 1;
            public const int PartialPaid = 2;
            public const int Paid = 3;
            public const int OverPaid = 4;
          

            }
        }
    }
