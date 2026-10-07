import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { variables } from "@/Variables";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useSelector } from "react-redux";
import { RootState } from "@/Storage/Redux/store";

interface User {
  UserId: string;
  FirstName: string,
  LastName: string,
 
}
interface UserPassword {
  UserId: string;
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}
const UserChangePassword = () => {
  const { token } = useSelector((state: RootState) => state.userAuthStore);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User>({
    UserId: "",
    FirstName: "",
    LastName: "",
   
  });
  const [userpassword, setUserPassword] = useState<UserPassword>({
    UserId: "",
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [validationError, setValidationError] = useState("");

  const handlePasswordChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setUserPassword((prev) => ({
      ...prev,
      [name]: value,
    }));
    setValidationError(""); // Clear validation error on user input
  };

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
              
            });
            setIsEditing(true);
          } else {
            throw new Error("Failed to fetch brand details.");
          }
        } catch (error) {
          console.error("Error fetching brand:", error);
          setError("Error fetching brand details. Please try again later.");
        } finally {
          setLoading(false);
        }
      };

      fetchUser();
    } else {
      setLoading(false);
    }
  }, [id]);
  const validateForm = () => {
    const errors: any = {};
    if (!userpassword.currentPassword.trim()) {
        errors.FirstName = "Current Password is required.";
    }
    if (!userpassword.newPassword.trim()) {
        errors.LastName = "New Password is required.";
    }
    if (!userpassword.confirmNewPassword.trim()) {
        errors.LastName = "Confirm Password is required.";
    }

    setValidationError(errors);
    return Object.keys(errors).length === 0;
}

  const handleSubmit = async (e: React.FormEvent) => {
    if (!validateForm()) return;
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
        const url = variables.API_URL + `Auth/update-user-password/${id}`;
        const method = "PUT";
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(userpassword),
        });

        

        const responseData = await response.json();
    
        if (response.ok && responseData.succeeded) {
            toast.success("Update Password Successful");
            setTimeout(() => { navigate("/users/create");}, 2000);
        } else {
            // Handle server errors or validation errors
            if (responseData.Message) {
                toast.error(responseData.Message);
            } else if (response.status === 400 && responseData.errors) {
                const serverErrors = Object.entries(responseData.errors)
                    .map(([field, messages]) => `${field}: ${(messages as string[]).join(', ')}`)
                    .join('\n');

                    toast.error(`Validation Errors:\n${serverErrors}`);
                throw new Error("Please fix the validation errors");
            } else {
                throw new Error(responseData.Message || "Failed to update user password");
            }
        }
    } catch (err) {
      console.error("Error changing Password:", error);
      toast.error("An error occurred while saving the user. Please try again.");
      navigate("/users/create");
    } finally {
      setLoading(false);
      navigate("/users/create");
  }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Change Password</h1>
        <p className="text-gray-600 mt-1">Change {user.FirstName} {user.LastName} Password</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
               id="currentPassword"
               name="currentPassword"
               placeholder="Enter Current Password"
               type="password"
               value={userpassword.currentPassword}
               onChange={handlePasswordChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              name="newPassword"
               type="password"
              placeholder="Enter New Password"
              value={userpassword.newPassword}
              onChange={handlePasswordChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              name="confirmNewPassword"
               type="password"
              placeholder="Enter Confirm Password"
              value={userpassword.confirmNewPassword}
              onChange={handlePasswordChange}
            />
          </div>



          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              >
              Cancel
            </Button>
            <Button type="submit" >
              Save Changes
            </Button>
          </div>
        </form>
      </Card>
      <ToastContainer />
    </div>
  );
};

export default UserChangePassword;