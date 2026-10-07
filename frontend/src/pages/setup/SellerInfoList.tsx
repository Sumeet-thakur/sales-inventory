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
import { useEffect, useState } from "react";
import { RootState } from "@/Storage/Redux/store";
import { useSelector } from "react-redux";
import sellerModel from "@/Interfaces/sellerModel";
import { usePermissions } from "@/hooks/usePermissions";
import { variables } from "@/Variables";
import { useTableControls } from "@/hooks/useTableControls";
import { SearchControl, PaginationControl } from "@/hooks/TableControls";
import { SortableHeader } from "@/hooks/SortableHeader";

interface sellerTable {

  Index: number;
  sellerId: number;
  sellerName: string;
  cityID: number;
  contactNo: string;
  email: string;
  address: string;

}
const SellerInfoList = () => {
  const { token, role, roleid } = useSelector(
    (state: RootState) => state.userAuthStore
  );

  const [sellers, setSellers] = useState<sellerTable[]>([]);
  const { hasPermission, loading: permissionsLoading } = usePermissions(roleid);
  const navigate = useNavigate();


  const fetchSellers = async () => {
    try {
      const response = await fetch(variables.API_URL + "Seller",{
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
            sellerId: item.sellerId ?? item.sellerId,
            sellerName: item.sellerName ?? item.sellerName,
            cityID: item.cityID || "",
            contactNo: item.contactNo || "",
            email: item.email ?? item.email,
            address: item.address ?? item.address,


          }));
          setSellers(formattedData);
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
    fetchSellers();

  }, []);

  const handleEdit = (warehouseId: number) => {
    navigate(`/setup/seller/${warehouseId}`);
  };
  const handleDetail = (brandId: number) => {
    navigate(`/setup/seller/detail/${brandId}`);
  };


  const handleDelete = async (sellerId: number) => {
      if (window.confirm("Are you sure you want to delete this brand?")) {
        try {
          const response = await fetch(`${variables.API_URL}Seller/${sellerId}`, {
            method: "DELETE",
            headers: {
              "Authorization": `Bearer ${token}`
            },
          });
          if (response.ok) {
            console.log("Brand deleted successfully");
            setSellers((prev) => prev.filter((seller) => seller.sellerId !== sellerId));
          } else {
            console.error("Failed to delete brand");
          }
        } catch (error) {
          console.error("Error deleting brand:", error);
        }
        fetchSellers();
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
  } = useTableControls<sellerTable>(sellers, 10);


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Seller Management</h1>
          <p className="text-gray-600 mt-1">Manage sellers information</p>
        </div>
      </div>

      <Card>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Sellers List</h3>
            <Button
              onClick={() => navigate("/setup/seller/new")}
              className="flex items-center gap-2"
              style={{
                visibility: hasPermission(14, "create") ? "visible" : "hidden",
              }}
            >
              <Plus className="h-4 w-4" /> Add Seller
            </Button>
          </div>
          {/* Search at the top */}
          <SearchControl
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            placeholder="Search Sellers..."
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
                    onClick={() => handleSort("sellerName")}
                    sortDirection={
                      sortConfig?.key === "sellerName"
                        ? sortConfig.direction
                        : null
                    }
                    isActive={sortConfig?.key === "sellerName"}
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
              {paginatedData.map((seller) => (
                <TableRow key={seller.sellerId}>
                  <TableCell>{seller.Index}</TableCell>
                  <TableCell>{seller.sellerName}</TableCell>
                  <TableCell>{seller.email}</TableCell>
                  <TableCell>{seller.contactNo}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon"
                        onClick={() => handleEdit(seller.sellerId)}
                        style={{
                          visibility: hasPermission(14, "update") ? "visible" : "hidden",
                        }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon"
                        style={{
                          visibility: hasPermission(14, "delete") ? "visible" : "hidden",
                        }}
                        onClick={() => handleDelete(seller.sellerId)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDetail(seller.sellerId)}

                        style={{
                          visibility: hasPermission(15, "view") ? "visible" : "hidden",
                        }}
                      >
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

export default SellerInfoList;
