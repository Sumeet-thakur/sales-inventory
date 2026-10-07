import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { variables } from "@/Variables";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useSelector } from "react-redux";
import { RootState } from "@/Storage/Redux/store";


interface UserRole {
    UserId: string;
    FirstName: string,
    LastName: string,
    Role: string,

}
interface UserUpdateRole {
    UserId: string;
    Role: string,
}
const UserChangeRole = () => {
    const { token, role, roleid } = useSelector
  (
    (state: RootState) => state.userAuthStore
  );
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [user, setUser] = useState<UserRole>({
        UserId: "",
        FirstName: "",
        LastName: "",
        Role: "",

    });
    const [userUpdateRole, setUserUpdateRole] = useState<UserUpdateRole>({
        UserId: "",
        Role: "",

    });

    const [error, setError] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [validationError, setValidationError] = useState("");



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
                            Role: data.role || "",

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
        if (!userUpdateRole.Role || userUpdateRole.Role === "") {
            errors.Role = "Role is required.";
        }

        setValidationError(errors);
        return Object.keys(errors).length === 0;


    }
    const handleSelectChange = (value) => {
        setUserUpdateRole((prevUser) => ({
            ...prevUser,
            Role: value
        }));
    };
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); // Prevent form submission before validation
    
        if (!validateForm()) return; // Exit if form validation fails
    
        setLoading(true);
        setError('');
    
        try {
            const url = variables.API_URL + `Auth/update-user-role/${id}`;
            const method = "PUT";
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userUpdateRole),
            });
    
            const responseData = await response.json();
    
            if (response.ok && responseData.succeeded) {
                toast.success("Update Role Successful");
                setTimeout(() => { navigate("/users/create");}, 2000);
            } else {
                // Handle server errors or validation errors
                if (responseData.Message) {
                    toast.success(responseData.Message);
                } else if (response.status === 400 && responseData.errors) {
                    const serverErrors = Object.entries(responseData.errors)
                        .map(([field, messages]) => `${field}: ${(messages as string[]).join(', ')}`)
                        .join('\n');
    
                        toast.error(`Validation Errors:\n${serverErrors}`);
                    throw new Error("Please fix the validation errors");
                } else {
                    throw new Error(responseData.Message || "Failed to update user role");
                }
            }
        } catch (err) {
            console.error("Error changing Password:", err);
     
      toast.error("An error occurred while saving the brand. Please try again.");
      setTimeout(() => {
        navigate("/users/create");
      }, 2000);
        } finally {
            setLoading(false);
            navigate("/users/create");
        }
    };
    

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">Change Role</h1>
                <p className="text-gray-600 mt-1">Change {user.FirstName} {user.LastName} Role</p>
            </div>

            <Card className="p-6">

                <div className="space-y-1">
                    <Label htmlFor="currentPassword">Current Role</Label>
                    <Input
                        id="currentRole"
                        name="currentRole"
                        disabled
                        type="text"
                        value={user.Role}

                    />
                </div>


                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label>New Role</Label>
                        <Select value={userUpdateRole.Role} onValueChange={handleSelectChange}>
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
                    </div>
                </div>



                <div className="flex gap-2 justify-end">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate(-1)}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" onClick={handleSubmit}>
                        Save Changes
                    </Button>
                </div>

            </Card>
              <ToastContainer />
        </div>
    );
};

export default UserChangeRole;