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
import { useNavigate, useParams } from "react-router-dom";
import { variables } from "@/Variables";
import { useEffect, useState } from "react";
import cityModel from "@/Interfaces/cityModel";
import { RootState } from "@/Storage/Redux/store";
import { useSelector } from "react-redux";
import { usePermissions } from "@/hooks/usePermissions";
import sellerModel from "@/Interfaces/sellerModel";
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

const SellerInfo = () => {
  const { id } = useParams<{ id: string }>();
  const { token, role,roleid } = useSelector(
    (state: RootState) => state.userAuthStore
  );
  
  const [cities, setCities] = useState<cityModel[]>([]);
  const navigate = useNavigate();
  const [selectedCity, setSelectedCity] = useState("");
  const formatDateTime = useFormatDateTime();
  
 
  const [seller, setSeller] = useState<sellerModel>({
    sellerId: 0,
    sellerName: "",
    cityID: 0,
    contactNo: "",
    email: "",
    address: "",

  });
 
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
   const { hasPermission, loading: permissionsLoading } = usePermissions(roleid); 
   const { activityLogs, showActivityLog, toggleActivityLog } = useActivityLog(token);

   useEffect(() => {
    if (id) {
      const fetchSeller = async () => {
        setLoading(true);
        setError("");
        try {
          const response = await fetch(`${variables.API_URL}Seller/${id}`,{
            headers: {
                    
              "Authorization": `Bearer ${token}`
            },
          });
          if (response.ok) {
            const data = await response.json();
            setSeller({
              sellerId: data.sellerId||"",
              sellerName: data.sellerName||"",
              cityID: data.cityID||"",
              contactNo: data.contactNo||"",
              email: data.email||"",
              address: data.address||"",
            
            });
            setSelectedCity(data.cityID ? data.cityID.toString() : "");
            setIsEditing(true);
          } else {
            // throw new Error("Failed to fetch brand details.");
            alert("An error occurred while saving the brand. Please try again.");
            navigate("/setup/customer-category");
          }
        } catch (error) {
          // console.error("Error fetching brand:", error);
          // setError("Error fetching brand details. Please try again later.");
          alert("Error fetching brand details. Please try again later.");
          navigate("/setup/customer-category");
        } finally {
          setLoading(false);
        }
      };

      fetchSeller();
    } else {
      setLoading(false);
    }
  }, [id]);



   const fetchCities = async () => {
      try {
        const response = await fetch(variables.API_URL + "Seller/get-cities", {
          headers: { "Content-Type": "application/json","Authorization": `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            const formattedData = data.map((item: any) => ({
              cityId: item.cityId ?? item.cityId,
              cityName: item.cityName ?? item.cityName,
            }));
            setCities(formattedData);
          } else {
            throw new Error("Unexpected data structure");
          }
        } else {
          throw new Error("Failed to fetch Users");
        }
      } catch (error) {
        console.log("Error fetching Users:", error);
      }
    };


    useEffect(() => {
      fetchCities();
        
      }, []);

     const validateForm = () => {
  let errors: { [key: string]: string } = {};

  if (!seller.sellerName.trim()) {
    errors.sellerName = "Seller Name is required.";
  }
  // if (!seller.address.trim()) {
  //   errors.address = "Seller Address is required.";
  // }
  // if (!seller.contactNo.trim()) {
  //   errors.contactNo = "Warehouse Contact Person is required.";
  // }
  // if (!seller.email.trim()) {
  //   errors.email = "Seller Email Address is required.";
  // } 
   if (seller.email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(seller.email)) {
      errors.email = "Invalid email format.";
    }
  }
  // if (!selectedCity) {
  //   errors.cityId = "Please select a City first!";
  // }

  setValidationErrors(errors);
  return Object.keys(errors).length === 0; // Returns true if no errors
};

    
      const handleSellerChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      ) => {
        const { name, value } = e.target;
    
        setSeller((prev) => ({
          ...prev,
          [name]: value,
        }));
    
        // Remove validation error for the current field
        setValidationErrors((prevErrors) => ({
          ...prevErrors,
          [name]: "",
        }));
      };
      const handleSelectChange = (value: string) => {
        setSelectedCity(value);
        setSeller((prevSeller) => ({
          ...prevSeller,
          cityID: Number(value),
        }));
        // Clear the city validation error if any
        setValidationErrors((prevErrors) => ({
          ...prevErrors,
          cityId: "",
        }));
      };

      const handleSubmit = async () => {
       
          if (!validateForm()) return;
          try {
            const url = id
              ? `${variables.API_URL}Seller/${id}`
              : variables.API_URL + "Seller";
            const method = id ? "PUT" : "POST";
      
            const response = await fetch(url, {
              method,
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify(seller),
            });
      const data = await response.json();
            if (response.ok) {
              toast.success(
                isEditing
                  ? "Seller updated successfully!"
                  : "Seller created successfully!",
                {
                  position: "bottom-right",
                  // position: "top-center",
                }
              );
              setTimeout(() => {
                navigate("/setup/seller");
              }, 2000);
            } else {
                toast.error(data.message || "Failed to save seller.");
              // setTimeout(() => {
              //   navigate("/setup/seller");
              // }, 2000);
            }
          } catch (error) {
            console.error("Error saving seller:", error);
            toast.error("Failed to save seller.")
              // setTimeout(() => {
              //   navigate("/setup/seller");
              // }, 2000);
            
          }
        };

        const handleActivityLogToggle = async () => {
          if (id) {
            await toggleActivityLog(id, "Seller/activity_log/seller");
          }
        };
      
    
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Seller Information</h1>
        <p className="text-gray-600 mt-1">Manage sellers information</p>
      </div>

      <Card>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
            <Label htmlFor="sellerName">Seller Name</Label>
              <Input
                id="sellerName"
                name="sellerName"
                placeholder="Enter Seller Name"
                value={seller.sellerName}
                onChange={handleSellerChange}
                required
              />
              {validationErrors.sellerName && (
                <div className="validation-error">{validationErrors.sellerName}</div>
              )}
            </div>
            <div className="space-y-2">
            <Label htmlFor="city">City</Label>
              <Select value={selectedCity} onValueChange={handleSelectChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select City" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city.cityId} value={city.cityId.toString()}>
                      {city.cityName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.cityId && (
                <div className="validation-error">{validationErrors.cityId}</div>
              )}
            </div>
            <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                placeholder="Enter Seller Email"
                value={seller.email}
                onChange={handleSellerChange}
                required
                type="Email"
              />
              {validationErrors.email && (
                <div className="validation-error">{validationErrors.email}</div>
              )}
            </div>
            <div className="space-y-2">
            <Label htmlFor="email">Phone</Label>
              <Input
                id="contactNo"
                name="contactNo"
                placeholder="Enter Seller Phone Number"
                value={seller.contactNo}
                onChange={handleSellerChange}
                required
              />
              {validationErrors.contactNo && (
                <div className="validation-error">{validationErrors.contactNo}</div>
              )}
            </div>
            <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                name="address"
                placeholder="Enter Seller Address"
                value={seller.address}
                onChange={handleSellerChange}
                required
              />
              {validationErrors.address && (
                <div className="validation-error">{validationErrors.address}</div>
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

export default SellerInfo;
