"use client";

import { RefreshCw, ExternalLink, ChevronDown, Calendar } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface ActionCenterProps {
  selectedYear: number;
  availableYears: number[];
  onYearChange: (year: number) => void;
  onSync: () => void;
  isSyncing: boolean;
}

export function ActionCenter({
  selectedYear,
  availableYears,
  onYearChange,
  onSync,
  isSyncing,
}: ActionCenterProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Split years: show 3 most recent as buttons, rest in dropdown
  const recentYears = availableYears.slice(0, 3);
  const olderYears = availableYears.slice(3);
  const isOlderYearSelected = olderYears.includes(selectedYear);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-1">
      {/* Year Selector - Hybrid: Recent buttons + Older dropdown */}
      <div className="bg-midnight-900/50 p-1 rounded-xl border border-midnight-800 flex items-center gap-1">
        {/* Recent years as buttons */}
        {recentYears.map((year) => (
          <button
            key={year}
            onClick={() => onYearChange(year)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap
              ${
                selectedYear === year
                  ? "bg-accent-500 text-white shadow-lg shadow-accent-500/20"
                  : "text-midnight-400 hover:text-white hover:bg-midnight-800"
              }
            `}
          >
            {year}
          </button>
        ))}

        {/* Older years dropdown */}
        {olderYears.length > 0 && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`
                px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap flex items-center gap-1.5
                ${
                  isOlderYearSelected
                    ? "bg-accent-500 text-white shadow-lg shadow-accent-500/20"
                    : "text-midnight-400 hover:text-white hover:bg-midnight-800"
                }
              `}
            >
              {isOlderYearSelected ? (
                <>
                  {selectedYear}
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${
                      isDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </>
              ) : (
                <>
                  <Calendar className="w-3.5 h-3.5" />
                  <span>More</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${
                      isDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </>
              )}
            </button>

            {/* Dropdown menu */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 min-w-[120px] bg-midnight-900 border border-midnight-700 rounded-xl shadow-xl z-50 py-1 animate-in fade-in slide-in-from-top-2 duration-200">
                {olderYears.map((year) => (
                  <button
                    key={year}
                    onClick={() => {
                      onYearChange(year);
                      setIsDropdownOpen(false);
                    }}
                    className={`
                      w-full px-4 py-2 text-sm text-left transition-colors
                      ${
                        selectedYear === year
                          ? "bg-accent-500/20 text-accent-400"
                          : "text-midnight-300 hover:bg-midnight-800 hover:text-white"
                      }
                    `}
                  >
                    {year}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <button
          onClick={onSync}
          disabled={isSyncing}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-midnight-800 hover:bg-midnight-700 border border-midnight-700 hover:border-midnight-600 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <RefreshCw
            className={`w-4 h-4 text-accent-400 ${
              isSyncing
                ? "animate-spin"
                : "group-hover:rotate-180 transition-transform duration-500"
            }`}
          />
          <span>{isSyncing ? "Syncing..." : "Sync Email"}</span>
        </button>

        <a
          href="https://mytax.hasil.gov.my/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500/10 to-amber-600/10 hover:from-amber-500/20 hover:to-amber-600/20 border border-amber-500/20 hover:border-amber-500/40 text-amber-400 rounded-xl text-sm font-medium transition-all duration-200"
        >
          <span className="hidden sm:inline">File on MyTax</span>
          <span className="sm:hidden">File Tax</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
