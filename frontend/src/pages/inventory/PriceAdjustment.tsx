import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useSelector } from "react-redux";
import { RootState } from "@/Storage/Redux/store";
import { priceListModel, priceListItemModel } from "@/Interfaces/priceListModel";
import { variables } from "@/Variables";
import customerCategoryModel from "@/Interfaces/customerCategoryModel";
import useActivityLog from "@/hooks/useActivityLog";
import ExpandableJsonDisplay from "@/hooks/ExpandableJsonDisplay";
import useFormatDateTime from "@/hooks/useFormatDateTime";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import useLocalDateString from "@/hooks/useLocalDateString";

interface itemModel {
  itemId: number;
  itemName: string;
}

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  items: itemModel[];
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

  // Filter items based on the search query.
  const filteredItems = items.filter((itm) =>
    itm.itemName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger disabled={disabled} className={`p-1 text-sm ${disabled ? "w-35 bg-[#b2bec3]" : "w-35"}`}>
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


const PriceAdjustment = () => {
  const { token } = useSelector((state: RootState) => state.userAuthStore);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Main price list state.
  const [priceList, setPriceList] = useState<priceListModel>({
    priceListId: 0,
    priceRefNumber: "",
    priceDate: new Date().toISOString().split("T")[0],
    ItemCount: 0,
  });
  const [isEditing, setIsEditing] = useState(false);
  // Price list items state.
  const [priceListItems, setPriceListItems] = useState<priceListItemModel[]>([]);
  // Removed item ids for existing records.
  const [removedItemIds, setRemovedItemIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const formatDateTime = useFormatDateTime();
  const formatForPayload = useLocalDateString();

  const [priceDates, setPriceDates] = useState<Date>(() => {
    // parse initial YYYY-MM-DD into a Date
    const [y, m, d] = priceList.priceDate.split("-");
    return new Date(+y, +m - 1, +d);
  });

  // sync back to your request model
  useEffect(() => {
    const localDate = formatForPayload(priceDates);
    setPriceList(prev => ({
      ...prev,
      Date: localDate,            // ← make sure this is the `Date` property
    }));
  }, [priceDates, formatForPayload]);

  const [items, setItems] = useState<itemModel[]>([]);
  // Mapping row id to the customer categories available for that item.
  const [rowCustomerCategories, setRowCustomerCategories] = useState<{
    [key: string]: customerCategoryModel[];
  }>({});

  // Use our custom hook for activity logs.
  const { activityLogs, showActivityLog, toggleActivityLog } = useActivityLog(token);

  // Fetch existing price list if editing.
  useEffect(() => {
    if (id) {
      fetch(`${variables.API_URL}PriceList/${id}`, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      })
        .then(async (response) => {
          if (!response.ok) {
            toast.error("Failed to fetch price list");
            setTimeout(() => {
              navigate("/inventory/pricelist");
            }, 2000);
          }
          const data = await response.json();
          setPriceList({
            priceListId: data.priceListId,
            priceRefNumber: data.priceRefNumber,
            priceDate: data.priceDate || new Date().toISOString().split("T")[0],
            ItemCount: 0,
          });
          if (data.items && Array.isArray(data.items)) {
            setPriceListItems(data.items);
          }
          setPriceDates(new Date(data.priceDate));
          setIsEditing(true);
          setLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching price list:", error);
          toast.error("Error fetching price list data.");
          setTimeout(() => {
            navigate("/inventory/pricelist");
          }, 2000);
        });
    } else {
      setLoading(false);
    }
  }, [id, token, navigate]);

  // In create mode, fetch the fixed PriceRefNumber from the server.
  useEffect(() => {
    if (!isEditing) {
      fetch(`${variables.API_URL}PriceList/GetNextPriceRefNumber`, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error("Failed to fetch Price Reference Number");
          }
          const data = await response.json();
          console.log("Fetched PriceRefNumber:", data.priceRefNumber);
          setPriceList((prev) => ({ ...prev, priceRefNumber: data.priceRefNumber }));
        })
        .catch((error) => {
          console.error("Error fetching Price Reference Number:", error);
          toast.error("Error fetching Price Reference Number");
        });
    }
  }, [isEditing, token]);

  const fetchItems = async () => {
    try {
      const response = await fetch(variables.API_URL + "PriceList/get-items", {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
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
        } else {
          throw new Error("Unexpected data structure");
        }
      } else {
        throw new Error("Failed to fetch items");
      }
    } catch (error) {
      console.log("Error fetching items:", error);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Fetch customer categories for a given item for a particular row.
  const fetchItemCategoriesForRow = async (rowId: number, itemId: number) => {
    try {
      const response = await fetch(
        `${variables.API_URL}PriceList/GetItemCategories/${itemId}`,
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setRowCustomerCategories((prev) => ({
          ...prev,
          [rowId]: data,
        }));
      } else {
        setRowCustomerCategories((prev) => ({ ...prev, [rowId]: [] }));
      }
    } catch (error) {
      console.error("Error fetching item categories for row:", error);
      setRowCustomerCategories((prev) => ({ ...prev, [rowId]: [] }));
    }
  };

  // Populate customer categories on edit.
  useEffect(() => {
    priceListItems.forEach((item, index) => {
      const rowId = item.priceListItemChildId !== 0 ? item.priceListItemChildId : index;
      if (item.itemId && item.itemId !== 0 && !rowCustomerCategories[rowId]) {
        fetchItemCategoriesForRow(rowId, item.itemId);
      }
    });
  }, [priceListItems]);

  // Add new item with default id values.
  const addPriceListItem = () => {
    const newItem: priceListItemModel = {
      priceListItemChildId: 0, // new item
      priceListId: priceList.priceListId,
      itemId: 0,
      customerCategoryId: 0,
      itemName: "",
      description: "",
      totalQuantity: 0,
      oldNetPrice: 0,
      newNetPrice: 0,
    };
    setPriceListItems((prevItems) => [...prevItems, newItem]);
  };

  // Update a field of a specific price list item.
  const updatePriceListItem = (
    childId: number,
    field: keyof priceListItemModel,
    value: string | number
  ) => {
    setPriceListItems((prevItems) =>
      prevItems.map((item, idx) =>
        (item.priceListItemChildId !== 0 ? item.priceListItemChildId : idx) === childId
          ? { ...item, [field]: value }
          : item
      )
    );
  };

  // Remove an item; if it exists on the server, add its id to removedItemIds.
  const removePriceListItem = (childId: number) => {
    const itemToRemove = priceListItems.find((item, idx) =>
      (item.priceListItemChildId !== 0 ? item.priceListItemChildId : idx) === childId
    );
    if (itemToRemove) {
      if (itemToRemove.priceListItemChildId > 0) {
        setRemovedItemIds((prev) => {
          if (!prev.includes(childId)) {
            return [...prev, childId];
          }
          return prev;
        });
      }
    }
    setPriceListItems((prevItems) =>
      prevItems.filter((item, idx) =>
        (item.priceListItemChildId !== 0 ? item.priceListItemChildId : idx) !== childId
      )
    );
    // Remove customer categories mapping for this row.
    setRowCustomerCategories((prev) => {
      const newMapping = { ...prev };
      delete newMapping[childId];
      return newMapping;
    });
  };

  // Handle changes for main price list fields.
  const handlePriceListChange = (field: keyof priceListModel, value: string | number) => {
    setPriceList({ ...priceList, [field]: value });
  };

  // Validate required fields and check for duplicate item/customer category combinations.
  const validateForm = () => {
    let errors: { [key: string]: string } = {};

    if (!priceList.priceRefNumber.trim()) {
      errors.priceRefNumber = "Price Adjustment RefNo is required.";
    }
    if (!priceList.priceDate.trim()) {
      errors.priceDate = "Date is required.";
    }
    if (priceListItems.length === 0) {
      errors.priceListItems = "At least one price list item is required.";
    } else {
      priceListItems.forEach((item, index) => {
        if (!item.itemId || item.itemId === 0) {
          errors[`item-${index}`] = "Item selection is required.";
        }
        // if (item.totalQuantity <= 0) {
        //   errors[`totalQuantity-${index}`] = "Total Quantity must be greater than zero.";
        // }
        if (item.oldNetPrice <= 0) {
          errors[`oldNetPrice-${index}`] = "Old Net Price must be greater than zero.";
        }
        if (item.newNetPrice <= 0) {
          errors[`newNetPrice-${index}`] = "New Net Price must be greater than zero.";
        }
      });
      const seen = new Map<string, number>();
      priceListItems.forEach((item, index) => {
        if (
          item.itemId &&
          item.customerCategoryId &&
          item.itemId !== 0 &&
          item.customerCategoryId !== 0
        ) {
          const key = `${item.itemId}_${item.customerCategoryId}`;
          if (seen.has(key)) {
            errors[`duplicate-${index}`] =
              "Duplicate combination of item and customer category selected.";
            toast.error("Duplicate combination of item and customer category selected.");
          } else {
            seen.set(key, index);
          }
        }
      });
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Call your GET endpoint to fetch the old net price.
  const fetchOldNetPrice = async (childId: number, itemId: number, customerCategoryId: number) => {
    try {
      const response = await fetch(
        `${variables.API_URL}PriceList/GetPriceListItemChild/${itemId}/${customerCategoryId}`,
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        updatePriceListItem(childId, "oldNetPrice", data.oldNetPrice);
      } else if (response.status === 404) {
        updatePriceListItem(childId, "oldNetPrice", 0);
      } else {
        console.error("Error fetching old net price. Response not OK.");
        updatePriceListItem(childId, "oldNetPrice", 0);
      }
    } catch (error) {
      console.error("Error fetching old net price:", error);
      updatePriceListItem(childId, "oldNetPrice", 0);
    }
  };

  // Handle form submission.
  const handleSubmit = async () => {
    if (!validateForm()) return;
    try {
      const url = id
        ? `${variables.API_URL}PriceList/${id}`
        : `${variables.API_URL}PriceList`;
      const payload = {
        ...priceList,
        Items: priceListItems,
        RemovedItemIds: removedItemIds,
      };

      const response = await fetch(url, {
        method: id ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success(
          id ? "Price List updated successfully!" : "Price List created successfully!",
          { position: "bottom-right" }
        );
        setTimeout(() => {
          navigate("/inventory/pricelist");
        }, 2000);
      } else {
        toast.error("Failed to save Price List.");
        setTimeout(() => {
          navigate("/inventory/pricelist");
        }, 2000);
      }
    } catch (error) {
      console.error("Error saving price list:", error);
      toast.error("Failed to save Price List.");
      setTimeout(() => {
        navigate("/inventory/pricelist");
      }, 2000);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  // Toggle the Activity Log by passing in the ID and the endpoint.
  const handleActivityLogToggle = async () => {
    if (id) {
      await toggleActivityLog(id, "PriceList/activity_log/priceadjusment");
    }
  };



  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/inventory/pricelist")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">
            {id ? "Edit Price List" : "New Price List"}
          </h1>
          <p className="text-gray-600 mt-1">
            {id ? "Edit the price list details" : "Create a new price list"}
          </p>
        </div>
      </div>
      <Card>
        <div className="p-6 space-y-6">
          {/* Price List Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="priceRefNumber">Price Adjustment RefNo</Label>
              <Input
                id="priceRefNumber"
                placeholder="Fetching Reference Number..."
                value={priceList.priceRefNumber || ""}
                onChange={(e) => handlePriceListChange("priceRefNumber", e.target.value)}
                readOnly
                disabled
                className="bg-[#b2bec3]"
              />
              {validationErrors.priceRefNumber && (
                <p className="validation-error">{validationErrors.priceRefNumber}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <div className="mt-1 w-full">
                <DatePicker
                  selected={priceDates}
                  onChange={(d: Date | null) => {
                    if (d) setPriceDates(d);
                  }}
                  dateFormat="dd MMM yyyy"
                  wrapperClassName="w-full"
                  customInput={<Input className="w-full" id="date" />}
                />
              </div>
            </div>
          </div>

          {/* Price List Items */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Items</h3>
              {!isEditing && (<Button onClick={addPriceListItem} className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> Add Item
              </Button>)}

            </div>
            <div className="max-h-100 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Customer Category</TableHead>
                    {/* <TableHead>Total Quantity</TableHead> */}
                    <TableHead>Old Net Price</TableHead>
                    <TableHead>New Net Price</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priceListItems.map((item, index) => {
                    const rowId = item.priceListItemChildId !== 0 ? item.priceListItemChildId : index;
                    const rowCategories = rowCustomerCategories[rowId] || [];
                    return (
                      <TableRow key={rowId}>
                        <TableCell>
                          <SearchableSelect
                            value={item.itemId ? item.itemId.toString() : ""}
                            onValueChange={(value) => {
                              const newItemId = Number(value);

                              // Reset dependent fields BEFORE changing item
                              updatePriceListItem(rowId, "customerCategoryId", 0);
                              updatePriceListItem(rowId, "oldNetPrice", 0);
                              updatePriceListItem(rowId, "itemId", newItemId);

                              if (newItemId !== 0) {
                                fetchItemCategoriesForRow(rowId, newItemId);
                              } else {
                                setRowCustomerCategories((prev) => ({ ...prev, [rowId]: [] }));
                              }
                            }}
                            items={items}
                            disabled={isEditing}
                          />
                          {validationErrors[`item-${index}`] && (
                            <p className="validation-error">{validationErrors[`item-${index}`]}</p>
                          )}
                        </TableCell>

                        <TableCell>
                          <Select
                            value={item.customerCategoryId ? item.customerCategoryId.toString() : ""}
                            onValueChange={(value) => {
                              const newCustomerCategoryId = Number(value);
                              updatePriceListItem(rowId, "customerCategoryId", newCustomerCategoryId);
                              updatePriceListItem(rowId, "oldNetPrice", 0); // Always reset before fetching new

                              if (item.itemId && item.itemId !== 0 && newCustomerCategoryId !== 0) {
                                fetchOldNetPrice(rowId, item.itemId, newCustomerCategoryId);
                              }
                            }}
                            disabled={!item.itemId || item.itemId === 0 || isEditing}
                          >
                            <SelectTrigger className={`p-1 text-sm ${isEditing ? "w-32 bg-[#b2bec3]" : "w-24"}`}>
                              <SelectValue placeholder="Select customer category" />
                            </SelectTrigger>
                            <SelectContent>
                              {rowCategories.map((category) => (
                                <SelectItem
                                  key={category.customerCategoryId}
                                  value={category.customerCategoryId.toString()}
                                >
                                  {category.customerCategoryName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {validationErrors[`customerCategoryId-${index}`] && (
                            <p className="validation-error">{validationErrors[`customerCategoryId-${index}`]}</p>
                          )}
                        </TableCell>

                        <TableCell>
                          <Input
                            type="number"
                            value={item.oldNetPrice > 0 ? item.oldNetPrice : ""}
                            onChange={(e) =>
                              updatePriceListItem(rowId, "oldNetPrice", Number(e.target.value))
                            }
                            className={`p-1 text-sm ${isEditing ? "w-32 bg-[#b2bec3]" : "w-24"}`}
                            disabled
                          />
                          {validationErrors[`oldNetPrice-${index}`] && (
                            <p className="validation-error">{validationErrors[`oldNetPrice-${index}`]}</p>
                          )}
                        </TableCell>

                        <TableCell>
                          <Input
                            type="number"
                            value={item.newNetPrice}
                            onChange={(e) =>
                              updatePriceListItem(rowId, "newNetPrice", Number(e.target.value))
                            }
                            className="w-32"
                          />
                          {validationErrors[`newNetPrice-${index}`] && (
                            <p className="validation-error">{validationErrors[`newNetPrice-${index}`]}</p>
                          )}
                        </TableCell>

                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removePriceListItem(rowId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>

                    );
                  })}
                  {priceListItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4">
                        No items added yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {id ? "Update" : "Create"}
            </Button>
          </div>
        </div>
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
      <ToastContainer />
    </div>
  );
};

export default PriceAdjustment;
