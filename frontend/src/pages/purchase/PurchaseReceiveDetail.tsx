import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useNavigate, useParams } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { variables } from "@/Variables";
import { useSelector } from "react-redux";
import { RootState } from "@/Storage/Redux/store";
import useFormatDate from "@/hooks/useFormatDate";
import { Check, CircleX, Download, Printer, X } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import useAuthValidation from "@/hooks/useAuthValidation";

// ------------------------------------------------------------------------
interface PurchaseReceiveChildDetailVM {
    purchaseReceiveChildID: number;
    itemID?: number;
    itemName?: string;
    unitName?: string;
    quantity?: number;
    conversionFactor?: number;
    childTotalQuantity?: number;
}
interface MultipleAttachmentVM {
  multipleAttachmentfileId: number;
  fileName: string;
  filePath: string;
  referenceno: string;
}
interface PurchaseReceiveDetailVM {
    purchaseReceiveID: number;
    refNo: string;
    date: string;
    vendorName?: string;
    description?: string;
    totalQuantity?: number;
    statusId?: number;
    purchaseReceiveChildVMs: PurchaseReceiveChildDetailVM[];
     multipleAttachments: MultipleAttachmentVM[];
}

// ------------------------------------------------------------------------
const getStatusText = (statusId?: number): string => {
    switch (statusId) {
        case 1:
            return "Draft";
        case 2:
            return "Received";
        case 3:
            return "Approved";
            case 4:
                return "Void";
        default:
            return "";
    }
};

const PurchaseReceiveDetail: React.FC = () => {
    useAuthValidation();

    const { token, roleid } = useSelector((state: RootState) => state.userAuthStore);
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const formatDate = useFormatDate();
    const { hasPermission } = usePermissions(roleid);
    const [existingFiles, setExistingFiles] = useState<{ id: string; fileName: string; url: string; reference: string }[]>([]);

    const [receive, setReceive] = useState<PurchaseReceiveDetailVM | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        const fetchDetail = async () => {
            try {
                const res = await fetch(
                    `${variables.API_URL}PurchaseReceives/detail-get-by/${id}`,
                    {
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );
                if (!res.ok) {
                    toast.error("Failed to fetch purchase receive details.");
                    setLoading(false);
                    return;
                }
                const data: PurchaseReceiveDetailVM = await res.json();
                  const baseUrl = variables.API_URL.replace(/\/api\/?$/, "");
                        const files = data.multipleAttachments.map(att => ({
                          id: att.multipleAttachmentfileId.toString(),
                          fileName: att.fileName,
                          url: `${baseUrl.replace(/\/$/, "")}/${att.filePath.replace(/^\//, "")}`,
                          reference: att.referenceno || "",
                        }));
                        setExistingFiles(files);
                setReceive(data);
            } catch (err) {
                console.error(err);
                toast.error("Error fetching details.");
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [id, token]);

    const handleComplete = () => {
        if (!receive) return;
        // navigate to edit or trigger complete
        navigate(`/purchase/receive/${receive.purchaseReceiveID}`);
    };
    const handleVoid = async (purchaseRequisitionID: number) => {
        if (!window.confirm("Are you sure you want to void this purchase order?")) {
            return;
        }

        try {
            const res = await fetch(
                `${variables.API_URL}PurchaseReceives/changestatusPurchasesReceived/${purchaseRequisitionID}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || "Failed to void order.");
            }

            toast.success("Purchase order has been voided.");
            // After voiding, go back to list (or you could re-fetch details)
            setTimeout(() => navigate(-1), 2000);
        } catch (err: any) {
            toast.error(err.message);
        }
    };
    const handlePrint = (purchaseRequisitionID: number) => {
  const url = `${window.location.origin}/purchase/receive/report/${purchaseRequisitionID}`;
  window.open(url, '_blank');
};
    if (loading) return <p>Loading...</p>;
    if (!receive) return <p>Purchase receive not found.</p>;

    return (
        <div className="space-y-6">
            <ToastContainer />

            <div>
                <h1 className="text-2xl font-semibold">Purchase Receive Detail</h1>
                <p className="text-gray-600 mt-1">View details of the purchase receive.</p>
            </div>

            <Card className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="text-lg">{receive.refNo}</Label>
                    </div>
                    <div className="space-y-2 text-right">
                        <Label className="text-lg">{getStatusText(receive.statusId)}</Label>
                    </div>
                </div>
                <hr />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <Label className="block text-sm font-medium">Receive Number:</Label>
                        <p className="text-md">{receive.refNo}</p>
                    </div>
                    <div>
                        <Label className="block text-sm font-medium">Date:</Label>
                        <p className="text-md">{formatDate(receive.date)}</p>
                    </div>
                    <div>
                        <Label className="block text-sm font-medium">Vendor Name:</Label>
                        <p className="text-md">{receive.vendorName}</p>
                    </div>

                    <div>
                        <Label className="block text-sm font-medium">Description:</Label>
                        <p className="text-md">{receive.description}</p>
                    </div>
                    
                </div>

                <hr />

                <div>
                    <h2 className="text-xl font-semibold mb-2">Items</h2>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>S No.</TableHead>
                                <TableHead>Item</TableHead>
                                <TableHead>Unit</TableHead>
                                <TableHead>Quantity</TableHead>
                                <TableHead>Conversion Factor</TableHead>
                                <TableHead>Total Qty</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {receive.purchaseReceiveChildVMs.map((c, idx) => (
                                <TableRow key={c.purchaseReceiveChildID}>
                                    <TableCell>{idx + 1}</TableCell>
                                    <TableCell>{c.itemName}</TableCell>
                                    <TableCell>{c.unitName}</TableCell>
                                    <TableCell>{c.quantity}</TableCell>
                                    <TableCell>{c.conversionFactor}</TableCell>
                                    <TableCell>{c.childTotalQuantity}</TableCell>
                                </TableRow>
                            ))}
                            {receive.purchaseReceiveChildVMs.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-4">
                                        No items found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <div className="mt-4 flex justify-end">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-lg font-semibold">
              Total: {receive.totalQuantity.toFixed(2)}
            </p>
          </div>
        </div>
                <hr />
 {existingFiles.length > 0 && <h2 className="text-lg font-semibold mb-2">Attachments</h2>}
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
                <div className="flex justify-between mt-4">

                </div>
                <div className="flex items-center justify-between mt-4">
                    <div className="flex gap-4">
                        <Button
                            onClick={handleComplete}
                            style={{
                                display:
                                    receive.statusId === 3 && hasPermission(29, "revise")
                                        ? "flex"
                                        : "none",
                            }}
                        >
                            <Check />
                            REVISE
                        </Button>
                        <Button
                            onClick={() => handleVoid(receive.purchaseReceiveID)}
                            style={{
                                display: (receive.statusId === 3 && hasPermission(29, "void")) ? "flex" : "none",

                            }}
                        >
                            <CircleX />
                            VOID
                        </Button>
                         <Button
              onClick={() => handlePrint(receive.purchaseReceiveID)}
              style={{
                display: (receive.statusId=== 3 && hasPermission(29, "print")) ? "flex" : "none",

            }}
            >
              <Printer />
              PRINT
            </Button>
                    </div>
                    <div className="flex gap-4">
                        <Button variant="outline" onClick={() => navigate(-1)}>
                            Back
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default PurchaseReceiveDetail;
