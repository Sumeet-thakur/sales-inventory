// AutocompleteInput.tsx
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { variables } from "@/Variables";

interface Suggestion {
  id: number;
  label: string;
}

interface AutocompleteInputProps {
  value: string;
  token: string;
  onSelect: (suggestion: Suggestion) => void;
}

const AutocompleteInput: React.FC<AutocompleteInputProps> = ({ value, token, onSelect }) => {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // We'll store the position of the input to place the dropdown
  const inputRef = useRef<HTMLInputElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  const fetchSuggestions = async (query: string) => {
    if (!query) {
      setSuggestions([]);
      return;
    }
    try {
      const response = await fetch(`${variables.API_URL}PriceList/autocomplete?query=${query}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data);
      }
    } catch (error) {
      console.error("Error fetching suggestions", error);
    }
  };

  // Debounce
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchSuggestions(inputValue);
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [inputValue]);

  // Update the input position whenever showSuggestions or inputValue changes
  useEffect(() => {
    if (inputRef.current && showSuggestions) {
      const rect = inputRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [showSuggestions, inputValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setShowSuggestions(true);
  };

  const handleSelect = (suggestion: Suggestion) => {
    setInputValue(suggestion.label);
    setShowSuggestions(false);
    onSelect(suggestion);
  };

  return (
    <>
      <div className="relative">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleChange}
          placeholder="Type to search item"
        />
      </div>

      {showSuggestions && suggestions.length > 0
        ? createPortal(
            <ul
              className="bg-white shadow-lg max-h-60 overflow-auto"
              style={{
                position: "absolute",
                top: position.top,
                left: position.left,
                width: position.width,
                zIndex: 9999,
              }}
            >
              {suggestions.map((suggestion) => (
                <li
                  key={suggestion.id}
                  className="cursor-pointer p-2 hover:bg-gray-200"
                  onClick={() => handleSelect(suggestion)}
                >
                  {suggestion.label}
                </li>
              ))}
            </ul>,
            document.getElementById("portal-root") as HTMLElement
          )
        : null}
    </>
  );
};

export default AutocompleteInput;
