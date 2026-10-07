import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { variables } from "@/Variables";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import roleModel from "@/Interfaces/roleModel";
import menuRightsModel from "@/Interfaces/menuRightsModel";
import menuModel from "@/Interfaces/menuModel";
import subMenuModel from "@/Interfaces/subMenuModel";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useSelector } from "react-redux";
import { RootState } from "@/Storage/Redux/store";
import useAuthValidation from "@/hooks/useAuthValidation";

const UserRights = () => {
  useAuthValidation();
  const { token } = useSelector((state: RootState) => state.userAuthStore);
  const navigate = useNavigate();

  const [roles, setRoles] = useState<roleModel[]>([]);
  // Using menus only (modules state removed per requirement)
  const [menus, setMenus] = useState<menuModel[]>([]);
  const [subMenus, setSubMenus] = useState<{ [key: number]: subMenuModel[] }>({});
  const [menuRights, setMenuRights] = useState<Record<number, menuRightsModel>>({});
  const [selectedRole, setSelectedRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  type PermissionAction = "chkView" | "chkInsert" | "chkUpdate" | "chkDelete" | "chkPrint"| "chkApprove" | "chkRevise" | "chkVoid";

  // Fetch roles from the API.
  const fetchRoles = async () => {
    try {
      const response = await fetch(variables.API_URL + "RolesRights/get-roles", {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          const formattedData = data.map((item: any) => ({
            roleId: item.Id ?? item.id,
            name: item.Name ?? item.name,
          }));
          setRoles(formattedData);
        } else {
          throw new Error("Unexpected data structure");
        }
      } else {
        throw new Error("Failed to fetch roles");
        navigate('/users/login');
      }
    } catch (error) {
      console.log("Error fetching roles:", error);
    }
  };

  // Fetch menus based on a provided menuId. Skip fetch if already loaded.
  const fetchMenu = async (menuId: number) => {
    if (menus.find((menu) => menu.menuItemId === menuId)) return;
    try {
      const response = await fetch(
        variables.API_URL + `RolesRights/get-rights-menus/${menuId}`,
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setMenus((prev) => [...prev, ...data]);
      }
    } catch (error) {
      console.error("Error fetching menus:", error);
    }
  };

  // Fetch sub menus for a given menuId. Skip if already loaded.
  const fetchSubMenu = async (menuId: number) => {
    if (subMenus[menuId]) return;
    try {
      const response = await fetch(
        variables.API_URL + `RolesRights/get-rights-sub-menus/${menuId}`,
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setSubMenus((prev) => ({ ...prev, [menuId]: data }));
      }
    } catch (error) {
      console.error("Error fetching sub-menus:", error);
    }
  };

  // Fetch rights for a given role.
  const fetchRightsByRole = async (roleId: string) => {
    try {
      const response = await fetch(
        variables.API_URL + `RolesRights/get-rights-by-role/${roleId}`,
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        console.log("Fetched rights:", data);

        // Map the fetched data to the menuRights state.
        const rightsMap = data.reduce((acc: any, right: any) => {
          acc[right.menuItemId] = {
            RoleId: right.roleId,
            MenuItemId: right.menuItemId,
            ModuleItemId: right.moduleItemId,
            chkView: right.chkView,
            chkInsert: right.chkInsert,
            chkUpdate: right.chkUpdate,
            chkDelete: right.chkDelete,
            chkPrint: right.chkPrint,
            chkApprove: right.chkApprove,
            chkRevise: right.chkRevise,
            chkVoid: right.chkVoid,
          };
          return acc;
        }, {});
        console.log("Mapped rights:", rightsMap);
        setMenuRights(rightsMap);
      }
    } catch (error) {
      console.error("Error fetching rights by role:", error);
    }
  };

  useEffect(() => {
    fetchRoles();
    // Fetch menu with menuId 2 as an example.
    fetchMenu(2);
  }, [token]);

  useEffect(() => {
    if (selectedRole) {
      fetchRightsByRole(selectedRole);
    } else {
      setMenuRights({});
    }
  }, [token,selectedRole]);

  // Helper function to check permission for a menu item.
  const hasPermission = (menuItemId: number, action: PermissionAction): boolean => {
    const value = menuRights[menuItemId]?.[action] ?? false;
    console.log(`Permission for ${menuItemId}.${action}:`, value);
    return value;
  };

  // Helper to check if all permissions are selected.
  const isAllSelected = (menuItemId: number): boolean => {
    const rights = menuRights[menuItemId];
    return rights
      ? rights.chkView &&
          rights.chkInsert &&
          rights.chkUpdate &&
          rights.chkDelete &&
          rights.chkPrint &&
          rights.chkApprove &&
          rights.chkRevise &&
          rights.chkVoid
      : false;
  };

  // Handle individual checkbox changes. If chkView is unchecked, reset all other permissions.
  const handlePermissionChange = (
    moduleId: number,
    parentMenuId: number,
    subMenuId: number,
    action: PermissionAction,
    checked: boolean
  ) => {
    if (!selectedRole) {
      toast.error("Please select a role first!");
      return;
    }

    setMenuRights((prev) => {
      const currentRights = prev[subMenuId] || {
        RoleId: selectedRole,
        MenuItemId: subMenuId,
        ModuleItemId: moduleId,
        chkView: false,
        chkInsert: false,
        chkUpdate: false,
        chkDelete: false,
        chkPrint: false,
        chkApprove: false,
        chkRevise: false,
        chkVoid: false,
      };

      // If unchecking chkView, reset all other permissions.
      if (action === "chkView" && !checked) {
        return {
          ...prev,
          [subMenuId]: {
            ...currentRights,
            chkView: false,
            chkInsert: false,
            chkUpdate: false,
            chkDelete: false,
            chkPrint: false,
            chkApproved: false,
            chkRevise: false,
            chkVoid: false,
          },
        };
      } else {
        return {
          ...prev,
          [subMenuId]: {
            ...currentRights,
            [action]: checked,
          },
        };
      }
    });
  };

  // Handle "Select All" changes: update all permission flags at once.
  const handleSelectAllChange = (
    moduleId: number,
    parentMenuId: number,
    subMenuId: number,
    checked: boolean
  ) => {
    if (!selectedRole) {
      toast.error("Please select a role first!");
      return;
    }
    setMenuRights((prev) => {
      const currentRights = prev[subMenuId] || {
        RoleId: selectedRole,
        MenuItemId: subMenuId,
        ModuleItemId: moduleId,
        chkView: false,
        chkInsert: false,
        chkUpdate: false,
        chkDelete: false,
        chkPrint: false,
        chkApprove: false,
        chkRevise: false,
        chkVoid: false,
      };

      return {
        ...prev,
        [subMenuId]: {
          ...currentRights,
          chkView: checked,
          chkInsert: checked,
          chkUpdate: checked,
          chkDelete: checked,
          chkPrint: checked,
          chkApprove: checked,
          chkRevise: checked,
          chkVoid: checked,
        },
      };
    });
  };

  // Save all permissions.
  const handleSaveAll = async () => {
    if (!selectedRole) {
      toast.error("Please select a role first!");
      return;
    }

    const rightsToSave = Object.values(menuRights).filter(
      (right) => right.RoleId === selectedRole
    );

    if (rightsToSave.length === 0) {
      toast.error("No changes detected.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${variables.API_URL}RolesRights/assign-multiple-rights`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify(rightsToSave),
        }
      );

      const responseData = await response.json();
      if (response.ok) {
        toast.success("Permissions saved successfully!");
      } else {
        toast.error(responseData.Message || "Failed to save permissions.");
      }
    } catch (error) {
      console.error("Error saving permissions:", error);
      toast.error("An error occurred while saving. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6 space-y-6">
          <h1 className="text-2xl font-semibold">Roles Rights</h1>
          <p className="text-gray-600 mt-1">
            Manage roles permissions and access rights
          </p>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.roleId} value={role.roleId}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Card className="bg-white shadow-sm border-gray-200">
            <div className="p-6">
              <Tabs
                value={activeTab}
                onValueChange={(tabValue) => {
                  const selectedMenu = menus.find(
                    (m) => m.menuItemName === tabValue
                  );
                  if (selectedMenu) {
                    fetchSubMenu(selectedMenu.menuItemId);
                    setActiveTab(tabValue);
                  }
                }}
              >
                <TabsList className="mb-4">
                  {menus.map((menu) => (
                    <TabsTrigger
                      key={menu.menuItemId}
                      value={menu.menuItemName}
                      disabled={!selectedRole}
                    >
                      {menu.menuItemName}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {menus.map(
                  (menu) =>
                    activeTab === menu.menuItemName && (
                      <TabsContent
                        key={menu.menuItemId}
                        value={menu.menuItemName}
                      >
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Menu Item</TableHead>
                              <TableHead>Select All</TableHead>
                              <TableHead>View</TableHead>
                              <TableHead>Insert</TableHead>
                              <TableHead>Update</TableHead>
                              <TableHead>Delete</TableHead>
                              <TableHead>Print</TableHead>
                              <TableHead>Approve</TableHead>
                              <TableHead>Revise</TableHead>
                              <TableHead>Void</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {subMenus[menu.menuItemId]?.map((submenu) => (
                              <TableRow key={submenu.menuItemId}>
                                <TableCell>{submenu.menuItemName}</TableCell>
                                <TableCell>
                                  <Checkbox
                                    checked={isAllSelected(submenu.menuItemId)}
                                    onCheckedChange={(checked) =>
                                      handleSelectAllChange(
                                        2, // ModuleId (or parentMenuId) based on your logic.
                                        menu.menuItemId,
                                        submenu.menuItemId,
                                        Boolean(checked)
                                      )
                                    }
                                  />
                                </TableCell>
                                {["chkView", "chkInsert", "chkUpdate", "chkDelete", "chkPrint","chkApprove", "chkRevise", "chkVoid"].map(
                                  (action) => (
                                    <TableCell key={action}>
                                      <Checkbox
                                        // Disable non-view checkboxes when chkView is false.
                                        disabled={
                                          action !== "chkView" &&
                                          !hasPermission(submenu.menuItemId, "chkView")
                                        }
                                        checked={hasPermission(
                                          submenu.menuItemId,
                                          action as PermissionAction
                                        )}
                                        onCheckedChange={(checked) =>
                                          handlePermissionChange(
                                            2, // ModuleId (or parentMenuId) based on your logic.
                                            menu.menuItemId,
                                            submenu.menuItemId,
                                            action as PermissionAction,
                                            Boolean(checked)
                                          )
                                        }
                                      />
                                    </TableCell>
                                  )
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TabsContent>
                    )
                )}
              </Tabs>
              <Button onClick={handleSaveAll} disabled={loading}>
                {loading ? "Saving..." : "Save All"}
              </Button>
            </div>
          </Card>
        </div>
      </Card>
      <ToastContainer />
    </div>
  );
};

export default UserRights;
