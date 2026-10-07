import React, { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCallback } from "react"; 
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2, Plus, Download } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate, useParams } from "react-router-dom";
import { variables } from "@/Variables";
import { RootState } from "@/Storage/Redux/store";
import { useSelector } from "react-redux";
import useAuthValidation from "@/hooks/useAuthValidation";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import useLocalDateString from "@/hooks/useLocalDateString";
import { usePermissions } from "@/hooks/usePermissions";
import { useFileAttachments } from "@/hooks/useFileAttachments";
import { useMemo } from "react";

// Child row type
interface ChildRow {
  localKey: string;
  stockAdjustmentChildID?: number;
  itemID: string;
  itemStock: number;
  quantity: string;
}

interface warehousemodel {
  warehouseID: number,
  warehouseName: string
}
interface adjustmenttypemodel {

  adjustmentTypeID: number,
  name: string,
  inventoryEffect:number

}


interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  items: { itemId: number; itemName: string }[];
  placeholder?: string;
  disabled?: boolean;
}

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
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger
        disabled={disabled}
        className={`p-1 text-sm ${disabled ? "w-35 bg-[#b2bec3]" : "w-35"}`}
      >
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
interface MultipleAttachmentVM { multipleAttachmentfileId: number; fileName: string; filePath: string; referenceno: string; }
const StockAdjustment: React.FC = () => {
  useAuthValidation();

  const { token, roleid } = useSelector((s: RootState) => s.userAuthStore);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const formatForPayload = useLocalDateString();
  const { hasPermission, loading: permissionsLoading } = usePermissions(roleid);
  const [refNo, setRefNo] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [adjustmentTypeId, setAdjustmentTypeId] = useState<string>("");
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [children, setChildren] = useState<ChildRow[]>([]);
  const [items, setItems] = useState<{ itemId: number; itemName: string, itemStock: number }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [warehouses, setWarehouses] = useState<warehousemodel[]>([]);
  const [statusId, setStatusId] = useState<number>(0);
  const [adjustmentTypes, setAdjustmentTypes] = useState<adjustmenttypemodel[]>([]);
  const [existingFiles, setExistingFiles] = useState<{ id: string; fileName: string; url: string; reference: string; }[]>([]);
  const [removeIds, setRemoveIds] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  // compute total quantity
  const totalQuantity = children.reduce(
    (sum, c) => sum + (parseFloat(c.quantity) || 0),
    0
  );

  // load lookups and data
  useEffect(() => {
    if (!token) return;

    const loadAll = async () => {
      try {
        // helper with correct generic syntax and casting
        const fetchJSON = async <T,>(path: string): Promise<T> => {
          const url = `${variables.API_URL}StockAdjustment/${path}`;
          const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) {
            throw new Error(`HTTP ${res.status} fetching ${path}`);
          }
          return (await res.json()) as T;
        };

        // fire all three at once
        const [itemsData, warehousesData, typesData] = await Promise.all([
          fetchJSON<any[]>(`get-items`),
          fetchJSON<warehousemodel[]>(`get-Warehouses`),
          fetchJSON<adjustmenttypemodel[]>(`get-AdjustmentTypes`),
        ]);

        setItems(itemsData);
        setWarehouses(warehousesData);
        setAdjustmentTypes(typesData);

        if (!isEditing) {
          // new record → just grab the next ref
          const { stockAdjumentRef } = await fetchJSON<{ stockAdjumentRef: string }>(
            `GetNextStockAdjustmentsRefNumber`
          );
          setRefNo(stockAdjumentRef ?? "");
          return;
        }

        // editing → fetch the VM
        const vm = await fetchJSON<{
          refNo: string;
          date?: string;
          adjustmentTypeID?: number;
          wareHouseId?: number;
          statusId?: number;
          description?: string;
          stockAdjustmentChildVMs: Array<{
            stockAdjustmentChildID?: number;
            itemID?: number;
            quantity?: number;
            itemStock?: number;

          }>,
          multipleAttachments?: MultipleAttachmentVM[];
        }>(id.toString());

        setRefNo(vm.refNo);
        setDate(vm.date ? new Date(vm.date) : new Date());
        setAdjustmentTypeId(vm.adjustmentTypeID?.toString() || "");
        setWarehouseId(vm.wareHouseId?.toString() || "");
        setStatusId(vm.statusId || 0);
        setDescription(vm.description || "");
        setChildren(
          vm.stockAdjustmentChildVMs.map((c, idx) => ({
            localKey:
              c.stockAdjustmentChildID && c.stockAdjustmentChildID > 0
                ? c.stockAdjustmentChildID.toString()
                : `new-${Date.now()}-${idx}`,
            stockAdjustmentChildID: c.stockAdjustmentChildID,
            itemID: c.itemID?.toString() || "",
            quantity: c.quantity?.toString() || "",
            itemStock: c.itemStock || 0,
          }))
        );
        setExistingFiles(
          vm.multipleAttachments.map(ma => {
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
      } catch (error) {
        console.error(error);
        toast.error("Error loading Stock Adjustment data");
      }
    };

    loadAll();
  }, [token, id, isEditing]);

  // add empty row
  const addRow = () => {
    setChildren((prev) => [
      ...prev,
      { localKey: `new-${Date.now()}`, itemID: "", quantity: "", itemStock: 0 },
    ]);
  };

  // update child row
  const updateChild = (
    key: string,
    field: "itemID" | "quantity" | "itemStock",
    value: string
  ) => {
    setChildren((prev) =>
      prev.map((r) =>
        r.localKey === key ? { ...r, [field]: value } : r
      )
    );
  };

  // remove child row
  const removeRow = (key: string) => {
    setChildren((prev) => prev.filter((r) => r.localKey !== key));
  };

  // submit handler
  const buildPayload = (newStatus: number | null) => ({
    StockAdjustmentID: isEditing ? parseInt(id!) : 0,
    RefNo: refNo,
    Date: formatForPayload(date),
    AdjustmentTypeID: adjustmentTypeId ? parseInt(adjustmentTypeId) : null,
    Description: description,
    TotalQuantity: totalQuantity,
    StatusId: newStatus,
    WareHouseId: warehouseId ? parseInt(warehouseId) : null,
    StockAdjustmentChildVMs: children.map((c) => ({
      StockAdjustmentChildID: c.stockAdjustmentChildID || 0,
      StockAdjustmentID: isEditing ? parseInt(id!) : 0,
      ItemID: c.itemID ? parseInt(c.itemID) : null,
      Quantity: parseFloat(c.quantity) || 0,
    })),
  });

  // 2) Send update to your StockAdjustment endpoint
  const sendUpdate = async (
    payload: ReturnType<typeof buildPayload>,
    successMsg: string
  ) => {
    setIsSubmitting(true); if (submitGuard()) return;

     if (!validateForm()) 
    {
      setIsSubmitting(false);
      return;
    }
    try {
      const fd = new FormData();
      fd.append("request", JSON.stringify(payload));
      if (isEditing) {
        fd.append("removeAttachmentIds", JSON.stringify(removeIds));
      }
      fd.append(
        "existingReferences",
        JSON.stringify(
          existingFiles.map(x => ({ id: parseInt(x.id), referenceno: x.reference }))
        )
      );
      appendToFormData(fd);
      const url = `${variables.API_URL}StockAdjustment${isEditing ? `/${id}` : ""}`;
      const method = isEditing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: {

          Authorization: `Bearer ${token}`,
        },
        body: (fd),
      });
      if (!res.ok) throw new Error((await res.text()) || res.statusText);
      toast.success(successMsg);
      // optionally reload or go back:
      setTimeout(() => navigate("/inventory/stockadjustments"), 2000);
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendUpdate(
      buildPayload(statusId),
      isEditing ? "Updated successfully!" : "Created successfully!"
    );
  };
  // 3) Handlers for Pending / Approve
  const handlePending = (e: React.FormEvent) => {
    e.preventDefault();
    sendUpdate(buildPayload(2), "Marked Pending!");
  };

  const handleApprove = (e: React.FormEvent) => {
    e.preventDefault();
    sendUpdate(buildPayload(3), "Approved successfully!");
  };
  const getStatusText = (statusId: number): string => {
    switch (statusId) {
      case 1:
        return "Draft";
      case 2:
        return "Pending";
      case 3:
        return "Approved";
      case 4:
        return "Void";
      default:
        return "Unknown";
    }
  };
  const {
    attachments,
    addFiles,
    updateReference,
    removeFile,
    appendToFormData,
  } = useFileAttachments();

 

 const selectedAdjustmentType = useMemo(() => 
  adjustmentTypes.find(t => t.adjustmentTypeID.toString() === adjustmentTypeId),
[adjustmentTypes, adjustmentTypeId]);

// only enforce stock‐check when inventoryEffect is 0
const isReducingInventory = selectedAdjustmentType?.inventoryEffect === 0;

// Now memoized stock validation:
const hasInsufficientStock = useMemo(() => {
  if (!isReducingInventory) return false;

  return children.some((li) => {
    return parseFloat(li.quantity) > li.itemStock;
  });
}, [children, isReducingInventory]);

  const submitGuard = (): boolean => {
    if (hasInsufficientStock) {
      toast.error(
        "Cannot submit: one or more quantities exceed available stock."
      );
      return true;
    }
    return false;
  };

useEffect(() => {
  // 1️⃣ If no warehouse is selected, zero out all itemStock fields:
  if (!warehouseId) {
    setChildren(prev =>
      prev.map(r => ({ ...r, itemStock: 0 }))
    );
    return;
  }

  // 2️⃣ Otherwise, for each row that has a non‐empty itemID, fetch its stock
  const fetchStockForRow = async (itemID: number, rowKey: string) => {
    try {
      const res = await fetch(
        `${variables.API_URL}StockAdjustment/get-ItemStock/${itemID}/${parseInt(warehouseId, 10)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error(res.statusText);

      // The API returns a list: [{ ItemStockQuantity: number }, …]
      const data: Array<{ itemStockQuantity: number }> = await res.json();
      const qty = data.length > 0 ? data[0].itemStockQuantity : 0;

      setChildren(prev =>
        prev.map(r =>
          r.localKey === rowKey
            ? { ...r, itemStock: qty }
            : r
        )
      );
    } catch (err) {
      console.error(`Error fetching stock for item ${itemID} / warehouse ${warehouseId}:`, err);
    }
  };

  children.forEach(row => {
    const idNum = parseInt(row.itemID, 10);
    if (idNum && warehouseId) {
      fetchStockForRow(idNum, row.localKey);
    }
  });
}, [
  warehouseId,
  token,
  // re‐run this effect if any row’s itemID changes OR if the number of rows changes:
  children.map(c => c.itemID).join(",")
]);
// 3) Next, modify handleItemChange so that when the user picks an item,
//    you immediately fetch its stock (if a warehouse is already selected):
const handleItemChange = useCallback(
  (key: string, newItemID: string) => {
    const idNum = parseInt(newItemID, 10);

    if (idNum && warehouseId) {
      // If a warehouse is already selected, fetch just this row’s stock immediately:
      fetch(`${variables.API_URL}StockAdjustment/get-ItemStock/${idNum}/${parseInt(warehouseId, 10)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async res => {
          if (!res.ok) throw new Error(res.statusText);
          // Notice: the API returns an array [{ ItemStockQuantity: … }]
          const data: Array<{ itemStockQuantity: number }> = await res.json();
          const stockQty = data.length > 0 ? data[0].itemStockQuantity : 0;

          setChildren(prev =>
            prev.map(r =>
              r.localKey === key
                ? { ...r, itemID: newItemID, itemStock: stockQty }
                : r
            )
          );
        })
        .catch(err => {
          console.error(`Error fetching stock for item ${idNum}:`, err);
          // Still update the itemID, but leave itemStock at 0 if the fetch fails
          setChildren(prev =>
            prev.map(r =>
              r.localKey === key
                ? { ...r, itemID: newItemID, itemStock: 0 }
                : r
            )
          );
        });
    } else {
      // No warehouse selected yet: just set the new itemID, clear stock to 0
      setChildren(prev =>
        prev.map(r =>
          r.localKey === key
            ? { ...r, itemID: newItemID, itemStock: 0 }
            : r
        )
      );
    }
  },
  [warehouseId, token]
);

useEffect(() => {
  if (!isReducingInventory || !warehouseId) return;

  children.forEach(row => {
    const idNum = parseInt(row.itemID, 10);
    if (idNum) {
      // Force re-fetch of stock
      fetch(`${variables.API_URL}StockAdjustment/get-ItemStock/${idNum}/${parseInt(warehouseId, 10)}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(async res => {
          if (!res.ok) throw new Error(res.statusText);
          const data: Array<{ itemStockQuantity: number }> = await res.json();
          const stockQty = data.length > 0 ? data[0].itemStockQuantity : 0;
          setChildren(prev =>
            prev.map(r =>
              r.localKey === row.localKey
                ? { ...r, itemStock: stockQty }
                : r
            )
          );
        })
        .catch(err => {
          console.error("Error updating stock on type change", err);
        });
    }
  });
}, [adjustmentTypeId]);


 const validateForm = (): boolean => {
  const errors: Record<string, string> = {};

  // Validate main item fields
  if (Number(warehouseId) <= 0) {
    errors.warehouseId = "Please Select Warehouse";
  }

  if (Number(adjustmentTypeId) <= 0) {
    errors.adjustmentTypeId = "Please Select Adjustment Type";
  }

  
  // Validate children quantities
  children.forEach((row, index) => {
    const q = row.quantity;
    const parsed = parseFloat(q);

    if (!q || isNaN(parsed)) {
      errors[`quantity-${row.localKey}`] = `Quantity in row ${index + 1} is required.`;
    } else if (parsed < 0) {
      errors[`quantity-${row.localKey}`] = `Quantity in row ${index + 1} cannot be negative.`;
    }
  });

  setValidationErrors(errors);
  return Object.keys(errors).length === 0;
};

  return (
    <div className="space-y-6">
      <ToastContainer />
      <h1 className="text-2xl font-semibold">
        {isEditing ? "Edit Stock Adjustment" : "New Stock Adjustment"}
      </h1>
      <Card className="p-6 space-y-6">
        <div className="space-y-6">
          {isEditing && (<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 justify-self-start">
              <Label className="text-lg">{refNo}</Label>
            </div>

            <div className="space-y-2 justify-self-end text-right">
              <Label className="text-lg">{getStatusText(statusId)}</Label>
            </div>
          </div>)}
          {isEditing && (<hr />)}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Ref No</Label>
              <Input readOnly disabled value={refNo} />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <DatePicker
                selected={date}
                onChange={(d: Date) => setDate(d)}
                dateFormat="dd MMM yyyy"
                wrapperClassName="w-full"
                customInput={<Input className="w-full" />}
              />
            </div>
            <div className="space-y-2">
              <Label>Adjustment Type</Label>
              <Select value={adjustmentTypeId} onValueChange={(value) => setAdjustmentTypeId(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Adjustment Type" />
                </SelectTrigger>
                <SelectContent>
                  {adjustmentTypes.map((adjustmentType) => (
                    <SelectItem key={adjustmentType.adjustmentTypeID} value={adjustmentType.adjustmentTypeID.toString()}>
                      {adjustmentType.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
                {validationErrors.adjustmentTypeId && (
              <div className="validation-error">{validationErrors.adjustmentTypeId}</div>
            )}
            </div>
            <div className="space-y-2">
              <Label>Warehouse </Label>
              <Select value={warehouseId} onValueChange={(value) => setWarehouseId(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.warehouseID} value={warehouse.warehouseID.toString()}>
                      {warehouse.warehouseName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
                {validationErrors.warehouseId && (
              <div className="validation-error">{validationErrors.warehouseId}</div>
            )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Items</h3>
              {warehouseId && (
              <Button type="button" onClick={addRow} className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> Add Row
              </Button>)}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Available Stock</TableHead>
                  <TableHead>Quantity</TableHead>
                  {!isEditing && (<TableHead>Action</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {children.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4">
                      No items added yet
                    </TableCell>
                  </TableRow>
                ) : (
                  children.map((row) => (
                    <TableRow key={row.localKey}>
                      <TableCell>
                        <SearchableSelect
  value={row.itemID}
  onValueChange={(val) => handleItemChange(row.localKey, val)}
  items={items}
  placeholder="Select item"
  disabled={statusId === 3}
/>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={row.itemStock}
                          readOnly
                          disabled
                           className="w-full p-1 text-sm bg-orange-100"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={row.quantity}
                          onChange={(e) => updateChild(row.localKey, "quantity", e.target.value)}
                          disabled={statusId === 3}
                          readOnly={statusId === 3}
                          title={ hasInsufficientStock ? "Requested quantity exceeds available stock" : undefined } className={`w-20 p-1 text-sm border rounded ${ hasInsufficientStock ? "bg-red-100 border-red-500" : "bg-white-100 border-white-200" }`}
                        />
                         {validationErrors[`quantity-${row.localKey}`] && (
      <div className="text-red-600 text-xs mt-1">
        {validationErrors[`quantity-${row.localKey}`]}
      </div>
    )}
                      </TableCell>
                      {!isEditing && (<TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRow(row.localKey)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>)}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <div className="flex justify-end mt-2">
              <span className="font-medium">Total Quantity: {totalQuantity}</span>
            </div>
          </div>
          {/* Attachments */}
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
            <div className="flex justify-between mt-4">
              <div className="flex gap-4">
                {statusId !== 2 && statusId !== 3 && (
                  <Button
                    onClick={handlePending}
                    disabled={isSubmitting || hasInsufficientStock}
                  >
                    PENDING
                  </Button>
                )}
                {statusId !== 3 && hasPermission(33, "approve") && (
                  <Button
                    onClick={handleApprove}
                   disabled={isSubmitting || hasInsufficientStock}
                  >
                    APPROVE
                  </Button>
                )}
              </div>
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => navigate(-1)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting || hasInsufficientStock}>
                  Update
                </Button>
              </div>
            </div>
          )}

          {!isEditing && (
            <div className="flex justify-end gap-4">
              <Button variant="outline" type="button" onClick={() => navigate(-1)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={isSubmitting || hasInsufficientStock}>
                Create
              </Button>
            </div>)}
        </div>
      </Card>
    </div>
  );
};

export default StockAdjustment;
