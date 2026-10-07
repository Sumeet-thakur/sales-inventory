import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useNavigate, useParams } from "react-router-dom";
import { variables } from "@/Variables";
import { useSelector } from "react-redux";
import { RootState } from "@/Storage/Redux/store";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SellingPriceDetail {
  id: string;
  customerCategoryName: string;
  price: string;
}

interface itemDetailModel {
  itemId: number;
  itemName: string;
  itemCode: string;
  itemDescription: string;
  brandName: string;
  itemGroupName: string;
  unitName: string;
  secondaryUnit: string;
  conversionFactor: number;
  purchasePrice: number;
  weight: number;
  height: number;
  length: number;
  width: number;
  gstPercentage: number;
  minimumStock: number;
  maximumStock: number;
  startingQuantity: number;
  imagePath: string;
  date: string;
}

const ItemsDetail = () => {
  const { token } = useSelector((state: RootState) => state.userAuthStore);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // State for image preview
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Loading state
  const [loading, setLoading] = useState(true);

  // Function to format dates.
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const month = date.toLocaleString("en-US", { month: "short" });
    const day = date.getDate();
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Main item state
  const [item, setItem] = useState<itemDetailModel>({
    itemId: 0,
    itemName: "",
    itemCode: "",
    itemDescription: "",
    brandName: "",
    itemGroupName: "",
    unitName: "",
    secondaryUnit: "",
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
    imagePath: "",
    date: "",
  });

  // Selling prices state
  const [sellingPrices, setSellingPrices] = useState<SellingPriceDetail[]>([
    { id: "", customerCategoryName: "", price: "" },
  ]);

  // Fetch the item details when the component mounts.
  useEffect(() => {
    if (id) {
      fetch(`${variables.API_URL}Item/detail/${id}`, {
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
            itemId: data.itemId,
            itemName: data.itemName,
            itemCode: data.itemCode,
            itemDescription: data.itemDescription,
            brandName: data.brandName,
            itemGroupName: data.itemGroupName,
            unitName: data.unitName,
            secondaryUnit: data.secondaryUnit,
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
            date: formatDate(data.createdOn),
          });

          // Map the customer categories.
          if (data.itemCustomerCategories && Array.isArray(data.itemCustomerCategories)) {
            const fetched = data.itemCustomerCategories.map((cat: any) => ({
              id: (cat.itemCustomerCatId || cat.ItemCustomerCatId)?.toString() || Date.now().toString(),
              customerCategoryName:
                (cat.customerCategoryName || cat.CustomerCategoryName)?.toString() || "",
              price: (cat.customerPrice || cat.CustomerPrice)?.toString() || "",
            }));
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
          setLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching item:", error);
          toast.error("Error fetching item.");
          setTimeout(() => navigate("/inventory/items"), 2000);
        });
    } else {
      setLoading(false);
    }
  }, [id, token, navigate]);

  if (loading) return <p>Loading...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Items Detail</h1>
        <p className="text-gray-600 mt-1">View Item Detail</p>
      </div>

      <Card className="p-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Label className="text-sm font-medium text-gray-700">ID:</Label>
            <Label className="text-sm text-gray-900">{item.itemId}</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Label className="text-sm font-medium text-gray-700">Created Date:</Label>
            <Label className="text-sm text-gray-900">{item.date}</Label>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center space-x-2 mb-4">
          <Label className="text-sm font-medium text-gray-700">Item Name:</Label>
          <Label className="text-sm text-gray-900">{item.itemName}</Label>
        </div>
        <div className="flex items-center space-x-2 mb-4">
          <Label className="text-sm font-medium text-gray-700">Item Code:</Label>
          <Label className="text-sm text-gray-900">{item.itemCode}</Label>
        </div>
        <div className="flex items-center space-x-2 mb-4">
          <Label className="text-sm font-medium text-gray-700">Brand Name:</Label>
          <Label className="text-sm text-gray-900">{item.brandName}</Label>
        </div>
        <div className="flex items-center space-x-2 mb-4">
          <Label className="text-sm font-medium text-gray-700">Item Group Name:</Label>
          <Label className="text-sm text-gray-900">{item.itemGroupName}</Label>
        </div>
        <div className="flex items-center space-x-2 mb-4">
          <Label className="text-sm font-medium text-gray-700">Unit Name:</Label>
          <Label className="text-sm text-gray-900">{item.unitName}</Label>
        </div>
        <div className="flex items-center space-x-2 mb-4">
          <Label className="text-sm font-medium text-gray-700">Secondary Unit:</Label>
          <Label className="text-sm text-gray-900">{item.secondaryUnit}</Label>
        </div>
        <div className="flex items-center space-x-2 mb-4">
          <Label className="text-sm font-medium text-gray-700">Conversion Factor:</Label>
          <Label className="text-sm text-gray-900">{item.conversionFactor}</Label>
        </div>
        <div className="flex items-center space-x-2 mb-4">
          <Label className="text-sm font-medium text-gray-700">Purchase Price:</Label>
          <Label className="text-sm text-gray-900">{item.purchasePrice}</Label>
        </div>
        <div className="flex items-center space-x-2 mb-4">
          <Label className="text-sm font-medium text-gray-700">Weight:</Label>
          <Label className="text-sm text-gray-900">{item.weight}</Label>
        </div>
        <div className="flex items-center space-x-2 mb-4">
          <Label className="text-sm font-medium text-gray-700">Height:</Label>
          <Label className="text-sm text-gray-900">{item.height}</Label>
        </div>
        <div className="flex items-center space-x-2 mb-4">
          <Label className="text-sm font-medium text-gray-700">Length:</Label>
          <Label className="text-sm text-gray-900">{item.length}</Label>
        </div>
        <div className="flex items-center space-x-2 mb-4">
          <Label className="text-sm font-medium text-gray-700">Width:</Label>
          <Label className="text-sm text-gray-900">{item.width}</Label>
        </div>
        <div className="flex items-center space-x-2 mb-4">
          <Label className="text-sm font-medium text-gray-700">GSTPercentage:</Label>
          <Label className="text-sm text-gray-900">{item.gstPercentage}</Label>
        </div>
        <div className="flex items-center space-x-2 mb-4">
          <Label className="text-sm font-medium text-gray-700">Minimum Stock:</Label>
          <Label className="text-sm text-gray-900">{item.minimumStock}</Label>
        </div>
        <div className="flex items-center space-x-2 mb-4">
          <Label className="text-sm font-medium text-gray-700">Maximum Stock:</Label>
          <Label className="text-sm text-gray-900">{item.maximumStock}</Label>
        </div>
        <div className="flex items-center space-x-2 mb-4">
          <Label className="text-sm font-medium text-gray-700">Starting Quantity:</Label>
          <Label className="text-sm text-gray-900">{item.startingQuantity}</Label>
        </div>
        <div className="flex items-center space-x-2 mb-4">
          <Label className="text-sm font-medium text-gray-700">Item Description:</Label>
          <Label className="text-sm text-gray-900">{item.itemDescription}</Label>
        </div>
        </div>
        <div className="mb-4">
          <Label className="block text-sm font-medium text-gray-700">Item Image:</Label>
          {imagePreview && (
            <img src={imagePreview} alt="Item Preview" className="mt-2 w-48 h-48 object-cover" />
          )}
        </div>
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">Selling Prices</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer Category</TableHead>
                <TableHead>Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sellingPrices.map((sp, index) => (
                <TableRow key={index}>
                  <TableCell>{sp.customerCategoryName}</TableCell>
                  <TableCell>{sp.price}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Back
          </Button>
        </div>
      </Card>

      <ToastContainer />
    </div>
  );
};

export default ItemsDetail;
