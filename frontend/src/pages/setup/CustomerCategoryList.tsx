import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import customerCategoryModel from "@/Interfaces/customerCategoryModel";
import { usePermissions } from "@/hooks/usePermissions";
import { variables } from "@/Variables";
import { useTableControls } from "@/hooks/useTableControls";
import { SearchControl, PaginationControl } from "@/hooks/TableControls";
import { SortableHeader } from "@/hooks/SortableHeader";


interface customerCategoryTable {
  Index:number;
  customerCategoryId:number;
  customerCategoryName:string;
  description:string;
}

const CustomerCategoryList = () => {

  const { token, role,roleid } = useSelector(
    (state: RootState) => state.userAuthStore
  );
 
 const [customercategories, setcustomerCategories] = useState<customerCategoryTable[]>([]);
 const { hasPermission, loading: permissionsLoading } = usePermissions(roleid); 
  const navigate = useNavigate();


   const fetchCustomerCategories = async () => {
      try {
        const response = await fetch(variables.API_URL + "CustomerCategory",{
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
              customerCategoryId: item.customerCategoryId ?? item.customerCategoryId,
              customerCategoryName: item.customerCategoryName ?? item.customerCategoryName,
              description: item.description || "",
              
            }));
            setcustomerCategories(formattedData);
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
    fetchCustomerCategories();
      
    }, []);

    const handleEdit = (warehouseId: number) => {
      navigate(`/setup/customer-category/${warehouseId}`);
    };
    const handleDetail = (warehouseId: number) => {
      navigate(`/setup/customer-category/detail/${warehouseId}`);
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
      } = useTableControls<customerCategoryTable>(customercategories, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Customer Categories</h1>
        <p className="text-gray-600 mt-1">
          Manage(s) customer categories and their details
        </p>
      </div>

      <Card>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Customer Categories List</h3>
            <Button
              onClick={() => navigate("/setup/customer-category/new")}
              className="flex items-center gap-2"
              style={{
                visibility: hasPermission(13, "create") ? "visible" : "hidden",
              }}
            >
              <Plus className="h-4 w-4" /> Add Customer Category
            </Button>
          </div>
           {/* Search at the top */}
           <SearchControl
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            placeholder="Search Customer Category..."
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
                    onClick={() => handleSort("customerCategoryName")}
                    sortDirection={
                      sortConfig?.key === "customerCategoryName"
                        ? sortConfig.direction
                        : null
                    }
                    isActive={sortConfig?.key === "customerCategoryName"}
                  >
                    Category Name
                  </SortableHeader>
                </TableHead>
                
                <TableHead>
                  <SortableHeader
                    onClick={() => handleSort("description")}
                    sortDirection={
                      sortConfig?.key === "description"
                        ? sortConfig.direction
                        : null
                    }
                    isActive={sortConfig?.key === "description"}
                  >
                   Description
                  </SortableHeader>
                </TableHead>
                
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((category) => (
                <TableRow key={category.customerCategoryId}>
                   <TableCell>{category.Index}</TableCell>
                  <TableCell>{category.customerCategoryName}</TableCell>
                  <TableCell>{category.description}</TableCell>
                  
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon"
                      onClick={() => handleEdit(category.customerCategoryId)}
                      style={{
                        visibility: hasPermission(13, "update") ? "visible" : "hidden",
                      }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon"
                       style={{
                        visibility: hasPermission(13, "delete") ? "visible" : "hidden",
                      }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon"
                       style={{
                        visibility: hasPermission(13, "delete") ? "visible" : "hidden",
                      }}
                      onClick={() => handleDetail(category.customerCategoryId)}>
                     <Eye  className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}{ paginatedData.length ==0 && (   <TableRow>
                                                            <TableCell colSpan={3} className="px-3 py-4 text-center text-gray-500">
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

export default CustomerCategoryList;
