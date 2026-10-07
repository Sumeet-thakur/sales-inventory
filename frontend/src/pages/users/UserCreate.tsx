import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { variables } from "@/Variables";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { RootState } from "@/Storage/Redux/store";
import { useSelector } from "react-redux";

interface User {
  UserId: string,
  FirstName: string,
  LastName: string,
  EmailAddress: string,
  UserName: string,
  Password: string,
  ConfirmPassword: string,
  Title: string,
  Department: string,
  Role: string
}

const UserCreate = () => {
  const { token, role, roleid } = useSelector
  (
    (state: RootState) => state.userAuthStore
  );
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User>({
    UserId: "",
    FirstName: "",
    LastName: "",
    EmailAddress: "",
    UserName: "",
    Password: "",
    ConfirmPassword: "",
    Title: "",
    Department: "",
    Role: ""
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [validationError, setValidationError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      const fetchUser = async () => {
        setLoading(true);
        setError("");
        try {
          const response = await fetch(`${variables.API_URL}Auth/get-user/${id}`,{
            
              headers: {
                      
                "Authorization": `Bearer ${token}`
              },
            
          });
          if (response.ok) {
            const data = await response.json();
            setUser({
              UserId: data.usersId,
              FirstName: data.firstName || "",
              LastName: data.lastName || "",
              EmailAddress: data.emailAddress || "",
              UserName: data.userName || "",
              Password: "",
              ConfirmPassword: "",
              Title: data.title || "",
              Department: data.department || "",
              Role: data.role || "",
            });
            setIsEditing(true);
          } else {
            // throw new Error("Failed to fetch User details.");
            toast.error("An error occurred while saving the User. Please try again.");
            setTimeout(() => { navigate(-1);}, 2000);
          }
        } catch (error) {
          console.error("Error fetching User:", error);
          // setError("Error fetching User details. Please try again later.");
          toast.error("An error occurred while saving the User. Please try again.");
            setTimeout(() => { navigate(-1);}, 2000);
          
        } finally {
          setLoading(false);
        }
      };

      fetchUser();
    } else {
      setLoading(false);
    }
  }, [id]);

  const handleUserChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setUser((prev) => ({
      ...prev,
      [name]: value,
    }));
    setValidationError(""); // Clear validation error on user input
  };
  const validateForm = () => {
    const errors: any = {};

    if (!user.FirstName.trim()) {
      errors.FirstName = "First Name is required.";
    }
    if (!user.LastName.trim()) {
      errors.LastName = "Last Name is required.";
    }
    if (!user.EmailAddress.trim()) {
      errors.EmailAddress = "Email Address is required.";
    }
    if (user.EmailAddress.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(user.EmailAddress)) {
        errors.email = "Invalid email format.";
      }
    }
    if (!user.UserName.trim()) {
      errors.UserName = "User Name is required.";
    }
    if (!isEditing && (!user.Password.trim())) {
      errors.Password = "Password is required.";
    }
    if (!isEditing && (!user.ConfirmPassword.trim())) {
      errors.ConfirmPassword = "Confirm Password is required.";
    }
    if (!isEditing && (user.Password.trim() !== user.ConfirmPassword.trim())) {
      errors.ConfirmPassword = "Password and Confirm Password do not match.";
    }
    if (!isEditing && (!user.Role || user.Role === "")) {
      errors.Role = "Role is required.";
    }

    setValidationError(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSelectChange = (value) => {
    setUser((prevUser) => ({
      ...prevUser,
      Role: value
    }));
  };

  const handleSubmit = async () => {
  if (!validateForm()) return;
  setLoading(true);

  try {
    const url = id
      ? `${variables.API_URL}Auth/update-user/${id}`
      : `${variables.API_URL}Auth/register-user`;
    const method = id ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(user),
    });

    const data = await response.json();

    if (response.ok) {
      toast.success(isEditing ? "User updated successfully!" : "User created successfully!");
      // optionally navigate or clear form here
       setTimeout(() => { navigate("/users/create");}, 2000);
    }

    // non-OK response
    else if (!response.ok) {
      // display each validation message
      Object.values(data.errors)
        .flat()
        .forEach((msg: string) => toast.error(msg));
      // store errors in state if you need to show them next to fields
      setError(data.errors);
    } else {
      // fallback for other statuses
      //toast.error(data.message || "An unexpected error occurred");
       setTimeout(() => { navigate("/users/create");}, 2000);
    }
  } catch (err: any) {
    console.error("Error saving user:", err);
    toast.error(err.message || "Network error. Please try again.");
     setTimeout(() => { navigate("/users/create");}, 2000);
  } finally {
    setLoading(false);
    {error && (toast.error(error))}
     
    //  setTimeout(() => { navigate("/users/create");}, 2000);
  }
};

   if (loading) return <div>Loading...</div>;
  // if (error) return <div className="error-message">{error}</div>;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{isEditing ? "Edit User" : "Create User"}</h1>
        <p className="text-gray-600 mt-1">{isEditing ? "Update user details" : "Add a new user to the system"}</p>
      </div>

      <Card>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {isEditing ? (
              ["FirstName", "LastName", "UserName", "EmailAddress","Department","Title"].map((field) => (
                <div key={field} className="space-y-2">
                  <Label htmlFor={field.toLowerCase()}>
                    {field.replace(/([A-Z])/g, " $1").trim()}
                  </Label>
                  <Input
                    id={field.toLowerCase()}
                    name={field}
                    type="text"
                    placeholder={`Enter ${field.replace(/([A-Z])/g, " $1")}`}
                    value={(user as any)[field]}
                    onChange={handleUserChange}
                    autoComplete="off"
                  />
                  {validationError[field] && (
                    <div className="validation-error">{validationError[field]}</div>
                  )}
                </div>
              ))
            ) : (
              ["FirstName", "LastName", "UserName", "EmailAddress", "Password", "ConfirmPassword","Department","Title"].map((field) => (
                <div key={field} className="space-y-2">
                  <Label htmlFor={field.toLowerCase()}>
                    {field.replace(/([A-Z])/g, " $1").trim()}
                  </Label>
                  <Input
                    id={field.toLowerCase()}
                    name={field}
                    type={field.includes("Password") ? "password" : "text"}
                    placeholder={`Enter ${field.replace(/([A-Z])/g, " $1")}`}
                    value={(user as any)[field]}
                    onChange={handleUserChange}
                    autoComplete="off"
                  />
                  {validationError[field] && (
                    <div className="validation-error">{validationError[field]}</div>
                  )}
                </div>
              ))
            )}
            {isEditing ? ("") : (

              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={user.Role} onValueChange={handleSelectChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SuperAdmin">Super Admin</SelectItem>
                  
                    <SelectItem value="Accountant">Accountant</SelectItem>
                    <SelectItem value="SalesAdmin">Sales Admin</SelectItem>
                    <SelectItem value="Warehouse">Warehouse</SelectItem>
                    <SelectItem value="User">User</SelectItem>

                  </SelectContent>
                </Select>
                {validationError['Role'] && <div className="validation-error">{validationError['Role']}</div>}
              </div>)}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {isEditing ? "Update User" : "Create User"}
            </Button>
          </div>
        </div>
      </Card>
       <ToastContainer />
    </div>
  );
};

export default UserCreate;
