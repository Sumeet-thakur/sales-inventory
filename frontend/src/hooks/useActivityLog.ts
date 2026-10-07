import { useState } from "react";
import { variables } from "@/Variables";

export interface ActivityLog {
  activityLogId: number;
  actionType: string;
  oldData: string;
  newData: string;
  brandName: string;
  userName: string;
  date: string;
}

const useActivityLog = (token: string) => {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [showActivityLog, setShowActivityLog] = useState(false);

  // Generic function to fetch activity logs from a given endpoint and ID.
  const fetchActivityLogs = async (id: string, endpoint: string) => {
    try {
      const response = await fetch(`${variables.API_URL}${endpoint}/${id}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          const formattedData = data.map((item: any) => ({
            activityLogId: item.activityLogId || item.activityLogId,
            actionType: item.ActionType || item.actionType,
            oldData: item.OldData || item.oldData,
            newData: item.NewData || item.newData,
            brandName: item.BrandName || item.brandName,
            userName: item.UserName || item.userName,
            date: item.Date || item.date,
          }));
          setActivityLogs(formattedData);
        }
      } else {
        throw new Error("Failed to fetch activity logs");
      }
    } catch (error) {
      console.error("Error fetching activity logs:", error);
    }
  };

  // Toggle the visibility of the Activity Log.
  // If turning on and an id & endpoint are provided, fetch the logs.
  const toggleActivityLog = async (id?: string, endpoint?: string) => {
    if (!showActivityLog && id && endpoint) {
      await fetchActivityLogs(id, endpoint);
    }
    setShowActivityLog((prev) => !prev);
  };

  return { activityLogs, showActivityLog, toggleActivityLog };
};

export default useActivityLog;
