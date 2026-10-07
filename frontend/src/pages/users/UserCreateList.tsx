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
import { Plus, Pencil, Trash2, LockOpenIcon, UserCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { variables } from "@/Variables";
import { useSelector } from "react-redux";
import { RootState } from "../../Storage/Redux/store";
import { useTableControls } from "@/hooks/useTableControls";
import { SearchControl, PaginationControl } from "@/hooks/TableControls";
import { SortableHeader } from "@/hooks/SortableHeader";
import { SD_Roles } from "@/Utility/SD";

interface User {
  Index: number;
  UsersId: number;
  UserName: string;
  FirstName: string;
  LastName: string;
  EmailAddress: string;
  Role: string;
}

const UserCreateList = () => {
  const { token, role } = useSelector(
    (state: RootState) => state.userAuthStore
  );
  const [users, setUsers] = useState<User[]>([]);
  const navigate = useNavigate();

  const fetchUsers = async () => {
    try {
      const response = await fetch(variables.API_URL + "Auth/users-list", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        console.log(data);
        if (Array.isArray(data)) {
          const formattedData = data.map((item: any) => ({
            Index: item.Index ?? item.index,
            UsersId: item.usersId ?? item.usersId,
            FirstName: item.firstName ?? item.firstName,
            LastName: item.lastName ?? item.lastName,
            UserName: item.userName ?? item.userName,
            EmailAddress: item.emailAddress ?? item.emailAddress,
            Role: item.role ?? item.role,
          }));
          setUsers(formattedData);
        } else {
          throw new Error("Unexpected data structure");
        }
      } else {
        throw new Error("Failed to fetch Users");
      }
    } catch (error) {
      console.error("Error fetching Users:", error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEdit = (UserId: number) => {
    navigate(`/users/create/${UserId}`);
  };

  const handleUpdatePassword = (UserId: number) => {
    if (role !== SD_Roles.SuperAdmin) {
      navigate(`/users/changepassword/${UserId}`);
    } else {
      navigate(`/users/changepasswordbyAdmin/${UserId}`);
    }
  };

  const handleUpdateRole = (UserId: number) => {
    navigate(`/users/changerole/${UserId}`);
  };

  const handleDelete = async (UserId: number) => {
      if (window.confirm("Are you sure you want to delete this User?")) {
        try {
          const response = await fetch(`${variables.API_URL}Auth/delete-user/${UserId}`, {
            method: "DELETE",
            headers: {
              "Authorization": `Bearer ${token}`
            },
          });
          if (response.ok) {
            console.log("User deleted successfully");
            setUsers((prev) => prev.filter((user) => user.UsersId !== UserId));
          } else {
            console.error("Failed to delete User");
          }
        } catch (error) {
          console.error("Error deleting User:", error);
        }
        fetchUsers();
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
  } = useTableControls<User>(users, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Create User</h1>
        <p className="text-gray-600 mt-1">Add a new user to the system</p>
      </div>

      <Card>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Users List</h3>
            {role === SD_Roles.SuperAdmin && (
                        <>
                         <Button
              onClick={() => navigate("/users/create/new")}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Add User
            </Button>
                        </>
                      )}
           
          </div>
          {/* Search at the top */}
          <SearchControl
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            placeholder="Search User..."
          />
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
                    onClick={() => handleSort("FirstName")}
                    sortDirection={
                      sortConfig?.key === "FirstName"
                        ? sortConfig.direction
                        : null
                    }
                    isActive={sortConfig?.key === "FirstName"}
                  >
                    First Name
                  </SortableHeader>
                </TableHead>
                <TableHead>
                  <SortableHeader
                    onClick={() => handleSort("LastName")}
                    sortDirection={
                      sortConfig?.key === "LastName"
                        ? sortConfig.direction
                        : null
                    }
                    isActive={sortConfig?.key === "LastName"}
                  >
                    Last Name
                  </SortableHeader>
                </TableHead>
                <TableHead>
                  <SortableHeader
                    onClick={() => handleSort("UserName")}
                    sortDirection={
                      sortConfig?.key === "UserName"
                        ? sortConfig.direction
                        : null
                    }
                    isActive={sortConfig?.key === "UserName"}
                  >
                    User Name
                  </SortableHeader>
                </TableHead>
                <TableHead>
                  <SortableHeader
                    onClick={() => handleSort("EmailAddress")}
                    sortDirection={
                      sortConfig?.key === "EmailAddress"
                        ? sortConfig.direction
                        : null
                    }
                    isActive={sortConfig?.key === "EmailAddress"}
                  >
                    Email
                  </SortableHeader>
                </TableHead>
                <TableHead>
                  <SortableHeader
                    onClick={() => handleSort("Role")}
                    sortDirection={
                      sortConfig?.key === "Role"
                        ? sortConfig.direction
                        : null
                    }
                    isActive={sortConfig?.key === "Role"}
                  >
                    Role
                  </SortableHeader>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((user) => (
                <TableRow key={user.UsersId}>
                  <TableCell>{user.Index}</TableCell>
                  <TableCell>{user.FirstName}</TableCell>
                  <TableCell>{user.LastName}</TableCell>
                  <TableCell>{user.UserName}</TableCell>
                  <TableCell>{user.EmailAddress}</TableCell>
                  <TableCell>{user.Role}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(user.UsersId)}
                        title="Edit User"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {role === SD_Roles.SuperAdmin && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete User"
                              onClick={() => handleDelete(user.UsersId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleUpdatePassword(user.UsersId)}
                        title="Update Password"
                      >
                        <LockOpenIcon className="h-4 w-4" />
                      </Button>
                      {role === SD_Roles.SuperAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleUpdateRole(user.UsersId)}
                          title="Update Role"
                        >
                          <UserCheck className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <PaginationControl
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              totalPages={totalPages}
            />
          )}
        </div>
      </Card>
    </div>
  );
};

export default UserCreateList;
