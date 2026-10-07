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
import { Plus, Trash2 } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import { variables } from "@/Variables";
import useAuthValidation from "@/hooks/useAuthValidation";
import { useSelector } from "react-redux";
import { RootState } from "@/Storage/Redux/store";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useFileAttachments } from "@/hooks/useFileAttachments";

// Extend your PurchaseRequisitionOrderChildRequest to include UnitComposite (optional)
interface PurchaseRequisitionOrderChildRequest {
  PurchaseRequisitionOrderChildID?: number;
  ItemID: number;
  Quantity: number;
  UnitId: number;
  UnitPrice: number;
  Tax: number;
  ChildTotalPrice: number;
  ConversionFactor: number;
  IsSecondaryUnit: boolean;
  ChildTotalQuantity: number;
  UnitComposite?: number; // new field to store the selected unit's composite value
}

interface PurchaseRequisitionOrderRequest {
  RefNo: string;
  Date: string;
  VendorID: number;
  DeliveryDate: string;
  PaymentTerms: string;
  Description: string;
  TotalAmount: number;
  TotalQuantity: number;
  StatusId: number;
  PurchaseRequisitionOrderChildRequests: PurchaseRequisitionOrderChildRequest[];
}

interface Vendor {
  vendorID: number;
  vendorName: string;
}

interface Item {
  itemId: number;
  itemName: string;
  purchasePrice: number;
}

// This interface is used to represent available units for an item.
interface ItemUnit {
  index: number;
  unitId: number;
  unitName: string;
  isSecondaryUnit: boolean;
}

// SearchableSelect for Items
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

// SearchableSelect for Vendors
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

const PurchaseOrder: React.FC = () => {
  useAuthValidation();
  const { token } = useSelector((state: RootState) => state.userAuthStore);
  const navigate = useNavigate();

  // Form state for purchase order.
  const [refNo, setRefNo] = useState<string>("");

  const [orderDate, setOrderDate] = useState<Date>(new Date());
  const [vendorID, setVendorID] = useState<number>(0);


  const [deliveryDate, setDeliveryDate] = useState<Date>(new Date());
  const [paymentTerms, setPaymentTerms] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  // State for vendors and items loaded from API endpoints.
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  // State to track line items (child items)
  const [lineItems, setLineItems] = useState<PurchaseRequisitionOrderChildRequest[]>([]);

  // State to store available units for each line item keyed by row index.
  const [itemUnit, setItemUnit] = useState<{ [key: number]: ItemUnit[] }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Validation errors if needed.
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});



  // Fetch functions.
  const fetchRefNo = async () => {
    try {
      const response = await fetch(
        `${variables.API_URL}PurchaseRequisitionOrder/GetNextPurchaseRefNumber`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setRefNo(data.purchaseRefNumber);
      } else {
        throw new Error("Failed to fetch reference number");
      }
    } catch (error) {
      console.error("Error fetching reference number:", error);
    }
  };

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
        throw new Error("Failed to fetch vendors");
      }
    } catch (error) {
      console.error("Error fetching vendors:", error);
    }
  };

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
        throw new Error("Failed to fetch items");
      }
    } catch (error) {
      console.error("Error fetching items:", error);
    }
  };

  useEffect(() => {
    fetchRefNo();
    fetchVendors();
    fetchItems();
  }, []);

  // Add a new child item.
  const addLineItem = () => {
    const newItem: PurchaseRequisitionOrderChildRequest = {
      ItemID: 0,
      Quantity: 0,
      UnitId: 0,
      UnitPrice: 0,
      Tax: 0,
      ChildTotalPrice: 0,
      ConversionFactor: 1,
      IsSecondaryUnit: false,
      ChildTotalQuantity: 0,
      UnitComposite: 0,
    };
    setLineItems([...lineItems, newItem]);
  };

  // Update a child item's field.
  const updateLineItem = (
    index: number,
    field: keyof PurchaseRequisitionOrderChildRequest,
    value: string | number | boolean
  ) => {
    const updatedItems = [...lineItems];
    (updatedItems[index] as any)[field] = value;
    if (field === "Quantity" || field === "UnitPrice") {
      const item = updatedItems[index];

      if (item.IsSecondaryUnit) {
        item.ChildTotalQuantity = Number(item.Quantity) * Number(item.ConversionFactor);
      } else {
        item.ChildTotalQuantity = Number(item.Quantity);
      }
      item.ChildTotalPrice = Number(item.ChildTotalQuantity) * Number(item.UnitPrice);
    }
    setLineItems(updatedItems);
  };

  // Remove a child item.
  const removeLineItem = (index: number) => {
    const updatedItems = [...lineItems];
    updatedItems.splice(index, 1);
    setLineItems(updatedItems);
  };

  // Calculate overall total amount.
  const calculateTotalAmount = () => {
    return lineItems.reduce((sum, item) => sum + Number(item.ChildTotalPrice), 0);
  };

  // Calculate overall total quantity.
  const calculateTotalQuantity = () => {
    return lineItems.reduce((sum, item) => sum + Number(item.ChildTotalQuantity), 0);
  };

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
      if (child.ItemID <= 0) {
        errors[`childItem_${index}`] = `Please select an item for line ${index + 1}.`;
      }
      if (child.Quantity <= 0) {
        errors[`childQuantity_${index}`] = `Quantity must be greater than zero for line ${index + 1}.`;
      }
      if (child.UnitId <= 0) {
        errors[`childUnit_${index}`] = `Please select a unit for line ${index + 1}.`;
      }
    });

    // 🚫 Duplicate-item check
    const comboCounts = lineItems
      .map(c => `${c.ItemID}-${c.UnitId}-${c.IsSecondaryUnit}`)
      .reduce<Record<string, number>>((acc, combo) => {
        acc[combo] = (acc[combo] || 0) + 1;
        return acc;
      }, {});

    Object.entries(comboCounts).forEach(([combo, cnt]) => {
      if (cnt > 1) {
        lineItems.forEach((child, idx) => {
          if (`${child.ItemID}-${child.UnitId}-${child.IsSecondaryUnit}` === combo) {
            errors[`childItem_${idx}`] =
              "This item with the selected unit is already on another line. Please pick a different combination.";
          }
        });
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  // Handle form submission.
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    // Disable submit button during submission.
    setIsSubmitting(true);
    const payload: PurchaseRequisitionOrderRequest = {
      RefNo: refNo,
      Date: orderDate
        ? orderDate.toISOString()
        : undefined,
      VendorID: vendorID,

      DeliveryDate: deliveryDate
        ? deliveryDate.toISOString()
        : undefined,
      PaymentTerms: paymentTerms,
      Description: description,
      TotalAmount: calculateTotalAmount(),
      TotalQuantity: calculateTotalQuantity(),
      StatusId: 1,
      PurchaseRequisitionOrderChildRequests: lineItems,
    };

    try {
      const fd = new FormData();
      fd.append("request", JSON.stringify(payload));


      appendToFormData(fd);
      const res = await fetch(
        `${variables.API_URL}PurchaseRequisitionOrder/AddPurchaseRequisitionOrder`,
        {
          method: "POST",
          headers: {

            Authorization: `Bearer ${token}`,
          },
          body: (fd)
        }
      );
      if (res.ok) {
        toast.success("Purchase Order created successfully!");
        // Optionally, wait a bit before navigating.
        setTimeout(() => {
          navigate("/purchase/order");
        }, 2000);
      } else {
        const errorData = await res.text();
        toast.error(errorData);
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Error creating purchase order", error);
      toast.error("Failed to create purchase order");
      setIsSubmitting(false);
    }
  };

  // New state for submit button.
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const {
    attachments,
    addFiles,
    updateReference,
    removeFile,
    appendToFormData,
  } = useFileAttachments();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">New Purchase Order</h1>
      <Card>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
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
                {validationErrors.vendorID && (
                  <p className="validation-error">{validationErrors.vendorID}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="block text-sm font-medium">Delivery Date</Label>
                <div className="mt-1 w-full">
                  <DatePicker
                    selected={deliveryDate}
                    onChange={(d: Date | null) => setDeliveryDate(d)}
                    dateFormat="dd MMM yyyy"
                    wrapperClassName="w-full"        // make the datepicker’s container full‐width
                    customInput={<Input className="w-full" />}  // make the input itself fill its container
                  />
                </div>
              </div>
              {/* <div className="space-y-2">
                <Label htmlFor="paymentTerms" >Payment Terms</Label>
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
                {validationErrors.Description && (
                  <p className="validation-error">{validationErrors.Description}</p>
                )}
              </div>
            </div>

            {/* Modified Child Items Section using flatMap */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Items</h3>
                {/* IMPORTANT: type="button" so that clicking does not submit the form */}
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
                    <TableHead>Net Price</TableHead>
                    <TableHead> Total Price</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.flatMap((child, rowIndex) => {
                    const compositeValue = child.UnitComposite;
                    const rows: JSX.Element[] = [
                      (
                        <TableRow key={`child-${rowIndex}`}>
                          <TableCell>
                            <SearchableSelect
                              value={child.ItemID ? child.ItemID.toString() : ""}
                              onValueChange={(value) => {
                                const newItemId = Number(value);

                                // 1) set the item
                                updateLineItem(rowIndex, "ItemID", newItemId);

                                // 2) reset unit‐related fields & fetch available units
                                updateLineItem(rowIndex, "UnitId", 0);
                                updateLineItem(rowIndex, "ConversionFactor", 0);
                                updateLineItem(rowIndex, "IsSecondaryUnit", false);
                                updateLineItem(rowIndex, "UnitComposite", 0);
                                updateLineItem(rowIndex, "ChildTotalQuantity", 0);
                                fetchItemUnitForRow(rowIndex, newItemId);

                                // 3) map the purchasePrice → UnitPrice
                                const selected = items.find((i) => i.itemId === newItemId);
                                if (selected) {
                                  updateLineItem(rowIndex, "UnitPrice", selected.purchasePrice);

                                  // 4) re‐compute ChildTotalPrice
                                  const qty = lineItems[rowIndex]?.Quantity || 0;
                                  updateLineItem(
                                    rowIndex,
                                    "ChildTotalPrice",
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
                                  value={compositeValue !== undefined ? compositeValue.toString() : ""}
                                  onValueChange={async (newComposite) => {
                                    const comp = Number(newComposite);
                                    const unitSelected = itemUnit[rowIndex]?.find(
                                      (u) => u.index === comp
                                    );
                                    if (unitSelected) {
                                      let newConversionFactor = 0;
                                      let newChildTotalQuantity = Number(child.Quantity);
                                      if (unitSelected.isSecondaryUnit) {
                                        try {
                                          newConversionFactor = await fetchConversionFactor(
                                            child.ItemID,
                                            unitSelected.unitId
                                          );
                                          newChildTotalQuantity = Number(child.Quantity) * newConversionFactor;
                                        } catch (error) {
                                          console.error("Error fetching conversion factor:", error);
                                        }
                                      }
                                      updateLineItem(rowIndex, "UnitComposite", comp);
                                      updateLineItem(rowIndex, "IsSecondaryUnit", unitSelected.isSecondaryUnit);
                                      updateLineItem(rowIndex, "UnitId", unitSelected.unitId);
                                      updateLineItem(rowIndex, "ConversionFactor", newConversionFactor);
                                      updateLineItem(rowIndex, "ChildTotalQuantity", newChildTotalQuantity);
                                      // updateLineItem(rowIndex, "UnitPrice", newChildTotalQuantity);
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
                                        {unit.unitName}{" "}
                                        {unit.isSecondaryUnit ? "(Secondary)" : ""}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <div className="text-gray-500 text-sm">
                                  No units available
                                </div>
                              )}
                              {child.IsSecondaryUnit && (
                                <Input
                                  type="number"
                                  value={
                                    child.ConversionFactor !== undefined
                                      ? child.ConversionFactor.toString()
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
                              value={child.Quantity}
                              onChange={(e) => {
                                const qty = Number(e.target.value);
                                updateLineItem(rowIndex, "Quantity", qty);
                                const item = lineItems[rowIndex];
                                if (item.IsSecondaryUnit) {
                                  updateLineItem(
                                    rowIndex,
                                    "ChildTotalQuantity",
                                    qty * Number(item.ConversionFactor)
                                  );
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
                            <Input
                              type="number"
                              value={child.UnitPrice}
                              onChange={(e) =>
                                updateLineItem(rowIndex, "UnitPrice", Number(e.target.value))
                              }
                              className="w-32"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={child.ChildTotalPrice !== undefined ? child.ChildTotalPrice.toString() : "0"}
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

                    // Optionally include validation error rows if present.
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
              {lineItems.length > 0 && (
                <div className="flex justify-end">
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
              )}
            </div>
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

            {/* Form Submission Buttons */}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              {/* Disable submit button when isSubmitting is true */}
              <Button type="submit" disabled={isSubmitting}>
                Create
              </Button>
            </div>
          </div>
        </form>
      </Card>
      <ToastContainer />
    </div>
  );
};

export default PurchaseOrder;
