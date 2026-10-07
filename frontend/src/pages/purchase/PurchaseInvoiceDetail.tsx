// src/pages/purchase/PurchaseInvoiceDetail.tsx

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNavigate, useParams } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { variables } from "@/Variables";
import { useSelector } from "react-redux";
import { RootState } from "@/Storage/Redux/store";
import useFormatDate from "@/hooks/useFormatDate";
import useAuthValidation from "@/hooks/useAuthValidation";
import { Check, CircleX, Download, Printer } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import useNumberFormatter from "@/hooks/useNumberFormatter";

// ------------------------------------------------------------------------
// Interfaces matching your ASP.NET Core JSON.

interface PurchaseInvoiceChildVM {
  purchaseInvoiceChildID: number;
  purchaseInvoiceID: number;
  itemID: number;
  itemName: string;
  unitId: number;
  unitName: string;
  isSecondaryUnit: boolean;
  conversionFactor: number;
  quantity: number;
  childTotalQuantity: number;
  netPrice: number;
  totalPrice: number;
}
interface MultipleAttachmentVM {
  multipleAttachmentfileId: number;
  fileName: string;
  filePath: string;
  referenceno: string;
}
interface PurchaseInvoiceDetailVM {
  purchaseInvoiceID: number;
  purchaseReceiveID: number;
  refNo: string;
  invoiceDate: string;
  vendorID: number;
  vendorName: string;
  paymentTerms: string;
  description: string;
  warehouseName: string;
  totalNetAmount: number;
  statusId: number;
  totalQuantity: number;
  purchaseInvoiceChildVMs: PurchaseInvoiceChildVM[];
  multipleAttachments: MultipleAttachmentVM[];
}

// ------------------------------------------------------------------------
// Map status IDs to human-readable text.

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

// ------------------------------------------------------------------------
// PurchaseInvoiceDetail component.

const PurchaseInvoiceDetail: React.FC = () => {
  useAuthValidation();

  const { token, roleid } = useSelector((s: RootState) => s.userAuthStore);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const formatDate = useFormatDate();
  const { hasPermission } = usePermissions(roleid);

  const [invoice, setInvoice] = useState<PurchaseInvoiceDetailVM | null>(null);
  const [loading, setLoading] = useState(true);
  const formatNumber = useNumberFormatter();
  const [existingFiles, setExistingFiles] = useState<{ id: string; fileName: string; url: string; reference: string; }[]>([]);

  const [errorDetails, setErrorDetails] = useState<{
  message: string;
  itemName: string;
  warehouseName: string;
  availableQuantity: number;
} | null>(null);
const [showErrorModal, setShowErrorModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(
          `${variables.API_URL}PurchaseInvoice/detail-get-by/${id}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!res.ok) {
          toast.error("Failed to load invoice details");
          setLoading(false);
          return;
        }
        const data: PurchaseInvoiceDetailVM = await res.json();
        setInvoice(data);
         setExistingFiles(
                          data.multipleAttachments.map(ma => {
                            const baseUrl = variables.API_URL.replace(/\/api\/?$/, ""); // Remove /api if present
                            const mappedImagePath = `${baseUrl.replace(/\/$/, "")}/${ma.filePath}`; // Ensure no trailing slash on base URL
                
                            return {
                              id: ma.multipleAttachmentfileId.toString(),
                              fileName: ma.fileName,
                              url: mappedImagePath, // Corrected path
                              reference: ma.referenceno
                            };
                          })
                        );
        
      } catch (err) {
        console.error(err);
        toast.error("Error fetching invoice details");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, token]);
 const handleComplete = () => {
        if (!invoice) return;
        // navigate to edit or trigger complete
        navigate(`/purchase/invoice/${invoice.purchaseInvoiceID}`);
    };
    const handleVoid = async (purchaseInvoiceID: number) => {
  if (!window.confirm("Are you sure you want to void this purchase order?")) return;

  try {
    const res = await fetch(
      `${variables.API_URL}PurchaseInvoice/changestatusPurchasesInvoice/${purchaseInvoiceID}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!res.ok) {
      // try JSON
      let data;
      try {
        data = await res.json();
      } catch {
        // fallback to text
        const text = await res.text();
        throw new Error(text || "Failed to void order.");
      }
      // set state to show in modal
      setErrorDetails(data);
      setShowErrorModal(true);
      return;
    }

    toast.success("Purchase order has been voided.");
    setTimeout(() => navigate(-1), 2000);
  } catch (err: any) {
    toast.error(err.message);
  }
};
 const handlePrint = (purchaseRequisitionID: number) => {
  const url = `${window.location.origin}/purchase/invoice/report/${purchaseRequisitionID}`;
  window.open(url, '_blank');
};
  if (loading) return <p>Loading...</p>;
  if (!invoice) return <p>Invoice not found.</p>;

  return (
    <div className="space-y-6">
      <ToastContainer />

      <div>
        <h1 className="text-2xl font-semibold">Purchase Invoice Detail</h1>
        <p className="text-gray-600 mt-1">
          View details of invoice #{invoice.refNo}
        </p>
      </div>

      <Card className="p-6 space-y-4">
        {/* Header: RefNo & Status */}
        <div className="flex justify-between items-center">
          <Label className="text-xl">{invoice.refNo}</Label>
          <Label className="text-lg">{getStatusText(invoice.statusId)}</Label>
        </div>

        <hr />

        {/* Invoice Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="block text-sm font-medium">Date:</Label>
            <p className="text-md">{formatDate(invoice.invoiceDate)}</p>
          </div>
          <div>
            <Label className="block text-sm font-medium">Vendor:</Label>
            <p className="text-md">{invoice.vendorName}</p>
          </div>
          {/* <div>
            <Label className="block text-sm font-medium">Terms:</Label>
            <p className="text-md">{invoice.paymentTerms || "—"}</p>
          </div> */}
          <div>
            <Label className="block text-sm font-medium">Description:</Label>
            <p className="text-md">{invoice.description || "—"}</p>
          </div>
          
          <div>
            <Label className="block text-sm font-medium">Warehouse:</Label>
            <p className="text-md">{invoice.warehouseName}</p>
          </div>
        </div>

        {/* Child Items */}
        <div>
          <h2 className="text-lg font-semibold mb-2">Line Items</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>S No.</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Conv. Factor</TableHead>
                <TableHead>Total Qty</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Total Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.purchaseInvoiceChildVMs.map((c, i) => (
                <TableRow key={c.purchaseInvoiceChildID}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>{c.itemName}</TableCell>
                  <TableCell>{c.unitName}</TableCell>
                  <TableCell>{c.quantity}</TableCell>
                  <TableCell>{c.conversionFactor}</TableCell>
                  <TableCell>{c.childTotalQuantity}</TableCell>
                  <TableCell>{c.netPrice}</TableCell>
                  <TableCell>{c.totalPrice}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <hr />
        <div className="mt-4 flex justify-end">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-lg font-semibold">
            Total Qty: {invoice.totalQuantity.toLocaleString()}
            </p>
            <p className="text-lg font-semibold">
            Total Net: {formatNumber(invoice.totalNetAmount.toFixed(2))}
            </p>
          </div>
        </div>

                    <hr />
 {existingFiles.length > 0 && <h2 className="text-lg font-semibold mb-2">Attachments</h2>}
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
                                   onClick={handleComplete}
                                   style={{
                                       display:
                                       invoice.statusId === 3 && hasPermission(30, "revise")
                                               ? "flex"
                                               : "none",
                                   }}
                               >
                                   <Check />
                                   REVISE
                               </Button>
                               <Button
                                   onClick={() => handleVoid(invoice.purchaseInvoiceID)}
                                   style={{
                                       display: (invoice.statusId === 3 && hasPermission(30, "void")) ? "flex" : "none",
       
                                   }}
                               >
                                   <CircleX />
                                   VOID
                               </Button>
                               <Button
              onClick={() => handlePrint(invoice.purchaseInvoiceID)}
              style={{
                display: (invoice.statusId=== 3 && hasPermission(23, "print")) ? "flex" : "none",

            }}
            >
              <Printer />
              PRINT
            </Button>
                           </div>
                           <div className="flex gap-4">
                               <Button variant="outline" onClick={() => navigate(-1)}>
                                   Back
                               </Button>
                           </div>
                       </div>
      </Card>
    {showErrorModal && errorDetails && (
  <div
    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
  >
    <div className="bg-white p-6 rounded-lg w-100 shadow-lg">
      <h2 className="text-lg font-semibold mb-4">{errorDetails.message}</h2>
      <table className="w-full text-left border">
        <thead>
          <tr>
            <th className="px-2 py-1 border">Item</th>
            <th className="px-2 py-1 border">Warehouse</th>
            <th className="px-2 py-1 border">Available Qty</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="px-2 py-1 border">{errorDetails.itemName}</td>
            <td className="px-2 py-1 border">{errorDetails.warehouseName}</td>
            <td className="px-2 py-1 border">{errorDetails.availableQuantity}</td>
          </tr>
        </tbody>
      </table>
      <div className="mt-4 text-right">
        <Button onClick={() => setShowErrorModal(false)}>Close</Button>
      </div>
    </div>
  </div>
)}
    </div>
    
    
  );
};

export default PurchaseInvoiceDetail;
