import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { variables } from "@/Variables";
import { RootState } from "@/Storage/Redux/store";
import useFormatDate from "@/hooks/useFormatDate";
import useNumberFormatter from "@/hooks/useNumberFormatter";
import { Check, CircleX, Download, Printer } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

interface SalesInvoiceChildVM {
  salesInvoiceChildID: number;
  salesInvoiceID: number;
  itemID: number;
  itemName: string;
  quantity: number;
  unitPrice: number;
  tax: number;
  totalPrice: number;
  netPrice: number;
  unitId: number;
  unitName: string;
  childTotalQuantity: number;
  conversionFactor: number;
}
interface MultipleAttachmentVM {
  multipleAttachmentfileId: number;
  fileName: string;
  filePath: string;
  referenceno: string;
}
interface SalesInvoiceVM {
  salesInvoiceID: number;
  salesRequisitionID?: number;
  refNo: string;
  invoiceDate?: string;
  customerID?: number;
  customerName?: string;
  customerChildID?: number;
  sellerID?: number;
  sellerName?: string;
  poNumber?: string;
  poDate?: string;
  paymentTerms?: string;
  description?: string;
  totalAmount?: number;
  taxAmount?: number;
  netAmount?: number;
  paidAmount?: number;
  statusId?: number;
  outstandingAmount?: number;
  paymentStatus?: string;
  paymentStatusId?: number;
  warehouseName?: string;
  totalQuantity?: number;
  invoiceStatusId?: number;
  salesInvoiceChildVMs: SalesInvoiceChildVM[];
  multipleAttachments: MultipleAttachmentVM[];
}

const SalesInvoiceDetail = () => {
  const { token, roleid } = useSelector((state: RootState) => state.userAuthStore);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const formatDate = useFormatDate();
  const formatNumber=useNumberFormatter();
  const { hasPermission, loading: permissionsLoading } = usePermissions(roleid);
  const [existingFiles, setExistingFiles] = useState<{ id: string; fileName: string; url: string; reference: string }[]>([]);

  const [invoice, setInvoice] = useState<SalesInvoiceVM | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    fetch(`${variables.API_URL}SalesInvoices/detailsalesinvoice/${id}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.text();
          toast.error("Failed to load invoice: " + err);
          setLoading(false);
          return null;
        }
        return (await res.json()) as SalesInvoiceVM;
      })
      .then((data) => {
        if (data) setInvoice(data);
         const baseUrl = variables.API_URL.replace(/\/api\/?$/, "");
                const files = data.multipleAttachments.map(att => ({
                  id: att.multipleAttachmentfileId.toString(),
                  fileName: att.fileName,
                  url: `${baseUrl.replace(/\/$/, "")}/${att.filePath.replace(/^\//, "")}`,
                  reference: att.referenceno || "",
                }));
                setExistingFiles(files)
      })
      .catch((e) => {
        console.error(e);
        toast.error("Error fetching invoice details.");
      })
      .finally(() => setLoading(false));
  }, [id, token]);
  const getStatusText = (statusId: number): string => {
    switch (statusId) {
      case 1:
        return "Draft";
      case 2:
        return "Pending";
      case 3:
        return "Approved";
      case 4:
        return "Void";
      default:
        return "Unknown";
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


  const handleRevise = (purchaseRequisitionID: number) => {
    navigate(`/sales/invoice/${purchaseRequisitionID}`);
  };

  // Handle “Void” button
  const handleVoid = async (salesInvoiceID: number) => {
    if (!window.confirm("Are you sure you want to void this purchase order?")) {
      return;
    }

    try {
      const res = await fetch(
        `${variables.API_URL}SalesInvoices/changestatus/${salesInvoiceID}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to void order.");
      }

      toast.success("Sales invoice has been voided.");
      // After voiding, go back to list (or you could re-fetch details)
      setTimeout(() => navigate(-1), 1500);
    } catch (err: any) {
      toast.error(err.message);
    }
  };
const handlePrint = (purchaseRequisitionID: number) => {
  const url = `${window.location.origin}/sales/invoice/report/${purchaseRequisitionID}`;
  window.open(url, '_blank');
};
const handleDeliveryChallan = (purchaseRequisitionID: number) => {
  const url = `${window.location.origin}/sales/invoice/deliverychallan/${purchaseRequisitionID}`;
  window.open(url, '_blank');
};
  const handleChangeInvoiceStatus = async (newStatusId: number) => {
    if (!window.confirm("Change invoice status?")) return;
    try {
      const res = await fetch(
        `${variables.API_URL}SalesInvoices/changeinvoicestatus/${invoice!.salesInvoiceID}/${newStatusId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to change status.");
      }
      toast.success("Status updated");
      // re-fetch or update local state:
      setInvoice((inv) => inv && { ...inv, invoiceStatusId: newStatusId });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) return <p>Loading…</p>;
  if (!invoice) return <p>Invoice not found.</p>;

  return (
    <div className="space-y-6">
      <ToastContainer />
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Invoice Details</h1>

      </div>

      <Card className="p-6 space-y-4">
        {/* Header grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2 justify-self-start">
            <Label className="text-lg">{invoice.refNo}</Label>
          </div>
          <div className="space-y-2 justify-self-center text-center">
            <Label className="text-lg">
              {getInvoiceStatusText(invoice.invoiceStatusId)}
            </Label>
          </div>
          <div className="space-y-2 justify-self-end text-right">
            <Label className="text-lg">{getStatusText(invoice.statusId)}</Label>
          </div>
        </div>
        <hr />

        {/* Header Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="block text-sm font-medium text-gray-700">Invoice #</Label>
            <p className="mt-1 text-lg text-gray-900">{invoice.refNo}</p>
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-700">Date</Label>
            <p className="mt-1 text-lg text-gray-900">
              {invoice.invoiceDate ? formatDate(invoice.invoiceDate) : "—"}
            </p>
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-700">Customer </Label>
            <p className="mt-1 text-gray-900">{invoice.customerName ?? "—"}</p>
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-700">Seller </Label>
            <p className="mt-1 text-gray-900">{invoice.sellerName ?? "—"}</p>
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-700">PO Number</Label>
            <p className="mt-1 text-gray-900">{invoice.poNumber || "—"}</p>
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-700">Warehouse</Label>
            <p className="mt-1 text-gray-900">{invoice.warehouseName || "—"}</p>
          </div>


          <div>
            <Label className="block text-sm font-medium text-gray-700">Payment Status</Label>
            <p className="mt-1 text-gray-900">{getPaymentStatusText(invoice.paymentStatusId)}</p>
          </div>
        </div>

        {/* Child Lines */}
        <div>
          <h2 className="text-xl font-semibold mb-2">Items</h2>
          <Table className="min-w-full bg-white rounded-lg shadow">
            <TableHeader className="bg-gray-100">
              <TableRow>
                {[
                  "No.",
                  "Item ",
                  "Unit",
                  "Qty",
                  "Conversion Factor",
                  "Total Qty",
                  "Unit Price",
                  "Sales Tax/Unit",
                  "Net Amount",
                  "Total Net Price",
                ].map((h) => (
                  <TableHead
                    key={h}
                    className="px-3 py-2 text-left text-sm font-medium text-gray-700"
                  >
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.salesInvoiceChildVMs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="px-3 py-4 text-center text-gray-500">
                    No line items
                  </TableCell>
                </TableRow>
              ) : (
                invoice.salesInvoiceChildVMs.map((c, idx) => (
                  <TableRow
                    key={c.salesInvoiceChildID}
                    className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    <TableCell className="px-3 py-2 text-sm text-gray-800">{idx + 1}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-gray-800">{c.itemName}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-gray-800">{c.unitName}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-gray-800">{c.quantity}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-gray-800">{c.conversionFactor}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-gray-800">{c.childTotalQuantity}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-gray-800">
                      PKR {c.unitPrice?.toFixed(2)}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-sm text-gray-800">
                      PKR {formatNumber(c.tax?.toFixed(2))}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-sm text-gray-800">
                      PKR {formatNumber(c.netPrice?.toFixed(2))}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-sm text-gray-800">
                      PKR {formatNumber(c.totalPrice?.toFixed(2))}
                    </TableCell>

                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-end">
        <div className="inline-block max-w-xs border-2 border-dashed border-gray-300 p-4 rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Total W/O GST Amount (PKR):</span>
                <span className="font-medium text-gray-800">{formatNumber(invoice.totalAmount.toFixed(2))}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600"> GST Amount (PKR):</span>
                <span className="font-medium text-gray-800">{formatNumber(invoice.taxAmount.toFixed(2))}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-gray-900">Total Amount (PKR):</span>
                <span className="font-semibold text-gray-900">
                  {formatNumber(invoice.netAmount.toFixed(2))}
                </span>
              </div>
            </div>
        </div>
           <Label>Attachments</Label>
        {/* {existingFiles.length > 0 && <h2 className="text-lg font-semibold mb-2">Attachments</h2>} */}
        {existingFiles.map(f => (
          <div key={f.id} className="flex items-center gap-2 mb-2">
            <span>{f.fileName}</span>
            <Button variant="ghost" size="icon" onClick={() => {
                const link = document.createElement('a');
                link.href = f.url;
                link.download = f.fileName;
                link.click();
            }}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <div className="flex items-center justify-between mt-4">
          <div className="flex gap-4">
            <Button
              onClick={() => handleRevise(invoice.salesInvoiceID)}
              style={{
                display:
                  invoice.statusId === 3 && hasPermission(25, "revise")
                    ? "flex"
                    : "none",
              }}
            >
              <Check />
              REVISE
            </Button>
            <Button
              onClick={() => handleVoid(invoice.salesInvoiceID)}
              style={{
                display: (invoice.statusId === 3 && hasPermission(25, "revise")) ? "flex" : "none",

            }}
            >
              <CircleX />
              VOID
            </Button>
            <Button
              onClick={() => handlePrint(invoice.salesInvoiceID)}
              style={{
                display: (invoice.statusId === 3 && hasPermission(25, "print")) ? "flex" : "none",

            }}
            >
              <Printer />
              PRINT
            </Button>
            <Button
              onClick={() => handleDeliveryChallan(invoice.salesInvoiceID)}
              style={{
                display: (invoice.statusId === 3 && invoice.invoiceStatusId === 2 && hasPermission(25, "print")) ? "flex" : "none",

            }}
            >
              <Printer />
              Delivery Challan 
            </Button>
            {invoice.statusId === 3 && invoice.invoiceStatusId !== 5 && (
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center" >
                Fulfilment Status <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
             
              <DropdownMenuItem onClick={() => handleChangeInvoiceStatus(2)} disabled={invoice.invoiceStatusId !== 1}>
                Delivery Challan Issued
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleChangeInvoiceStatus(3) } disabled={invoice.invoiceStatusId !== 2}>
                Out For Delivery
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleChangeInvoiceStatus(4)} disabled={invoice.invoiceStatusId !==3}>
                Delivered
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleChangeInvoiceStatus(5)} disabled={invoice.invoiceStatusId !==4}>
                GRN Issued
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>)}
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Back
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SalesInvoiceDetail;
