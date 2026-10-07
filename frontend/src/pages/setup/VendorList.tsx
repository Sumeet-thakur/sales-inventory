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
import { usePermissions } from "@/hooks/usePermissions";
import { useEffect, useState } from "react";
import vendorListModel from "@/Interfaces/vendorListModel";
import { variables } from "@/Variables";
import { useTableControls } from "@/hooks/useTableControls";
import { SearchControl, PaginationControl } from "@/hooks/TableControls";
import { SortableHeader } from "@/hooks/SortableHeader";


const VendorList = () => {
  const { token, role,roleid } = useSelector(
    (state: RootState) => state.userAuthStore
  );
 
 const [vendors, setVendors] = useState<vendorListModel[]>([]);
 const { hasPermission, loading: permissionsLoading } = usePermissions(roleid); 
 const navigate = useNavigate();


    const fetchVendors = async () => {
        try {
          const response = await fetch(variables.API_URL + "Vendor",{
            headers: { 
              "Authorization": `Bearer ${token}`
            },
          });
          if (response.ok) {
            const data = await response.json();
            console.log(data);
            if (Array.isArray(data)) {
              const formattedData = data.map((item: any) => ({
                Index:item.Index??item.index,
                vendorID:item.vendorID,
                vendorName:item.vendorName,
                email:item.email,
                contactNo:item.contactNo,
              
              
                
              }));
              setVendors(formattedData);
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
      fetchVendors();
        
      }, []);
  
      const handleEdit = (customerId: number) => {
        navigate(`/setup/vendor/${customerId}`);
      };
      const handleDetail = (customerId: number) => {
        navigate(`/setup/vendor/detail/${customerId}`);
      };
      const handleDelete = async (vendorID: number) => {
        if (window.confirm("Are you sure you want to delete this brand?")) {
          try {
            const response = await fetch(`${variables.API_URL}Vendor/${vendorID}`, {
              method: "DELETE",
              headers: {
                "Authorization": `Bearer ${token}`
              },
            });
            if (response.ok) {
              console.log("Brand deleted successfully");
              setVendors((prev) => prev.filter((vendor) => vendor.vendorID!== vendorID));
            } else {
              console.error("Failed to delete brand");
            }
          } catch (error) {
            console.error("Error deleting brand:", error);
          }
          fetchVendors();
        }
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
  } = useTableControls<vendorListModel>(vendors, 10);


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Vendor Management</h1>
          <p className="text-gray-600 mt-1">
            Add and manage vendors, their branches, and contacts
          </p>
        </div>
      </div>

      <Card>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Vendor List</h3>
            <Button
              onClick={() => navigate("/setup/vendor/new")}
              className="flex items-center gap-2"
              style={{
                visibility: hasPermission(18, "create") ? "visible" : "hidden",
              }}
            >
              <Plus className="h-4 w-4" /> Add Vendor
            </Button>
          </div>
             {/* Search at the top */}
             <SearchControl
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            placeholder="Search Vendor..."
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
                    onClick={() => handleSort("vendorName")}
                    sortDirection={
                      sortConfig?.key === "vendorName"
                        ? sortConfig.direction
                        : null
                    }
                    isActive={sortConfig?.key === "vendorName"}
                  >
                   Name
                  </SortableHeader>
                </TableHead>
                <TableHead>
                  <SortableHeader
                    onClick={() => handleSort("email")}
                    sortDirection={
                      sortConfig?.key === "email"
                        ? sortConfig.direction
                        : null
                    }
                    isActive={sortConfig?.key === "email"}
                  >
                    Email
                  </SortableHeader>
                </TableHead>
                <TableHead>
                  <SortableHeader
                    onClick={() => handleSort("contactNo")}
                    sortDirection={
                      sortConfig?.key === "contactNo"
                        ? sortConfig.direction
                        : null
                    }
                    isActive={sortConfig?.key === "contactNo"}
                  >
                   Phone
                  </SortableHeader>
                </TableHead>
              
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((vendor) => (
                <TableRow key={vendor.vendorID}>
                   <TableCell>{vendor.Index}</TableCell>
                  <TableCell>{vendor.vendorName}</TableCell>
                  <TableCell>{vendor.email}</TableCell>
                  <TableCell>{vendor.contactNo}</TableCell>
                
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon"
                      onClick={() =>handleEdit(vendor.vendorID)}
                      style={{
                        visibility: hasPermission(18, "update") ? "visible" : "hidden",
                      }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon"
                        onClick={() => handleDelete(vendor.vendorID)}
                      style={{
                        visibility: hasPermission(18, "delete") ? "visible" : "hidden",
                      }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon"
                      onClick={() =>handleDetail(vendor.vendorID)}
                      style={{
                        visibility: hasPermission(18, "update") ? "visible" : "hidden",
                      }}>
                        <Eye  className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}{ paginatedData.length ==0 && (   <TableRow>
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
    </div>
  );
};

export default VendorList;
