import React, { useState, useEffect, useRef, useCallback } from "react";
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

// Child‐row type
interface ChildRow {
  localKey: string;
  stockMovementChildID?: number;
  itemID: string;
  itemStock: number;
  quantity: string;
}

interface WarehouseModel {
  warehouseID: number;
  warehouseName: string;
}

interface MultipleAttachmentVM {
  multipleAttachmentfileId: number;
  fileName: string;
  filePath: string;
  referenceno: string;
}

const StockMovement: React.FC = () => {
  useAuthValidation();

  const { token, roleid } = useSelector((s: RootState) => s.userAuthStore);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const formatForPayload = useLocalDateString(); // e.g. “yyyy-MM-dd”
  const { hasPermission, loading: permissionsLoading } = usePermissions(roleid);
  const {
    attachments,
    addFiles,
    updateReference,
    removeFile,
    appendToFormData,
  } = useFileAttachments();

  // Parent fields
  const [refNo, setRefNo] = useState<string>("");
  const [date, setDate] = useState<Date>(new Date());
  const [fromWarehouseId, setFromWarehouseId] = useState<string>("");
  const [toWarehouseId, setToWarehouseId] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  // Status (1=Draft,2=Pending,3=Approved,4=Void)
  const [statusId, setStatusId] = useState<number>(1);

  // Child rows
  const [children, setChildren] = useState<ChildRow[]>([]);

  // Lookups
  const [items, setItems] = useState<
    { itemId: number; itemName: string; itemStock: number }[]
  >([]);
  const [warehouses, setWarehouses] = useState<WarehouseModel[]>([]);

  // Existing attachments (when editing)
  const [existingFiles, setExistingFiles] = useState<
    { id: string; fileName: string; url: string; reference: string }[]
  >([]);

  // Track removed‐file‐IDs (if the user deletes an existing attachment)
  const [removeIds, setRemoveIds] = useState<number[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Compute totalQuantity from child rows
  const totalQuantity = children.reduce(
    (sum, c) => sum + (parseFloat(c.quantity) || 0),
    0
  );

  // Load lookups + existing data (if editing)
  useEffect(() => {
    if (!token) return;

    const loadAll = async () => {
      try {
        // Generic fetch‐JSON helper
        const fetchJSON = async <T,>(path: string): Promise<T> => {
          const url = `${variables.API_URL}${path}`;
          const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) {
            throw new Error(`HTTP ${res.status} fetching ${path}`);
          }
          return (await res.json()) as T;
        };

        // We assume you have these endpoints already:
        //   GET api/Items/get-items
        //   GET api/Warehouses/get-warehouses
        const [itemsData, warehousesData] = await Promise.all([
          fetchJSON<{ itemId: number; itemName: string; itemStock: number }[]>(
            `StockMovements/get-items`
          ),
          fetchJSON<WarehouseModel[]>(`StockMovements/get-warehouses`),
        ]);

        setItems(itemsData);
        setWarehouses(warehousesData);

        if (!isEditing) {
          // For “Create”, fetch next RefNo from server:
          // (Assuming you have an endpoint: GET api/StockMovements/GetNextRefNumber)
          const { stockMovementRef }: { stockMovementRef: string } = await fetchJSON<{
            stockMovementRef: string;
          }>(`StockMovements/GetNextStockMovementsRefNumber`);
          setRefNo(stockMovementRef ?? "");
          return;
        }

        // If editing → fetch the VM
        const vm = await fetchJSON<{
          stockMovementID: number;
          refNo: string;
          date?: string;
          to_WareHouseId?: number;
          from_WareHouseId?: number;
          description?: string;
          totalQuantity?: number;
          statusId?: number;
          stockMovementChildVMs: Array<{
            stockMovementChildID?: number;
            itemID?: number;
            quantity?: number;
            itemStock?: number;
          }>;
          multipleAttachments?: MultipleAttachmentVM[];
        }>(`StockMovements/${id}`);

        // Populate parent
        setRefNo(vm.refNo);
        setDate(vm.date ? new Date(vm.date) : new Date());
        setFromWarehouseId((vm.from_WareHouseId ?? 0).toString());
        setToWarehouseId((vm.to_WareHouseId ?? 0).toString());
        setStatusId(vm.statusId ?? 1);
        setDescription(vm.description ?? "");

        // Populate children
        setChildren(
          vm.stockMovementChildVMs.map((c, idx) => ({
            localKey:
              c.stockMovementChildID && c.stockMovementChildID > 0
                ? c.stockMovementChildID.toString()
                : `new-${Date.now()}-${idx}`,
            stockMovementChildID: c.stockMovementChildID,
            itemID: c.itemID?.toString() || "",
            quantity: c.quantity?.toString() || "",
            itemStock: c.itemStock ?? 0,
          }))
        );

        // Populate existing attachments
        setExistingFiles(
          (vm.multipleAttachments || []).map((ma) => {
            const baseUrl = variables.API_URL.replace(/\/api\/?$/, "");
            const mappedPath = `${baseUrl.replace(/\/$/, "")}/${ma.filePath}`;
            return {
              id: ma.multipleAttachmentfileId.toString(),
              fileName: ma.fileName,
              url: mappedPath,
              reference: ma.referenceno,
            };
          })
        );
      } catch (error) {
        console.error(error);
        toast.error("Error loading Stock Movement data");
      }
    };

    loadAll();
  }, [token, id, isEditing]);

  // Add an empty child row
  const addRow = () => {
    setChildren((prev) => [
      ...prev,
      { localKey: `new-${Date.now()}`, itemID: "", quantity: "", itemStock: 0 },
    ]);
  };

  // Update a child cell
  const updateChild = (
    key: string,
    field: "itemID" | "quantity" | "itemStock",
    value: string
  ) => {
    setChildren((prev) =>
      prev.map((r) => (r.localKey === key ? { ...r, [field]: value } : r))
    );
  };

  // Remove a child row
  const removeRow = (key: string) => {
    setChildren((prev) => prev.filter((r) => r.localKey !== key));
  };

  // When user selects an item → update its itemStock in that row
  // const handleItemChange = (key: string, itemId: string) => {
  //   const found = items.find((i) => i.itemId === parseInt(itemId, 10));
  //   const stock = found?.itemStock ?? 0;
  //   setChildren((prev) =>
  //     prev.map((r) =>
  //       r.localKey === key ? { ...r, itemID: itemId, itemStock: stock } : r
  //     )
  //   );
  // };

  // Prevent submitting if any child’s quantity > available stock (just an example)
  const hasInsufficientStock = children.some((li) => {
    return parseFloat(li.quantity) > li.itemStock;
  });

  const submitGuard = (): boolean => {
    if (hasInsufficientStock) {
      toast.error(
        "Cannot submit: one or more quantities exceed available stock."
      );
      return true;
    }
    return false;
  };

const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

 const validateForm = (): boolean => {
  const errors: Record<string, string> = {};

  // Validate main item fields
  if (Number(fromWarehouseId) <= 0) {
    errors.fromWarehouseId = "Please Select From Warehouse";
  }

  if (Number(toWarehouseId) <= 0) {
    errors.toWarehouseId = "Please Select To Warehouse";
  }

  if (Number(toWarehouseId) === Number(fromWarehouseId)) {
    errors.toWarehouseId = "Please do not select same from and to warehouse";
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


  // Build payload for Create or Update
  const buildPayload = (newStatus: number | null) => ({
    StockMovementID: isEditing ? parseInt(id!) : 0,
    RefNo: refNo,
    Date: formatForPayload(date), // e.g. "2025-06-03"
    From_WareHouseId: fromWarehouseId
      ? parseInt(fromWarehouseId)
      : null,
    To_WareHouseId: toWarehouseId ? parseInt(toWarehouseId) : null,
    Description: description,
    TotalQuantity: totalQuantity,
    StatusId: newStatus,
    StockMovementChildVMs: children.map((c) => ({
      StockMovementChildID: c.stockMovementChildID || 0,
      StockMovementID: isEditing ? parseInt(id!) : 0,
      ItemID: c.itemID ? parseInt(c.itemID) : null,
      Quantity: parseFloat(c.quantity) || 0,
    })),
    // NOTE: “MultipleAttachments” is not sent here; Create handles files separately,
    //       and Update endpoint does not expect attachments.
  });

  // SEND CREATE: POST /api/StockMovements
  const sendCreate = async (payload: ReturnType<typeof buildPayload>) => {
    if (submitGuard()) return;
      if (!validateForm()) 
    {
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(true);
    try {
      const fd = new FormData();
      // “request” field must be the serialized VM
      fd.append("request", JSON.stringify(payload));
      // Append any new files under “attachments” (the controller parameter name)
      appendToFormData(fd); // this will append each file with key “attachments”
      const url = `${variables.API_URL}StockMovements`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // NOTE: Do NOT set Content-Type—let the browser set the multipart boundary
        },
        body: fd,
      });
      if (!res.ok) throw new Error((await res.text()) || res.statusText);
      toast.success("Created successfully!");
      setTimeout(() => navigate("/inventory/stockmovement"), 2000);
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // SEND UPDATE: PUT /api/StockMovements/{id}
  const sendUpdate = async (
    payload: ReturnType<typeof buildPayload>,
    successMsg: string
  ) => {
    if (submitGuard()) return;
     if (!validateForm()) 
    {
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(true);
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
      // Controller expects [FromBody] StockMovementVM, so send raw JSON
      const url = `${variables.API_URL}StockMovements/${id}`;
      const res = await fetch(url, {
        method: "PUT",
        headers: {
        
          Authorization: `Bearer ${token}`,
        },
       body: (fd),
      });
      if (!res.ok) throw new Error((await res.text()) || res.statusText);
      toast.success(successMsg);
      setTimeout(() => navigate("/inventory/stockmovement"), 2000);
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      sendUpdate(buildPayload(statusId), "Updated successfully!");
    } else {
      // For creation, default status = whatever “statusId” is (e.g. 1=Draft)
      sendCreate(buildPayload(statusId));
    }
  };

  // Handlers for PENDING / APPROVE (only on edit)
  const handlePending = (e: React.FormEvent) => {
    e.preventDefault();
    sendUpdate(buildPayload(2), "Marked Pending!");
  };
  const handleApprove = (e: React.FormEvent) => {
    e.preventDefault();
    sendUpdate(buildPayload(3), "Approved successfully!");
  };

  const getStatusText = (sid: number): string => {
    switch (sid) {
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
useEffect(() => {
  // 1️⃣ If no warehouse is selected, zero out all itemStock fields:
  if (!fromWarehouseId) {
    setChildren(prev =>
      prev.map(r => ({ ...r, itemStock: 0 }))
    );
    return;
  }

  // 2️⃣ Otherwise, for each row that has a non‐empty itemID, fetch its stock
  const fetchStockForRow = async (itemID: number, rowKey: string) => {
    try {
      const res = await fetch(
        `${variables.API_URL}StockAdjustment/get-ItemStock/${itemID}/${parseInt(fromWarehouseId, 10)}`,
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
      console.error(`Error fetching stock for item ${itemID} / warehouse ${fromWarehouseId}:`, err);
    }
  };

  children.forEach(row => {
    const idNum = parseInt(row.itemID, 10);
    if (idNum && fromWarehouseId) {
      fetchStockForRow(idNum, row.localKey);
    }
  });
}, [
  fromWarehouseId,
  token,
  // re‐run this effect if any row’s itemID changes OR if the number of rows changes:
  children.map(c => c.itemID).join(",")
]);
// 3) Next, modify handleItemChange so that when the user picks an item,
//    you immediately fetch its stock (if a warehouse is already selected):
const handleItemChange = useCallback(
  (key: string, newItemID: string) => {
    const idNum = parseInt(newItemID, 10);

    if (idNum && fromWarehouseId) {
      // If a warehouse is already selected, fetch just this row’s stock immediately:
      fetch(`${variables.API_URL}StockMovements/get-ItemStock/${idNum}/${parseInt(fromWarehouseId, 10)}`, {
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
  [fromWarehouseId, token]
);
  return (
    <div className="space-y-6">
      <ToastContainer />
      <h1 className="text-2xl font-semibold">
        {isEditing ? "Edit Stock Movement" : "New Stock Movement"}
      </h1>
      <Card className="p-6 space-y-6">
        <div className="space-y-6">
          {isEditing && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 justify-self-start">
                <Label className="text-lg">{refNo}</Label>
              </div>
              <div className="space-y-2 justify-self-end text-right">
                <Label className="text-lg">{getStatusText(statusId)}</Label>
              </div>
            </div>
          )}
          {isEditing && <hr />}

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
              <Label>From Warehouse</Label>
              <Select
                value={fromWarehouseId}
                onValueChange={(val) => setFromWarehouseId(val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select From Warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem
                      key={w.warehouseID}
                      value={w.warehouseID.toString()}
                    >
                      {w.warehouseName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
               {validationErrors.fromWarehouseId && (
              <div className="validation-error">{validationErrors.fromWarehouseId}</div>
            )}
            </div>
            <div className="space-y-2">
              <Label>To Warehouse</Label>
              <Select
                value={toWarehouseId}
                onValueChange={(val) => setToWarehouseId(val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select To Warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem
                      key={w.warehouseID}
                      value={w.warehouseID.toString()}
                    >
                      {w.warehouseName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
                             {validationErrors.toWarehouseId && (
              <div className="validation-error">{validationErrors.toWarehouseId}</div>
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
             {fromWarehouseId &&( <Button
                type="button"
                onClick={addRow}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" /> Add Row
              </Button>)}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Available Stock</TableHead>
                  <TableHead>Quantity</TableHead>
                  {!isEditing && <TableHead>Action</TableHead>}
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
                        <Select
                          value={row.itemID}
                          onValueChange={(val) =>
                            handleItemChange(row.localKey, val)
                          }
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue>
                              {row.itemID
                                ? items.find(
                                    (i) =>
                                      i.itemId === parseInt(row.itemID, 10)
                                  )?.itemName
                                : "Select item"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="w-48">
                            {items.map((i) => (
                              <SelectItem
                                key={i.itemId}
                                value={i.itemId.toString()}
                              >
                                {i.itemName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                          onChange={(e) =>
                            updateChild(row.localKey, "quantity", e.target.value)
                          }
                          disabled={statusId === 3}
                          readOnly={statusId === 3}
                          title={
                            hasInsufficientStock
                              ? "Requested quantity exceeds available stock"
                              : undefined
                          }
                          className={`w-20 p-1 text-sm border rounded ${
                            hasInsufficientStock
                              ? "bg-red-100 border-red-500"
                              : "bg-white border-gray-200"
                          }`}
                        />
                         {validationErrors[`quantity-${row.localKey}`] && (
      <div className="text-red-600 text-xs mt-1">
        {validationErrors[`quantity-${row.localKey}`]}
      </div>
    )}
                      </TableCell>
                      {!isEditing && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeRow(row.localKey)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <div className="flex justify-end mt-2">
              <span className="font-medium">
                Total Quantity: {totalQuantity}
              </span>
            </div>
          </div>

          {/* Attachments (only on Create) */}
          
            <div>
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
              {attachments.map((a) => (
                <div key={a.id} className="flex items-center gap-2 mt-2">
                  <span>{a.file.name}</span>
                  <Input
                    placeholder="Reference"
                    value={a.reference}
                    onChange={(e) => updateReference(a.id, e.target.value)}
                    className="w-32"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(a.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          

          {/* Existing Attachments (only on Edit) */}
          {isEditing &&
            existingFiles.map((f) => (
              <div key={f.id} className="flex items-center gap-2 mb-2">
                <span>{f.fileName}</span>
                <Input
                  placeholder="Reference"
                  value={f.reference}
                  readOnly
                  disabled
                  className="w-32 bg-gray-100"
                />
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
                    link.download = f.fileName;
                    link.click();
                  }}
                >
                  <Download className="h-4 w-4" />
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
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || hasInsufficientStock}
                >
                  Update
                </Button>
              </div>
            </div>
          )}

          {!isEditing && (
            <div className="flex justify-end gap-4">
              <Button variant="outline" type="button" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || hasInsufficientStock}
              >
                Create
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default StockMovement;
