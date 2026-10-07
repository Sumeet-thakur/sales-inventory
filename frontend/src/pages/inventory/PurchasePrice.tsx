import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table, TableHeader, TableRow, TableHead, TableBody, TableCell
} from "@/components/ui/table";
import {
    Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useSelector } from "react-redux";
import { RootState } from "@/Storage/Redux/store";
import { variables } from "@/Variables";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import useLocalDateString from "@/hooks/useLocalDateString";
import useActivityLog from "@/hooks/useActivityLog";
import ExpandableJsonDisplay from "@/hooks/ExpandableJsonDisplay";
import useFormatDateTime from "@/hooks/useFormatDateTime";

// match your PurchasePriceListItemVM
interface ChildVM {
    purchasePriceListItemChilId?: number;
    itemId: number;
    totalQuantity: number;
    oldPurchasePrice: number;
    newPurchasePrice: number;
}

// match your PurchasePriceVM
interface PurchasePriceVM {
    purchasePriceId?: number;
    purchasePriceRefNumber: string;
    purchasePriceDate: string; // YYYY-MM-DD
    purchasePriceListItemVMs: ChildVM[];
}

// simple item dropdown model
interface ItemModel {
    itemId: number;
    itemName: string;
    purchasePrice: number;
}
interface SearchableSelectProps {
    value: string;
    onValueChange: (value: string) => void;
    items: ItemModel[];
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
const PurchasePrice: React.FC = () => {
    const { token } = useSelector((s: RootState) => s.userAuthStore);
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const editing = Boolean(id);

    // Parent fields
    const [refNumber, setRefNumber] = useState("");
    const [priceDate, setPriceDate] = useState<Date>(new Date());
    const { activityLogs, showActivityLog, toggleActivityLog } = useActivityLog(token);
    const formatForPayload = useLocalDateString();
    const formatDateTime = useFormatDateTime();

    // Children
    const [rows, setRows] = useState<ChildVM[]>([]);

    // Items for dropdown
    const [items, setItems] = useState<ItemModel[]>([]);

    // Fetch items for dropdown
    useEffect(() => {
        fetch(`${variables.API_URL}PurchasePrices/get-items`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(r => r.json())
            .then((data: ItemModel[]) => setItems(data))
            .catch(() => toast({ title: "Failed to load items", variant: "destructive" }));
    }, [token, toast]);

    // If creating, fetch next ref#
    useEffect(() => {
        if (editing) return;
        fetch(`${variables.API_URL}PurchasePrices/GetNextPurchasePricesRefNumber`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(r => r.json())
            .then(d => setRefNumber(d.priceRefNumber))
            .catch(() => toast({ title: "Failed to generate ref#", variant: "destructive" }));
    }, [editing, token, toast]);

    // If editing, load existing record and map rows
    useEffect(() => {
        if (!editing) return;
        fetch(`${variables.API_URL}PurchasePrices/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(r => {
                if (!r.ok) throw new Error("Load failed");
                return r.json();
            })
            .then((vm: PurchasePriceVM) => {
                setRefNumber(vm.purchasePriceRefNumber);
                setPriceDate(new Date(vm.purchasePriceDate));
                setRows(vm.purchasePriceListItemVMs.map(c => ({
                    purchasePriceListItemChilId: c.purchasePriceListItemChilId,
                    itemId: c.itemId,
                    totalQuantity: c.totalQuantity,
                    oldPurchasePrice: c.oldPurchasePrice,
                    newPurchasePrice: c.newPurchasePrice,
                })));
            })
            .catch(() => {
                toast({ title: "Failed to load record", variant: "destructive" });
                navigate(-1);
            });
    }, [editing, id, token, toast, navigate]);

    // Handlers for rows
    const addRow = () => {
        setRows(r => [
            ...r,
            { itemId: 0, totalQuantity: 0, oldPurchasePrice: 0, newPurchasePrice: 0 }
        ]);
    };
    const updateRow = useCallback((idx: number, field: keyof ChildVM, value: string | number) => {
        setRows(r => r.map((row, i) => i === idx ? { ...row, [field]: value } : row));
    }, []);
    const removeRow = useCallback((idx: number) => {
        setRows(r => r.filter((_, i) => i !== idx));
    }, []);

    // Submit create/update
    const handleSave = async () => {
        const payload: PurchasePriceVM = {
            purchasePriceId: editing ? Number(id) : undefined,
            purchasePriceRefNumber: refNumber,
            purchasePriceDate: formatForPayload(priceDate),
            purchasePriceListItemVMs: rows,
        };
        const url = editing ? `${variables.API_URL}PurchasePrices/${id}` : `${variables.API_URL}PurchasePrices`;
        const method = editing ? "PUT" : "POST";
        try {
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error(await res.text());
            toast({ title: editing ? "Updated successfully" : "Created successfully" });
            navigate(-1);
        } catch (err: any) {
            toast({ title: err.message || "Save failed", variant: "destructive" });
        }
    };
    const handleActivityLogToggle = async () => {
        if (id) {
            await toggleActivityLog(id, "PurchasePrices/activity_log/PurchasePrice");
        }
    };
    const fetchOldPurchasePrice = async (itemId: number): Promise<number> => {
        try {
            const res = await fetch(`${variables.API_URL}PurchasePrices/GetItemPurchasePrice/${itemId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) throw new Error("Failed to fetch price");

            const data = await res.json(); // data will be of type PurchasePriceListItemVM
            return data.oldPurchasePrice ?? 0;
        } catch (error) {
            toast({ title: "Failed to fetch old price", variant: "destructive" });
            return 0;
        }
    };
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-semibold">{editing ? "Edit Purchase Price" : "New Purchase Price"}</h1>
                    <p className="text-gray-600 mt-1">{editing ? "Update existing record" : "Create a new record"}</p>
                </div>
            </div>
            <Card>
                <div className="p-6 space-y-6">
                    {/* Parent fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Reference #</Label>
                            <Input value={refNumber} readOnly className="bg-gray-50" />
                        </div>
                        <div className="space-y-2">
                            <Label className="block text-sm font-medium">Date</Label>
                            <div className="mt-1 w-full">
                                <DatePicker
                                    selected={priceDate}
                                    onChange={(d: Date | null) => setPriceDate(d)}
                                    dateFormat="dd MMM yyyy"
                                    wrapperClassName="w-full"        // make the datepicker’s container full‐width
                                    customInput={<Input className="w-full" />}  // make the input itself fill its container
                                />
                            </div>
                        </div>
                    </div>
                    {/* Child rows */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Line Items</h3>
                            {!editing && (
                                <Button onClick={addRow} className="flex items-center gap-2">
                                    <Plus className="h-4 w-4" /> Add Item
                                </Button>
                            )}
                        </div>
                        <div className="overflow-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item</TableHead>

                                        <TableHead>Old Price</TableHead>
                                        <TableHead>New Price</TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rows.map((row, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell>
                                                <TableCell>
                                                    <SearchableSelect
                                                        value={row.itemId === 0 ? "" : row.itemId.toString()}
                                                        onValueChange={async (v) => {
                                                            const newId = Number(v);
                                                            updateRow(idx, "itemId", newId);
                                                            const oldPrice = await fetchOldPurchasePrice(newId);
                                                            updateRow(idx, "oldPurchasePrice", oldPrice);
                                                        }}
                                                        items={items}
                                                        disabled={editing}
                                                    />
                                                </TableCell>
                                            </TableCell>

                                            <TableCell>
                                                <Input type="number" value={row.oldPurchasePrice} className="w-32" disabled />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    value={row.newPurchasePrice}
                                                    onChange={e => updateRow(idx, "newPurchasePrice", Number(e.target.value))}
                                                    className="w-32"
                                                // disabled={editing}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {!editing && (
                                                    <Button variant="ghost" size="icon" onClick={() => removeRow(idx)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {rows.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-4">
                                                No items added yet
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                    {/* Actions */}
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
                        <Button onClick={handleSave}>{editing ? "Update" : "Create"}</Button>
                    </div>
                </div>
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

export default PurchasePrice;
