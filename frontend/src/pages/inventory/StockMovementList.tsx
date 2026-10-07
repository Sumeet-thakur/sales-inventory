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

interface StockMovement {
  index: number;
  stockMovementID: number;
  refNo: string;
  date: string;           // ISO-8601 date string
  to_Warehouse: string;
  from_Warehouse: string;
  statusId: number;
  status: string;
}

const StockMovementList: React.FC = () => {
  const navigate = useNavigate();
  const formatDate = useFormatDate();
  const { token, roleid } = useSelector((s: RootState) => s.userAuthStore);
  const [Movement, setMovement] = useState<StockMovement[]>([]);
  const { hasPermission, loading: permissionsLoading } = usePermissions(roleid);

  // fetch list from ASP.NET endpoint
  const fetchStockMovement = async () => {
    try {
      const res = await fetch(
        `${variables.API_URL}StockMovements/get-all-stockmovement`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Failed to load stock Movement");
      const data = await res.json();
      console.log(data);
      if (Array.isArray(data)) {
        const formattedData = data.map((item: any) => ({
            index: item.Index ?? item.index,
          stockMovementID: item.stockMovementID,
          refNo: item.refNo,
          date: formatDate(item.date),
          to_Warehouse: item.to_Warehouse,
          from_Warehouse: item.from_Warehouse,
          statusId: item.statusId,
          status: item.status,
        }));
        setMovement(formattedData);
    }
    } catch (err) {
      console.error("Error fetching stock Movement:", err);
    }
  };

  useEffect(() => {
    fetchStockMovement();
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
  } = useTableControls<StockMovement>(Movement, 10);

  const handleEdit = (id: number) => {
    navigate(`/inventory/stockmovement/${id}`);
  };
  const handleDetail = (id: number) => {
    navigate(`/inventory/stockmovement/detail/${id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Stock Movement</h1>
          <p className="text-gray-600 mt-1">Manage your inventory Movement</p>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Stock Movement List</h3>
          <Button
            onClick={() => navigate("/inventory/stockmovement/new")}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add Stock Movement
          </Button>
        </div>

        <SearchControl
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          placeholder="Search Stock Movement..."
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
                  onClick={() => handleSort("from_Warehouse")}
                  sortDirection={sortConfig?.key === "from_Warehouse" ? sortConfig.direction : null}
                  isActive={sortConfig?.key === "from_Warehouse"}
                >
                 From Warehouse
                </SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader
                  onClick={() => handleSort("to_Warehouse")}
                  sortDirection={sortConfig?.key === "to_Warehouse" ? sortConfig.direction : null}
                  isActive={sortConfig?.key === "to_Warehouse"}
                >
                  To Warehouse
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
              <TableRow key={adj.stockMovementID}>
                <TableCell>{adj.index}</TableCell>
                <TableCell>{adj.refNo}</TableCell>
                <TableCell>{formatDate(adj.date)}</TableCell>
                <TableCell>{adj.from_Warehouse}</TableCell>
                <TableCell>{adj.to_Warehouse}</TableCell>
                
                <TableCell>{adj.status}</TableCell>
                <TableCell className="text- right">
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        style={{
                                            display: (adj.statusId !== 3 && hasPermission(33, "update")) ? "flex" : "none",
                                          }}
                                        onClick={() => handleEdit(adj.stockMovementID)}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                     
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDetail(adj.stockMovementID)}
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

export default StockMovementList;
