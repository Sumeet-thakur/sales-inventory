import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useSelector } from "react-redux";
import { RootState } from "@/Storage/Redux/store";
import { variables } from "@/Variables";
import useFormatDate from "@/hooks/useFormatDate";

// --- Interfaces matching your JSON + ASP.NET DTO ---
interface PurchasePriceListItemVM {
  purchasePriceListItemChilId: number;
  purchasePriceId: number;
  itemId: number;
  itemName: string;
  totalQuantity: number;
  oldPurchasePrice: number;
  newPurchasePrice: number;
}

interface PurchasePriceVM {
  purchasePriceId: number;
  purchasePriceRefNumber: string;
  purchasePriceDate: string;
  date: string;
  purchasePriceListItemVMs: PurchasePriceListItemVM[];
}

// --- Component ---
const PurchasePriceDetail: React.FC = () => {
  const { token } = useSelector((s: RootState) => s.userAuthStore);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [price, setPrice] = useState<PurchasePriceVM | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const formatDate = useFormatDate();

  useEffect(() => {
    if (!id) {
      setError("Invalid ID");
      setLoading(false);
      return;
    }

    fetch(`${variables.API_URL}PurchasePrices/DetailById/${id}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch price detail");
        return res.json();
      })
      .then((data: PurchasePriceVM) => {
        setPrice(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
        toast.error(err.message);
      });
  }, [id, token]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!price) return <div>No data found</div>;

  return (
    <div className="space-y-6">
      <Card className="p-4">
        {/* Header: ID + Date */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <Label className="text-sm font-medium">ID:</Label>
            <Label className="text-sm">{price.purchasePriceId}</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Label className="text-sm font-medium">Created Date:</Label>
            <Label className="text-sm">
              {formatDate(new Date(price.date).toLocaleDateString())}
            </Label>
          </div>
        </div>

        {/* Reference & Date */}
        <div className="mb-4">
          <div>
            <strong>Reference No:</strong> {price.purchasePriceRefNumber}
          </div>
          <div>
            <strong>Purchase Date:</strong>{" "}
            {formatDate(new Date(price.purchasePriceDate).toLocaleDateString())}
          </div>
        </div>

        {/* Items Table */}
        <h3 className="mb-2 text-lg font-semibold">Items</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Name</TableHead>
             
              <TableHead>Old Price</TableHead>
              <TableHead>New Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {price.purchasePriceListItemVMs.map((item) => (
              <TableRow key={item.purchasePriceListItemChilId}>
                <TableCell>{item.itemName}</TableCell>
               
                <TableCell>{item.oldPurchasePrice}</TableCell>
                <TableCell>{item.newPurchasePrice}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Back Button */}
        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </Card>

      <ToastContainer />
    </div>
  );
};

export default PurchasePriceDetail;
