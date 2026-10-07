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

interface PurchaseOrder {
  index: number;
  purchaseRequisitionOrderID: number;
  refNo: string;
  date: string;
  vendorName: string;
  statusId: number;
  status: string;
}

const PurchaseOrderList: React.FC = () => {
  useAuthValidation();
    const { token ,roleid} = useSelector((state: RootState) => state.userAuthStore);
  const navigate = useNavigate();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const formatDate = useFormatDate();
    const { hasPermission } = usePermissions(roleid);

  // Fetch the purchase orders from the ASP.NET Core API.
  const fetchPurchaseOrders = async () => {
    try {
      const response = await fetch(
        `${variables.API_URL}PurchaseRequisitionOrder/PurchaseRequisitions`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        const data: PurchaseOrder[] = await response.json();
        setPurchaseOrders(data);
      } else {
        toast.error("Failed to fetch purchase orders");
      }
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
      toast.error("Error fetching purchase orders");
    }
  };

  useEffect(() => {
    fetchPurchaseOrders();
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
       } = useTableControls<PurchaseOrder
       >(purchaseOrders, 10);
       
       const handleDetail = (purchaseRequisitionOrderID: number) => {
        navigate(`/purchase/order/detail/${purchaseRequisitionOrderID}`);
      };
      const handleEdit = (purchaseRequisitionOrderID: number) => {
        navigate(`/purchase/order/${purchaseRequisitionOrderID}`);
      };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Purchase Orders</h1>
          <p className="text-gray-600 mt-1">Manage and track purchase orders</p>
        </div>
      </div>

      <Card>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Purchase Order List</h3>
            <Button
              onClick={() => navigate("/purchase/order/new")}
              className="flex items-center gap-2"
              style={{
                visibility: hasPermission(28, "create") ? "visible" : "hidden",
              }}
            >
              <Plus className="h-4 w-4" /> Add Purchase Order
            </Button>
          </div>
          <SearchControl
                      searchTerm={searchTerm}
                      setSearchTerm={setSearchTerm}
                      placeholder="Search Purchase Orders..."
                    />
          <Table>
            <TableHeader>
              <TableRow>
                  <TableHead>
                                  <SortableHeader
                                    onClick={() => handleSort("index")}
                                    sortDirection={
                                      sortConfig?.key === "index"
                                        ? sortConfig.direction
                                        : null
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
                                      sortConfig?.key === "refNo"
                                        ? sortConfig.direction
                                        : null
                                    }
                                    isActive={sortConfig?.key === "refNo"}
                                  >
                                    Order Number
                                  </SortableHeader>
                                </TableHead>
                                <TableHead>
                                  <SortableHeader
                                    onClick={() => handleSort("date")}
                                    sortDirection={
                                      sortConfig?.key === "date"
                                        ? sortConfig.direction
                                        : null
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
                                      sortConfig?.key === "vendorName"
                                        ? sortConfig.direction
                                        : null
                                    }
                                    isActive={sortConfig?.key === "vendorName"}
                                  >
                                    Vendor
                                  </SortableHeader>
                                </TableHead>
                                <TableHead>
                                  <SortableHeader
                                    onClick={() => handleSort("status")}
                                    sortDirection={
                                      sortConfig?.key === "status"
                                        ? sortConfig.direction
                                        : null
                                    }
                                    isActive={sortConfig?.key === "status"}
                                  >
                                    Status
                                  </SortableHeader>
                                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((order) => (
                <TableRow key={order.purchaseRequisitionOrderID}>
                    <TableCell>{order.index}</TableCell>
                  <TableCell>{order.refNo}</TableCell>
                  <TableCell>{formatDate(order.date)}</TableCell>
                  <TableCell>{order.vendorName}</TableCell>
                  <TableCell>{order.status}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(order.purchaseRequisitionOrderID)}
                        style={{
                          display: (order.statusId !== 3 && hasPermission(28, "update")) ? "flex" : "none",
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDetail(order.purchaseRequisitionOrderID)}

                      
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

export default PurchaseOrderList;
