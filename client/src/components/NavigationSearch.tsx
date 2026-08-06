import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { IconSearch } from "./Icons";
import { searchNavigation, SearchableItem } from "../config/navigationSearch";
import { useAppSelector } from "../app/hooks";
import { KeyboardKey } from "../types";
import { ROLES } from "../config/roles";

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
}

export default function NavigationSearch() {
  const user = useAppSelector((state) => state.auth.user);
  const [query, setQuery] = useState<string>("");
  const [results, setResults] = useState<SearchableItem[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition>({
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
      const searchResults = searchNavigation(query, user?.role);
      setResults(searchResults);
      setIsOpen(searchResults.length > 0);
      setSelectedIndex(-1);
    } else {
      setResults([]);
      setIsOpen(false);
      setSelectedIndex(-1);
    }
  }, [query, user?.id, user?.role, user?.username]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      const target = event.target as Node;
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navigateToItem = (item: SearchableItem): void => {
    navigate(item.path);
    setQuery("");
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ): void => {
    if (!isOpen || results.length === 0) return;

    switch (event.key) {
      case KeyboardKey.ArrowDown:
        event.preventDefault();
        setSelectedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev,
        );
        break;

      case KeyboardKey.ArrowUp:
        event.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;

      case KeyboardKey.Enter:
        event.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          navigateToItem(results[selectedIndex]);
        }
        break;

      case KeyboardKey.Escape:
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search modules and tabs..."
          value={query}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            setQuery(event.target.value)
          }
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          className="w-full pl-3.5 pr-[34px] py-[7px] border border-slate-200 rounded-full text-xs text-slate-600 bg-slate-50 outline-none box-border placeholder:text-slate-400 focus:border-blue-400 focus:bg-white transition-colors"
        />
        <span className="absolute right-[11px] top-1/2 -translate-y-1/2 pointer-events-none">
          <IconSearch size={13} color="#94a3b8" />
        </span>
      </div>

      {isOpen &&
        results.length > 0 &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl max-h-[400px] overflow-y-auto z-[1000]"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
            }}
          >
            {results.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateToItem(item)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full text-left px-4 py-3 border-b border-slate-100 last:border-b-0 transition-colors cursor-pointer block ${
                  selectedIndex === index
                    ? "bg-gradient-to-r from-blue-50 to-teal-50"
                    : "hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div
                      className={`font-semibold truncate text-[13px] mb-0.5 ${
                        selectedIndex === index
                          ? "text-slate-900"
                          : "text-slate-800"
                      }`}
                    >
                      {highlightMatch(item.label, query)}
                    </div>
                    <div className="truncate text-[11px] text-slate-500">
                      {item.module}
                    </div>
                  </div>
                  <div className="flex-shrink-0 overflow-hidden px-3 pt-3 pb-2 transition-all duration-300 ease-in-out max-h-[60px] opacity-100 text-[11px] text-slate-400">
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
            className="fixed rounded-xl border border-slate-200 bg-white shadow-lg p-4 z-[1000]"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
            }}
          >
            <div className="text-center text-xs text-slate-500">
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
  const matchStartIndex = lowerText.indexOf(lowerQuery);

  if (matchStartIndex === -1) return text;

  const textBeforeMatch = text.slice(0, matchStartIndex);
  const matchedText = text.slice(
    matchStartIndex,
    matchStartIndex + query.length,
  );
  const textAfterMatch = text.slice(matchStartIndex + query.length);

  return (
    <>
      {textBeforeMatch}
      <span className="bg-yellow-100 text-yellow-900 font-bold">
        {matchedText}
      </span>
      {textAfterMatch}
    </>
  );
}
