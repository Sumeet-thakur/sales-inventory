import React, { useState, useEffect, FormEvent, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { CircleCheck, CircleX, Clock9, Download, Plus, Trash2 } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate, useParams } from "react-router-dom";
import { variables } from "@/Variables";
import useAuthValidation from "@/hooks/useAuthValidation";
import { useSelector } from "react-redux";
import { RootState } from "@/Storage/Redux/store";
import { usePermissions } from "@/hooks/usePermissions";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import useLocalDateString from "@/hooks/useLocalDateString";
import useFormatDateTime from "@/hooks/useFormatDateTime";
import useActivityLog from "@/hooks/useActivityLog";
import ExpandableJsonDisplay from "@/hooks/ExpandableJsonDisplay";
import { useFileAttachments } from "@/hooks/useFileAttachments";

// ------------------------------------------------------------------------
// Interfaces matching your C# view models.
// Note: Adjust the property names if needed.
export interface PurchaseRequisitionOrderChildVM {
  purchaseRequisitionOrderChildID: number;
  itemID?: number;
  quantity?: number;
  unitId?: number;
  unitPrice?: number;
  tax?: number;
  childTotalPrice?: number;
  conversionFactor?: number;
  isSecondaryUnit?: boolean;
  childTotalQuantity?: number;
  unitComposite?: number; // holds the index value of the selected unit
}

export interface PurchaseRequisitionOrderVM {
  purchaseRequisitionOrderID: number;
  refNo: string;
  date?: string;
  vendorID?: number;
  deliveryDate?: string;
  paymentTerms: string;
  description: string;
  totalAmount?: number;
  totalQuantity?: number;
  statusId: number;
  purchaseRequisitionOrderChildVMs: PurchaseRequisitionOrderChildVM[];
  removedPurchaseRequisitionOrderChildIds?: number[];
  multipleAttachments: MultipleAttachmentVM[];

}
interface MultipleAttachmentVM { multipleAttachmentfileId: number; fileName: string; filePath: string; referenceno: string; }
// For dropdowns.
interface Vendor {
  vendorID: number;
  vendorName: string;
}

interface Item {
  itemId: number;
  itemName: string;
  purchasePrice: number;
}

// Available unit options for an item.
interface ItemUnit {
  index: number;
  unitId: number;
  unitName: string;
  isSecondaryUnit: boolean;
}
interface RequisitionOrderForHttp {
  PurchaseRequisitionOrderID: number;
  RefNo: string;
  Date?: string;
  VendorID?: number;
  DeliveryDate?: string;
  PaymentTerms: string;
  Description: string;
  TotalAmount?: number;
  TotalQuantity?: number;
  StatusId: number;
  PurchaseRequisitionOrderChildVMs: {
    PurchaseRequisitionOrderChildID: number;
    ItemID?: number;
    Quantity?: number;
    UnitId?: number;
    UnitPrice?: number;
    Tax?: number;
    ChildTotalPrice?: number;
    ConversionFactor?: number;
    IsSecondaryUnit?: boolean;
    ChildTotalQuantity?: number;
    UnitComposite?: number; // holds the index value of the selected unit
    /* …etc… */
  }[];
  RemovedPurchaseRequisitionOrderChildIds?: number[];
  MultipleAttachments: any[];
}
// ------------------------------------------------------------------------
// Reusable SearchableSelect components.
interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  items: Item[];
  placeholder?: string;
}

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

interface SearchableSelectVendorProps {
  value: string;
  onValueChange: (value: string) => void;
  vendors: Vendor[];
  placeholder?: string;
}

const SearchableSelectVendor: React.FC<SearchableSelectVendorProps> = ({
  value,
  onValueChange,
  vendors,
  placeholder = "Select Vendor",
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const filteredItems = vendors.filter((itm) =>
    itm.vendorName.toLowerCase().includes(searchQuery.toLowerCase())
  );
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent side="bottom" className="max-h-60 overflow-y-auto">
        <div className="p-2">
          <Input
            placeholder="Search vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {filteredItems.map((itm) => (
          <SelectItem key={itm.vendorID} value={itm.vendorID.toString()}>
            {itm.vendorName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

// ------------------------------------------------------------------------
// PurchaseOrderEdit Component.
const PurchaseOrderEdit: React.FC = () => {
  useAuthValidation();
  const { token, roleid } = useSelector((state: RootState) => state.userAuthStore);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Parent order state.
  const [refNo, setRefNo] = useState<string>("");
  const [orderDate, setOrderDate] = useState<Date>(new Date());
  const [vendorID, setVendorID] = useState<number>(0);
  const [deliveryDate, setDeliveryDate] = useState<string>("");
  const [paymentTerms, setPaymentTerms] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [totalQuantity, setTotalQuantity] = useState<number>(0);
  const [statusId, setStatusId] = useState<number>(1);
  const { hasPermission, loading: permissionsLoading } = usePermissions(roleid);
  const [isEditing, setIsEditing] = useState(false);
  const formatForPayload = useLocalDateString();
  const formatDateTime = useFormatDateTime();
  const { activityLogs, showActivityLog, toggleActivityLog } = useActivityLog(token);
  const [existingFiles, setExistingFiles] = useState<{ id: string; fileName: string; url: string; reference: string; }[]>([]);
  const [removeIds, setRemoveIds] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Dropdown data.
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  // Child items.
  const [lineItems, setLineItems] = useState<PurchaseRequisitionOrderChildVM[]>([]);
  // Available units per child.
  const [itemUnit, setItemUnit] = useState<{ [key: number]: ItemUnit[] }>({});

  // Validation errors.
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  // State to disable the submit button.
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // --------------------------------------
  // Fetch order details.
  const fetchOrderDetail = async () => {
    try {
      const res = await fetch(
        `${variables.API_URL}PurchaseRequisitionOrder/detailPurchaseOrderBy/${id}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!res.ok) {
        toast.error("Failed to fetch purchase order details.");
        return;
      }
      const data: PurchaseRequisitionOrderVM = await res.json();

      // Populate parent fields.
      setRefNo(data.refNo);

      setOrderDate(new Date(data.date));
      setVendorID(data.vendorID || 0);
      setDeliveryDate(data.deliveryDate ? data.deliveryDate.split("T")[0] : "");
      setPaymentTerms(data.paymentTerms);
      setDescription(data.description);
      setTotalAmount(data.totalAmount || 0);
      setTotalQuantity(data.totalQuantity || 0);
      setStatusId(data.statusId);
      setLineItems(data.purchaseRequisitionOrderChildVMs || []);
      setExistingFiles(
        data.multipleAttachments.map(ma => {
          const baseUrl = variables.API_URL.replace(/\/api\/?$/, ""); // Remove /api if present
          const mappedImagePath = `${baseUrl.replace(/\/$/, "")}/${ma.filePath}`; // Ensure no trailing slash on base URL

          return {
            id: ma.multipleAttachmentfileId.toString(),
            fileName: ma.fileName,
            url: mappedImagePath, // Corrected path
            reference: ma.referenceno
          };
        })
      );
      setRemoveIds([]);
      // For each child record that has an item selected,
      // fetch available units and then update the unitComposite field if a matching unit is found.
      data.purchaseRequisitionOrderChildVMs.forEach((child, index) => {
        if (child.itemID) {
          fetchItemUnitForRow(index, child.itemID);
        }
      });
      setIsEditing(true);
    } catch (error) {
      console.error("Error fetching order detail:", error);
      toast.error("Error fetching purchase order details.");
    }
  };

  // Fetch vendors.
  const fetchVendors = async () => {
    try {
      const response = await fetch(
        `${variables.API_URL}PurchaseRequisitionOrder/get-vendor`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setVendors(data);
      } else {
        toast.error("Failed to fetch vendors.");
      }
    } catch (error) {
      console.error("Error fetching vendors:", error);
    }
  };

  // Fetch items.
  const fetchItems = async () => {
    try {
      const response = await fetch(
        `${variables.API_URL}PurchaseRequisitionOrder/get-items`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      } else {
        toast.error("Failed to fetch items.");
      }
    } catch (error) {
      console.error("Error fetching items:", error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        // wait for vendors to load
        await fetchVendors();

        // then items
        await fetchItems();

        // then, if we're editing an existing order, load its details
        if (id) {
          await fetchOrderDetail();
        }
      } catch (err) {
        console.error("Error loading data:", err);
        toast.error("Failed to load data. Please try again.");
      }
    };

    loadData();
  }, [id, token]);
  // Add a new child item.
  const addLineItem = () => {
    const newItem: PurchaseRequisitionOrderChildVM = {
      purchaseRequisitionOrderChildID: 0,
      itemID: 0,
      quantity: 0,
      unitId: 0,
      unitPrice: 0,
      tax: 0,
      childTotalPrice: 0,
      conversionFactor: 1,
      isSecondaryUnit: false,
      childTotalQuantity: 0,
      unitComposite: 0,
    };
    setLineItems([...lineItems, newItem]);
  };
  // --------------------------------------
  // Update a child item's field.
  const updateLineItem = (
    index: number,
    field: keyof PurchaseRequisitionOrderChildVM,
    value: string | number | boolean
  ) => {
    const updatedItems = [...lineItems];
    (updatedItems[index] as any)[field] = value;
    // When quantity or unitPrice changes, recalc totals.
    if (field === "quantity" || field === "unitPrice") {
      const item = updatedItems[index];
      item.childTotalPrice = Number(item.quantity) * Number(item.unitPrice);
      if (item.isSecondaryUnit) {
        item.childTotalQuantity = Number(item.quantity) * Number(item.conversionFactor);
      } else {
        item.childTotalQuantity = Number(item.quantity);
      }
    }
    setLineItems(updatedItems);
  };

  // Remove a child item.
  const removeLineItem = (index: number) => {
    const updatedItems = [...lineItems];
    updatedItems.splice(index, 1);
    setLineItems(updatedItems);
  };

  // Calculate overall totals.
  const calculateTotalAmount = (): number => {
    return lineItems.reduce((sum, item) => sum + Number(item.childTotalPrice || 0), 0);
  };

  const calculateTotalQuantity = (): number => {
    return lineItems.reduce((sum, item) => sum + Number(item.childTotalQuantity || 0), 0);
  };

  // --------------------------------------
  // Helper: Fetch available units for a given item for a specific row.
  const fetchItemUnitForRow = async (rowId: number, itemId: number) => {
    try {
      const response = await fetch(
        `${variables.API_URL}PurchaseRequisitionOrder/get-units-by-item/${itemId}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
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
        // After fetching, update the child record's unitComposite if a matching unit is found.
        setLineItems((prev) => {
          const newItems = [...prev];
          const child = newItems[rowId];
          if (child.unitId) {
            const found = mappedData.find((u) => u.unitId === child.unitId);
            if (found) {
              child.unitComposite = found.index;
            }
          }
          return newItems;
        });
      } else {
        setItemUnit((prev) => ({ ...prev, [rowId]: [] }));
      }
    } catch (error) {
      console.error("Error fetching item units for row:", error);
      setItemUnit((prev) => ({ ...prev, [rowId]: [] }));
    }
  };

  // Helper: Fetch conversion factor.
  const fetchConversionFactor = async (itemId: number, unitId: number): Promise<number> => {
    try {
      const res = await fetch(
        `${variables.API_URL}PurchaseRequisitionOrder/get-conversionfactor?ItemtId=${itemId}&UnitId=${unitId}&IsSecondaryUnit=true`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        return data[0]?.conversionFactor || 0;
      }
      return 0;
    } catch (error) {
      console.error("Error fetching conversion factor:", error);
      return 0;
    }
  };

  // --------------------------------------
  // Handle form submission via PUT.
  const sendUpdate = async (
    payload: RequisitionOrderForHttp,
    onSuccessMsg: string
  ) => {
    try {
      const fd = new FormData();
      fd.append("request", JSON.stringify(payload));
      fd.append("removeAttachmentIds", JSON.stringify(removeIds));
      fd.append(
        "existingReferences",
        JSON.stringify(
          existingFiles.map(x => ({ id: parseInt(x.id), referenceno: x.reference }))
        )
      );
      appendToFormData(fd);
      const res = await fetch(
        `${variables.API_URL}PurchaseRequisitionOrder/${id}`,
        {
          method: "PUT",
          headers: {

            Authorization: `Bearer ${token}`,
          },
          body: (fd),
        }
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
      toast.success(onSuccessMsg);
      setTimeout(() => navigate("/purchase/order"), 2000);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    // Basic validations
    if (!description.trim()) {
      errors.Description = "Description is required.";
    }
    if (vendorID <= 0) {
      errors.vendorID = "Vendor is required.";
    }

    if (lineItems.length === 0) {
      errors.lineItems = "At least one item is required.";
    }

    // Per-line validations
    lineItems.forEach((child, index) => {
      if (child.itemID <= 0) {
        errors[`childItem_${index}`] = `Please select an item for line ${index + 1}.`;
      }
      if (child.quantity <= 0) {
        errors[`childQuantity_${index}`] = `Quantity must be greater than zero for line ${index + 1}.`;
      }
      if (child.unitId <= 0) {
        errors[`childUnit_${index}`] = `Please select a unit for line ${index + 1}.`;
      }
    });

    // 🚫 Duplicate-item check
    const comboCounts = lineItems
      .map(c => `${c.itemID}-${c.unitId}-${c.isSecondaryUnit}`)
      .reduce<Record<string, number>>((acc, combo) => {
        acc[combo] = (acc[combo] || 0) + 1;
        return acc;
      }, {});

    Object.entries(comboCounts).forEach(([combo, cnt]) => {
      if (cnt > 1) {
        lineItems.forEach((child, idx) => {
          if (`${child.itemID}-${child.unitId}-${child.isSecondaryUnit}` === combo) {
            errors[`childItem_${idx}`] =
              "This item with the selected unit is already on another line. Please pick a different combination.";
          }
        });
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  // Build base payload + status override
  const buildPayload = (overrideStatus: number): PurchaseRequisitionOrderVM => ({
    purchaseRequisitionOrderID: Number(id),
    refNo,
    date: formatForPayload(orderDate),
    vendorID,
    deliveryDate,
    paymentTerms,
    description,
    totalAmount: calculateTotalAmount(),
    totalQuantity: calculateTotalQuantity(),
    statusId: overrideStatus,
    purchaseRequisitionOrderChildVMs: lineItems,
    removedPurchaseRequisitionOrderChildIds: [],
    multipleAttachments: []
  });

  const buildHttpPayload = (overrideStatus: number): RequisitionOrderForHttp => ({
    PurchaseRequisitionOrderID: Number(id),
    RefNo: refNo,
    Date: formatForPayload(orderDate),
    VendorID: vendorID,
    DeliveryDate: deliveryDate,
    PaymentTerms: paymentTerms,
    Description: description,
    TotalAmount: calculateTotalAmount(),
    TotalQuantity: calculateTotalQuantity(),
    StatusId: overrideStatus,
    PurchaseRequisitionOrderChildVMs: lineItems.map(item => ({
      PurchaseRequisitionOrderChildID: item.purchaseRequisitionOrderChildID,
      ItemID: item.itemID,
      Quantity: item.quantity,
      UnitId: item.unitId,
      UnitPrice: item.unitPrice,
      Tax: item.tax,
      ChildTotalPrice: item.childTotalPrice,
      ConversionFactor: item.conversionFactor,
      IsSecondaryUnit: item.isSecondaryUnit,
      ChildTotalQuantity: item.childTotalQuantity,
      UnitComposite: item.unitComposite
      /* …etc… */
      /* …etc… */
    })),
    RemovedPurchaseRequisitionOrderChildIds: [],
    MultipleAttachments: [],
  });

  // Handlers
  const handleSubmit = (e: FormEvent) => {

    e.preventDefault();
    if (!validateForm()) return;
    sendUpdate(buildHttpPayload(statusId), "Purchase Order updated successfully!");
  };
  const handlePending = (e: FormEvent) => {

    e.preventDefault();
    if (!validateForm()) return;
    sendUpdate(buildHttpPayload(2), "Purchase Order marked Pending!");
  };
  const handleApprove = (e: FormEvent) => {

    e.preventDefault();
    if (!validateForm()) return;
    sendUpdate(buildHttpPayload(3), "Purchase Order approved successfully!");
  };

  const handleActivityLogToggle = async () => {
    if (id) {
      await toggleActivityLog(id, "PurchaseRequisitionOrder/activity_log/PurchaseRequisitionOrder");
    }
  };
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
      <h1 className="text-2xl font-semibold">Edit Purchase Order</h1>
      <Card className="p-6 space-y-6">
        <form onSubmit={handleSubmit}>
          {/* Order Details Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="refNo">Order Number</Label>
              <Input
                id="refNo"
                readOnly
                value={refNo}
                className="bg-gray-50"
                disabled
                style={{ backgroundColor: "#f8f8f8", color: "#000" }}
              />
            </div>
            <div className="space-y-2">
              <Label className="block text-sm font-medium">Date</Label>
              <div className="mt-1 w-full">
                <DatePicker
                  selected={orderDate}
                  onChange={(d: Date | null) => setOrderDate(d)}
                  dateFormat="dd MMM yyyy"
                  wrapperClassName="w-full"        // make the datepicker’s container full‐width
                  customInput={<Input className="w-full" />}  // make the input itself fill its container
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor</Label>
              <SearchableSelectVendor
                value={vendorID.toString()}
                onValueChange={(val) => setVendorID(Number(val))}
                vendors={vendors}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deliveryDate">Delivery Date</Label>
              <Input
                id="deliveryDate"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </div>
            {/* <div className="space-y-2">
              <Label htmlFor="paymentTerms">Payment Terms</Label>
              <Input
                id="paymentTerms"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="Enter payment terms"
              />
            </div> */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter description"
              />
            </div>
          </div>

          {/* Child Items Section */}
          <div>
            <div className="flex justify-between items-center py-4">
              <h3 className="text-lg font-semibold">Items</h3>
              <Button type="button" onClick={addLineItem} className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> Add Item
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead> Total Quantity</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead> Total Price</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.flatMap((child, rowIndex) => {
                  // Use child.unitComposite to determine current select value.
                  const compositeValue = child.unitComposite;
                  const rows: JSX.Element[] = [
                    (
                      <TableRow key={`child-${rowIndex}`}>
                        <TableCell>
                          <SearchableSelect
                            value={child.itemID ? child.itemID.toString() : ""}
                            onValueChange={(value) => {
                              const newItemId = Number(value);

                              // 1) set the item
                              updateLineItem(rowIndex, "itemID", newItemId);

                              // 2) reset unit‐related fields & fetch available units
                              updateLineItem(rowIndex, "unitId", 0);
                              updateLineItem(rowIndex, "conversionFactor", 0);
                              updateLineItem(rowIndex, "isSecondaryUnit", false);
                              updateLineItem(rowIndex, "unitComposite", 0);
                              updateLineItem(rowIndex, "childTotalQuantity", 0);
                              fetchItemUnitForRow(rowIndex, newItemId);

                              // 3) map the purchasePrice → UnitPrice
                              const selected = items.find((i) => i.itemId === newItemId);
                              if (selected) {
                                updateLineItem(rowIndex, "unitPrice", selected.purchasePrice);

                                // 4) re‐compute ChildTotalPrice
                                const qty = lineItems[rowIndex]?.quantity || 0;
                                updateLineItem(
                                  rowIndex,
                                  "childTotalPrice",
                                  qty * selected.purchasePrice
                                );
                              }
                            }}
                            items={items}
                          />

                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {itemUnit[rowIndex] && itemUnit[rowIndex].length > 0 ? (
                              <Select
                                value={
                                  compositeValue !== undefined ? compositeValue.toString() : ""
                                }
                                onValueChange={async (newComposite) => {
                                  const comp = Number(newComposite);
                                  const unitSelected = itemUnit[rowIndex]?.find(
                                    (u) => u.index === comp
                                  );
                                  if (unitSelected) {
                                    let newConversionFactor = 0;
                                    let newChildTotalQuantity = Number(child.quantity);
                                    if (unitSelected.isSecondaryUnit) {
                                      try {
                                        newConversionFactor = await fetchConversionFactor(
                                          child.itemID,
                                          unitSelected.unitId
                                        );
                                        newChildTotalQuantity = Number(child.quantity) * newConversionFactor;
                                      } catch (error) {
                                        console.error("Error fetching conversion factor:", error);
                                      }
                                    }
                                    updateLineItem(rowIndex, "unitComposite", comp);
                                    updateLineItem(rowIndex, "isSecondaryUnit", unitSelected.isSecondaryUnit);
                                    updateLineItem(rowIndex, "unitId", unitSelected.unitId);
                                    updateLineItem(rowIndex, "conversionFactor", newConversionFactor);
                                    updateLineItem(rowIndex, "childTotalQuantity", newChildTotalQuantity);
                                  }
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select Unit" />
                                </SelectTrigger>
                                <SelectContent>
                                  {itemUnit[rowIndex].map((unit) => (
                                    <SelectItem
                                      key={`row-${rowIndex}-unit-${unit.index}`}
                                      value={unit.index.toString()}
                                    >
                                      {unit.unitName} {unit.isSecondaryUnit ? "(Secondary)" : ""}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <div className="text-gray-500 text-sm">
                                No units available
                              </div>
                            )}
                            {child.isSecondaryUnit && (
                              <Input
                                type="number"
                                value={
                                  child.conversionFactor !== undefined
                                    ? child.conversionFactor.toString()
                                    : ""
                                }
                                disabled
                                className="w-32"
                              />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={child.quantity}
                            onChange={(e) => {
                              const qty = Number(e.target.value);
                              updateLineItem(rowIndex, "quantity", qty);
                              const item = lineItems[rowIndex];
                              if (item.isSecondaryUnit) {
                                updateLineItem(
                                  rowIndex,
                                  "childTotalQuantity",
                                  qty * Number(item.conversionFactor)
                                );
                              } else {
                                updateLineItem(rowIndex, "childTotalQuantity", qty);
                              }
                            }}
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={
                              child.childTotalQuantity !== undefined ? child.childTotalQuantity.toString() : "0"
                            }
                            disabled
                            className="w-32"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={child.unitPrice}
                            onChange={(e) =>
                              updateLineItem(rowIndex, "unitPrice", Number(e.target.value))
                            }
                            className="w-32"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={
                              child.childTotalPrice !== undefined ? child.childTotalPrice.toString() : "0"
                            }
                            disabled
                            className="w-32"
                          />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeLineItem(rowIndex)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  ];
                  if (validationErrors[`childItem_${rowIndex}`]) {
                    rows.push(
                      <TableRow key={`error-item-${rowIndex}`}>
                        <TableCell colSpan={7} className="validation-error">
                          {validationErrors[`childItem_${rowIndex}`]}
                        </TableCell>
                      </TableRow>
                    );
                  }
                  if (validationErrors[`childQuantity_${rowIndex}`]) {
                    rows.push(
                      <TableRow key={`error-quantity-${rowIndex}`}>
                        <TableCell colSpan={7} className="validation-error">
                          {validationErrors[`childQuantity_${rowIndex}`]}
                        </TableCell>
                      </TableRow>
                    );
                  }
                  
                 
                  if (validationErrors[`childUnit_${rowIndex}`]) {
                    rows.push(
                      <TableRow key={`error-unit-${rowIndex}`}>
                        <TableCell colSpan={7} className="validation-error">
                          {validationErrors[`childUnit_${rowIndex}`]}
                        </TableCell>
                      </TableRow>
                    );
                  }
                  return rows;
                })}
              </TableBody>
            </Table>
            {validationErrors.lineItems && (
              <div className="validation-error">{validationErrors.lineItems}</div>
            )}
          </div>

          {/* Totals Section */}
          <div className="mt-4 flex justify-end">
            <div className="inline-block max-w-xs border-2 border-dashed border-gray-300 p-4 rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600"> Total Quantity:</span>
                <span className="font-medium text-gray-800">{calculateTotalQuantity().toFixed(2)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600"> Total Amount:</span>
                <span className="font-medium text-gray-800">{calculateTotalAmount().toFixed(2)}</span>
              </div>

            </div>
          </div>
          {/* Attachments */}
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
          {/* Existing Attachments */}
          {existingFiles.map(f => (
            <div key={f.id} className="flex items-center gap-2 mb-2">
              {/* Link with download attribute to download the file */}
              {/* <a
                            href={f.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline text-blue-600"
                            download={f.fileName} // This triggers the download with the filename
                          >
                            {f.fileName}
                          </a> */}
              {f.fileName}
              {/* <Input
                            placeholder="Reference"
                            value={f.reference}
                            onChange={e => setExistingFiles(prev => prev.map(x => x.id === f.id ? { ...x, reference: e.target.value } : x))}
                            className="w-32"
                          /> */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setRemoveIds(ids => [...ids, parseInt(f.id)]);
                  setExistingFiles(prev => prev.filter(x => x.id !== f.id));
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                type="button"
                size="icon"

                onClick={() => {
                  const link = document.createElement("a");
                  link.href = f.url;
                  link.download = f.fileName;  // The filename
                  link.click();  // Trigger the download

                  // Inform the user to check the Downloads folder
                  // alert("Your file has been downloaded. Please check your Downloads folder.");
                }}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {/* render attachments */}
          {attachments.map((a) => (
            <div key={a.id} className="flex items-center gap-2">
              {/* <Input
                            placeholder="Reference"
                            value={a.reference}
                            onChange={(e) => updateReference(a.id, e.target.value)}
                          /> */}
              <span>{a.file.name}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeFile(a.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {isEditing && (
            <div className="flex items-center justify-between mt-4">
              {/* Left group: PENDING, APPROVE, VOID */}
              <div className="flex gap-4">
                {statusId !== 2 && statusId !== 3 && (
                  <Button onClick={handlePending}>
                    <Clock9 />
                    PENDING
                  </Button>
                )}
                {statusId !== 3 && (
                  <Button
                    onClick={handleApprove}
                    style={{ display: hasPermission(28, "approve") ? "flex" : "none" }}
                  >
                    <CircleCheck />
                    APPROVE
                  </Button>
                )}

              </div>

              {/* Right group: Cancel, Update */}
              <div className="flex gap-4">
                <Button variant="outline" type="button" onClick={() => navigate(-1)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>
                  {isEditing ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          )}
        </form>
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

export default PurchaseOrderEdit;
