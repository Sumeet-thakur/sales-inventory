import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Link, useNavigate, useParams } from "react-router-dom";
import { variables } from "@/Variables";
import { useSelector } from "react-redux";
import { RootState } from "@/Storage/Redux/store";
import { Plus, Pencil, Trash2 } from "lucide-react";
import formFilterModel from "@/Interfaces/formFilterModel";
import { ToastContainer, toast } from "react-toastify";
import ExpandableJsonDisplay from "@/hooks/ExpandableJsonDisplay";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import "react-toastify/dist/ReactToastify.css";
import cityModel from "@/Interfaces/cityModel";
import useActivityLog from "@/hooks/useActivityLog";
import useFormatDateTime from "@/hooks/useFormatDateTime";







const City = () => {
    const { token, role } = useSelector(
    (state: RootState) => state.userAuthStore
  );
  const { id } = useParams<{ id: string }>();
  const [city, setCity] = useState<cityModel>({
    cityId: 0,
    cityName: "",
  
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [validationError, setValidationError] = useState("");
  const { activityLogs, showActivityLog, toggleActivityLog } = useActivityLog(token);
  const formatDateTime = useFormatDateTime();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      const fetchCity = async () => {
        setLoading(true);
        setError("");
        try {
          const response = await fetch(`${variables.API_URL}Cities/${id}`,{
            headers: {
                    
              "Authorization": `Bearer ${token}`
            },
          });
          if (response.ok) {
            const data = await response.json();
            setCity({
                cityId: data.cityId,
                cityName: data.cityName || "",
              
            });
            setIsEditing(true);
          } else {
            // throw new Error("Failed to fetch brand details.");
            alert("An error occurred while saving the brand. Please try again.");
      navigate("/setup/city");
          }
        } catch (error) {
          // console.error("Error fetching brand:", error);
          // setError("Error fetching brand details. Please try again later.");
          alert("Error fetching brand details. Please try again later.");
      navigate("/setup/city");
        } finally {
          setLoading(false);
        }
      };

      fetchCity();
    
    } else {
      setLoading(false);
    }
  }, [id]);


 
  const handleCityChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setCity((prev) => ({
      ...prev,
      [name]: value,
    }));
    setValidationError(""); // Clear validation error on user input
  };

  const validateForm = () => {
    if (!city.cityName.trim()) {
      setValidationError("City Name is required.");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    try {
      const url = id
        ? `${variables.API_URL}Cities/${id}`
        : variables.API_URL + "Cities";
      const method = id ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
           "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(city),
      });
 const data = await response.json();
      if (response.ok) {
        toast.success(
          isEditing
            ? "City updated successfully!"
            : "City created successfully!",
          {
            position: "bottom-right",
            // position: "top-center",
          }
        );
        setTimeout(() => {
          navigate("/setup/city");
        }, 2000);
      } else {
        // throw new Error("Failed to save brand.");
           toast.error(data.message || "Failed to submit item.");
        // toast.error("Failed to save city.")
        // setTimeout(() => {
        //   navigate("/setup/city");
        // }, 2000);
      }
    } catch (error) {
      console.error("Error saving brand:", error);
      toast.error("An error occurred while saving the brand. Please try again.");
      // setTimeout(() => {
      //   navigate("/setup/city");
      // }, 2000);
    }
  };
  const handleActivityLogToggle = async () => {
    if (id) {
      await toggleActivityLog(id, "Cities/activity_log/city");
    }
  };
  
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">City</h1>
        <p className="text-gray-600 mt-1">Manage City and their detail(s)</p>
      </div>

      <Card>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="cityName">City Name</Label>
              <Input
                id="cityName"
                name="cityName"
                placeholder="Enter City name"
                value={city.cityName}
                onChange={handleCityChange}
                required
              />
              {validationError && (
                <div className="validation-error">{validationError}</div>
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

export default City;
