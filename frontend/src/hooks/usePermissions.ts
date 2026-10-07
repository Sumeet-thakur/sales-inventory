import { useEffect, useState } from "react";
import { variables } from "@/Variables";
import { useSelector } from "react-redux";
import { RootState } from "@/Storage/Redux/store";

interface Permission {
  menuItemId: number;
  chkView: boolean;
  chkInsert: boolean;
  chkUpdate: boolean;
  chkDelete: boolean;
  chkPrint: boolean;
  chkApprove: boolean,
  chkRevise: boolean,
  chkVoid: boolean,
}

interface UsePermissionsResult {
  permissions: Permission[];
  loading: boolean;
  error: Error | null;
  hasPermission: (menuItemId: number, action: string) => boolean;
}

export const usePermissions = (roleId: string): UsePermissionsResult => {
  const { token } = useSelector((state: RootState) => state.userAuthStore);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPermissions = async () => {
    try {
        const response = await fetch(
            variables.API_URL + `RolesRights/get-rights-by-role/${roleId}`,
            {
              
              headers: {
                
                "Authorization": `Bearer ${token}`
              },
            }
          );
      if (response.ok) {
        const data: Permission[] = await response.json();
        setPermissions(data);
      } else {
        throw new Error("Failed to fetch permissions");
      }
    } catch (error) {
      setError(error instanceof Error ? error : new Error("An unknown error occurred"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (roleId) {
      fetchPermissions();
    }
  }, [roleId]);

  const hasPermission = (menuItemId: number, action: string): boolean => {
    const permission = permissions.find((p) => p.menuItemId === menuItemId);
    if (!permission) return false;

    switch (action) {
      case "view":
        return permission.chkView;
      case "create":
        return permission.chkInsert;
      case "update":
        return permission.chkUpdate;
      case "delete":
        return permission.chkDelete;
      case "print":
        return permission.chkPrint;
        case "approve":
          return permission.chkApprove;
        case "revise":
          return permission.chkRevise;
        case "void":
          return permission.chkVoid;
      default:
        return false;
    }
  };

  return { permissions, loading, error, hasPermission };
};