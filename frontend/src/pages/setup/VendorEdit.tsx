import { useEffect, useState } from "react";
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
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "@/Storage/Redux/store";
import { variables } from "@/Variables";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import cityModel from "@/Interfaces/cityModel";
import ExpandableJsonDisplay from "@/hooks/ExpandableJsonDisplay";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import useActivityLog from "@/hooks/useActivityLog";
import useFormatDateTime from "@/hooks/useFormatDateTime";

// Adjusted interfaces to match the server JSON
interface ContactPersonEdit {
  contactPersonID?: number;
  contactPersonName: string;
  designation: string;
  address: string;
  phoneNo: string;
  mobileNo: string;
  email: string;
}

interface VendorBranchEdit {
  vendorChildID?: number;
  cityId: string; 
  branchName: string;
  contacts: ContactPersonEdit[];
  removedContactPersonVendorIds?: number[];
}

interface VendorEditData {
  vendorID?: number;
  vendorName: string;
  cityId: string; // form input; will convert to number when needed
  contactNo: string;
  email: string;
  address: string;
  ntnNo: string;
  openingBalance: string;
  creditLimit: string;
  creditDays: string;
  branches: VendorBranchEdit[];
  removedCustomerChildIds?: number[];
}

const VendorEdit = () => {
  const { id } = useParams<{ id: string }>();
  const { token } = useSelector((state: RootState) => state.userAuthStore);
  const navigate = useNavigate();
  const [cities, setCities] = useState<cityModel[]>([]);
  const [loading, setLoading] = useState(true);
   const [isEditing, setIsEditing] = useState(false);
   const formatDateTime = useFormatDateTime();
const { activityLogs, showActivityLog, toggleActivityLog } = useActivityLog(token);
const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  // Initial state including removed IDs as empty arrays.
  const [vendorData, setVendorData] = useState<VendorEditData>({
    vendorID: undefined,
    vendorName: "",
    cityId: "",
    contactNo: "",
    email: "",
    address: "",
    ntnNo: "",
    openingBalance: "",
    creditLimit: "",
    creditDays: "",
    branches: [],
    removedCustomerChildIds: [],
  });

  // Fetch cities.
  const fetchCities = async () => {
    try {
      const response = await fetch(variables.API_URL + "Vendor/get-cities", {
        headers: { "Content-Type": "application/json","Authorization": `Bearer ${token}` }
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

  // Fetch vendor details and map to state.
  const fetchVendor = async () => {
    try {
      const response = await fetch(
        variables.API_URL + "Vendor/GetVendorById/" + id,
        { headers: { "Content-Type": "application/json","Authorization": `Bearer ${token}` } }
      );
      if (response.ok) {
        const vendor = await response.json();
        setVendorData({
          vendorID: vendor.vendorID,
          vendorName: vendor.vendorName || "",
          cityId: vendor.cityID ? vendor.cityID.toString() : "",
          contactNo: vendor.contactNo || "",
          email: vendor.email || "",
          address: vendor.address || "",
          ntnNo: vendor.ntnNo || "",
          openingBalance:
            vendor.openingBalance !== null
              ? vendor.openingBalance.toString()
              : "",
          creditLimit:
            vendor.creditLimit !== null
              ? vendor.creditLimit.toString()
              : "",
          creditDays: vendor.creditDays || "",
          branches: vendor.vendorChildVMs?.map((branch: any) => ({
            vendorChildID: branch.vendorChildID,
            branchName: branch.branchName || "",
            cityId: branch.cityId || "",
            removedContactPersonVendorIds: branch.removedContactPersonVendorIds || [],
            contacts: branch.contactPersonVendorVMs?.map((cp: any) => ({
              contactPersonID: cp.contactPersonID,
              contactPersonName: cp.contactPersonName || "",
              designation: cp.designation || "",
              address: cp.address || "",
              phoneNo: cp.phoneNo || "",
              mobileNo: cp.mobileNo || "",
              email: cp.email || "",
            })) || [],
          })) || [],
          removedCustomerChildIds: vendor.removedCustomerChildIds || [],
        });
      } else {
        toast.error("Vendor not found");
        navigate("/setup/vendor");
      }
    } catch (error: any) {
      console.error("Error fetching vendor:", error);
      toast.error("Error fetching vendor");
    } finally {
      setIsEditing(true);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCities();
    if (token) {
      fetchVendor();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Update vendor main fields.
  const handleVendorChange = (field: keyof VendorEditData, value: string) => {
    setVendorData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Branch handling.
  const handleAddBranch = () => {
    setVendorData((prev) => ({
      ...prev,
      branches: [
        ...prev.branches,
        {
          branchName: "",
          cityId:"",
          contacts: [],
          removedContactPersonVendorIds: [],
        },
      ],
    }));
  };
  const handleBranchCityChange = (branchIndex: number, value: string) => {
    setVendorData((prev) => ({
      ...prev,
      branches: prev.branches.map((branch, i) =>
        i === branchIndex ? { ...branch, cityId: value } : branch
      ),
    }));
  };

 const handleRemoveBranch = (index: number) => {
  setVendorData((prev) => {
    const branchToRemove = prev.branches[index];
    const updatedBranches = prev.branches.filter((_, i) => i !== index);

    const updatedRemoved = [...(prev.removedCustomerChildIds || [])];
    if (branchToRemove.vendorChildID) {
      updatedRemoved.push(branchToRemove.vendorChildID);
    }

    return {
      ...prev,
      branches: updatedBranches,
      removedCustomerChildIds: updatedRemoved
    };
  });
};

  const handleBranchChange = (index: number, value: string) => {
    setVendorData((prev) => ({
      ...prev,
      branches: prev.branches.map((branch, i) =>
        i === index ? { ...branch, branchName: value } : branch
      ),
    }));
  };

  // Contact handling.
  const handleAddContact = (branchIndex: number) => {
    setVendorData((prev) => ({
      ...prev,
      branches: prev.branches.map((branch, i) =>
        i === branchIndex
          ? {
              ...branch,
              contacts: [
                ...branch.contacts,
                {
                  contactPersonName: "",
                  designation: "",
                  address: "",
                  phoneNo: "",
                  mobileNo: "",
                  email: "",
                },
              ],
            }
          : branch
      ),
    }));
  };

 const handleRemoveContact = (branchIndex: number, contactIndex: number) => {
  setVendorData((prev) => {
    const updatedBranches = [...prev.branches];
    const branch = updatedBranches[branchIndex];
    const contactToRemove = branch.contacts[contactIndex];

    // If it's an existing contact, add its ID to the removal list
    if (contactToRemove.contactPersonID) {
      branch.removedContactPersonVendorIds = [
        ...(branch.removedContactPersonVendorIds || []),
        contactToRemove.contactPersonID
      ];
    }

    // Remove contact from UI
    branch.contacts = branch.contacts.filter((_, j) => j !== contactIndex);
    updatedBranches[branchIndex] = branch;

    return {
      ...prev,
      branches: updatedBranches
    };
  });
};

  const handleContactChange = (
    branchIndex: number,
    contactIndex: number,
    field: keyof ContactPersonEdit,
    value: string
  ) => {
    setVendorData((prev) => ({
      ...prev,
      branches: prev.branches.map((branch, i) =>
        i === branchIndex
          ? {
              ...branch,
              contacts: branch.contacts.map((contact, j) =>
                j === contactIndex ? { ...contact, [field]: value } : contact
              ),
            }
          : branch
      ),
    }));
  };
  const validateForm = () => {
    let errors: { [key: string]: string } = {};

    if (!vendorData.vendorName.trim()) {
      errors.vendorName = "Vendor Name is required.";
    }
      if (vendorData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(vendorData.email)) {
        errors.email = "Invalid email format.";
      }
    }

    // Email format validation for each contact in branchContacts
     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  vendorData.branches.forEach((branch, branchIndex) => {
    branch.contacts.forEach((contact, contactIndex) => {
      if (contact.email.trim() && !emailRegex.test(contact.email)) {
        const key = `branch-${branchIndex}-contact-${contactIndex}-email`;
        errors[key] = `Invalid email format in contact ${contactIndex + 1} of branch ${branchIndex + 1}.`;
      }
    });
  });
    setValidationErrors(errors);

    return Object.keys(errors).length === 0; // Returns true if no errors
  };


  // Modified handleSubmit to send JSON matching the server-side structure.
  const handleSubmit = async () => {
    if (!validateForm()) return;
    // Build payload to exactly match the server JSON structure.
    const vendorPayload = {
      vendorID: parseInt(id), // convert route param to number
      vendorName: vendorData.vendorName,
      cityID: vendorData.cityId ? parseInt(vendorData.cityId) : 0,
      contactNo: vendorData.contactNo,
      email: vendorData.email,
      address: vendorData.address,
      ntnNo: vendorData.ntnNo,
      openingBalance: vendorData.openingBalance ? parseFloat(vendorData.openingBalance) : 0,
      creditLimit: vendorData.creditLimit ? parseFloat(vendorData.creditLimit) : 0,
      creditDays: vendorData.creditDays,
      isActive: 1,      // default active
      isDeleted: 0,     // default not deleted
      // createdBy, createdOn, modifiedBy, modifiedOn are handled on the server.
      vendorChildVMs: vendorData.branches.map((branch) => ({
        vendorChildID: branch.vendorChildID ? branch.vendorChildID : 0, // 0 indicates new branch
        vendorID: parseInt(id), // ensure the vendor id is set
        branchName: branch.branchName,
        cityId: branch.cityId,
        removedContactPersonVendorIds: branch.removedContactPersonVendorIds || [],
        contactPersonVendorVMs: branch.contacts.map((contact) => ({
          contactPersonID: contact.contactPersonID ? contact.contactPersonID : 0, // 0 indicates new contact
          vendorID: parseInt(id),
          vendorChildID: branch.vendorChildID ? branch.vendorChildID : 0,
          contactPersonName: contact.contactPersonName,
          designation: contact.designation,
          address: contact.address,
          phoneNo: contact.phoneNo,
          mobileNo: contact.mobileNo,
          email: contact.email,
        })),
      })),
      removedCustomerChildIds: vendorData.removedCustomerChildIds || [],
    };
  
    console.log("Submitting updated vendor:", vendorPayload);
  
    try {
      const response = await fetch(
        variables.API_URL + "Vendor/UpdateVendor/" + id,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(vendorPayload),
        }
      );
  
      if (response.ok) {
        const data = await response.json();
        console.log("Vendor updated successfully", data);
        toast.success("Vendor updated successfully!", {
          position: "bottom-right",
        });
        setTimeout(() => {
          navigate("/setup/vendor");
        }, 2000);
      } else {
        console.error("Error updating vendor:", response.statusText);
        toast.error("Error updating vendor!", {
          position: "bottom-right",
        });
      }
    } catch (error) {
      console.error("Error updating vendor:", error);
      toast.error("Error updating vendor!", {
        position: "bottom-right",
      });
    }
  };
  const handleActivityLogToggle = async () => {
    if (id) {
      await toggleActivityLog(id, "Vendor/activity_log/vendor");
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Vendor Management</h1>
          <p className="text-gray-600 mt-1">
            Edit vendor, its branches, and contacts
          </p>
        </div>
      </div>

      <Card>
        <div className="p-6 space-y-6">
          {/* Vendor Main Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vendorName">Vendor Name</Label>
              <Input
                id="vendorName"
                value={vendorData.vendorName}
                onChange={(e) =>
                  handleVendorChange("vendorName", e.target.value)
                }
                placeholder="Enter vendor name"
              />
               {validationErrors.vendorName && (
                <div className="validation-error">{validationErrors.vendorName}</div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Select
                value={vendorData.cityId}
                onValueChange={(value) =>
                  handleVendorChange("cityId", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select City" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem
                      key={city.cityId}
                      value={city.cityId.toString()}
                    >
                      {city.cityName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactNo">Contact No</Label>
              <Input
                id="contactNo"
                value={vendorData.contactNo}
                onChange={(e) =>
                  handleVendorChange("contactNo", e.target.value)
                }
                placeholder="Enter contact number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={vendorData.email}
                onChange={(e) =>
                  handleVendorChange("email", e.target.value)
                }
                placeholder="Enter email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ntnNo">NTN Number</Label>
              <Input
                id="ntnNo"
                value={vendorData.ntnNo}
                onChange={(e) =>
                  handleVendorChange("ntnNo", e.target.value)
                }
                placeholder="Enter NTN number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="openingBalance">Opening Balance</Label>
              <Input
                id="openingBalance"
                type="number"
                value={vendorData.openingBalance}
                onChange={(e) =>
                  handleVendorChange("openingBalance", e.target.value)
                }
                placeholder="Enter opening balance"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="creditLimit">Credit Limit</Label>
              <Input
                id="creditLimit"
                type="number"
                value={vendorData.creditLimit}
                onChange={(e) =>
                  handleVendorChange("creditLimit", e.target.value)
                }
                placeholder="Enter credit limit"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="creditDays">Credit Days</Label>
              <Input
                id="creditDays"
                type="text"
                value={vendorData.creditDays}
                onChange={(e) =>
                  handleVendorChange("creditDays", e.target.value)
                }
                placeholder="Enter credit days"
              />
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={vendorData.address}
                onChange={(e) =>
                  handleVendorChange("address", e.target.value)
                }
                placeholder="Enter address"
              />
            </div>
          </div>

          {/* Branches & Contacts */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Branches</h3>
              <Button onClick={handleAddBranch} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" /> Add Branch
              </Button>
            </div>

            {vendorData.branches.map((branch, branchIndex) => (
              <Card key={branchIndex} className="p-4 space-y-4">
                <div className="border rounded-lg overflow-hidden">
                  <div className="grid grid-cols-3 gap-4 p-4 bg-gray-100 font-medium sticky top-0 z-10">
                    <div>Branch Name</div>
                    <div>Branch City</div>
                    <div>Action</div>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <div className="grid grid-cols-3 gap-4 p-4 border-b items-center">
                      <div><Input
                      value={branch.branchName}
                      onChange={(e) =>
                        handleBranchChange(branchIndex, e.target.value)
                      }
                      placeholder="Enter branch name"
                    /></div>
                      <div>   <Select
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
                      <div> <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveBranch(branchIndex)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button></div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h4 className="font-medium">Contact Persons</h4>
        <Button onClick={() => handleAddContact(branchIndex)} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" /> Add Contact
        </Button>
      </div>

      {/* Table Structure */}
      <div className="border rounded-lg overflow-hidden">
        {/* Table Header */}
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
          {branch.contacts.map((contact, contactIndex) => (
            <div
              key={contactIndex}
              className="grid grid-cols-6 gap-4 p-4 border-b items-center"
            >
              <div>
                <Input
                  value={contact.contactPersonName}
                  onChange={(e) =>
                    handleContactChange(branchIndex, contactIndex, 'contactPersonName', e.target.value)
                  }
                  placeholder="Enter contact person name"
                />
              </div>
              <div>
                <Input
                  value={contact.designation}
                  onChange={(e) =>
                    handleContactChange(branchIndex, contactIndex, 'designation', e.target.value)
                  }
                  placeholder="Enter designation"
                />
              </div>
              <div>
                <Input
                  value={contact.phoneNo}
                  onChange={(e) =>
                    handleContactChange(branchIndex, contactIndex, 'phoneNo', e.target.value)
                  }
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <Input
                  value={contact.mobileNo}
                  onChange={(e) =>
                    handleContactChange(branchIndex, contactIndex, 'mobileNo', e.target.value)
                  }
                  placeholder="Enter mobile number"
                />
              </div>
              <div>
                <Input
                  value={contact.email}
                  onChange={(e) =>
                    handleContactChange(branchIndex, contactIndex, 'email', e.target.value)
                  }
                  placeholder="Enter email"
                />
                {
                                validationErrors[`branch-${branchIndex}-contact-${contactIndex}-email`] && (
                                  <div className="validation-error text-red-500 text-sm mt-1">
                                    {validationErrors[`branch-${branchIndex}-contact-${contactIndex}-email`]}
                                  </div>
                                )
                              }
              </div>
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveContact(branchIndex, contactIndex)}
                >
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

export default VendorEdit;
