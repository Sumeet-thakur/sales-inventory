import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Eye  } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "@/Storage/Redux/store";
import { useEffect, useState } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import warehouseModel from "@/Interfaces/warehouseModel";
import { variables } from "@/Variables";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTableControls } from "@/hooks/useTableControls";
import { SearchControl, PaginationControl } from "@/hooks/TableControls";
import { SortableHeader } from "@/hooks/SortableHeader";

interface warehouseTable {
  Index: number;
  warehouseID: number;
  warehouseName: string;
  address: string;
  warehouseContactPerson: string;
  capacity: string;
  contactNo: string;
 
}

const WarehouseList = () => {
  const { token, role,roleid } = useSelector(
    (state: RootState) => state.userAuthStore
  );
  const navigate = useNavigate();
 const [warehouses, setWarehouses] = useState<warehouseTable[]>([]);
 const { hasPermission, loading: permissionsLoading } = usePermissions(roleid); 

  const fetchWarehouses = async () => {
     try {
       const response = await fetch(variables.API_URL + "WareHouse",{
        headers: { 
          "Authorization": `Bearer ${token}`
        },
      });
       if (response.ok) {
         const data = await response.json();
         console.log(data);
         if (Array.isArray(data)) {
           const formattedData = data.map((item: any) => ({
            Index: item.Index ?? item.index,
            warehouseID: item.warehouseID ?? item.warehouseID,
            warehouseName: item.warehouseName ?? item.warehouseName,
            address: item.address ?? item.address,
            warehouseContactPerson:"",
            capacity:"",
            contactNo:""
             
           }));
           setWarehouses(formattedData);
           // console.log(formattedData);
         } else {
           throw new Error("Unexpected data structure");
         }
       } else {
         throw new Error("Failed to fetch brands");
       }
     } catch (error) {
       console.log("Error fetching brands:", error);
     } finally {
     }
   };
 useEffect(() => {
  fetchWarehouses();
     
   }, []);

   const handleEdit = (warehouseId: number) => {
    navigate(`/inventory/warehouse/${warehouseId}`);
  };


  const handleDelete = async (WarehouseID: number) => {
    try {
      const response = await fetch(
        `${variables.API_URL}WareHouse/${WarehouseID}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
  
      if (response.ok) {
       
        setWarehouses(prev => prev.filter(warehouse => warehouse.warehouseID !== WarehouseID));
        toast.dark('Module deleted successfully!');
      } else {
        const errorData = await response.json();
        if (response.status === 404) {
          throw new Error('Module not found');
        }
        throw new Error(errorData.message || 'Failed to delete module');
      }
    } catch (error) {
      console.error('Error deleting module:', error);
      toast.error(error.message || 'An error occurred while deleting the module');
    }
    fetchWarehouses();
  };
   const {
       searchTerm,
       setSearchTerm,
       sortConfig,
       handleSort,
       paginatedData,
       currentPage,
       setCurrentPage,
       totalPages,
     } = useTableControls<warehouseTable>(warehouses, 10);
     
     const handleDetail = (brandId: number) => {
      navigate(`/inventory/warehouse/detail/${brandId}`);
    };
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Warehouses</h1>
        <p className="text-gray-600 mt-1">Manage product warehouses</p>
      </div>

      <Card>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Warehouses List</h3>
            <Button
              onClick={() => navigate("/inventory/warehouse/new")}
              className="flex items-center gap-2"
              style={{
                visibility: hasPermission(11, "create") ? "visible" : "hidden",
              }}
            >
              <Plus className="h-4 w-4" /> Add Warehouse
            </Button>
          </div>
{/* Search at the top */}
<SearchControl
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            placeholder="Search Warehouse..."
          />
          {/* Search at the top */}
          <Table>
            <TableHeader>
              <TableRow>
              <TableHead>
                  <SortableHeader
                    onClick={() => handleSort("Index")}
                    sortDirection={
                      sortConfig?.key === "Index"
                        ? sortConfig.direction
                        : null
                    }
                    isActive={sortConfig?.key === "Index"}
                  >
                    S No.
                  </SortableHeader>
                </TableHead>
                <TableHead>
                  <SortableHeader
                    onClick={() => handleSort("warehouseName")}
                    sortDirection={
                      sortConfig?.key === "warehouseName"
                        ? sortConfig.direction
                        : null
                    }
                    isActive={sortConfig?.key === "warehouseName"}
                  >
                   Warehouse Name
                  </SortableHeader>
                </TableHead>
                <TableHead>
                  <SortableHeader
                    onClick={() => handleSort("address")}
                    sortDirection={
                      sortConfig?.key === "address"
                        ? sortConfig.direction
                        : null
                    }
                    isActive={sortConfig?.key === "address"}
                  >
                    Address
                  </SortableHeader>
                </TableHead>
                
                
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((warehouse) => (
                <TableRow key={warehouse.warehouseID}>
                  <TableCell>{warehouse.Index}</TableCell>
                  <TableCell>{warehouse.warehouseName}</TableCell>
                  <TableCell>{warehouse.address}</TableCell>
                  
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon"
                      onClick={() => handleEdit(warehouse.warehouseID)}
                      style={{
                        visibility: hasPermission(11, "update") ? "visible" : "hidden",
                      }}>
                        
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon"
                       onClick={() => handleDelete(warehouse.warehouseID)}
                      style={{
                        visibility: hasPermission(11, "delete") ? "visible" : "hidden",
                      }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon"
                       onClick={() => handleDetail(warehouse.warehouseID)}
                      style={{
                        visibility: hasPermission(11, "view") ? "visible" : "hidden",
                      }}>
                       <Eye  className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              { paginatedData.length ==0 && (   <TableRow>
                                                            <TableCell colSpan={4} className="px-3 py-4 text-center text-gray-500">
                                                              No Data found
                                                            </TableCell>
                                                          </TableRow>)}
            </TableBody>
          </Table>
           {/* Pagination at the bottom */}
           {totalPages > 1 && (
                      <PaginationControl
                        currentPage={currentPage}
                        setCurrentPage={setCurrentPage}
                        totalPages={totalPages}
                      />
                    )}
                    {/* Pagination at the bottom */}
        </div>
      </Card>
      <ToastContainer />
    </div>
  );
};

export default WarehouseList;
