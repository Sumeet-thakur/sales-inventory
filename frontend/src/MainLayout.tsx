import { Outlet } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar"; // Adjust import path as needed
import Header from "@/components/layout/Header"; // Adjust import path as needed
import useAuthValidation from "./hooks/useAuthValidation";

export const MainLayout = () => {
  useAuthValidation();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="ml-64 transition-all duration-300">
        {/* Header */}
        <Header />

        {/* Main Content */}
        <main className="pt-16 p-6">
          <div className="container mx-auto">
            {/* Outlet for rendering child routes */}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};