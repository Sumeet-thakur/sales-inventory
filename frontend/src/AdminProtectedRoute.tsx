// src/AdminProtectedRoute.tsx
import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";
import { RootState } from "./Storage/Redux/store";
import { setLoggedInUser, clearLoggedInUser } from "./Storage/Redux/userAuthSlice";
import { decodeJwtToken, UserToken } from "./Utility/jwt-utils";

const AdminProtectedRoute: React.FC = () => {
  const dispatch = useDispatch();
  const { token, role } = useSelector((state: RootState) => state.userAuthStore);
  const [isChecking, setIsChecking] = useState(true);
  const currentTime = Date.now() / 1000;

  useEffect(() => {
    if (token) {
      setIsChecking(false);
      return;
    }

    // const sessionToken = sessionStorage.getItem("authToken");
    // const sessionRefresh = sessionStorage.getItem("refreshToken");
     const sessionToken = localStorage.getItem("authToken");
    const sessionRefresh = localStorage.getItem("refreshToken");

    if (!sessionToken) {
      dispatch(clearLoggedInUser());
      setIsChecking(false);
      return;
    }

    try {
      const decoded = decodeJwtToken(sessionToken) as UserToken;
      if (decoded.exp < currentTime) {
        sessionStorage.removeItem("authToken");
        sessionStorage.removeItem("refreshToken");
        dispatch(clearLoggedInUser());
      } else {
        dispatch(
          setLoggedInUser({
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role,
            roleid: decoded.RoleId,
            exp: decoded.exp,
            token: sessionToken,
            refreshToken: sessionRefresh || "",
          })
        );
      }
    } catch {
      // sessionStorage.removeItem("authToken");
      // sessionStorage.removeItem("refreshToken");

      localStorage.removeItem("authToken");
      localStorage.removeItem("refreshToken");
      dispatch(clearLoggedInUser());
    } finally {
      setIsChecking(false);
    }
  }, [dispatch, token]);

  if (isChecking) {
    return <div>Loading...</div>;
  }

  // Only allow “admin” role to proceed
  return token && role?.toLowerCase() === "admin" ? (
    <Outlet />
  ) : (
    <Navigate to="/users/login" replace />
  );
};

export default AdminProtectedRoute;
