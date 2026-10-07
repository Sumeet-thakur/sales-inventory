// src/pages/users/Login.tsx
import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { variables } from "@/Variables";
import { clearLoggedInUser, setLoggedInUser } from "../../Storage/Redux/userAuthSlice";
import { decodeJwtToken, UserToken } from "../../Utility/jwt-utils";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface LoginVM {
  EmailAddress: string;
  Password: string;
}

const Login: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // State for login form
  const [login, setLogin] = useState<LoginVM>({
    EmailAddress: "",
    Password: "",
  });

  // If server tells us “already‐logged‐in,” it also returns a refreshToken.
  // We store that here so we can show “Logout old session” button.
  const [existingRefreshToken, setExistingRefreshToken] = useState<string | null>(null);

  // Loading / error state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // Clear Redux + localStorage on component mount
  useEffect(() => {
    dispatch(clearLoggedInUser());
    localStorage.clear();
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
  }, [dispatch]);

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLogin((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setExistingRefreshToken(null); // Clear any old refresh token from previous attempt

    try {
      const url = variables.API_URL + "Auth/login-user";
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(login),
      });

      if (!response.ok) {
        // Try to parse JSON { message, refreshToken }
        let data: any = {};
        try {
          data = await response.json();
        } catch {
          data = {};
        }

        // If the server specifically said “already logged in,” and sent back a refreshToken:
        if (response.status === 401 && data.refreshToken) {
          setError(data.message || "User is already logged in.");
          setExistingRefreshToken(data.refreshToken);
          toast.error(data.message || "User is already logged in.");
        } else if (response.status === 401) {
          // Just a generic invalid‐credentials or deleted/inactive
          const msg = data.message || "Invalid email or password";
          setError(msg);
          toast.error(msg);
        } else if (response.status === 400) {
          setError("Please fill in all fields");
          toast.error("Please fill in all fields");
        } else {
          const msg = data.message || "Login failed. Please try again.";
          setError(msg);
          toast.error(msg);
        }

        setLoading(false);
        return;
      }

      // Otherwise it was successful
      const data = await response.json();
      const token = data.token as string;
      const refreshToken = data.refreshToken as string;
      const decoded = decodeJwtToken(token);

      // Dispatch to Redux
      dispatch(
        setLoggedInUser({
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role,
          roleid: decoded.RoleId,
          exp: decoded.exp,
          token,
          refreshToken,
        })
      );

      // Store in localStorage (not localStorage)
     
      localStorage.setItem("authToken", token);
      localStorage.setItem("refreshToken", refreshToken);

      // Go to dashboard
      navigate("/", { state: { userToken: decoded } });
    } catch (err: any) {
      const msg = err.message || "An unexpected error occurred";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Called when “Logout existing session” button is clicked
  const handleLogoutOldSession = async () => {
    if (!existingRefreshToken) return;

    try {
      // Call the logout endpoint:
      await fetch(variables.API_URL + "Auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: existingRefreshToken }),
      });

      toast.success("Previous session has been logged out. You can try to sign in again.");
      setExistingRefreshToken(null);
       localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
    } catch (err: any) {
      toast.error("Failed to log out previous session. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md p-6">
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Welcome Back</h1>
            <p className="text-muted-foreground">Please sign in to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emailAddress">Email</Label>
              <Input
                id="emailAddress"
                name="EmailAddress"
                type="email"
                placeholder="Enter your email"
                value={login.EmailAddress}
                onChange={handleLoginChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="Password"
                type="password"
                placeholder="Enter your password"
                value={login.Password}
                onChange={handleLoginChange}
                required
              />
            </div>

            {/* Display generic error if any */}
            {error && <p className="text-red-500 text-sm">{error}</p>}

            <Button
              type="submit"
              className="w-full hover:bg-primary/90"
              disabled={loading}
            >
              {loading ? "Signing In…" : "Sign In"}
            </Button>
          </form>

          {/* If the server told us “already logged in” and gave us a refreshToken,
              show a button to let the user log out that session. */}
          {existingRefreshToken && (
            <div className="mt-4">
              <p className="text-yellow-700 text-sm mb-2">
                It looks like you’re already logged in somewhere else.
              </p>
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleLogoutOldSession}
                disabled={loading}
              >
                Logout previous session
              </Button>
            </div>
          )}
        </div>
      </Card>
      <ToastContainer />
    </div>
  );
};

export default Login;
