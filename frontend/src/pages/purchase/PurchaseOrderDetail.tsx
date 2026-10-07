// src/pages/purchase/PurchaseOrderDetail.tsx

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
import { Check, CircleX, Download, Printer } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import useAuthValidation from "@/hooks/useAuthValidation";

// ------------------------------------------------------------------------
// Interfaces matching your ASP.NET Core ViewModels.

interface PurchaseOrderChildDetailVM {
  purchaseRequisitionOrderChildID: number;
  purchaseRequisitionOrderID?: number;
  itemID?: number;
  itemName?: number;
  unitName?: string;
  quantity?: number;
  conversionFactor?: number;
  childTotalQuantity?: number;
  childTotalPrice?: number;
  unitPrice?: number;
}
interface MultipleAttachmentVM {
  multipleAttachmentfileId: number;
  fileName: string;
  filePath: string;
  referenceno: string;
}
interface PurchaseOrderDetailVM {
  purchaseRequisitionOrderID: number;
  refNo: string;
  date: string;
  vendorName?: string;
  paymentTerms: string;
  description: string;
  totalAmount?: number;
  totalQuantity?: number;
  statusId: number;
  purchaseRequisitionOrderChildVMs: PurchaseOrderChildDetailVM[];
    multipleAttachments: MultipleAttachmentVM[];
}

// ------------------------------------------------------------------------
// Helper to get human‑readable status.

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
// PurchaseOrderDetail component.

const PurchaseOrderDetail: React.FC = () => {
  useAuthValidation();

  const { token, roleid } = useSelector((state: RootState) => state.userAuthStore);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const formatDate = useFormatDate();
  const { hasPermission } = usePermissions(roleid);

  const [order, setOrder] = useState<PurchaseOrderDetailVM | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [existingFiles, setExistingFiles] = useState<{ id: string; fileName: string; url: string; reference: string }[]>([]);

  // Fetch order details
  useEffect(() => {
    if (!id) return;

    const fetchOrderDetail = async () => {
      try {
        const res = await fetch(
          `${variables.API_URL}PurchaseRequisitionOrder/detailPurchaseOrderBy/${id}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!res.ok) {
          toast.error("Failed to fetch purchase order details.");
          setLoading(false);
          return;
        }
        const data: PurchaseOrderDetailVM = await res.json();
        setOrder(data);
          const baseUrl = variables.API_URL.replace(/\/api\/?$/, "");
                                const files = data.multipleAttachments.map(att => ({
                                  id: att.multipleAttachmentfileId.toString(),
                                  fileName: att.fileName,
                                  url: `${baseUrl.replace(/\/$/, "")}/${att.filePath.replace(/^\//, "")}`,
                                  reference: att.referenceno || "",
                                }));
                                setExistingFiles(files);
      } catch (error) {
        console.error("Error fetching purchase order details:", error);
        toast.error("Error fetching purchase order details.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetail();
  }, [id, token]);

  // Handle “Revise” button
  const handleRevise = (purchaseRequisitionID: number) => {
    navigate(`/purchase/order/${purchaseRequisitionID}`);
  };

  // Handle “Void” button
  const handleVoid = async (purchaseRequisitionID: number) => {
    if (!window.confirm("Are you sure you want to void this purchase order?")) {
      return;
    }

    try {
      const res = await fetch(
        `${variables.API_URL}PurchaseRequisitionOrder/changestatus/${purchaseRequisitionID}`,
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

      toast.success("Purchase order has been voided.");
      // After voiding, go back to list (or you could re-fetch details)
      setTimeout(() => navigate(-1), 1500);
    } catch (err: any) {
      toast.error(err.message);
    }
  };
   const handlePrint = (purchaseRequisitionID: number) => {
  const url = `${window.location.origin}/purchase/order/report/${purchaseRequisitionID}`;
  window.open(url, '_blank');
};

  if (loading) return <p>Loading...</p>;
  if (!order) return <p>Purchase order not found.</p>;

  return (
    <div className="space-y-6">
      <ToastContainer />
      <div>
        <h1 className="text-2xl font-semibold">Purchase Order Detail</h1>
        <p className="text-gray-600 mt-1">View details of the purchase order.</p>
      </div>

      <Card className="p-6 space-y-4">
        {/* Header grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-lg">{order.refNo}</Label>
          </div>
          <div className="space-y-2 text-right">
            <Label className="text-lg">{getStatusText(order.statusId)}</Label>
          </div>
        </div>

        <hr />

        {/* Parent Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="block text-sm font-medium">Order Number:</Label>
            <p className="text-md">{order.refNo}</p>
          </div>
          <div>
            <Label className="block text-sm font-medium">Date:</Label>
            <p className="text-md">{formatDate(order.date)}</p>
          </div>
          <div>
            <Label className="block text-sm font-medium">Vendor Name:</Label>
            <p className="text-md">{order.vendorName}</p>
          </div>
          {/* <div>
            <Label className="block text-sm font-medium">Payment Terms:</Label>
            <p className="text-md">{order.paymentTerms}</p>
          </div> */}
          <div>
            <Label className="block text-sm font-medium">Total Amount:</Label>
            <p className="text-md">{order.totalAmount?.toLocaleString() || "0"}</p>
          </div>
          <div>
            <Label className="block text-sm font-medium">Total Quantity:</Label>
            <p className="text-md">{order.totalQuantity || "0"}</p>
          </div>
          <div>
            <Label className="block text-sm font-medium">Description:</Label>
            <p className="text-md">{order.description}</p>
          </div>
        </div>

        {/* Child Items Table */}
        <div>
          <h2 className="text-xl font-semibold mb-2">Items</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>S No.</TableHead>
                <TableHead>Item Name</TableHead>
               
                <TableHead>Unit</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Conversion Factor</TableHead>
                <TableHead> Total Quantity</TableHead>
                <TableHead> Unit Price</TableHead>
                <TableHead> Total Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.purchaseRequisitionOrderChildVMs.map((child,index) => (
                <TableRow key={child.purchaseRequisitionOrderChildID}>
                  <TableCell>{index+1}</TableCell>
                  <TableCell>{child.itemName}</TableCell>
                  
                  <TableCell>{child.unitName}</TableCell>
                  <TableCell>{child.quantity}</TableCell>
                  <TableCell>{child.conversionFactor}</TableCell>
                  <TableCell>{child.childTotalQuantity}</TableCell>
                  <TableCell>{child.unitPrice}</TableCell>
                  <TableCell>{child.childTotalPrice}</TableCell>
                </TableRow>
              ))}
              {order.purchaseRequisitionOrderChildVMs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    No items found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <hr />
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
        {/* Actions */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex gap-4">
            <Button
              onClick={() => handleRevise(order.purchaseRequisitionOrderID)}
              style={{
                display:
                  order.statusId === 3 && hasPermission(28, "revise")
                    ? "flex"
                    : "none",
              }}
            >
              <Check />
              REVISE
            </Button>
            <Button
              onClick={() => handleVoid(order.purchaseRequisitionOrderID)}
              style={{
                display: (order.statusId === 3 && hasPermission(28, "void")) ? "flex" : "none",

            }}
            >
              <CircleX />
              VOID
            </Button>
            <Button
              onClick={() => handlePrint(order.purchaseRequisitionOrderID)}
              style={{
                display: (order.statusId=== 3 && hasPermission(29, "print")) ? "flex" : "none",

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
    </div>
  );
};

export default PurchaseOrderDetail;
