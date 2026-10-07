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
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "@/Storage/Redux/store";
import { variables } from "@/Variables";
import cityModel from "@/Interfaces/cityModel";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface VendorBranch {
  vendorChildId?: number;
  vendorId?: number;
  cityId: string;
  branchName: string;
  isActive: boolean;
}

interface ContactPerson {
  contactPersonVendorId?: number;
  vendorChildId?: number;
  vendorId?: number;
  contactPerson: string;
  designation: string;
  address: string;
  phoneNo: string;
  mobileNo: string;
  email: string;
  isActive: boolean;
}

interface NewVendor {
  vendorName: string;
  cityId: string;
  contactNo: string;
  email: string;
  address: string;
  ntnNo: string;
  openingBalance: string;
  creditLimit: string;
  creditDays: string;
  type: string;
  branches: VendorBranch[];
}

const Vendor = () => {
  const { token } = useSelector((state: RootState) => state.userAuthStore);
  const navigate = useNavigate();
  const [cities, setCities] = useState<cityModel[]>([]);
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedBranchCity, setSelectedBranchCity] = useState("");
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const [branchContacts, setBranchContacts] = useState<{
    [key: number]: ContactPerson[];
  }>({});

  const [newVendor, setNewVendor] = useState<NewVendor>({
    vendorName: "",
    cityId: "",
    contactNo: "",
    email: "",
    address: "",
    ntnNo: "",
    openingBalance: "",
    creditLimit: "",
    creditDays: "",
    type: "",
    branches: [],
  });

  const fetchCities = async () => {
    try {
      const response = await fetch(variables.API_URL + "Vendor/get-cities", {
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
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

  useEffect(() => {
    fetchCities();
  }, []);

  const handleVendorChange = (field: keyof NewVendor, value: string) => {
    setNewVendor((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddBranch = () => {
    setNewVendor((prev) => ({
      ...prev,
      branches: [...prev.branches, { branchName: "", cityId: selectedBranchCity || "", isActive: true }],
    }));
  };

  const handleRemoveBranch = (index: number) => {
    setNewVendor((prev) => ({
      ...prev,
      branches: prev.branches.filter((_, i) => i !== index),
    }));
    // Remove contacts associated with this branch
    const updatedContacts = { ...branchContacts };
    delete updatedContacts[index];
    setBranchContacts(updatedContacts);
  };

  const handleBranchChange = (index: number, value: string) => {
    setNewVendor((prev) => ({
      ...prev,
      branches: prev.branches.map((branch, i) =>
        i === index ? { ...branch, branchName: value } : branch
      ),
    }));
  };
  const handleBranchCityChange = (branchIndex: number, value: string) => {
    setNewVendor((prev) => ({
      ...prev,
      branches: prev.branches.map((branch, i) =>
        i === branchIndex ? { ...branch, cityId: value } : branch
      ),
    }));
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

  const handleRemoveContact = (branchIndex: number, contactIndex: number) => {
    setBranchContacts((prev) => ({
      ...prev,
      [branchIndex]: prev[branchIndex].filter((_, i) => i !== contactIndex),
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
  //validation function
  const validateForm = () => {
    let errors: { [key: string]: string } = {};

    if (!newVendor.vendorName.trim()) {
      errors.vendorName = "Vendor Name is required.";
    }

    if (newVendor.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newVendor.email)) {
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




  const handleSubmit = async () => {
    if (!validateForm()) return;
    // Build the payload following the ASP.NET Core VendorRequest model
    const vendorPayload = {
      VendorName: newVendor.vendorName,
      CityID: selectedCity ? parseInt(selectedCity) : null,
      ContactNo: newVendor.contactNo,
      Email: newVendor.email,
      Address: newVendor.address,
      NTNNo: newVendor.ntnNo,
      OpeningBalance: newVendor.openingBalance
        ? parseFloat(newVendor.openingBalance)
        : null,
      CreditLimit: newVendor.creditLimit
        ? parseFloat(newVendor.creditLimit)
        : null,
      CreditDays: newVendor.creditDays,
      // The backend handles IsActive, IsDeleted, CreatedOn etc.
      VendorChildRequests: newVendor.branches.map((branch, branchIndex) => ({
        BranchName: branch.branchName,
        cityId: branch.cityId ? branch.cityId.toString() : "",
        ContactPersonVendorRequests: (branchContacts[branchIndex] || []).map(
          (contact) => ({
            ContactPersonName: contact.contactPerson,
            Designation: contact.designation,
            Address: contact.address,
            PhoneNo: contact.phoneNo,
            MobileNo: contact.mobileNo,
            Email: contact.email,
          })
        ),
      })),
    };

    console.log("Submitting vendor:", vendorPayload);

    try {
      const response = await fetch(variables.API_URL + "Vendor/AddVendor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // if authorization is required
        },
        body: JSON.stringify(vendorPayload),
      });
       const data = await response.json();
      if (response.ok) {
       
        console.log("Vendor created successfully", data);
        // Reset form state after successful submission
        setNewVendor({
          vendorName: "",
          cityId: "",
          contactNo: "",
          email: "",
          address: "",
          ntnNo: "",
          openingBalance: "",
          creditLimit: "",
          creditDays: "",
          type: "",
          branches: [],
        });
        setBranchContacts({});
        setSelectedBranchCity("");
        // Optionally navigate to another page (e.g., vendor list)
        toast.success("Vendor created successfully!",

          {
            position: "bottom-right",

          }
        );
        setTimeout(() => {
          navigate("/setup/vendor");
        }, 2000);
      } else {
        toast.error(data.message || "Failed to save Vendor.");
      }
    } catch (error) {
      console.error("Error creating vendor:", error);
      toast.error("Error creating vendor!",

        {
          position: "bottom-right",

        }
      );
      // setTimeout(() => {
      //   navigate("/setup/vendor");
      // }, 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Vendor Management</h1>
          <p className="text-gray-600 mt-1">
            Add and manage vendors, their branches, and contacts
          </p>
        </div>
      </div>

      <Card>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vendorName">Vendor Name</Label>
              <Input
                id="vendorName"
                value={newVendor.vendorName}
                onChange={(e) => handleVendorChange("vendorName", e.target.value)}
                placeholder="Enter vendor name"
              />
              {validationErrors.vendorName && (
                <div className="validation-error">{validationErrors.vendorName}</div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Select
                value={selectedCity}
                onValueChange={(value) => setSelectedCity(value)}
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
                value={newVendor.contactNo}
                onChange={(e) => handleVendorChange("contactNo", e.target.value)}
                placeholder="Enter contact number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newVendor.email}
                onChange={(e) => handleVendorChange("email", e.target.value)}
                placeholder="Enter email"
              />
              {validationErrors.email && (
                <div className="validation-error">{validationErrors.email}</div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ntnNo">NTN Number</Label>
              <Input
                id="ntnNo"
                value={newVendor.ntnNo}
                onChange={(e) => handleVendorChange("ntnNo", e.target.value)}
                placeholder="Enter NTN number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="openingBalance">Opening Balance</Label>
              <Input
                id="openingBalance"
                type="number"
                value={newVendor.openingBalance}
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
                value={newVendor.creditLimit}
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
                type="number"
                value={newVendor.creditDays}
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
                value={newVendor.address}
                onChange={(e) => handleVendorChange("address", e.target.value)}
                placeholder="Enter address"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Branches</h3>
              <Button onClick={handleAddBranch} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" /> Add Branch
              </Button>
            </div>

            {newVendor.branches.map((branch, branchIndex) => (
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
                        id={`branchName-${branchIndex}`}
                        value={branch.branchName}
                        onChange={(e) => handleBranchChange(branchIndex, e.target.value)}
                        placeholder="Enter branch name"
                      /></div>
                      <div>  <Select
                        value={branch.cityId}
                        onValueChange={(value) => handleBranchCityChange(branchIndex, value)}
                      >
                        <SelectTrigger id={`city-${branchIndex}`}>
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
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Contact Persons</h4>
                    <Button
                      onClick={() => handleAddContact(branchIndex)}
                      variant="outline"
                      size="sm"
                    >
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
                      {branchContacts[branchIndex]?.map(
                        (contact, contactIndex) => (
                          <div
                            key={contactIndex}
                            className="grid grid-cols-6 gap-4 p-4 border-b items-center"
                          >
                            <div>
                              <Input
                                value={contact.contactPerson}
                                onChange={(e) =>
                                  handleContactChange(
                                    branchIndex,
                                    contactIndex,
                                    "contactPerson",
                                    e.target.value
                                  )
                                }
                                placeholder="Enter name"
                              />
                            </div>
                            <div>
                              <Input
                                value={contact.designation}
                                onChange={(e) =>
                                  handleContactChange(
                                    branchIndex,
                                    contactIndex,
                                    "designation",
                                    e.target.value
                                  )
                                }
                                placeholder="Enter designation"
                              />
                            </div>
                            <div>
                              <Input
                                value={contact.phoneNo}
                                onChange={(e) =>
                                  handleContactChange(
                                    branchIndex,
                                    contactIndex,
                                    "phoneNo",
                                    e.target.value
                                  )
                                }
                                placeholder="Enter phone"
                              />
                            </div>
                            <div>
                              <Input
                                value={contact.mobileNo}
                                onChange={(e) =>
                                  handleContactChange(
                                    branchIndex,
                                    contactIndex,
                                    "mobileNo",
                                    e.target.value
                                  )
                                }
                                placeholder="Enter mobile"
                              />
                            </div>
                            <div>
                              <Input
                                value={contact.email}
                                onChange={(e) =>
                                  handleContactChange(
                                    branchIndex,
                                    contactIndex,
                                    "email",
                                    e.target.value
                                  )
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
                                onClick={() =>
                                  handleRemoveContact(branchIndex, contactIndex)
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )
                      )}
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
            <Button onClick={handleSubmit}>Create</Button>
          </div>
        </div>
      </Card>
      <ToastContainer />
    </div>
  );
};

export default Vendor;
