// src/components/Header.tsx
import { Bell, User } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { HubConnectionBuilder, HubConnection } from "@microsoft/signalr";
import { useNavigate } from "react-router-dom";
import { clearLoggedInUser } from "@/Storage/Redux/userAuthSlice";
import { RootState } from "@/Storage/Redux/store";
import { variables } from "@/Variables";
import { revoketoken } from "../../Utility/jwt-utils";

interface PendingCountDto {
  table: string;
  count_StatusId_2: number;
}

const Header = () => {
  const { token, email, refreshToken } = useSelector(
    (state: RootState) => state.userAuthStore
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isBellOpen, setIsBellOpen] = useState(false);
  const [pendingCounts, setPendingCounts] = useState<PendingCountDto[]>([]);
  const [totalPending, setTotalPending] = useState(0);
  const connectionRef = useRef<HubConnection | null>(null);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = async () => {
    revoketoken(refreshToken, token);
    dispatch(clearLoggedInUser());
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
    navigate("/login");
  };

  useEffect(() => {
    if (!token) return;

     const apiWithoutSlash = variables.API_URL.replace(/\/+$/, '');        // e.g. "http://localhost:5000/api"
    const baseUrl       = apiWithoutSlash.replace(/\/api$/i, '');         // now "http://localhost:5000"
    const hubUrl        = `${baseUrl}/hubs/pendingcounts`;                      // "http://localhost:5000/hubs/presence"

    const conn = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token,
        // if you ever switch to cookie‐based auth for SignalR, you’d also need:
        // withCredentials: true
      })
      .withAutomaticReconnect()
      .build();

    conn.on("ReceivePendingCounts", (data: PendingCountDto[]) => {
      setPendingCounts(data);
      setTotalPending(data.reduce((sum, x) => sum + x.count_StatusId_2, 0));
    });

    conn
      .start()
      .then(() => {
        // initial pull
        conn.invoke("GetPendingCounts").catch(console.error);
      })
      .catch(console.error);

    connectionRef.current = conn;

    return () => {
      conn.stop().catch(console.error);
    };
  }, [token]);

  return (
    <header className="h-16 bg-white border-b border-gray-200 fixed top-0 right-0 left-64 z-10">
      <div className="h-full flex items-center justify-between px-6">
        <div className="w-96">{/* optional search here */}</div>
        <div className="flex items-center space-x-4">
          <div className="text-gray-500 dark:text-gray-400">{email}</div>

          {/* Bell with badge */}
          <div className="relative">
            <button
              className="p-2 hover:bg-gray-100 rounded-full"
              onClick={() => setIsBellOpen((o) => !o)}
            >
              <Bell className="h-5 w-5 text-gray-600" />
              {totalPending > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                  {totalPending}
                </span>
              )}
            </button>
           {isBellOpen && (
  <div className="absolute right-0 mt-2 w-64 bg-white shadow-lg ring-1 ring-black ring-opacity-5 rounded-md overflow-hidden z-20">
    {/* Dropdown header */}
    <div className="px-4 py-2 bg-gray-50 border-b">
      <span className="text-sm font-semibold text-gray-600 uppercase">Pending Items</span>
    </div>

    {/* List */}
    <ul className="max-h-60 overflow-y-auto divide-y divide-gray-100">
      {pendingCounts.length > 0 ? (
        pendingCounts.map((row) => (
          <li
            key={row.table}
            className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm text-gray-700">{row.table}</span>
           <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-[#bb86fc] text-white rounded-full">
  {row.count_StatusId_2}
</span>
          </li>
        ))
      ) : (
        <li className="px-4 py-4 text-center text-sm text-gray-500">
          No pending items.
        </li>
      )}
    </ul>

    {/* Footer action */}
    {pendingCounts.length > 0 && (
      <div className="px-4 py-2 bg-gray-50 border-t text-right">
       
      </div>
    )}
  </div>
)}
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              className="p-2 hover:bg-gray-100 rounded-full"
              onClick={() => setIsDropdownOpen((o) => !o)}
            >
              <User className="h-5 w-5 text-gray-600" />
            </button>
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white shadow-lg rounded-md border border-gray-200">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
