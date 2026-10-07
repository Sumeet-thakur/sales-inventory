import { Routes, Route, Navigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import React, { useEffect, useState } from "react";
import { variables } from "@/Variables";
import { useTableControls } from "@/hooks/useTableControls";
import { SearchControl, PaginationControl } from "@/hooks/TableControls";
import { SortableHeader } from "@/hooks/SortableHeader";
import { useSelector } from "react-redux";
import { RootState } from "@/Storage/Redux/store";
import { usePermissions } from "@/hooks/usePermissions";

interface Unit {
  Index: number;
  UnitId: number;
  UnitName: string;
  Description: string;
  Active: number;
}

const UnitList = () => {
  const { token, role, roleid } = useSelector(
    (state: RootState) => state.userAuthStore
  );
  const navigate = useNavigate();


  const { hasPermission, loading: permissionsLoading } = usePermissions(roleid);
  const [units, setUnits] = useState<Unit[]>([]);

  const fetchUnits = async () => {
    try {
      const response = await fetch(variables.API_URL + "Unit", {
        headers: {
          "Authorization": `Bearer ${token}`
        },
      });
      if (response.ok) {
        const data = await response.json();
        console.log(data);
        if (Array.isArray(data)) {
          const formattedData = data.map((item: any) => ({
            Index: item.Index ?? item.index,
            UnitId: item.UnitId ?? item.unitId,
            UnitName: item.UnitName ?? item.unitName,
            Description: item.Description ?? item.description,
            Active: item.Active ?? item.active,

          }));
          setUnits(formattedData);
          // console.log(formattedData);
        } else {
          throw new Error("Unexpected data structure");
        }
      } else {
        throw new Error("Failed to fetch brands");
      }
    } catch (error) {
      console.log("Error fetching brands:", error);
    } finally {
    }
  };
  useEffect(() => {
    fetchUnits();
  }, []);

  const handleDelete = async (unitId: number) => {
    if (window.confirm("Are you sure you want to delete this unit?")) {
      try {
        const response = await fetch(`${variables.API_URL}Unit/${unitId}`, {
          method: "DELETE",
          headers: {

            "Authorization": `Bearer ${token}`
          },
        });
        if (response.ok) {
          console.log("Unit deleted successfully");
          setUnits((prev) =>
            prev.filter((unit) => unit.UnitId !== unitId)
          );
        } else {
          console.error("Failed to delete unit");
        }
      } catch (error) {
        console.error("Error deleting brand:", error);
        // alert("An error occurred while deleting the brand.");
      }
    }
  };

  const handleEdit = (unitId: number) => {
    navigate(`/inventory/units/${unitId}`);
  };
  const handleDetail = (brandId: number) => {
    navigate(`/inventory/units/detail/${brandId}`);
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
  } = useTableControls<Unit>(units, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Units</h1>
        <p className="text-gray-600 mt-1">Manage product units</p>
      </div>

      <Card>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Units List</h3>
            <Button
              onClick={() => navigate("/inventory/units/new")}
              className="flex items-center gap-2"
              style={{
                visibility: hasPermission(15, "create") ? "visible" : "hidden",
              }}
            >
              <Plus className="h-4 w-4" /> Add Unit
            </Button>
          </div>
          {/* Search at the top */}
          <SearchControl
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            placeholder="Search units..."
          />
          {/* Search at the top */}

          <Table>
            <TableHeader>
              <TableRow>
                {/* <TableHead>Unit Name</TableHead>
                <TableHead>Description</TableHead> */}
                <TableHead>
                  <SortableHeader
                    onClick={() => handleSort("Index")}
                    sortDirection={
                      sortConfig?.key === "Index"
                        ? sortConfig.direction
                        : null
                    }
                    isActive={sortConfig?.key === "Index"}
                  >
                    S No.
                  </SortableHeader>
                </TableHead>
                <TableHead>
                  <SortableHeader
                    onClick={() => handleSort("UnitName")}
                    sortDirection={
                      sortConfig?.key === "UnitName"
                        ? sortConfig.direction
                        : null
                    }
                    isActive={sortConfig?.key === "UnitName"}
                  >
                    Unit Name
                  </SortableHeader>
                </TableHead>
                <TableHead>
                  <SortableHeader
                    onClick={() => handleSort("Description")}
                    sortDirection={
                      sortConfig?.key === "Description"
                        ? sortConfig.direction
                        : null
                    }
                    isActive={sortConfig?.key === "Description"}
                  >
                    Description
                  </SortableHeader>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((unit) => (
                <TableRow key={unit.UnitId}>
                  <TableCell>{unit.Index}</TableCell>
                  <TableCell>{unit.UnitName}</TableCell>
                  <TableCell>{unit.Description}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(unit.UnitId)}
                        style={{
                          visibility: hasPermission(15, "update") ? "visible" : "hidden",
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(unit.UnitId)}
                        style={{
                          visibility: hasPermission(15, "delete") ? "visible" : "hidden",
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDetail(unit.UnitId)}

                        style={{
                          visibility: hasPermission(15, "view") ? "visible" : "hidden",
                        }}
                      >
                                                <Eye  className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}{ paginatedData.length ==0 && (   <TableRow>
                                                            <TableCell colSpan={4} className="px-3 py-4 text-center text-gray-500">
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
    </div>
  );
};

export default UnitList;
