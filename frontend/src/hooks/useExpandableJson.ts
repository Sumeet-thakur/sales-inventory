import { useState } from "react";

const useExpandableJson = (jsonData: string) => {
  const [expanded, setExpanded] = useState(false);
  const toggle = () => setExpanded((prev) => !prev);

  let formattedJson: string;
  try {
    const obj = JSON.parse(jsonData);
    formattedJson = JSON.stringify(obj, null, 2);
  } catch {
    formattedJson = jsonData;
  }

  const preview =
    formattedJson.length > 50 ? formattedJson.substring(0, 10) + "..." : formattedJson;

  return { expanded, toggle, formattedJson, preview };
};

export default useExpandableJson;
