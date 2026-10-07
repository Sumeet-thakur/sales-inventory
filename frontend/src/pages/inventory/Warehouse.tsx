import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "@/Storage/Redux/store";
import warehouseModel from "@/Interfaces/warehouseModel";
import { variables } from "@/Variables";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import useFormatDateTime from "@/hooks/useFormatDateTime";
import ExpandableJsonDisplay from "@/hooks/ExpandableJsonDisplay";
import useActivityLog from "@/hooks/useActivityLog";

const Warehouse = () => {
  const { id } = useParams<{ id: string }>();
  const { token, role, roleid } = useSelector(
    (state: RootState) => state.userAuthStore
  );

  const [warehouse, setWarehouse] = useState<warehouseModel>({
    warehouseID: 0,
    warehouseName: "",
    address: "",
    warehouseContactPerson: "",
    capacity: "",
    contactNo: "",

  }
  );
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
   const formatDateTime = useFormatDateTime();
   const { activityLogs, showActivityLog, toggleActivityLog } = useActivityLog(token);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});


  useEffect(() => {
    if (id) {
      const fetchWarehouse = async () => {
        setLoading(true);
        setError("");
        try {
          const response = await fetch(`${variables.API_URL}WareHouse/${id}`,{
            headers: {
                    
              "Authorization": `Bearer ${token}`
            },
          });
          if (response.ok) {
            const data = await response.json();
            setWarehouse({
              warehouseID: data.warehouseID||"",
              warehouseName: data.warehouseName||"",
              address: data.address||"",
              warehouseContactPerson: data.warehouseContactPerson||"",
              capacity: data.capacity||"",
              contactNo: data.contactNo||"",
            });
            setIsEditing(true);
          } else {
            // throw new Error("Failed to fetch brand details.");
            toast.error("An error occurred while saving the brand. Please try again.");
            setTimeout(() => {
              navigate("/inventory/warehouse");
            }, 2000);
          }
        } catch (error) {
          // console.error("Error fetching brand:", error);
          // setError("Error fetching brand details. Please try again later.");
          toast.error("Error fetching brand details. Please try again later.");
          setTimeout(() => {
            navigate("/inventory/warehouse");
          }, 2000);
        } finally {
          setLoading(false);
        }
      };

      fetchWarehouse();
    } else {
      setLoading(false);
    }
  }, [id]);

  const validateForm = () => {
    let errors: { [key: string]: string } = {};

    if (!warehouse.warehouseName.trim()) {
      errors.warehouseName = "Warehouse Name is required.";
    }
    // if (!warehouse.address.trim()) {
    //   errors.address = "Warehouse Address is required.";
    // }
    // if (!warehouse.warehouseContactPerson.trim()) {
    //   errors.warehouseContactPerson = "Warehouse Contact Person is required.";
    // }
    // if (!warehouse.contactNo.trim()) {
    //   errors.contactNo = "Warehouse Contact Number is required.";
    // }
    // if (!warehouse.capacity.trim()) {
    //   errors.capacity = "Capacity is required.";
    // }
   

    setValidationErrors(errors);

    return Object.keys(errors).length === 0; // Returns true if no errors
  };

  const handleWarehouseChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    setWarehouse((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Remove validation error for the current field
    setValidationErrors((prevErrors) => ({
      ...prevErrors,
      [name]: "",
    }));
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    try {
      const url = id
        ? `${variables.API_URL}WareHouse/${id}`
        : variables.API_URL + "WareHouse";
      const method = id ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(warehouse),
      });
const data = await response.json();
      if (response.ok) {
        toast.success(
          isEditing
            ? "Warehouse updated successfully!"
            : "Warehouse created successfully!",
          {
            position: "bottom-right",
            // position: "top-center",
          }
        );
        setTimeout(() => {
          navigate("/inventory/warehouse");
        }, 2000);
      } if (!response.ok)  {
       
          toast.error(data.message || "Failed to save Warehouse.");
      }
    } catch (error) {
      console.error("Error saving brand:", error);
     
      
    }
  };

  const handleActivityLogToggle = async () => {
    if (id) {
      await toggleActivityLog(id, "WareHouse/activity_log/warehouse");
    }
  };
  

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/inventory/warehouse")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">New Warehouse</h1>
          <p className="text-gray-600 mt-1">Create a new warehouse</p>
        </div>
      </div>

      <Card>
      <div  className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
            <Label htmlFor="warehouseName">Warehouse Name</Label>
              <Input
                id="warehouseName"
                name="warehouseName"
                placeholder="Enter Warehouse name"
                value={warehouse.warehouseName}
                onChange={handleWarehouseChange}
                required
              />
              {validationErrors.warehouseName && (
                <div className="validation-error">{validationErrors.warehouseName}</div>
              )}
            </div>

            <div className="space-y-2">
            <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                name="capacity"
                placeholder="Enter capacity"
                value={warehouse.capacity}
                onChange={handleWarehouseChange}
                required
              />
              {validationErrors.capacity && (
                <div className="validation-error">{validationErrors.capacity}</div>
              )}
            </div>
            <div className="space-y-2">
            <Label htmlFor="warehouseContactPerson">Contact Person</Label>
              <Input
                id="warehouseContactPerson"
                name="warehouseContactPerson"
                placeholder="Enter Contact Person"
                value={warehouse.warehouseContactPerson}
                onChange={handleWarehouseChange}
                required
              />
              {validationErrors.warehouseContactPerson && (
                <div className="validation-error">{validationErrors.warehouseContactPerson}</div>
              )}
            </div>
            <div className="space-y-2">
            <Label htmlFor="contactNo">Contact Number</Label>
              <Input
                id="contactNo"
                name="contactNo"
                placeholder="Enter Contact Number"
                value={warehouse.contactNo}
                onChange={handleWarehouseChange}
                required
              />
              {validationErrors.contactNo && (
                <div className="validation-error">{validationErrors.contactNo}</div>
              )}
          </div>
          </div>
          <div className="space-y-2">
          <Label htmlFor="contactNo">Address</Label>
              <Textarea
                id="address"
                name="address"
                placeholder="Enter Address"
                value={warehouse.address}
                onChange={handleWarehouseChange}
                required
              />
              {validationErrors.address && (
                <div className="validation-error">{validationErrors.address}</div>
              )}
          </div>
          

          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              type="button"
              onClick={() => navigate(-1)}
            >
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

export default Warehouse;
