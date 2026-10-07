import { useState, useMemo } from "react";

export const useTableControls = <T extends Record<string, any>>(
  data: T[],
  itemsPerPage: number = 10
) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof T;
    direction: "asc" | "desc";
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const processedData = useMemo(() => {
    // Filter
    let result = data.filter((item) =>
      Object.values(item).some((val) =>
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );

    // Sort
    if (sortConfig?.key) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        return (
          (aVal > bVal ? 1 : -1) * (sortConfig.direction === "asc" ? 1 : -1)
        );
      });
    }

    return result;
  }, [data, searchTerm, sortConfig]);

  // Paginate
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedData.slice(start, start + itemsPerPage);
  }, [processedData, currentPage]);

  const totalPages = Math.ceil(processedData.length / itemsPerPage);

  const handleSort = (key: keyof T) => {
    const direction =
      sortConfig?.key === key && sortConfig.direction === "asc"
        ? "desc"
        : "asc";
    setSortConfig({ key, direction });
    setCurrentPage(1); // Reset to first page when sorting
  };

  return {
    searchTerm,
    setSearchTerm,
    sortConfig,
    handleSort,
    paginatedData,
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems: processedData.length,
  };
};
