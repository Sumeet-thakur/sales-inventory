import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import { Plus, Trash2 } from "lucide-react";
import { variables } from "@/Variables";
import customerCategoryModel from "@/Interfaces/customerCategoryModel";
import cityModel from "@/Interfaces/cityModel";
import { RootState } from "@/Storage/Redux/store";
import { useSelector } from "react-redux";
import { ToastContainer, toast } from "react-toastify";
import ExpandableJsonDisplay from "@/hooks/ExpandableJsonDisplay";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import "react-toastify/dist/ReactToastify.css";
import useActivityLog from "@/hooks/useActivityLog";
import useFormatDateTime from "@/hooks/useFormatDateTime";

// Extended interfaces to hold IDs for update mode.
interface CustomerBranch {
  customerChildId?: number;
  branchName: string;
  cityId: string; // Mapped from API: child.CityID ? child.CityID.toString() : ""
  isActive: boolean;
  removedContactIds?: number[];
}

interface ContactPerson {
  contactPersonId?: number;
  contactPerson: string;
  designation: string;
  address: string;
  phoneNo: string;
  mobileNo: string;
  email: string;
  isActive: boolean;
}

interface CustomerData {
  customerId?: number;
  customerName: string;
  cityId: string;
  contactNo: string;
  email: string;
  address: string;
  ntnNo: string;
  openingBalance: string;
  creditLimit: string;
  creditDays: string;
  customerCategory: string;
  customerCategoryId: string;
  branches: CustomerBranch[];
  removedBranchIds?: number[];
}

const CustomerEdit = () => {
  const { token } = useSelector((state: RootState) => state.userAuthStore);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const formatDateTime = useFormatDateTime();

  // State for branch contacts (keyed by branch index)
  const [branchContacts, setBranchContacts] = useState<{ [key: number]: ContactPerson[] }>({});
  const [isEditing, setIsEditing] = useState(false);
const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  // Dropdown data
  const [customerCategories, setCustomerCategories] = useState<customerCategoryModel[]>([]);
  const [cities, setCities] = useState<cityModel[]>([]);
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedCustomerCategory, setSelectedCustomerCategory] = useState("");
    const { activityLogs, showActivityLog, toggleActivityLog } = useActivityLog(token);

  // Main customer state (for both add and update)
  const [customerData, setCustomerData] = useState<CustomerData>({
    customerName: "",
    cityId: "",
    contactNo: "",
    email: "",
    address: "",
    ntnNo: "",
    openingBalance: "",
    creditLimit: "",
    creditDays: "",
    customerCategory: "",
    customerCategoryId: "",
    branches: [],
    removedBranchIds: [],
  });

  // Fetch customer categories
  const fetchCustomerCategories = async () => {
    try {
      const response = await fetch(variables.API_URL + "Customer/get-customerCategories", {
        headers: { "Content-Type": "application/json" ,"Authorization": `Bearer ${token}`},
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setCustomerCategories(data);
        } else {
          throw new Error("Unexpected data structure for categories");
        }
      } else {
        throw new Error("Failed to fetch customer categories");
      }
    } catch (error) {
      console.error("Error fetching customer categories:", error);
    }
  };

  // Fetch cities
  const fetchCities = async () => {
    try {
      const response = await fetch(variables.API_URL + "Customer/get-cities", {
        headers: { "Content-Type": "application/json" ,"Authorization": `Bearer ${token}`},
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setCities(data);
        } else {
          throw new Error("Unexpected data structure for cities");
        }
      } else {
        throw new Error("Failed to fetch cities");
      }
    } catch (error) {
      console.error("Error fetching cities:", error);
    }
  };
  
  // Fetch customer details for editing
  useEffect(() => {
    if (id) {
      const fetchCustomer = async () => {
        try {
          const response = await fetch(`${variables.API_URL}Customer/GetCustomerById/${id}`, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
          if (!response.ok) {
            setTimeout(() => navigate("/setup/customer"), 2000);
            return;
          }
          const data = await response.json();

          // Map customer data and branches.
          setCustomerData({
            customerId: data.customerId,
            customerName: data.customerName,
            cityId: data.cityID ? data.cityID.toString() : "",
            contactNo: data.contactNo,
            email: data.email,
            address: data.address,
            ntnNo: data.ntnNo,
            openingBalance: data.openingBalance ? data.openingBalance.toString() : "",
            creditLimit: data.creditLimit ? data.creditLimit.toString() : "",
            creditDays: data.creditDays ? data.creditDays.toString() : "",
            customerCategory: data.customerCategory || "",
            customerCategoryId: data.customerCategoryId ? data.customerCategoryId.toString() : "",
            // Mapping branch.cityId from child.CityID
            branches: data.customerChildVMs
              ? data.customerChildVMs.map((child: any) => ({
                customerChildId: child.customerChildId,
                branchName: child.branchName,
                cityId: child.cityID ? child.cityID.toString() : "",
                isActive: true,
                removedContactIds: [],
              }))
              : [],
            removedBranchIds: [],
          });

          setSelectedCity(data.cityID ? data.cityID.toString() : "");
          setSelectedCustomerCategory(data.customerCategoryId ? data.customerCategoryId.toString() : "");

          // Map branch contacts (assuming branch order is preserved).
          let mappedContacts: { [key: number]: ContactPerson[] } = {};
          if (data.customerChildVMs && Array.isArray(data.customerChildVMs)) {
            data.customerChildVMs.forEach((child: any, index: number) => {
              if (child.contactPersonCustomerVMs && Array.isArray(child.contactPersonCustomerVMs)) {
                mappedContacts[index] = child.contactPersonCustomerVMs.map((contact: any) => ({
                  contactPersonId: contact.contactPersonId,
                  contactPerson: contact.contactPersonName,
                  designation: contact.designation,
                  address: contact.address,
                  phoneNo: contact.phoneNo,
                  mobileNo: contact.mobileNo,
                  email: contact.email,
                  isActive: true,
                }));
              }
            });
            setBranchContacts(mappedContacts);
          }
          setLoading(false);
          setIsEditing(true);
        } catch (error) {
          console.error("Error fetching customer:", error);
          setTimeout(() => navigate("/setup/customer"), 2000);
        }
      };

      fetchCustomer();
    } else {
      setLoading(false);
    }
  }, [id, token, navigate]);

  useEffect(() => {
    fetchCustomerCategories();
    fetchCities();
  }, []);

  // Branch handling
  const handleAddBranch = () => {
    setCustomerData((prev) => ({
      ...prev,
      branches: [
        ...prev.branches,
        { branchName: "", cityId: "", isActive: true, removedContactIds: [] },
      ],
    }));
  };

  const handleRemoveBranch = (index: number) => {
    setCustomerData((prev) => {
      const branchToRemove = prev.branches[index];
      const updatedRemoved = branchToRemove.customerChildId
        ? [...(prev.removedBranchIds || []), branchToRemove.customerChildId]
        : prev.removedBranchIds || [];
      return {
        ...prev,
        removedBranchIds: updatedRemoved,
        branches: prev.branches.filter((_, i) => i !== index),
      };
    });
    setBranchContacts((prev) => {
      const updated = { ...prev };
      delete updated[index];
      return updated;
    });
  };

  const handleBranchChange = (index: number, value: string) => {
    setCustomerData((prev) => ({
      ...prev,
      branches: prev.branches.map((branch, i) =>
        i === index ? { ...branch, branchName: value } : branch
      ),
    }));
  };

  const handleBranchCityChange = (branchIndex: number, value: string) => {
    setCustomerData((prev) => ({
      ...prev,
      branches: prev.branches.map((branch, i) =>
        i === branchIndex ? { ...branch, cityId: value } : branch
      ),
    }));
  };

  // Contact handling for each branch
  const handleRemoveContact = (branchIndex: number, contactIndex: number) => {
    setBranchContacts((prev) => {
      const contactToRemove = prev[branchIndex][contactIndex];
      if (contactToRemove.contactPersonId) {
        setCustomerData((custPrev) => {
          const updatedBranches = [...custPrev.branches];
          const branch = updatedBranches[branchIndex];
          branch.removedContactIds = branch.removedContactIds
            ? [...branch.removedContactIds, contactToRemove.contactPersonId]
            : [contactToRemove.contactPersonId];
          updatedBranches[branchIndex] = branch;
          return { ...custPrev, branches: updatedBranches };
        });
      }
      return {
        ...prev,
        [branchIndex]: prev[branchIndex].filter((_, i) => i !== contactIndex),
      };
    });
  };

  const handleAddContact = (branchIndex: number) => {
    setBranchContacts((prev) => ({
      ...prev,
      [branchIndex]: [
        ...(prev[branchIndex] || []),
        {
          contactPerson: "",
          designation: "",
          address: "",
          phoneNo: "",
          mobileNo: "",
          email: "",
          isActive: true,
        },
      ],
    }));
  };

  const handleContactChange = (
    branchIndex: number,
    contactIndex: number,
    field: keyof ContactPerson,
    value: string
  ) => {
    setBranchContacts((prev) => ({
      ...prev,
      [branchIndex]: prev[branchIndex].map((contact, i) =>
        i === contactIndex ? { ...contact, [field]: value } : contact
      ),
    }));
  };

  // Customer field change handler
  const handleCustomerChange = (field: keyof CustomerData, value: string) => {
    setCustomerData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };
//validation function

const validateForm = () => {
  let errors: { [key: string]: string } = {};

  if (!customerData.customerName.trim()) {
    errors.customerName = "Vendor Name is required.";
  }
   if (customerData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customerData.email)) {
        errors.email = "Invalid email format.";
      }
    }

    // Email format validation for each contact in branchContacts
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    Object.entries(branchContacts).forEach(([branchIndexStr, contacts]) => {
      const branchIndex = parseInt(branchIndexStr, 10);
      contacts.forEach((contact, contactIndex) => {
        if (contact.email.trim() && !emailRegex.test(contact.email)) {
          const key = `branch-${branchIndex}-contact-${contactIndex}-email`;
          errors[key] = `Invalid email format in contact ${contactIndex + 1} of branch ${branchIndex + 1}.`;
        }
      });
    });
  setValidationErrors(errors);

  return Object.keys(errors).length === 0; // Returns true if no errors
};
  // Submit handler builds payload for update
  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (id && customerData.customerId) {
      const customerPayload = {
        CustomerId: customerData.customerId,
        CustomerName: customerData.customerName,
        CityID: selectedCity ? parseInt(selectedCity, 10) : null,
        ContactNo: customerData.contactNo,
        Email: customerData.email,
        Address: customerData.address,
        NTNNo: customerData.ntnNo,
        OpeningBalance: customerData.openingBalance ? parseFloat(customerData.openingBalance) : null,
        CreditLimit: customerData.creditLimit ? parseFloat(customerData.creditLimit) : null,
        CreditDays: customerData.creditDays ? parseInt(customerData.creditDays, 10) : null,
        CustomerCategory: customerData.customerCategory,
        CustomerCategoryId: selectedCustomerCategory ? parseInt(selectedCustomerCategory, 10) : null,
        RemovedCustomerChildIds: customerData.removedBranchIds,
        CustomerChildVMs: customerData.branches.map((branch, branchIndex) => ({
          CustomerChildId: branch.customerChildId || 0,
          BranchName: branch.branchName,
          CityID: branch.cityId ? parseInt(branch.cityId, 10) : null,
          RemovedContactPersonIds: branch.removedContactIds || [],
          contactPersonCustomerVMs: (branchContacts[branchIndex] || []).map((contact) => ({
            ContactPersonId: contact.contactPersonId || 0,
            ContactPersonName: contact.contactPerson,
            Designation: contact.designation,
            Address: contact.address,
            PhoneNo: contact.phoneNo,
            MobileNo: contact.mobileNo,
            Email: contact.email,
          })),
        })),
      };

      try {
        const response = await fetch(
          variables.API_URL + "Customer/UpdateCustomer/" + customerData.customerId,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(customerPayload),
          }
        );
         const data = await response.json();
        if (response.ok) {
          toast.success("Customer updated successfully!");
        setTimeout(() => {
          navigate("/setup/customer");
        }, 2000);
        }
       
        else {
               toast.error(data.message || "Failed to save Vendor.");
             }
        
      } catch (error) {
        console.error("Error updating customer:", error);
        toast.error("Error updating customer!");
        // setTimeout(() => {
        //   navigate("/setup/customer");
        // }, 2000);
      }
    } else {
      // (Optional) Handle add if no ID exists.
    }
  };
  const handleActivityLogToggle = async () => {
    if (id) {
      await toggleActivityLog(id, "Customer/activity_log/customer");
    }
  };
  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Customer Management</h1>
          <p className="text-gray-600 mt-1">
            Update customer details, branches, and contacts
          </p>
        </div>
      </div>

      <Card>
        <div className="p-6 space-y-6">
          {/* Customer Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer Name</Label>
              <Input
                id="customerName"
                value={customerData.customerName}
                onChange={(e) => handleCustomerChange("customerName", e.target.value)}
                placeholder="Enter customer name"
              />
               {validationErrors.customerName && (
                <div className="validation-error">{validationErrors.customerName}</div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Select value={selectedCity} onValueChange={(value) => setSelectedCity(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select City" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city.cityId} value={city.cityId.toString()}>
                      {city.cityName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerCategory">Customer Category</Label>
              <Select
                value={selectedCustomerCategory}
                onValueChange={(value) => setSelectedCustomerCategory(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Customer Category" />
                </SelectTrigger>
                <SelectContent>
                  {customerCategories.map((cat) => (
                    <SelectItem key={cat.customerCategoryId} value={cat.customerCategoryId.toString()}>
                      {cat.customerCategoryName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactNo">Contact No</Label>
              <Input
                id="contactNo"
                value={customerData.contactNo}
                onChange={(e) => handleCustomerChange("contactNo", e.target.value)}
                placeholder="Enter contact number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={customerData.email}
                onChange={(e) => handleCustomerChange("email", e.target.value)}
                placeholder="Enter email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ntnNo">NTN Number</Label>
              <Input
                id="ntnNo"
                value={customerData.ntnNo}
                onChange={(e) => handleCustomerChange("ntnNo", e.target.value)}
                placeholder="Enter NTN number"
              />
            </div>
            {/* <div className="space-y-2">
              <Label htmlFor="openingBalance">Opening Balance</Label>
              <Input
                id="openingBalance"
                type="number"
                value={customerData.openingBalance}
                onChange={(e) => handleCustomerChange("openingBalance", e.target.value)}
                placeholder="Enter opening balance"
              />
            </div> */}
            <div className="space-y-2">
              <Label htmlFor="creditLimit">Credit Limit</Label>
              <Input
                id="creditLimit"
                type="number"
                value={customerData.creditLimit}
                onChange={(e) => handleCustomerChange("creditLimit", e.target.value)}
                placeholder="Enter credit limit"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="creditDays">Credit Days</Label>
              <Input
                id="creditDays"
                type="number"
                value={customerData.creditDays}
                onChange={(e) => handleCustomerChange("creditDays", e.target.value)}
                placeholder="Enter credit days"
              />
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={customerData.address}
                onChange={(e) => handleCustomerChange("address", e.target.value)}
                placeholder="Enter address"
              />
            </div>
          </div>

          {/* Branches and Contacts */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Branches</h3>
              <Button onClick={handleAddBranch} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" /> Add Branch
              </Button>
            </div>

            {customerData.branches.map((branch, branchIndex) => (
              <Card key={branchIndex} className="p-4 space-y-4">
                <div className="border rounded-lg overflow-hidden">
                  <div className="grid grid-cols-3 gap-4 p-4 bg-gray-100 font-medium sticky top-0 z-10">
                    <div>Branch Name</div>
                    <div>Branch City</div>
                    <div>Action</div>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <div className="grid grid-cols-3 gap-4 p-4 border-b items-center">
                      <div> <Input
                        value={branch.branchName}
                        onChange={(e) => handleBranchChange(branchIndex, e.target.value)}
                        placeholder="Enter branch name"
                      /></div>
                      <div> <Select
                        value={branch.cityId ? branch.cityId.toString() : ""}
                        onValueChange={(value) => handleBranchCityChange(branchIndex, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select City" />
                        </SelectTrigger>
                        <SelectContent>
                          {cities.map((city) => (
                            <SelectItem key={city.cityId} value={city.cityId.toString()}>
                              {city.cityName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select></div>
                      <div> <Button variant="ghost" size="icon" onClick={() => handleRemoveBranch(branchIndex)}>
                        <Trash2 className="h-4 w-4" />
                      </Button></div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Contact Persons</h4>
                    <Button onClick={() => handleAddContact(branchIndex)} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" /> Add Contact
                    </Button>
                  </div>

                  {/* Table Structure */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="grid grid-cols-6 gap-4 p-4 bg-gray-100 font-medium sticky top-0 z-10">
                      <div>Contact Person</div>
                      <div>Designation</div>
                      <div>Phone Number</div>
                      <div>Mobile Number</div>
                      <div>Email</div>
                      <div className="text-center">Actions</div>
                    </div>

                    {/* Scrollable Contact List */}
                    <div className="max-h-96 overflow-y-auto">
                      {branchContacts[branchIndex]?.map((contact, contactIndex) => (
                        <div key={contactIndex} className="grid grid-cols-6 gap-4 p-4 border-b items-center">
                          <div>
                            <Input
                              value={contact.contactPerson}
                              onChange={(e) =>
                                handleContactChange(branchIndex, contactIndex, "contactPerson", e.target.value)
                              }
                              placeholder="Enter name"
                            />
                          </div>
                          <div>
                            <Input
                              value={contact.designation}
                              onChange={(e) =>
                                handleContactChange(branchIndex, contactIndex, "designation", e.target.value)
                              }
                              placeholder="Enter designation"
                            />
                          </div>
                          <div>
                            <Input
                              value={contact.phoneNo}
                              onChange={(e) =>
                                handleContactChange(branchIndex, contactIndex, "phoneNo", e.target.value)
                              }
                              placeholder="Enter phone"
                            />
                          </div>
                          <div>
                            <Input
                              value={contact.mobileNo}
                              onChange={(e) =>
                                handleContactChange(branchIndex, contactIndex, "mobileNo", e.target.value)
                              }
                              placeholder="Enter mobile"
                            />
                          </div>
                          <div>
                            <Input
                              value={contact.email}
                              onChange={(e) =>
                                handleContactChange(branchIndex, contactIndex, "email", e.target.value)
                              }
                              placeholder="Enter email"
                            />
                          </div>
                          <div className="flex justify-center">
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveContact(branchIndex, contactIndex)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Update</Button>
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

export default CustomerEdit;
