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
import moduleModel from "@/Interfaces/moduleModel";



const ModuleCreateList = () => {
  const { token, role } = useSelector(
    (state: RootState) => state.userAuthStore
  );
  const [module, setModule] = useState<moduleModel[]>([]);
  const navigate = useNavigate();

  const fetcModules = async () => {
    try {
      const response = await fetch(variables.API_URL + "ModuleItems", {
        headers: {
          'Content-Type': 'application/json',
          
        }
      });
      if (response.ok) {
        const data = await response.json();
        console.log(data);
        if (Array.isArray(data)) {
          const formattedData = data.map((item: any) => ({
            moduleId: item.moduleItemId ?? item.moduleItemId,
            moduleItemName: item.moduleItemName ?? item.moduleItemName,
            moduleItemOrder: item.moduleItemOrder ?? item.moduleItemOrder,
            

          }));
          setModule(formattedData);

        } else {
          throw new Error("Unexpected data structure");
        }
      } else {
        throw new Error("Failed to fetch Module");
      }
    } catch (error) {
      console.error("Error fetching Module:", error);
    } finally {
    }
  };

  useEffect(() => {
    fetcModules();
  }, []);

  const handleEdit = (ModuleId: number) => {
    navigate(`/users/module/${ModuleId}`);
  };
  const handleDelete = async (ModuleId: number) => {
    try {
      const response = await fetch(
        `${variables.API_URL}ModuleItems/delete-module/${ModuleId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            // Add authorization header if needed
            "Authorization": `Bearer ${token}`
          }
        }
      );
  
      if (response.ok) {
        // Remove deleted module from state
        setModule(prev => prev.filter(module => module.moduleId !== ModuleId));
        alert('Module deleted successfully!');
      } else {
        const errorData = await response.json();
        if (response.status === 404) {
          throw new Error('Module not found');
        }
        throw new Error(errorData.message || 'Failed to delete module');
      }
    } catch (error) {
      console.error('Error deleting module:', error);
      alert(error.message || 'An error occurred while deleting the module');
    }
    fetcModules();
  };
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Create Module</h1>
        <p className="text-gray-600 mt-1">Add a new Module to the system</p>
      </div>

      <Card>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Modules List</h3>
            <Button
              onClick={() => navigate("/users/module/new")}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Add Module
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Module Name</TableHead>
                <TableHead>Module Order</TableHead>
                <TableHead className="text-right"> Action</TableHead>


              </TableRow>
            </TableHeader>
            <TableBody>
              {module.map((modules) => (
                <TableRow key={modules.moduleId}>
                  <TableCell>{modules.moduleItemName}</TableCell>
                  <TableCell>{modules.moduleItemOrder}</TableCell>
                 
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(modules.moduleId)}
                        title="Edit Resource"

                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(modules.moduleId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>

                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default ModuleCreateList;
