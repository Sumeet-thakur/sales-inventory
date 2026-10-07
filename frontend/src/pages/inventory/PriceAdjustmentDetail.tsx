// src/pages/PriceAdjustmentDetail.tsx

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useSelector } from "react-redux";
import { RootState } from "@/Storage/Redux/store";

import { variables } from "@/Variables";
import useFormatDate from "@/hooks/useFormatDate";

// src/Interfaces/priceListModel.ts

 interface PriceListItemModel {
    priceListItemChildId: number;
    priceListId: number;
    itemName: string;
    customerCategoryName: string;
    description: string;
    totalQuantity: number;
    oldNetPrice: number;
    newNetPrice: number;
  }
  
   interface PriceListModel {
    priceListId: number;
    priceRefNumber: string;
    priceDate: string;
    date: string;
    items: PriceListItemModel[];
  }
  

const PriceAdjustmentDetail = () => {
  const { token } = useSelector((state: RootState) => state.userAuthStore);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [priceList, setPriceList] = useState<PriceListModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const formatDate = useFormatDate();

  // Fetch the price list detail from the ASP.NET Core endpoint
  useEffect(() => {
    if (id) {
      fetch(`${variables.API_URL}PriceList/detail/${id}`, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to fetch price list details");
          }
          return response.json();
        })
        .then((data) => {
          setPriceList(data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
          toast.error(err.message);
        });
    }
  }, [id, token]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;
  if (!priceList) return <div>No data found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-4">
       
      </div>
      <Card className="p-4">
      <div className="flex justify-between items-center">
    <div className="flex items-center space-x-2">
      <Label className="text-sm font-medium text-gray-700">ID:</Label>
      <Label className="text-sm text-gray-900">{priceList.priceListId}</Label>
    </div>
    <div className="flex items-center space-x-2">
      <Label className="text-sm font-medium text-gray-700">Created Date:</Label>
      <Label className="text-sm text-gray-900">{formatDate(priceList.date)}</Label>
    </div>
  </div>
        <div className="mb-4">
         
          <div>
            <strong>Price Reference Number:</strong> {priceList.priceRefNumber}
          </div>
          <div>
            <strong>Price Date:</strong> {formatDate(priceList.priceDate)}
          </div>
          
        </div>
        <h3 className="mb-2 text-lg font-semibold">Items</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Name</TableHead>
              <TableHead>Customer Category</TableHead>
              <TableHead>Description</TableHead>
              {/* <TableHead>Total Quantity</TableHead> */}
              <TableHead>Old Net Price</TableHead>
              <TableHead>New Net Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {priceList.items.map((item) => (
              <TableRow key={item.priceListItemChildId}>
                <TableCell>{item.itemName}</TableCell>
                <TableCell>{item.customerCategoryName}</TableCell>
                <TableCell>{item.description}</TableCell>
                {/* <TableCell>{item.totalQuantity}</TableCell> */}
                <TableCell>{item.oldNetPrice}</TableCell>
                <TableCell>{item.newNetPrice}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => navigate(-1)}>
                  Back
                </Button>
                
              </div>
      </Card>
      <ToastContainer />
    </div>
  );
};

export default PriceAdjustmentDetail;
