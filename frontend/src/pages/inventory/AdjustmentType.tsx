import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNavigate, useParams } from "react-router-dom";
import { variables } from "@/Variables";
import { useSelector } from "react-redux";
import { RootState } from "@/Storage/Redux/store";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import useActivityLog from "@/hooks/useActivityLog";
import ExpandableJsonDisplay from "@/hooks/ExpandableJsonDisplay";
import useFormatDateTime from "@/hooks/useFormatDateTime";
import useAuthValidation from "@/hooks/useAuthValidation";

interface AdjustmentTypeVM {
  AdjustmentTypeID: number;
  Name: string;
  Description: string;
  InventoryEffect: number;
}

const AdjustmentType = () => {
  useAuthValidation();
  const { token } = useSelector((state: RootState) => state.userAuthStore);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const formatDateTime = useFormatDateTime();

  const [adjustmentType, setAdjustmentType] = useState<AdjustmentTypeVM>({
    AdjustmentTypeID: 0,
    Name: "",
    Description: "",
    InventoryEffect: 1,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [validationError, setValidationError] = useState("");

  const { activityLogs, showActivityLog, toggleActivityLog } = useActivityLog(token);

  useEffect(() => {
    if (id) {
      const fetchAdjustment = async () => {
        setLoading(true);
        setError("");
        try {
          const response = await fetch(`${variables.API_URL}AdjustmentType/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.ok) {
            const data = await response.json();
            setAdjustmentType({
              AdjustmentTypeID: data.adjustmentTypeID,
              Name: data.name || "",
              Description: data.description || "",
              InventoryEffect: data.inventoryEffect ?? 1,
            });
            setIsEditing(true);
          } else {
            toast.error("Error fetching adjustment type details. Redirecting...");
            setTimeout(() => navigate("/inventory/adjustmenttype"), 2000);
          }
        } catch {
          toast.error("Network error. Please try again later.");
          setTimeout(() => navigate("/inventory/adjustmenttype"), 2000);
        } finally {
          setLoading(false);
        }
      };
      fetchAdjustment();
    } else {
      setLoading(false);
    }
  }, [id, navigate, token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setValidationError("");
    setAdjustmentType(prev => ({
      ...prev,
      [name]: name === "InventoryEffect" ? parseInt(value, 10) : value,
    } as AdjustmentTypeVM));
  };

  const validateForm = () => {
    if (!adjustmentType.Name.trim()) {
      setValidationError("Name is required.");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    try {
      const url = id
        ? `${variables.API_URL}AdjustmentType/${id}`
        : `${variables.API_URL}AdjustmentType`;
      const method = id ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(adjustmentType),
      });
 const data = await response.json();
      if (response.ok) {
        toast.success(
          isEditing
            ? "Adjustment type updated successfully!"
            : "Adjustment type created successfully!",
          { position: "bottom-right" }
        );
        setTimeout(() => navigate("/inventory/adjustmenttype"), 2000);
      } else {
           toast.error(data.message || "Failed to save adjustment type.");
       
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred. Please try again.");
    }
  };

  const handleActivityLogToggle = async () => {
    if (id) await toggleActivityLog(id, "AdjustmentType/activity_log/adjustmenttype");
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Adjustment Types</h1>
        <p className="text-gray-600 mt-1">Manage adjustment types and their detail(s)</p>
      </div>

      <Card>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="Name"
                placeholder="Enter name"
                value={adjustmentType.Name}
                onChange={handleChange}
                required
              />
              {validationError && <div className="validation-error">{validationError}</div>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="Description"
                placeholder="Enter description"
                value={adjustmentType.Description}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label>Inventory </Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <Input
                    type="radio"
                    name="InventoryEffect"
                    value="1"
                    checked={adjustmentType.InventoryEffect === 1}
                    onChange={handleChange}
                  />
                  Add
                </label>
                <label className="flex items-center gap-2">
                  <Input
                    type="radio"
                    name="InventoryEffect"
                    value="0"
                    checked={adjustmentType.InventoryEffect === 0}
                    onChange={handleChange}
                  />
                  Subtract
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {isEditing ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </Card>

      {isEditing && (
        <Card>
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Activity Log</h3>
              <Button onClick={handleActivityLogToggle}>
                {showActivityLog ? "Hide Activity Log" : "Show Activity Log"}
              </Button>
            </div>
            {showActivityLog && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>S No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>User Name</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Old Data</TableHead>
                    <TableHead>New Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activityLogs.map((log, index) => (
                    <TableRow key={log.activityLogId}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{formatDateTime(log.date)}</TableCell>
                      <TableCell>{log.userName}</TableCell>
                      <TableCell>{log.actionType}</TableCell>
                      <TableCell>
                        <ExpandableJsonDisplay jsonData={log.oldData} />
                      </TableCell>
                      <TableCell>
                        <ExpandableJsonDisplay jsonData={log.newData} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </Card>
      )}

      <ToastContainer />
    </div>
  );
};

export default AdjustmentType;
