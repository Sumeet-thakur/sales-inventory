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
import { priceListModel } from "@/Interfaces/priceListModel";
import { variables } from "@/Variables";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTableControls } from "@/hooks/useTableControls";
import { SearchControl, PaginationControl } from "@/hooks/TableControls";
import { SortableHeader } from "@/hooks/SortableHeader";
import useFormatDate from "@/hooks/useFormatDate";

interface priceListTable {

  Index: number;
  priceListId: number;
  priceRefNumber: string;
  priceDate: string;
  ItemCount: number;

}
const PriceAdjustmentList = () => {
  const { token, role, roleid } = useSelector(
    (state: RootState) => state.userAuthStore
  );
  const navigate = useNavigate();
  const [priceLists, setPriceLists] = useState<priceListTable[]>([]);
  const { hasPermission, loading: permissionsLoading } = usePermissions(roleid);

  const fetchPriceLists = async () => {
    try {
      const response = await fetch(variables.API_URL + `PriceList`,{
        headers: { 
          "Authorization": `Bearer ${token}`
        },
      });
      if (response.ok) {
        const data = await response.json();
        console.log(data);
        if (Array.isArray(data)) {
          const formattedData = data.map((item: any) => ({
            Index: item.Index?? item.index,
            priceListId: item.priceListId,
            priceRefNumber: item.priceRefNumber,
            priceDate: formatDate(item.priceDate),
            ItemCount: item.ItemCount ?? item.itemCount,
          }));
          setPriceLists(formattedData);
        } else {
          throw new Error("Unexpected data structure");
        }
      } else {
        throw new Error("Failed to fetch brands");
      }
    } catch (error) {
      console.log("Error fetching brands:", error);
    }
  };

  useEffect(() => {
    fetchPriceLists();
  }, []);

  const formatDate = useFormatDate();

  const handleEdit = (priceListId: number) => {
    navigate(`/inventory/pricelist/${priceListId}`);
  };

  const handleDetail = (priceListId: number) => {
    navigate(`/inventory/pricelist/detail/${priceListId}`);
  };

  const handleDelete = async (priceListId: number) => {
    try {
      const response = await fetch(
        `${variables.API_URL}PriceList/${priceListId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setPriceLists((prev) =>
          prev.filter((priceList) => priceList.priceListId !== priceListId)
        );
        toast.dark("Module deleted successfully!");
      } else {
        const errorData = await response.json();
        if (response.status === 404) {
          throw new Error("Module not found");
        }
        throw new Error(errorData.message || "Failed to delete module");
      }
    } catch (error: any) {
      console.error("Error deleting module:", error);
      toast.error(error.message || "An error occurred while deleting the module");
    }
    fetchPriceLists();
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
   } = useTableControls<priceListTable>(priceLists, 10);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Price Lists</h1>
        <p className="text-gray-600 mt-1">Manage Price Lists</p>
      </div>

      <Card>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Price Lists List</h3>
            <Button
              onClick={() => navigate("/inventory/pricelist/new")}
              className="flex items-center gap-2"
              style={{
                visibility: hasPermission(16, "create") ? "visible" : "hidden",
              }}
            >
              <Plus className="h-4 w-4" /> Add Price List
            </Button>
          </div>
{/* Search at the top */}
<SearchControl
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            placeholder="Search PriceList..."
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
                </TableHead><TableHead>
                  <SortableHeader
                    onClick={() => handleSort("priceRefNumber")}
                    sortDirection={
                      sortConfig?.key === "priceRefNumber"
                        ? sortConfig.direction
                        : null
                    }
                    isActive={sortConfig?.key === "priceRefNumber"}
                  >
                   Price List RefNo
                  </SortableHeader>
                </TableHead><TableHead>
                  <SortableHeader
                    onClick={() => handleSort("priceDate")}
                    sortDirection={
                      sortConfig?.key === "priceDate"
                        ? sortConfig.direction
                        : null
                    }
                    isActive={sortConfig?.key === "priceDate"}
                  >
                    Date
                  </SortableHeader>
                </TableHead>
               
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((pricelist) => (
                <TableRow key={pricelist.priceListId}>
                  <TableCell>{pricelist.Index}</TableCell>
                  <TableCell>{pricelist.priceRefNumber}</TableCell>
                  <TableCell>{pricelist.priceDate}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        style={{
                          visibility: hasPermission(16, "update")
                            ? "visible"
                            : "hidden",
                        }}
                        onClick={() => handleEdit(pricelist.priceListId)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(pricelist.priceListId)}
                        style={{
                          visibility: hasPermission(16, "delete")
                            ? "visible"
                            : "hidden",
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDetail(pricelist.priceListId)}
                        style={{
                          visibility: hasPermission(16, "view")
                            ? "visible"
                            : "hidden",
                        }}
                      >
                        <Eye  className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              { paginatedData.length ==0 && (   <TableRow>
                                              <TableCell colSpan={4} className="px-3 py-4 text-center text-gray-500">
                                                No data found
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

export default PriceAdjustmentList;
