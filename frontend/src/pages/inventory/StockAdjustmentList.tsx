import React, { useEffect, useState } from "react";
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
import useFormatDate from "@/hooks/useFormatDate";
import { variables } from "@/Variables";
import { useTableControls } from "@/hooks/useTableControls";
import { PaginationControl, SearchControl } from "@/hooks/TableControls";
import { SortableHeader } from "@/hooks/SortableHeader";
import { usePermissions } from "@/hooks/usePermissions";

interface StockAdjustment {
  index: number;
  stockAdjustmentID: number;
  refNo: string;
  date: string;           // ISO-8601 date string
  warehouse: string;
  adjustmentType: string;
  statusId: number;
  status: string;
}

const StockAdjustmentList: React.FC = () => {
  const navigate = useNavigate();
  const formatDate = useFormatDate();
  const { token, roleid } = useSelector((s: RootState) => s.userAuthStore);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const { hasPermission, loading: permissionsLoading } = usePermissions(roleid);

  // fetch list from ASP.NET endpoint
  const fetchAdjustments = async () => {
    try {
      const res = await fetch(
        `${variables.API_URL}StockAdjustment/get-all-stockadjustment`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Failed to load stock adjustments");
      const data = await res.json();
      console.log(data);
      if (Array.isArray(data)) {
        const formattedData = data.map((item: any) => ({
            index: item.Index ?? item.index,
          stockAdjustmentID: item.stockAdjustmentID,
          refNo: item.refNo,
          date: formatDate(item.date),
          warehouse: item.warehouse,
          adjustmentType: item.adjustmentType,
          statusId: item.statusId,
          status: item.status,
        }));
        setAdjustments(formattedData);
    }
    } catch (err) {
      console.error("Error fetching stock adjustments:", err);
    }
  };

  useEffect(() => {
    fetchAdjustments();
  }, [token]);

  // table controls: search, sort, pagination
  const {
    searchTerm,
    setSearchTerm,
    sortConfig,
    handleSort,
    paginatedData,
    currentPage,
    setCurrentPage,
    totalPages,
  } = useTableControls<StockAdjustment>(adjustments, 10);

  const handleEdit = (id: number) => {
    navigate(`/inventory/stockadjustments/${id}`);
  };
  const handleDetail = (id: number) => {
    navigate(`/inventory/stockadjustments/detail/${id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Stock Adjustments</h1>
          <p className="text-gray-600 mt-1">Manage your inventory adjustments</p>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Stock Adjustments List</h3>
          <Button
            onClick={() => navigate("/inventory/stockadjustments/new")}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add Adjustment
          </Button>
        </div>

        <SearchControl
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          placeholder="Search Stock Adjustments..."
        />

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortableHeader
                  onClick={() => handleSort("index")}
                  sortDirection={sortConfig?.key === "index" ? sortConfig.direction : null}
                  isActive={sortConfig?.key === "index"}
                >
                  S No.
                </SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader
                  onClick={() => handleSort("refNo")}
                  sortDirection={sortConfig?.key === "refNo" ? sortConfig.direction : null}
                  isActive={sortConfig?.key === "refNo"}
                >
                  Ref No
                </SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader
                  onClick={() => handleSort("date")}
                  sortDirection={sortConfig?.key === "date" ? sortConfig.direction : null}
                  isActive={sortConfig?.key === "date"}
                >
                  Date
                </SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader
                  onClick={() => handleSort("warehouse")}
                  sortDirection={sortConfig?.key === "warehouse" ? sortConfig.direction : null}
                  isActive={sortConfig?.key === "warehouse"}
                >
                  Warehouse
                </SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader
                  onClick={() => handleSort("adjustmentType")}
                  sortDirection={sortConfig?.key === "adjustmentType" ? sortConfig.direction : null}
                  isActive={sortConfig?.key === "adjustmentType"}
                >
                  Adjustment Type
                </SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader
                  onClick={() => handleSort("statusId")}
                  sortDirection={sortConfig?.key === "statusId" ? sortConfig.direction : null}
                  isActive={sortConfig?.key === "statusId"}
                >
                  Status
                </SortableHeader>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {paginatedData.map((adj) => (
              <TableRow key={adj.stockAdjustmentID}>
                <TableCell>{adj.index}</TableCell>
                <TableCell>{adj.refNo}</TableCell>
                <TableCell>{formatDate(adj.date)}</TableCell>
                <TableCell>{adj.warehouse}</TableCell>
                <TableCell>{adj.adjustmentType}</TableCell>
                <TableCell>{adj.status}</TableCell>
                <TableCell className="text- right">
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        style={{
                                            display: (adj.statusId !== 3 && hasPermission(33, "update")) ? "flex" : "none",
                                          }}
                                        onClick={() => handleEdit(adj.stockAdjustmentID)}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                     
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDetail(adj.stockAdjustmentID)}
                                        style={{ visibility: hasPermission(33, "view") ? "visible" : "hidden" }}
                                      >
                                        <Eye  className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
              </TableRow>
            ))}
            { paginatedData.length ==0 && (   <TableRow>
                                            <TableCell colSpan={7} className="px-3 py-4 text-center text-gray-500">
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
      </Card>
    </div>
  );
};

export default StockAdjustmentList;
