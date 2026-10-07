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
import { Check, CircleX } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";

/**
 * Child VM coming from API
 */
interface StockMovementChildVM {
  stockMovementChildID: number;
  stockMovementID: number;
  itemID: number;
  itemName: number;
  quantity: number;
  itemStock: number;
}

/**
 * Detail VM coming from API
 */
interface StockMovementDetailVM {
  stockMovementID: number;
  refNo: string;
  date?: string;
  to_WareHouseId?: number;
  to_WareHouseName?: string;
  from_WareHouseId?: number;
  from_WareHouseName?: string;
  description?: string;
  totalQuantity?: number;
  statusId?: number;
  stockMovementChildVMs: StockMovementChildVM[];
}

const StockMovementDetail: React.FC = () => {
  const { token, roleid } = useSelector((state: RootState) => state.userAuthStore);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const formatDate = useFormatDate();
  const formatNumber = useNumberFormatter();
  const { hasPermission, loading: permsLoading } = usePermissions(roleid);

  const [detail, setDetail] = useState<StockMovementDetailVM | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorDetails, setErrorDetails] = useState<{
    message: string;
    itemID: number;
    availableQuantity: number;
  } | null>(null);
  const [showErrorModal, setShowErrorModal] = useState<boolean>(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    fetch(`${variables.API_URL}StockMovements/detail/${id}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          const errText = await res.text();
          toast.error("Failed to load record: " + errText);
          setLoading(false);
          return null;
        }
        return (await res.json()) as StockMovementDetailVM;
      })
      .then((data) => {
        if (data) {
          setDetail(data);
        }
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

  const handleRevise = (stockMovementID: number) => {
    // Navigate to an edit/revise page, e.g. `/inventory/stockmovements/${stockMovementID}/edit`
    navigate(`/inventory/stockmovements/${stockMovementID}`);
  };

  const handleVoid = async (stockMovementID: number) => {
    if (!window.confirm("Are you sure you want to void this stock movement?")) return;

    try {
      const res = await fetch(
        `${variables.API_URL}StockMovements/changestatus/${stockMovementID}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        // Try to parse JSON error response
        let data;
        try {
          data = await res.json();
        } catch {
          const textErr = await res.text();
          throw new Error(textErr || "Failed to void stock movement.");
        }
        setErrorDetails({
          message: data.message || "Could not void record.",
          itemID: data.itemID || 0,
          availableQuantity: data.availableQuantity || 0,
        });
        setShowErrorModal(true);
        return;
      }

      toast.success("Stock Movement has been voided.");
      setTimeout(() => navigate(-1), 1500);
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
        <h1 className="text-2xl font-semibold">Stock Movement Details</h1>
      </div>
      <Card className="p-6 space-y-4">
        {/* Header grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 justify-self-start">
            <Label className="text-lg">{detail.refNo}</Label>
          </div>
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
            <Label className="block text-sm font-medium text-gray-700">From Warehouse</Label>
            <p className="mt-1 text-gray-900">{detail.from_WareHouseName || "—"}</p>
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-700">To Warehouse</Label>
            <p className="mt-1 text-gray-900">{detail.to_WareHouseName || "—"}</p>
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
                {["S No.", "Item Name", "Quantity", "Available Stock"].map((h) => (
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
              {
                detail.stockMovementChildVMs.map((child, idx) => (
                  <TableRow
                    key={child.stockMovementChildID}
                    className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    <TableCell className="px-3 py-2 text-sm text-gray-800">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-sm text-gray-800">
                      {child.itemName}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-sm text-gray-800">
                      {formatNumber(child.quantity.toString())}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-sm text-gray-800">
                      {formatNumber(child.itemStock.toString())}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="inline-block max-w-xs border-2 border-dashed border-gray-300 p-4 rounded-lg">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Total Quantity:</span>
              <span className="font-semibold text-gray-900">
                {formatNumber(detail.totalQuantity?.toString() || "0")}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <hr />
        <div className="flex items-center justify-between mt-4">
          <div className="flex gap-4">
            <Button
              onClick={() => handleRevise(detail.stockMovementID)}
              style={{
                display:
                  detail.statusId === 3 && hasPermission( /* permission ID for revise */  /* e.g. */ 35, "revise")
                    ? "flex"
                    : "none",
              }}
            >
              <Check className="mr-1 h-4 w-4" />
              REVISE
            </Button>
            <Button
              onClick={() => handleVoid(detail.stockMovementID)}
              style={{
                display:
                  detail.statusId === 3 && hasPermission( /* permission ID for void */ /* e.g. */ 35, "void")
                    ? "flex"
                    : "none",
              }}
            >
              <CircleX className="mr-1 h-4 w-4" />
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

      {/* Error Modal */}
      {showErrorModal && errorDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96 shadow-lg">
            <h2 className="text-lg font-semibold mb-4">{errorDetails.message}</h2>
            <table className="w-full text-left border">
              <thead>
                <tr>
                  <th className="px-2 py-1 border">Item ID</th>
                  <th className="px-2 py-1 border">Available Qty</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-2 py-1 border">{errorDetails.itemID}</td>
                  <td className="px-2 py-1 border">
                    {formatNumber(errorDetails.availableQuantity.toString())}
                  </td>
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

export default StockMovementDetail;
