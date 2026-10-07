import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { variables } from "@/Variables";
import { RootState } from "@/Storage/Redux/store";
import useFormatDate from "@/hooks/useFormatDate";
import useNumberFormatter from "@/hooks/useNumberFormatter";
import { Check, CircleX, Download } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

// Child VM
interface StockAdjustmentChildVM {
  stockAdjustmentChildID: number;
  stockAdjustmentID: number;
  itemID: number;
  itemName: string;
  quantity: number;
}
interface MultipleAttachmentVM {
  multipleAttachmentfileId: number;
  fileName: string;
  filePath: string;
  referenceno: string;
}
// Detail VM
interface StockAdjustmentDetailVM {
  stockAdjustmentID: number;
  refNo: string;
  date?: string;
  adjustmentTypeID?: number;
  name?: string;        // Adjustment type name
  description?: string;
  totalQuantity?: number;
  statusId?: number;
  wareHouseId?: number;
  warehouseName?: string;
  stockAdjustmentChildVMs: StockAdjustmentChildVM[];
  multipleAttachments: MultipleAttachmentVM[];
}

const StockAdjustmentDetail: React.FC = () => {
  const { token, roleid } = useSelector((state: RootState) => state.userAuthStore);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const formatDate = useFormatDate();
  const formatNumber = useNumberFormatter();
  const { hasPermission, loading: permsLoading } = usePermissions(roleid);
  const [existingFiles, setExistingFiles] = useState<{ id: string; fileName: string; url: string; reference: string; }[]>([]);

  const [detail, setDetail] = useState<StockAdjustmentDetailVM | null>(null);
  const [loading, setLoading] = useState(true);
 const [errorDetails, setErrorDetails] = useState<{
  message: string;
  itemName: string;
  warehouseName: string;
  availableQuantity: number;
} | null>(null);
const [showErrorModal, setShowErrorModal] = useState(false);
  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    fetch(`${variables.API_URL}StockAdjustment/detail/${id}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.text();
          toast.error("Failed to load record: " + err);
          setLoading(false);
          return null;
        }
        return (await res.json()) as StockAdjustmentDetailVM;
      })
      .then((data) => {
        if (data){ setDetail(data)
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
        };
      })
      .catch((e) => {
        console.error(e);
        toast.error("Error fetching details.");
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
  const handleRevise = (stockAdjustmentID: number) => {
    navigate(`/inventory/stockadjustments/${stockAdjustmentID}`);
};

   const handleVoid = async (purchaseInvoiceID: number) => {
  if (!window.confirm("Are you sure you want to void this purchase order?")) return;

  try {
    const res = await fetch(
      `${variables.API_URL}StockAdjustment/changestatus/${purchaseInvoiceID}`,
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

    toast.success("Stock Adjustment has been voided.");
    setTimeout(() => navigate(-1), 2000);
  } catch (err: any) {
    toast.error(err.message);
  }
};
  if (loading) return <p>Loading…</p>;
  if (!detail) return <p>Record not found.</p>;

  return (
    <div className="space-y-6">
      <ToastContainer />
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Stock Adjustment Details</h1>
      </div>
      <Card className="p-6 space-y-4">
        {/* Header grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 justify-self-start">
            <Label className="text-lg">{detail.refNo}</Label>
          </div>
          {/* <div className="space-y-2 justify-self-center text-center">
            <Label className="text-lg">{detail.name}</Label>
          </div> */}
          <div className="space-y-2 justify-self-end text-right">
            <Label className="text-lg">{getStatusText(detail.statusId || 0)}</Label>
          </div>
        </div>
        <hr />

        {/* Info grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="block text-sm font-medium text-gray-700">Ref No</Label>
            <p className="mt-1 text-lg text-gray-900">{detail.refNo}</p>
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-700">Date</Label>
            <p className="mt-1 text-lg text-gray-900">
              {detail.date ? formatDate(detail.date) : "—"}
            </p>
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-700">Adjustment Type</Label>
            <p className="mt-1 text-gray-900">{detail.name || "—"}</p>
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-700">Warehouse</Label>
            <p className="mt-1 text-gray-900">{detail.warehouseName || "—"}</p>
          </div>
          <div className="md:col-span-2">
            <Label className="block text-sm font-medium text-gray-700">Description</Label>
            <p className="mt-1 text-gray-900">{detail.description || "—"}</p>
          </div>
        </div>

        {/* Child table */}
        <div>
          <h2 className="text-xl font-semibold mb-2">Items</h2>
          <Table className="min-w-full bg-white rounded-lg shadow">
            <TableHeader className="bg-gray-100">
              <TableRow>
                {["No.", "Item", "Quantity"].map((h) => (
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
              {detail.stockAdjustmentChildVMs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="px-3 py-4 text-center text-gray-500">
                    No items found
                  </TableCell>
                </TableRow>
              ) : (
                detail.stockAdjustmentChildVMs.map((c, idx) => (
                  <TableRow key={c.stockAdjustmentChildID} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <TableCell className="px-3 py-2 text-sm text-gray-800">{idx + 1}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-gray-800">{c.itemName}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-gray-800">{formatNumber(c.quantity.toString())}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="inline-block max-w-xs border-2 border-dashed border-gray-300 p-4 rounded-lg">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Total Quantity:</span>
              <span className="font-semibold text-gray-900">{formatNumber(detail.totalQuantity?.toString() || "0")}</span>
            </div>
          </div>
        </div>

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
        {/* Actions */}
        <hr />
                <div className="flex items-center justify-between mt-4">
                    <div className="flex gap-4">
                        <Button onClick={() => handleRevise(detail.stockAdjustmentID)}
                            style={{
                                display: (detail.statusId === 3 && hasPermission(33, "revise")) ? "flex" : "none",

                            }}>
                            <Check />
                            REVISE
                        </Button>
                        <Button
                            onClick={() => handleVoid(detail.stockAdjustmentID)}
                            style={{
                                display: (detail.statusId === 3 && hasPermission(33, "void")) ? "flex" : "none",

                            }}
                        >
                            <CircleX />
                            VOID
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

export default StockAdjustmentDetail;
