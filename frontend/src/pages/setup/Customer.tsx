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
import "react-toastify/dist/ReactToastify.css";

// Interfaces for the front‑end state
interface CustomerBranch {
  branchName: string;
  cityId: string; // will hold the selected branch city
  isActive: boolean;
}

interface ContactPerson {
  contactPerson: string;
  designation: string;
  address: string;
  phoneNo: string;
  mobileNo: string;
  email: string;
  isActive: boolean;
}

interface NewCustomer {
  customerName: string;
  cityId: string; // will be replaced by selectedCity from the select
  contactNo: string;
  email: string;
  address: string;
  ntnNo: string;
  openingBalance: string;
  creditLimit: string;
  creditDays: string;
  customerCategory: string; // you can use this field if needed
  customerCategoryId: string; // will be replaced by selectedCustomerCategory
  branches: CustomerBranch[];
}

const Customer = () => {
  const { token } = useSelector((state: RootState) => state.userAuthStore);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // State for branch contacts (each branch can have many contacts)
  const [branchContacts, setBranchContacts] = useState<{ [key: number]: ContactPerson[] }>({});

  // State for drop‑down data
  const [customerCategories, setCustomerCategories] = useState<customerCategoryModel[]>([]);
  const [cities, setCities] = useState<cityModel[]>([]);
  const [selectedCity, setSelectedCity] = useState("");
  // You can use selectedBranchCity as the default branch city when adding a new branch
  const [selectedBranchCity, setSelectedBranchCity] = useState("");
  const [selectedCustomerCategory, setSelectedCustomerCategory] = useState("");
   const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  // State for the new customer
  const [newCustomer, setNewCustomer] = useState<NewCustomer>({
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
  });

  // Fetch customer categories from API
  const fetchCustomerCategories = async () => {
    try {
      const response = await fetch(variables.API_URL + "Customer/get-customerCategories", {
        headers: { "Content-Type": "application/json" ,  "Authorization": `Bearer ${token}`},
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

  // Fetch cities from API
  const fetchCities = async () => {
    try {
      const response = await fetch(variables.API_URL + "Customer/get-cities", {
        headers: { "Content-Type": "application/json",  "Authorization": `Bearer ${token}` },
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
    if (id) {
      const fetchCustomer = async () => {
        try {
          const response = await fetch(
            `${variables.API_URL}Customer/GetCustomerById/${id}`,
            {
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
              },
            }
          );

          if (!response.ok) {
            // Optionally navigate away if not found
            setTimeout(() => navigate("/setup/customer"), 2000);
            return;
          }

          const data = await response.json();

          // Map main customer fields into our state.
          setNewCustomer({
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
            branches: data.customerChildVMs
              ? data.customerChildVMs.map((child: any) => ({
                branchName: child.branchName,
                // set branch city if available
                cityId: child.cityID ? child.cityID.toString() : "",
                isActive: true,
              }))
              : [],
          });

          // Set select values
          setSelectedCity(data.cityID ? data.cityID.toString() : "");
          setSelectedCustomerCategory(
            data.customerCategoryId ? data.customerCategoryId.toString() : ""
          );

          // Map branch contacts: assuming the index of customerChildVMs corresponds to our branches state.
          let mappedContacts: { [key: number]: ContactPerson[] } = {};
          if (data.customerChildVMs && Array.isArray(data.customerChildVMs)) {
            data.customerChildVMs.forEach((child: any, index: number) => {
              if (child.contactPersonCustomerVMs && Array.isArray(child.contactPersonCustomerVMs)) {
                mappedContacts[index] = child.contactPersonCustomerVMs.map((contact: any) => ({
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

  // When adding a branch, use the current selectedBranchCity as the default for the branch's cityId
  const handleAddBranch = () => {
    setNewCustomer((prev) => ({
      ...prev,
      branches: [
        ...prev.branches,
        { branchName: "", cityId: selectedBranchCity || "", isActive: true },
      ],
    }));
  };

  const handleRemoveBranch = (index: number) => {
    setNewCustomer((prev) => ({
      ...prev,
      branches: prev.branches.filter((_, i) => i !== index),
    }));
    const updatedContacts = { ...branchContacts };
    delete updatedContacts[index];
    setBranchContacts(updatedContacts);
  };

  const handleBranchChange = (index: number, value: string) => {
    setNewCustomer((prev) => ({
      ...prev,
      branches: prev.branches.map((branch, i) =>
        i === index ? { ...branch, branchName: value } : branch
      ),
    }));
  };

  // New: handler to change the branch's city based on user selection
  const handleBranchCityChange = (branchIndex: number, value: string) => {
    setNewCustomer((prev) => ({
      ...prev,
      branches: prev.branches.map((branch, i) =>
        i === branchIndex ? { ...branch, cityId: value } : branch
      ),
    }));
  };

  // Contact handling per branch
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

  // Customer field change handler
  const handleCustomerChange = (field: keyof NewCustomer, value: string) => {
    setNewCustomer((prev) => ({
      ...prev,
      [field]: value,
    }));
  };
//validation function

const validateForm = () => {
  let errors: { [key: string]: string } = {};

  if (!newCustomer.customerName.trim()) {
    errors.customerName = "Customer Name is required.";
  }

   if (newCustomer.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newCustomer.email)) {
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

  // Submit handler that builds the payload following the given models
  const handleSubmit = async () => {
    if (!validateForm()) return;
    const customerPayload = {
      CustomerName: newCustomer.customerName,
      CityID: selectedCity ? parseInt(selectedCity, 10) : null,
      ContactNo: newCustomer.contactNo,
      Email: newCustomer.email,
      Address: newCustomer.address,
      NTNNo: newCustomer.ntnNo,
      OpeningBalance: newCustomer.openingBalance ? parseFloat(newCustomer.openingBalance) : null,
      CreditLimit: newCustomer.creditLimit ? parseFloat(newCustomer.creditLimit) : null,
      CreditDays: newCustomer.creditDays ? parseInt(newCustomer.creditDays, 10) : null,
      CustomerCategory: newCustomer.customerCategory,
      CustomerCategoryId: selectedCustomerCategory ? parseInt(selectedCustomerCategory, 10) : null,
      customerChildRequests: newCustomer.branches.map((branch, branchIndex) => ({
        BranchName: branch.branchName,
        CityID: branch.cityId ? parseInt(branch.cityId, 10) : null, // include branch city
        CustomerId: 0, // backend can ignore or set this value
        contactPersonCustomerRequests: (branchContacts[branchIndex] || []).map((contact) => ({
          CustomerId: 0,
          CustomerChildId: 0,
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
      const response = await fetch(variables.API_URL + "Customer/AddCustomer", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(customerPayload),
      });
const data = await response.json();
    if (response.ok) {
       refresh();
      toast.success("Customer added successfully!");
      setTimeout(() => {
        navigate("/setup/customer");
      }, 2000);
      }

      
     else {
        toast.error(data.message || "Failed to save Vendor.");
      }
      
    } catch (error) {
      console.error("Error adding customer:", error);
    }
  };

  const refresh = async () => {
    setNewCustomer({
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
    });
    setBranchContacts({});
    setSelectedCity("");
    setSelectedCustomerCategory("");
    // Optionally reset selectedBranchCity too
    setSelectedBranchCity("");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Customer Management</h1>
          <p className="text-gray-600 mt-1">
            Add and manage customers, their branches, and contacts
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
                value={newCustomer.customerName}
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
                value={newCustomer.contactNo}
                onChange={(e) => handleCustomerChange("contactNo", e.target.value)}
                placeholder="Enter contact number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newCustomer.email}
                onChange={(e) => handleCustomerChange("email", e.target.value)}
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
                value={newCustomer.ntnNo}
                onChange={(e) => handleCustomerChange("ntnNo", e.target.value)}
                placeholder="Enter NTN number"
              />
            </div>
            {/* <div className="space-y-2">
              <Label htmlFor="openingBalance">Opening Balance</Label>
              <Input
                id="openingBalance"
                type="number"
                value={newCustomer.openingBalance}
                onChange={(e) => handleCustomerChange("openingBalance", e.target.value)}
                placeholder="Enter opening balance"
              />
            </div> */}
            <div className="space-y-2">
              <Label htmlFor="creditLimit">Credit Limit</Label>
              <Input
                id="creditLimit"
                type="number"
                value={newCustomer.creditLimit}
                onChange={(e) => handleCustomerChange("creditLimit", e.target.value)}
                placeholder="Enter credit limit"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="creditDays">Credit Days</Label>
              <Input
                id="creditDays"
                type="number"
                value={newCustomer.creditDays}
                onChange={(e) => handleCustomerChange("creditDays", e.target.value)}
                placeholder="Enter credit days"
              />
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={newCustomer.address}
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

            {newCustomer.branches.map((branch, branchIndex) => (
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
                    <div> <Select
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
                    </Button>
                    </div>
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

          {/* Form Actions */}
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

export default Customer;
