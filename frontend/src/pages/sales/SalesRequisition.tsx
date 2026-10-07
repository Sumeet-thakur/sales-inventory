import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, RefreshCw, FilePlus } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { variables } from "@/Variables";
import { useSelector } from "react-redux";
import { RootState } from "@/Storage/Redux/store";
import useAuthValidation from "@/hooks/useAuthValidation";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import useLocalDateString from "@/hooks/useLocalDateString";
import { useFileAttachments } from "@/hooks/useFileAttachments";

// ------------------------------------------------------------------------
// Updated Interfaces for Request Model.
interface ISalesRequisitionRequest {
  RefNo: string;
  Date: string;
  CustomerID: number;
  SellerID: number;
  StatusId: number;
  CustomerChildID: number;
  Description: string;
  TotalQuantity: number;
  SalesRequisitionChildRequests: ISalesRequisitionChildRequest[];
  salesRequisitionChildFilesRequests: ISalesRequisitionChildFilesRequest[];

}

interface ISalesRequisitionChildRequest {
  SalesRequisitionChildID: number;
  SalesRequisitionID: number;
  ItemID: number;
  Quantity: number;
  UnitId?: number;
  ConversionFactor?: number;
  IsSecondaryUnit?: boolean;
  ChildTotalQuantity?: number;
  UnitComposite?: number;
}

interface ISalesRequisitionChildFilesRequest {
  SalesRequisitionChildFileID: number;
  SalesRequisitionID: number;
  FilePath: string;
  Referenceno: string;
}

// ------------------------------------------------------------------------
// Other interfaces for component state.
interface itemModel {
  itemId: number;
  itemName: string;
}

interface customersModel {
  customerId: number;
  customerName: string;
}

interface sellersModel {
  sellerId: number;
  sellerName: string;
}

interface UploadedFile {
  id: number;
  file: File;
  referenceno: string;
}

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  items: itemModel[];
  placeholder?: string;
}
interface MultipleAttachmentVM { multipleAttachmentfileId: number; fileName: string; filePath: string; referenceno: string; }

interface SearchableSelectPropsforCustomer {
  value: string;
  onValueChange: (value: string) => void;
  customers: customersModel[];
  placeholder?: string;
}

// The ItemUnit interface includes an index, unitId, a flag for secondary units, and a name.
interface ItemUnit {
  index: number;
  unitId: number;
  isSecondaryUnit: boolean;
  unitName?: string;
}

// ------------------------------------------------------------------------
// SearchableSelect Component – allows user to search through items.
const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onValueChange,
  items,
  placeholder = "Select Item",
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const filteredItems = items.filter((itm) =>
    itm.itemName.toLowerCase().includes(searchQuery.toLowerCase())
  );
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent side="bottom" className="max-h-60 overflow-y-auto">
        <div className="p-2">
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {filteredItems.map((itm) => (
          <SelectItem key={itm.itemId} value={itm.itemId.toString()}>
            {itm.itemName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

// SearchableSelect Component for Customer.
const SearchableSelectforCustomer: React.FC<SearchableSelectPropsforCustomer> = ({
  value,
  onValueChange,
  customers,
  placeholder = "Select Customer",
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const filteredCustomers = customers.filter((itm) =>
    itm.customerName.toLowerCase().includes(searchQuery.toLowerCase())
  );
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent side="bottom" className="max-h-60 overflow-y-auto">
        <div className="p-2">
          <Input
            placeholder="Search Customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {filteredCustomers.map((itm) => (
          <SelectItem key={itm.customerId} value={itm.customerId.toString()}>
            {itm.customerName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

// ------------------------------------------------------------------------

const SalesRequisition = () => {
  useAuthValidation();
  const { token } = useSelector((state: RootState) => state.userAuthStore);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
   const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation state.
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  // State for SalesRequisitionRequest.
  const [salesRequisitionRequest, setSalesRequisitionRequest] = useState<ISalesRequisitionRequest>({
    RefNo: "",
    Date: new Date().toISOString().split("T")[0],
    CustomerID: 0,
    SellerID: 0,
    StatusId: 1,
    CustomerChildID: 0,
    Description: "",
    TotalQuantity: 0,
    SalesRequisitionChildRequests: [],
    salesRequisitionChildFilesRequests: [],

  });

  // Local state for items, customers, sellers, and available units.
  const [items, setItems] = useState<itemModel[]>([]);
  const [itemUnit, setItemUnit] = useState<{ [key: number]: ItemUnit[] }>({});
  const [customers, setCustomers] = useState<customersModel[]>([]);
  const [sellers, setSellers] = useState<sellersModel[]>([]);
  const [filesState, setFilesState] = useState<UploadedFile[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const formatForPayload = useLocalDateString();
  const [requisitionDate, setRequisitionDate] = useState<Date>(() => {
    // parse initial YYYY-MM-DD into a Date
    const [y, m, d] = salesRequisitionRequest.Date.split("-");
    return new Date(+y, +m - 1, +d);
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  // sync back to your request model
  useEffect(() => {
    const localDate = formatForPayload(requisitionDate);
    setSalesRequisitionRequest(prev => ({
      ...prev,
      Date: localDate,            // ← make sure this is the `Date` property
    }));
  }, [requisitionDate, formatForPayload]);
  // ------------------------------------------------------------------------
  // Helper function: fetch conversion factor for a secondary unit.
  const fetchConversionFactor = async (itemId: number, unitId: number): Promise<number> => {
    const url = `${variables.API_URL}SalesRequisition/get-conversionfactor?ItemtId=${itemId}&UnitId=${unitId}&IsSecondaryUnit=true`;
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (response.ok) {
      const data = await response.json();
      if (data && Array.isArray(data) && data.length > 0) {
        return data[0].conversionFactor;
      }
      return 0;
    } else {
      throw new Error("Failed to fetch conversion factor");
    }
  };

  // ------------------------------------------------------------------------
  // Fetch Reference Number, Items, Customers, Sellers.
  const fetchRefNo = async () => {
    try {
      const response = await fetch(`${variables.API_URL}SalesRequisition/GetNextSaleRefNumber`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch Sale Reference Number");
      const data = await response.json();
      setSalesRequisitionRequest((prev) => ({
        ...prev,
        RefNo: data.SaleRefNumber || data.saleRefNumber || "",
      }));
    } catch (error) {
      console.error("Error fetching Sale Reference Number:", error);
      toast.error("Error fetching Sale Reference Number");
    }
  };

  const fetchItems = async () => {
    try {
      const response = await fetch(`${variables.API_URL}SalesRequisition/get-items`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setItems(
            data.map((item: any) => ({
              itemId: item.itemId,
              itemName: item.itemName,
            }))
          );
        } else throw new Error("Unexpected data structure");
      } else throw new Error("Failed to fetch items");
    } catch (error) {
      console.error("Error fetching items:", error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await fetch(`${variables.API_URL}SalesRequisition/get-customers`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setCustomers(
            data.map((cust: any) => ({
              customerId: cust.customerId,
              customerName: cust.customerName,
            }))
          );
        } else throw new Error("Unexpected data structure");
      } else throw new Error("Failed to fetch customers");
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const fetchSellers = async () => {
    try {
      const response = await fetch(`${variables.API_URL}SalesRequisition/get-sellers`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setSellers(
            data.map((seller: any) => ({
              sellerId: seller.sellerId,
              sellerName: seller.sellerName,
            }))
          );
        } else throw new Error("Unexpected data structure");
      } else throw new Error("Failed to fetch sellers");
    } catch (error) {
      console.error("Error fetching sellers:", error);
    }
  };

  // For each line item, fetch its available units.
  const fetchItemUnitForRow = async (rowId: number, itemId: number) => {
    try {
      const response = await fetch(`${variables.API_URL}SalesRequisition/get-units-by-item/${itemId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        console.log("Raw unit data from API:", data); // Debug logging
        const mappedData: ItemUnit[] = data.map((unit: any) => ({
          index: unit.index !== undefined ? unit.index : unit.unitIndex,
          unitId: unit.unitId || unit.id || 0,
          isSecondaryUnit: unit.isSecondaryUnit,
          unitName: unit.unitName,
        }));
        setItemUnit((prev) => ({
          ...prev,
          [rowId]: mappedData,
        }));
      } else {
        setItemUnit((prev) => ({ ...prev, [rowId]: [] }));
      }
    } catch (error) {
      console.error("Error fetching item units for row:", error);
      setItemUnit((prev) => ({ ...prev, [rowId]: [] }));
    }
  };

  // ------------------------------------------------------------------------
  // useEffect: Fetch initial data.
  useEffect(() => {
    fetchRefNo();
    fetchItems();
    fetchCustomers();
    fetchSellers();
  }, [token]);

  // If an ID is provided, we're in edit mode – fetch the existing sales requisition.


  // ------------------------------------------------------------------------
  // Handler for updating main fields.
  const handleDateChange = (value: string) => {
    setSalesRequisitionRequest((prev) => ({
      ...prev,
      Date: value,
    }));
  };

  const addLineItem = () => {
    const newChild: ISalesRequisitionChildRequest = {
      SalesRequisitionChildID: 0,
      SalesRequisitionID: 0,
      ItemID: 0,
      Quantity: 0,
      UnitId: 0,
      ConversionFactor: 0,
      IsSecondaryUnit: false,
      ChildTotalQuantity: 0,
      UnitComposite: 0,
    };
    setSalesRequisitionRequest((prev) => ({
      ...prev,
      SalesRequisitionChildRequests: [...prev.SalesRequisitionChildRequests, newChild],
    }));
  };

  const handleDescriptionChange = (value: string) => {
    setSalesRequisitionRequest((prev) => ({
      ...prev,
      Description: value,
    }));
  };

  // ------------------------------------------------------------------------
  // Validation function.
 const validateForm = (): boolean => {
  const errors: Record<string,string> = {};

  // 1) Basic validations
  if (!salesRequisitionRequest.Description.trim()) {
    errors.Description = "Description is required.";
  }
  if (salesRequisitionRequest.SellerID <= 0) {
    errors.SellerID = "Seller is required.";
  }
  if (salesRequisitionRequest.CustomerID <= 0) {
    errors.CustomerID = "Customer is required.";
  }
  if (salesRequisitionRequest.SalesRequisitionChildRequests.length === 0) {
    errors.childRequests = "At least one item is required.";
  }

  // 2) Per‐line validations
  salesRequisitionRequest.SalesRequisitionChildRequests.forEach((child, index) => {
    if (child.ItemID <= 0) {
      errors[`childItem_${index}`] = `Please select an item for line ${index + 1}.`;
    }
    if (child.Quantity <= 0) {
      errors[`childQuantity_${index}`] = `Quantity must be greater than zero for line ${index + 1}.`;
    }
    if (!child.UnitId || child.UnitId <= 0) {
      errors[`childUnit_${index}`] = `Please select a unit for line ${index + 1}.`;
    }
  });

  // 3) 🚫 Duplicate‐item+unit check
  const comboCounts = salesRequisitionRequest.SalesRequisitionChildRequests
    .map(c => `${c.ItemID}-${c.UnitId}-${!!c.IsSecondaryUnit}`)
    .reduce<Record<string,number>>((acc, combo) => {
      acc[combo] = (acc[combo] || 0) + 1;
      return acc;
    }, {});

  Object.entries(comboCounts).forEach(([combo, cnt]) => {
    if (cnt > 1) {
      salesRequisitionRequest.SalesRequisitionChildRequests.forEach((child, idx) => {
        if (`${child.ItemID}-${child.UnitId}-${!!child.IsSecondaryUnit}` === combo) {
          errors[`childItem_${idx}`] =
            "This item with the selected unit is already on another line. Please pick a different combination.";
        }
      });
    }
  });

  setValidationErrors(errors);
  return Object.keys(errors).length === 0;
};


  // ------------------------------------------------------------------------
  // Handler for updating a line item.
  const updateLineItem = (
    index: number,
    field: keyof ISalesRequisitionChildRequest,
    value: string | number | boolean
  ) => {
    setSalesRequisitionRequest((prev) => {
      const updatedChildren = [...prev.SalesRequisitionChildRequests];
      const child = { ...updatedChildren[index] };
      (child as any)[field] = value;
      // If the field updated is Quantity, recalc ChildTotalQuantity.
      if (field === "Quantity") {
        const qty = Number(value);
        if (child.IsSecondaryUnit) {
          child.ChildTotalQuantity = qty * (child.ConversionFactor || 0);
        } else {
          child.ChildTotalQuantity = qty;
        }
      }
      updatedChildren[index] = child;
      return { ...prev, SalesRequisitionChildRequests: updatedChildren };
    });
  };

  const removeLineItem = (index: number) => {
    setSalesRequisitionRequest((prev) => ({
      ...prev,
      SalesRequisitionChildRequests: prev.SalesRequisitionChildRequests.filter((_, i) => i !== index),
    }));
  };

  const calculateTotalQuantity = (): number => {
    return salesRequisitionRequest.SalesRequisitionChildRequests.reduce(
      (sum, item) => sum + (item.ChildTotalQuantity || 0),
      0
    );
  };

  // ------------------------------------------------------------------------
  // File upload handlers.






  // ------------------------------------------------------------------------
  // Submit Handler.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
     setIsSubmitting(true);
    if (!validateForm()) 
    {
      setIsSubmitting(false);
      return;
    }
    if (!salesRequisitionRequest.RefNo) {
      toast.error("Reference number is missing. Please refresh.");
      return;
    }

    if (isEditing) {
      // … your PUT logic …
      return;
    }

    // 1) build payload
    const requestPayload = {
      RefNo: salesRequisitionRequest.RefNo,
      Date: salesRequisitionRequest.Date,
      CustomerID: salesRequisitionRequest.CustomerID,
      SellerID: salesRequisitionRequest.SellerID,
      CustomerChildID: salesRequisitionRequest.CustomerChildID,
      StatusId: salesRequisitionRequest.StatusId,
      Description: salesRequisitionRequest.Description,
      TotalQuantity: calculateTotalQuantity(),
      SalesRequisitionChildRequests:
        salesRequisitionRequest.SalesRequisitionChildRequests,
      MultipleAttachments: attachments.map((f) => ({
        Referenceno: '',
      })),
    };

    // 2) pack into FormData
    const formData = new FormData();
    // —> append JSON as a string field named "request"
    formData.append("request", JSON.stringify(requestPayload));

    // 3) append each file under "attachments" (same name as your controller parameter)
    attachments.forEach((fileObj) => {
      formData.append("attachments", fileObj.file, fileObj.file.name);
    });

    try {
      const response = await fetch(
        `${variables.API_URL}SalesRequisition/AddSalesRequisition`,
        {
          method: "POST",
          headers: {
            // leave out Content-Type; browser will set multipart/form-data
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (response.ok) {
        toast.success("Sales Requisition created successfully!");
        setTimeout(() => navigate("/sales/requisition"), 2000);
      } else {
        const errText = await response.text();
        toast.error("Failed to create Sales Requisition: " + errText);
      }
    } catch (err) {
      console.error("Error submitting form:", err);
      toast.error("An error occurred while submitting the form.");
    }finally {
      setIsSubmitting(false);
    }
  };

  const {
    attachments,
    addFiles,
    updateReference,
    removeFile,
    appendToFormData,
  } = useFileAttachments();


  // ------------------------------------------------------------------------
  // Render Component.
  return (
    <div className="space-y-6">
      <ToastContainer />
      <div>
        <h1 className="text-2xl font-semibold">
          {isEditing ? "Edit Sales Requisition" : "Create Sales Requisition"}
        </h1>
        <p className="text-gray-600 mt-1">
          {isEditing
            ? "Update your sales requisition details"
            : "Create a new sales requisition"}
        </p>
      </div>
      <div>
        <Card className="p-6 space-y-6">
          {/* RefNo and Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 ">
              <Label htmlFor="RefNo">Requisition Number</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="RefNo"
                  value={salesRequisitionRequest.RefNo}
                  readOnly
                  disabled
                  style={{ backgroundColor: "#f8f8f8", color: "#000" }}
                />

              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <div className="mt-1 w-full">
                <DatePicker
                  selected={requisitionDate}
                  onChange={(d: Date | null) => {
                    if (d) setRequisitionDate(d);
                  }}
                  dateFormat="dd MMM yyyy"
                  wrapperClassName="w-full"
                  customInput={<Input className="w-full" id="date" />}
                />
              </div>
            </div>
          </div>

          {/* Customer and Description */}
          <div className="space-y-2">
            <Label htmlFor="customer">Customer</Label>
            <SearchableSelectforCustomer
              value={salesRequisitionRequest.CustomerID?.toString() || ""}
              onValueChange={(value) =>
                setSalesRequisitionRequest((prev) => ({
                  ...prev,
                  CustomerID: Number(value),
                }))
              }
              customers={customers}
            />
            {validationErrors.CustomerID && (
              <p className="validation-error">{validationErrors.CustomerID}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="selectedSeller">Seller</Label>
            <Select
              value={salesRequisitionRequest.SellerID?.toString() || ""}
              onValueChange={(value) =>
                setSalesRequisitionRequest((prev) => ({
                  ...prev,
                  SellerID: Number(value),
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Seller" />
              </SelectTrigger>
              <SelectContent>
                {sellers.map((seller) => (
                  <SelectItem key={seller.sellerId} value={seller.sellerId.toString()}>
                    {seller.sellerName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {validationErrors.SellerID && (
              <p className="validation-error">{validationErrors.SellerID}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={salesRequisitionRequest.Description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder="Enter requisition details"
              rows={4}
            />
            {validationErrors.Description && (
              <p className="validation-error">{validationErrors.Description}</p>
            )}
          </div>

          {/* Line Items Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Items</h3>
              <Button type="button" onClick={addLineItem} className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> Add Item
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Item Unit</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead> Total Quantity (Primary)</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesRequisitionRequest.SalesRequisitionChildRequests.flatMap((child, rowIndex) => {
                  const compositeValue: number | undefined = child.UnitComposite;
                  return [
                    <TableRow key={`row-${rowIndex}`}>
                      <TableCell>
                        <SearchableSelect
                          value={child.ItemID ? child.ItemID.toString() : ""}
                          onValueChange={(value) => {
                            updateLineItem(rowIndex, "ItemID", Number(value));
                            // Reset related fields when item changes.
                            updateLineItem(rowIndex, "UnitId", 0);
                            updateLineItem(rowIndex, "ConversionFactor", 0);
                            updateLineItem(rowIndex, "IsSecondaryUnit", false);
                            updateLineItem(rowIndex, "UnitComposite", 0);
                            updateLineItem(rowIndex, "ChildTotalQuantity", 0);
                            fetchItemUnitForRow(rowIndex, Number(value));
                          }}
                          items={items}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {itemUnit[rowIndex] && itemUnit[rowIndex].length > 0 ? (
                            <Select
                              value={compositeValue !== undefined ? compositeValue.toString() : ""}
                              onValueChange={async (newComposite) => {
                                const comp = Number(newComposite);
                                const unitSelected = itemUnit[rowIndex]?.find(u => u.index === comp);
                                if (unitSelected) {
                                  console.log("Selected unit:", unitSelected);
                                  // Combine all updates in one call
                                  let newConversionFactor = 0;
                                  let newChildTotalQuantity = Number(child.Quantity);
                                  if (unitSelected.isSecondaryUnit) {
                                    try {
                                      newConversionFactor = await fetchConversionFactor(child.ItemID, unitSelected.unitId);
                                      newChildTotalQuantity = Number(child.Quantity) * newConversionFactor;
                                    } catch (error) {
                                      console.error("Error fetching conversion factor:", error);
                                    }
                                  }
                                  setSalesRequisitionRequest(prev => {
                                    const updatedChildren = [...prev.SalesRequisitionChildRequests];
                                    const updatedChild = {
                                      ...updatedChildren[rowIndex],
                                      UnitComposite: comp,
                                      IsSecondaryUnit: unitSelected.isSecondaryUnit,
                                      // Always update UnitId to the selected unit's id.
                                      UnitId: unitSelected.unitId,
                                      ConversionFactor: newConversionFactor,
                                      ChildTotalQuantity: newChildTotalQuantity,
                                    };
                                    updatedChildren[rowIndex] = updatedChild;
                                    return { ...prev, SalesRequisitionChildRequests: updatedChildren };
                                  });
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select Unit" />
                              </SelectTrigger>
                              <SelectContent>
                                {itemUnit[rowIndex].map((unit) => (
                                  <div key={`row-${rowIndex}-unit-${unit.index}`}>
                                    <SelectItem value={unit.index.toString()}>
                                      {unit.unitName} {unit.isSecondaryUnit ? "(Secondary)" : ""}
                                    </SelectItem>
                                  </div>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="text-gray-500 text-sm">No units available</div>
                          )}
                          {child.IsSecondaryUnit && (
                            <Input
                              type="number"
                              value={child.ConversionFactor !== undefined ? child.ConversionFactor.toString() : ""}
                              disabled
                              className="w-32"
                            />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={child.Quantity}
                          onChange={(e) => {
                            updateLineItem(rowIndex, "Quantity", Number(e.target.value));
                            const qty = Number(e.target.value);
                            if (child.IsSecondaryUnit) {
                              updateLineItem(rowIndex, "ChildTotalQuantity", qty * (child.ConversionFactor || 0));
                            } else {
                              updateLineItem(rowIndex, "ChildTotalQuantity", qty);
                            }
                          }}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={child.ChildTotalQuantity !== undefined ? child.ChildTotalQuantity.toString() : "0"}
                          disabled
                          className="w-32"
                        />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeLineItem(rowIndex)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>,
                    validationErrors[`childItem_${rowIndex}`] && (
                      <TableRow key={`error-item-${rowIndex}`}>
                        <TableCell colSpan={5} className="validation-error">
                          {validationErrors[`childItem_${rowIndex}`]}
                        </TableCell>
                      </TableRow>
                    ),
                    validationErrors[`childQuantity_${rowIndex}`] && (
                      <TableRow key={`error-quantity-${rowIndex}`}>
                        <TableCell colSpan={5} className="validation-error">
                          {validationErrors[`childQuantity_${rowIndex}`]}
                        </TableCell>
                      </TableRow>
                    ),
                    validationErrors[`childUnit_${rowIndex}`] && (
                      <TableRow key={`error-unit-${rowIndex}`}>
                        <TableCell colSpan={5} className="validation-error">
                          {validationErrors[`childUnit_${rowIndex}`]}
                        </TableCell>
                      </TableRow>
                    )
                  ];
                })}
              </TableBody>
            </Table>
            {salesRequisitionRequest.SalesRequisitionChildRequests.length > 0 && (
              <div className="mt-4 flex justify-end">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-lg font-semibold">
                    Total Quantity: {calculateTotalQuantity().toFixed(2)}
                  </p>
                </div>
              </div>
            )}
            {validationErrors.childRequests && (
              <div className="validation-error">{validationErrors.childRequests}</div>
            )}
          </div>

          {/* File Upload Section */}
          <div className="space-y-2">

            <div className="flex items-center gap-4">


            </div>
            <div className="space-y-2">
              <Label>Attachments</Label>
              <Input
                ref={fileInputRef}
                type="file"
                multiple
                className="h-10 w-50"
                onChange={e => {
                  if (e.target.files) addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              {attachments.map(a => (
                <div key={a.id} className="flex items-center gap-2">
                  <span>{a.file.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(a.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Submit / Cancel Buttons */}
          <div className="flex justify-end gap-4">
            <Button variant="outline" type="button" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}
            disabled={isSubmitting }>
              {isEditing ? "Update" : "Create"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SalesRequisition;
