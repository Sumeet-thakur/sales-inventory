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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const WarehouseItemList = () => {
  const navigate = useNavigate();

  const warehouseitems = [
    {
      id: 1,
      name: "Warehouse 1",
      description: "KHI",
      isActive: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Warehouse items</h1>
        <p className="text-gray-600 mt-1">Manage warehouse items</p>
      </div>

      <Card>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Warehouse items List</h3>
            <Button
              onClick={() => navigate("/inventory/warehouseitem/new")}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Add Warehouse Item
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Warehouse Name</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {warehouseitems.map((warehouseitem) => (
                <TableRow key={warehouseitem.id}>
                  <TableCell>{warehouseitem.name}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default WarehouseItemList;
