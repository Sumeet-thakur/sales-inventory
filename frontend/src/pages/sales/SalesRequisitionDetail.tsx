import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useNavigate, useParams } from "react-router-dom";
import { variables } from "@/Variables";
import { useSelector } from "react-redux";
import { RootState } from "@/Storage/Redux/store";
import useFormatDate from '@/hooks/useFormatDate';
import { usePermissions } from "@/hooks/usePermissions";
import { Check, CircleX, Download, Printer } from "lucide-react";

// ------------------------------------------------------------------------
// Interfaces matching the ASP.NET ViewModels.
interface SalesRequisitionDetailVM {
    SalesRequisitionID: number;
    RefNo: string;
    Date: string;
    CustomerID: number;
    SellerID: number;
    StatusId: number;
    CustomerChildID: number;
    Description: string;
    TotalQuantity: number;
    SalesRequisitionChildVMs: SalesRequisitionChildVM[];
    salesRequisitionChildFileVMs: SalesRequisitionChildFileVM[];
    RemovedSalesRequisitionChildIds?: number[];
    RemovedSalesRequisitionFilesIds?: number[];
}

interface SalesRequisitionChildVM {
    SalesRequisitionChildID: number;
    SalesRequisitionID: number;
    ItemID: number;
    ItemName: number;
    UnitName: number;
    Quantity: number;
    UnitId?: number;
    ConversionFactor?: number;
    IsSecondaryUnit?: boolean;
    ChildTotalQuantity?: number;
    UnitComposite?: number;
}

interface SalesRequisitionChildFileVM {
    SalesRequisitionChildFileID: number;
    SalesRequisitionID: number;
    FilePath: string;
    Referenceno: string;
}

// ------------------------------------------------------------------------
// SalesRequisitionDetail component.
const SalesRequisitionDetail = () => {
    const { token, roleid } = useSelector((state: RootState) => state.userAuthStore);
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { hasPermission, loading: permissionsLoading } = usePermissions(roleid);
    const [existingFiles, setExistingFiles] = useState<{ id: string; fileName: string; url: string; reference: string }[]>([]);

    const [salesRequisition, setSalesRequisition] = useState<SalesRequisitionDetailVM | null>(null);
    const [loading, setLoading] = useState(true);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const formatDate = useFormatDate();




    // Helper function to convert numeric StatusId to a descriptive text.
    const getStatusText = (statusId: number): string => {
        switch (statusId) {
            case 1:
                return "DRAFT";
            case 2:
                return "PENDING";
            case 3:
                return "APPROVED";
            case 4:
                return "VOID";
            default:
                return "UNKNOW";
        }
    };

    // Fetch the Sales Requisition details from the server.
    useEffect(() => {
        if (id) {
            fetch(`${variables.API_URL}SalesRequisition/detail/${id}`, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            })
                .then(async (response) => {
                    if (!response.ok) {
                        toast.error("Error fetching sales requisition details.");
                        setLoading(false);
                        return;
                    }
                    const data = await response.json();
                    console.log("Fetched Sales Requisition Detail:", data);
                    // Map the fetched data to our view model.
                    const vm: SalesRequisitionDetailVM = {
                        SalesRequisitionID: data.salesRequisitionID,
                        RefNo: data.refNo,
                        Date: data.date ? data.date.split("T")[0] : "",
                        CustomerID: data.customerID,
                        SellerID: data.sellerID,
                        StatusId: data.statusId,
                        CustomerChildID: data.customerChildID,
                        Description: data.description,
                        TotalQuantity: data.totalQuantity,
                        SalesRequisitionChildVMs: data.salesRequisitionChildVMs
                            ? data.salesRequisitionChildVMs.map((child: any) => ({
                                SalesRequisitionChildID: child.salesRequisitionChildID,
                                SalesRequisitionID: child.salesRequisitionID,
                                ItemID: child.itemID,
                                ItemName: child.itemName,
                                UnitName: child.unitName,
                                Quantity: child.quantity,
                                UnitId: child.unitId,
                                ConversionFactor: child.conversionFactor,
                                IsSecondaryUnit: child.isSecondaryUnit,
                                ChildTotalQuantity: child.childTotalQuantity,
                                UnitComposite: child.isSecondaryUnit ? 2 : 1,
                            }))
                            : [],
                        salesRequisitionChildFileVMs: data.salesRequisitionChildFileVMs
                            ? data.salesRequisitionChildFileVMs.map((file: any) => ({
                                SalesRequisitionChildFileID: file.salesRequisitionChildFileID,
                                SalesRequisitionID: file.salesRequisitionID,
                                FilePath: file.filePath,
                                Referenceno: file.referenceno,
                            }))
                            : [],
                        RemovedSalesRequisitionChildIds: [],
                       
                    };
                     const baseUrl = variables.API_URL.replace(/\/api\/?$/, "");
                const files = data.multipleAttachments.map(att => ({
                  id: att.multipleAttachmentfileId.toString(),
                  fileName: att.fileName,
                  url: `${baseUrl.replace(/\/$/, "")}/${att.filePath.replace(/^\//, "")}`,
                  reference: att.referenceno || "",
                }));
                setExistingFiles(files)
                    // Set the image preview if an image path is returned.
                   
                    setSalesRequisition(vm);
                    setLoading(false);
                })
                .catch((error) => {
                    console.error("Error fetching sales requisition details:", error);
                    toast.error("Error fetching sales requisition details.");
                    setLoading(false);
                });
        } else {
            setLoading(false);
        }
    }, [id, token, navigate]);

    const handleRevise = (salesRequisitionID: number) => {
        navigate(`/sales/requisition/${salesRequisitionID}`);
    };
    const handlePrint = (purchaseRequisitionID: number) => {
  const url = `${window.location.origin}/sales/requisition/report/${purchaseRequisitionID}`;
  window.open(url, '_blank');
};

    if (loading) return <p>Loading...</p>;
    if (!salesRequisition) return <p>No Sales Requisition details available.</p>;

    return (
        <div className="space-y-6">
            <ToastContainer />
            <div>
                <h1 className="text-2xl font-semibold">Sales Requisition Detail</h1>
                <p className="text-gray-600 mt-1">View details of the sales requisition.</p>
            </div>
            <Card className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="text-lg" htmlFor="">{salesRequisition.RefNo}</Label>
                        <div className="flex items-center gap-2">

                        </div>
                    </div>
                    <div className="space-y-2 text-right">
                        <Label className="text-lg" htmlFor="">  {getStatusText(salesRequisition.StatusId)}</Label>

                    </div>
                </div>
                <hr />
                {/* Parent Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <Label className="block text-sm font-medium text-gray-700">Requisition Number:</Label>
                        <p className="text-md text-gray-900">{salesRequisition.RefNo}</p>
                    </div>
                    <div>
                        <Label className="block text-sm font-medium text-gray-700">Date:</Label>
                        <p className="text-md text-gray-900">{formatDate(salesRequisition.Date)}</p>
                    </div>
                    <div>
                        <Label className="block text-sm font-medium text-gray-700">Total Quantity:</Label>
                        <p className="text-md text-gray-900">{salesRequisition.TotalQuantity}</p>
                    </div>
                    <div>
                    <Label className="block text-sm font-medium text-gray-700">Description:</Label>
                    <p className="text-md text-gray-900">{salesRequisition.Description}</p>
                </div>
                    
                </div>
                

                {/* Child Items Table */}
                <div>
                    <h2 className="text-xl font-semibold mb-2"> Items</h2>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead> S No.</TableHead>
                                <TableHead>Item Name</TableHead>
                                <TableHead>Unit Name</TableHead>
                                <TableHead>Quantity</TableHead>
                               
                                <TableHead>Conversion Factor</TableHead>
                                <TableHead> Total Quantity</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {salesRequisition.SalesRequisitionChildVMs.map((child,index) => (
                                <TableRow key={child.SalesRequisitionChildID}>
                                    <TableCell>{index+1}</TableCell>
                                    <TableCell>{child.ItemName}</TableCell>
                                    <TableCell>{child.UnitName}</TableCell>
                                    <TableCell>{child.Quantity}</TableCell>
                                    
                                    <TableCell>{child.ConversionFactor}</TableCell>
                                    <TableCell>{child.ChildTotalQuantity}</TableCell>
                                </TableRow>
                            ))}
                            {salesRequisition.SalesRequisitionChildVMs.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-4">
                                        No child items.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
   <Label>Attachments</Label>
                {/* Attachments Table */}
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
                <hr />
                <div className="flex items-center justify-between mt-4">
                    <div className="flex gap-4">
                        <Button onClick={() => handleRevise(salesRequisition.SalesRequisitionID)}
                            style={{
                                display: (salesRequisition.StatusId === 3 && hasPermission(23, "revise")) ? "flex" : "none",

                            }}>
                            <Check />
                            REVISE
                        </Button>
                        <Button
                            onClick={() => handleRevise(salesRequisition.SalesRequisitionID)}
                            style={{
                                display: (salesRequisition.StatusId === 3 && hasPermission(23, "void")) ? "flex" : "none",

                            }}
                        >
                            <CircleX />
                            VOID
                        </Button>
                        <Button
              onClick={() => handlePrint(salesRequisition.SalesRequisitionID)}
              style={{
                display: (salesRequisition.StatusId === 3 && hasPermission(23, "print")) ? "flex" : "none",

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

export default SalesRequisitionDetail;
