import React, { useState, useEffect } from "react";
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
import {
  Pencil,
  Trash2,
  Plus,
  Eye ,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { variables } from "@/Variables";
import useAuthValidation from "@/hooks/useAuthValidation";
import { useSelector } from "react-redux";
import { RootState } from "@/Storage/Redux/store";
import { useTableControls } from "@/hooks/useTableControls";
import { SearchControl, PaginationControl } from "@/hooks/TableControls";
import { SortableHeader } from "@/hooks/SortableHeader";
import useFormatDate from "@/hooks/useFormatDate";
import { usePermissions } from "@/hooks/usePermissions";

interface PurchaseReceive {
  index: number;
  purchaseReceiveID: number;
  refNo: string;
  date: string;
  totalQuantity: number;
  vendorName: string;
  statusId: number | null;
  statusName: string | null;
}

const PurchaseReceiveList: React.FC = () => {
  useAuthValidation();
  const { token, roleid } = useSelector((state: RootState) => state.userAuthStore);
  const navigate = useNavigate();
  const [purchaseReceives, setPurchaseReceives] = useState<PurchaseReceive[]>([]);
  const formatDate = useFormatDate();
  const { hasPermission } = usePermissions(roleid);

  // Fetch the purchase receive list from the API
  const fetchPurchaseReceives = async () => {
    try {
      const response = await fetch(
        `${variables.API_URL}PurchaseReceives/get-all-Purchasesreceived`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        const data: PurchaseReceive[] = await response.json();
        setPurchaseReceives(data);
      } else {
        toast.error("Failed to fetch purchase receives");
      }
    } catch (error) {
      console.error("Error fetching purchase receives:", error);
      toast.error("Error fetching purchase receives");
    }
  };

  useEffect(() => {
    fetchPurchaseReceives();
  }, []);

  const {
    searchTerm,
    setSearchTerm,
    sortConfig,
    handleSort,
    paginatedData,
    currentPage,
    setCurrentPage,
    totalPages,
  } = useTableControls<PurchaseReceive>(purchaseReceives, 10);

  const handleDetail = (purchaseReceiveID: number) => {
    navigate(`/purchase/receive/detail/${purchaseReceiveID}`);
  };

  const handleEdit = (purchaseReceiveID: number) => {
    navigate(`/purchase/receive/${purchaseReceiveID}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Purchase Receives</h1>
          <p className="text-gray-600 mt-1">Manage and track purchase receives</p>
        </div>
      </div>

      <Card>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Purchase Receive List</h3>
            <Button
              onClick={() => navigate("/purchase/receive/new")}
              className="flex items-center gap-2"
               style={{
                          display:
                             hasPermission(29, "create")
                              ? "flex"
                              : "none",
                        }}
            >
              <Plus className="h-4 w-4" /> Add Purchase Receive
            </Button>
          </div>
          <SearchControl
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            placeholder="Search Purchase Receives..."
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortableHeader
                    onClick={() => handleSort("index")}
                    sortDirection={
                      sortConfig?.key === "index" ? sortConfig.direction : null
                    }
                    isActive={sortConfig?.key === "index"}
                  >
                    S No.
                  </SortableHeader>
                </TableHead>
                <TableHead>
                  <SortableHeader
                    onClick={() => handleSort("refNo")}
                    sortDirection={
                      sortConfig?.key === "refNo" ? sortConfig.direction : null
                    }
                    isActive={sortConfig?.key === "refNo"}
                  >
                    Receive Number
                  </SortableHeader>
                </TableHead>
                <TableHead>
                  <SortableHeader
                    onClick={() => handleSort("date")}
                    sortDirection={
                      sortConfig?.key === "date" ? sortConfig.direction : null
                    }
                    isActive={sortConfig?.key === "date"}
                  >
                    Date
                  </SortableHeader>
                </TableHead>
                <TableHead>
                  <SortableHeader
                    onClick={() => handleSort("vendorName")}
                    sortDirection={
                      sortConfig?.key === "vendorName" ? sortConfig.direction : null
                    }
                    isActive={sortConfig?.key === "vendorName"}
                  >
                    Vendor
                  </SortableHeader>
                </TableHead>
                <TableHead>
                  <SortableHeader
                    onClick={() => handleSort("statusName")}
                    sortDirection={
                      sortConfig?.key === "statusName" ? sortConfig.direction : null
                    }
                    isActive={sortConfig?.key === "statusName"}
                  >
                    Status
                  </SortableHeader>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((receive) => (
                <TableRow key={receive.purchaseReceiveID}>
                  <TableCell>{receive.index}</TableCell>
                  <TableCell>{receive.refNo}</TableCell>
                  <TableCell>{formatDate(receive.date)}</TableCell>
                  <TableCell>{receive.vendorName}</TableCell>
                  <TableCell>{receive.statusName}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(receive.purchaseReceiveID)}
                        style={{
                          display:
                            receive.statusId !== 3 && hasPermission(29, "update")
                              ? "flex"
                              : "none",
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDetail(receive.purchaseReceiveID)}
                      >
                        <Eye  className="h-4 w-4" />
                      </Button>
                      {/* <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toast.info("Delete action triggered")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button> */}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              { paginatedData.length ==0 && (   <TableRow>
                                                            <TableCell colSpan={6} className="px-3 py-4 text-center text-gray-500">
                                                              No Data found
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

export default PurchaseReceiveList;
