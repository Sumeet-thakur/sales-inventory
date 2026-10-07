import React, { useState, useRef, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCallback } from 'react'
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
import { Upload, Trash2, Plus, Clock9, CircleCheck, Download } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate, useParams } from "react-router-dom";
import { variables } from "@/Variables";
import { RootState } from "@/Storage/Redux/store";
import { useSelector } from "react-redux";
import useAuthValidation from "@/hooks/useAuthValidation";
import useFormatDate from "@/hooks/useFormatDate";
import { usePermissions } from "@/hooks/usePermissions";
import { useFileAttachments } from "@/hooks/useFileAttachments";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import useLocalDateString from "@/hooks/useLocalDateString";


// Models
interface Attachment { id: string; file: File; name: string; }
interface Customer { customerId: number; customerName: string; }
interface UsersModel { usersId: string; userName: string; }
interface PaymentMode { paymentModeId: number; paymentModeName: string; }
interface SalesModel {
  salesInvoiceID: number;
  paymentStatusId: number;
  refNo: string;
  invoiceDate: string;
  netAmount: string;
  outstandingAmount: string;
  paidAmount: string;
}

// Backend VM
interface PaymentReceivedChildVM {
  paymentReceivedChildID: number;
  paymentReceivedID: number;
  salesInvoiceID: number;
  paidAmount: number;
}
interface MultipleAttachmentVM { multipleAttachmentfileId: number; fileName: string; filePath: string; referenceno: string; }
interface PaymentReceivedVM {
  paymentReceivedID: number;
  refNo: string;
  paymentDate: string;
  customerID: number;
  paymentAmount: number;
  paymentModeId: number;
  statusId: number;
  receivedBy: string;
  referenceNumber: string;
  paymentReceivedChildVMs: PaymentReceivedChildVM[];
  multipleAttachments: MultipleAttachmentVM[];
}

// Searchable customer dropdown
interface SearchableSelectCustomerProps {
  value: string;
  onValueChange: (value: string) => void;
  customers: Customer[];
  placeholder?: string;
  disabled?: boolean;
}
const SearchableSelectCustomer: React.FC<SearchableSelectCustomerProps> = ({
  value,
  onValueChange,
  customers,
  placeholder = "Select Customer",
  disabled = false,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const filtered = useMemo(
    () => customers.filter(c =>
      c.customerName.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [customers, searchTerm]
  );
  return (
    <Select
      value={value}
      onValueChange={val => !disabled && onValueChange(val)}
      disabled={disabled}
    >
      <SelectTrigger disabled={disabled}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      {!disabled && (
        <SelectContent className="max-h-60 overflow-y-auto">
          <Input
            placeholder="Search…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {filtered.length > 0
            ? filtered.map(c => (
              <SelectItem key={c.customerId} value={c.customerId.toString()}>
                {c.customerName}
              </SelectItem>
            ))
            : <div className="px-2 py-1 text-sm text-gray-500">
              No customers found
            </div>}
        </SelectContent>
      )}
    </Select>
  );
};

const PaymentReceived: React.FC = () => {
  useAuthValidation();
  const { token, roleid, userId } = useSelector((s: RootState) => s.userAuthStore);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { hasPermission, loading: permissionsLoading } = usePermissions(roleid);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formatDate = useFormatDate();

  const [isEditing, setIsEditing] = useState(false);
  // const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [existingFiles, setExistingFiles] = useState<{ id: string; fileName: string; url: string; reference: string; }[]>([]);
  const [refNo, setRefNo] = useState("");

  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [customer, setCustomer] = useState("");
  const [paymentmode, setPaymentmode] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [statusid, setStatusId] = useState<number | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<UsersModel[]>([]);
  // const [selectUser, setSelectUser] = useState("");
  const [paymentmodes, setPaymentmodes] = useState<PaymentMode[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [removeIds, setRemoveIds] = useState<number[]>([]);
  const formatForPayload = useLocalDateString();

  const [lineItems, setLineItems] = useState<{
    salesInvoiceID: number;
    paymentStatusId: number;
    refNo: string;
    invoiceDate: string;
    netAmount: string;
    outstandingAmount: string;
    paidAmount: string;
  }[]>([]);

  const [salesInvoice, setSalesInvoice] = useState<Record<number, SalesModel[]>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const totalpayamount = lineItems.reduce(
    (sum, li) => sum + (parseFloat(li.paidAmount) || 0),
    0
  );

  // Load lookups and then either NEW or EDIT logic


  useEffect(() => {
    const loadData = async () => {
      if (!token) return;

      try {
        // 1. fetch customers & payment modes
        const [custs, modes, user] = await Promise.all([
          fetch(`${variables.API_URL}PaymentsReceived/get-customers`, {
            headers: { Authorization: `Bearer ${token}` }
          }).then(r => r.json()),
          fetch(`${variables.API_URL}PaymentsReceived/get-paymentmode`, {
            headers: { Authorization: `Bearer ${token}` }
          }).then(r => r.json()),
          fetch(`${variables.API_URL}Auth/getUsers`, {
            headers: { Authorization: `Bearer ${token}` }
          }).then(r => r.json())
        ]);
        setCustomers(custs);
        setPaymentmodes(modes);
        setUsers(user);


        // 2. NEW record
        if (!id) {
          const refRes = await fetch(`${variables.API_URL}PaymentsReceived/GetNextPaymentRefNumber`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const refData = await refRes.json();
          setRefNo(refData.paymentRefNumber);
          setReceivedBy(userId);
          return;
        }

        // 3. EDIT record
        setIsEditing(true);

        // 3.1 fetch existing VM
        const vmRes = await fetch(`${variables.API_URL}PaymentsReceived/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const d: PaymentReceivedVM = await vmRes.json();

        setRefNo(d.refNo);
        setPaymentDate(d.paymentDate ? new Date(d.paymentDate) : new Date());
        setCustomer(d.customerID.toString());
        setPaymentmode(d.paymentModeId.toString());
        setReferenceNumber(d.referenceNumber);
        setReceivedBy(d.receivedBy);
        setStatusId(d.statusId);
        setExistingFiles(
          d.multipleAttachments.map(ma => {
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

        // 3.2 prepare bare lineItems
        const initialRows = d.paymentReceivedChildVMs.map(c => ({
          salesInvoiceID: c.salesInvoiceID,
          paymentStatusId: 0,
          refNo: "",
          invoiceDate: "",
          netAmount: "",
          outstandingAmount: "",
          paidAmount: c.paidAmount.toString(),
        }));
        setLineItems(initialRows);

        // 3.3 fetch unpaid invoices
        const invRes = await fetch(
          //`${variables.API_URL}PaymentsReceived/get-invoicenumber/${d.customerID}`,
          `${variables.API_URL}PaymentsReceived/GetInvoiceNumbersSP/${d.customerID}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const unpaid: SalesModel[] = await invRes.json();

        // 3.4 build selected subset (already-chosen invoices)
        const selected: SalesModel[] = d.paymentReceivedChildVMs.map(c => ({
          salesInvoiceID: c.salesInvoiceID,
          paymentStatusId: 0,
          refNo: "",
          invoiceDate: "",
          netAmount: "",
          outstandingAmount: "",
          paidAmount: "",
        }));

        // 3.5 merge + dedupe
        const allOptions = [...unpaid, ...selected].reduce((acc: SalesModel[], inv) => {
          if (!acc.find(x => x.salesInvoiceID === inv.salesInvoiceID)) {
            acc.push(inv);
          }
          return acc;
        }, []);

        // 3.6 seed options map
        const invoiceMap: Record<number, SalesModel[]> = {};
        initialRows.forEach((_, idx) => {
          invoiceMap[idx] = allOptions;
        });
        setSalesInvoice(invoiceMap);

        // 3.7 patch lineItems with the unpaid data we already have
        setLineItems(all =>
          all.map(li => {
            const sel = allOptions.find(o => o.salesInvoiceID === li.salesInvoiceID);
            return sel
              ? {
                ...li,
                paymentStatusId: sel.paymentStatusId,
                refNo: sel.refNo,
                invoiceDate: sel.invoiceDate,
                netAmount: sel.netAmount,
                outstandingAmount: sel.outstandingAmount,
              }
              : li;
          })
        );

        // 3.8 Fetch missing details for any saved invoiceID that wasn’t in the unpaid list
        await Promise.all(
          d.paymentReceivedChildVMs.map(async (childVm, idx) => {
            const detailRes = await fetch(
              `${variables.API_URL}SalesInvoices/${childVm.salesInvoiceID}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!detailRes.ok) throw new Error("Failed to load invoice details");
            const det: SalesModel = await detailRes.json();

            // merge those details into lineItems[idx]
            setLineItems(prev =>
              prev.map((li, i) =>
                i === idx
                  ? {
                    ...li,
                    paymentStatusId: det.paymentStatusId,
                    refNo: det.refNo,
                    invoiceDate: det.invoiceDate,
                    netAmount: det.netAmount,
                    outstandingAmount: det.outstandingAmount,
                  }
                  : li
              )
            );
          })
        );
      } catch (error) {
        console.error("Failed to load data:", error);
      }
    };

    loadData();
  }, [token, id]);


  // clear when customer changes on NEW
  useEffect(() => {
    if (!isEditing) {
      setLineItems([]);
      setSalesInvoice({});
    }
  }, [customer, isEditing]);

  // Add one empty line
  const addLineItem = () => {
    if (!customer) { toast.error("Select a customer first"); return; }
    const idx = lineItems.length;
    setLineItems(p => [
      ...p,
      {
        salesInvoiceID: 0,
        paymentStatusId: 0,
        refNo: "",
        invoiceDate: "",
        netAmount: "",
        outstandingAmount: "",
        paidAmount: "",
      }
    ]);
    // fetch new options for this row
    fetch(
      //  `${variables.API_URL}PaymentsReceived/get-invoicenumber/${customer}`,
      `${variables.API_URL}PaymentsReceived/GetInvoiceNumbersSP/${customer}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
      .then(r => r.json())
      .then((arr: SalesModel[]) => {
        setSalesInvoice(p => ({ ...p, [idx]: arr }));
      });
  };

  // file handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        if (file.size > 5_000_000) {
          toast.error(`File ${file.name} exceeds 5MB limit`);
        } else {
          // setAttachments(p => [...p, { id: Date.now().toString(), file, name: file.name }]);
        }
      });
      e.target.value = "";
    }
  };

  // setAttachments(p => p.filter(a => a.id !== id));

  // validation
  const validateForm = () => {
    const errors: Record<string, string> = {};
    const seen = new Set<number>();

    if (!paymentmode) errors.paymentmode = "Select Payment mode.";
    if (!referenceNumber.trim()) errors.referenceNumber = "Enter reference number.";
    if (!(paymentDate instanceof Date) || isNaN(paymentDate.getTime())) errors.paymentDate = "Date is required.";

    // New: Ensure at least one invoice
    if (lineItems.length === 0) {
      errors["no_invoice"] = "At least one invoice must be added.";
    }

    lineItems.forEach((li, idx) => {
      const amt = parseFloat(li.paidAmount);
      if (isNaN(amt) || amt <= 0) {
        errors[`paid_${idx}`] = `Row ${idx + 1}: Paid amount must be > 0`;
      }
      if (li.salesInvoiceID) {
        if (seen.has(li.salesInvoiceID)) {
          errors[`dup_${idx}`] = `Row ${idx + 1}: Duplicate invoice selected`;
        } else {
          seen.add(li.salesInvoiceID);
        }
      } else {
        errors[`invoice_${idx}`] = `Row ${idx + 1}: Invoice must be selected`;
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };


  // submit
  // Function to update invoice status
  async function updateInvoiceStatus(newStatus: number) {


    setStatusId(newStatus);
    setIsSubmitting(true);
    const payload = {
      PaymentReceivedID: isEditing && id ? parseInt(id) : undefined,
      RefNo: refNo,
      PaymentDate: formatForPayload(paymentDate),
      CustomerID: customer ? parseInt(customer) : null,
      PaymentAmount: totalpayamount,
      PaymentModeId: paymentmode ? parseInt(paymentmode) : null,
      ReceivedBy: receivedBy,
      ReferenceNumber: referenceNumber,
      PaymentReceivedChildVMs: lineItems.map(li => ({
        SalesInvoiceID: li.salesInvoiceID,
        PaidAmount: parseFloat(li.paidAmount) || 0,
      })),
      StatusId: newStatus,
    };
    const url =
      isEditing && id
        ? `${variables.API_URL}PaymentsReceived/${id}`
        : `${variables.API_URL}PaymentsReceived/AddPaymentReceived`;
    const method = isEditing ? "PUT" : "POST";

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

    try {
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error((await res.text()) || "Save failed");
      toast.success(
        newStatus === 1 ? "Saved" : newStatus === 2 ? "Pending" : "Approved"
      );
      navigate(-1);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }


  // Handle submit action (Submit as saved)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (statusid == 3) {
      updateInvoiceStatus(3);
    } else {
      updateInvoiceStatus(1);
    }
  };

  // Handle pending action (Set to Pending)
  const handlePending = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    updateInvoiceStatus(2); // Pending
  };
  // Handle approve action (Set to Approved)
  const handleApprove = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    updateInvoiceStatus(3); // Approved
  };

  function getPaymentStatusText(id: number) {
    switch (id) {
      case 1: return "Unpaid";
      case 2: return "Partial";
      case 3: return "Paid";
      case 4: return "Overpaid";
      default: return "";
    }
  }
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
  return (
    <div className="space-y-6">
      <ToastContainer />
      <h1 className="text-2xl font-semibold">
        {isEditing ? "Edit" : "Record"} Payment
      </h1>
      <Card className="p-6 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {isEditing && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" >
              <div className="space-y-2 justify-self-start">
                <Label className="text-lg">{refNo}</Label>
              </div>

              <div className="space-y-2 justify-self-end ">
                <Label className="text-lg">{getStatusText(statusid)}</Label>
              </div>

            </div>

          )}
          {isEditing && (<hr />)}
          {/* Header fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Payment Received Number</Label>
              <Input readOnly value={refNo} disabled />
            </div>
            <div className="space-y-2">
              <Label className="block text-sm font-medium">Payment Date</Label>
              <div className="mt-1 w-full">
                <DatePicker
                  selected={paymentDate}
                  onChange={(d: Date | null) => setPaymentDate(d)}
                  dateFormat="dd MMM yyyy"
                  wrapperClassName="w-full"        // make the datepicker’s container full‐width
                  customInput={<Input className="w-full" />}  // make the input itself fill its container
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Select Customer</Label>
              <SearchableSelectCustomer
                value={customer}
                onValueChange={setCustomer}
                customers={customers}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Mode</Label>
              <Select
                value={paymentmode}
                onValueChange={setPaymentmode}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  {paymentmodes.map(pm => (
                    <SelectItem key={pm.paymentModeId} value={pm.paymentModeId.toString()}>
                      {pm.paymentModeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.paymentmode && <p className="validation-error">{validationErrors.paymentmode}</p>}
            </div>
            <div className="space-y-2">
              <Label>Reference Number</Label>
              <Input
                value={referenceNumber}
                onChange={e => setReferenceNumber(e.target.value)}
                required
              />
              {validationErrors.referenceNumber && <p className="validation-error">{validationErrors.referenceNumber}</p>}
            </div>
            <div className="space-y-2">
              <Label>Received By</Label>
              <Select
                value={receivedBy}
                onValueChange={setReceivedBy}
                required
                disabled
              >
                <SelectTrigger disabled>
                  <SelectValue placeholder="Select User" />
                </SelectTrigger>
                <SelectContent >
                  {users.map(pm => (
                    <SelectItem key={pm.usersId} value={pm.usersId.toString()}>
                      {pm.userName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea placeholder="Enter payment notes" rows={4} />
          </div>

          {/* Invoices */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Invoices</h3>
              <Button type="button" onClick={addLineItem} className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> Add Invoice
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice No.</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Net Amount</TableHead>
                  <TableHead>Outstanding Amount</TableHead>
                  <TableHead>Paid Amount</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4">
                      No invoices added yet
                    </TableCell>
                  </TableRow>
                ) : (
                  lineItems.map((item, idx) => {
                    const options = salesInvoice[idx] || [];
                    return (
                      <TableRow key={idx}>
                        {/* Invoice No. */}
                        <TableCell>
                          {options.length > 0 ? (
                            <Select
                              value={item.salesInvoiceID.toString()}
                              onValueChange={val => {
                                const idNum = parseInt(val, 10);
                                const sel = options.find(o => o.salesInvoiceID === idNum);
                                if (!sel) return;
                                setLineItems(prev =>
                                  prev.map((li, i) =>
                                    i === idx
                                      ? {
                                        ...li,
                                        salesInvoiceID: sel.salesInvoiceID,
                                        paymentStatusId: sel.paymentStatusId,
                                        refNo: sel.refNo,
                                        invoiceDate: sel.invoiceDate,
                                        netAmount: sel.netAmount,
                                        outstandingAmount: sel.outstandingAmount,
                                      }
                                      : li
                                  )
                                );
                              }}
                            >
                              <SelectTrigger className="w-48"> {/* trigger controls width */}
                                <SelectValue>
                                  {item.refNo || <span className="text-gray-400">Select invoice</span>}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent className="w-48"> {/* content matches trigger width */}
                                {options.map(o => (
                                  <SelectItem key={o.salesInvoiceID} value={o.salesInvoiceID.toString()}>
                                    {o.refNo}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-gray-500">No invoices found</span>
                          )}
                        </TableCell>

                        {/* Date */}
                        <TableCell>
                          <Input value={formatDate(item.invoiceDate)} disabled />
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <Input value={getPaymentStatusText(item.paymentStatusId)} disabled />
                        </TableCell>

                        {/* Net Amount */}
                        <TableCell>
                          <Input value={item.netAmount} disabled />
                        </TableCell>

                        {/* Outstanding */}
                        <TableCell>
                          <Input value={item.outstandingAmount} disabled />
                        </TableCell>

                        {/* Paid Amount */}
                        <TableCell>
                          <Input
                            type="number"
                            value={item.paidAmount}
                            onChange={e => {
                              const paid = e.target.value;
                              setLineItems(prev =>
                                prev.map((li, i) => (i === idx ? { ...li, paidAmount: paid } : li))
                              );
                            }}
                          />
                          {validationErrors[`paid_${idx}`] && (
                            <p className="validation-error">{validationErrors[`paid_${idx}`]}</p>
                          )}
                        </TableCell>

                        {/* Action */}
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => setLineItems(prev => prev.filter((_, i) => i !== idx))}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
              {validationErrors.no_invoice && (
                <p className="validation-error mt-2 text-red-600">
                  {validationErrors.no_invoice}
                </p>
              )}
            </Table>


            <div className="flex justify-end mt-2">
              <div className="border border-dashed p-2 rounded">
                <span className="font-medium">Total Paid Amount (PKR): {totalpayamount.toFixed(2)}</span>
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


          <div className="flex items-center justify-between mt-4">
            {/* Left group: PENDING, APPROVE, VOID */}

            <div className="flex gap-4">
              {/* { ( */}
              {isEditing && statusid !== 2 && statusid !== 3 && (
                <Button
                  onClick={handlePending}
                  disabled={isSubmitting}
                >
                  <Clock9 /> PENDING
                </Button>
              )}
              {isEditing && statusid !== 3 && (
                <Button
                  onClick={handleApprove}
                  style={{ display: hasPermission(26, "approve") ? "flex" : "none" }}
                  disabled={isSubmitting}
                >
                  <CircleCheck /> APPROVE
                </Button>
              )}
              {/* )} */}
            </div>

            {/* Right group: Cancel, Update */}
            <div className="flex justify-end gap-4">
              <Button variant="outline" type="button" onClick={() => navigate(-1)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isEditing ? "Update" : "Create"}
              </Button>
            </div>
          </div>


          {/* Buttons */}

        </form>
      </Card>
    </div>
  );
};

export default PaymentReceived;
