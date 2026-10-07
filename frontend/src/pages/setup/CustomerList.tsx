import { useEffect, useState } from "react";
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
import { RootState } from "@/Storage/Redux/store";
import { useSelector } from "react-redux";
import { usePermissions } from "@/hooks/usePermissions";
import customerListModel from "@/Interfaces/customerListModel";
import { variables } from "@/Variables";
import { useTableControls } from "@/hooks/useTableControls";
import { SearchControl, PaginationControl } from "@/hooks/TableControls";
import { SortableHeader } from "@/hooks/SortableHeader";




const CustomerList = () => {
  const { token, role,roleid } = useSelector(
    (state: RootState) => state.userAuthStore
  );
 
 const [customers, setCustomers] = useState<customerListModel[]>([]);
 const { hasPermission, loading: permissionsLoading } = usePermissions(roleid); 
 const navigate = useNavigate();


   const fetchCustomers = async () => {
      try {
        const response = await fetch(variables.API_URL + "Customer",{
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
              customerId:item.customerId,
              customerName:item.customerName,
              email:item.email,
              contactNo:item.contactNo,
              customerCategoryName:item.customerCategoryName,
            
              
            }));
            setCustomers(formattedData);
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
   fetchCustomers();
      
    }, []);

    const handleEdit = (customerId: number) => {
      navigate(`/setup/customer/${customerId}`);
    };
    const handleDetail = (customerId: number) => {
      navigate(`/setup/customer/detail/${customerId}`);
    };

    const handleDelete = async (customerId: number) => {
        if (window.confirm("Are you sure you want to delete this brand?")) {
          try {
            const response = await fetch(`${variables.API_URL}Customer/${customerId}`, {
              method: "DELETE",
              headers: {
                "Authorization": `Bearer ${token}`
              },
            });
            if (response.ok) {
              console.log("Brand deleted successfully");
              setCustomers((prev) => prev.filter((customer) => customer.customerId!== customerId));
            } else {
              console.error("Failed to delete brand");
            }
          } catch (error) {
            console.error("Error deleting brand:", error);
          }
          fetchCustomers();
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
   } = useTableControls<customerListModel>(customers, 10);


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Customer Management</h1>
          <p className="text-gray-600 mt-1">
            Add and manage customers, their branches, and contacts
          </p>
        </div>
      </div>

      <Card>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Customer List</h3>
            <Button
              onClick={() => navigate("/setup/customer/new")}
              className="flex items-center gap-2"
              style={{
                visibility: hasPermission(19, "create") ? "visible" : "hidden",
              }}
            >
              <Plus className="h-4 w-4" /> Add Customer
            </Button>
          </div>
          {/* Search at the top */}
          <SearchControl
                      searchTerm={searchTerm}
                      setSearchTerm={setSearchTerm}
                      placeholder="Search Customer..."
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
                    onClick={() => handleSort("customerName")}
                    sortDirection={
                      sortConfig?.key === "customerName"
                        ? sortConfig.direction
                        : null
                    }
                    isActive={sortConfig?.key === "customerName"}
                  >
                    Customer Name
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
                    Contact
                  </SortableHeader>
                </TableHead>
                <TableHead>
                  <SortableHeader
                    onClick={() => handleSort("customerCategoryName")}
                    sortDirection={
                      sortConfig?.key === "customerCategoryName"
                        ? sortConfig.direction
                        : null
                    }
                    isActive={sortConfig?.key === "customerCategoryName"}
                  >
                    Category
                  </SortableHeader>
                </TableHead>
                
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((customer) => (
                <TableRow key={customer.customerId}>
                   <TableCell>{customer.Index}</TableCell>
                  <TableCell>{customer.customerName}</TableCell>
                  <TableCell>{customer.email}</TableCell>
                  <TableCell>{customer.contactNo}</TableCell>
                  <TableCell>{customer.customerCategoryName}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon"
                        onClick={() => handleEdit(customer.customerId)}
                        style={{
                          visibility: hasPermission(19, "update") ? "visible" : "hidden",
                        }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon"
                       style={{
                        visibility: hasPermission(19, "delete") ? "visible" : "hidden",
                      }}
                      onClick={() => handleDelete(customer.customerId)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon"
                        onClick={() => handleDetail(customer.customerId)}
                        style={{
                          visibility: hasPermission(19, "update") ? "visible" : "hidden",
                        }}>
                        <Eye  className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}{ paginatedData.length ==0 && (   <TableRow>
                                                            <TableCell colSpan={5} className="px-3 py-4 text-center text-gray-500">
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

export default CustomerList;
