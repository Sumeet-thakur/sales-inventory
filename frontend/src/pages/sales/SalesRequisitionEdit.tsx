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
import { Plus, Trash2, RefreshCw, FilePlus, CircleX, CircleCheck, Clock9, Download } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { variables } from "@/Variables";
import { useSelector } from "react-redux";
import { RootState } from "@/Storage/Redux/store";
import useAuthValidation from "@/hooks/useAuthValidation";
import { usePermissions } from "@/hooks/usePermissions";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import useLocalDateString from "@/hooks/useLocalDateString";
import { useFileAttachments } from "@/hooks/useFileAttachments";


// ------------------------------------------------------------------------
// Interfaces for Request Model (matching backend view models)
interface ISalesRequisitionRequest {
  SalesRequisitionID: number;
  RefNo: string;
  Date: string;
  CustomerID: number;
  SellerID: number;
  StatusId: number;
  CustomerChildID: number;
  Description: string;
  TotalQuantity: number;
  SalesRequisitionChildVMs: ISalesRequisitionChildVMs[];
  salesRequisitionChildFileVMs: IsalesRequisitionChildFileVMs[];
  RemovedSalesRequisitionChildIds?: number[];
  RemovedSalesRequisitionFilesIds?: number[];
  multipleAttachments: MultipleAttachmentVM[];
}

interface ISalesRequisitionChildVMs {
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
interface MultipleAttachmentVM {
  multipleAttachmentfileId: number;
  fileName: string;
  filePath: string;
  referenceno: string;
}
interface IsalesRequisitionChildFileVMs {
  SalesRequisitionChildFileID: number;
  SalesRequisitionID: number;
  FilePath: string;
  Referenceno: string;
}

// ------------------------------------------------------------------------
// Other interfaces for component state
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

// Extend the file interface so we can store either a new file (with a File object)
// or an existing file record (with a filePath) from the server.
interface UploadedFile {
  id: number;
  file?: File;       // For new file uploads.
  filePath?: string; // For existing file records.
  referenceno: string;
}


interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  items: itemModel[];
  placeholder?: string;
  disabled?: boolean;
}

interface SearchableSelectPropsforCustomer {
  value: string;
  onValueChange: (value: string) => void;
  customers: customersModel[];
  placeholder?: string;
  disabled?: boolean;
}

// The ItemUnit interface.
interface ItemUnit {
  index: number;
  unitId: number;
  isSecondaryUnit: boolean;
  unitName?: string;
}

// ------------------------------------------------------------------------
// SearchableSelect Component for items.
const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onValueChange,
  items,
  placeholder = "Select Item",
  disabled = false,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const filteredItems = items.filter((itm) =>
    itm.itemName.toLowerCase().includes(searchQuery.toLowerCase())
  );
  return (
    <Select disabled={disabled} value={value} onValueChange={onValueChange}>
      <SelectTrigger disabled={disabled}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent side="bottom" className="max-h-60 overflow-y-auto">
        <div className="p-2">
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={disabled}
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

// SearchableSelect Component for Customers.
const SearchableSelectforCustomer: React.FC<SearchableSelectPropsforCustomer> = ({
  value,
  onValueChange,
  customers,
  placeholder = "Select Customer",
  disabled = false,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const filteredCustomers = customers.filter((itm) =>
    itm.customerName.toLowerCase().includes(searchQuery.toLowerCase())
  );
  return (
    <Select disabled={disabled} value={value} onValueChange={onValueChange}>
      <SelectTrigger disabled={disabled}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent side="bottom" className="max-h-60 overflow-y-auto">
        <div className="p-2">
          <Input
            placeholder="Search Customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={disabled}
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
// SalesRequisitionEdit Component.
const SalesRequisitionEdit = () => {
  useAuthValidation();
  const { token,roleid } = useSelector((state: RootState) => state.userAuthStore);
  const { id } = useParams<{ id: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { hasPermission, loading: permissionsLoading } = usePermissions(roleid);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  const [salesRequisitionRequest, setSalesRequisitionRequest] = useState<ISalesRequisitionRequest>({
    SalesRequisitionID: 0,
    RefNo: "",
    Date: new Date().toISOString().split("T")[0],
    CustomerID: 0,
    SellerID: 0,
    StatusId: 0,
    CustomerChildID: 0,
    Description: "",
    TotalQuantity: 0,
    SalesRequisitionChildVMs: [],
    salesRequisitionChildFileVMs: [],
    RemovedSalesRequisitionChildIds: [],
    RemovedSalesRequisitionFilesIds: [],
    multipleAttachments:[],
  });

  const [items, setItems] = useState<itemModel[]>([]);
  const [itemUnit, setItemUnit] = useState<{ [key: number]: ItemUnit[] }>({});
  const [customers, setCustomers] = useState<customersModel[]>([]);
  const [sellers, setSellers] = useState<sellersModel[]>([]);
  // filesState will hold both new uploads and pre-existing file records.
  const [filesState, setFilesState] = useState<UploadedFile[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const formatForPayload = useLocalDateString();
  const [removeIds, setRemoveIds] = useState<number[]>([]);
    const [requisitionDate, setRequisitionDate] = useState<Date>(() => {
      // parse initial YYYY-MM-DD into a Date
      const [y, m, d] = salesRequisitionRequest.Date.split("-");
      return new Date(+y, +m - 1, +d);
    });
   const [existingFiles, setExistingFiles] = useState<
    { id: string; fileName: string; url: string; reference: string }[]
  >([]);
    // sync back to your request model
    useEffect(() => {
      const localDate = formatForPayload(requisitionDate);
      setSalesRequisitionRequest(prev => ({
        ...prev,
        Date: localDate,            // ← make sure this is the `Date` property
      }));
    }, [requisitionDate, formatForPayload]);

  // Determine if the form is locked (read-only) – for example, when in edit mode and StatusId===2.
  const isLocked = isEditing && salesRequisitionRequest.StatusId === 2;

  // ------------------------------------------------------------------------
  // Helper: fetch conversion factor (only needed for secondary units).
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
        } else {
          throw new Error("Unexpected data structure");
        }
      } else {
        throw new Error("Failed to fetch items");
      }
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
        } else {
          throw new Error("Unexpected data structure");
        }
      } else {
        throw new Error("Failed to fetch customers");
      }
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
        } else {
          throw new Error("Unexpected data structure");
        }
      } else {
        throw new Error("Failed to fetch sellers");
      }
    } catch (error) {
      console.error("Error fetching sellers:", error);
    }
  };

  // Fetch available units for a given item.
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
        console.log("Raw unit data from API:", data);
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
  // Initial data fetch.
  useEffect(() => {
  
    fetchItems();
    fetchCustomers();
    fetchSellers();
  }, [token]);

  // In edit mode, fetch the existing requisition and then load child units.
  useEffect(() => {
  if (!id) return;

  const fetchSalesRequisition = async () => {
    try {
      const res = await fetch(`${variables.API_URL}SalesRequisition/${id}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Fetch failed");

      const data = await res.json();

      // 1) Set your form state, including the raw multipleAttachments array:
      setSalesRequisitionRequest({
        SalesRequisitionID: data.salesRequisitionID,
        RefNo: data.refNo,
        Date: data.date?.split("T")[0] ?? "",
        CustomerID: data.customerID,
        SellerID: data.sellerID,
        StatusId: data.statusId,
        CustomerChildID: data.customerChildID,
        Description: data.description,
        TotalQuantity: data.totalQuantity,
        SalesRequisitionChildVMs: data.salesRequisitionChildVMs.map((c: any) => ({
          SalesRequisitionChildID: c.salesRequisitionChildID,
          SalesRequisitionID: c.salesRequisitionID,
          ItemID: c.itemID,
          Quantity: c.quantity,
          UnitId: c.unitId,
          ConversionFactor: c.conversionFactor,
          IsSecondaryUnit: c.isSecondaryUnit,
          ChildTotalQuantity: c.childTotalQuantity,
          UnitComposite: c.isSecondaryUnit ? 2 : 1,
        })),
        salesRequisitionChildFileVMs: data.salesRequisitionChildFileVMs.map((f: any) => ({
          SalesRequisitionChildFileID: f.salesRequisitionChildFileID,
          SalesRequisitionID: f.salesRequisitionID,
          FilePath: f.filePath,
          Referenceno: f.referenceno,
        })),
        RemovedSalesRequisitionChildIds: [],
        RemovedSalesRequisitionFilesIds: [],
        multipleAttachments: Array.isArray(data.multipleAttachments)
          ? data.multipleAttachments.map((m: any) => ({
              multipleAttachmentfileId: m.multipleAttachmentfileId,
              fileName: m.fileName,
              filePath: m.filePath,
              referenceno: m.referenceno,
            }))
          : [],
      });

      // 2) Now map that same array into your existingFiles UI state:
      setExistingFiles(
        (data.multipleAttachments ?? []).map((m: any) => ({
          id: m.multipleAttachmentfileId.toString(),
          fileName: m.fileName,
          url: m.filePath,        // or `${variables.API_URL}${m.filePath}` if it's a relative path
          reference: m.referenceno,
        }))
      );

      setRequisitionDate(new Date(data.date));
      setIsEditing(true);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load Sales Requisition");
      navigate("/sales/requisition");
    }
  };

  fetchSalesRequisition();
}, [id, token, navigate]);


  // After loading an existing record in edit mode, fetch units for each child item.
  useEffect(() => {
    if (isEditing) {
      salesRequisitionRequest.SalesRequisitionChildVMs.forEach((child, rowIndex) => {
        if (child.ItemID) {
          fetchItemUnitForRow(rowIndex, child.ItemID);
        }
      });
    }
  }, [isEditing, salesRequisitionRequest.SalesRequisitionChildVMs]);

  // ------------------------------------------------------------------------
  // Main field handlers.
 
  const handleDescriptionChange = (value: string) => {
    setSalesRequisitionRequest((prev) => ({
      ...prev,
      Description: value,
    }));
  };

  const addLineItem = () => {
    const newChild: ISalesRequisitionChildVMs = {
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
      SalesRequisitionChildVMs: [...prev.SalesRequisitionChildVMs, newChild],
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
  if (salesRequisitionRequest.SalesRequisitionChildVMs.length === 0) {
    errors.childRequests = "At least one item is required.";
  }

  // 2) Per‐line validations
  salesRequisitionRequest.SalesRequisitionChildVMs.forEach((child, index) => {
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
  const comboCounts = salesRequisitionRequest.SalesRequisitionChildVMs
    .map(c => `${c.ItemID}-${c.UnitId}-${!!c.IsSecondaryUnit}`)
    .reduce<Record<string,number>>((acc, combo) => {
      acc[combo] = (acc[combo] || 0) + 1;
      return acc;
    }, {});

  Object.entries(comboCounts).forEach(([combo, cnt]) => {
    if (cnt > 1) {
      salesRequisitionRequest.SalesRequisitionChildVMs.forEach((child, idx) => {
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
  // Handler for updating a child row.
  const updateLineItem = (
    index: number,
    field: keyof ISalesRequisitionChildVMs,
    value: string | number | boolean
  ) => {
    setSalesRequisitionRequest((prev) => {
      const updatedChildren = [...prev.SalesRequisitionChildVMs];
      const child = { ...updatedChildren[index] };
      (child as any)[field] = value;
      if (field === "Quantity") {
        const qty = Number(value);
        if (child.IsSecondaryUnit) {
          child.ChildTotalQuantity = qty * (child.ConversionFactor || 0);
        } else {
          child.ChildTotalQuantity = qty;
        }
      }
      updatedChildren[index] = child;
      return { ...prev, SalesRequisitionChildVMs: updatedChildren };
    });
  };

  // ------------------------------------------------------------------------
  // Remove a line item and record its ID if necessary.
  const removeLineItem = (index: number) => {
    setSalesRequisitionRequest((prev) => {
      const removedItem = prev.SalesRequisitionChildVMs[index];
      const updatedItems = prev.SalesRequisitionChildVMs.filter((_, i) => i !== index);
      const removedIDs = prev.RemovedSalesRequisitionChildIds ? [...prev.RemovedSalesRequisitionChildIds] : [];
      if (removedItem.SalesRequisitionChildID && removedItem.SalesRequisitionChildID > 0) {
        removedIDs.push(removedItem.SalesRequisitionChildID);
      }
      return {
        ...prev,
        SalesRequisitionChildVMs: updatedItems,
        RemovedSalesRequisitionChildIds: removedIDs,
      };
    });
  };

  const calculateTotalQuantity = (): number => {
    return salesRequisitionRequest.SalesRequisitionChildVMs.reduce(
      (sum, item) => sum + (item.ChildTotalQuantity || 0),
      0
    );
  };

  // ------------------------------------------------------------------------
  // File upload handlers.
 
  // Modified removeFile: if removing an existing file (without a File object but with filePath),
  // add its id to RemovedSalesRequisitionFilesIds.


  // ------------------------------------------------------------------------
  // Helper function to submit a request using a provided object.
const submitRequest = async (req: ISalesRequisitionRequest) => {
  if (!req.RefNo) {
    toast.error("Reference number is missing. Please refresh.");
    return;
  }

  // 1) Build your JSON payload (no files here)
  const basePayload = {
    SalesRequisitionID:  req.SalesRequisitionID,
    RefNo:               req.RefNo,
    Date:                req.Date,
    CustomerID:          req.CustomerID,
    SellerID:            req.SellerID,
    StatusId:            req.StatusId,
    CustomerChildID:     req.CustomerChildID,
    Description:         req.Description,
    TotalQuantity:       calculateTotalQuantity(),
    SalesRequisitionChildVMs: req.SalesRequisitionChildVMs.map(child => ({
      SalesRequisitionChildID: child.SalesRequisitionChildID,
      SalesRequisitionID:      child.SalesRequisitionID,
      ItemID:                  child.ItemID,
      Quantity:                child.Quantity,
      UnitId:                  child.UnitId,
      ConversionFactor:        child.ConversionFactor,
      IsSecondaryUnit:         child.IsSecondaryUnit,
      ChildTotalQuantity:      child.ChildTotalQuantity,
    })),
    RemovedSalesRequisitionChildIds: req.RemovedSalesRequisitionChildIds || []
  };

  // 2) Turn it into the final payload including the new-files metadata
  const updatePayload = {
    ...basePayload,
    MultipleAttachments: attachments.map(a => ({ Referenceno: a.reference }))
  };

  // 3) Build your FormData
  const formData = new FormData();
  formData.append("request", JSON.stringify(updatePayload));
  formData.append("removeAttachmentIds", JSON.stringify(removeIds));

  // 4) Let the hook append *all* of the File objects under "attachments"
  appendToFormData(formData, "attachments");

  // 5) Fire the PUT (no Content-Type header)
  try {
    const resp = await fetch(`${variables.API_URL}SalesRequisition/${id}`, {
      method:  "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body:    formData
    });

    if (resp.ok) {
      toast.success(
        req.StatusId === 1
          ? "Sales Requisition Update!"
          :  req.StatusId === 2
          ? "Sales Requisition marked Pending"
          : "Sales Requisition Approved"
      );
      setTimeout(() => navigate("/sales/requisition"), 2000);
    } else {
      const err = await resp.text();
      toast.error("Failed to update: " + err);
    }
  } catch (e) {
    console.error(e);
    toast.error("An error occurred while updating the form.");
  }finally{
    setIsSubmitting(false);
  }
};

  // ------------------------------------------------------------------------
  // Submit Handler (PUT only) – This one uses the current state.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
     setIsSubmitting(true);
    if (!validateForm()) {
      setIsSubmitting(false);
      return;
    };
    await submitRequest(salesRequisitionRequest);
  };

  // ------------------------------------------------------------------------
  // Handle Pending button click: set status to 2 and submit form.
  const handlePending = async (e: React.FormEvent) => {
    e.preventDefault();
    // Build a new request object with StatusId forced to 2.
    const updatedRequest = { ...salesRequisitionRequest, StatusId: 2 };
    await submitRequest(updatedRequest);
  };
  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    // Build a new request object with StatusId forced to 2.
    const updatedRequest = { ...salesRequisitionRequest, StatusId: 3 };
    await submitRequest(updatedRequest);
  };

  const getStatusText = (statusId: number): string => {
    switch (statusId) {
      case 1:
        return "DRAFT";
      case 2:
        return "PENDING";
      case 3:
        return "APPROVED";
      case 4:
        return "VOID";
      default:
        return "UNKNOW";
    }
  };
  // ------------------------------------------------------------------------
  // Render Component.
  const {
      attachments,
      addFiles,
      updateReference,
      removeFile,
      appendToFormData,
    } = useFileAttachments();
  
  return (
    <div className="space-y-6">
      <ToastContainer />
      <div>
        <h1 className="text-2xl font-semibold">
          {isEditing ? "Edit Sales Requisition" : "Create Sales Requisition"}
        </h1>
        {/* <h1 className="text-2xl font-semibold">
          {isEditing ? `Sales Requisition` + ` ` + getStatusText(salesRequisitionRequest.StatusId) : 'Default Status'}
        </h1> */}
        <p className="text-gray-600 mt-1">
          {isEditing ? "Update your sales requisition details" : "Create a new sales requisition"}
        </p>
      </div>
      <div>
        <Card className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 ">
            <div className="space-y-2 text-base">
              <Label className="text-lg" htmlFor="">{salesRequisitionRequest.RefNo}</Label>
              <div className="flex items-center gap-2">
                
              </div>
            </div>
            <div className="space-y-2 text-right ">
              <Label className="text-lg" htmlFor=""> {isEditing ? getStatusText(salesRequisitionRequest.StatusId) : 'Default Status'}</Label>
              
            </div>
          </div>
          <hr/>
          {/* RefNo and Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="RefNo">Requisition Number</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="RefNo"
                  value={salesRequisitionRequest.RefNo}
                  readOnly
                  disabled
                  style={{ backgroundColor: "#f8f8f8", color: "#000" }}
                />
                {/* <Button variant="outline" size="sm" onClick={fetchRefNo}>
                  <RefreshCw className="h-4 w-4" />
                </Button> */}
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
            {validationErrors.CustomerID && <p className="validation-error">{validationErrors.CustomerID}</p>}
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
            {validationErrors.SellerID && <p className="validation-error">{validationErrors.SellerID}</p>}
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
            {validationErrors.Description && <p className="validation-error">{validationErrors.Description}</p>}
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
                  <TableHead>Total Quantity (Primary)</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesRequisitionRequest.SalesRequisitionChildVMs.flatMap((child, rowIndex) => {
                  const compositeValue: number | undefined = child.UnitComposite;
                  return [
                    <TableRow key={`row-${rowIndex}`}>
                      <TableCell>
                        <SearchableSelect
                          value={child.ItemID ? child.ItemID.toString() : ""}
                          onValueChange={(value) => {
                            const itemId = Number(value);
                            updateLineItem(rowIndex, "ItemID", itemId);
                            updateLineItem(rowIndex, "UnitId", 0);
                            updateLineItem(rowIndex, "UnitComposite", 0);
                            updateLineItem(rowIndex, "ConversionFactor", 0);
                            updateLineItem(rowIndex, "IsSecondaryUnit", false);
                            updateLineItem(rowIndex, "ChildTotalQuantity", 0);
                            fetchItemUnitForRow(rowIndex, itemId);
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
                                    const updatedChildren = [...prev.SalesRequisitionChildVMs];
                                    const updatedChild = {
                                      ...updatedChildren[rowIndex],
                                      UnitComposite: comp,
                                      IsSecondaryUnit: unitSelected.isSecondaryUnit,
                                      UnitId: unitSelected.unitId,
                                      ConversionFactor: newConversionFactor,
                                      ChildTotalQuantity: newChildTotalQuantity,
                                    };
                                    updatedChildren[rowIndex] = updatedChild;
                                    return { ...prev, SalesRequisitionChildVMs: updatedChildren };
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
             {validationErrors.childRequests && (
              <div className="validation-error">{validationErrors.childRequests}</div>
            )}
            <div className="space-y-2">
               <Label>Attachments</Label>
                        <Input
                          ref={fileInputRef}
                          type="file"
                          multiple
                           className="h-10 w-50"
                          onChange={(e) => {
                            if (e.target.files) addFiles(e.target.files);
                            e.target.value = "";
                          }}
                        />
                        {existingFiles.map(f => (
                          <div key={f.id} className="flex items-center gap-2">
                            <span>{f.fileName}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setRemoveIds(ids => [...ids, +f.id]);
                                setExistingFiles(xs => xs.filter(x => x.id !== f.id));
                              }}
                            >
                              <Trash2 />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const link = document.createElement("a");
                                link.href = f.url;
                                link.download = f.fileName;
                                link.click();
                              }}
                            >
                              <Download />
                            </Button>
                          </div>
                        ))}
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
            {salesRequisitionRequest.SalesRequisitionChildVMs.length > 0 && (
              <div className="mt-4 flex justify-end">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-lg font-semibold">
                    Total Quantity: {calculateTotalQuantity().toFixed(2)}
                  </p>
                </div>
              </div>
            )}
           
          </div>

          
          {isEditing && (
  <div className="flex items-center justify-between mt-4">
    {/* Left group: PENDING, APPROVE, VOID */}
    <div className="flex gap-4">
      {salesRequisitionRequest.StatusId !== 2 && salesRequisitionRequest.StatusId !== 3 && (
        <Button onClick={handlePending}
         disabled={isSubmitting }>
          <Clock9 />
          PENDING
        </Button>
      )}
      {salesRequisitionRequest.StatusId !== 3 && (
        <Button
          onClick={handleApprove}
          style={{ visibility: hasPermission(23, "approve") ? "visible" : "hidden" }}
        disabled={isSubmitting } >
          <CircleCheck />
          APPROVE
        </Button>
      )}
      {/* <Button
        
        style={{ visibility: hasPermission(23, "void") ? "visible" : "hidden" }}
      >
        <CircleX />
        VOID
      </Button> */}
    </div>

    {/* Right group: Cancel, Update */}
    <div className="flex gap-4">
      <Button variant="outline" type="button" onClick={() => navigate(-1)}>
        Cancel
      </Button>
      <Button onClick={handleSubmit}
      disabled={isSubmitting }>
        {isEditing ? "Update" : "Create"}
      </Button>
    </div>
  </div>
)}

        </Card>
      </div>
    </div>
  );
};

export default SalesRequisitionEdit;
