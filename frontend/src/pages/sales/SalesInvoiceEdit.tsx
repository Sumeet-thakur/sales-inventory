import { useEffect, useRef, useState } from "react"; 
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
import { CircleCheck, Clock9, Download, Loader2, Trash2 } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { variables } from "@/Variables";
import { RootState } from "@/Storage/Redux/store";
import "react-toastify/dist/ReactToastify.css";
import useAuthValidation from "@/hooks/useAuthValidation";
import { usePermissions } from "@/hooks/usePermissions";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import useNumberFormatter from "@/hooks/useNumberFormatter";
import { useFileAttachments } from "@/hooks/useFileAttachments";
import useLocalDateString from "@/hooks/useLocalDateString";
import { SD_Roles } from "@/Utility/SD";

interface LineItem {
  id: number;
  salesInvoiceChildID: number;
  itemId: number;
  quantity: number;
  unitId: number;
  unitName: string;
  conversionFactor: number;
  isSecondaryUnit: boolean;
  childTotalQuantity: number;
  itemStockQuantity: number;
  unitPrice: number;
  tax: number;
  taxAmount: number;
  netAmount: number;
  childTotalPrice: number;
  gst: number;
  gstPercentage: number;
  wogst: number;
}

interface SalesOrder {
  salesRequisitionID: number;
  refNo: string;
  sellerID: number;
  customerID: number;
  customerName: string;
  sellerName: string;
}

interface ItemLookup {
  itemId: number;
  itemName: string;
}
interface MultipleAttachmentVM {
  multipleAttachmentfileId: number;
  fileName: string;
  filePath: string;
  referenceno: string;
}
interface warehouseModel {
  warehouseID: number;
  warehouseName: string;
}

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  items: ItemLookup[];
  placeholder?: string;
  disabled?: boolean;
}
const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onValueChange,
  items,
  placeholder = "Select Item",
  disabled = false,
}) => (
  <Select
    value={value}
    onValueChange={disabled ? () => {} : onValueChange}
    disabled={disabled}
  >
    <SelectTrigger disabled={disabled}>
      <SelectValue>
        {items.find(i => i.itemId.toString() === value)?.itemName ||
          placeholder}
      </SelectValue>
    </SelectTrigger>
    {!disabled && (
      <SelectContent side="bottom" className="max-h-60 overflow-y-auto">
        {/* …search + list… */}
      </SelectContent>
    )}
  </Select>
);

const SalesInvoiceEdit = () => {
  useAuthValidation();
  const { token, roleid,role } = useSelector((s: RootState) => s.userAuthStore);
  const { id } = useParams<{ id: string }>();
  const invoiceId = Number(id);
  const navigate = useNavigate();
  const { hasPermission } = usePermissions(roleid);

  // Header state
  const [refNo, setRefNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState<Date>(new Date());
  const [selectedSale, setSelectedSale] = useState("");
  const [PONumber, setPONumber] = useState("");
  const [PODate, setPODate] = useState<Date>(new Date());
  const [paymentTerms, setPaymentTerms] = useState("");
  const [statusId, setStatusId] = useState<number>(0);
  const [invoiceStatusId, setInvoiceStatusId] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [paidAmount, setPaidAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [removeIds, setRemoveIds] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [existingFiles, setExistingFiles] = useState<
    { id: string; fileName: string; url: string; reference: string }[]
  >([]);
  const formatNumber = useNumberFormatter();

  // Lookups
  const [sales, setSales] = useState<SalesOrder[]>([]);
  const [items, setItems] = useState<ItemLookup[]>([]);
  const [warehouses, setWarehouses] = useState<warehouseModel[]>([]);
const formatForPayload = useLocalDateString();
  // Line items + removals
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [removedChildIds, setRemovedChildIds] = useState<number[]>([]);
  const selectedSaleObj = sales.find(
    s => s.salesRequisitionID.toString() === selectedSale
  );
 const isSuperAdmin=role == SD_Roles.SuperAdmin;
  // Totals
  const totalQuantity = lineItems.reduce(
    (sum, i) => sum + (i.childTotalQuantity || 0),
    0
  );
  const totalChildTotalPrice = lineItems.reduce(
    (sum, i) => sum + (i.childTotalPrice || 0),
    0
  );
  const totaltaxamount = lineItems.reduce(
    (sum, i) => sum + (i.taxAmount || 0) * (i.childTotalQuantity || 0),
    0
  );
  const totalWOgst = lineItems.reduce(
    (sum, i) => sum + (i.unitPrice || 0) * (i.childTotalQuantity || 0),
    0
  );
  const netAmount = totalWOgst + totaltaxamount;
  const outstandingAmount = netAmount - paidAmount;
  const hasInsufficientStock = lineItems.some(
  (li) => li.childTotalQuantity > li.itemStockQuantity
);

  // File attachments hook
  const {
    attachments,
    addFiles,
    updateReference,
    removeFile,
  } = useFileAttachments();

  // Load warehouses
  useEffect(() => {
    const fetchWareHouse = async () => {
      try {
        const res = await fetch(
          `${variables.API_URL}SalesInvoices/get-warehouse`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await res.json();
        if (Array.isArray(data)) {
          setWarehouses(
            data.map((w: any) => ({
              warehouseID: w.warehouseID,
              warehouseName: w.warehouseName,
            }))
          );
        }
      } catch {}
    };
    fetchWareHouse();
    setIsSubmitting(false);
  }, [token]);

  // Fetch lookups + invoice
  useEffect(() => {
    const loadData = async () => {
      if (!invoiceId) return;
      try {
        // Sales requisitions
        const salesRes = await fetch(
          `${variables.API_URL}SalesInvoices/get-salesRequisitionEdit/${invoiceId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const salesData = await salesRes.json();
        setSales(
          salesData.map((x: any) => ({
            salesRequisitionID: x.salesRequisitionID,
            refNo: x.refNo,
            sellerID: x.sellerID,
            customerID: x.customerID,
            sellerName: x.sellerName,
            customerName: x.customerName,
          }))
        );

        // Items lookup
        const itemsRes = await fetch(
          `${variables.API_URL}SalesRequisition/get-items`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const itemsData = await itemsRes.json();
        setItems(itemsData.map((i: any) => ({
          itemId: i.itemId,
          itemName: i.itemName,
        })));

        // Invoice details
        const invRes = await fetch(
          `${variables.API_URL}SalesInvoices/${invoiceId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const inv = await invRes.json();

        // Header
        setRefNo(inv.refNo);
        setInvoiceDate(inv.invoiceDate ? new Date(inv.invoiceDate) : new Date());
        setSelectedSale(inv.salesRequisitionID.toString());
        setPONumber(inv.poNumber);
        setPODate(inv.poDate ? new Date(inv.poDate) : new Date());
        setPaymentTerms(inv.paymentTerms);
        setNotes(inv.description);
        setPaymentStatus(inv.paymentStatus || "");
        setPaidAmount(inv.paidAmount || 0);
        setStatusId(inv.statusId ?? 0);
        setInvoiceStatusId(inv.invoiceStatusId ?? 0);
        setSelectedWarehouse(inv.wareHouseId?.toString() || "");

        // Line-items
        setLineItems(inv.salesInvoiceChildVMs.map((c: any) => ({
          id: c.salesInvoiceChildID,
          salesInvoiceChildID: c.salesInvoiceChildID,
          itemId: c.itemID,
          quantity: c.quantity,
          unitId: c.unitId,
          unitName: c.unitName,
          conversionFactor: c.conversionFactor,
          isSecondaryUnit: c.isSecondaryUnit,
          childTotalQuantity: c.childTotalQuantity,
          itemStockQuantity: c.itemStockQuantity,
          unitPrice: c.unitPrice,
          tax: c.tax,
          taxAmount: c.tax,
          gstPercentage: (c.gstPercentage || 0) / 100,
          netAmount: c.netPrice,
          childTotalPrice: c.totalPrice,
          wogst: c.netPrice / (1 + (c.gstPercentage||0)/100),
          gst: (c.gstPercentage||0)/100 * c.netPrice
        })));

        // Existing files
        setExistingFiles(inv.multipleAttachments.map((ma: any) => {
          const baseUrl = variables.API_URL.replace(/\/api\/?$/, "");
          return {
            id: ma.multipleAttachmentfileId.toString(),
            fileName: ma.fileName,
            url: `${baseUrl}/${ma.filePath}`,
            reference: ma.referenceno,
          };
        }));
        setRemoveIds([]);
        setIsEditing(true);
      } catch {
        toast.error("Failed to load invoice.");
      }
    };
    loadData();
  }, [invoiceId, token]);

  // Update a line-item
  const updateLineItem = (id: number, field: keyof LineItem, val: string) => {
    setLineItems(curr =>
      curr.map(li => {
        if (li.id !== id) return li;
        const up = { ...li };
        if (field === "quantity") up.quantity = Number(val);
        if (field === "netAmount") up.netAmount = Number(val);
        // Recalc
        up.unitPrice = up.gstPercentage
          ? up.netAmount / (1 + up.gstPercentage)
          : up.netAmount;
        up.taxAmount = up.netAmount - up.unitPrice;
        up.childTotalQuantity = up.isSecondaryUnit
          ? up.quantity * up.conversionFactor
          : up.quantity;
        up.childTotalPrice = up.netAmount * up.childTotalQuantity;
        up.gst = up.taxAmount * up.childTotalQuantity;
        up.wogst = up.unitPrice * up.childTotalQuantity;
        return up;
      })
    );
  };

  // Remove a line-item
  const removeLineItem = (li: LineItem) => {
    if (li.salesInvoiceChildID > 0) {
      setRemovedChildIds(ids => [...ids, li.salesInvoiceChildID]);
    }
    setLineItems(curr => curr.filter(x => x.id !== li.id));
  };

  // Build & send FormData on status-change
  const updateInvoiceStatus = async (newStatus: number) => {
    setStatusId(newStatus);
    setIsSubmitting(true);

    // 1) build your VM payload
    const payload = {
      SalesInvoiceID: invoiceId,
      SalesRequisitionID: selectedSaleObj!.salesRequisitionID,
      RefNo: refNo,
      InvoiceDate:formatForPayload(invoiceDate),
      CustomerID: selectedSaleObj!.customerID,
      CustomerChildID: null,
      SellerID: selectedSaleObj!.sellerID,
      WareHouseId: Number(selectedWarehouse),
      StatusId: newStatus,
    
      PONumber,
      PODate:formatForPayload(PODate),
      PaymentTerms: paymentTerms,
      Description: notes,
      TotalAmount: totalWOgst,
      TaxAmount: totaltaxamount,
      NetAmount: totalChildTotalPrice,
      PaidAmount: paidAmount,
      OutstandingAmount: totalChildTotalPrice,
      PaymentStatus: paymentStatus,
      TotalQuantity: totalQuantity,
      SalesInvoiceChildVMs: lineItems.map(li => ({
        SalesInvoiceChildID: li.salesInvoiceChildID,
        SalesInvoiceID: invoiceId,
        ItemID: li.itemId,
        Quantity: li.quantity,
        UnitPrice: li.unitPrice,
        Tax: li.taxAmount,
        TotalPrice: li.childTotalPrice,
        NetPrice: li.netAmount,
        UnitId: li.unitId,
        GSTPercentage: li.gstPercentage * 100,
        UnitName: li.unitName,
        ChildTotalQuantity: li.childTotalQuantity,
        ConversionFactor: li.conversionFactor,
        IsSecondaryUnit: li.isSecondaryUnit
      })),
      RemovedSalesInvoiceChildIds: removedChildIds
    };

    // 2) pack into FormData
    const formData = new FormData();
    formData.append("request", JSON.stringify(payload));
    formData.append("removeAttachmentIds", JSON.stringify(removeIds));
    attachments.forEach(a => formData.append("attachments", a.file));

    try {
      const res = await fetch(
        `${variables.API_URL}SalesInvoices/Update/${invoiceId}`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );
      if (!res.ok) throw new Error(await res.text());
      toast.success(
        newStatus === 1
          ? "Invoice Update!"
          : newStatus === 2
          ? "Invoice marked Pending"
          : "Invoice Approved"
      );
      setTimeout(() => navigate("/sales/invoice"), 500);
    } catch (err: any) {
      toast.error("Failed to update status: " + err.message);
    } finally {
      // setIsSubmitting(false);
    }
  };

  // Handlers
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateInvoiceStatus(statusId || 1);
  };
  const handlePending = (e: React.FormEvent) => {
    e.preventDefault();
    updateInvoiceStatus(2);
  };
  const handleApprove = (e: React.FormEvent) => {
    e.preventDefault();
    updateInvoiceStatus(3);
  };

  const getStatusText = (s: number) =>
    s === 1 ? "Draft" : s === 2 ? "Pending" : "Approved";

  return (
    <div>
      <ToastContainer />
      <form onSubmit={handleSubmit} className="space-y-6">
        <h1 className="text-2xl font-semibold">Edit Sales Invoice</h1>
        <Card className="p-6 space-y-6">
          {/* Header */}
          <div className="grid grid-cols-3 gap-6 text-center">
            <Label className="text-lg">{refNo}</Label>
            <Label className="text-lg">{getStatusText(statusId)}</Label>
            <Label className="text-lg">
              {invoiceStatusId === 1
                ? "Open"
                : invoiceStatusId === 2
                ? "Delivery Challan Issued"
                : invoiceStatusId === 3
                ? "Out For Delivery"
                : invoiceStatusId === 4
                ? "Delivered"
                : invoiceStatusId === 5
                ? "GRN Issued"
                : invoiceStatusId === 6
                ? "Payment Received"
                : ""}
            </Label>
          </div>
          <hr />

          {/* Grid fields */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label>Invoice Number</Label>
              <Input value={refNo} readOnly disabled />
            </div>
            <div >
              <Label className="block text-sm font-medium">PO Date</Label>
              <div className="mt-1 w-full">
                <DatePicker
                  selected={invoiceDate}
                  onChange={(d: Date | null) => setInvoiceDate(d)}
                  dateFormat="dd MMM yyyy"
                  wrapperClassName="w-full"        // make the datepicker’s container full‐width
                  customInput={<Input className="w-full" />}  // make the input itself fill its container
                />
              </div>
            </div>
            <div>
              <Label>Sales Requisition</Label>
              <Select
                value={selectedSale}
                onValueChange={setSelectedSale}
                disabled
              >
                <SelectTrigger disabled>
                  <SelectValue>
                    {sales.find(
                      (s) =>
                        s.salesRequisitionID.toString() === selectedSale
                    )?.refNo || "Select…"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {sales.map((s) => (
                    <SelectItem
                      key={s.salesRequisitionID}
                      value={s.salesRequisitionID.toString()}
                    >
                      {s.refNo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Customer</Label>
              <Input
                value={selectedSaleObj?.customerName || ""}
                readOnly
                disabled
              />
            </div>
            <div>
              <Label>Seller</Label>
              <Input
                value={selectedSaleObj?.sellerName || ""}
                readOnly
                disabled
              />
            </div>
            <div>
              <Label>PO Number</Label>
              <Input
                value={PONumber}
                onChange={(e) => setPONumber(e.target.value)}
              />
            </div>
            <div >
              <Label className="block text-sm font-medium">PO Date</Label>
              <div className="mt-1 w-full">
                <DatePicker
                  selected={PODate}
                  onChange={(d: Date | null) => setPODate(d)}
                  dateFormat="dd MMM yyyy"
                  wrapperClassName="w-full"        // make the datepicker’s container full‐width
                  customInput={<Input className="w-full" />}  // make the input itself fill its container
                />
              </div>
            </div>
            {/* <div>
              <Label>Payment Terms</Label>
              <Input
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
              />
            </div> */}
            <div>
              <Label>Warehouse</Label>
              <Select
                value={selectedWarehouse}
                onValueChange={setSelectedWarehouse}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Warehouse" />
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
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>Notes</Label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
 {/* Items Table */}
          <div className="flex justify-between mb-2">
              <h3 className="font-semibold">Items</h3>
              {/* <Button onClick={addLineItem} type="button">
                <Plus /> Add
              </Button> */}
            </div>
 <div className="overflow-x-auto border rounded-lg">
  <div className="max-h-[360px] overflow-y-auto">
    <Table className="table-auto min-w-max bg-white">
      <TableHeader className="sticky top-0 z-10 bg-white shadow-sm">
        <TableRow>
          {[
            "S No.",
            "Item",
            "Unit",
            "Qty",
            "Conv. Factor",
            "Total Qty",
            "Avail. Stock",
            "Unit Price",
            "Tax/Unit",
            "Net Amt",
            "Total Net Price",
          ].map((h) => (
            <TableHead
              key={h}
              className="px-3 py-2 text-left text-sm font-medium text-gray-700"
            >
              {h}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {lineItems.length === 0 ? (
          <TableRow>
            <TableCell colSpan={11} className="py-6 text-center text-gray-500">
              No items
            </TableCell>
          </TableRow>
        ) : (
          lineItems.map((li, idx) => (
            <TableRow
              key={li.id}
              className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
            >
              <TableCell className="px-3 py-2 text-sm">{idx + 1}</TableCell>
              <TableCell className="px-3 py-2">
                <SearchableSelect
                  value={li.itemId.toString()}
                  onValueChange={() => {}}
                  items={items}
                  disabled
                />
              </TableCell>
              <TableCell className="px-3 py-2">
                <Input
                  value={li.unitName}
                  disabled
                  className="w-full p-1 text-sm bg-gray-100"
                />
              </TableCell>
              <TableCell className="px-3 py-2">
                <Input
                  type="number"
                  value={li.quantity}
                  onChange={(e) =>
                    updateLineItem(li.id, "quantity", e.target.value)
                  }
                  className="w-full p-1 text-sm"
                  readOnly={statusId === 3} disabled={statusId === 3} 
                />
              </TableCell>
              <TableCell className="px-3 py-2">
                <Input
                  type="number"
                  value={li.conversionFactor}
                  disabled
                  className="w-full p-1 text-sm bg-gray-100"
                />
              </TableCell>
              <TableCell className="px-3 py-2">
                <Input
                  type="number"
                  value={li.childTotalQuantity}
                  disabled
                  title={
                    li.childTotalQuantity > li.itemStockQuantity
                      ? "Exceeds available stock"
                      : undefined
                  }
                  className={`w-full p-1 text-sm border rounded ${
                    li.childTotalQuantity > li.itemStockQuantity
                      ? "bg-red-100 border-red-500"
                      : "bg-gray-100 border-gray-200"
                  }`}
                />
              </TableCell>
              <TableCell className="px-3 py-2">
                <Input
                  type="number"
                  value={li.itemStockQuantity}
                  disabled
                  className="w-full p-1 text-sm bg-orange-100"
                />
              </TableCell>
              <TableCell className="px-3 py-2">
                <Input
                  type="number"
                  value={li.unitPrice.toFixed(2)}
                  disabled
                  className="w-full p-1 text-sm bg-gray-100"
                />
              </TableCell>
              <TableCell className="px-3 py-2">
                <Input
                  type="number"
                  value={li.taxAmount.toFixed(2)}
                  disabled
                  className="w-full p-1 text-sm bg-gray-100"
                />
              </TableCell>
              <TableCell className="px-3 py-2">
                <Input
                  type="number"
                  value={li.netAmount.toFixed(2)}
                  onChange={(e) =>
                    updateLineItem(li.id, "netAmount", e.target.value)
                  }
                   className={`w-24 p-1 text-sm border rounded ${!isSuperAdmin ? "bg-gray-100" : ""}`}
                    disabled={!isSuperAdmin}
                          readOnly={!isSuperAdmin}
                />
              </TableCell>
              <TableCell className="px-3 py-2">
                <Input
                  type="number"
                  value={li.childTotalPrice.toFixed(2)}
                  disabled
                  className="w-full p-1 text-sm bg-gray-100"
                />
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  </div>
  
</div>
{hasInsufficientStock &&( <p className="validation-error text-center">One or more item(s) is out of stock. Please adjust quantities on basis of available stock.</p>)}



<div className="flex justify-end">
            <div className="inline-block max-w-xs border-2 border-dashed border-gray-300 p-4 rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Total W/O GST Amount (PKR):</span>
                <span className="font-medium text-gray-800">{formatNumber(totalWOgst)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600"> GST Amount (PKR):</span>
                <span className="font-medium text-gray-800">{formatNumber(totaltaxamount.toFixed(2))}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-gray-900"> Net Amount (PKR):</span>
                <span className="font-semibold text-gray-900">
                  {formatNumber(totalChildTotalPrice.toFixed(2))}
                </span>
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
          

          {/* Totals */}
        

          {/* Actions */}
          {isEditing && (
            <div className="flex justify-between items-center mt-4">
              <div className="flex gap-4">
                {statusId < 2 && (
                  <Button onClick={handlePending} disabled={isSubmitting || hasInsufficientStock}>
                    <Clock9 /> PENDING
                  </Button>
                )}
                {statusId < 3 && hasPermission(25, "approve") && (
                  <Button onClick={handleApprove} disabled={isSubmitting || hasInsufficientStock}>
                    <CircleCheck /> APPROVE
                  </Button>
                )}
              </div>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => navigate(-1)}
                >
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting || hasInsufficientStock}>
                  Update
                </Button>
              </div>
            </div>
          )}
        </Card>
      </form>
    </div>
  );
};

export default SalesInvoiceEdit;
