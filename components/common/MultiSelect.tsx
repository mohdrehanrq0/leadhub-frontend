"use client";

import { useEffect, useRef, useState } from "react";

import { IconChevronDown, IconSearch, IconX } from "@tabler/icons-react";

import styles from "./MultiSelect.module.css";

export interface MultiSelectOption {
  id: string;
  name: string;
  color?: string;
  count?: number;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  searchable?: boolean;
  theme?: "dark" | "light"; // "dark" for brand colors, "light" for white/purple
}

export default function MultiSelect({
  options,
  selectedIds,
  onChange,
  placeholder = "Select options...",
  label,
  disabled = false,
  searchable = true,
  theme = "dark",
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isDark = theme === "dark";
  const shellClass = isDark
    ? "bg-bg-100 border-white/10 text-text-100"
    : "bg-white border-slate-200 text-slate-700";
  const placeholderClass = isDark ? "text-text-200" : "text-slate-400";
  const inputPlaceholderClass = isDark
    ? "placeholder:text-text-200"
    : "placeholder:text-slate-400";
  const dropdownClass = isDark
    ? "bg-bg-100 border-white/10"
    : "bg-white border-slate-200";
  const chipClass = isDark
    ? "bg-brand-main/20 text-text-100"
    : "bg-slate-100 text-slate-700";
  const optionHoverClass = isDark
    ? "hover:bg-brand-main/10"
    : "hover:bg-slate-50";
  const checkboxClass = isDark
    ? "w-4 h-4 rounded border-white/20 text-brand-main focus:ring-blue-500"
    : "w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500";

  const selectedOptions = options.filter((opt) => selectedIds.includes(opt.id));
  const filteredOptions = options.filter((opt) =>
    opt.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  const handleToggleOption = (optionId: string) => {
    const newSelected = selectedIds.includes(optionId)
      ? selectedIds.filter((id) => id !== optionId)
      : [...selectedIds, optionId];
    onChange(newSelected);
  };

  const handleRemoveChip = (optionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    handleToggleOption(optionId);
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div ref={containerRef} className={`${styles.container}`}>
      {label && (
        <label className="block text-sm font-medium text-text-200 mb-2">
          {label}
        </label>
      )}

      {/* Main Input */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full min-h-11 px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-left flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 ${shellClass} ${styles.button}`}
      >
        <div className="flex flex-wrap gap-2 flex-1">
          {selectedOptions.length > 0 ? (
            selectedOptions.map((opt) => (
              <div
                key={opt.id}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs ${chipClass}`}
              >
                <span>{opt.name}</span>
                <button
                  onClick={(e) => handleRemoveChip(opt.id, e)}
                  className={isDark ? "hover:text-text-200" : "hover:text-slate-500"}
                >
                  <IconX size={14} />
                </button>
              </div>
            ))
          ) : (
            <span className={placeholderClass}>
              {placeholder}
            </span>
          )}
        </div>
        <IconChevronDown
          size={18}
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={`${styles.dropdown} border rounded-lg shadow-xl ${dropdownClass}`}
        >
          {searchable && (
            <div
              className={`p-2 border-b ${
                isDark ? "border-brand-main/10" : "border-white/10"
              }`}
            >
              <div className="relative">
                <IconSearch
                  size={16}
                  className={`absolute left-3 top-1/2 -translate-y-1/2 ${placeholderClass}`}
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full h-10 pl-9 pr-3 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors duration-200 ${shellClass} ${inputPlaceholderClass}`}
                />
              </div>
            </div>
          )}

          <div className="max-h-64 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div
                className={`p-3 text-center ${
                  isDark ? "text-text-200" : "text-slate-400"
                } text-sm`}
              >
                No options found
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors ${optionHoverClass}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(opt.id)}
                    onChange={() => handleToggleOption(opt.id)}
                    className={checkboxClass}
                  />
                  <div className="flex-1 flex items-center gap-2">
                    {opt.color && (
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: opt.color }}
                      />
                    )}
                    <span
                      className={`${isDark ? "text-text-100" : "text-slate-700"} text-sm`}
                    >
                      {opt.name}
                    </span>
                  </div>
                  {opt.count !== undefined && (
                    <span
                      className={`${
                        isDark ? "text-text-200" : "text-slate-400"
                      } text-xs`}
                    >
                      ({opt.count})
                    </span>
                  )}
                </label>
              ))
            )}
          </div>

          {selectedIds.length > 0 && (
            <div
              className={`p-2 border-t ${
                isDark ? "border-brand-main/10" : "border-white/10"
              }`}
            >
              <button
                onClick={handleClearAll}
                className={`w-full px-3 py-1 text-xs ${
                  isDark
                    ? "text-text-200 hover:text-text-100 hover:bg-brand-main/10"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                } rounded transition`}
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
