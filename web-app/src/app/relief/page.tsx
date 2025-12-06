'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import { useYear } from '@/context/YearContext';
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


export default function ReliefPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { isCollapsed: sidebarCollapsed } = useSidebar();
  const { selectedYear, setSelectedYear, availableYears } = useYear();
  
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const [annualSalary, setAnnualSalary] = useState<number>(0);
  
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
      
      <main className={`px-4 py-6 md:p-8 transition-all duration-300 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'} ml-0 pt-16 md:pt-8`}>
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold mb-1">
              Tax Relief Categories
            </h1>
            <p className="text-sm text-midnight-400">
              Track your tax deductions against LHDN limits for YA {selectedYear}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
            {/* Year Selector Pills */}
            <div className="bg-midnight-900/50 p-1 rounded-xl border border-midnight-800 flex items-center gap-1">
              {availableYears.map((year) => (
                <button
                  key={year}
                  onClick={() => handleYearChange(year)}
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
            </div>

            {/* Download Report Button */}
            {!isLoading && (
              <div className="w-full sm:w-auto">
                <PDFDownloadButton
                  year={selectedYear}
                  annualSalary={annualSalary}
                  reliefData={summary?.byTaxRelief || {}}
                  totalTrackedRelief={summary?.totalTaxRelief || 0}
                  userName={user?.name}
                />
              </div>
            )}
          </div>
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

        {/* Categories List View */}
        <div className="glass-card overflow-hidden">
          <div className="p-6 border-b border-midnight-800">
            <h3 className="font-semibold">Relief Categories Breakdown</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-midnight-800 text-xs text-midnight-400 uppercase tracking-wider">
                  <th className="px-6 py-4 font-medium">Category</th>
                  <th className="px-6 py-4 font-medium w-1/3">Usage</th>
                  <th className="px-6 py-4 font-medium text-right">Claimed</th>
                  <th className="px-6 py-4 font-medium text-right">Limit</th>
                  <th className="px-6 py-4 font-medium text-right">Remaining</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-midnight-800/50">
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4"><div className="h-4 w-32 skeleton rounded" /></td>
                      <td className="px-6 py-4"><div className="h-2 w-full skeleton rounded" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-20 skeleton rounded ml-auto" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-20 skeleton rounded ml-auto" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-20 skeleton rounded ml-auto" /></td>
                    </tr>
                  ))
                ) : (
                  <>
                    {(() => {
                      // Prepare standard categories data
                      const categoriesData = deductibleCategories.map(category => {
                        const reliefData = summary?.byTaxRelief?.[category.value];
                        const claimed = reliefData?.amount || 0;
                        const claimedCapped = Math.min(claimed, category.limit);
                        const remaining = category.limit - claimedCapped;
                        const percentage = (claimedCapped / category.limit) * 100;
                        const isMaxed = claimedCapped >= category.limit;
                        
                        return {
                          ...category,
                          claimed: claimedCapped,
                          remaining,
                          percentage,
                          isMaxed,
                          isEPF: false
                        };
                      });

                      // Prepare EPF data
                      const epfClaimed = epfDetails.epfTaxRelief;
                      const epfLimit = EPF_RELIEF_LIMIT;
                      const epfPercentage = (epfClaimed / epfLimit) * 100;
                      const epfRemaining = Math.max(0, epfLimit - epfClaimed);
                      const epfIsMaxed = epfClaimed >= epfLimit;
                      
                      const epfData = {
                        value: 'epf',
                        label: 'EPF (KWSP) Contribution',
                        color: '#22c55e',
                        limit: epfLimit,
                        claimed: epfClaimed,
                        remaining: epfRemaining,
                        percentage: epfPercentage,
                        isMaxed: epfIsMaxed,
                        isEPF: true
                      };

                      // Combine and sort all categories by percentage descending
                      const allCategories = [epfData, ...categoriesData].sort((a, b) => b.percentage - a.percentage);

                      return allCategories.map((item) => (
                        <tr key={item.value} className="group hover:bg-midnight-800/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-8 rounded-full" style={{ backgroundColor: item.color }} />
                              <div>
                                <div className="font-medium text-sm text-white">{item.label}</div>
                                {item.isEPF && annualSalary === 0 && (
                                  <Link href="/settings" className="text-xs text-accent-400 hover:underline block mt-0.5">
                                    Set annual salary
                                  </Link>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="w-full">
                              <div className="flex justify-between text-xs mb-1.5">
                                <span className="text-midnight-400">{item.percentage.toFixed(0)}%</span>
                                {item.isMaxed && <span className="text-green-400 font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Maxed</span>}
                              </div>
                              <div className="h-2 bg-midnight-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${Math.min(100, item.percentage)}%`,
                                    backgroundColor: item.color
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right font-mono text-sm text-white">
                            {formatCurrency(item.claimed)}
                          </td>
                          <td className="px-6 py-4 text-right font-mono text-sm text-midnight-400">
                            {formatCurrency(item.limit)}
                          </td>
                          <td className="px-6 py-4 text-right font-mono text-sm">
                            <span className={item.isMaxed ? 'text-midnight-500' : 'text-white'}>
                              {formatCurrency(item.remaining)}
                            </span>
                          </td>
                        </tr>
                      ));
                    })()}
                  </>
                )}
              </tbody>
            </table>
          </div>
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

