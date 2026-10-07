import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { variables } from "@/Variables";
import { RootState } from "@/Storage/Redux/store";
import { useSelector } from "react-redux";
import {VendorDetail} from "../../Interfaces/vendorDetailModels"
// Import your Table components as needed
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Interfaces


const VendorDetailPage = () => {
  const { token } = useSelector((state: RootState) => state.userAuthStore);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState<VendorDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchVendor = async () => {
      try {
        const response = await fetch(`${variables.API_URL}Vendor/DetailVendorById/${id}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          toast.error("Failed to fetch vendor details");
          setLoading(false);
          return;
        }
        const data: VendorDetail = await response.json();
        setVendor(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching vendor:", error);
        toast.error("Error fetching vendor details");
        setLoading(false);
      }
    };

    if (id) {
      fetchVendor();
    }
  }, [id, token]);

  if (loading) return <div>Loading...</div>;
  if (!vendor) return <div>No vendor found</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Vendor Detail</h1>
        <p className="text-gray-600 mt-1">View vendor detail</p>
      </div>

      <Card className="p-6">
        {/* Header section */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <Label className="text-sm font-medium text-gray-700">Vendor ID:</Label>
            <span className="ml-2 text-sm text-gray-900">{vendor.vendorID}</span>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700">Created Date:</Label>
            <span className="ml-2 text-sm text-gray-900">{vendor.date}</span>
          </div>
        </div>

        {/* Main details */}
        <div className="mb-4">
          <Label className="text-sm font-medium text-gray-700">Vendor Name:</Label>
          <span className="ml-2 text-sm text-gray-900">{vendor.vendorName}</span>
        </div>
        <div className="mb-4">
          <Label className="text-sm font-medium text-gray-700">City Name:</Label>
          <span className="ml-2 text-sm text-gray-900">{vendor.cityName}</span>
        </div>
        <div className="mb-4">
          <Label className="text-sm font-medium text-gray-700">Contact No:</Label>
          <span className="ml-2 text-sm text-gray-900">{vendor.contactNo}</span>
        </div>
        <div className="mb-4">
          <Label className="text-sm font-medium text-gray-700">Email:</Label>
          <span className="ml-2 text-sm text-gray-900">{vendor.email}</span>
        </div>
        <div className="mb-4">
          <Label className="text-sm font-medium text-gray-700">Address:</Label>
          <span className="ml-2 text-sm text-gray-900">{vendor.address}</span>
        </div>
        <div className="mb-4">
          <Label className="text-sm font-medium text-gray-700">NTN No:</Label>
          <span className="ml-2 text-sm text-gray-900">{vendor.ntnNo}</span>
        </div>
        <div className="mb-4">
          <Label className="text-sm font-medium text-gray-700">Opening Balance:</Label>
          <span className="ml-2 text-sm text-gray-900">{vendor.openingBalance}</span>
        </div>
        <div className="mb-4">
          <Label className="text-sm font-medium text-gray-700">Credit Limit:</Label>
          <span className="ml-2 text-sm text-gray-900">{vendor.creditLimit}</span>
        </div>
        <div className="mb-4">
          <Label className="text-sm font-medium text-gray-700">Credit Days:</Label>
          <span className="ml-2 text-sm text-gray-900">{vendor.creditDays}</span>
        </div>

        {/* Vendor Child Details Section */}
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">Vendor Child Details</h2>
          {vendor.vendorChildDetails.map((child) => (
            <Card key={child.vendorChildID} className="mb-4 p-4">
              <div className="flex flex-wrap gap-4 mb-2">
                <div className="flex items-center space-x-2">
                  <Label className="text-sm font-medium text-gray-700">Branch Name:</Label>
                  <Label className="text-sm text-gray-900">{child.branchName}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Label className="text-sm font-medium text-gray-700">City:</Label>
                  <Label className="text-sm text-gray-900">{child.cityName || "N/A"}</Label>
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
                    {child.contactPersonVendorDetails.map((contact) => (
                      <TableRow key={contact.contactPersonID}>
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
        <div className="flex justify-end mt-6">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Back
          </Button>
        </div>
      </Card>
      <ToastContainer />
    </div>
  );
};

export default VendorDetailPage;
