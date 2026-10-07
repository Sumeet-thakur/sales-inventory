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

const UserRolesList = () => {
  const navigate = useNavigate();
  const roles = [
    {
      id: 1,
      name: "Super Admin",
      description: "Full system access",
      users: 3,
      createdDate: "2024-02-20",
    },
    {
      id: 2,
      name: "Accountant",
      description: "Department management access",
      users: 5,
      createdDate: "2024-02-20",
    },
    {
      id: 3,
      name: "Sales Admin",
      description: "Sales management access",
      users: 12,
      createdDate: "2024-02-20",
    },
    {
      id: 4,
      name: "Warehouse",
      description: "Warehouse Management access",
      users: 12,
      createdDate: "2024-02-20",
    },
    {
      id: 5,
      name: "User",
      description: "Basic system access",
      users: 12,
      createdDate: "2024-02-20",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">User Roles</h1>
          <p className="text-gray-600 mt-1">Manage user roles</p>
        </div>
      </div>

      <Card>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Roles List</h3>
            {/* <Button
              onClick={() => navigate("/users/roles/new")}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Add Role
            </Button> */}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role Name</TableHead>
                <TableHead>Description</TableHead>
                {/* <TableHead>Users</TableHead> */}
                <TableHead>Created Date</TableHead>
                {/* <TableHead className="text-right">Actions</TableHead> */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell>{role.name}</TableCell>
                  <TableCell>{role.description}</TableCell>
                  {/* <TableCell>{role.users}</TableCell> */}
                  <TableCell>{role.createdDate}</TableCell>
                  {/* <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell> */}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default UserRolesList;
