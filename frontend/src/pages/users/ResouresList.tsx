import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, LockOpenIcon, UserCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { variables } from "@/Variables";
import { useSelector } from "react-redux";
import { RootState } from "../../Storage/Redux/store";
import { SD_Roles } from "@/Utility/SD";

interface Resources {
  ResourceId: number;
  Name: string;
  Action: string;
  Type: string;

}

const ResouresList = () => {
  // const { token, role } = useSelector(
  //   (state: RootState) => state.userAuthStore
  // );
  // const [resources, setResources] = useState<Resources[]>([]);
  // const navigate = useNavigate();

  // const fetcResources = async () => {
  //   try {
  //     const response = await fetch(variables.API_URL + "Resources/get-resources", {
  //       headers: {
  //         'Content-Type': 'application/json',
  //         'Authorization': `Bearer ${token}`
  //       }
  //     });
  //     if (response.ok) {
  //       const data = await response.json();
  //       console.log(data);
  //       if (Array.isArray(data)) {
  //         const formattedData = data.map((item: any) => ({
  //           ResourceId: item.resourceId ?? item.resourceId,
  //           Name: item.name ?? item.name,
  //           Action: item.action ?? item.action,
  //           Type: item.type ?? item.type,

  //         }));
  //         setResources(formattedData);

  //       } else {
  //         throw new Error("Unexpected data structure");
  //       }
  //     } else {
  //       throw new Error("Failed to fetch Users");
  //     }
  //   } catch (error) {
  //     console.error("Error fetching Users:", error);
  //   } finally {
  //   }
  // };

  // useEffect(() => {

  //   if (!token || role !== SD_Roles.SuperAdmin) {
  //     navigate('/users/login');
  //   } else {
  //     fetcResources();
  //   }
  // }, [token, role, navigate]);

  // const handleEdit = (ResourceId: number) => {
  //   navigate(`/users/resources/${ResourceId}`);
  // };
  // return (
  //   <div className="space-y-6">
  //     <div>
  //       <h1 className="text-2xl font-semibold">Create Resource</h1>
  //       <p className="text-gray-600 mt-1">Add a new Resource to the system</p>
  //     </div>

  //     <Card>
  //       <div className="p-6">
  //         <div className="flex justify-between items-center mb-6">
  //           <h3 className="text-lg font-semibold">Resources List</h3>
  //           <Button
  //             onClick={() => navigate("/users/resources/new")}
  //             className="flex items-center gap-2"
  //           >
  //             <Plus className="h-4 w-4" /> Add Resource
  //           </Button>
  //         </div>
  //         <Table>
  //           <TableHeader>
  //             <TableRow>
  //               <TableHead>Name</TableHead>
  //               <TableHead>Action</TableHead>
  //               <TableHead>Type</TableHead>
  //               <TableHead className="text-right">Item Action</TableHead>


  //             </TableRow>
  //           </TableHeader>
  //           <TableBody>
  //             {resources.map((resources) => (
  //               <TableRow key={resources.ResourceId}>
  //                 <TableCell>{resources.Name}</TableCell>
  //                 <TableCell>{resources.Action}</TableCell>
  //                 <TableCell>{resources.Type}</TableCell>
  //                 <TableCell className="text-right">
  //                   <div className="flex justify-end gap-2">
  //                     <Button
  //                       variant="ghost"
  //                       size="icon"
  //                       onClick={() => handleEdit(resources.ResourceId)}
  //                       title="Edit Resource"

  //                     >
  //                       <Pencil className="h-4 w-4" />
  //                     </Button>
  //                     <Button
  //                       variant="ghost"
  //                       size="icon"

  //                     >
  //                       <Trash2 className="h-4 w-4" />
  //                     </Button>
  //                   </div>
  //                 </TableCell>

  //               </TableRow>
  //             ))}
  //           </TableBody>
  //         </Table>
  //       </div>
  //     </Card>
  //   </div>
  // );
};

export default ResouresList;
