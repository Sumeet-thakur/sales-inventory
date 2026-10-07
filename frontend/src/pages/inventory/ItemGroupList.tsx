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
import { useEffect, useState } from "react";
import itemGroupModel from "@/Interfaces/itemGroupModel";
import { variables } from "@/Variables";
import { usePermissions } from "@/hooks/usePermissions";
import { useSelector } from "react-redux";
import { RootState } from "@/Storage/Redux/store";
import { useTableControls } from "@/hooks/useTableControls";
import { SearchControl, PaginationControl } from "@/hooks/TableControls";
import { SortableHeader } from "@/hooks/SortableHeader";
interface itemGroupTable {
  Index: number;
  itemGroupId: number;
  itemGroupName: string;
  description: string;
 
}
const ItemGroupList = () => {
  const { token, role,roleid } = useSelector(
    (state: RootState) => state.userAuthStore
  );
  const navigate = useNavigate();
 const [itemGroups, setItemGroups] = useState<itemGroupTable[]>([]);
 const { hasPermission, loading: permissionsLoading } = usePermissions(roleid); 
  const fetchGroups = async () => {
    try {
      const response = await fetch(variables.API_URL + "ItemGroup",{
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
            itemGroupId: item.itemGroupId ?? item.itemGroupId,
            itemGroupName: item.itemGroupName ?? item.itemGroupName,
            description: item.description ?? item.description,
            
          }));
          setItemGroups(formattedData);
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
  fetchGroups();
    
  }, []);

  const handleEdit = (itemGroupId: number) => {
    navigate(`/inventory/itemgroups/${itemGroupId}`);
  };
  const handleDetail = (brandId: number) => {
    navigate(`/inventory/itemgroups/detail/${brandId}`);
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
  } = useTableControls<itemGroupTable>(itemGroups, 10);


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Item Categories</h1>
        <p className="text-gray-600 mt-1">Manage product item categories</p>
      </div>

      <Card>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Item Categories List</h3>
            <Button
              onClick={() => navigate("/inventory/itemGroups/new")}
              className="flex items-center gap-2"
              style={{
                visibility: hasPermission(10, "create") ? "visible" : "hidden",
              }}
            >
              <Plus className="h-4 w-4" /> Add Item Category
            </Button>
          </div>
           {/* Search at the top */}
                     <SearchControl
                      searchTerm={searchTerm}
                      setSearchTerm={setSearchTerm}
                      placeholder="Search Item Category..."
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
                                                  onClick={() => handleSort("itemGroupName")}
                                                  sortDirection={
                                                    sortConfig?.key === "itemGroupName"
                                                      ? sortConfig.direction
                                                      : null
                                                  }
                                                  isActive={sortConfig?.key === "itemGroupName"}
                                                >
                                                  Item Category Name
                                                </SortableHeader>
                                              </TableHead>
                                              <TableHead>
                  <SortableHeader
                    onClick={() => handleSort("description")}
                    sortDirection={
                      sortConfig?.key === "description"
                        ? sortConfig.direction
                        : null
                    }
                    isActive={sortConfig?.key === "description"}
                  >
                   Description
                  </SortableHeader>
                </TableHead>
                
                
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((itemGroup) => (
                <TableRow key={itemGroup.itemGroupId}>
                <TableCell>{itemGroup.Index }</TableCell>

                  <TableCell>{itemGroup.itemGroupName}</TableCell>
                  <TableCell>{itemGroup.description}</TableCell>
                 
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon"
                       onClick={() => handleEdit(itemGroup.itemGroupId)}
                       style={{
                        visibility: hasPermission(10, "update") ? "visible" : "hidden",
                      }}>
                        
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                       <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => handleDetail(itemGroup.itemGroupId)}
                                              
                                              style={{
                                                visibility: hasPermission(10, "view") ? "visible" : "hidden",
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

export default ItemGroupList;
