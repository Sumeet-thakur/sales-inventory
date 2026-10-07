import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Link, useNavigate, useParams } from "react-router-dom";
import { variables } from "@/Variables";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useSelector } from "react-redux";
import { RootState } from "@/Storage/Redux/store";
import useActivityLog from "@/hooks/useActivityLog";
import ExpandableJsonDisplay from "@/hooks/ExpandableJsonDisplay";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import useFormatDateTime from "@/hooks/useFormatDateTime";

interface Unit {
  UnitId: number;
  UnitName: string;
  Description: string;
}

const Unit = () => {
  const { token, role, roleid } = useSelector(
    (state: RootState) => state.userAuthStore
  );
  const { activityLogs, showActivityLog, toggleActivityLog } = useActivityLog(token);
  const { id } = useParams<{ id: string }>();
  const [unit, setUnit] = useState<Unit>({
    UnitId: 0,
    UnitName: "",
    Description: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [validationError, setValidationError] = useState("");
  const formatDateTime = useFormatDateTime();

  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      const fetchUnit = async () => {
        setLoading(true);
        setError("");
        try {
          const response = await fetch(`${variables.API_URL}Unit/${id}`, {
            headers: {
              "Authorization": `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const data = await response.json();
            setUnit({
              UnitId: data.unitId,
              UnitName: data.unitName || "",
              Description: data.description || "",
            });
            setIsEditing(true);
          } else {
            toast.error("Failed to fetch unit details.");
            setTimeout(() => {
              navigate("/inventory/units");
            }, 2000);
          }
        } catch (error) {
          console.error("Error fetching unit:", error);
          toast.error("Error fetching unit details. Please try again later.");
          setTimeout(() => {
            navigate("/inventory/units");
          }, 2000);
        } finally {
          setLoading(false);
        }
      };

      fetchUnit();
    } else {
      setLoading(false);
    }
  }, [id]);

  const handleUnitChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setUnit((prev) => ({
      ...prev,
      [name]: value,
    }));
    setValidationError("");
  };

  const validateForm = () => {
    if (!unit.UnitName.trim()) {
      setValidationError("Unit Name is required.");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    try {
      const url = id
        ? `${variables.API_URL}Unit/${id}`
        : variables.API_URL + "Unit";
      const method = id ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(unit),
      });
const data = await response.json();
      if (response.ok) {
        toast.success(
          isEditing
            ? "Unit updated successfully!"
            : "Unit created successfully!"
        );
        setTimeout(() => {
          navigate("/inventory/units");
        }, 2000);
      } else {
          toast.error(data.message || "Failed to submit Item Group.");
        // throw new Error("Failed to save Unit.");
      }
    } catch (error) {
      console.error("Error saving unit:", error);
      toast.error("An error occurred while saving the unit. Please try again.");
      // setTimeout(() => {
      //   navigate("/inventory/units");
      // }, 2000);
    }
  };

  const handleActivityLogToggle = async () => {
    if (id) {
      await toggleActivityLog(id, "Unit/activity_log/unit");
    }
  };

  

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Units</h1>
        <p className="text-gray-600 mt-1">Manage units and their detail(s)</p>
      </div>

      <Card>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="Unit-name">Unit Name</Label>
              <Input
                id="unit-name"
                name="UnitName"
                placeholder="Enter unit name"
                value={unit.UnitName}
                onChange={handleUnitChange}
                required
              />
              {validationError && (
                <div className="validation-error">{validationError}</div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="Description"
                placeholder="Enter description"
                value={unit.Description}
                onChange={handleUnitChange}
              />
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
                    <TableRow key={`${log.activityLogId}-${index}`}>
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

export default Unit;
