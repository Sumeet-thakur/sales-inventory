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
interface warehouseDetailModel {
    warehouseID: number;
    warehouseName: string;
    address: string;
    warehouseContactPerson: string;
    capacity: string;
    contactNo: string;
    date:string;
   
  }
const WarehouseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { token, role, roleid } = useSelector(
    (state: RootState) => state.userAuthStore
  );

  const [warehouse, setWarehouse] = useState<warehouseDetailModel>({
    warehouseID: 0,
    warehouseName: "",
    address: "",
    warehouseContactPerson: "",
    capacity: "",
    contactNo: "",
    date: "",

  }
  );
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const month = date.toLocaleString("en-US", { month: "short" });
    const day = date.getDate();
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };


  useEffect(() => {
    if (id) {
      const fetchWarehouse = async () => {
        setLoading(true);
      
        try {
          const response = await fetch(`${variables.API_URL}WareHouse/detail/${id}`,{
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
              date: formatDate(data.createdOn),
              
            });
    
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

  

  

  return (
    <div className="space-y-6">
         <div>
        <h1 className="text-2xl font-semibold">Brands</h1>
        <p className="text-gray-600 mt-1">View Brand Detail</p>
      </div>

      <Card className="p-6">
  <div className="flex justify-between items-center">
    <div className="flex items-center space-x-2">
      <Label className="text-sm font-medium text-gray-700">ID:</Label>
      <Label className="text-sm text-gray-900">{warehouse.warehouseID}</Label>
    </div>
    <div className="flex items-center space-x-2">
      <Label className="text-sm font-medium text-gray-700">Created Date:</Label>
      <Label className="text-sm text-gray-900">{warehouse.date}</Label>
    </div>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <div className="flex items-center space-x-2">
      <Label className="block text-sm font-medium text-gray-700">Warehouse Name:</Label>
      <div className="mt-1 text-lg font-semibold text-gray-900">
        {warehouse.warehouseName}
      </div>
    </div>
    <div className="flex items-center space-x-2">
      <Label className="block text-sm font-medium text-gray-700">Capacity:</Label>
      <div className="mt-1 text-lg font-semibold text-gray-900">
        {warehouse.capacity}
      </div>
    </div>
    <div className="flex items-center space-x-2">
      <Label className="block text-sm font-medium text-gray-700">Contact Person:</Label>
      <div className="mt-1 text-lg font-semibold text-gray-900">
        {warehouse.warehouseContactPerson}
      </div>
    </div>
    <div className="flex items-center space-x-2">
      <Label className="block text-sm font-medium text-gray-700">Contact Number:</Label>
      <div className="mt-1 text-lg text-gray-900">
        {warehouse.contactNo}
      </div>
    </div>
    <div className="flex items-center space-x-2">
      <Label className="block text-sm font-medium text-gray-700">Address:</Label>
      <div className="mt-1 text-lg text-gray-900">
        {warehouse.address}
      </div>
    </div>
    <div className="flex justify-end gap-2">
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

export default WarehouseDetail;
