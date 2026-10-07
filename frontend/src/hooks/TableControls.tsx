// SearchControl.tsx
import { Input } from "@/components/ui/input";

export const SearchControl = ({
  searchTerm,
  setSearchTerm,
  placeholder = "Search...",
}: {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  placeholder?: string;
}) => {
  return (
    <Input
      placeholder={placeholder}
      value={searchTerm}
      onChange={(e) => {
        setSearchTerm(e.target.value);
      }}
      className="w-64 mb-4"
    />
  );
};

// PaginationControl.tsx
import { Button } from "@/components/ui/button";

export const PaginationControl = ({
  currentPage,
  setCurrentPage,
  totalPages,
}: {
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
}) => {
  return (
    <div className="flex justify-between items-center mt-4">
      <div className="text-sm text-gray-600">
        Page {currentPage} of {totalPages}
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(currentPage - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage(currentPage + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
};
