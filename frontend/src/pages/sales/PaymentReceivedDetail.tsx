import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { variables } from "@/Variables";
import { RootState } from "@/Storage/Redux/store";
import useFormatDate from "@/hooks/useFormatDate";
import useNumberFormatter from "@/hooks/useNumberFormatter";
import { Check, CircleX, Download } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";

// VM interfaces
interface PaymentReceivedChildVM {
  paymentReceivedChildID: number;
  salesInvoiceID: number;
  refNo: string;
  invoiceDate: string;
  paymentStatusId: number;
  netAmount: number;
  outstandingAmount: number;
  paidAmount: number;
}
interface MultipleAttachmentVM {
  multipleAttachmentfileId: number;
  fileName: string;
  filePath: string;
  referenceno: string;
}
interface PaymentReceivedVM {
  paymentReceivedID: number;
  refNo: string;
  paymentDate: string;
  customerName: string;
  paymentModeName: string;
  receivedBy: string;
  referenceNumber: string;
  statusId: number | null;
  paymentAmount: number;
  paymentReceivedChildVMs: PaymentReceivedChildVM[];
  multipleAttachments: MultipleAttachmentVM[];
}

const getPaymentStatusText = (id: number) => {
  switch (id) {
    case 1:
      return "Unpaid";
    case 2:
      return "Partial";
    case 3:
      return "Paid";
    case 4:
      return "Overpaid";
    default:
      return "";
  }
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

const PaymentReceivedDetail: React.FC = () => {
  const { token, roleid } = useSelector((state: RootState) => state.userAuthStore);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const formatDate = useFormatDate();
  const formatNumber = useNumberFormatter();  // defaults to 2 decimal places
  const { hasPermission } = usePermissions(roleid);

  const [payment, setPayment] = useState<PaymentReceivedVM | null>(null);
  const [loading, setLoading] = useState(true);
  const [existingFiles, setExistingFiles] = useState<{ id: string; fileName: string; url: string; reference: string }[]>([]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    fetch(`${variables.API_URL}PaymentsReceived/detailpaymentreceived/${id}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async res => {
        if (!res.ok) {
          const err = await res.text();
          toast.error("Failed to load payment: " + err);
          setLoading(false);
          return null;
        }
        return (await res.json()) as PaymentReceivedVM;
      })
      .then(data => {
        if (!data) return;
        setPayment(data);
        const baseUrl = variables.API_URL.replace(/\/api\/?$/, "");
        const files = data.multipleAttachments.map(att => ({
          id: att.multipleAttachmentfileId.toString(),
          fileName: att.fileName,
          url: `${baseUrl.replace(/\/$/, "")}/${att.filePath.replace(/^\//, "")}`,
          reference: att.referenceno || "",
        }));
        setExistingFiles(files);
      })
      .catch(() => toast.error("Error fetching payment details."))
      .finally(() => setLoading(false));
  }, [id, token]);

  const handleRevise = (id: number) => navigate(`/sales/payment/${id}`);
  const handleVoid = async (id: number) => {
    if (!window.confirm("Are you sure you want to void this Payments Received?")) return;
    try {
      const res = await fetch(`${variables.API_URL}PaymentsReceived/changestatus/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Payment has been voided.");
      setTimeout(() => navigate(-1), 1500);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (loading) return <p>Loading…</p>;
  if (!payment) return <p>Payment not found.</p>;

  return (
    <div className="space-y-6">
      <ToastContainer />
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Payment Received Details</h1>
      </div>
      <Card className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Label className="text-lg">{payment.refNo}</Label>
          <Label className="text-lg text-right">{getStatusText(payment.statusId ?? 0)}</Label>
        </div>
        <hr />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Ref No." value={payment.refNo} />
          <Field label="Payment Date" value={formatDate(payment.paymentDate)} />
          <Field label="Customer" value={payment.customerName} />
          <Field label="Payment Mode" value={payment.paymentModeName} />
          <Field label="Received By" value={payment.receivedBy} />
          <Field label="Reference No." value={payment.referenceNumber} />
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-2">Invoices</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice No.</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Net Amount</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead className="text-right">Paid Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payment.paymentReceivedChildVMs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                    No invoices applied
                  </TableCell>
                </TableRow>
              ) : (
                payment.paymentReceivedChildVMs.map(c => (
                  <TableRow key={c.paymentReceivedChildID}>
                    <TableCell>{c.refNo}</TableCell>
                    <TableCell>{formatDate(c.invoiceDate)}</TableCell>
                    <TableCell>{getPaymentStatusText(c.paymentStatusId)}</TableCell>
                    <TableCell className="text-right">PKR {formatNumber(c.netAmount)}</TableCell>
                    <TableCell className="text-right">PKR {formatNumber(c.outstandingAmount)}</TableCell>
                    <TableCell className="text-right">PKR {formatNumber(c.paidAmount)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-end mt-4">
          <Summary label="Total Paid Amount (PKR):" value={payment.paymentAmount} fmt={formatNumber} />
        </div>
           <Label>Attachments</Label>
        {/* {existingFiles.length > 0 && <h2 className="text-lg font-semibold mb-2">Attachments</h2>} */}
        {existingFiles.map(f => (
          <div key={f.id} className="flex items-center gap-2 mb-2">
            <span>{f.fileName}</span>
            <Button variant="ghost" size="icon" onClick={() => {
                const link = document.createElement('a');
                link.href = f.url;
                link.download = f.fileName;
                link.click();
            }}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <div className="flex items-center justify-between mt-4">
          <div className="flex gap-4">
            {payment.statusId === 3 && hasPermission(26, "revise") && (
              <Button onClick={() => handleRevise(payment.paymentReceivedID)}><Check /> REVISE</Button>
            )}
            {payment.statusId === 3 && hasPermission(26, "void") && (
              <Button onClick={() => handleVoid(payment.paymentReceivedID)}><CircleX /> VOID</Button>
            )}
          </div>
          <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
        </div>
      </Card>
    </div>
  );
};

const Field: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <Label className="block text-sm font-medium text-gray-700">{label}</Label>
    <p className="mt-1 text-gray-900">{value}</p>
  </div>
);

const Summary: React.FC<{ label: string; value: number; fmt: (n: number) => string }> = ({ label, value, fmt }) => (
  <div className="inline-block border-dashed border p-4 rounded-lg">
    <div className="flex justify-between">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium text-gray-800">PKR {fmt(value)}</span>
    </div>
  </div>
);

export default PaymentReceivedDetail;
