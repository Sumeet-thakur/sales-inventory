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
import { Link } from "react-router-dom";
import { Pencil, Eye, Plus, Trash2  } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { variables } from "@/Variables";
import { useSelector } from "react-redux";
import { RootState } from "@/Storage/Redux/store";
import { usePermissions } from "@/hooks/usePermissions";
import { useTableControls } from "@/hooks/useTableControls";
import { PaginationControl, SearchControl } from "@/hooks/TableControls";
import { SortableHeader } from "@/hooks/SortableHeader";
import useFormatDate from "@/hooks/useFormatDate";

interface salesRequisition {
  Index: number;
  salesRequisitionID: number;
  refNo: string;
  date: string;
  customerName: string;
  statusId: number;
  status:string
}

const SalesRequisitionList = () => {
  const { token, role, roleid } = useSelector(
    (state: RootState) => state.userAuthStore
  );
  const navigate = useNavigate();
  const [salesRequisitions, setSalesRequisitions] = useState<salesRequisition[]>([]);

  const { hasPermission, loading: permissionsLoading } = usePermissions(roleid);

  const fetchSalesRequisition = async () => {
    try {
      const response = await fetch(variables.API_URL + `SalesRequisition`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        console.log(data);
        if (Array.isArray(data)) {
          const formattedData = data.map((item: any) => ({
            Index: item.Index ?? item.index,
            salesRequisitionID: item.salesRequisitionID,
            refNo: item.refNo,
            date: formatDate(item.date),
            customerName: item.customerName,
            statusId: item.statusId,
            status: item.status,
          }));
          setSalesRequisitions(formattedData);
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

  const formatDate = useFormatDate();

  
  useEffect(() => {
    fetchSalesRequisition();
  }, []);

  const handleEdit = (salesRequisitionID: number) => {
    navigate(`/sales/requisition/${salesRequisitionID}`);
  };
  const handleDetail = (brandId: number) => {
    navigate(`/sales/requisition/detail/${brandId}`);
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
  } = useTableControls<salesRequisition>(salesRequisitions, 10);

  const getStatusText = (statusId: number): string => {
    switch (statusId) {
      case 1:
        return "DRAFT";
      case 2:
        return "PENDING";
      case 3:
        return "APPROVED";
      case 4:
        return "VOID";
      default:
        return "UNKNOW";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Sales Requisitions</h1>
          <p className="text-gray-600 mt-1">Manage sales requisitions</p>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Sales Requisitions List</h3>
          <Button
            onClick={() => navigate("/sales/requisition/new")}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add Sales Requisition
          </Button>
        </div>
        {/* Search at the top */}
        <SearchControl
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          placeholder="Search Sales Requisition..."
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortableHeader
                  onClick={() => handleSort("Index")}
                  sortDirection={
                    sortConfig?.key === "Index" ? sortConfig.direction : null
                  }
                  isActive={sortConfig?.key === "Index"}
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
                  Requisition No
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
              {/* Actions */}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((req, index) => (
              <TableRow key={req.salesRequisitionID}>
                <TableCell>{req.Index}</TableCell>
                <TableCell>{req.refNo}</TableCell>
                <TableCell>{req.date}</TableCell>
                <TableCell>{req.customerName}</TableCell>
                <TableCell>{req.status}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDetail(req.salesRequisitionID)}

                      style={{
                        visibility: hasPermission(15, "view") ? "visible" : "hidden",
                      }}
                       title="View Detail"
                    >
                      <Eye  className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(req.salesRequisitionID)}
                      // Button is visible ONLY if req.statusId === 3 and hasPermission(23, "update") is true,
                      // otherwise, it is hidden.
                      style={{
                        visibility: (req.statusId !== 3 && hasPermission(23, "update")) ? "visible" : "hidden",
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {/* <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4" />
                    </Button> */}
                  </div>
                </TableCell>
              </TableRow>
            ))}{ paginatedData.length ==0 && (   <TableRow>
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
      </Card>
    </div>
  );
};

export default SalesRequisitionList;
