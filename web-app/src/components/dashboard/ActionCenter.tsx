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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-1">
      {/* Year Selector - Segmented Control Style */}
      <div className="bg-midnight-900/50 p-1 rounded-xl border border-midnight-800 flex items-center gap-1 overflow-x-auto max-w-full no-scrollbar">
        {availableYears.map((year) => (
          <button
            key={year}
            onClick={() => onYearChange(year)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap
              ${selectedYear === year 
                ? 'bg-accent-500 text-white shadow-lg shadow-accent-500/20' 
                : 'text-midnight-400 hover:text-white hover:bg-midnight-800'}
            `}
          >
            {year}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <button
          onClick={onSync}
          disabled={isSyncing}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-midnight-800 hover:bg-midnight-700 border border-midnight-700 hover:border-midnight-600 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <RefreshCw className={`w-4 h-4 text-accent-400 ${isSyncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          <span>{isSyncing ? 'Syncing...' : 'Sync Email'}</span>
        </button>

        <a
          href="https://mytax.hasil.gov.my/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500/10 to-amber-600/10 hover:from-amber-500/20 hover:to-amber-600/20 border border-amber-500/20 hover:border-amber-500/40 text-amber-400 rounded-xl text-sm font-medium transition-all duration-200"
        >
          <span className="hidden sm:inline">File on MyTax</span>
          <span className="sm:hidden">File</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}

