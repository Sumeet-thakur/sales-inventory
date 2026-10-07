import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Eye  } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "@/Storage/Redux/store";
import { usePermissions } from "@/hooks/usePermissions";
import { variables } from "@/Variables";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTableControls } from "@/hooks/useTableControls";
import { SearchControl, PaginationControl } from "@/hooks/TableControls";
import { SortableHeader } from "@/hooks/SortableHeader";
import useFormatDate from "@/hooks/useFormatDate";

interface PurchasePrice {
  Index: number;
  purchasePriceId: number;
  purchasePriceRefNumber: string;
  purchasePriceDate: string;
  itemCount: number;
}

const PurchasePriceList: React.FC = () => {
  const { token, roleid } = useSelector((state: RootState) => state.userAuthStore);
  const navigate = useNavigate();
  const [purchasePrices, setPurchasePrices] = useState<PurchasePrice[]>([]);
  const { hasPermission } = usePermissions(roleid);
  const formatDate = useFormatDate();

  const fetchPurchasePrices = async () => {
    try {
      const response = await fetch(`${variables.API_URL}PurchasePrices`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch purchase prices");
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error("Unexpected data structure");
      const formatted = data.map((item: any, idx: number) => ({
        Index: item.index ?? idx + 1,
        purchasePriceId: item.purchasePriceId,
        purchasePriceRefNumber: item.purchasePriceRefNumber,
        purchasePriceDate: formatDate(item.purchasePriceDate),
        itemCount: item.itemCount,
      }));
      setPurchasePrices(formatted);
    } catch (err: any) {
      console.error("Error fetching purchase prices:", err);
      toast.error(err.message);
    }
  };

  useEffect(() => {
    fetchPurchasePrices();
  }, []);

  const handleAdd = () => navigate("/inventory/purchaseprice/new");
  const handleEdit = (id: number) => navigate(`/inventory/purchaseprice/${id}`);
  const handleDetail = (id: number) => navigate(`/inventory/purchaseprice/detail/${id}`);
  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`${variables.API_URL}PurchasePrices/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Delete failed");
      }
      toast.success("Deleted successfully");
      fetchPurchasePrices();
    } catch (err: any) {
      console.error("Error deleting:", err);
      toast.error(err.message);
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
  } = useTableControls<PurchasePrice>(purchasePrices, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Purchase Price Lists</h1>
        <p className="text-gray-600 mt-1">Manage Purchase Price Lists</p>
      </div>
      <Card>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Purchase Price List</h3>
            <Button
              onClick={handleAdd}
              className="flex items-center gap-2"
              style={{ visibility: hasPermission(16, "create") ? "visible" : "hidden" }}
            >
              <Plus className="h-4 w-4" /> New Price List
            </Button>
          </div>
          <SearchControl
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            placeholder="Search Purchase Prices..."
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortableHeader
                    onClick={() => handleSort("Index")}
                    sortDirection={sortConfig?.key === "Index" ? sortConfig.direction : null}
                    isActive={sortConfig?.key === "Index"}
                  >
                    S No.
                  </SortableHeader>
                </TableHead>
                <TableHead>
                  <SortableHeader
                    onClick={() => handleSort("purchasePriceRefNumber")}
                    sortDirection={sortConfig?.key === "purchasePriceRefNumber" ? sortConfig.direction : null}
                    isActive={sortConfig?.key === "purchasePriceRefNumber"}
                  >
                    Ref No
                  </SortableHeader>
                </TableHead>
                <TableHead>
                  <SortableHeader
                    onClick={() => handleSort("purchasePriceDate")}
                    sortDirection={sortConfig?.key === "purchasePriceDate" ? sortConfig.direction : null}
                    isActive={sortConfig?.key === "purchasePriceDate"}
                  >
                    Date
                  </SortableHeader>
                </TableHead>
                {/* <TableHead>
                  <SortableHeader
                    onClick={() => handleSort("itemCount")}
                    sortDirection={sortConfig?.key === "itemCount" ? sortConfig.direction : null}
                    isActive={sortConfig?.key === "itemCount"}
                  >
                    Items
                  </SortableHeader>
                </TableHead> */}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((pp) => (
                <TableRow key={pp.purchasePriceId}>
                  <TableCell>{pp.Index}</TableCell>
                  <TableCell>{pp.purchasePriceRefNumber}</TableCell>
                  <TableCell>{pp.purchasePriceDate}</TableCell>
                  {/* <TableCell>{pp.itemCount}</TableCell> */}
                  <TableCell className="text- right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        style={{ visibility: hasPermission(16, "update") ? "visible" : "hidden" }}
                        onClick={() => handleEdit(pp.purchasePriceId)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(pp.purchasePriceId)}
                        style={{ visibility: hasPermission(16, "delete") ? "visible" : "hidden" }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDetail(pp.purchasePriceId)}
                        style={{ visibility: hasPermission(16, "view") ? "visible" : "hidden" }}
                      >
                        <Eye  className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
               { paginatedData.length ==0 && (   <TableRow>
                                <TableCell colSpan={4} className="px-3 py-4 text-center text-gray-500">
                                  No items found
                                </TableCell>
                              </TableRow>)}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <PaginationControl
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              totalPages={totalPages}
            />
          )}
        </div>
      </Card>
      <ToastContainer />
    </div>
  );
};

export default PurchasePriceList;
