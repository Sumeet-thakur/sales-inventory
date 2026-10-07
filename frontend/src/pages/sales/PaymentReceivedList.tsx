import { useEffect, useState } from "react";
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
import useNumberFormatter from "@/hooks/useNumberFormatter";

interface PaymentReceived {
  index: number;
  paymentReceivedID: number;
  refNo: string;
  paymentDate: string;       // ISO-8601
  paymentAmount: number;
  customerName: string;
  paymentModeName: string;
  statusId: number | null;
  statusName: string | null;
}

const PaymentReceivedList = () => {
  
  const navigate = useNavigate();
  const formatDate = useFormatDate();
  const { token ,roleid} = useSelector((s: RootState) => s.userAuthStore);
  const [payments, setPayments] = useState<PaymentReceived[]>([]);
  const { hasPermission, loading: permissionsLoading } = usePermissions(roleid);
  const formatNumber = useNumberFormatter(); 
  // Fetch from your ASP.NET endpoint
  const fetchPayments = async () => {
    try {
      const res = await fetch(
        `${variables.API_URL}PaymentsReceived/get-all-paymentreceived`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Failed to load payments");
      const data: PaymentReceived[] = await res.json();
      setPayments(data);
    } catch (err) {
      console.error("Error fetching payments:", err);
    }
  };

  const handleEdit = (salesRequisitionID: number) => {
    navigate(`/sales/payment/${salesRequisitionID}`);
  };
  const handleDetail = (salesRequisitionID: number) => {
    navigate(`/sales/payment/detail/${salesRequisitionID}`);
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  // Hook up search, sort, pagination
  const {
    searchTerm,
    setSearchTerm,
    sortConfig,
    handleSort,
    paginatedData,
    currentPage,
    setCurrentPage,
    totalPages,
  } = useTableControls<PaymentReceived>(payments, 10);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Payments Received</h1>
          <p className="text-gray-600 mt-1">Track received payments</p>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Payments Received List</h3>
          <Button
            onClick={() => navigate("/sales/payment/new")}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add Payment
          </Button>
        </div>

        {/* Search at the top */}
        <SearchControl
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          placeholder="Search Payments Received..."
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
                  Receipt No
                </SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader
                  onClick={() => handleSort("paymentDate")}
                  sortDirection={
                    sortConfig?.key === "paymentDate"
                      ? sortConfig.direction
                      : null
                  }
                  isActive={sortConfig?.key === "paymentDate"}
                >
                  Date
                </SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader
                  onClick={() => handleSort("customerName")}
                  sortDirection={
                    sortConfig?.key === "customerName"
                      ? sortConfig.direction
                      : null
                  }
                  isActive={sortConfig?.key === "customerName"}
                >
                  Customer
                </SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader
                  onClick={() => handleSort("paymentAmount")}
                  sortDirection={
                    sortConfig?.key === "paymentAmount"
                      ? sortConfig.direction
                      : null
                  }
                  isActive={sortConfig?.key === "paymentAmount"}
                >
                 Payment Amount
                </SortableHeader>
              </TableHead>
              <TableHead>
                <SortableHeader
                  onClick={() => handleSort("paymentModeName")}
                  sortDirection={
                    sortConfig?.key === "paymentModeName"
                      ? sortConfig.direction
                      : null
                  }
                  isActive={sortConfig?.key === "paymentModeName"}
                >
                  Payment Mode
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
            {paginatedData.map((p) => (
              <TableRow key={p.paymentReceivedID}>
                <TableCell>{p.index}</TableCell>
                <TableCell>{p.refNo}</TableCell>
                <TableCell>{formatDate(p.paymentDate)}</TableCell>
                <TableCell>{p.customerName}</TableCell>
                <TableCell>{formatNumber(p.paymentAmount.toFixed(2))}</TableCell>
                <TableCell>{p.paymentModeName}</TableCell>
                <TableCell>{p.statusName || "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon"
                    onClick={()=>handleEdit(p.paymentReceivedID)}
                    style={{
                      display: (p.statusId !== 3 && p.statusId !== 4  && hasPermission(26, "update")) ? "flex" : "none",

                  }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDetail(p.paymentReceivedID)}

                      
                    >
                          <Eye  className="h-4 w-4" />
                    </Button>
                    {/* <Button variant="ghost" size="icon">
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

        {/* Pagination */}
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

export default PaymentReceivedList;
