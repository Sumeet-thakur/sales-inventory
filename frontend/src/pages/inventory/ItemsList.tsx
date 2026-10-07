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
import { RootState } from "@/Storage/Redux/store";
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import itemListViewModel from "@/Interfaces/itemListViewModel";
import { variables } from "@/Variables";
import { useTableControls } from "@/hooks/useTableControls";
import { SearchControl, PaginationControl } from "@/hooks/TableControls";
import { SortableHeader } from "@/hooks/SortableHeader";

const ItemsList = () => {

  const { token, role,roleid } = useSelector(
    (state: RootState) => state.userAuthStore
  );
  const navigate = useNavigate();
 const [items, setItems] = useState<itemListViewModel[]>([]);
 const { hasPermission, loading: permissionsLoading } = usePermissions(roleid); 

 const fetchItems = async () => {
       try {
         const response = await fetch(variables.API_URL + "Item",{
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
              itemId: item.itemId,
              itemName: item.itemName,
              itemCode: item.itemCode??item.itemcode,
              brandName:item.brandName,
              itemGroupName: item.itemGroupName ,
              unitName: item.unitName
 
               
             }));
             setItems(formattedData);
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
    fetchItems();
       
     }, []);
  

     const handleEdit = (ItemId: number) => {
      navigate(`/inventory/items/${ItemId}`);
    };
    const handleDetail = (ItemId: number) => {
      navigate(`/inventory/items/detail/${ItemId}`);
    };
    const handleDelete = async (ItemId: number) => {
        if (!window.confirm("Are you sure you want to delete this Item?")) return;
        try {
          const resp = await fetch(`${variables.API_URL}Item/${ItemId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (resp.ok)
            {
               fetchItems()
 setItems((prev) => prev.filter((item) => item.itemId !== ItemId));
            }
          else{ console.error("Failed to delete");}
        } catch (e) {
          console.error(e);
        }
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
   } = useTableControls<itemListViewModel>(items, 10);
 

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Items</h1>
        <p className="text-gray-600 mt-1">Manage your inventory items</p>
      </div>

      <Card>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Items List</h3>
            <Button
              onClick={() => navigate("/inventory/items/new")}
              className="flex items-center gap-2"
              style={{
                visibility: hasPermission(17, "create") ? "visible" : "hidden",
              }}
            >
              <Plus className="h-4 w-4" /> Add Item
            </Button>
          </div>
  {/* Search at the top */}
  <SearchControl
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            placeholder="Search Items..."
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
                    onClick={() => handleSort("itemName")}
                    sortDirection={
                      sortConfig?.key === "itemName"
                        ? sortConfig.direction
                        : null
                    }
                    isActive={sortConfig?.key === "itemName"}
                  >
                    Item Name
                  </SortableHeader>
                </TableHead>
                <TableHead>
                  <SortableHeader
                    onClick={() => handleSort("itemCode")}
                    sortDirection={
                      sortConfig?.key === "itemCode"
                        ? sortConfig.direction
                        : null
                    }
                    isActive={sortConfig?.key === "itemCode"}
                  >
                  Code
                  </SortableHeader>
                </TableHead>
                <TableHead>
                  <SortableHeader
                    onClick={() => handleSort("brandName")}
                    sortDirection={
                      sortConfig?.key === "brandName"
                        ? sortConfig.direction
                        : null
                    }
                    isActive={sortConfig?.key === "brandName"}
                  >
                  Brand
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
                  Category
                  </SortableHeader>
                </TableHead>
                <TableHead>
                  <SortableHeader
                    onClick={() => handleSort("unitName")}
                    sortDirection={
                      sortConfig?.key === "unitName"
                        ? sortConfig.direction
                        : null
                    }
                    isActive={sortConfig?.key === "unitName"}
                  >
                  Unit
                  </SortableHeader>
                </TableHead>
                {/* <TableHead>Stock</TableHead> */}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((item) => (
                <TableRow key={item.itemId}>
                  <TableCell>{item.Index}</TableCell>
                  <TableCell>{item.itemName}</TableCell>
                  <TableCell>{item.itemCode}</TableCell>
                  <TableCell>{item.brandName}</TableCell>
                  <TableCell>{item.itemGroupName}</TableCell>
                  <TableCell>{item.unitName}</TableCell>
                  {/* <TableCell>{item.stock}</TableCell> */}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon"
                      onClick={() => handleEdit(item.itemId)}
                      style={{
                        visibility: hasPermission(17, "update") ? "visible" : "hidden",
                      }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon"
                      style={{
                        visibility: hasPermission(17, "delete") ? "visible" : "hidden",
                      }}
                       onClick={() => handleDelete(item.itemId)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon"
                      onClick={() => handleDetail(item.itemId)}
                      style={{
                        visibility: hasPermission(17, "view") ? "visible" : "hidden",
                      }}>
                        <Eye  className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
           { items.length ==0 && (   <TableRow>
                                <TableCell colSpan={7} className="px-3 py-4 text-center text-gray-500">
                                  No items found
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

export default ItemsList;
