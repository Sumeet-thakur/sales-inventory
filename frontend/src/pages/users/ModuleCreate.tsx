import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import moduleModel from "@/Interfaces/moduleModel";
import { variables } from "@/Variables";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "@/Storage/Redux/store";

const ModuleCreate = () => {
  const { id } = useParams<{ id: string }>();
    const { token, role } = useSelector(
    (state: RootState) => state.userAuthStore
  );

  const [module, setModule] = useState<moduleModel>({
    moduleId: 0,
    moduleItemName: "",
    moduleItemOrder: 0
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [validationError, setValidationError] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      const fetchModule = async () => {
        setLoading(true);
        setError("");
        try {
          const response = await fetch(`${variables.API_URL}ModuleItems/get-module/${id}`,{
            headers: {
                    
              "Authorization": `Bearer ${token}`
            },
          });
          if (response.ok) {
            const data = await response.json();
            setModule({
              moduleId: data.moduleId,
              moduleItemName: data.moduleItemName,
              moduleItemOrder: data.moduleItemOrder
            });
            setIsEditing(true);
          } else {
            throw new Error("Failed to fetch module details.");
          }
        } catch (error) {
          console.error("Error fetching module:", error);
          setError("Error fetching module details. Please try again later.");
        } finally {
          setLoading(false);
        }
      };
      fetchModule();
    } else {
      setLoading(false);
    }
  }, [id]);

  const handleModuleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setModule((prev) => ({
      ...prev,
      [name]: name === "moduleOrder" ? Number(value) : value,
    }));
    setValidationError((prev) => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!module.moduleItemName.trim()) {
      errors.moduleName = "Module Name is required.";
    }
    if (!module.moduleItemOrder || module.moduleItemOrder <= 0) {
      errors.moduleOrder = "Module Order must be a positive number.";
    }

    setValidationError(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const url = id
        ? `${variables.API_URL}ModuleItems/update-module/${id}`
        : `${variables.API_URL}ModuleItems/create-module`;
      const method = id ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
           "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(module),
      });

      const responseData = await response.json();

      if (response.ok) {
        alert(
          isEditing
            ? "Module updated successfully!"
            : "Module created successfully!"
        );
        navigate("/users/modules");
      } else {
        if (response.status === 400 && responseData.errors) {
          const serverErrors = Object.entries(responseData.errors)
            .reduce((acc, [field, messages]) => ({
              ...acc,
              [field]: (messages as string[]).join(', ')
            }), {} as Record<string, string>);
          
          setValidationError(serverErrors);
          throw new Error("Please fix the validation errors");
        }
        throw new Error(responseData.message || "Failed to save module");
      }
    } catch (error) {
      console.error("Error saving module:", error);
      alert("An error occurred while saving the module. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{isEditing ? "Edit Module" : "Create Module"}</h1>
        <p className="text-gray-600 mt-1">{isEditing ? "Update module details" : "Add a new module"}</p>
      </div>

      <Card>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="module-name">Module Name</Label>
              <Input
                id="module-name"
                name="moduleItemName"
                placeholder="Enter Module name"
                value={module.moduleItemName}
                onChange={handleModuleChange}
                required
              />
              {validationError.moduleName && (
                <div className="text-red-500 text-sm">{validationError.moduleName}</div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="module-order">Module Order</Label>
              <Input
                id="module-order"
                name="moduleItemOrder"
                type="number"
                placeholder="Enter Module order"
                value={module.moduleItemOrder}
                onChange={handleModuleChange}
                required
              />
              {validationError.moduleOrder && (
                <div className="text-red-500 text-sm">{validationError.moduleOrder}</div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Processing..." : isEditing ? "Update Module" : "Create Module"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ModuleCreate;