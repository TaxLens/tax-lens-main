'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const SELECTED_YEAR_KEY = 'selected-tax-year';

// Determine which tax year is currently in filing period
export function getCurrentFilingYear(): number {
  const now = new Date();
  const currentYear = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12

  // Filing period is March 1 - April 30 of the following year
  // So if we're in March or April, we're likely filing for the previous year
  if (month >= 3 && month <= 4) {
    return currentYear - 1;
  }
  // Otherwise default to current year
  return currentYear;
}

// Get available tax years (current year and previous years with potential data)
export function getAvailableTaxYears(): number[] {
  const currentYear = new Date().getFullYear();
  // Show current year and 2 previous years
  return [currentYear, currentYear - 1, currentYear - 2];
}

interface YearContextType {
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  availableYears: number[];
}

const YearContext = createContext<YearContextType | undefined>(undefined);

export function YearProvider({ children }: { children: ReactNode }) {
  const [selectedYear, setSelectedYearState] = useState<number>(getCurrentFilingYear());
  const [isHydrated, setIsHydrated] = useState(false);

  // Load selected year from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(SELECTED_YEAR_KEY);
    if (stored !== null) {
      const parsedYear = parseInt(stored, 10);
      if (!isNaN(parsedYear)) {
        setSelectedYearState(parsedYear);
      }
    }
    setIsHydrated(true);
  }, []);

  // Save selected year to localStorage when it changes
  const setSelectedYear = (year: number) => {
    setSelectedYearState(year);
    if (isHydrated) {
      localStorage.setItem(SELECTED_YEAR_KEY, String(year));
    }
  };

  return (
    <YearContext.Provider
      value={{
        selectedYear,
        setSelectedYear,
        availableYears: getAvailableTaxYears(),
      }}
    >
      {children}
    </YearContext.Provider>
  );
}

export function useYear() {
  const context = useContext(YearContext);
  if (context === undefined) {
    throw new Error('useYear must be used within a YearProvider');
  }
  return context;
}

