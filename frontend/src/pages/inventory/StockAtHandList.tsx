import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSelector } from "react-redux";
import { RootState } from "@/Storage/Redux/store";
import { variables } from "@/Variables";
import { useTableControls } from "@/hooks/useTableControls";
import { PaginationControl } from "@/hooks/TableControls";
import { SortableHeader } from "@/hooks/SortableHeader";
import { usePermissions } from "@/hooks/usePermissions";
import ExpandableTextDisplay from "@/hooks/ExpandableTextDisplay";

interface ItemStock {
  index: number;
  itemID: number;
  itemCode: string;
  brandName: string;
  itemGroupName: string;
  itemName: string;
  quantity: number;
  warehouseName: string;
  gstPercentage: number;
  prices: string;
}

const StockAtHandList: React.FC = () => {
  const { token, roleid } = useSelector((s: RootState) => s.userAuthStore);
  const { hasPermission, loading: permissionsLoading } = usePermissions(roleid);
  const [stocks, setStocks] = useState<ItemStock[]>([]);
  const [warehouseFilter, setWarehouseFilter] = useState<string>("");
  
  const fetchStocks = async () => {
    try {
      const res = await fetch(
        `${variables.API_URL}Item/GetAllItemStockSP`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Failed to load item stocks");
      const data = await res.json();
      if (Array.isArray(data)) setStocks(data);
    } catch (err) {
      console.error("Error fetching item stocks:", err);
    }
  };

  useEffect(() => {
    if (token) fetchStocks();
  }, [token]);

 const stocksByWarehouse = useMemo(
    () =>
      stocks.filter(
        stock => !warehouseFilter || stock.warehouseName === warehouseFilter
      ),
    [stocks, warehouseFilter]
  );

  // 2) now call your table-controls hook *on that*:
  const {
    searchTerm,
    setSearchTerm,
    sortConfig,
    handleSort,
    paginatedData,
    currentPage,
    setCurrentPage,
    totalPages,
  } = useTableControls<ItemStock>(stocksByWarehouse, 10);

  // 3) (optional) if your hook doesn’t already handle searchTerm-based filtering,
  //    you can do it here *after* you have searchTerm in scope:
  const finalData = useMemo(
    () =>
      paginatedData.filter(
        stock =>
          stock.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          stock.itemCode.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [paginatedData, searchTerm]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Item Stock</h1>
        <p className="text-gray-600 mt-1">Overview of current stock levels</p>
      </div>

      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Stocks at Hand</h3>
        </div>

        {/* Filters: search and warehouse selector */}
        <div className="flex items-center space-x-2 mb-4 w-full">
          <input
            type="text"
            className="flex-1 h-10 border border-gray-300 rounded px-3"
            placeholder="Search Item Stocks..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
           <select
        value={warehouseFilter}
        onChange={e => setWarehouseFilter(e.target.value)}
		  className="flex-1 h-10 border border-gray-300 rounded px-3"
      >
        <option value="">All Warehouses</option>
        {Array.from(new Set(stocks.map(s => s.warehouseName))).map(wh => (
          <option key={wh} value={wh}>
            {wh}
          </option>
        ))}
      </select>
        </div>

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
                  onClick={() => handleSort("itemCode")}
                  sortDirection={sortConfig?.key === "itemCode" ? sortConfig.direction : null}
                  isActive={sortConfig?.key === "itemCode"}
                >
                  Item Code
                </SortableHeader>
              </TableHead>
               <TableHead>
                  <SortableHeader
                    onClick={() => handleSort("brandName")}
                    sortDirection={
                      sortConfig?.key === "brandName"
                        ? sortConfig.direction
                        : null
                    }
                    isActive={sortConfig?.key === "brandName"}
                  >
                  Brand
                  </SortableHeader>
                </TableHead>
              <TableHead>
                <SortableHeader
                  onClick={() => handleSort("itemGroupName")}
                  sortDirection={sortConfig?.key === "itemGroupName" ? sortConfig.direction : null}
                  isActive={sortConfig?.key === "itemGroupName"}
                >
                  Category
                </SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader
                  onClick={() => handleSort("itemName")}
                  sortDirection={sortConfig?.key === "itemName" ? sortConfig.direction : null}
                  isActive={sortConfig?.key === "itemName"}
                >
                  Item Name
                </SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader
                  onClick={() => handleSort("quantity")}
                  sortDirection={sortConfig?.key === "quantity" ? sortConfig.direction : null}
                  isActive={sortConfig?.key === "quantity"}
                >
                  Quantity (Primary)
                </SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader
                  onClick={() => handleSort("warehouseName")}
                  sortDirection={sortConfig?.key === "warehouseName" ? sortConfig.direction : null}
                  isActive={sortConfig?.key === "warehouseName"}
                >
                  Warehouse
                </SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader
                  onClick={() => handleSort("gstPercentage")}
                  sortDirection={sortConfig?.key === "gstPercentage" ? sortConfig.direction : null}
                  isActive={sortConfig?.key === "gstPercentage"}
                >
                  GST (%)
                </SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader
                  onClick={() => handleSort("prices")}
                  sortDirection={sortConfig?.key === "prices" ? sortConfig.direction : null}
                  isActive={sortConfig?.key === "prices"}
                >
                  Prices (PKR)
                </SortableHeader>
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {paginatedData.map(stock => (
              <TableRow key={stock.index}>
                <TableCell>{stock.index}</TableCell>
                <TableCell>{stock.itemCode}</TableCell>
                <TableCell>{stock.brandName}</TableCell>
                <TableCell>{stock.itemGroupName}</TableCell>
                <TableCell>{stock.itemName}</TableCell>
                <TableCell>{stock.quantity}</TableCell>
                <TableCell>{stock.warehouseName}</TableCell>
                <TableCell>{stock.gstPercentage}</TableCell>
                <TableCell>
                  <ExpandableTextDisplay text={stock.prices} previewLength={15} />
                </TableCell>
              </TableRow>
            ))}
            {paginatedData.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-gray-500">
                  No stocks found
                </TableCell>
              </TableRow>
            )}
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

export default StockAtHandList;
