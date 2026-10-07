import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { CircleCheck, Clock9, Download, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import useAuthValidation from "@/hooks/useAuthValidation";
import { useSelector } from "react-redux";
import { RootState } from "@/Storage/Redux/store";
import { variables } from "@/Variables";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import useFormatDateTime from "@/hooks/useFormatDateTime";
import { usePermissions } from "@/hooks/usePermissions";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import useLocalDateString from "@/hooks/useLocalDateString";
import useActivityLog from "@/hooks/useActivityLog";
import ExpandableJsonDisplay from "@/hooks/ExpandableJsonDisplay";
import { useFileAttachments } from "@/hooks/useFileAttachments";

// DTOs from your API
interface UnitDTO {
  index: number;
  unitId: number;
  unitName: string;
  isSecondaryUnit: boolean;
}
interface MultipleAttachmentVM {
  multipleAttachmentfileId: number;
  fileName: string;
  filePath: string;
  referenceno: string;
}
// Child VM
interface ChildVM {
  purchaseReceiveChildID?: number;
  purchaseReceiveID?: number;
  itemID: number;
  unitId: number;
  unitName: string;
  itemName: string;
  isSecondaryUnit: boolean;
  quantity: number;
  conversionFactor: number;
  childTotalQuantity: number;
  isActive: number;
  isDeleted: number;
}
interface itemModel {
  itemId: number;
  itemName: string;
}
// Parent VM
interface PurchaseReceiveVM {
  purchaseReceiveID?: number;
  refNo: string;
  date: string;
  vendorID?: number;
  vendorChildID?: number;
  purchaseRequisitionOrderID?: number;
  paymentTerms?: string;
  description?: string;
  totalQuantity: number;
  statusId?: number;
  isActive?: number;
  isDeleted?: number;
  purchaseReceiveChildVMs: ChildVM[]; multipleAttachments: MultipleAttachmentVM[];
}
interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  items: itemModel[];
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




const PurchaseReceive: React.FC = () => {
  useAuthValidation();
  const { token, roleid } = useSelector((state: RootState) => state.userAuthStore);
  const { id } = useParams<{ id: string }>();
  const editing = Boolean(id);
  const navigate = useNavigate();


  // Form state
  const [refNo, setRefNo] = useState("");

  const [vendorID, setVendorID] = useState<number | undefined>();
  const [vendorChildID, setVendorChildID] = useState<number | undefined>();
  const [requisitionID, setRequisitionID] = useState<number | undefined>();
  const [paymentTerms, setPaymentTerms] = useState("");
  const [description, setDescription] = useState("");
  const [statusId, setStatusId] = useState<number>(0);
  const [items, setItems] = useState<itemModel[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const { hasPermission, loading: permissionsLoading } = usePermissions(roleid);
  const formatDateTime = useFormatDateTime();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formatForPayload = useLocalDateString();
  const [removeIds, setRemoveIds] = useState<number[]>([]);
  const { activityLogs, showActivityLog, toggleActivityLog } = useActivityLog(token);
  const [existingFiles, setExistingFiles] = useState<{ id: string; fileName: string; url: string; reference: string; }[]>([]);




  // Lookups
  const [vendors, setVendors] = useState<Array<{ vendorID: number; vendorName: string }>>([]);
  const [requisitions, setRequisitions] = useState<Array<{
    purchaseRequisitionOrderID: number;
    refNo: string;
    vendorID: number;
  }>>([]);

  // Line-items (Child VMs)
  const [children, setChildren] = useState<ChildVM[]>([]);

  // per-row unit lists
  const [itemUnits, setItemUnits] = useState<UnitDTO[][]>([]);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };
    const requisitionUrl = id
      ? `${variables.API_URL}PurchaseReceives/get-purchase-requistion-edit/${id}`
      : `${variables.API_URL}PurchaseReceives/get-purchase-requistion`;

    // Vendors & requisitions
    Promise.all([
      fetch(`${variables.API_URL}PurchaseReceives/get-vendor`, { headers }).then(r => r.json()),
      fetch(requisitionUrl, { headers }).then(r => r.json()),
      fetch(`${variables.API_URL}PurchaseReceives/get-items`, { headers }).then(r => r.json()),
    ]).then(([v, r, itms]) => {
      setVendors(v);
      setRequisitions(r);
      setItems(itms);

      if (!editing) {
        fetch(`${variables.API_URL}PurchaseReceives/GetNextPurchaseReceivedRefNumber`, { headers })
          .then(r => r.json())
          .then(d => setRefNo(d.purchaseRefNumber));
      }
    }).catch(() => toast.error("Failed to load lookups"));

    // If editing, fetch existing record
    if (editing) {
      fetch(`${variables.API_URL}PurchaseReceives/${id}`, { headers })
        .then(r => r.json())
        .then((vm: PurchaseReceiveVM) => {
          setRefNo(vm.refNo);
          setSelectedDate(new Date(vm.date));
          setVendorID(vm.vendorID);
          setRequisitionID(vm.purchaseRequisitionOrderID);
          setDescription(vm.description || "");
          setChildren(vm.purchaseReceiveChildVMs);
          setStatusId(vm.statusId)
          setItemUnits(vm.purchaseReceiveChildVMs.map(() => []));
          // Preload units & itemUnits for each row
          vm.purchaseReceiveChildVMs.forEach((c, idx) => fetchUnitsForRow(idx, c.itemID));
          setExistingFiles(
            (vm.multipleAttachments ?? []).map((m: any) => ({
              id: m.multipleAttachmentfileId.toString(),
              fileName: m.fileName,
              url: m.filePath,        // or `${variables.API_URL}${m.filePath}` if it's a relative path
              reference: m.referenceno,
            }))
          );
        })
        .catch(() => toast.error("Failed to load record"));
    }
  }, [editing, id, token]);

  // fetch requisition children when requisitionID changes
  useEffect(() => {
    if (!requisitionID) {
      setChildren([]);
      return;
    }

    const url = `${variables.API_URL}PurchaseReceives/get-PurchasesRequisitionItems${requisitionID}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (!r.ok) throw new Error("Failed to load requisition items");
        return r.json();
      })
      .then((rows: any[]) => {
        const mapped: ChildVM[] = rows.map(r => ({
          purchaseReceiveChildID: r.purchaseRequisitionOrderChildID,
          purchaseReceiveID: r.purchaseRequisitionOrderID,
          itemID: r.itemID,
          unitId: r.unitId,      // take API’s unitId
          unitName: r.unitName,    // and unitName
          itemName: r.itemName,
          isSecondaryUnit: r.isSecondaryUnit,
          quantity: r.quantity,
          conversionFactor: r.conversionFactor,
          childTotalQuantity: r.isSecondaryUnit
            ? r.conversionFactor * r.quantity
            : r.quantity,
          isActive: 1,
          isDeleted: 0,
        }));

        setChildren(mapped);
        setItemUnits(mapped.map(() => []));
        mapped.forEach((c, idx) => fetchUnitsForRow(idx, c.itemID));
      })
      .catch(() => toast.error("Failed to load items"));
  }, [requisitionID, token]);

  // fetch units for a single row
  const fetchUnitsForRow = async (rowIndex: number, itemId: number) => {
    try {
      const res = await fetch(`${variables.API_URL}PurchaseReceives/get-units-by-item/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const units: UnitDTO[] = await res.json();
      setItemUnits(u => {
        const copy = [...u];
        copy[rowIndex] = units;
        return copy;
      });
    } catch {
      toast.error("Failed to load units");
    }
  };
  useEffect(() => {
    // …other lookups…
    fetch(`${variables.API_URL}PurchaseReceives/get-items`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(setItems)
      .catch(() => toast.error("Failed to load all items"));
  }, [token, toast]);
  // when unit changes in a row, update conversion factor if needed
  const handleUnitChange = async (rowIndex: number, selectedIndex: number) => {
    const dto = itemUnits[rowIndex].find(u => u.index === selectedIndex);
    if (!dto) return;
    setChildren(ch =>
      ch.map((c, i) =>
        i !== rowIndex
          ? c
          : {
            ...c,
            unitId: dto.unitId,
            isSecondaryUnit: dto.isSecondaryUnit,
            conversionFactor: dto.isSecondaryUnit ? c.conversionFactor : 0,

          }
      )
    );
    // fetch conversion factor if secondary unit
    if (dto.isSecondaryUnit) {
      try {
        const q = new URLSearchParams({
          ItemtId: String(children[rowIndex].itemID),
          UnitId: String(dto.unitId),
          IsSecondaryUnit: "true",
        });
        const res = await fetch(`${variables.API_URL}PurchaseReceives/get-conversionfactor?${q}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error();
        const data: { ConversionFactor: number }[] = await res.json();
        const factor = data[0]?.ConversionFactor ?? 0;
        setChildren(ch =>
          ch.map((c, i) => {
            if (i !== rowIndex) return c;
            const qty = c.quantity;
            return {
              ...c,
              conversionFactor: factor,
              childTotalQuantity: qty * factor,
            };
          })
        );
      } catch {
        toast.error("Failed to load conversion factor");
      }
    } else {
      // primary unit → reset to 1:1
      setChildren(ch =>
        ch.map((c, i) => {
          if (i !== rowIndex) return c;
          return {
            ...c,
            conversionFactor: 0,
            childTotalQuantity: c.quantity,
          };
        })
      );
    }
  };

  // quantity changes → recalc total
  const updateChild = useCallback((index: number, qty: number) => {
    setChildren(cs =>
      cs.map((c, i) => {
        if (i !== index) return c;
        // force factor=1 on primary units
        const factor = c.isSecondaryUnit ? c.conversionFactor : 1;
        return {
          ...c,
          quantity: qty,
          conversionFactor: factor,
          childTotalQuantity: qty * factor,
        };
      })
    );
  }, []);

  // … rest of form, header, save handler etc. …
  const calculateTotal = () =>
    children.reduce((sum, item) => sum + item.childTotalQuantity, 0);

  // Submit handler
  const submit = async (newStatus: number) => {
    setIsSubmitting(true);

    const baseUrl = `${variables.API_URL}PurchaseReceives`;
    const url = editing ? `${baseUrl}/${id}` : baseUrl;
    const pascalChildren = children.map(c => ({
      PurchaseReceiveChildID: c.purchaseReceiveChildID,
      PurchaseReceiveID: c.purchaseReceiveID,
      ItemID: c.itemID,
      UnitId: c.unitId,
      IsSecondaryUnit: c.isSecondaryUnit,
      Quantity: c.quantity,
      ConversionFactor: c.conversionFactor,
      ChildTotalQuantity: c.childTotalQuantity,
      IsActive: c.isActive,
      IsDeleted: c.isDeleted,

    }));
    // 1) Build a Pascal-case payload
    const payload = {
      PurchaseReceiveID: editing ? Number(id) : undefined,
      RefNo: refNo,
      Date: formatForPayload(selectedDate),
      VendorID: vendorID,
      VendorChildID: vendorChildID,
      PurchaseRequisitionOrderID: requisitionID,
      PaymentTerms: paymentTerms,
      Description: description,
      TotalQuantity: calculateTotal(),
      StatusId: newStatus,
      PurchaseReceiveChildVMs: pascalChildren,
      MultipleAttachments: existingFiles.map(x => ({
        Id: parseInt(x.id, 10),
        Referenceno: x.reference
      }))
    };

    // 2) Build FormData without touching Content-Type
    const fd = new FormData();
    fd.append("request", JSON.stringify(payload));
    if (editing) {
      fd.append("removeAttachmentIds", JSON.stringify(removeIds));
    }
    attachments.forEach(a => fd.append("attachments", a.file));

    try {
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: {
          // ← remove "Content-Type": "application/json"
          Authorization: `Bearer ${token}`
        },
        body: fd
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Save failed");
      }

      // pick the right success message
    let msg: string;
    if (!editing) {
      msg = "Created successfully";
    } else {
      switch (newStatus) {
        case 2:
          msg = "Moved to Pending";
          break;
        case 3:
          msg = "Approved successfully";
          break;
        default:
          msg = "Updated successfully";
      }
    }
    toast.success(msg);
      setTimeout(() => navigate("/purchase/receive"), 1500);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateOrUpdate = () => {
    // If we’re editing and the existing status is Pending(2) or Approved(3),
    // keep it. Otherwise default to 0.
    const targetStatus =
      editing && (statusId === 1 || statusId === 2 || statusId === 3)
        ? statusId
        : 1;

    submit(targetStatus);
  };
  const handlePending = () => submit(2);
  const handleApprove = () => submit(3);

  const handleActivityLogToggle = async () => {
    if (id) {
      await toggleActivityLog(id, "PurchaseReceives/activity_log/PurchaseReceives");
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
      <Card className="p-6 space-y-6">

        {/* … header fields … */} <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <Label>Receive Number</Label>
            <Input value={refNo} readOnly className="bg-gray-50" />
          </div>
          <div className="space-y-1 w-full">
            <Label className="block text-sm font-medium">Date</Label>
            <div className="mt-1 w-full">
              <DatePicker
                selected={selectedDate}
                onChange={(d: Date | null) => setSelectedDate(d)}
                dateFormat="dd MMM yyyy"
                wrapperClassName="w-full"        // make the datepicker’s container full‐width
                customInput={<Input className="w-full" />}  // make the input itself fill its container
              />
            </div>
          </div>
          <div>
            <Label>Requisition #</Label>
            <Select
              value={requisitionID?.toString() || ""}
              onValueChange={v => {
                const idNum = Number(v);
                setRequisitionID(idNum);
                const sel = requisitions.find(r => r.purchaseRequisitionOrderID === idNum);
                if (sel) setVendorID(sel.vendorID);
              }}
              disabled={editing}    // ← disable once in edit mode
            >
              <SelectTrigger>
                <SelectValue placeholder="Select requisition" />
              </SelectTrigger>
              <SelectContent>
                {requisitions.map(r => (
                  <SelectItem
                    key={r.purchaseRequisitionOrderID}
                    value={r.purchaseRequisitionOrderID.toString()}
                  >
                    {r.refNo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Vendor</Label>
            <Select
              value={vendorID?.toString() || ""}
              onValueChange={v => setVendorID(Number(v))}
              disabled  /* 👈 disable when requisition picked */
            >
              <SelectTrigger>
                <SelectValue placeholder="Select vendor" />
              </SelectTrigger>
              <SelectContent>
                {vendors.map(v => (
                  <SelectItem key={v.vendorID} value={v.vendorID.toString()}>
                    {v.vendorName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div >
            <Label>Description</Label>
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>S No.</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead> Quantity</TableHead>
              <TableHead>Total Quantity</TableHead>

            </TableRow>
          </TableHeader>
          <TableBody>
            {children.map((c, idx) => (
              <TableRow key={c.purchaseReceiveChildID ?? idx}>
                <TableCell>{idx + 1}</TableCell>

                {/* ITEM: now a searchable select */}
                <TableCell>
                  <SearchableSelect
                    value={c.itemID.toString()}
                    onValueChange={v => {
                      const newItemID = Number(v);
                      // update that row’s itemID and reset dependents:
                      setChildren(ch =>
                        ch.map((r, i) =>
                          i === idx
                            ? {
                              ...r,
                              itemID: newItemID,         // <- use newItemID here
                              unitId: 0,
                              conversionFactor: 0,
                              isSecondaryUnit: false,
                              childTotalQuantity: 0,
                            }
                            : r
                        )
                      );
                      // reload units for the newly selected item
                      fetchUnitsForRow(idx, newItemID);
                    }}
                    items={items}
                    placeholder="Select item"
                    disabled
                  />

                </TableCell>

                {/* UNIT select, etc. */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Select
                      value={c.unitId.toString()}
                      onValueChange={val => handleUnitChange(idx, Number(val))}
                      disabled
                    >
                      <SelectTrigger>
                        {/* use the unitName you stored */}
                        <SelectValue placeholder={c.unitName} />
                      </SelectTrigger>
                      <SelectContent>
                        {itemUnits[idx].map(u => (
                          <SelectItem key={u.unitId} value={u.unitId.toString()}>
                            {u.unitName}{u.isSecondaryUnit ? " (Secondary)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {c.isSecondaryUnit && (
                      <Input
                        type="number"
                        value={c.conversionFactor !== undefined ? c.conversionFactor.toString() : ""}
                        disabled
                        className="w-32"
                      />
                    )}
                  </div>
                </TableCell>

                {/* QUANTITY */}
                <TableCell>
                  <Input
                    type="number"
                    value={c.quantity}
                    onChange={e => updateChild(idx, Number(e.target.value))}
                    className="w-24"
                  />
                </TableCell>

                {/* TOTAL */}
                <TableCell>
                  <Input
                    type="number"
                    value={c.childTotalQuantity.toFixed(2)}
                    disabled
                    className="w-32"
                  />
                </TableCell>



              </TableRow>
            ))}
            {children.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  No items selected
                </TableCell>
              </TableRow>
            )}
          </TableBody>

        </Table>

        {/* … actions, totals, save button … */}

        <div className="mt-4 flex justify-end">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-lg font-semibold">
              Total: {calculateTotal().toFixed(2)}
            </p>
          </div>
        </div>
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

        {editing ? (
          <div className="flex justify-between mt-4">
            <div className="flex gap-4">
              {statusId !== 2 && statusId !== 3 && (
                <Button onClick={handlePending} disabled={isSubmitting}><Clock9 /> PENDING</Button>
              )}{statusId !== 3 && (
                <Button onClick={handleApprove} style={{ display: hasPermission(29, "approve") ? "flex" : "none" }} disabled={isSubmitting}><CircleCheck /> APPROVE</Button>
              )} </div>
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
              <Button onClick={handleCreateOrUpdate} disabled={isSubmitting}>{editing ? "Update" : "Create"}</Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
            <Button onClick={handleCreateOrUpdate} disabled={isSubmitting}>{editing ? "Update" : "Create"}</Button></div>
        )}
      </Card>
      {editing && (
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
  );
};

export default PurchaseReceive;