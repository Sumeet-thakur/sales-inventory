import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import useExpandableJson from "@/hooks/useExpandableJson";

interface ExpandableJsonDisplayProps {
  jsonData: string;
}

const ExpandableJsonDisplay: React.FC<ExpandableJsonDisplayProps> = ({ jsonData }) => {
  const { expanded, toggle, formattedJson, preview } = useExpandableJson(jsonData);

  return (
    <div>
      <Button variant="ghost" size="icon" onClick={toggle}>
        {expanded ? "-" : <Plus className="h-4 w-4" />}
      </Button>
      <pre className="mt-2 bg-gray-100 p-2 rounded text-sm overflow-x-auto">
        {expanded ? formattedJson : preview}
      </pre>
    </div>
  );
};

export default ExpandableJsonDisplay;
