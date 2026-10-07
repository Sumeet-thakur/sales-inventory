import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, X, Upload, Image as ImageIcon } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { variables } from "@/Variables";
import brandModel from "@/Interfaces/brandModel";
import itemGroupModel from "@/Interfaces/itemGroupModel";
import customerCategoryModel from "@/Interfaces/customerCategoryModel";
import unitModel from "@/Interfaces/unitModel";
import itemModel from "@/Interfaces/itemModel";
import { useSelector } from "react-redux";
import { RootState } from "@/Storage/Redux/store";
import { ToastContainer, toast } from "react-toastify";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import "react-toastify/dist/ReactToastify.css";
import useActivityLog from "@/hooks/useActivityLog";
import ExpandableJsonDisplay from "@/hooks/ExpandableJsonDisplay";
import useFormatDateTime from "@/hooks/useFormatDateTime";

interface SellingPrice {
  id: string;
  categoryId: string;
  price: string;
}

const Items = () => {
  const { token } = useSelector((state: RootState) => state.userAuthStore);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States for drop-downs
  const [brands, setBrands] = useState<brandModel[]>([]);
  const [groups, setGroups] = useState<itemGroupModel[]>([]);
  const [customerCategories, setCustomerCategories] = useState<customerCategoryModel[]>([]);
  const [units, setUnits] = useState<unitModel[]>([]);

  // Local state for file upload and preview
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const formatDateTime = useFormatDateTime();

  // Selected values for drop-downs
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [selectedSecondaryUnit, setSelectedSecondaryUnit] = useState("");
  const [loading, setLoading] = useState(true);

  // Main item state
  const [item, setItem] = useState<itemModel>({
    itemName: "",
    itemCode: "",
    itemDescription: "",
    brandId: 0,
    itemGroupId: 0,
    unitId: 0,
    secondaryUnitID: 0,
    conversionFactor: 0,
    purchasePrice: 0,
    weight: 0,
    height: 0,
    length: 0,
    width: 0,
    gstPercentage: 0,
    minimumStock: 0,
    maximumStock: 0,
    startingQuantity: 0,
    imagePath: ""
  });

  // Selling prices state (customer category records)
  const [sellingPrices, setSellingPrices] = useState<SellingPrice[]>([
    { id: "1", categoryId: "", price: "" },
  ]);

  // State for tracking removed customer category IDs (for update)
  const [removedItemCustomerCategoryIds, setRemovedItemCustomerCategoryIds] = useState<string[]>([]);
  const { activityLogs, showActivityLog, toggleActivityLog } = useActivityLog(token);
  // When editing, fetch the existing item data.
  useEffect(() => {
    if (id) {
      fetch(`${variables.API_URL}Item/${id}`, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      })
        .then(async (response) => {
          if (!response.ok) {
            toast.error("Error fetching item.");
            setTimeout(() => navigate("/inventory/items"), 2000);
            return;
          }
          const data = await response.json();

          // Map main item fields.
          setItem({
            itemName: data.itemName,
            itemCode: data.itemCode,
            itemDescription: data.itemDescription,
            brandId: data.brandId,
            itemGroupId: data.itemGroupId,
            unitId: data.unitId,
            secondaryUnitID: data.secondaryUnitID,
            conversionFactor: data.conversionFactor,
            purchasePrice: data.purchasePrice,
            weight: data.weight,
            height: data.height,
            length: data.length,
            width: data.width,
            gstPercentage: data.gstPercentage,
            minimumStock: data.minimumStock || 0,
            maximumStock: data.maximumStock || 0,
            startingQuantity: data.startingQuantity || 0,
            imagePath: data.imagePath,
          });

          // Set drop-down selections.
          setSelectedBrand(data.brandId ? data.brandId.toString() : "");
          setSelectedGroup(data.itemGroupId ? data.itemGroupId.toString() : "");
          setSelectedUnit(data.unitId ? data.unitId.toString() : "");
          setSelectedSecondaryUnit(data.secondaryUnitID ? data.secondaryUnitID.toString() : "");

          // Map the customer categories.
          if (data.itemCustomerCategories && Array.isArray(data.itemCustomerCategories)) {
            let fetched = data.itemCustomerCategories.map((cat: any) => ({
              id: (cat.itemCustomerCatId || cat.ItemCustomerCatId)?.toString() || Date.now().toString(),
              categoryId: (cat.customerCategoryId || cat.CustomerCategoryId)?.toString() || "",
              price: (cat.customerPrice || cat.CustomerPrice)?.toString() || ""
            }));
            // Only add an extra row when creating a new item (no id present)
            if (!id && fetched.length < 2) {
              fetched.push({ id: Date.now().toString(), categoryId: "", price: "" });
            }
            setSellingPrices(fetched);
          }
          // Map image path to a valid URL.
          if (data.imagePath) {
            const relativePath = data.imagePath.startsWith("~/")
              ? data.imagePath.substring(2)
              : data.imagePath;
            const baseUrl = variables.API_URL.replace(/\/api\/?$/, "");
            const mappedImagePath = `${baseUrl.replace(/\/$/, "")}/${relativePath}`;
            setImagePreview(mappedImagePath);
          }
          setIsEditing(true);
          setLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching item:", error);
          toast.error("Error fetching item.");
          setTimeout(() => {
            navigate("/inventory/items");
          }, 2000);
        });
    } else {
      setLoading(false);
    }
  }, [id, token, navigate]);

  // Fetch drop-down data.
  useEffect(() => {
    fetchGroups();
    fetchBrands();
    fetchUnits();
    fetchCustomerCategories();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await fetch(variables.API_URL + "Item/get-groups", {
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setGroups(
            data.map((item: any) => ({
              itemGroupId: item.itemGroupId,
              itemGroupName: item.itemGroupName,
              description: "",
            }))
          );
        } else {
          throw new Error("Unexpected data structure");
        }
      } else {
        throw new Error("Failed to fetch groups");
      }
    } catch (error) {
      console.log("Error fetching groups:", error);
    }
  };

  const fetchBrands = async () => {
    try {
      const response = await fetch(variables.API_URL + "Item/get-brands", {
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setBrands(
            data.map((item: any) => ({
              brandId: item.brandId,
              brandName: item.brandName,
              description: "",
            }))
          );
        } else {
          throw new Error("Unexpected data structure");
        }
      } else {
        throw new Error("Failed to fetch brands");
      }
    } catch (error) {
      console.log("Error fetching brands:", error);
    }
  };

  const fetchUnits = async () => {
    try {
      const response = await fetch(variables.API_URL + "Item/get-units", {
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setUnits(
            data.map((item: any) => ({
              unitId: item.unitId,
              unitName: item.unitName,
              description: "",
            }))
          );
        } else {
          throw new Error("Unexpected data structure");
        }
      } else {
        throw new Error("Failed to fetch units");
      }
    } catch (error) {
      console.log("Error fetching units:", error);
    }
  };

  const fetchCustomerCategories = async () => {
    try {
      const response = await fetch(variables.API_URL + "Item/get-customerCategories", {
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setCustomerCategories(
            data.map((item: any) => ({
              customerCategoryId: item.customerCategoryId,
              customerCategoryName: item.customerCategoryName,
              description: "",
            }))
          );
        } else {
          throw new Error("Unexpected data structure");
        }
      } else {
        throw new Error("Failed to fetch customer categories");
      }
    } catch (error) {
      console.log("Error fetching customer categories:", error);
    }
  };

  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    let errors: { [key: string]: string } = {};

    // Validate main item fields.
    if (!item.itemName.trim()) {
      errors.itemName = "Item Name is required.";
    }
    if (!item.itemCode.trim()) {
      errors.itemCode = "Item Code is required.";
    }
    // if (!item.itemDescription.trim()) {
    //   errors.itemDescription = "Item Description is required.";
    // }
    if (item.purchasePrice <= 0) {
      errors.purchasePrice = "Purchase Price must be greater than zero.";
    }
    // if (item.height <= 0) {
    //   errors.height = "Height must be greater than zero.";
    // }
    // if (item.weight <= 0) {
    //   errors.weight = "weight must be greater than zero.";
    // }
    // if (item.length <= 0) {
    //   errors.length = "length must be greater than zero.";
    // }
    // if (item.width <= 0) {
    //   errors.width = "width must be greater than zero.";
    // }
    if (item.gstPercentage <= 0) {
      errors.gstPercentage = "GSTPercentage must be greater than zero.";
    }
   {/** if (item.maximumStock <= 0) {
      errors.maximumStock = "maximumStock must be greater than zero.";
    }
    if (item.minimumStock <= 0) {
      errors.minimumStock = "minimumStock must be greater than zero.";
    }*/}
    // if (item.startingQuantity < 0) {
    //   errors.startingQuantity = "startingQuantity must be greater than or equal to zero .";
    // }
    if (selectedSecondaryUnit && selectedSecondaryUnit !== "none" && (item.conversionFactor <= 0)) {
      errors.conversionFactor = "conversionFactor must be greater than zero.";
    }

    // Validate drop-down selections.
    if (!selectedUnit) {
      errors.selectedUnit = "Please select a Unit.";
    }
    if (!selectedBrand) {
      errors.selectedBrand = "Please select a Brand.";
    }
    if (!selectedGroup) {
      errors.selectedGroup = "Please select a Group/Category.";
    }

    // Validate customer category entries.
    if (sellingPrices.length === 0) {
      errors.sellingPrices = "At least one customer category is required.";
    } else {
      sellingPrices.forEach((price, index) => {
        if (!price.categoryId.trim()) {
          errors[`sellingPrice-${index}`] = "Customer category is required.";
        }
        if (!price.price.trim() || Number(price.price) <= 0) {
          errors[`price-${index}`] = "Price must be greater than zero.";
        }
      });

      // Check for duplicate customer category selections.
      const categoryIds = sellingPrices
        .map((price) => price.categoryId.trim())
        .filter((id) => id !== "");
      const duplicates = categoryIds.filter(
        (id, index) => categoryIds.indexOf(id) !== index
      );
      if (duplicates.length > 0) {
        errors.sellingPricesDuplicates = "Each customer category must be unique.";
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (field: string, value: string | number) => {
    setItem((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5000000) {
        toast.error("Error Image size should not exceed 5MB destructive");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
      setSelectedFile(file);
    }
  };

  // Remove customer category row.
  const handleRemoveSellingPrice = (id: string) => {
    const priceToRemove = sellingPrices.find((price) => price.id === id);
    // If the record exists on the backend (ID is a small positive number), track it as removed.
    if (priceToRemove && Number(id) > 0 && Number(id) < 1000000000) {
      setRemovedItemCustomerCategoryIds((prev) => [...prev, id]);
    }
    if (sellingPrices.length > 1) {
      setSellingPrices(sellingPrices.filter((price) => price.id !== id));
    }
  };

  const handleAddSellingPrice = () => {
    setSellingPrices([
      ...sellingPrices,
      { id: Date.now().toString(), categoryId: "", price: "" },
    ]);
  };

  const handleSellingPriceChange = (id: string, field: "categoryId" | "price", value: string) => {
    setSellingPrices((prices) =>
      prices.map((price) => (price.id === id ? { ...price, [field]: value } : price))
    );
  };

  // Filter out blank customer category entries.
  const prepareSellingPrices = () => {
    return sellingPrices.filter(
      (price) => price.categoryId.trim() !== "" && price.price.trim() !== ""
    );
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    const formData = new FormData();

    // Append basic item data.
    formData.append("ItemName", item.itemName);
    formData.append("ItemCode", item.itemCode);
    formData.append("ItemDescription", item.itemDescription);
    formData.append("BrandId", selectedBrand);
    formData.append("ItemGroupId", selectedGroup);
    formData.append("UnitId", selectedUnit);
    formData.append("SecondaryUnitID", selectedSecondaryUnit);
    formData.append("ConversionFactor", item.conversionFactor.toString());
    formData.append("PurchasePrice", item.purchasePrice.toString());
    formData.append("Weight", item.weight.toString());
    formData.append("Height", item.height.toString());
    formData.append("Length", item.length.toString());
    formData.append("Width", item.width.toString());
    formData.append("GSTPercentage", item.gstPercentage.toString());
    formData.append("MinimumStock", item.minimumStock.toString());
    formData.append("MaximumStock", item.maximumStock.toString());
    formData.append("StartingQuantity", item.startingQuantity.toString());

    if (selectedFile) {
      formData.append("imageFile", selectedFile);
    }

    // Append valid customer category records.
    const validSellingPrices = prepareSellingPrices();
    validSellingPrices.forEach((price, index) => {
      // If updating and the record already exists, include its ID.
      if (id && Number(price.id) > 0 && Number(price.id) < 1000000000) {
        formData.append(`ItemCustomerCategories[${index}].ItemCustomerCatId`, price.id);
      }
      formData.append(`ItemCustomerCategories[${index}].CustomerCategoryId`, price.categoryId);
      formData.append(`ItemCustomerCategories[${index}].CustomerPrice`, price.price);
    });

    // Append removed customer category IDs if updating.
    if (id && removedItemCustomerCategoryIds.length > 0) {
      removedItemCustomerCategoryIds.forEach((removedId, index) => {
        formData.append(`RemovedItemCustomerCategoryIds[${index}]`, removedId);
      });
    }

    // Determine endpoint and method based on add or update.
    const endpoint = id
      ? `${variables.API_URL}Item/${id}`
      : `${variables.API_URL}Item/AddItem`;
    const method = id ? "PUT" : "POST";

    try {
      const response = await fetch(endpoint, {
        method: method,
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(id ? "Item updated successfully!" : "Item added successfully!");
         setTimeout(() => {
        navigate("/inventory/items");
      }, 2000);
      } else {
        // Handle bad server responses without throwing an error.
        toast.error(data.message || "Failed to submit item.");
      }
     
    } catch (error) {
      console.error("Error submitting item:", error);
      toast.error("Error Failed to submit item.");
      // setTimeout(() => {
      //   navigate("/inventory/items");
      // }, 2000);
    }
  };
  const handleActivityLogToggle = async () => {
    if (id) {
      await toggleActivityLog(id, "Item/activity_log/item");
    }
  };


  if (loading) return <p>Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/inventory/items")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">{id ? "Update Inventory Item" : "New Inventory Item"}</h1>
          <p className="text-gray-600 mt-1">
            {id ? "Update the item details" : "Create a new inventory item"}
          </p>
        </div>
      </div>

      <Card>
        <div className="p-6 space-y-6">
          {/* Image Upload Section */}
          <div className="space-y-4">
            <Label>Item Image</Label>
            <div className="flex items-start gap-6">
              <div
                className={`w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center relative overflow-hidden ${imagePreview ? "border-none" : "border-gray-300"}`}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <div className="space-y-2">
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Image
                </Button>
                <p className="text-sm text-gray-500">
                  Maximum file size: 5MB. Supported formats: JPG, PNG
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="itemName">Item Name</Label>
              <Input
                id="itemName"
                value={item.itemName}
                onChange={(e) => handleChange("itemName", e.target.value)}
                required
              />
              {validationErrors.itemName && (
                <p className="validation-error">{validationErrors.itemName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Item Code</Label>
              <Input
                id="code"
                value={item.itemCode}
                onChange={(e) => handleChange("itemCode", e.target.value)}
                required
              />
              {validationErrors.itemCode && (
                <p className="validation-error">{validationErrors.itemCode}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Item Group/Category</Label>
              <Select value={selectedGroup} onValueChange={(value) => setSelectedGroup(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Group/Category" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.itemGroupId} value={group.itemGroupId.toString()}>
                      {group.itemGroupName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.selectedGroup && (
                <p className="validation-error">{validationErrors.selectedGroup}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Select value={selectedBrand} onValueChange={(value) => setSelectedBrand(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((brand) => (
                    <SelectItem key={brand.brandId} value={brand.brandId.toString()}>
                      {brand.brandName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.selectedBrand && (
                <p className="validation-error">{validationErrors.selectedBrand}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Primary Unit</Label>
              <Select value={selectedUnit} onValueChange={(value) => setSelectedUnit(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Unit" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit.unitId} value={unit.unitId.toString()}>
                      {unit.unitName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.selectedUnit && (
                <p className="validation-error">{validationErrors.selectedUnit}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Secondary Unit</Label>
              <Select
                value={selectedSecondaryUnit || "none"}
                onValueChange={(value) => {
                  if (value === "none") {
                    setSelectedSecondaryUnit("");
                    setItem((prev) => ({ ...prev, conversionFactor: 0 }));
                  } else {
                    setSelectedSecondaryUnit(value);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Secondary Unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key="none" value="none">
                    Select Secondary Unit
                  </SelectItem>
                  {units.map((unit) => (
                    <SelectItem key={unit.unitId} value={unit.unitId.toString()}>
                      {unit.unitName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* {validationErrors.selectedSecondaryUnit && (
                <p className="validation-error">{validationErrors.selectedSecondaryUnit}</p>
              )} */}
            </div>
            {selectedSecondaryUnit && selectedSecondaryUnit !== "none" && (
              <div className="space-y-2" id="conversionFactor">
                <Label htmlFor="conversionFactor">Conversion Factor</Label>
                <Input
                  id="conversionFactor"
                  type="number"
                  value={item.conversionFactor}
                  onChange={(e) => handleChange("conversionFactor", Number(e.target.value))}
                  required
                />
                {validationErrors.conversionFactor && (
                  <p className="validation-error">{validationErrors.conversionFactor}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="purchasePrice">Purchase Price</Label>
              <Input
                id="purchasePrice"
                type="number"
                value={item.purchasePrice}
                onChange={(e) => handleChange("purchasePrice", Number(e.target.value))}
                required
              />
              {validationErrors.purchasePrice && (
                <p className="validation-error">{validationErrors.purchasePrice}</p>
              )}
            </div>

            {/* Dimensions */}
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.01"
                value={item.weight}
                onChange={(e) => handleChange("weight", Number(e.target.value))}
              />
              {validationErrors.weight && (
                <p className="validation-error">{validationErrors.weight}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="height">Height (cm)</Label>
              <Input
                id="height"
                type="number"
                step="0.1"
                value={item.height}
                onChange={(e) => handleChange("height", Number(e.target.value))}
              />
              {validationErrors.height && (
                <p className="validation-error">{validationErrors.height}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="width">Width (cm)</Label>
              <Input
                id="width"
                type="number"
                step="0.1"
                value={item.width}
                onChange={(e) => handleChange("width", Number(e.target.value))}
              />
              {validationErrors.width && (
                <p className="validation-error">{validationErrors.width}</p>
              )}
            </div>
            

            <div className="space-y-2">
              <Label htmlFor="length">Length (cm)</Label>
              <Input
                id="length"
                type="number"
                step="0.1"
                value={item.length}
                onChange={(e) => handleChange("length", Number(e.target.value))}
              />
              {validationErrors.length && (
                <p className="validation-error">{validationErrors.length}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="gstPercentage">GSTPercentage (%)</Label>
              <Input
                id="gstPercentage"
                type="number"
                step="0.1"
                value={item.gstPercentage}
                onChange={(e) => handleChange("gstPercentage", Number(e.target.value))}
              />
              {validationErrors.gstPercentage && (
                <p className="validation-error">{validationErrors.gstPercentage}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="minimumStock">Minimum Stock</Label>
              <Input
                id="minimumStock"
                type="number"
                value={item.minimumStock}
                onChange={(e) => handleChange("minimumStock", Number(e.target.value))}
              />
              {validationErrors.minimumStock && (
                <p className="validation-error">{validationErrors.minimumStock}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="maximumStock">Maximum Stock</Label>
              <Input
                id="maximumStock"
                type="number"
                value={item.maximumStock}
                onChange={(e) => handleChange("maximumStock", Number(e.target.value))}
              />
              {validationErrors.maximumStock && (
                <p className="validation-error">{validationErrors.maximumStock}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="startingQuantity">Starting Quantity</Label>
              <Input
                id="startingQuatity"
                type="number"
                value={item.startingQuantity}
                onChange={(e) => handleChange("startingQuantity", Number(e.target.value))}
                disabled={isEditing}
                readOnly={isEditing}
                className={ isEditing ? " bg-[#b2bec3]" : " " }
              />
              {validationErrors.startingQuantity && (
                <p className="validation-error">{validationErrors.startingQuantity}</p>
              )}
            </div>
          </div>

          {/* Selling Prices Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Selling Prices</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddSellingPrice}>
                <Plus className="w-4 h-4 mr-2" />
                Add Price
              </Button>
            </div>
            <div className="space-y-4">
              {sellingPrices.map((price, index) => (
                <div key={price.id} className="flex gap-4 items-start">
                  <div className="flex-1">
                    <Select
                      value={price.categoryId}
                      onValueChange={(value) =>
                        handleSellingPriceChange(price.id, "categoryId", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer category" />
                      </SelectTrigger>
                      <SelectContent>
                        {customerCategories.map((category) => (
                          <SelectItem
                            key={category.customerCategoryId}
                            value={category.customerCategoryId.toString()}
                          >
                            {category.customerCategoryName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {validationErrors[`sellingPrice-${index}`] && (
                      <p className="validation-error">
                        {validationErrors[`sellingPrice-${index}`]}
                      </p>
                    )}
                    {validationErrors.sellingPricesDuplicates && (
                      <p className="validation-error">{validationErrors.sellingPricesDuplicates}</p>
                    )}
                  </div>
                  <div className="flex-1">
                    <Input
                      type="number"
                      placeholder="Price"
                      value={price.price}
                      onChange={(e) =>
                        handleSellingPriceChange(price.id, "price", e.target.value)
                      }
                    />
                    {validationErrors[`price-${index}`] && (
                      <p className="validation-error">
                        {validationErrors[`price-${index}`]}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveSellingPrice(price.id)}
                    disabled={sellingPrices.length === 1}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="itemDescription">Description</Label>
            <Textarea
              id="itemDescription"
              value={item.itemDescription}
              onChange={(e) => handleChange("itemDescription", e.target.value)}
              rows={4}
            />
            {validationErrors.itemDescription && (
              <p className="validation-error">{validationErrors.itemDescription}</p>
            )}
          </div>

          <div className="flex justify-end gap-4">
            <Button variant="outline" type="button" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>{id ? "Update" : "Create"}</Button>
          </div>
        </div>
      </Card>
      {isEditing && (
        <Card>
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Activity Log</h3>
              <Button onClick={handleActivityLogToggle}>
                {showActivityLog ? "Hide Activity Log" : "Show Activity Log"}
              </Button>
            </div>
            {showActivityLog && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>S No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>User Name</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Old Data</TableHead>
                    <TableHead>New Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activityLogs.map((log, index) => (
                    <TableRow key={log.activityLogId}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{formatDateTime(log.date)}</TableCell>
                      <TableCell>{log.userName}</TableCell>
                      <TableCell>{log.actionType}</TableCell>
                      <TableCell>
                        <ExpandableJsonDisplay jsonData={log.oldData} />
                      </TableCell>
                      <TableCell>
                        <ExpandableJsonDisplay jsonData={log.newData} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </Card>
      )}
      <ToastContainer />
    </div>
  );
};

export default Items;
