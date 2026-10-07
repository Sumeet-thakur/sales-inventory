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
import cityModel from "@/Interfaces/cityModel";
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


interface cityTable {
  Index: number;
  cityId: number;
  cityName: string;
}



const CitiesList = () => {
  const navigate = useNavigate();
  const { token, role, roleid } = useSelector(
    (state: RootState) => state.userAuthStore
  );

  const [cities, setCities] = useState<cityTable[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  const { hasPermission, loading: permissionsLoading } = usePermissions(roleid);

  const fetchCities = async () => {
    try {
      const response = await fetch(variables.API_URL + "Cities", {
        headers: {
          "Authorization": `Bearer ${token}`
        },
      });
      if (response.ok) {
        const data = await response.json();
        console.log(data);
        if (Array.isArray(data)) {
          const formattedData = data.map((item: any) => ({
            Index: item.index ?? item.Index,
            cityId: item.cityId ?? item.CityId,
            cityName: item.cityName ?? item.CityName,

          }));
          setCities(formattedData);
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



  useEffect(() => {
    fetchCities();

  }, []);


  const handleDelete = async (CityId: number) => {
    if (window.confirm("Are you sure you want to delete this brand?")) {
      try {
        const response = await fetch(`${variables.API_URL}Cities/${CityId}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`
          },
        });
        if (response.ok) {
          console.log("Brand deleted successfully");
          setCities((prev) => prev.filter((city) => city.cityId !== CityId));
        } else {
          console.error("Failed to delete brand");
        }
      } catch (error) {
        console.error("Error deleting brand:", error);
      }
      fetchCities();
    }
  };

  const handleEdit = (brandId: number) => {
    navigate(`/setup/city/${brandId}`);
  };
  const handleDetail = (brandId: number) => {
    navigate(`/setup/city/detail/${brandId}`);
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
  } = useTableControls<cityTable>(cities, 10);


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Cities</h1>
        <p className="text-gray-600 mt-1">Manage Cities</p>
      </div>

      <Card>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Cities List</h3>
            <Button
              onClick={() => navigate("/setup/city/new")}
              className="flex items-center gap-2"
              style={{
                visibility: hasPermission(20, "create") ? "visible" : "hidden",
              }}
            >
              <Plus className="h-4 w-4" /> Add City
            </Button>
          </div>
          {/* Search at the top */}
          <SearchControl
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            placeholder="Search Cities..."
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
                    onClick={() => handleSort("cityName")}
                    sortDirection={
                      sortConfig?.key === "cityName"
                        ? sortConfig.direction
                        : null
                    }
                    isActive={sortConfig?.key === "cityName"}
                  >
                    City Name
                  </SortableHeader>
                </TableHead>


                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((city, index) => (
                <TableRow key={city.cityId}>
                  <TableCell>{city.Index}</TableCell>
                  <TableCell>{city.cityName}</TableCell>

                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(city.cityId)}
                        style={{
                          visibility: hasPermission(20, "update") ? "visible" : "hidden",
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(city.cityId)}

                        style={{
                          visibility: hasPermission(20, "delete") ? "visible" : "hidden",
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDetail(city.cityId)}

                        style={{
                          visibility: hasPermission(15, "view") ? "visible" : "hidden",
                        }}
                      >
                        <Eye  className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
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

export default CitiesList;
