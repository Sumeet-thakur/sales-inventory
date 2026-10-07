import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useNavigate, useParams } from "react-router-dom";
import { RootState } from "@/Storage/Redux/store";
import { useSelector } from "react-redux";
import customerCategoryModel from "@/Interfaces/customerCategoryModel";
import { ArrowLeft } from "lucide-react";
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
import useActivityLog from "@/hooks/useActivityLog";
import ExpandableJsonDisplay from "@/hooks/ExpandableJsonDisplay";
import useFormatDateTime from "@/hooks/useFormatDateTime";

const CustomerCategory = () => {
  const { id } = useParams<{ id: string }>();
  const { token, role, roleid } = useSelector(
    (state: RootState) => state.userAuthStore
  );

  const [customerCategory, setCustomerCategory] = useState<customerCategoryModel>({
    customerCategoryId:0,
    customerCategoryName:"",
    description:"",

  }
  );
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
     const { activityLogs, showActivityLog, toggleActivityLog } = useActivityLog(token);
     const formatDateTime = useFormatDateTime();

  useEffect(() => {
      if (id) {
        const fetchCustomerCategory = async () => {
          setLoading(true);
          setError("");
          try {
            const response = await fetch(`${variables.API_URL}CustomerCategory/${id}`,{
              headers: {
                      
                "Authorization": `Bearer ${token}`
              },
            });
            if (response.ok) {
              const data = await response.json();
              setCustomerCategory({
                customerCategoryId: data.customerCategoryId||"",
                customerCategoryName: data.customerCategoryName||"",
                description: data.description||"",
              
              });
              setIsEditing(true);
            } else {
              // throw new Error("Failed to fetch brand details.");
              toast.error("An error occurred while saving the brand. Please try again.");
              
              setTimeout(() => { navigate("/setup/customer-category");}, 2000);
            }
          } catch (error) {
            // console.error("Error fetching brand:", error);
            // setError("Error fetching brand details. Please try again later.");
            toast.error("An error occurred while saving the brand. Please try again.");
              
              setTimeout(() => { navigate("/setup/customer-category");}, 2000);
          } finally {
            setLoading(false);
          }
        };
  
        fetchCustomerCategory();
      } else {
        setLoading(false);
      }
    }, [id]);

    const validateForm = () => {
      let errors: { [key: string]: string } = {};
  
      if (!customerCategory.customerCategoryName.trim()) {
        errors.warehouseName = "Customer Category Name is required.";
      }
      // if (!customerCategory.description.trim()) {
      //   errors.address = "Description is required.";
      // }
     
     
  
      setValidationErrors(errors);
  
      return Object.keys(errors).length === 0; // Returns true if no errors
    };
  
    const handleCustomerCategoryChange = (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
      const { name, value } = e.target;
  
      setCustomerCategory((prev) => ({
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
            ? `${variables.API_URL}CustomerCategory/${id}`
            : variables.API_URL + "CustomerCategory";
          const method = id ? "PUT" : "POST";
    
          const response = await fetch(url, {
            method,
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(customerCategory),
          });
          const data = await response.json();
          if (response.ok) {
            toast.success(
              isEditing
                ? "Customer Category updated successfully!"
                : "Customer Category created successfully!",
              {
                position: "bottom-right",
                // position: "top-center",
              }
            );
            setTimeout(() => {
              navigate("/setup/customer-category");
            }, 2000);
          } else {
            toast.error(data.message || "Failed to submit item.");
            // setTimeout(() => {
            //   navigate("/setup/customer-category");
            // }, 2000);
          }
        } catch (error) {
          console.error("Error saving brand:", error);
          toast.error("Failed to save Warehouse.")
            
          
        }
      };
      const handleActivityLogToggle = async () => {
        if (id) {
          await toggleActivityLog(id, "CustomerCategory/activity_log/customercategory");
        }
      };

  return (
    <div className="space-y-6">
      
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/setup/customer-category")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Customer Categories</h1>
          <p className="text-gray-600 mt-1">Manage(s) customer categories and their details</p>
        </div>
      </div>

      <Card>
        <div className="p-6 space-y-6">
         

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="customerCategoryName">Customer Category Name</Label>
              <Input
                id="customerCategoryName"
                name="customerCategoryName"
                placeholder="Enter Item Group name"
                value={customerCategory.customerCategoryName}
                onChange={handleCustomerCategoryChange}
                required
              />
              {validationErrors.customerCategoryName && (
                <div className="validation-error">{validationErrors.customerCategoryName}</div>
              )}
            </div>

            <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                placeholder="Enter Description"
                value={customerCategory.description}
                onChange={handleCustomerCategoryChange}
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
            <Button onClick={handleSubmit} > {isEditing ? "Update" : "Create "} </Button>
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

export default CustomerCategory;
