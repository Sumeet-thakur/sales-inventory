import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useNavigate, useParams } from "react-router-dom";
import { variables } from "@/Variables";
import { useSelector } from "react-redux";
import { RootState } from "@/Storage/Redux/store";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface AdjustmentTypeDetail {
  AdjustmentTypeID: number;
  Name: string;
  Description: string;
  InventoryEffect: number;
}

const AdjustmentTypeDetail = () => {
  const { token } = useSelector((state: RootState) => state.userAuthStore);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<AdjustmentTypeDetail>({
    AdjustmentTypeID: 0,
    Name: "",
    Description: "",
    InventoryEffect: 1,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `${variables.API_URL}AdjustmentType/detail-by-id/${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.ok) {
          const data = await response.json();
          setDetail({
            AdjustmentTypeID: data.adjustmentTypeID,
            Name: data.name || "",
            Description: data.description || "",
            InventoryEffect: data.inventoryEffect,
          });
        } else {
          toast.error("Unable to load details. Redirecting...");
          setTimeout(() => navigate(-1), 2000);
        }
      } catch (err) {
        toast.error("Network error. Please try again later.");
        setTimeout(() => navigate(-1), 2000);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id, token, navigate]);

  const getType = (effectLabel: number): string => {
    switch (effectLabel) {
      case 0:
        return "Positive";
      case 1:
        return "Negative";
     
    }
  };

  if (loading) return <div>Loading...</div>;

  const effectLabel = detail.InventoryEffect === 1 ? "Add" : detail.InventoryEffect === 0 ? "Subtract" : detail.InventoryEffect.toString();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Adjustment Type Detail</h1>
        <p className="text-gray-600 mt-1">View details of the adjustment type</p>
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-1 gap-4">
          <div className="flex items-center space-x-2">
            <Label className="text-sm font-medium">ID:</Label>
            <Label className="text-sm">{detail.AdjustmentTypeID}</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Label className="text-sm font-medium">Name:</Label>
            <Label className="text-sm">{detail.Name}</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Label className="text-sm font-medium">Description:</Label>
            <Label className="text-sm">{detail.Description}</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Label className="text-sm font-medium">Inventory Effect:</Label>
            <Label className="text-sm">{effectLabel}</Label>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Back
            </Button>
          </div>
        </div>
      </Card>

      <ToastContainer />
    </div>
  );
};

export default AdjustmentTypeDetail;
