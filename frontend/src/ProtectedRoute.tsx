// src/ProtectedRoute.tsx
import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";
import { RootState } from "./Storage/Redux/store";
import { setLoggedInUser, clearLoggedInUser } from "./Storage/Redux/userAuthSlice";
import { decodeJwtToken, UserToken } from "./Utility/jwt-utils";

const ProtectedRoute: React.FC = () => {
  const dispatch = useDispatch();
  const { token } = useSelector((state: RootState) => state.userAuthStore);
  const [isChecking, setIsChecking] = useState(true);
  const currentTime = Date.now() / 1000;

  useEffect(() => {
    // 1) Try to read from sessionStorage only (no localStorage fallback)
    // const sessionToken = sessionStorage.getItem("authToken");
    // const sessionRefresh = sessionStorage.getItem("refreshToken");

     const sessionToken = localStorage.getItem("authToken");
    const sessionRefresh = localStorage.getItem("refreshToken");
    // If Redux already has a token (e.g. after a fresh login), skip rehydration.
    if (token) {
      setIsChecking(false);
      return;
    }

    // If there's no session token, user must log in fresh
    if (!sessionToken) {
      dispatch(clearLoggedInUser());
      setIsChecking(false);
      return;
    }

    // Otherwise, decode & verify expiry
    try {
      const decoded = decodeJwtToken(sessionToken) as UserToken;
      if (decoded.exp < currentTime) {
        // Token expired → clear out sessionStorage & Redux
        sessionStorage.removeItem("authToken");
        sessionStorage.removeItem("refreshToken");
        dispatch(clearLoggedInUser());
      } else {
        // Token still valid → rehydrate Redux
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
      // Malformed token → clear everything
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

  // If Redux now has a valid token, show nested routes. Otherwise redirect to login.
  return token ? <Outlet /> : <Navigate to="/users/login" replace />;
};

export default ProtectedRoute;


