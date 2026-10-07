import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Link, useNavigate, useParams } from "react-router-dom";
import itemGroupModel from "@/Interfaces/itemGroupModel";
import { variables } from "@/Variables";
import { useSelector } from "react-redux";
import { RootState } from "@/Storage/Redux/store";
import { usePermissions } from "@/hooks/usePermissions";
import { ToastContainer, toast } from "react-toastify";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
;
import "react-toastify/dist/ReactToastify.css";
import useActivityLog from "@/hooks/useActivityLog";
import ExpandableJsonDisplay from "@/hooks/ExpandableJsonDisplay";
import useFormatDateTime from "@/hooks/useFormatDateTime";





const ItemGroup = () => {
  const { id } = useParams<{ id: string }>();
  const { token, role,roleid } = useSelector(
    (state: RootState) => state.userAuthStore
  );
  const [itemGroup, setItemGroup] = useState<itemGroupModel>({
    itemGroupId: 0,
    itemGroupName: "",
    description: ""
  });
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { activityLogs, showActivityLog, toggleActivityLog } = useActivityLog(token);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
   const { hasPermission, loading: permissionsLoading } = usePermissions(roleid); 
   const formatDateTime = useFormatDateTime();
  useEffect(() => {
    if (id) {
      const fetchItemGroup = async () => {
        setLoading(true);
        setError("");
        try {
          const response = await fetch(`${variables.API_URL}ItemGroup/${id}`,{
            headers: {
                    
              "Authorization": `Bearer ${token}`
            },
          });
          if (response.ok) {
            const data = await response.json();
            setItemGroup({
              itemGroupId: data.itemGroupId,
              itemGroupName: data.itemGroupName || "",
              description: data.description || "",
            });
            setIsEditing(true);
          } else {
            // throw new Error("Failed to fetch brand details.");
            toast.error("Failed to fetch brand details.");
            setTimeout(() => {
              navigate("/inventory/itemgroups");
            }, 2000);
          }
        } catch (error) {
          // console.error("Error fetching brand:", error);
          // setError("Error fetching brand details. Please try again later.");
          toast.error("Failed to fetch brand details.");
          setTimeout(() => {
            navigate("/inventory/itemgroups");
          }, 2000);
        } finally {
          setLoading(false);
        }
      };

      fetchItemGroup();
    } else {
      setLoading(false);
    }
  }, [id]);

  const validateForm = () => {
    let errors: { [key: string]: string } = {};

    if (!itemGroup.itemGroupName.trim()) {
      errors.itemGroupName = "Group Name is required.";
    }
    // if (!itemGroup.description.trim()) {
    //   errors.description = "Description is required.";
    // }

    setValidationErrors(errors);

    return Object.keys(errors).length === 0; // Returns true if no errors
  };


  const handleItemGroupChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    setItemGroup((prev) => ({
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
        ? `${variables.API_URL}ItemGroup/${id}`
        : variables.API_URL + "ItemGroup";
      const method = id ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(itemGroup),
      });
const data = await response.json();
      if (response.ok) {
        toast.success(
          isEditing
            ? "Item Group updated successfully!"
            : "Item Group created successfully!",
          {
            position: "bottom-right",
          }
        );
        setTimeout(() => {
          navigate("/inventory/itemgroups");
        }, 2000);
      } else {
           toast.error(data.message || "Failed to submit Item Group.");
        // throw new Error("Failed to save brand.");
        // toast.error("Failed to save brand.");
        //     setTimeout(() => {
        //       navigate("/inventory/itemgroups");
        //     }, 2000);
      }
    } catch (error) {
      console.error("Error saving brand:", error);
      toast.error("Failed to save brand.");
      // setTimeout(() => {
      //   navigate("/inventory/itemgroups");
      // }, 2000);
    }
  };

  const handleActivityLogToggle = async () => {
    if (id) {
      await toggleActivityLog(id, "ItemGroup/activity_log/itemgroup");
    }
  };
  
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Item Group</h1>
        <p className="text-gray-600 mt-1">
          Manage item Groups and their details
        </p>
      </div>

      <Card>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="itemGroupName">Item Group Name</Label>
              <Input
                id="itemGroupName"
                name="itemGroupName"
                placeholder="Enter Item Group name"
                value={itemGroup.itemGroupName}
                onChange={handleItemGroupChange}
                required
              />
              {validationErrors.itemGroupName && (
                <div className="validation-error">{validationErrors.itemGroupName}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                placeholder="Enter Description"
                value={itemGroup.description}
                onChange={handleItemGroupChange}
                required
              />
              {validationErrors.description && (
                <div className="validation-error">{validationErrors.description}</div>
              )}
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

export default ItemGroup;
