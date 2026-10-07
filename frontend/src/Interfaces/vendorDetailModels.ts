export interface ContactPersonVendorDetail {
  contactPersonID: number;
  vendorID: number;
  vendorChildID: number;
  contactPersonName: string;
  designation: string;
  address: string;
  phoneNo: string;
  mobileNo: string;
  email: string;
}

export interface VendorChildDetail {
  vendorChildID: number;
  branchName: string;
  cityName: string | null;
  vendorID: number;
  contactPersonVendorDetails: ContactPersonVendorDetail[];
}

export interface VendorDetail {
  vendorID: number;
  vendorName: string;
  cityName: string;
  contactNo: string;
  email: string;
  address: string;
  ntnNo: string;
  openingBalance: number;
  creditLimit: number;
  creditDays: string;
  date: string;
  vendorChildDetails: VendorChildDetail[];
}