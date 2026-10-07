import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import Dashboard from "./pages/Dashboard";
import UserCreate from "./pages/users/UserCreate";
import UserRoles from "./pages/users/UserRoles";
import UserRights from "./pages/users/UserRights";
import CustomerCategory from "./pages/setup/CustomerCategory";
import Customer from "./pages/setup/Customer";
import Vendor from "./pages/setup/Vendor";
import SellerInfo from "./pages/setup/SellerInfo";
import SalesRequisitionList from "./pages/sales/SalesRequisitionList";
import SalesRequisition from "./pages/sales/SalesRequisition";
import SalesOrderList from "./pages/sales/SalesOrderList";
import SalesOrder from "./pages/sales/SalesOrder";
import SalesInvoiceList from "./pages/sales/SalesInvoiceList";
import SalesInvoice from "./pages/sales/SalesInvoice";
import PaymentReceivedList from "./pages/sales/PaymentReceivedList";
import PaymentReceived from "./pages/sales/PaymentReceived";
import PurchaseOrderList from "./pages/purchase/PurchaseOrderList";
import PurchaseOrder from "./pages/purchase/PurchaseOrder";
import PurchaseInvoice from "./pages/purchase/PurchaseInvoice";
import NotFound from "./pages/NotFound";
import ItemsList from "./pages/inventory/ItemsList";
import Items from "./pages/inventory/Items";
import BrandList from "./pages/inventory/BrandList";
import Brand from "./pages/inventory/Brand";
import ItemGroupList from "./pages/inventory/ItemGroupList";
import UnitList from "./pages/inventory/UnitList";
import ItemGroup from "./pages/inventory/ItemGroup";
import Unit from "./pages/inventory/Unit";
import WarehouseList from "./pages/inventory/WarehouseList";
import Warehouse from "./pages/inventory/Warehouse";
import UserCreateList from "./pages/users/UserCreateList";
import UserRolesList from "./pages/users/UserRolesList";
import CustomerCategoryList from "./pages/setup/CustomerCategoryList";
import CustomerList from "./pages/setup/CustomerList";
import VendorList from "./pages/setup/VendorList";
import SellerInfoList from "./pages/setup/SellerInfoList";
import WarehouseItemList from "./pages/inventory/WarehouseItemList";
import WarehouseItem from "./pages/inventory/WarehouseItem";
import PriceAdjustmentList from "./pages/inventory/PriceAdjustmentList";
import PriceAdjustment from "./pages/inventory/PriceAdjustment";
import PurchaseReceive from "./pages/purchase/PurchaseReceive";
import PurchaseReceiveList from "./pages/purchase/PurchaseReceiveList";
import Login from "./pages/users/Login";
import { MainLayout } from "./MainLayout";
import UserChangePassword from "./pages/users/UserChangePassword";
import ProtectedRoute from "./ProtectedRoute";
import UserChangeRole from "./pages/users/UserChangeRole";
import ResouresList from "./pages/users/ResouresList";
import ResourceCreate from "./pages/users/ResourceCreate";
import { useDispatch } from "react-redux";
import { useEffect, useState } from "react";
import { decodeJwtToken, revoketoken, UserToken } from '../../sales-inventory-system-main/src/Utility/jwt-utils';
import { setLoggedInUser } from "./Storage/Redux/userAuthSlice";
import ModuleCreateList from "./pages/users/ModuleCreateList";
import ModuleCreate from "./pages/users/ModuleCreate";
import CustomerEdit from "./pages/setup/CustomerEdit";
import VendorEdit from "./pages/setup/VendorEdit";
import CitiesList from "./pages/setup/CitiesList";
import City from "./pages/setup/City";
import UserChangePasswordByAdmin from "./pages/users/UserChangePasswordByAdmin";
import BrandDetail from "./pages/inventory/BrandDetail";
import UnitDetail from "./pages/inventory/UnitDetail";
import CityDetail from "./pages/setup/CityDetail";
import SellerInfoDetail from "./pages/setup/SellerInfoDetail";
import ItemGroupDetail from "./pages/inventory/ItemGroupDetail";
import CustomerCategoryDetail from "./pages/setup/CustomerCategoryDetail";
import WarehouseDetail from "./pages/inventory/WarehouseDetail";
import ItemsDetail from "./pages/inventory/ItemsDetail";
import CustomerDetailPage from "./pages/setup/CustomerDetail";
import VendorDetailPage from "./pages/setup/VendorDetailPage";
import PriceAdjustmentDetail from "./pages/inventory/PriceAdjustmentDetail";
import SalesRequisitionEdit from "./pages/sales/SalesRequisitionEdit";
import SalesRequisitionDetail from "./pages/sales/SalesRequisitionDetail";
import PurchaseOrderDetail from "./pages/purchase/PurchaseOrderDetail";
import PurchaseOrderEdit from "./pages/purchase/PurchaseOrderEdit";
import SalesInvoiceDetail from "./pages/sales/SalesInvoiceDetail";
import SalesInvoiceEdit from "./pages/sales/SalesInvoiceEdit";
import PaymentReceivedDetail from "./pages/sales/PaymentReceivedDetail";
import PurchaseReceiveDetail from "./pages/purchase/PurchaseReceiveDetail";
import PurchasePrice from "./pages/inventory/PurchasePrice";
import PurchasePriceList from "./pages/inventory/PurchasePriceList";
import PurchasePriceDetail from "./pages/inventory/PurchasePriceDetail";
import PurchaseInvoiceList from "./pages/purchase/PurchaseInvoiceList";
import PurchaseInvoiceDetail from "./pages/purchase/PurchaseInvoiceDetail";
import AdjustmentTypeList from "./pages/inventory/AdjustmentTypeList";
import AdjustmentType from "./pages/inventory/AdjustmentType";
import AdjustmentTypeDetail from "./pages/inventory/AdjustmentTypeDetail";
import StockAdjustment from "./pages/inventory/StockAdjustment";
import StockAdjustmentList from "./pages/inventory/StockAdjustmentList";
import StockAdjustmentDetail from "./pages/inventory/StockAdjustmentDetail";
import SalesInvoiceReport from "./pages/sales/SalesInvoiceReport";
import StockAtHandList from "./pages/inventory/StockAtHandList";
import SalesInvoiceDeliveryChallan from "./pages/sales/SalesInvoiceDeliveryChallan";
import SalesRequisitionReport from "./pages/sales/SalesRequisitionReport";
import PurchaseInvoiceReport from "./pages/purchase/PurchaseInvoiceReport";
import PurchaseReceiveReport from "./pages/purchase/PurchaseReceiveReport";
import PurchaseOrderReport from "./pages/purchase/PurchaseOrderReport";
import StockMovementList from "./pages/inventory/StockMovementList";
import StockMovement from "./pages/inventory/StockMovement";
import StockMovementDetail from "./pages/inventory/StockMovementDetail";



const queryClient = new QueryClient();



const App = () => {
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();
  const currentTime = Date.now() / 1000;

  useEffect(() => {
    const initializeAuth = () => {
      const token = localStorage.getItem("authToken");
      const refreshToken = localStorage.getItem("refreshToken");
    //  const token= sessionStorage.getItem("authToken");
    //   const refreshToken= sessionStorage.getItem("refreshToken");

      if (token) {
        try {
          const decoded = decodeJwtToken(token);
          if (decoded.exp < currentTime) {
            revoketoken(refreshToken, token);
            <Navigate to="/users/login" replace />
          }
          else {
            dispatch(setLoggedInUser({
              userId: decoded.userId,
              email: decoded.email,
              role: decoded.role,
              roleid: decoded.RoleId,
              exp: decoded.exp,
              token: token,
              refreshToken: refreshToken || ''
            }));
            setLoading(true)
          }
        } catch (error) {
          localStorage.removeItem("authToken");
          localStorage.removeItem("refreshToken");
          // sessionStorage.removeItem("authToken");
          // sessionStorage.removeItem("refreshToken");
          setLoading(false)
        }
      }
    };

    initializeAuth();
  }, [dispatch]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>



          <Routes>
            <Route path="/users/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                <Route path="/" element={<Dashboard />} />

                {/* User Routes */}

                <Route path="/users/create" element={<UserCreateList />} />
                <Route path="/users/create/new" element={<UserCreate />} />
                <Route path="/users/create/:id" element={<UserCreate />} />
                <Route path="/users/changepassword/:id" element={<UserChangePassword />} />
                <Route path="/users/changepasswordbyAdmin/:id" element={<UserChangePasswordByAdmin />} />
                <Route path="/users/changerole/:id" element={<UserChangeRole />} />
                <Route path="/users/roles" element={<UserRolesList />} />
                <Route path="/users/roles/new" element={<UserRoles />} />
                <Route path="/users/roles/:id" element={<UserRoles />} />
                <Route path="/users/modules" element={<ModuleCreateList />} />
                <Route path="/users/module/new" element={<ModuleCreate />} />
                <Route path="/users/module/:id" element={<ModuleCreate />} />
                <Route path="/users/rights" element={<UserRights />} />



                {/* Setup Routes */}
                <Route
                  path="/setup/customer-category"
                  element={<CustomerCategoryList />}
                />
                <Route
                  path="/setup/customer-category/new"
                  element={<CustomerCategory />}
                />
                <Route path="/setup/customer-category/:id" element={<CustomerCategory />} />
                <Route path="/setup/customer-category/detail/:id" element={<CustomerCategoryDetail />} />

                <Route path="/setup/customer" element={<CustomerList />} />
                <Route path="/setup/customer/new" element={<Customer />} />
                <Route path="/setup/customer/:id" element={<CustomerEdit />} />
                <Route path="/setup/customer/detail/:id" element={<CustomerDetailPage />} />
                <Route path="/setup/vendor" element={<VendorList />} />
                <Route path="/setup/vendor/new" element={<Vendor />} />
                <Route path="/setup/vendor/:id" element={<VendorEdit />} />
                <Route path="/setup/vendor/detail/:id" element={<VendorDetailPage />} />
                <Route path="/setup/seller" element={<SellerInfoList />} />
                <Route path="/setup/seller/new" element={<SellerInfo />} />
                <Route path="/setup/seller/:id" element={<SellerInfo />} />
                <Route path="/setup/seller/detail/:id" element={<SellerInfoDetail />} />
                <Route path="/setup/city" element={<CitiesList />} />
                <Route path="/setup/city/new" element={<City />} />
                <Route path="/setup/city/:id" element={<City />} />
                <Route path="/setup/city/detail/:id" element={<CityDetail />} />

                {/* Inventory Routes */}
                <Route path="/inventory/items" element={<ItemsList />} />
                <Route path="/inventory/items/new" element={<Items />} />
                <Route path="/inventory/items/:id" element={<Items />} />
                <Route path="/inventory/items/detail/:id" element={<ItemsDetail />} />
                <Route path="/inventory/brands" element={<BrandList />} />
                <Route path="/inventory/brands/new" element={<Brand />} />
                <Route path="/inventory/brands/:id" element={<Brand />} />
                <Route path="/inventory/brands/detail/:id" element={<BrandDetail />} />
                <Route
                  path="/inventory/itemgroups"
                  element={<ItemGroupList />}
                />
                <Route
                  path="/inventory/itemgroups/new"
                  element={<ItemGroup />}
                />
                <Route path="/inventory/itemgroups/:id" element={<ItemGroup />} />
                <Route path="/inventory/itemgroups/detail/:id" element={<ItemGroupDetail />} />
                <Route path="/inventory/units" element={<UnitList />} />
                <Route path="/inventory/units/new" element={<Unit />} />
                <Route path="/inventory/units/:id" element={<Unit />} />
                <Route path="/inventory/units/detail/:id" element={<UnitDetail />} />
                <Route
                  path="/inventory/warehouse"
                  element={<WarehouseList />}
                />
                <Route
                  path="/inventory/warehouse/new"
                  element={<Warehouse />}
                />
                <Route
                  path="/inventory/warehouse/:id"
                  element={<Warehouse />}
                />
                <Route
                  path="/inventory/warehouse/detail/:id"
                  element={<WarehouseDetail />}
                />
                <Route
                  path="/inventory/warehouseitem"
                  element={<WarehouseItemList />}
                />
                <Route
                  path="/inventory/warehouseitem/new"
                  element={<WarehouseItem />}
                />
                <Route
                  path="/inventory/warehouseitem/:id"
                  element={<WarehouseItem />}
                />
                <Route
                  path="/inventory/pricelist"
                  element={<PriceAdjustmentList />}
                />
                <Route
                  path="/inventory/pricelist/new"
                  element={<PriceAdjustment />}
                />
                <Route
                  path="/inventory/pricelist/:id"
                  element={<PriceAdjustment />}
                />
                <Route
                  path="/inventory/pricelist/detail/:id"
                  element={<PriceAdjustmentDetail />}
                />

                {/* Sales Routes */}
                <Route
                  path="/sales/requisition"
                  element={<SalesRequisitionList />}
                />
                <Route
                  path="/sales/requisition/new"
                  element={<SalesRequisition />}
                />
                <Route
                  path="/sales/requisition/:id"
                  element={<SalesRequisitionEdit />}
                />
                <Route
                  path="/sales/requisition/detail/:id"
                  element={<SalesRequisitionDetail />}
                />
                <Route path="/sales/order" element={<SalesOrderList />} />
                <Route path="/sales/order/new" element={<SalesOrder />} />
                <Route path="/sales/order/:id" element={<SalesOrder />} />
                <Route path="/sales/invoice" element={<SalesInvoiceList />} />
                <Route path="/sales/invoice/:id" element={<SalesInvoiceEdit />} />
                <Route path="/sales/invoice/detail/:id" element={<SalesInvoiceDetail />} />
             
                <Route path="/sales/invoice/new" element={<SalesInvoice />} />
                
                <Route
                  path="/sales/payment"
                  element={<PaymentReceivedList />}
                />
                <Route
                  path="/sales/payment/:id"
                  element={<PaymentReceived />}
                />
                <Route
                  path="/sales/payment/detail/:id"
                  element={<PaymentReceivedDetail />}
                />
                <Route
                  path="/sales/payment/new"
                  element={<PaymentReceived />}
                />

                {/* Purchase Routes */}

                <Route
                  path="/purchase/order"
                  element={<PurchaseOrderList />}
                />
                <Route
                  path="/purchase/order/new"
                  element={<PurchaseOrder />}
                />
                <Route
                  path="/purchase/order/:id"
                  element={<PurchaseOrderEdit />}
                />
                <Route
                  path="/purchase/order/detail/:id"
                  element={<PurchaseOrderDetail />}
                />
                <Route
                  path="/purchase/receive"
                  element={<PurchaseReceiveList />}
                />
                <Route
                  path="/purchase/receive/new"
                  element={<PurchaseReceive />}
                />
                <Route
                  path="/purchase/receive/:id"
                  element={<PurchaseReceive />}
                />
                <Route
                  path="/purchase/receive/detail/:id"
                  element={<PurchaseReceiveDetail />}
                />
                <Route
                  path="/inventory/purchaseprice/new"
                  element={<PurchasePrice />}
                />
                <Route
                  path="/inventory/purchaseprice/:id"
                  element={<PurchasePrice />}
                />
                <Route
                  path="/inventory/purchaseprice/detail/:id"
                  element={<PurchasePriceDetail />}
                />
               <Route
                  path="/inventory/purchaseprice"
                  element={<PurchasePriceList />}
                />
                <Route
                  path="/purchase/invoice"
                  element={<PurchaseInvoiceList />}
                />
                 <Route
                  path="/purchase/invoice/new"
                  element={<PurchaseInvoice />}
                />
                 <Route
                  path="/purchase/invoice/:id"
                  element={<PurchaseInvoice />}
                />
                 <Route
                  path="/purchase/invoice/detail/:id"
                  element={<PurchaseInvoiceDetail />}
                />
                <Route
                  path="/inventory/adjustmenttype"
                  element={<AdjustmentTypeList />}
                />
                <Route
                  path="/inventory/adjustmenttype/new"
                  element={<AdjustmentType />}
                />
                 <Route
                  path="/inventory/adjustmenttype/:id"
                  element={<AdjustmentType />}
                />
                 <Route
                  path="/inventory/adjustmenttype/detail/:id"
                  element={<AdjustmentTypeDetail />}
                />
                <Route
                  path="/inventory/stockadjustments/new"
                  element={<StockAdjustment />}
                />
                <Route
                  path="/inventory/stockadjustments"
                  element={<StockAdjustmentList />}
                />
                <Route
                  path="/inventory/stockadjustments/:id"
                  element={<StockAdjustment />}
                />
                <Route
                  path="/inventory/stockadjustments/detail/:id"
                  element={<StockAdjustmentDetail />}
                />
                  <Route
                  path="/inventory/stockathand"
                  element={<StockAtHandList />}
                />
                  <Route
                  path="/inventory/stockmovement"
                  element={<StockMovementList />}
                />
                 <Route
                  path="/inventory/stockmovement/new"
                  element={<StockMovement />}
                />
                 <Route
                  path="/inventory/stockmovement/:id"
                  element={<StockMovement />}
                />
                 <Route
                  path="/inventory/stockmovement/detail/:id"
                  element={<StockMovementDetail />}
                />
              
               

                <Route path="*" element={<NotFound />} />
              </Route>
                 <Route path="/sales/invoice/report/:id" element={<SalesInvoiceReport />} />
                 <Route path="/sales/requisition/report/:id" element={<SalesRequisitionReport />} />
                 <Route path="/sales/invoice/deliverychallan/:id" element={<SalesInvoiceDeliveryChallan />} />
                 <Route path="/purchase/invoice/report/:id" element={<PurchaseInvoiceReport />} />
                 <Route path="/purchase/receive/report/:id" element={<PurchaseReceiveReport />} />
                 <Route path="/purchase/order/report/:id" element={<PurchaseOrderReport />} />
                
            </Route>
          </Routes>

        </BrowserRouter>
        <Toaster />
        <Sonner />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
