import { useCallback } from "react";

const useFormatDateTime = () => {
  const formatDateTime = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.toLocaleString("en-US", { month: "short" });
    const day = date.getDate().toString().padStart(2, "0");
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const formattedTime =
      hours.toString().padStart(2, "0") + ":" + minutes + " " + ampm;
    return `${day}-${month}-${year} ${formattedTime}`;
  }, []);

  return formatDateTime;
};

export default useFormatDateTime;
