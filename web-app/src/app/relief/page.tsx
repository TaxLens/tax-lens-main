'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import { Sidebar } from '@/components/Sidebar';
import { api, TransactionSummary } from '@/lib/api';
import { 
  formatCurrency, 
  TAX_RELIEF_CATEGORIES,
  calculateEPF,
  EPF_RELIEF_LIMIT
} from '@/lib/utils';
import { 
  Wallet,
  Calendar,
  ChevronDown,
  Info,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Dynamic import for PDF button (client-side only - ESM package)
const PDFDownloadButton = dynamic(
  () => import('@/components/reports/PDFDownloadButton').then(mod => mod.PDFDownloadButton),
  { ssr: false, loading: () => null }
);

// Get available tax years
function getAvailableTaxYears(): number[] {
  const currentYear = new Date().getFullYear();
  return [currentYear, currentYear - 1, currentYear - 2];
}

// Get current filing year
function getCurrentFilingYear(): number {
  const now = new Date();
  const currentYear = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= 3 && month <= 4) {
    return currentYear - 1;
  }
  return currentYear;
}

export default function ReliefPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { isCollapsed: sidebarCollapsed } = useSidebar();
  
  const [selectedYear, setSelectedYear] = useState<number>(getCurrentFilingYear());
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const [annualSalary, setAnnualSalary] = useState<number>(0);
  
  const availableYears = getAvailableTaxYears();
  
  // Load salary from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('user-annual-salary');
    if (stored) {
      setAnnualSalary(parseFloat(stored));
    }
  }, []);
  
  // Calculate EPF details
  const epfDetails = calculateEPF(annualSalary);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const summaryRes = await api.getTransactionSummary({ year: selectedYear });
      setSummary(summaryRes);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
      return;
    }
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, authLoading, router, fetchData]);

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    setYearDropdownOpen(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center mesh-bg">
        <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Filter out non_deductible and individual (auto-applied)
  const deductibleCategories = TAX_RELIEF_CATEGORIES.filter(
    cat => cat.value !== 'non_deductible' && cat.value !== 'individual'
  );

  // Calculate totals (including EPF)
  const totalLimit = deductibleCategories.reduce((sum, cat) => sum + cat.limit, 0) + EPF_RELIEF_LIMIT;
  const totalClaimed = deductibleCategories.reduce((sum, cat) => {
    const claimed = summary?.byTaxRelief?.[cat.value]?.amount || 0;
    return sum + Math.min(claimed, cat.limit);
  }, 0) + epfDetails.epfTaxRelief;

  return (
    <div className="min-h-screen mesh-bg">
      <Sidebar />
      
      <main className={`p-8 transition-all duration-300 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'} ml-0 pt-16 md:pt-8`}>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-3xl font-display font-bold">
                Tax Relief Categories
              </h1>
              
              {/* Year Selector Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setYearDropdownOpen(!yearDropdownOpen)}
                  className="flex items-center gap-2 px-4 py-2 bg-midnight-800 hover:bg-midnight-700 border border-midnight-600 rounded-lg transition-colors"
                >
                  <Calendar className="w-4 h-4 text-accent-400" />
                  <span className="font-medium">{selectedYear}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${yearDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {yearDropdownOpen && (
                  <div className="absolute top-full mt-2 w-full bg-midnight-800 border border-midnight-600 rounded-lg shadow-xl z-50 overflow-hidden">
                    {availableYears.map((year) => (
                      <button
                        key={year}
                        onClick={() => handleYearChange(year)}
                        className={`w-full px-4 py-2 text-left hover:bg-midnight-700 transition-colors ${
                          year === selectedYear ? 'bg-accent-500/20 text-accent-400' : ''
                        }`}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <p className="text-midnight-400">
              Track your tax deductions against LHDN limits for YA {selectedYear}
            </p>
          </div>

          {/* Download Report Button */}
          {!isLoading && (
            <PDFDownloadButton
              year={selectedYear}
              annualSalary={annualSalary}
              reliefData={summary?.byTaxRelief || {}}
              totalTrackedRelief={summary?.totalTaxRelief || 0}
            />
          )}
        </div>

        {/* Summary Card */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-accent-500/20 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-accent-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Total Relief Summary</h2>
              <p className="text-sm text-midnight-400">
                Combined deductions from all categories
              </p>
            </div>
          </div>
          
          {isLoading ? (
            <div className="h-20 skeleton rounded-xl" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-midnight-400 text-sm mb-1">Total Claimed</p>
                <p className="text-2xl font-bold font-mono text-accent-400">
                  {formatCurrency(totalClaimed)}
                </p>
              </div>
              <div>
                <p className="text-midnight-400 text-sm mb-1">Maximum Available</p>
                <p className="text-2xl font-bold font-mono">
                  {formatCurrency(totalLimit)}
                </p>
              </div>
              <div>
                <p className="text-midnight-400 text-sm mb-1">Overall Usage</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-3 bg-midnight-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-accent-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (totalClaimed / totalLimit) * 100)}%` }}
                    />
                  </div>
                  <span className="font-mono text-sm">
                    {((totalClaimed / totalLimit) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Info Banner */}
        <div className="mb-6 p-4 rounded-xl bg-accent-500/10 border border-accent-500/20 flex items-start gap-3">
          <Info className="w-5 h-5 text-accent-400 shrink-0 mt-0.5" />
          <div className="text-sm text-midnight-300">
            <p className="mb-1">
              <span className="font-medium text-accent-400">Note:</span> Personal Relief (RM 9,000) is automatically applied. EPF Relief is calculated from your salary in Settings.
            </p>
            <p>
              Track your deductions from transactions and EPF contributions below.
            </p>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            [...Array(9)].map((_, i) => (
              <div key={i} className="glass-card p-5 h-40 skeleton" />
            ))
          ) : (
            <>
              {/* EPF Relief Card */}
              {(() => {
                const epfClaimed = epfDetails.epfTaxRelief;
                const epfPercentage = (epfClaimed / EPF_RELIEF_LIMIT) * 100;
                const epfRemaining = EPF_RELIEF_LIMIT - epfClaimed;
                const epfMaxed = epfClaimed >= EPF_RELIEF_LIMIT;
                const epfColor = '#22c55e';
                
                return (
                  <div 
                    className={`glass-card p-5 transition-all duration-200 hover:border-midnight-600 ${
                      epfMaxed ? 'border-green-500/30' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: epfColor }}
                        />
                        <h3 className="font-medium text-sm">EPF (KWSP) Contribution</h3>
                      </div>
                      {epfMaxed && (
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      )}
                    </div>
                    
                    <div className="mb-3">
                      <div className="flex items-baseline justify-between mb-1">
                        <span className="text-xl font-bold font-mono" style={{ color: epfColor }}>
                          {formatCurrency(epfClaimed)}
                        </span>
                        <span className="text-sm text-midnight-400">
                          / {formatCurrency(EPF_RELIEF_LIMIT)}
                        </span>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="h-2 bg-midnight-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${Math.min(100, epfPercentage)}%`,
                            backgroundColor: epfColor
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-midnight-400">
                        {annualSalary === 0 ? (
                          <Link href="/settings" className="text-accent-400 hover:underline">
                            Set salary in Settings
                          </Link>
                        ) : epfMaxed ? (
                          <span className="text-green-400">Limit reached!</span>
                        ) : (
                          <>Remaining: <span className="font-mono text-white">{formatCurrency(epfRemaining)}</span></>
                        )}
                      </span>
                      <span className="font-mono text-midnight-500">
                        {epfPercentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                );
              })()}
              
              {deductibleCategories.map((category) => {
              const reliefData = summary?.byTaxRelief?.[category.value];
              const claimed = reliefData?.amount || 0;
              const claimedCapped = Math.min(claimed, category.limit);
              const remaining = category.limit - claimedCapped;
              const percentage = (claimedCapped / category.limit) * 100;
              const isMaxed = claimedCapped >= category.limit;
              
              return (
                <div 
                  key={category.value}
                  className={`glass-card p-5 transition-all duration-200 hover:border-midnight-600 ${
                    isMaxed ? 'border-green-500/30' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <h3 className="font-medium text-sm">{category.label}</h3>
                    </div>
                    {isMaxed && (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    )}
                  </div>
                  
                  <div className="mb-3">
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-xl font-bold font-mono" style={{ color: category.color }}>
                        {formatCurrency(claimedCapped)}
                      </span>
                      <span className="text-sm text-midnight-400">
                        / {formatCurrency(category.limit)}
                      </span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="h-2 bg-midnight-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${Math.min(100, percentage)}%`,
                          backgroundColor: category.color
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-midnight-400">
                      {isMaxed ? (
                        <span className="text-green-400">Limit reached!</span>
                      ) : (
                        <>Remaining: <span className="font-mono text-white">{formatCurrency(remaining)}</span></>
                      )}
                    </span>
                    <span className="font-mono text-midnight-500">
                      {percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })}
            </>
          )}
        </div>

        {/* Link to Transactions */}
        <div className="mt-8 text-center">
          <Link
            href="/transactions"
            className="inline-flex items-center gap-2 px-6 py-3 bg-midnight-800 hover:bg-midnight-700 rounded-xl transition-colors"
          >
            View All Transactions
          </Link>
        </div>
      </main>
    </div>
  );
}

