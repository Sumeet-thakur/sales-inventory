import { useState } from "react";
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
import { Pencil, Eye, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SalesOrderList = () => {
  const navigate = useNavigate();

  const [orders] = useState([
    {
      id: 1,
      refNo: "SO-001",
      date: "2024-02-20",
      customer: "ABC Corp",
      amount: 5000,
      status: "Pending",
    },
    {
      id: 2,
      refNo: "SO-002",
      date: "2024-02-19",
      customer: "XYZ Ltd",
      amount: 7500,
      status: "Completed",
    },
    {
      id: 3,
      refNo: "SO-003",
      date: "2024-02-18",
      customer: "123 Industries",
      amount: 3200,
      status: "Processing",
    },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Sales Orders</h1>
          <p className="text-gray-600 mt-1">Manage sales orders</p>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Sales Orders List</h3>
          <Button
            onClick={() => navigate("/sales/order/new")}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add Sales Order
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference No</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>{order.refNo}</TableCell>
                <TableCell>{order.date}</TableCell>
                <TableCell>{order.customer}</TableCell>
                <TableCell>PKR {order.amount}</TableCell>
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
      </Card>
    </div>
  );
};

export default SalesOrderList;
