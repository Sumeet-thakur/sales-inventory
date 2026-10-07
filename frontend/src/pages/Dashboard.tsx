import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import useFormatDate from "@/hooks/useFormatDate";
import { usePermissions } from "@/hooks/usePermissions";
import { RootState } from "@/Storage/Redux/store";
import { variables } from "@/Variables";
import { Package, ShoppingCart, DollarSign, TrendingUp, Eye, Store, UserPlus, CreditCard, Truck, Award, Trophy } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import useNumberFormatter from "@/hooks/useNumberFormatter";
import { SD_Roles } from "@/Utility/SD";

const StatCard = ({ icon: Icon, label, value, trend }: { icon: any; label: string; value: string; trend: string }) => (
  <Card className="p-6">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <h3 className="text-2xl font-semibold mt-2">{value}</h3>
        <p className="text-sm text-success mt-2 font-bold">{trend}</p>
      </div>
      <div className="bg-primary bg-opacity-10 p-3 rounded-lg">
        <Icon className="h-6 w-6 text-primary" />
      </div>
    </div>
  </Card>
);
interface Invoices {
  index: number;
  salesInvoiceID: number;
  refNo: string;
  invoiceDate: string;
  netAmount: number;
}
interface ItemStockDashboard {
  index: number;
  itemID: number;
  itemCode: string;
  itemName: string;
  quantity: number;
}
interface DashboardDto {
  itemsCount: number;
  totalSales: number;
  totalPurchases: number;
  customersCount: number;
  vendorsCount: number;
  purchaseInvoicesCount: number;
  salesInvoicesCount: number;
  quantitySold: number;
  itemName: string;
}

const Dashboard = () => {
  const { token, role, roleid,email } = useSelector
    (
      (state: RootState) => state.userAuthStore
    );
  const { hasPermission, loading: permissionsLoading } = usePermissions(roleid);
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState<Invoices[]>([]);
  const [stocks, setStocks] = useState<ItemStockDashboard[]>([]);

   const [itemsCount, setItemsCount] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [totalPurchases, setTotalPurchases] = useState(0);
  const [customersCount, setCustomersCount] = useState(0);
  const [vendorsCount, setVendorsCount] = useState(0);
  const [purchaseInvoicesCount, setPurchaseInvoicesCount] = useState(0);
  const [salesInvoicesCount, setSalesInvoicesCount] = useState(0);
  const [quantitySold, setquantitySold] = useState(0);
  const [itemName, setitemName] = useState("");
const fetchDashboardData = async () => {
  try {
    

    const res = await fetch(variables.API_URL + `Item/GetDataForDashboard`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: DashboardDto = await res.json();

    setItemsCount(data.itemsCount);
    setTotalSales(data.totalSales);
    setTotalPurchases(data.totalPurchases);
    setCustomersCount(data.customersCount);
    setVendorsCount(data.vendorsCount);
    setPurchaseInvoicesCount(data.purchaseInvoicesCount);
    setSalesInvoicesCount(data.salesInvoicesCount);
    setquantitySold(data.quantitySold);
    setitemName(data.itemName);
  } catch (err) {
    console.error("Failed to load dashboard data:", err);
  }
};
  const fetchSalesInvoices = async () => {
    try {
      const response = await fetch(variables.API_URL + `SalesInvoices/SalesInvoiceForDashBoard`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        console.log(data);
        if (Array.isArray(data)) {
          const formattedData = data.map((item: any) => ({
            index: item.index,
            salesInvoiceID: item.salesInvoiceID,
            refNo: item.refNo,
            invoiceDate: item.invoiceDate,
            netAmount: item.netAmount,


          }));
          setInvoices(formattedData);
        } else {
          throw new Error("Unexpected data structure");
        }
      } else {
        throw new Error("Failed to fetch brands");
      }
    } catch (error) {
      console.log("Error fetching brands:", error);
    }
  };
  const fetchItemStockDashboard = async (
    token: string
  ): Promise<ItemStockDashboard[]> => {
    const res = await fetch(
      `${variables.API_URL}Item/GetItemStockDashboard`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (!res.ok) {
      throw new Error(`Failed to fetch item stocks: ${res.status}`);
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      throw new Error("Unexpected data structure");
    }

    // map into your shape (if you want to rename or format anything)
    return data.map((item: any) => ({
      index: item.index,
      itemID: item.itemID,
      itemCode: item.itemCode,
      itemName: item.itemName,
      quantity: Number(item.quantity),
    }));
  };
  useEffect(() => {
    fetchSalesInvoices();
    fetchDashboardData();
  }, []);
  useEffect(() => {
    fetchItemStockDashboard(token)
      .then(setStocks)
      .catch(console.error);
  }, [token]);

  const formatDate = useFormatDate();
  const formatNumber = useNumberFormatter();
  const handleSalesInvoiceDetail = (salesInvoiceID: number) => {
    
     const url = `${window.location.origin}/sales/invoice/detail/${salesInvoiceID}`;
    window.open(url, '_blank');
  };

  const handleItemDetail = (itemId: number) => {
    const url = `${window.location.origin}/inventory/items/detail/${itemId}`;
    window.open(url, '_blank');
  };


  return (
  <>
    {role === SD_Roles.SuperAdmin ? (
      <div className="space-y-6">
     <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome to your inventory management system</p>
      </div>
{/*first chart start*/}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Package}
          label="Total Products"
          value={itemsCount.toString()}
          trend=""
        />
        <StatCard
          icon={DollarSign }
          label="Total Sales (PKR)"
           value={formatNumber(totalSales)}
          trend=""
        />
        <StatCard
          icon={ShoppingCart}
          label="Total Purchases (PKR)"
          value={formatNumber(totalPurchases)}
         trend=""
        />
        <StatCard
          icon={Trophy }
          label="Best Seller (Sold Quantity)"
          value={quantitySold.toString()}
         trend={itemName}
        />
      </div>
      {/*first chart end*/}
       {/*second chart start*/}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={UserPlus }
          label="Customers"
           value={customersCount.toString()}
          
          trend=""
        />
        <StatCard
          icon={Store }
          label="Vendors"
           
            value={vendorsCount.toString()}
         trend=""
        />
        <StatCard
          icon={ShoppingCart
          }
          label="Purchase Invoices"
           value={purchaseInvoicesCount.toString()}
         
           trend=""
        />
        <StatCard
          icon={DollarSign}
          label="Sales Invoices"
           value={salesInvoicesCount.toString()}
          
          trend=""
        />
      </div>
  {/*second chart end*/}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Sales</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">S No.</TableHead>
                <TableHead className="text-center">Invoice No</TableHead>
                <TableHead className="text-center">Date</TableHead>
                <TableHead className="text-center">Net Amount (PKR)</TableHead>
                <TableHead className="text-center">View</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody className="text-xs">
              {invoices.map((invoice) => (
                <TableRow key={invoice.salesInvoiceID}>
                  <TableCell className="text-center">{invoice.index}</TableCell>
                  <TableCell className="text-center">{invoice.refNo}</TableCell>
                  <TableCell className="text-center">{formatDate(invoice.invoiceDate)}</TableCell>
                  <TableCell className="text-center">{formatNumber(invoice.netAmount)}</TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleSalesInvoiceDetail(invoice.salesInvoiceID)}
                      style={{ display: hasPermission(25, "view") ? "flex" : "none" }}
                      title="View Detail"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}{invoices.length == 0 && (<TableRow>
                <TableCell colSpan={5} className="px-3 py-4 text-center text-gray-500">
                  No Data found
                </TableCell>
              </TableRow>)}
            </TableBody>
          </Table>

        </Card>
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Inventory Status</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">S No.</TableHead>
                <TableHead className="text-center">Code</TableHead>
                <TableHead className="text-center">Item Name</TableHead>
                <TableHead className="text-center">Stock At Hand</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {stocks.map((s, idx) => (
  <TableRow key={`${s.itemID}-${idx}`}>
                  <TableCell className="text-center">{s.index}</TableCell>
                  <TableCell className="text-center">{s.itemCode}</TableCell>
                  <TableCell className=" text-center min-w-40 max-w-40 cursor-pointer hover:text-blue-500 transition-colors duration-200 " onClick={() => handleItemDetail(s.itemID)}>{s.itemName}</TableCell>
                  <TableCell
                    className={`
    text-center font-bold
    ${s.quantity < 11 ? "text-red-500" : "text-green-500"}
  `}
                  >
                    {s.quantity}
                  </TableCell>
                </TableRow>
              ))}{stocks.length == 0 && (<TableRow>
                <TableCell colSpan={4} className="px-3 py-4 text-center text-gray-500">
                  No Data found
                </TableCell>
              </TableRow>)}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
      </div>
    ) : (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6"><div>Welcome Back ,<span className="text-medium">{email}</span></div></div></div>
      
    )}
  </>
);
};

export default Dashboard;