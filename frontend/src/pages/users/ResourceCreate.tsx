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
import { useEffect, useState } from "react";
import { variables } from "@/Variables";
import { useSelector } from "react-redux";
import { RootState } from "@/Storage/Redux/store";

interface Resource {
  ResourceId: number;
  Name: string;
  Action: string;
  Type: string;
}

const ResourceCreate = () => {
//    const { id } = useParams<{ id: string }>();
//   const { token, role } = useSelector(
//     (state: RootState) => state.userAuthStore
//   );
//   const [resource, setResource] = useState<Resource>({
//   ResourceId: 0,

//     Name: "",
//     Action: "",
//     Type: ""
//   });
//   const [validationError, setValidationError] = useState<Record<string, string>>({});
//   const navigate = useNavigate();
//   const [isEditing, setIsEditing] = useState(false);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
//   const handleResourceChange = (
//     e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
//   ) => {
//     const { name, value } = e.target;
//     setResource((prev) => ({
//       ...prev,
//       [name]: value,
//     }));
//     setValidationError(prev => ({ ...prev, [name]: "" }));
//   };

//   const handleTypeChange = (value: string) => {
//     setResource((prev) => ({
//       ...prev,
//       Type: value
//     }));
//     setValidationError(prev => ({ ...prev, Type: "" }));
//   };
//  useEffect(() => {
//     if (id) {
//       const fetchUser = async () => {
//         setLoading(true);
//         setError("");
//         try {
//           // or your token storage
//         const response = await fetch(`${variables.API_URL}Resources/get-resource/${id}`, {
//           headers: {
//             "Authorization": `Bearer ${token}`, // Add Bearer token
//             "Content-Type": "application/json" // Optional: if your API requires it
//           }
//         });
//           if (response.ok) {
//             const data = await response.json();
//             setResource({
//               ResourceId: data.resourceId,
//               Name: data.name || "",
//               Action: data.action || "",
//               Type: data.type || "",
              
//             });
//             setIsEditing(true);
//           } else {
//             throw new Error("Failed to fetch brand details.");
//           }
//         } catch (error) {
//           console.error("Error fetching brand:", error);
//           setError("Error fetching brand details. Please try again later.");
//         } finally {
//           setLoading(false);
//         }
//       };

//       fetchUser();
//     } else {
//       setLoading(false);
//     }
//   }, [id]);
//   const validateForm = () => {
//     const errors: Record<string, string> = {};

//     if (!resource.Name.trim()) {
//       errors.Name = "Name is required";
//     }
//     if (!resource.Action.trim()) {
//       errors.Action = "Action is required";
//     }
//     if (!resource.Type) {
//       errors.Type = "Type is required";
//     }

//     setValidationError(errors);
//     return Object.keys(errors).length === 0;
//   };

//   const handleSubmit = async () => {
//     if (!validateForm()) return;
  
//     try {
//       const url = id ? `${variables.API_URL}Resources/update-resource/${id}`:variables.API_URL + "Resources/add-resource";
//       const method = id ? "PUT":"POST";
  
//       console.log("Request Payload:", resource); 
//       const response = await fetch(url, {
//         method,
//         headers: {
//           'Content-Type': 'application/json',
//           'Authorization': `Bearer ${token}`
//         },
//         body: JSON.stringify(resource), // Ensure this matches the `resource` object
//       });
  
//       if (response.ok) {
//         alert(
//           isEditing
//               ? "Resource updated successfully!"
//               : "Resource created successfully!"
//       );
//         navigate("/users/resources"); 
//       } else {
//         const errorData = await response.json();
//         throw new Error(errorData.message || "Failed to create resource");
//       }
//     } catch (error) {
//       console.error("Error creating resource:", error);
//       alert(error.message || "An error occurred. Please try again.");
//       navigate("/users/resources"); // Fixed typo here
//     }
//   };
//   return (
//     <div className="space-y-6">
//       <div>
//       <h1 className="text-2xl font-semibold">
//           {isEditing ? "Edit Resource" : "Create Resource"}
//         </h1>
//         <p className="text-muted-foreground">
//           {isEditing ? "Update the resource details" : "Add a new resource to the system"}
//         </p>
//       </div>

//       <Card>
//         <div className="p-6 space-y-6">
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             {["Name", "Action","Type"].map((field) => (
//               <div key={field} className="space-y-2">
//                 <Label htmlFor={field.toLowerCase()}>{field}</Label>
//                 <Input
//                   id={field.toLowerCase()}
//                   name={field}
//                   type="text"
//                   placeholder={`Enter ${field}`}
//                   value={resource[field as keyof Resource]}
//                   onChange={handleResourceChange}
//                   autoComplete="off"
//                 />
//                 {validationError[field] && (
//                   <div className="validation-error">{validationError[field]}</div>
//                 )}
//               </div>
//             ))}

            
//           </div>

//           <div className="flex justify-end gap-2">
//             <Button variant="outline" onClick={() => navigate(-1)}>
//               Cancel
//             </Button>
//             <Button onClick={handleSubmit}>
//               {isEditing ? "Update Resource" : "Create Resource"}
//             </Button>
//           </div>
//         </div>
//       </Card>
//     </div>
//   );
};

export default ResourceCreate;