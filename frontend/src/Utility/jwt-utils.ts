import { variables } from "@/Variables";
import { jwtDecode } from "jwt-decode";

export interface UserToken {
  userId: string;
  email: string;
  role: string;
  RoleId:string;
  exp:number;
}

export const decodeJwtToken = (token: string): UserToken => {
  const decoded = jwtDecode<{ [key: string]: any }>(token);
  
  return {
    userId: decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"],
    email: decoded.email || decoded.sub,
    role: decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"],
    RoleId: decoded.RoleId,
    exp:decoded.exp
  };
};

export const revoketoken = async (refreshToken: string,token: string) => {
    if (!refreshToken || refreshToken.trim() === "") {
      console.error("Refresh token must be provided");
      return;
    }
  
    try {
      const response = await fetch(variables.API_URL + "Auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ RefreshToken: refreshToken }),
      });
  
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        data = await response.text();
      }
  
      if (!response.ok) {
        console.error("Logout failed:", data);
      } else {
        console.log("Logged out successfully:", data);
      }
    } catch (error) {
      console.error("An error occurred while logging out:", error);
    }
  };
  