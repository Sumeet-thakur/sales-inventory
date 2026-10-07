import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

interface SortableHeaderProps {
  children: React.ReactNode;
  onClick: () => void;
  sortDirection?: "asc" | "desc" | null;
  isActive?: boolean;
}

export const SortableHeader = ({
  children,
  onClick,
  sortDirection,
  isActive = false,
}: SortableHeaderProps) => {
  const getSortIcon = () => {
    if (!isActive)
      return <ChevronsUpDown className="h-4 w-4 ml-2 opacity-50" />;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4 ml-2" />
    ) : (
      <ChevronDown className="h-4 w-4 ml-2" />
    );
  };

  return (
    <span
      className="flex items-center cursor-pointer hover:bg-gray-100"
      onClick={onClick}
    >
      {children}
      {getSortIcon()}
    </span>
  );
};
