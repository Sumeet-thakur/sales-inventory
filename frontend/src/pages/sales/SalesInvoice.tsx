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
import { Loader2, Plus, Trash2 } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { variables } from "@/Variables";
import { RootState } from "@/Storage/Redux/store";
import "react-toastify/dist/ReactToastify.css";
import useAuthValidation from "@/hooks/useAuthValidation";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import useLocalDateString from "@/hooks/useLocalDateString";
import useNumberFormatter from "@/hooks/useNumberFormatter";
import { useFileAttachments } from "@/hooks/useFileAttachments";
import { SD_Roles } from "@/Utility/SD";

interface LineItem {
  id: number;
  salesRequisitionChildID: number;
  salesRequisitionID: number;
  itemId: number;
  quantity: number;
  unitId: number;
  unitName: string;
  description: string;
  conversionFactor: number;
  itemStockQuantity: number;
  isSecondaryUnit: boolean;
  childTotalQuantity: number;
  unitPrice: number;
  tax: number;        // percentage from API
  taxAmount: number;  // computed amount
  netAmount: number;  // computed amount
  childTotalPrice: number;  // computed amount
  gst: number,
  wogst: number,
}
interface itemModel {
  itemId: number;
  itemName: string;
}
interface warehouseModel {
  warehouseID: number;
  warehouseName: string;
}

interface MultipleAttachmentVM { multipleAttachmentfileId: number; fileName: string; filePath: string; referenceno: string; }
interface SalesOrder {
  salesRequisitionID: number;
  refNo: string;
  sellerID: number;
  customerID: number;
  sellerName: string;
  customerName: string;
}
interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  items: itemModel[];
  placeholder?: string;
  disabled?: boolean;      // ← new
}
const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onValueChange,
  items,
  placeholder = "Select Item",
  disabled = false,
}) => {
  return (
    <Select
      value={value}
      onValueChange={disabled ? () => { } : onValueChange}
      disabled={disabled}
    >
      <SelectTrigger disabled={disabled}>
        <SelectValue>
          {items.find(i => i.itemId.toString() === value)?.itemName
            || placeholder}
        </SelectValue>
      </SelectTrigger>
      {!disabled && (
        <SelectContent side="bottom" className="max-h-60 overflow-y-auto">
          {/* …search + list… */}
        </SelectContent>
      )}
    </Select>
  );
};


const SalesInvoice = () => {
  useAuthValidation();
  const { token ,role} = useSelector((s: RootState) => s.userAuthStore);
  const navigate = useNavigate();

  // Header fields
  const [refNo, setRefNo] = useState("");

  const [invoiceDate, setInvoiceDate] = useState<Date>(new Date());
  const [selectedSale, setSelectedSale] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [PONumber, setPONumber] = useState("");
 
  const [PODate, setPODate] = useState<Date>(new Date());
  const [paymentTerms, setPaymentTerms] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [paidAmount, setPaidAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [items, setItems] = useState<itemModel[]>([]);
  const formatForPayload = useLocalDateString();
  const formatNumber=useNumberFormatter();
  const [warehouses, setWarehouses] = useState<warehouseModel[]>([]);
 const fileInputRef = useRef<HTMLInputElement>(null);
 const isSuperAdmin=role == SD_Roles.SuperAdmin;
 

  // Line items
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  // Sales dropdown
  const [sales, setSales] = useState<SalesOrder[]>([]);
  const selectedSaleObj = sales.find(
    (s) => s.salesRequisitionID.toString() === selectedSale
  );

  // Fetch next invoice ref and sales list
  useEffect(() => {
    const loadHeader = async () => {
      // Get next invoice ref #
      try {
        const res = await fetch(
          `${variables.API_URL}SalesInvoices/GetNextSalesInvoiceRefNumber`,
          { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }
        );
        const d = await res.json();
        setRefNo(d.salesInvoiceRefNumber);
      } catch {
        toast.error("Failed to get next invoice #");
      }
  
      // Get sales requisitions
      try {
        const res = await fetch(
          // `${variables.API_URL}SalesInvoices/get-salesRequisition`,
          `${variables.API_URL}SalesInvoices/GetSalesRequisitionsSP`,
          { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (data.length < 0){

        }
        else{
        setSales(
          Array.isArray(data)
            ? data.map((x: any) => ({
                salesRequisitionID: x.salesRequisitionID,
                refNo: x.refNo,
                sellerID: x.sellerID,
                customerID: x.customerID,
                sellerName: x.sellerName,
                customerName: x.customerName,
              }))
            : []
        );}
      } catch {
        toast.error("Failed to load sales requisitions");
      }
    };
  
    loadHeader();
  }, [token]);
  useEffect(() => {

    fetchItems();
    fetchWareHouse();
     setIsSubmitting(false);

  }, [token]);
  // Fetch items when sale changes
  useEffect(() => {
    const loadLineItems = async () => {
      if (!selectedSaleObj) {
        setLineItems([]);
        return;
      }
      const custId = selectedSaleObj.customerID;
  
      try {
        const res = await fetch(
          `${variables.API_URL}SalesInvoices/get-SalesRequisitionItems/${selectedSale}/${custId}`,
          { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error(res.statusText);
        const raw: any[] = await res.json();
  
        const computed = raw.map((c, idx) => {
          // pull the raw values
          const initialQuantity         = c.quantity;
          const conversionFactor = c.conversionFactor;
          const isSecondaryUnit  = c.isSecondaryUnit;
          const netAmount        = c.netAmount;
          const tax              = c.gstPercentage;
          const itemStockQuantity    = c.itemStockQuantity;
  
          // recalc everything
          const quantity=isSecondaryUnit
            ? initialQuantity / conversionFactor
            : initialQuantity;
          const unitPrice        = tax
            ? netAmount / (1 + tax / 100)
            : netAmount;
          const taxAmount        = netAmount - unitPrice;
          const childTotalQuantity = initialQuantity;
          
          const childTotalPrice  = netAmount * childTotalQuantity;
          const gst              = childTotalQuantity * taxAmount;
          const wogst            = childTotalQuantity * unitPrice;
  
          return {
            id: Date.now() + idx,
            salesRequisitionChildID: c.salesRequisitionChildID,
            // force the user‐selected parent ID
            salesRequisitionID: selectedSaleObj.salesRequisitionID,
            itemId: c.itemID,
            quantity,
            unitId: c.unitId,
            unitName: c.unitName,
            description: "",
            conversionFactor,
            isSecondaryUnit,
            childTotalQuantity,
            unitPrice,
            tax,
            taxAmount,
            itemStockQuantity,
            netAmount:c.netAmount,
            childTotalPrice,
            gst,
            wogst,
          } as LineItem;
        });
  
        setLineItems(computed);
      } catch {
        toast.error("Could not load requisition items.");
      }
    };
  
    loadLineItems();
  }, [selectedSaleObj, token]);
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
  const fetchWareHouse = async () => {
    try {
      const response = await fetch(`${variables.API_URL}SalesInvoices/get-warehouse`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setWarehouses(
            data.map((item: any) => ({
              warehouseID: item.warehouseID,
              warehouseName: item.warehouseName,
            }))
          );
        } else throw new Error("Unexpected data structure");
      } else throw new Error("Failed to fetch items");
    } catch (error) {
      console.error("Error fetching items:", error);
    }
  };
 
  // Totals
  // ── Computed totals ───────────────────────────────────────────────────────
  const totalQuantity = lineItems.reduce((sum, i) => sum + i.childTotalQuantity, 0);
  const subTotal = lineItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  // const totalTaxAmount = lineItems.reduce((sum, i) => sum + i.taxAmount, 0);
  // const netAmount = subTotal + totalTaxAmount;
  const totalChildTotalPrice = lineItems.reduce((sum, i) => sum + i.childTotalPrice, 0);  // ← new
  const totaltaxamount = lineItems.reduce((sum, i) => sum + i.gst, 0);  // ← new
  const totalWOgst = lineItems.reduce((sum, i) => sum + i.wogst, 0);  // ← new
  const outstandingAmount = totalChildTotalPrice;
const hasInsufficientStock = lineItems.some(
  (li) => li.childTotalQuantity > li.itemStockQuantity
);
  // Handlers
  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        salesRequisitionChildID: 0,
        salesRequisitionID: Number(selectedSale || 0),
        itemId: 0,
        quantity: 0,
        unitId: 0,
        unitName: "",
        description: "",
        conversionFactor: 0,
        isSecondaryUnit: false,
        childTotalQuantity: 0,
        itemStockQuantity: 0,
        unitPrice: 0,
        tax: 0,
        taxAmount: 0,
        netAmount: 0,
        childTotalPrice: 0,
        gst: 0,
        wogst: 0,
      },
    ]);
  };

  const updateLineItem = (
    id: number,
    field: keyof LineItem,
    val: string
  ) => {
    setLineItems(prev =>
      prev.map(li => {
        if (li.id !== id) return li;
        const updated = { ...li } as LineItem;
  
        // 1) apply the incoming change
        switch (field) {
          case "quantity":
            updated.quantity = Number(val);
            break;
          case "tax":
            updated.tax = Number(val);
            break;
          case "netAmount":
            updated.netAmount = Number(val);
            break;
          default:
            (updated as any)[field] = val;
        }
  
        // 2) recalc unitPrice & taxAmount from netAmount & tax%
        if (field === "tax" || field === "netAmount") {
          // unitPrice = netAmount ÷ (1 + tax/100)
          updated.unitPrice = updated.tax
            ? updated.netAmount / (1 + updated.tax / 100)
            : updated.netAmount;
          // taxAmount = netAmount – unitPrice
          updated.taxAmount = updated.netAmount - updated.unitPrice;
        }
  
        // 3) recalc childTotalQuantity
        updated.childTotalQuantity =
          updated.isSecondaryUnit && updated.conversionFactor > 0
            ? updated.quantity * updated.conversionFactor
            : updated.quantity;
  
        // 4) recompute totals
        updated.childTotalPrice = updated.netAmount * updated.childTotalQuantity;
        updated.gst             = updated.childTotalQuantity * updated.taxAmount;
        updated.wogst           = updated.childTotalQuantity * updated.unitPrice;
  
        return updated;
      })
    );
  };
  
  
useEffect(() => {
  if (!selectedWarehouse) return;

  const fetchAndUpdateStock = async (itemId: number, liId: number) => {
    try {
      const res = await fetch(
        `${variables.API_URL}SalesInvoices/get-ItemStock/${itemId}/${selectedWarehouse}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!res.ok) throw new Error(res.statusText);

      const data = await res.json();
      let newQty = 0;

      // If API returns an array of objects, each with itemId & itemStockQuantity:
      if (Array.isArray(data)) {
        const entry = data.find((e: any) => e.itemID === itemId);
        newQty = entry?.itemStockQuantity ?? 0;
      }
      // If API returns a single object { itemId, itemStockQuantity }
      else if (typeof data === "object" && data.itemId === itemId) {
        newQty = data.itemStockQuantity;
      }
      // If API returns a bare number
      else if (typeof data === "number") {
        newQty = data;
      }

      setLineItems((prev) =>
        prev.map((li) =>
          li.id === liId
            ? { ...li, itemStockQuantity: newQty }
            : li
        )
      );
    } catch (error) {
      console.error(
        `Error fetching stock for item ${itemId} / warehouse ${selectedWarehouse}:`,
        error
      );
    }
  };

  lineItems.forEach((li) => {
    if (li.itemId && selectedWarehouse) {
      fetchAndUpdateStock(li.itemId, li.id);
    }
  });
}, [
  selectedWarehouse,
  token,
  // re-run when the list of itemIds changes
  lineItems.map((li) => li.itemId).join(","),
]);


  const removeLineItem = (id: number) =>
    setLineItems((prev) => prev.filter((li) => li.id !== id));

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
  if (hasInsufficientStock) {
  toast.error("One or more items exceed available stock. Please adjust quantities.");
  return;
}
    if (!selectedSaleObj) {
      toast.error("Please select a sales requisition");
      setIsSubmitting(false);
      return;
    }
  
    // --- build one JS payload object ---
    const payload = {
      SalesRequisitionID: selectedSaleObj.salesRequisitionID,
      RefNo: refNo,
      InvoiceDate: formatForPayload(invoiceDate),
      CustomerID: selectedSaleObj.customerID,
      CustomerChildID: null,
      SellerID: selectedSaleObj.sellerID,
      PONumber: PONumber,
      PODate: formatForPayload(PODate),
      PaymentTerms: paymentTerms,
      Description: notes,
      TotalAmount: totalWOgst,
      TaxAmount: totaltaxamount,
      NetAmount: totalChildTotalPrice,
      PaidAmount: paidAmount,
      OutstandingAmount: totalChildTotalPrice,
      PaymentStatus: paymentStatus,
      TotalQuantity: totalQuantity,
      WareHouseId:Number(selectedWarehouse),
      SalesInvoiceChildRequests: lineItems.map(li => ({
        ItemID: li.itemId,
        Quantity: li.quantity,
        UnitPrice: li.unitPrice,
        Tax: li.taxAmount,
        TotalPrice: li.childTotalPrice,
        NetPrice: li.netAmount,
        UnitId: li.unitId,
        ChildTotalQuantity: li.childTotalQuantity,
        ConversionFactor: li.conversionFactor,
        IsSecondaryUnit: li.isSecondaryUnit,
      }))
    };
  
    // --- package it all in FormData ---
    const formData = new FormData();
    formData.append("request", JSON.stringify(payload));
    attachments.forEach(a => formData.append("attachments", a.file));
  
    try {
      const res = await fetch(
        `${variables.API_URL}SalesInvoices/Create`,
        {
          method: "POST",
          headers: {
            // leave Content-Type unset!
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );
  
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }
  
      await res.json();
      toast.success("Invoice created successfully");
      setTimeout(() => navigate("/sales/invoice"), 2000);
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
     
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
      <form onSubmit={handleSubmit} className="space-y-6">
        <h1 className="text-2xl font-semibold">Create Sales Invoice</h1>
        <Card className="p-6 space-y-6">
          {/* Header Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label>Invoice Number</Label>
              <Input value={refNo} readOnly disabled className="bg-gray-50" />
            </div>
            <div >
              <Label className="block text-sm font-medium">Invoice Date</Label>
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
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {sales.map((s) => (
                    <SelectItem
                      key={s.salesRequisitionID} value={s.salesRequisitionID.toString()}
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
                readOnly disabled className="bg-gray-50"
              />
            </div>
            <div>
              <Label>Seller</Label>
              <Input
                value={selectedSaleObj?.sellerName || ""}
                readOnly disabled className="bg-gray-50"
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
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((s) => (
                    <SelectItem
                      key={s.warehouseID} value={s.warehouseID.toString()}
                    >
                      {s.warehouseName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>Notes / Description</Label>
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
                    "Item ",
                    "Unit ",
                    "Qty",
                    "Conv. Factor",
                    "Total Qty",
                    "Available Stock",
                    "Unit Price",
                    "Sales Tax/Unit",
                    "Net Price",
                    " Total Price",
                  ].map((head) => (
                    <TableHead
                      key={head}
                      className="px-3 py-2 text-left text-sm font-medium text-gray-700"
                    >
                      {head}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {lineItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="px-4 py-6 text-center text-gray-500">
                      No items added yet
                    </TableCell>
                  </TableRow>
                ) : (
                  lineItems.map((li, idx) => (
                    <TableRow
                      key={li.id}
                      className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}

                    >
                      <TableCell className="px-4 py-2 text-sm text-gray-800">{idx + 1}</TableCell>
                      <TableCell  className="px-3 py-2">
                        <SearchableSelect
                          value={li.itemId ? li.itemId.toString() : ""}
                          onValueChange={v => updateLineItem(li.id, "itemId", v)}
                          items={items}
                          disabled        // ← now read‑only
                        />
                      </TableCell>
                      <TableCell className="px-4 py-2">
                        <Input
                          type="text"
                          value={li.unitName}
                          onChange={(e) => updateLineItem(li.id, "unitId", e.target.value)}
                       className="w-full p-1 text-sm bg-gray-100"
                          disabled
                        />
                      </TableCell>
                      <TableCell className="px-4 py-2">
                        <Input
                          type="number"
                          value={li.quantity}
                          onChange={e => updateLineItem(li.id, "quantity", e.target.value)}
                          className="w-20 p-1 text-sm border rounded"
                        />
                      </TableCell>
                      <TableCell className="px-4 py-2">
                        <Input
                          type="number"
                          value={li.conversionFactor}
                          disabled
                          className="w-20 p-1 text-sm bg-gray-100 border rounded"
                        />
                      </TableCell>
                      <TableCell className="px-4 py-2">
                        <Input
                          type="number"
                          value={li.childTotalQuantity}
                          disabled
                         title={ li.childTotalQuantity > li.itemStockQuantity ? "Requested quantity exceeds available stock" : undefined } className={`w-20 p-1 text-sm border rounded ${ li.childTotalQuantity > li.itemStockQuantity ? "bg-red-100 border-red-500" : "bg-gray-100 border-gray-200" }`}
                        />
                      </TableCell>
                      <TableCell className="px-4 py-2">
                        <Input
                          type="number"
                          value={li.itemStockQuantity}
                          disabled
                          className="w-full p-1 text-sm bg-orange-100"
                        />
                      </TableCell>
                      <TableCell className="px-4 py-2">
                        <Input
                          type="number"
                          value={li.unitPrice.toFixed(2)}
                          onChange={(e) => updateLineItem(li.id, "unitPrice", e.target.value)}
                          className="w-20 p-1 text-sm bg-gray-100 border rounded"
                          disabled
                        />
                      </TableCell>
                      <TableCell className="px-4 py-2">
                        <Input
                          type="number"
                          value={li.taxAmount.toFixed(2)}
                          disabled
                          className="w-24 p-1 text-sm bg-gray-100 border rounded"
                        />
                      </TableCell>
                      <TableCell className="px-4 py-2">
                        <Input
                          type="number"
                          value={li.netAmount.toFixed(2)}
                          onChange={(e) => updateLineItem(li.id, "netAmount", e.target.value)}
                           className={`w-24 p-1 text-sm border rounded ${!isSuperAdmin ? "bg-gray-100" : ""}`}
                          disabled={!isSuperAdmin}
                          readOnly={!isSuperAdmin}
                        />
                      </TableCell>
                      <TableCell className="px-4 py-2">
                        <Input
                          type="number"
                          value={li.childTotalPrice.toFixed(2)}
                          disabled
                          className="w-24 p-1 text-sm bg-gray-100 border rounded"
                        />
                      </TableCell>

                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
{hasInsufficientStock &&( <p className="validation-error text-center">One or more item(s) is out of stock. Please adjust quantities on basis of available stock.</p>)}
          </div>
          </div>
          <hr/>
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


          {/* Totals Card */}
          

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => navigate(-1)} type="button">Cancel</Button>
            <Button type="submit" disabled={isSubmitting || hasInsufficientStock}>
              {isSubmitting && <Loader2 className="animate-spin mr-2" />}Create
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
};

export default SalesInvoice;
