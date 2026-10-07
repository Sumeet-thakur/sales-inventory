import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
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
import React, { useEffect, useState } from "react";
import { variables } from "@/Variables";
import { usePermissions } from "@/hooks/usePermissions";
import { useSelector } from "react-redux";
import { RootState } from "@/Storage/Redux/store";
import { useTableControls } from "@/hooks/useTableControls";
import { SearchControl, PaginationControl } from "@/hooks/TableControls";
import { SortableHeader } from "@/hooks/SortableHeader";


interface ActivityLog {
  activityLogId: number;
  actionType: string;
  oldData: string;
  newData: string;
  brandName: string;
  userName: string;
  date: string; // Optionally, you can parse this as a Date object if needed.
}

interface Brand {
  Index: number;
  BrandId: number;
  BrandName: string;
  Description: string;
  ItemCount: number;
}

// ExpandableJson component to toggle JSON view
const ExpandableJson = ({ jsonData }: { jsonData: string }) => {
  const [expanded, setExpanded] = useState(false);

  const toggle = () => setExpanded(!expanded);

  let formattedJson: string;
  try {
    const obj = JSON.parse(jsonData);
    formattedJson = JSON.stringify(obj, null, 2);
  } catch {
    formattedJson = jsonData;
  }

  // Show first 50 characters if not expanded
  const preview = formattedJson.length > 50 ? formattedJson.substring(0, 10) + "..." : formattedJson;

  return (
    <div>
      <Button variant="ghost" size="icon" onClick={toggle}>
        {expanded ? "-" : <Plus className="h-4 w-4" />}
      </Button>
      <pre className="mt-2 bg-gray-100 p-2 rounded text-sm overflow-x-auto">
        {expanded ? formattedJson : preview}
      </pre>
    </div>
  );
};


const BrandList = () => {
  const navigate = useNavigate();
  const { token, role, roleid } = useSelector(
    (state: RootState) => state.userAuthStore
  );

  const [brands, setBrands] = useState<Brand[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  const { hasPermission, loading: permissionsLoading } = usePermissions(roleid);

  const fetchBrands = async () => {
    try {
      const response = await fetch(variables.API_URL + `Brand`,{
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
            BrandId: item.BrandId ?? item.brandId,
            BrandName: item.BrandName ?? item.brandName,
            Description: item.Description ?? item.description,
            ItemCount: item.ItemCount ?? item.itemCount,
          }));
          setBrands(formattedData);
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

  const fetchActivityLogs = async () => {
    try {
      const response = await fetch(variables.API_URL + "Brand/activity_log",{
        headers: {
                
          "Authorization": `Bearer ${token}`
        },
      });
      if (response.ok) {
        const data = await response.json();
        console.log(data);
        if (Array.isArray(data)) {
          const formattedData = data.map((item: any) => ({
            activityLogId: item.activityLogId ?? item.activityLogId,
            actionType: item.ActionType ?? item.actionType,
            oldData: item.OldData ?? item.oldData,
            newData: item.NewData ?? item.newData,
            brandName: item.BrandName ?? item.brandName,
            userName: item.UserName ?? item.userName,
            date: item.Date ?? item.date,
          }));
          setActivityLogs(formattedData);
        } else {
          throw new Error("Unexpected data structure");
        }
      } else {
        throw new Error("Failed to fetch activity logs");
      }
    } catch (error) {
      console.log("Error fetching activity logs:", error);
    }
  };

  useEffect(() => {
    fetchBrands();
    fetchActivityLogs();
  }, []);

 

  const handleDelete = async (brandId: number) => {
    if (window.confirm("Are you sure you want to delete this brand?")) {
      try {
        const response = await fetch(`${variables.API_URL}Brand/${brandId}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`
          },
        });
        if (response.ok) {
          console.log("Brand deleted successfully");
          setBrands((prev) => prev.filter((brand) => brand.BrandId !== brandId));
        } else {
          console.error("Failed to delete brand");
        }
      } catch (error) {
        console.error("Error deleting brand:", error);
      }
      fetchBrands();
    }
  };

  const handleEdit = (brandId: number) => {
    navigate(`/inventory/brands/${brandId}`);
  };
  const handleDetail = (brandId: number) => {
    navigate(`/inventory/brands/detail/${brandId}`);
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
  } = useTableControls<Brand>(brands, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Brands</h1>
        <p className="text-gray-600 mt-1">Manage product brands</p>
      </div>

      <Card>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Brands List</h3>
            <Button
              onClick={() => navigate("/inventory/brands/new")}
              className="flex items-center gap-2"
              style={{
                visibility: hasPermission(9, "create") ? "visible" : "hidden",
              }}
            >
              <Plus className="h-4 w-4" /> Add Brand
            </Button>
          </div>
          {/* Search at the top */}
          <SearchControl
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            placeholder="Search Brands..."
          />
          {/* Search at the top */}
          <Table>
            <TableHeader>
              <TableRow>
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
                    onClick={() => handleSort("BrandName")}
                    sortDirection={
                      sortConfig?.key === "BrandName"
                        ? sortConfig.direction
                        : null
                    }
                    isActive={sortConfig?.key === "BrandName"}
                  >
                    Brand Name
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
              {paginatedData.map((brand, index) => (
                <TableRow key={brand.BrandId}>
                  <TableCell>{brand.Index}</TableCell>
                  <TableCell>{brand.BrandName}</TableCell>
                  <TableCell>{brand.Description}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(brand.BrandId)}
                        style={{
                          visibility: hasPermission(9, "update") ? "visible" : "hidden",
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(brand.BrandId)}
                        disabled={brand.ItemCount > 0}
                        style={{
                          visibility: hasPermission(9, "delete") ? "visible" : "hidden",
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDetail(brand.BrandId)}
                        
                        style={{
                          visibility: hasPermission(9, "view") ? "visible" : "hidden",
                        }}
                      >
                        <Eye  className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              { paginatedData.length ==0 && (   <TableRow>
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

export default BrandList;
