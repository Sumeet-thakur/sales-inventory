import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import useExpandableText from "@/hooks/useExpandableText";

interface ExpandableTextDisplayProps {
  text: string;
  /** how many chars to show in preview */
  previewLength?: number;
}

const ExpandableTextDisplay: React.FC<ExpandableTextDisplayProps> = ({
  text,
  previewLength = 20,
}) => {
  const { expanded, toggle, preview } = useExpandableText(
    text,
    previewLength
  );

  // only show toggle if there's more to see
  const needsToggle = text.length > previewLength;

  // pick full or preview, then turn every ", " into "\n"
  const displayText = (expanded ? text : preview).replace(/,\s*/g, "\n");

  return (
    <div className="flex items-start">
      <pre className="m-0 p-0 text-sm whitespace-pre-wrap break-words">
        {displayText}
      </pre>
      {needsToggle && (
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          className="ml-2"
        >
          {expanded ? "–" : <Plus className="h-4 w-4" />}
        </Button>
      )}
    </div>
  );
};

export default ExpandableTextDisplay;
