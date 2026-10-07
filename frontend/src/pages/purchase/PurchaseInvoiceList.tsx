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

interface PurchaseInvoice {
  index: number;
  purchaseInvoiceID: number;
  refNo: string;
  invoiceDate: string;
  totalQuantity: number;
  totalNetAmount: number;
  vendorName: string;
  statusId: number;
  statusName: string;
}

const PurchaseInvoiceList: React.FC = () => {
  // enforce auth
  useAuthValidation();
  const { token, roleid } = useSelector((s: RootState) => s.userAuthStore);
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const formatDate = useFormatDate();
  const { hasPermission } = usePermissions(roleid);

  // fetch from your ASP.NET Core API
  const fetchInvoices = async () => {
    try {
      const res = await fetch(
        `${variables.API_URL}PurchaseInvoice/get-all-PurchasesInvoices`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!res.ok) {
        toast.error("Failed to load purchase invoices");
        return;
      }
      const data: PurchaseInvoice[] = await res.json();
      setInvoices(data);
    } catch (err) {
      console.error(err);
      toast.error("Error fetching purchase invoices");
    }
  };

  useEffect(() => {
    fetchInvoices();
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
  } = useTableControls<PurchaseInvoice>(invoices, 10);

  const goDetail = (id: number) =>
    navigate(`/purchase/invoice/detail/${id}`);
  const goEdit = (id: number) =>
    navigate(`/purchase/invoice/${id}`);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Purchase Invoices</h1>
          <p className="text-gray-600 mt-1">Review and manage invoices</p>
        </div>
      </div>

      <Card>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Invoice List</h3>
            <Button
              onClick={() => navigate("/purchase/invoice/new")}
              className="flex items-center gap-2"
              style={{
                visibility: hasPermission(30, "create") ? "visible" : "hidden",
              }}
            >
              <Plus className="h-4 w-4" /> New Invoice
            </Button>
          </div>

          <SearchControl
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            placeholder="Search invoices..."
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
                    Invoice #
                  </SortableHeader>
                </TableHead>
                <TableHead>
                  <SortableHeader
                    onClick={() => handleSort("invoiceDate")}
                    sortDirection={
                      sortConfig?.key === "invoiceDate"
                        ? sortConfig.direction
                        : null
                    }
                    isActive={sortConfig?.key === "invoiceDate"}
                  >
                    Date
                  </SortableHeader>
                </TableHead>
                <TableHead>Total Qty.</TableHead>
                <TableHead>Total Amount</TableHead>
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
                    onClick={() => handleSort("statusName")}
                    sortDirection={
                      sortConfig?.key === "statusName"
                        ? sortConfig.direction
                        : null
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
              {paginatedData.map((inv) => (
                <TableRow key={inv.purchaseInvoiceID}>
                  <TableCell>{inv.index}</TableCell>
                  <TableCell>{inv.refNo}</TableCell>
                  <TableCell>{formatDate(inv.invoiceDate)}</TableCell>
                  <TableCell>{inv.totalQuantity}</TableCell>
                  <TableCell>{inv.totalNetAmount}</TableCell>
                  <TableCell>{inv.vendorName}</TableCell>
                  <TableCell>{inv.statusName}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => goEdit(inv.purchaseInvoiceID)}
                        style={{
                          display:
                           inv.statusId !== 3 && inv.statusId !== 4  && hasPermission( /* invoice-edit-perm-id */ 30, "update")
                              ? "flex"
                              : "none",
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => goDetail(inv.purchaseInvoiceID)}
                        style={{
                          display:
                            hasPermission( /* invoice-edit-perm-id */ 30, "view")
                              ? "flex"
                              : "none",
                        }}
                      >
                        <Eye  className="h-4 w-4" />
                      </Button>
                      {/* <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toast.info("Delete triggered")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button> */}
                    </div>
                  </TableCell>
                </TableRow>
              ))}{ paginatedData.length ==0 && (   <TableRow>
                                                            <TableCell colSpan={8} className="px-3 py-4 text-center text-gray-500">
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

export default PurchaseInvoiceList;
