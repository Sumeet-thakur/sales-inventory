import React, { FormEvent, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { CircleCheck, Clock9, Download, Loader2, Plus, Trash2 } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useSelector } from "react-redux";
import { variables } from "@/Variables";
import { RootState } from "@/Storage/Redux/store";
import useAuthValidation from "@/hooks/useAuthValidation";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import useLocalDateString from "@/hooks/useLocalDateString";
import useNumberFormatter from "@/hooks/useNumberFormatter";
import { usePermissions } from "@/hooks/usePermissions";
import ExpandableJsonDisplay from "@/hooks/ExpandableJsonDisplay";
import useFormatDateTime from "@/hooks/useFormatDateTime";
import useActivityLog from "@/hooks/useActivityLog";
import { useFileAttachments } from "@/hooks/useFileAttachments";

// DTOs / VM shapes
type LineItem = {
  id: number;
  purchaseInvoiceChildID?: number;
  itemID: number;
  unitId: number;
  isSecondaryUnit: boolean;
  conversionFactor: number;
  quantity: number;
  childTotalQuantity: number;
  netPrice: number;
  totalPrice: number;
};
type PurchaseReceive = { purchaseReceiveID: number; refNo: string; vendorID: number };
type Vendor = { vendorID: number; vendorName: string };
type ItemModel = { itemId: number; itemName: string };
type UnitDTO = { unitId: number; unitName: string; isSecondaryUnit: boolean };



interface warehouseModel {
  warehouseID: number;
  warehouseName: string;
}


interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
 items: ItemModel[];
  placeholder?: string;
  disabled?: boolean;
}
// SearchableSelect Component – allows user to search through items.
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
    <Select value={value} onValueChange={disabled ? () => { } : onValueChange} disabled={disabled}>
      <SelectTrigger disabled={disabled}>
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

const PurchaseInvoice: React.FC = () => {
  useAuthValidation();
  const { token,roleid } = useSelector((s: RootState) => s.userAuthStore);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const formatForPayload = useLocalDateString();
  const formatNumber = useNumberFormatter();

  // Header state
  const [refNo, setRefNo] = useState<string>("");
  const [invoiceDate, setInvoiceDate] = useState<Date | null>(new Date());
  const [purchaseReceives, setPurchaseReceives] = useState<PurchaseReceive[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [items, setItems] = useState<ItemModel[]>([]);
  const [selectedPR, setSelectedPR] = useState<string>("");
  const [paymentTerms, setPaymentTerms] = useState<string>("");
  const [StatusId, setStatusId] = useState<number>(0);
  const [description, setDescription] = useState<string>("");
   const { hasPermission, loading: permissionsLoading } = usePermissions(roleid);
    const formatDateTime = useFormatDateTime();
    const { activityLogs, showActivityLog, toggleActivityLog } = useActivityLog(token);
      const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  // Line items state
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [itemUnits, setItemUnits] = useState<UnitDTO[][]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [warehouses, setWarehouses] = useState<warehouseModel[]>([]);
const fileInputRef = useRef<HTMLInputElement>(null);
const [existingFiles, setExistingFiles] = useState<{ id: string; fileName: string; url: string; reference: string; }[]>([]);
const [removeIds, setRemoveIds] = useState<number[]>([]);

  const selectedPRObj = purchaseReceives.find(
    pr => pr.purchaseReceiveID.toString() === selectedPR
  );
  const vendorName =
    vendors.find(v => v.vendorID === selectedPRObj?.vendorID)?.vendorName ||
    "";

  const totalQuantity = lineItems.reduce((sum, li) => sum + li.childTotalQuantity, 0);
  const totalNetAmount = lineItems.reduce((sum, li) => sum + li.totalPrice, 0);

  // Fetch lookups
  useEffect(() => {
    const loadLookups = async () => {
      const headers = { Authorization: `Bearer ${token}` };
      try {
        const prUrl = isEditing
          ? `${variables.API_URL}PurchaseInvoice/get-purchase-receivedEdit/${id}`
          : `${variables.API_URL}PurchaseInvoice/get-purchase-received`;
  
        // Purchase Receives
        const prRes = await fetch(prUrl, { headers });
        if (!prRes.ok) throw new Error();
        const prData: PurchaseReceive[] = await prRes.json();
        setPurchaseReceives(prData);
  
        // Vendors
        const vRes = await fetch(`${variables.API_URL}PurchaseInvoice/get-vendor`, { headers });
        if (!vRes.ok) throw new Error();
        setVendors(await vRes.json());
  
        // Items
        const iRes = await fetch(`${variables.API_URL}PurchaseInvoice/get-items`, { headers });
        if (!iRes.ok) throw new Error();
        setItems(await iRes.json());
  
        // Warehouses
        const wRes = await fetch(`${variables.API_URL}PurchaseInvoice/get-warehouse`, { headers });
        if (!wRes.ok) throw new Error();
        setWarehouses(await wRes.json());
  
        // Next Ref # (only for new)
        if (!isEditing) {
          const nrRes = await fetch(
            `${variables.API_URL}PurchaseInvoice/GetNextPurchaseInvoiceRefNumber`,
            { headers }
          );
          if (!nrRes.ok) throw new Error();
          const nrData = await nrRes.json();
          setRefNo(nrData.purchaseInvoiceRefNumber);
        }
      } catch {
        toast.error("Failed to load lookups");
      }
    };
  
    loadLookups();
  }, [token, isEditing, id]);
  

  // Load existing invoice for edit
  useEffect(() => {
    if (!isEditing || !id) return;
  
    const loadInvoice = async () => {
      try {
        const res = await fetch(`${variables.API_URL}PurchaseInvoice/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error();
        const vm: any = await res.json();
  
        setRefNo(vm.refNo);
        setInvoiceDate(new Date(vm.invoiceDate));
        setSelectedPR(vm.purchaseReceiveID?.toString() || "");
        setPaymentTerms(vm.paymentTerms || "");
        setDescription(vm.description || "");
        setStatusId(vm.statusId || 0);
        setSelectedWarehouse(vm.warehouseID?.toString() || "");
  
        const mapped = vm.purchaseInvoiceChildVMs.map((c: any) => ({
          id: c.purchaseInvoiceChildID || Date.now(),
          purchaseInvoiceChildID: c.purchaseInvoiceChildID,
          itemID: c.itemID,
          unitId: c.unitId,
          isSecondaryUnit: c.isSecondaryUnit,
          conversionFactor: c.conversionFactor,
          quantity: c.quantity,
          childTotalQuantity: c.childTotalQuantity,
          netPrice: c.netPrice,
          totalPrice: c.totalPrice,
        }));
        setLineItems(mapped);
        setItemUnits(mapped.map(() => []));
        mapped.forEach((_, idx) => fetchUnitsForRow(idx, mapped[idx].itemID));
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
                setRemoveIds([]);
      } catch {
        toast.error("Failed to load invoice");
      }
    };
  
    loadInvoice();
  }, [token, isEditing, id]);

  // Fetch children when PR changes
  useEffect(() => {
    if (!selectedPR) {
      setLineItems([]);
      setItemUnits([]);
      return;
    }
  
    const loadPRItems = async () => {
      try {
        const res = await fetch(
          `${variables.API_URL}PurchaseInvoice/get-PurchaseReceivedItems/${selectedPR}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!res.ok) throw new Error();
        const data: any[] = await res.json();
  
        const mapped: LineItem[] = data.map(item => ({
          id: item.purchaseReceiveChildID,
          purchaseInvoiceChildID: 0,
          itemID: item.itemID,
          unitId: item.unitId,
          isSecondaryUnit: item.isSecondaryUnit,
          conversionFactor: item.conversionFactor,
          quantity: item.quantity,
          childTotalQuantity: item.childTotalQuantity,
          netPrice: item.netAmount,
          totalPrice: item.netAmount * item.childTotalQuantity,
        }));
  
        if (!isEditing) {
          setLineItems(mapped);
        }
  
        setItemUnits(mapped.map(() => []));
        mapped.forEach((row, idx) => fetchUnitsForRow(idx, row.itemID));
      } catch {
        toast.error("Failed to load PR items");
      }
    };
  
    loadPRItems();
  }, [selectedPR, token]);
  // Fetch units list per item
  const fetchUnitsForRow = async (rowIndex: number, itemId: number) => {
    try {
      const res = await fetch(
        `${variables.API_URL}PurchaseReceives/get-units-by-item/${itemId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error();
      const units: UnitDTO[] = await res.json();
      setItemUnits(prev => {
        const copy = [...prev];
        copy[rowIndex] = units;
        return copy;
      });
    } catch {
      toast.error("Failed to load units");
    }
  };
const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    // Basic validations
  
    if (Number(selectedWarehouse) <= 0) {
      errors.selectedWarehouse = "Warehouse is required.";
    }

    
 setValidationErrors(errors);
 return Object.keys(errors).length === 0;
   
      }
    
  // Handlers
  const addLineItem = () => {
    setLineItems(prev => [
      ...prev,
      {
        id: Date.now(),
        itemID: 0,
        unitId: 0,
        isSecondaryUnit: false,
        conversionFactor: 0,
        quantity: 0,
        childTotalQuantity: 0,
        netPrice: 0,
        totalPrice: 0,
      },
    ]);
    setItemUnits(prev => [...prev, []]);
  };

  const updateLineItem = (id: number, field: keyof LineItem, val: string) => {
    setLineItems(prev =>
      prev.map(li => {
        if (li.id !== id) return li;
        const updated = { ...li } as any;
        const n = Number(val);
        if (["quantity", "netPrice", "conversionFactor"].includes(field)) {
          updated[field] = isNaN(n) ? 0 : n;
        } else {
          updated[field] = val;
        }
        updated.childTotalQuantity = updated.isSecondaryUnit
          ? updated.quantity * updated.conversionFactor
          : updated.quantity;
        updated.totalPrice = updated.netPrice * updated.childTotalQuantity;
        return updated;
      })
    );
  };

  const removeLineItem = (id: number) => {
    setLineItems(prev => prev.filter(li => li.id !== id));
    setItemUnits(prev => prev.filter((_, i) => lineItems[i].id !== id));
  };

  const handleUnitChange = async (rowIndex: number, unitId: number) => {
    setLineItems(prev =>
      prev.map((c, i) =>
        i === rowIndex
          ? { ...c, unitId, isSecondaryUnit: itemUnits[rowIndex].find(u => u.unitId === unitId)?.isSecondaryUnit || false }
          : c
      )
    );
  };
  const pid = isEditing ? Number(id) : 0;

const buildPayload = (newStatusId: number | null) => ({
  // if your API VM expects it on the root, include it here:
  PurchaseInvoiceID: pid,

  PurchaseReceiveID: Number(selectedPR),
  RefNo:refNo,
  InvoiceDate: formatForPayload(invoiceDate),
  VendorID: selectedPRObj?.vendorID,
  VendorChildID: null,
  PaymentTerms:paymentTerms,
  Description:description,
  TotalQuantity:totalQuantity,
  TotalNetAmount:totalNetAmount,
  WarehouseID:Number(selectedWarehouse),
  StatusId: newStatusId,

  PurchaseInvoiceChildVMs: lineItems.map(li => ({
    PurchaseInvoiceChildID: li.purchaseInvoiceChildID || 0,

    // ALWAYS use the real parent ID when editing:
    PurchaseInvoiceID: pid,

    ItemID: li.itemID,
    UnitId: li.unitId,
    IsSecondaryUnit: li.isSecondaryUnit,
    ConversionFactor: li.conversionFactor,
    Quantity: li.quantity,
    ChildTotalQuantity: li.childTotalQuantity,
    NetPrice: li.netPrice,
    TotalPrice: li.totalPrice,
  })),
});

   // 2) Common updater
   const sendUpdate = async (payload: ReturnType<typeof buildPayload>, successMsg: string) => {
    setIsSubmitting(true);
       if (!validateForm()) {
        setIsSubmitting(false);
        return;
       };
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


      const url = isEditing
        ? `${variables.API_URL}PurchaseInvoice/${id}`
        : `${variables.API_URL}PurchaseInvoice`;
      const method = isEditing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: {  Authorization: `Bearer ${token}` },
        body: (fd),
      });
      if (!res.ok) throw new Error((await res.text()) || res.statusText);
      toast.success(successMsg);
      setTimeout(() => navigate(-1), 1500);
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3) Handlers now delegate
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendUpdate(buildPayload(StatusId), isEditing ? "Updated successfully!" : "Created successfully!");
  };
  const handlePending = (e: FormEvent) => {
    e.preventDefault();
    sendUpdate(buildPayload(2), "Marked Pending!");
  };
  const handleApprove = (e: FormEvent) => {
    e.preventDefault();
    sendUpdate(buildPayload(3), "Approved successfully!");
  };

  const handleActivityLogToggle = async () => {
    if (id) {
      await toggleActivityLog(id, "PurchaseInvoice/activity_log/PurchaseInvoice");
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
    <div>
      <ToastContainer />
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">{isEditing ? "Edit" : "Create"} Purchase Invoice</h1>
        <Card className="p-6 space-y-6">
          {/* Header */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label>Invoice #</Label>
              <Input value={refNo} readOnly disabled className="bg-gray-50" />
            </div>
            <div>
              <Label>Invoice Date</Label>
              <DatePicker
                  selected={invoiceDate}
                  onChange={(d: Date | null) => d && setInvoiceDate(d)}
                  dateFormat="dd MMM yyyy"
                  wrapperClassName="w-full"
                  customInput={<Input className="w-full" />}
                
                />
            </div>
            <div>
              <Label>Purchase Receive</Label>
              <Select value={selectedPR} onValueChange={setSelectedPR} required>
                <SelectTrigger className="auto">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {purchaseReceives.map(pr => (
                    <SelectItem key={pr.purchaseReceiveID} value={pr.purchaseReceiveID.toString()}>
                      {pr.refNo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vendor</Label>
              <Input value={vendorName} readOnly disabled className="bg-gray-50" />
            </div>
            {/* <div>
              <Label>Payment Terms</Label>
              <Input value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} />
            </div> */}
            <div>
              <Label>Warehouse</Label>
              <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse} required>
                <SelectTrigger className="auto">
                  <SelectValue placeholder="Select Warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map(pr => (
                    <SelectItem key={pr.warehouseID} value={pr.warehouseID.toString()}>
                      {pr.warehouseName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
                {validationErrors.selectedWarehouse && (
                  <p className="validation-error">{validationErrors.selectedWarehouse}</p>
                )}
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            
          </div>

          {/* Line Items */}
          <div>
            <div className="flex justify-between mb-2">
              <h3 className="font-semibold">Items</h3>
              {/* <Button type="button" onClick={addLineItem}>
                <Plus /> Add
              </Button> */}
            </div>
            <Table className="min-w-full bg-white rounded-lg shadow">
              <TableHeader>
                <TableRow>
                  {["#","Item","Unit","Qty","Total Qty","Net Price","Total Price"].map(head => (
                    <TableHead key={head} className="px-4 py-2 text-left text-sm">{head}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="px-4 py-6 text-center text-gray-500">
                      No items
                    </TableCell>
                  </TableRow>
                ) : (
                  lineItems.map((li, idx) => (
                    <TableRow key={li.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <TableCell className="px-4 py-2 w-12">{idx + 1}</TableCell>
                      <TableCell className="px-4 py-2 w-48">
                        <SearchableSelect
                          value={li.itemID.toString()}
                          onValueChange={v => {
                            const iid = Number(v);
                            setLineItems(prev => prev.map((r,i)=>i===idx?{...r,itemID:iid,unitId:0,conversionFactor:0,childTotalQuantity:0}:r));
                            fetchUnitsForRow(idx,iid);
                          }}
                          items={items}
                           disabled={isEditing}
                        />
                      </TableCell>
                      <TableCell className="px-4 py-2 w-48">
                        <div className="flex items-center gap-2 w-30">
                          <Select
                            value={li.unitId.toString()}
                            onValueChange={val => handleUnitChange(idx, Number(val))}
                            disabled={isEditing}
                          >
                            <SelectTrigger className="w-24" disabled={isEditing}>
                              <SelectValue placeholder="Unit" />
                            </SelectTrigger>
                            <SelectContent>
                              {itemUnits[idx]?.map(u => (
                                <SelectItem key={u.unitId} value={u.unitId.toString()}>
                                  {u.unitName} {u.isSecondaryUnit ? "(Sec)" : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {li.isSecondaryUnit && (
                            <Input
                              type="number"
                              value={li.conversionFactor.toString()}
                              readOnly disabled className="w-16 bg-gray-100"
                            />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-2 w-20">
                        <Input
                          type="number"
                          value={li.quantity}
                          onChange={e => updateLineItem(li.id, "quantity", e.target.value)}
                          className="w-full"
                          readOnly={StatusId === 3} disabled={StatusId === 3} 
                        />
                      </TableCell>
                      <TableCell className="px-4 py-2 w-20">
                        <Input
                          type="number"
                          value={li.childTotalQuantity}
                          readOnly disabled className="w-full bg-gray-100"
                        />
                      </TableCell>
                      <TableCell className="px-4 py-2 w-24">
                        <Input
                          type="number"
                          value={li.netPrice.toFixed(2)}
                          onChange={e => updateLineItem(li.id, "netPrice", e.target.value)}
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell className="px-4 py-2 w-24">
                        <Input
                          type="number"
                          value={li.totalPrice.toFixed(2)}
                          readOnly disabled className="w-full bg-gray-100"
                        />
                      </TableCell>
                      
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 flex justify-end">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-lg font-semibold">
            Total Qty: {totalQuantity}
            </p>
            <p className="text-lg font-semibold">
            Total Net: {formatNumber(totalNetAmount.toFixed(2))}
            </p>
          </div>
        </div>
          {/* Totals & Actions */}
             <Label>Attachments</Label>
        
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


            
            {isEditing ? (
          <div className="flex justify-between mt-4">
            <div className="flex gap-4">
              {StatusId !== 2 && StatusId !== 3 && (
                <Button onClick={handlePending} disabled={isSubmitting}><Clock9 /> PENDING</Button>
              )}{StatusId !== 3 && (
                <Button onClick={handleApprove} style={{ display: hasPermission(30, "approve") ? "flex" : "none" }} disabled={isSubmitting}><CircleCheck /> APPROVE</Button>
              )} </div>
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>{isEditing ? "Update" : "Create"}</Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>{isEditing ? "Update" : "Create"}</Button></div>
        )}
         
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
      </div>
    </div>
  );
};

export default PurchaseInvoice;
