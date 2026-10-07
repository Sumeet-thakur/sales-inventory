import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "react-router-dom";
import {
  FileText,
  Plus,
  DollarSign,
  Truck,
  PackageCheck,
  ClipboardCheck,
  FileCheck,
  Trash2,
  Pencil,
  Eye ,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { variables } from "@/Variables";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useSelector } from "react-redux";
import { RootState } from "@/Storage/Redux/store";
import useFormatDate from "@/hooks/useFormatDate";
import { usePermissions } from "@/hooks/usePermissions";
import { useTableControls } from "@/hooks/useTableControls";
import { PaginationControl, SearchControl } from "@/hooks/TableControls";
import { SortableHeader } from "@/hooks/SortableHeader";
import useNumberFormatter from "@/hooks/useNumberFormatter";

type InvoiceStatus =
  | "Open"
  | "Out for Delivery"
  | "Delivered"
  | "GRN Issued"
  | "Payment Received";

interface Invoices {
  index: number;
  salesInvoiceID: number;
  refNo: string;
  invoiceDate: string;    // ISO‑8601 date string
  customerID: number;
  netAmount: number;
  outstandingAmount: number;
  paidAmount: number;
  customerName: string;
  statusId: number;
  invoiceStatusId: number;
  statusName: string;
  invoiceStatusName: string;
  paymentStatusName: string;
  paymentStatusId: number;
}
const SalesInvoiceList = () => {
  const { token, role, roleid } = useSelector(
    (state: RootState) => state.userAuthStore
  );
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoices[]>([]);
  const { hasPermission, loading: permissionsLoading } = usePermissions(roleid);

  const formatNumber=useNumberFormatter();




  // const getStatusColor = (status: InvoiceStatus) => {
  //   const colors = {
  //     Open: "bg-blue-100 text-blue-800",
  //     "Out for Delivery": "bg-yellow-100 text-yellow-800",
  //     Delivered: "bg-green-100 text-green-800",
  //     "GRN Issued": "bg-purple-100 text-purple-800",
  //     "Payment Received": "bg-emerald-100 text-emerald-800",
  //   };
  //   return colors[status] || "bg-gray-100 text-gray-800";
  // };
  const getStatusColor = (invoiceStatusId: number) => {
    const statusText = getInvoiceStatusText(invoiceStatusId);
    
    const colors = {
      Open: "bg-blue-100 text-blue-800",
      "Out For Delivery": "bg-yellow-100 text-yellow-800",
      Delivered: "bg-green-100 text-green-800",
      "GRN Issued": "bg-purple-100 text-purple-800",
      "Payment Received": "bg-emerald-100 text-emerald-800",
      "Delivery Challan Issued": "bg-gray-100 text-gray-800", // You can customize this as needed
    };
  
    return colors[statusText] || "bg-gray-100 text-gray-800"; // Default if no match
  };
  const handleStatusUpdate = (invoiceId: number, newStatus: InvoiceStatus) => {
    // In a real application, this would make an API call to update the status
    console.log(`Updating invoice ${invoiceId} to status: ${newStatus}`);
    toast("Status Updated");
  };

  // const getStatusIcon = (status: InvoiceStatus) => {
  //   switch (status) {
  //     case "Open":
  //       return <FileText className="h-4 w-4" />;
  //     case "Out for Delivery":
  //       return <Truck className="h-4 w-4" />;
  //     case "Delivered":
  //       return <PackageCheck className="h-4 w-4" />;
  //     case "GRN Issued":
  //       return <ClipboardCheck className="h-4 w-4" />;
  //     case "Payment Received":
  //       return <FileCheck className="h-4 w-4" />;
  //     default:
  //       return <FileText className="h-4 w-4" />;
  //   }
  // };

  const getStatusIcon = (invoiceStatusId: number) => {
    const statusText = getInvoiceStatusText(invoiceStatusId);
  
    switch (statusText) {
      case "Open":
        return <FileText className="h-4 w-4" />;
      case "Out For Delivery":
        return <Truck className="h-4 w-4" />;
      case "Delivered":
        return <PackageCheck className="h-4 w-4" />;
      case "GRN Issued":
        return <ClipboardCheck className="h-4 w-4" />;
      case "Payment Received":
        return <FileCheck className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };
  const fetchSalesInvoices = async () => {
    try {
      const response = await fetch(variables.API_URL + `SalesInvoices`, {
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
            customerID: item.customerID,
            netAmount: item.netAmount,
            customerName: item.customerName,
            statusId: item.statusId,
            invoiceStatusId: item.invoiceStatusId,
            statusName: item.statusName,
            invoiceStatusName: item.invoiceStatusName,
            paymentStatusId: item.paymentStatusId,
            paymentStatusName: item.paymentStatusName,
            paidAmount: item.paidAmount,
            outstandingAmount: item.outstandingAmount,
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
  useEffect(() => {
    fetchSalesInvoices();
  }, []);
  const formatDate = useFormatDate();

  const {
    searchTerm,
    setSearchTerm,
    sortConfig,
    handleSort,
    paginatedData,
    currentPage,
    setCurrentPage,
    totalPages,
  } = useTableControls<Invoices>(invoices, 10);

  const handleEdit = (salesRequisitionID: number) => {
    navigate(`/sales/invoice/${salesRequisitionID}`);
  };
  const handleDetail = (salesInvoiceID: number) => {
    navigate(`/sales/invoice/detail/${salesInvoiceID}`);
  };


  const getInvoiceStatusText = (invoiceStatusId: number): string => {
    switch (invoiceStatusId) {
      case 1:
        return "Open";
      case 2:
        return "Delivery Challan Issued";
      case 3:
        return "Out For Delivery";
      case 4:
        return "Delivered";
      case 5:
        return "GRN Issued";
        case 6:
          return "Payment Received";
      default:
        return "";
    }
  };
  const getPaymentStatusText = (paymentStatusId: number): string => {
    switch (paymentStatusId) {
      case 1:
        return "Unpaid";
      case 2:
        return "Partial Paid";
      case 3:
        return "Paid";
      case 4:
        return "Over Paid";
      
      default:
        return "";
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Sales Invoices</h1>
          <p className="text-gray-600 mt-1">Manage sales invoices</p>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Sales Invoices List</h3>
          <Button
            onClick={() => navigate("/sales/invoice/new")}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add Sales Invoice
          </Button>
        </div>
        {/* Search at the top */}
        <SearchControl
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          placeholder="Search Sales Invoice..."
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortableHeader
                  onClick={() => handleSort("index")}
                  sortDirection={
                    sortConfig?.key === "index" ? sortConfig.direction : null
                  }
                  isActive={sortConfig?.key === "index"}
                >
                  S No.
                </SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader
                  onClick={() => handleSort("refNo")}
                  sortDirection={
                    sortConfig?.key === "refNo" ? sortConfig.direction : null
                  }
                  isActive={sortConfig?.key === "refNo"}
                >
                  Invoice No
                </SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader
                  onClick={() => handleSort("invoiceDate")}
                  sortDirection={
                    sortConfig?.key === "invoiceDate" ? sortConfig.direction : null
                  }
                  isActive={sortConfig?.key === "invoiceDate"}
                >
                  Date
                </SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader
                  onClick={() => handleSort("customerName")}
                  sortDirection={
                    sortConfig?.key === "customerName" ? sortConfig.direction : null
                  }
                  isActive={sortConfig?.key === "customerName"}
                >
                  Customer
                </SortableHeader>
              </TableHead>

              <TableHead>
                <SortableHeader
                  onClick={() => handleSort("netAmount")}
                  sortDirection={
                    sortConfig?.key === "netAmount" ? sortConfig.direction : null
                  }
                  isActive={sortConfig?.key === "netAmount"}
                >
                  Net Amount
                </SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader
                  onClick={() => handleSort("paidAmount")}
                  sortDirection={
                    sortConfig?.key === "paidAmount" ? sortConfig.direction : null
                  }
                  isActive={sortConfig?.key === "paidAmount"}
                >
                  Paid Amount
                </SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader
                  onClick={() => handleSort("outstandingAmount")}
                  sortDirection={
                    sortConfig?.key === "outstandingAmount" ? sortConfig.direction : null
                  }
                  isActive={sortConfig?.key === "outstandingAmount"}
                >
                  Out Standing Amount
                </SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader
                  onClick={() => handleSort("statusName")}
                  sortDirection={
                    sortConfig?.key === "statusName" ? sortConfig.direction : null
                  }
                  isActive={sortConfig?.key === "statusName"}
                >
                  Status
                </SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader
                  onClick={() => handleSort("invoiceStatusName")}
                  sortDirection={
                    sortConfig?.key === "invoiceStatusName" ? sortConfig.direction : null
                  }
                  isActive={sortConfig?.key === "invoiceStatusName"}
                >
                 Fulfilment Status
                </SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader
                  onClick={() => handleSort("paymentStatusName")}
                  sortDirection={
                    sortConfig?.key === "paymentStatusName" ? sortConfig.direction : null
                  }
                  isActive={sortConfig?.key === "paymentStatusName"}
                >
                  Payment Status
                </SortableHeader>
              </TableHead>

              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((invoice) => (
              <TableRow key={invoice.salesInvoiceID}>
                <TableCell>{invoice.index}</TableCell>
                <TableCell>{invoice.refNo}</TableCell>
                <TableCell>{formatDate(invoice.invoiceDate)}</TableCell>
                <TableCell>{invoice.customerName}</TableCell>
                <TableCell>{formatNumber(invoice.netAmount.toFixed(2))}</TableCell>
                <TableCell>{formatNumber(invoice.paidAmount.toFixed(2))}</TableCell>
                <TableCell>{formatNumber(invoice.outstandingAmount.toFixed(2))}</TableCell>
                <TableCell>{invoice.statusName}</TableCell>
                <TableCell>
                <span
                    className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-sm ${getStatusColor(
                      invoice.invoiceStatusId
                    )}`}
                  >{getInvoiceStatusText(invoice.invoiceStatusId)}{getStatusIcon(invoice.invoiceStatusId)}
              
                </span>
              </TableCell> 
                <TableCell>{getPaymentStatusText(invoice.paymentStatusId)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDetail(invoice.salesInvoiceID)}
                      style={{
                        display: (hasPermission(25, "view")) ? "flex" : "none",
                      }}
                    title="View Detail"  

                    >
                      <Eye  className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(invoice.salesInvoiceID)}
                      style={{
                        display: (invoice.statusId !== 3 && invoice.statusId !== 4 && hasPermission(25, "update")) ? "flex" : "none",
                      }}

                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {/* <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4" />
                    </Button> */}
                  </div>
                </TableCell>

              </TableRow>
            ))}{ paginatedData.length ==0 && (   <TableRow>
                                                            <TableCell colSpan={11} className="px-3 py-4 text-center text-gray-500">
                                                              No Data found
                                                            </TableCell>
                                                          </TableRow>)}
            
          </TableBody>
        </Table>
        {/* Pagination at the bottom */}
        {totalPages > 1 && (
          <PaginationControl
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            totalPages={totalPages}
          />
        )}
        {/* Pagination at the bottom */}
      </Card>
    </div>
  );
};

export default SalesInvoiceList;
{/* <TableCell>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-sm ${getStatusColor(
                      invoice.status
                    )}`}
                  >
                    {getStatusIcon(invoice.status)}
                    {invoice.status}
                  </span>
                </TableCell> */}


// <TableCell className="text-right">
//   <div className="flex justify-end gap-2">
//     <DropdownMenu>
//       <DropdownMenuTrigger asChild>
//         <Button variant="ghost" size="icon">
//           {getStatusIcon(invoice.status)}
//         </Button>
//       </DropdownMenuTrigger>
//       <DropdownMenuContent align="end" className="w-48">
//         <DropdownMenuItem
//           onClick={() => handleStatusUpdate(invoice.id, "Open")}
//         >
//           <FileText className="h-4 w-4 mr-2" />
//           Mark as Open
//         </DropdownMenuItem>
//         <DropdownMenuItem
//           onClick={() =>
//             handleStatusUpdate(invoice.id, "Out for Delivery")
//           }
//         >
//           <Truck className="h-4 w-4 mr-2" />
//           Out for Delivery
//         </DropdownMenuItem>
//         <DropdownMenuItem
//           onClick={() =>
//             handleStatusUpdate(invoice.id, "Delivered")
//           }
//         >
//           <PackageCheck className="h-4 w-4 mr-2" />
//           Mark as Delivered
//         </DropdownMenuItem>
//         <DropdownMenuItem
//           onClick={() =>
//             handleStatusUpdate(invoice.id, "GRN Issued")
//           }
//         >
//           <ClipboardCheck className="h-4 w-4 mr-2" />
//           GRN Issued
//         </DropdownMenuItem>
//       </DropdownMenuContent>
//     </DropdownMenu>
//     <Button variant="ghost" size="icon">
//       <Pencil className="h-4 w-4" />
//     </Button>
//     <Button variant="ghost" size="icon">
//       <Trash2 className="h-4 w-4" />
//     </Button>
//     {/* <Button
//       variant="ghost"
//       size="icon"
//       asChild
//       disabled={invoice.status === 'Payment Received'}
//     >
//       <Link to={`/sales/payment/new?invoice=${invoice.id}`}>
//         <DollarSign className="h-4 w-4" />
//       </Link>
//     </Button> */}
//   </div>
// </TableCell>