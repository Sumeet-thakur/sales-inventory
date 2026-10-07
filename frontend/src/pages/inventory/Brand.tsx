import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useNavigate, useParams } from "react-router-dom";
import { variables } from "@/Variables";
import { useSelector } from "react-redux";
import { RootState } from "@/Storage/Redux/store";
import { Plus } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import "react-toastify/dist/ReactToastify.css";
import useActivityLog from "@/hooks/useActivityLog";
import ExpandableJsonDisplay from "@/hooks/ExpandableJsonDisplay";
import useFormatDateTime from "@/hooks/useFormatDateTime";
import useAuthValidation from "@/hooks/useAuthValidation";



interface BrandType {
  BrandId: number;
  BrandName: string;
  Description: string;
}



const Brand = () => {
  useAuthValidation();
  
  const { token } = useSelector((state: RootState) => state.userAuthStore);
  const { id } = useParams<{ id: string }>();
  const [brand, setBrand] = useState<BrandType>({
    BrandId: 0,
    BrandName: "",
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
      const fetchBrand = async () => {
        setLoading(true);
        setError("");
        try {
          const response = await fetch(`${variables.API_URL}Brand/${id}`,{
            headers: {
                
              "Authorization": `Bearer ${token}`
            },

          });
          if (response.ok) {
            const data = await response.json();
            setBrand({
              BrandId: data.brandId,
              BrandName: data.brandName || "",
              Description: data.description || "",
            });
            setIsEditing(true);
          } else {
            toast.error("An error occurred while fetching the brand details. Please try again.");
            setTimeout(() => {navigate("/users/create"); }, 2000);
          }
        } catch (error) {
          toast.error("Error fetching brand details. Please try again later.");
          setTimeout(() => {navigate("/users/create"); }, 2000);
        } finally {
          setLoading(false);
        }
      };
      fetchBrand();
    } else {
      setLoading(false);
    }
  }, [id, navigate]);

  const { activityLogs, showActivityLog, toggleActivityLog } = useActivityLog(token);

  // Other state and effects...

  const handleActivityLogToggle = async () => {
    if (id) {
      await toggleActivityLog(id, "Brand/activity_log/brand");
    }
  };
  
  const handleBrandChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setBrand((prev) => ({
      ...prev,
      [name]: value,
    }));
    setValidationError("");
  };

  const validateForm = () => {
    if (!brand.BrandName.trim()) {
      setValidationError("Brand Name is required.");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    try {
      const url = id
        ? `${variables.API_URL}Brand/${id}`
        : variables.API_URL + "Brand";
      const method = id ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(brand),
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(
          isEditing
            ? "Brand updated successfully!"
            : "Brand created successfully!",
          {
            position: "bottom-right",
          }
        );
        setTimeout(() => {
          navigate("/inventory/brands");
        }, 2000);
      } else {
          toast.error(data.message || "Failed to submit item.");
        // setTimeout(() => {
        //   navigate("/inventory/brands");
        // }, 2000);
      }
    } catch (error) {
      console.error("Error saving brand:", error);
      toast.error("An error occurred while saving the brand. Please try again.");
      // setTimeout(() => {
      //   navigate("/inventory/brands");
      // }, 2000);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Brands</h1>
        <p className="text-gray-600 mt-1">Manage brands and their detail(s)</p>
      </div>

      <Card>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="brand-name">Brand Name</Label>
              <Input
                id="brand-name"
                name="BrandName"
                placeholder="Enter brand name"
                value={brand.BrandName}
                onChange={handleBrandChange}
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
                value={brand.Description}
                onChange={handleBrandChange}
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

export default Brand;
