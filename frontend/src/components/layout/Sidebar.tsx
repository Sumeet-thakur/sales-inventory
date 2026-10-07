import { MainMenuListVM } from "../../Interfaces/mainMenuModelList";
import { variables } from "@/Variables";
import { RootState } from "@/Storage/Redux/store";
import { useSelector } from "react-redux";
import {
  Home,
  Users,
  Settings,
  Package,
  ShoppingCart,
  Truck,
  Tag,
  Box,
  Grid,
  Ruler,
  Building2,
  UserPlus,
  UserCog,
  Users2,
  Building,
  FileText,
  CreditCard,
  ClipboardCheck,
  FileStack,
  DollarSign,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  File,
  FilePlus2,
  PackageCheck,
  SlidersHorizontal,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";

// Create a mapping from icon name (string) to the actual React component
const iconMapping: { [key: string]: React.FC<React.SVGProps<SVGSVGElement>> } = {
  Home: Home,
  Users: Users,
  Settings: Settings,
  Package: Package,
  ShoppingCart: ShoppingCart,
  Truck: Truck,
  Tag: Tag,
  Box: Box,
  Grid: Grid,
  Ruler: Ruler,
  Building2: Building2,
  UserPlus: UserPlus,
  UserCog: UserCog,
  Users2: Users2,
  Building: Building,
  FileText: FileText,
  CreditCard: CreditCard,
  ClipboardCheck: ClipboardCheck,
  FileStack: FileStack,
  DollarSign: DollarSign,
  Menu: Menu,
  X: X,
  ChevronLeft: ChevronLeft,
  ChevronRight: ChevronRight,
  File: File,
  FilePlus2: FilePlus2,
  PackageCheck : PackageCheck ,
  SlidersHorizontal : SlidersHorizontal ,
};

const Sidebar: React.FC = () => {
  const { token, role } = useSelector((state: RootState) => state.userAuthStore);
  const location = useLocation();
  const [mainMenuItems, setMainMenuItems] = useState<MainMenuListVM[]>([]);
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  // You can replace this with your useIsMobile hook if needed
  const isMobile = false;

  const fetchMainMenuItems = async (): Promise<MainMenuListVM[]> => {
    const response = await fetch(variables.API_URL + "MenuItems/main-menu-list", {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error("Failed to fetch main menu items");
    }
    const data: MainMenuListVM[] = await response.json();
    return data;
  };

  useEffect(() => {
    fetchMainMenuItems()
      .then((data) => setMainMenuItems(data))
      .catch((err) => console.error(err));
  }, []);

  const toggleMenu = (path: string) => {
    setOpenMenus((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  return (
    <>
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-screen bg-white border-r border-gray-200 overflow-y-auto z-40 transition-all duration-300 ease-in-out
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          ${isMobile ? "w-[280px]" : "w-64"}
        `}
      >
        <div className="p-4 border-b sticky top-0 bg-white z-10">
        <Link
    to="/"
    className="text-2xl font-bold text-primary block hover:underline"
    onClick={() => isMobile && setSidebarOpen(false)}
  >
    Inventory System
  </Link>
        </div>

        <nav className="mt-4">
          {mainMenuItems.map((item) => {
            // Look up the icon component for the parent menu item
            const IconComponent = iconMapping[item.icon] || (() => <span />);
            return (
              <div key={item.path}>
                {item.childMainMenuListVMs && item.childMainMenuListVMs.length > 0 ? (
                  <div>
                    <button
                      onClick={() => toggleMenu(item.path)}
                      className={`w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-primary/5 hover:text-primary transition-colors
                        ${location.pathname.startsWith(item.path) ? "bg-primary/10 text-primary font-medium" : ""}`}
                    >
                      <IconComponent className="h-4 w-4 mr-3 flex-shrink-0" />
                      <span className="flex-1 text-left">{item.label}</span>
                      <svg
                        className={`ml-auto h-4 w-4 transform transition-transform ${
                          openMenus.includes(item.path) ? "rotate-180" : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                    <div
                      className={`overflow-hidden transition-all duration-200 ease-in-out ${
                        openMenus.includes(item.path) ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
                      }`}
                    >
                      <div className="bg-gray-50 py-1">
                        {item.childMainMenuListVMs.map((child) => {
                          const ChildIcon = iconMapping[child.icon] || (() => <span />);
                          return (
                            <Link
                              key={child.path}
                              to={child.path}
                              onClick={() => isMobile && setSidebarOpen(false)}
                              className={`flex items-center px-4 py-2 pl-11 text-sm text-gray-700 hover:bg-primary/5 hover:text-primary transition-colors
                                ${location.pathname === child.path ? "bg-primary/10 text-primary font-medium" : ""}`}
                            >
                              <ChildIcon className="h-4 w-4 mr-3 flex-shrink-0" />
                              <span>{child.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <Link
                    to={item.path}
                    onClick={() => isMobile && setSidebarOpen(false)}
                    className={`flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-primary/5 hover:text-primary transition-colors
                      ${location.pathname === item.path ? "bg-primary/10 text-primary font-medium" : ""}`}
                  >
                    <IconComponent className="h-4 w-4 mr-3 flex-shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </>
  );
};

export default Sidebar;

// import {
//   Home,
//   Users,
//   Settings,
//   Package,
//   ShoppingCart,
//   Truck,
//   Tag,
//   Box,
//   Grid,
//   Ruler,
//   Building2,
//   UserPlus,
//   UserCog,
//   Users2,
//   Building,
//   FileText,
//   CreditCard,
//   ClipboardCheck,
//   FileStack,
//   DollarSign,
//   Menu,
//   X,
//   ChevronLeft,
//   ChevronRight,
//   File,
//   FilePlus2,
// } from "lucide-react";
// import { Link, useLocation } from "react-router-dom";
// import { useState, useEffect } from "react";
// import { useIsMobile } from "@/hooks/use-mobile";
// import { Button } from "@/components/ui/button";

// const Sidebar = () => {
//   const location = useLocation();
//   const [openMenus, setOpenMenus] = useState<string[]>([]);
//   const [isSidebarOpen, setSidebarOpen] = useState(true);
//   const isMobile = useIsMobile();

//   useEffect(() => {
//     // Close sidebar on mobile by default
//     if (isMobile) {
//       setSidebarOpen(false);
//     }
//   }, [isMobile]);

//   // Close sidebar when route changes on mobile
//   useEffect(() => {
//     if (isMobile) {
//       setSidebarOpen(false);
//     }
//   }, [location, isMobile]);

//   const toggleMenu = (path: string) => {
//     setOpenMenus((prev) =>
//       prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
//     );
//   };

//   const mainMenuItems = [
//     { icon: Home, label: "Dashboard", path: "/" },
//     {
//       icon: Users,
//       label: "Users",
//       path: "/users",
//       subItems: [
//         { icon: UserPlus, label: "User Creation", path: "/users/create" },
//         { icon: UserCog, label: "User Roles", path: "/users/roles" },
//         { icon: Users2, label: "User Rights", path: "/users/rights" },
//         // { icon: FilePlus2, label: "Module Creation", path: "/users/modules" },
       
//       ],
//     },
//     {
//       icon: Settings,
//       label: "Setup",
//       path: "/setup",
//       subItems: [
//         {
//           icon: Tag,
//           label: "Customer Category",
//           path: "/setup/customer-category",
//         },
//         { icon: Users, label: "Customer", path: "/setup/customer" },
//         { icon: Building, label: "Vendor", path: "/setup/vendor" },
//         { icon: FileText, label: "Seller Information", path: "/setup/seller" },
//         { icon: FileText, label: "Cities", path: "/setup/city" },
//       ],
//     },
//     {
//       icon: Package,
//       label: "Inventory",
//       path: "/inventory",
//       subItems: [
//         { icon: Box, label: "Items", path: "/inventory/items" },
//         { icon: Tag, label: "Brands", path: "/inventory/brands" },
//         { icon: Grid, label: "Item Groups", path: "/inventory/itemgroups" },
//         { icon: Ruler, label: "Units", path: "/inventory/units" },
//         { icon: Building2, label: "Warehouse", path: "/inventory/warehouse" },
//         // {
//         //   icon: Building2,
//         //   label: "Warehouse Items",
//         //   path: "/inventory/warehouseitem",
//         // },
//         {
//           icon: DollarSign,
//           label: "Price Lists",
//           path: "/inventory/pricelist",
//         },
//       ],
//     },
//     {
//       icon: ShoppingCart,
//       label: "Sales",
//       path: "/sales",
//       subItems: [
//         {
//           icon: ClipboardCheck,
//           label: "Sales Requisition",
//           path: "/sales/requisition",
//         },
//         { icon: FileText, label: "Sales Order", path: "/sales/order" },
//         { icon: FileStack, label: "Sales Invoice", path: "/sales/invoice" },
//         { icon: CreditCard, label: "Payment Received", path: "/sales/payment" },
//       ],
//     },
//     {
//       icon: Truck,
//       label: "Purchase",
//       path: "/purchase",
//       subItems: [
//         {
//           icon: ClipboardCheck,
//           label: "Purchase Requisition/Order",
//           path: "/purchase/order",
//         },
//         {
//           icon: FileText,
//           label: "Purchase Receive",
//           path: "/purchase/receive",
//         },
//         // {
//         //   icon: FileStack,
//         //   label: "Purchase Invoice",
//         //   path: "/purchase/invoice",
//         // },
//       ],
//     },
//     {
//       icon: FileStack,
//       label: "Reports",
//       path: "/reports",
//       subItems: [
//         // report paths here
//       ],
//     },
//   ];

//   return (
//     <>
//       {/* Toggle Button - Show on both mobile and desktop */}
//       {/* <Button
//         variant="ghost"
//         size="icon"
//         className={`fixed top-4 z-50 transition-all duration-300 ${
//           isSidebarOpen 
//             ? "left-[16rem] md:left-[14rem]" 
//             : "left-4"
//         }`}
//         onClick={() => setSidebarOpen(!isSidebarOpen)}
//       >
//         {isSidebarOpen ? (
//           <ChevronLeft className="h-6 w-6" />
//         ) : (
//           <ChevronRight className="h-6 w-6" />
//         )}
//       </Button> */}

//       {/* Overlay for mobile only */}
//       {isMobile && isSidebarOpen && (
//         <div
//           className="fixed inset-0 bg-black/50 z-30"
//           onClick={() => setSidebarOpen(false)}
//         />
//       )}

//       {/* Sidebar */}
//       <div
//         className={`fixed left-0 top-0 h-screen bg-white border-r border-gray-200 overflow-y-auto z-40 transition-all duration-300 ease-in-out
//           ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
//           ${isMobile ? "w-[280px]" : "w-64"}
//         `}
//       >
//         <div className="p-4 border-b sticky top-0 bg-white z-10">
//           <h1 className="text-2xl font-bold text-primary">Inventory System</h1>
//         </div>

//         <nav className="mt-4">
//           {mainMenuItems.map((item) => (
//             <div key={item.path}>
//               {item.subItems ? (
//                 <div>
//                   <button
//                     onClick={() => toggleMenu(item.path)}
//                     className={`w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-primary/5 hover:text-primary transition-colors
//                       ${location.pathname.startsWith(item.path)
//                         ? "bg-primary/10 text-primary font-medium"
//                         : ""
//                       }`}
//                   >
//                     <item.icon className="h-4 w-4 mr-3 flex-shrink-0" />
//                     <span className="flex-1 text-left">{item.label}</span>
//                     <svg
//                       className={`ml-auto h-4 w-4 transform transition-transform ${
//                         openMenus.includes(item.path) ? "rotate-180" : ""
//                       }`}
//                       fill="none"
//                       viewBox="0 0 24 24"
//                       stroke="currentColor"
//                     >
//                       <path
//                         strokeLinecap="round"
//                         strokeLinejoin="round"
//                         strokeWidth={2}
//                         d="M19 9l-7 7-7-7"
//                       />
//                     </svg>
//                   </button>
//                   <div
//                     className={`overflow-hidden transition-all duration-200 ease-in-out
//                       ${openMenus.includes(item.path)
//                         ? "max-h-[1000px] opacity-100"
//                         : "max-h-0 opacity-0"
//                       }`}
//                   >
//                     <div className="bg-gray-50 py-1">
//                       {item.subItems.map((subItem) => (
//                         <Link
//                           key={subItem.path}
//                           to={subItem.path}
//                           onClick={() => isMobile && setSidebarOpen(false)}
//                           className={`flex items-center px-4 py-2 pl-11 text-sm text-gray-700 hover:bg-primary/5 hover:text-primary transition-colors
//                             ${location.pathname === subItem.path
//                               ? "bg-primary/10 text-primary font-medium"
//                               : ""
//                             }`}
//                         >
//                           <subItem.icon className="h-4 w-4 mr-3 flex-shrink-0" />
//                           <span>{subItem.label}</span>
//                         </Link>
//                       ))}
//                     </div>
//                   </div>
//                 </div>
//               ) : (
//                 <Link
//                   to={item.path}
//                   onClick={() => isMobile && setSidebarOpen(false)}
//                   className={`flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-primary/5 hover:text-primary transition-colors
//                     ${location.pathname === item.path
//                       ? "bg-primary/10 text-primary font-medium"
//                       : ""
//                     }`}
//                 >
//                   <item.icon className="h-4 w-4 mr-3 flex-shrink-0" />
//                   <span>{item.label}</span>
//                 </Link>
//               )}
//             </div>
//           ))}
//         </nav>
//       </div>
//     </>
//   );
// };

// export default Sidebar;
