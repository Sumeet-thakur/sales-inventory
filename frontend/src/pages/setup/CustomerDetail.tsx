import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { variables } from "@/Variables";
import { useSelector } from "react-redux";
import { RootState } from "@/Storage/Redux/store";

// Interface models based on the given JSON structure.
interface ContactPerson {
  contactPersonId: number;
  customerId: number;
  customerChildId: number;
  contactPersonName: string;
  designation: string;
  address: string;
  phoneNo: string;
  mobileNo: string;
  email: string;
}

interface CustomerChild {
  customerChildId: number;
  branchName: string;
  cityID: number;
  cityName: string;
  contactPersonCustomerDetails: ContactPerson[];
}

interface CustomerDetail {
  customerId: number;
  customerName: string;
  cityName: string;
  contactNo: string;
  email: string;
  address: string;
  ntnNo: string;
  openingBalance: number | null;
  creditLimit: number;
  creditDays: number;
  customerCategoryName: string;
  date: string;
  customerChildDetails: CustomerChild[];
}

const CustomerDetailPage = () => {
  const { token } = useSelector((state: RootState) => state.userAuthStore);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch customer details from the API.
  useEffect(() => {
    if (id) {
      fetch(`${variables.API_URL}Customer/detailCustomerById/${id}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
        .then(async (response) => {
          if (!response.ok) {
            toast.error("Error fetching customer details.");
            setTimeout(() => navigate("/setup/customer"), 2000);
            return;
          }
          const data = await response.json();
          setCustomer(data);
          setLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching customer:", error);
          toast.error("Error fetching customer details.");
          setTimeout(() => navigate("/setup/customer"), 2000);
        });
    } else {
      setLoading(false);
    }
  }, [id, token, navigate]);

  if (loading || !customer) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Customer Detail</h1>
        <p className="text-gray-600 mt-1">View Customer Detail</p>
      </div>

      {/* Main Customer Details Card */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Label className="text-sm font-medium text-gray-700">ID:</Label>
              <Label className="text-sm text-gray-900">{customer.customerId}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Label className="text-sm font-medium text-gray-700">Created Date:</Label>
              <Label className="text-sm text-gray-900">{customer.date}</Label>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-2 mb-4">
            <Label className="text-sm font-medium text-gray-700">
              Customer Name:
            </Label>
            <Label className="text-sm text-gray-900">
              {customer.customerName}
            </Label>
          </div>
          <div className="flex items-center space-x-2 mb-4">
            <Label className="text-sm font-medium text-gray-700">
              City:
            </Label>
            <Label className="text-sm text-gray-900">
              {customer.cityName}
            </Label>
          </div>
          <div className="flex items-center space-x-2 mb-4">
            <Label className="text-sm font-medium text-gray-700">
              Contact No:
            </Label>
            <Label className="text-sm text-gray-900">
              {customer.contactNo}
            </Label>
          </div>
          <div className="flex items-center space-x-2 mb-4">
            <Label className="text-sm font-medium text-gray-700">
              Email:
            </Label>
            <Label className="text-sm text-gray-900">
              {customer.email}
            </Label>
          </div>
          <div className="flex items-center space-x-2 mb-4">
            <Label className="text-sm font-medium text-gray-700">
              Address:
            </Label>
            <Label className="text-sm text-gray-900">
              {customer.address}
            </Label>
          </div>
          <div className="flex items-center space-x-2 mb-4">
            <Label className="text-sm font-medium text-gray-700">
              NTN No:
            </Label>
            <Label className="text-sm text-gray-900">
              {customer.ntnNo}
            </Label>
          </div>
          <div className="flex items-center space-x-2 mb-4">
            <Label className="text-sm font-medium text-gray-700">
              Opening Balance:
            </Label>
            <Label className="text-sm text-gray-900">
              {customer.openingBalance !== null ? customer.openingBalance : "N/A"}
            </Label>
          </div>
          <div className="flex items-center space-x-2 mb-4">
            <Label className="text-sm font-medium text-gray-700">
              Credit Limit:
            </Label>
            <Label className="text-sm text-gray-900">
              {customer.creditLimit}
            </Label>
          </div>
          <div className="flex items-center space-x-2 mb-4">
            <Label className="text-sm font-medium text-gray-700">
              Credit Days:
            </Label>
            <Label className="text-sm text-gray-900">
              {customer.creditDays}
            </Label>
          </div>
          <div className="flex items-center space-x-2 mb-4">
            <Label className="text-sm font-medium text-gray-700">
              Customer Category:
            </Label>
            <Label className="text-sm text-gray-900">
              {customer.customerCategoryName}
            </Label>
          </div>
        </div>
        </div>
      </Card>


      {/* Customer Child Details Section */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Customer Child Details</h2>
        {customer.customerChildDetails.map((child) => (
          <Card key={child.customerChildId} className="mb-4 p-4">
            <div className="flex flex-wrap gap-4 mb-2">
              <div className="flex items-center space-x-2">
                <Label className="text-sm font-medium text-gray-700">Branch Name:</Label>
                <Label className="text-sm text-gray-900">{child.branchName}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Label className="text-sm font-medium text-gray-700">City:</Label>
                <Label className="text-sm text-gray-900">{child.cityName}</Label>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1">Contact Persons</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact Person Name</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Phone No</TableHead>
                    <TableHead>Mobile No</TableHead>
                    <TableHead>Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {child.contactPersonCustomerDetails.map((contact) => (
                    <TableRow key={contact.contactPersonId}>
                      <TableCell>{contact.contactPersonName}</TableCell>
                      <TableCell>{contact.designation}</TableCell>
                      <TableCell>{contact.address}</TableCell>
                      <TableCell>{contact.phoneNo}</TableCell>
                      <TableCell>{contact.mobileNo}</TableCell>
                      <TableCell>{contact.email}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        ))}
      </div>

      {/* Back Button */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Back
        </Button>
      </div>

      <ToastContainer />
    </div>
  );
};

export default CustomerDetailPage;
