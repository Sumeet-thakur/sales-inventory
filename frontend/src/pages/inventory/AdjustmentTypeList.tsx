import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Eye  } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { variables } from "@/Variables";
import { useSelector } from "react-redux";
import { RootState } from "@/Storage/Redux/store";
import { usePermissions } from "@/hooks/usePermissions";
import { useTableControls } from "@/hooks/useTableControls";
import { SearchControl, PaginationControl } from "@/hooks/TableControls";
import { SortableHeader } from "@/hooks/SortableHeader";

interface AdjustmentTypeItem {
  Index: number;
  AdjustmentTypeID: number;
  Description: string;
  Name: string;
  InventoryEffect: number;
}

const AdjustmentTypeList = () => {
  const navigate = useNavigate();
  const { token, roleid } = useSelector((state: RootState) => state.userAuthStore);
  const { hasPermission } = usePermissions(roleid);

  const [adjustmentTypes, setAdjustmentTypes] = useState<AdjustmentTypeItem[]>([]);

  // Fetch all adjustment types
  const fetchAdjustmentTypes = async () => {
    try {
      const response = await fetch(`${variables.API_URL}AdjustmentType`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch adjustment types");
      const data = await response.json();
      if (Array.isArray(data)) {
        const formatted = data.map((item: any) => ({
          Index: item.Index ?? item.index,
          AdjustmentTypeID: item.AdjustmentTypeID ?? item.adjustmentTypeID,
          Description: item.Description ?? item.description,
          InventoryEffect: item.InventoryEffect ?? item.inventoryEffect,
          Name: item.Name ?? item.name,
        }));
        setAdjustmentTypes(formatted);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAdjustmentTypes();
  }, []);

  // Delete handler
  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this adjustment type?")) return;
    try {
      const resp = await fetch(`${variables.API_URL}AdjustmentType/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) fetchAdjustmentTypes();
      else console.error("Failed to delete");
    } catch (e) {
      console.error(e);
    }
  };

  // Edit handler
  const handleEdit = (id: number) => {
    navigate(`/inventory/adjustmenttype/${id}`);
  };

  // Detail/audit-log handler
  const handleDetail = (id: number) => {
    navigate(`/inventory/adjustmenttype/detail/${id}`);
  };

  // Table controls
  const {
    searchTerm,
    setSearchTerm,
    sortConfig,
    handleSort,
    paginatedData,
    currentPage,
    setCurrentPage,
    totalPages,
  } = useTableControls<AdjustmentTypeItem>(adjustmentTypes, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Adjustment Types</h1>
        <p className="text-gray-600 mt-1">Manage adjustment types</p>
      </div>

      <Card>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">List of Adjustment Types</h3>
            <Button
              onClick={() => navigate("/inventory/adjustmenttype/new")}
              className="flex items-center gap-2"
              style={{ visibility: hasPermission( /* moduleId */ 32, "create") ? "visible" : "hidden" }}
            >
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>

          <SearchControl
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            placeholder="Search adjustment types..."
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
                    onClick={() => handleSort("Name")}
                    sortDirection={sortConfig?.key === "Name" ? sortConfig.direction : null}
                    isActive={sortConfig?.key === "Name"}
                  >
                    Name
                  </SortableHeader>
                </TableHead>
                <TableHead>
                  <SortableHeader
                    onClick={() => handleSort("Description")}
                    sortDirection={sortConfig?.key === "Description" ? sortConfig.direction : null}
                    isActive={sortConfig?.key === "Description"}
                  >
                    Description
                  </SortableHeader>
                </TableHead>
                <TableHead>
                  <SortableHeader
                    onClick={() => handleSort("InventoryEffect")}
                    sortDirection={
                      sortConfig?.key === "InventoryEffect" ? sortConfig.direction : null
                    }
                    isActive={sortConfig?.key === "InventoryEffect"}
                  >
                    Inventory Effect
                  </SortableHeader>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {paginatedData.map((item) => (
                <TableRow key={item.AdjustmentTypeID}>
                  <TableCell>{item.Index}</TableCell>
                  <TableCell>{item.Name}</TableCell>
                  <TableCell>{item.Description}</TableCell>
                  <TableCell>{item.InventoryEffect === 1 ? 'Add' : 'Subtract'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(item.AdjustmentTypeID)}
                        style={{ visibility: hasPermission(32, "update") ? "visible" : "hidden" }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item.AdjustmentTypeID)}
                        style={{ visibility: hasPermission(32, "delete") ? "visible" : "hidden" }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDetail(item.AdjustmentTypeID)}
                        style={{ visibility: hasPermission(32, "view") ? "visible" : "hidden" }}
                      >
                        <Eye  className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}{ paginatedData.length ==0 && (   <TableRow>
                                                            <TableCell colSpan={5} className="px-3 py-4 text-center text-gray-500">
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
    </div>
  );
};

export default AdjustmentTypeList;
