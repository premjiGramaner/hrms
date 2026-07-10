import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { IconSearch } from "./Icons";
import { searchNavigation, SearchableItem } from "../config/navigationSearch";

export default function NavigationSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchableItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (wrapperRef.current && isOpen) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [isOpen, query]);

  useEffect(() => {
    if (query.trim().length >= 2) {
      const searchResults = searchNavigation(query);
      setResults(searchResults);
      setIsOpen(searchResults.length > 0);
      setSelectedIndex(-1);
    } else {
      setResults([]);
      setIsOpen(false);
      setSelectedIndex(-1);
    }
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navigateToItem = (item: SearchableItem) => {
    navigate(item.path);
    setQuery("");
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          navigateToItem(results[selectedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  return (
    <div ref={wrapperRef} className="relative" style={{ width: "100%" }}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search modules and tabs..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          style={{
            width: "100%",
            paddingLeft: 14,
            paddingRight: 34,
            paddingTop: 7,
            paddingBottom: 7,
            border: "1px solid #e2e8f0",
            borderRadius: 999,
            fontSize: 12,
            color: "#475569",
            background: "#f8fafc",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        <span
          className="absolute"
          style={{
            right: 11,
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
          }}
        >
          <IconSearch size={13} color="#94a3b8" />
        </span>
      </div>

      {isOpen &&
        results.length > 0 &&
        createPortal(
          <div
            ref={dropdownRef}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
            style={{
              position: "fixed",
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
              maxHeight: "400px",
              overflowY: "auto",
              zIndex: 1000,
            }}
          >
            {results.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateToItem(item)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full text-left px-4 py-3 border-b border-slate-100 last:border-b-0 transition cursor-pointer ${
                  selectedIndex === index
                    ? "bg-gradient-to-r from-blue-50 to-teal-50"
                    : "hover:bg-slate-50"
                }`}
                style={{
                  display: "block",
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div
                      className="font-semibold truncate"
                      style={{
                        fontSize: 13,
                        color: selectedIndex === index ? "#0f172a" : "#1e293b",
                        marginBottom: 2,
                      }}
                    >
                      {highlightMatch(item.label, query)}
                    </div>
                    <div
                      className="truncate"
                      style={{
                        fontSize: 11,
                        color: "#64748b",
                      }}
                    >
                      {item.module}
                    </div>
                  </div>
                  <div
                    className="flex-shrink-0"
                    style={{
                      fontSize: 10,
                      color: "#94a3b8",
                      textTransform: "uppercase",
                      fontWeight: 600,
                      letterSpacing: "0.05em",
                      marginTop: 2,
                    }}
                  >
                    {item.category}
                  </div>
                </div>
              </button>
            ))}
          </div>,
          document.body,
        )}

      {isOpen &&
        query.trim().length >= 2 &&
        results.length === 0 &&
        createPortal(
          <div
            className="rounded-xl border border-slate-200 bg-white shadow-lg"
            style={{
              position: "fixed",
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
              padding: "16px",
              zIndex: 1000,
            }}
          >
            <div
              className="text-center"
              style={{
                fontSize: 12,
                color: "#64748b",
              }}
            >
              No results found for "{query}"
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase().trim();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) return text;

  const before = text.slice(0, index);
  const match = text.slice(index, index + query.length);
  const after = text.slice(index + query.length);

  return (
    <>
      {before}
      <span
        style={{
          backgroundColor: "#fef3c7",
          color: "#92400e",
          fontWeight: 700,
        }}
      >
        {match}
      </span>
      {after}
    </>
  );
}
