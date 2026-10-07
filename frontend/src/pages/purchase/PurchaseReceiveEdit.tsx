import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Link, useNavigate } from "react-router-dom";

interface LineItem {
  id: number;
  serialno: string;
  itemId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

const PurchaseReceiveEdit = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [orderDate, setOrderDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [deliveryDate, setDeliveryDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [vendor, setVendor] = useState<string>("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  const addLineItem = () => {
    const newItem: LineItem = {
      id: Date.now(),
      serialno: "",
      itemId: "",
      description: "",
      quantity: 0,
      unitPrice: 0,
      total: 0,
    };
    setLineItems([...lineItems, newItem]);
  };

  const updateLineItem = (
    id: number,
    field: keyof LineItem,
    value: string | number
  ) => {
    setLineItems(
      lineItems.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          if (field === "quantity" || field === "unitPrice") {
            updatedItem.total =
              Number(updatedItem.quantity) * Number(updatedItem.unitPrice);
          }
          return updatedItem;
        }
        return item;
      })
    );
  };

  const removeLineItem = (id: number) => {
    setLineItems(lineItems.filter((item) => item.id !== id));
  };

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => sum + item.total, 0);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New Purchase Receive</h1>
        <p className="text-gray-600 mt-1">Create a new purchase receive</p>
      </div>

      <Card>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="orderNumber">Receive Number</Label>
              <Input
                id="orderNumber"
                // value={orderNumber}
                readOnly
                className="bg-gray-50"
                placeholder="PR-0001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orderDate"> Date</Label>
              <Input
                id="orderDate"
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor</Label>
              <Select onValueChange={setVendor} value={vendor}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Vendor A</SelectItem>
                  <SelectItem value="2">Vendor B</SelectItem>
                  <SelectItem value="3">Vendor C</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ordernumber">Requisiton/Order #</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select order number" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">PO-0001</SelectItem>
                  <SelectItem value="2">PO-0002</SelectItem>
                  <SelectItem value="3">PO-0003</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold"> Items</h3>
              <Button onClick={addLineItem} className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> Add Item
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Input
                        value={item.serialno}
                        onChange={(e) =>
                          updateLineItem(item.id, "serialno", e.target.value)
                        }
                        placeholder="Serial Number"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={item.itemId}
                        onValueChange={(value) =>
                          updateLineItem(item.id, "itemId", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Item A</SelectItem>
                          <SelectItem value="2">Item B</SelectItem>
                          <SelectItem value="3">Item C</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.description}
                        onChange={(e) =>
                          updateLineItem(item.id, "description", e.target.value)
                        }
                        placeholder="Description"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateLineItem(
                            item.id,
                            "quantity",
                            Number(e.target.value)
                          )
                        }
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateLineItem(
                            item.id,
                            "unitPrice",
                            Number(e.target.value)
                          )
                        }
                        className="w-32"
                      />
                    </TableCell>
                    <TableCell>{item.total.toFixed(2)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLineItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {lineItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      No items added yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {lineItems.length > 0 && (
              <div className="mt-4 flex justify-end">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-lg font-semibold">
                    Total: {calculateTotal().toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button>Create Purchase Receive</Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PurchaseReceiveEdit;
