import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useNavigate } from "react-router-dom";

const UserRoles = () => {
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
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="roleName">Role Name</Label>
              <Input id="roleName" placeholder="Enter role name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" placeholder="Enter role description" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button>Create Role</Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default UserRoles;
