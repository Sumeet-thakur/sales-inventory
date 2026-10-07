import { useState } from "react";

const useExpandableText = (text: string, previewLength = 20) => {
  const [expanded, setExpanded] = useState(false);
  const toggle = () => setExpanded((prev) => !prev);
  const preview =
    text.length > previewLength
      ? text.substring(0, previewLength) + "..."
      : text;

  return { expanded, toggle, preview };
};

export default useExpandableText;
