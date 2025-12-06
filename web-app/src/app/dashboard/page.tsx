'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import { Sidebar } from '@/components/Sidebar';
import { TransactionCard, TransactionCardSkeleton } from '@/components/TransactionCard';
import { api, Transaction, TransactionSummary, SyncStatus } from '@/lib/api';
import { formatCurrency, getTaxReliefColor } from '@/lib/utils';
import { 
  RefreshCw, 
  CreditCard, 
  Receipt,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  PiggyBank,
  FileText,
  Calendar,
  ChevronDown
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import Link from 'next/link';

// Get available tax years (current year and previous years with potential data)
function getAvailableTaxYears(): number[] {
  const currentYear = new Date().getFullYear();
  // Show current year and 2 previous years
  return [currentYear, currentYear - 1, currentYear - 2];
}

// Determine which tax year is currently in filing period
function getCurrentFilingYear(): number {
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

export default function DashboardPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const router = useRouter();
  
  const [selectedYear, setSelectedYear] = useState<number>(getCurrentFilingYear());
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const { isCollapsed: sidebarCollapsed } = useSidebar();

  const availableYears = getAvailableTaxYears();

  const fetchData = useCallback(async () => {
    try {
      setIsLoadingData(true);
      const [summaryRes, transactionsRes, statusRes] = await Promise.all([
        api.getTransactionSummary({ year: selectedYear }),
        api.getTransactions({ year: selectedYear, limit: 5 }),
        api.getSyncStatus(),
      ]);
      setSummary(summaryRes);
      setRecentTransactions(transactionsRes.transactions);
      setSyncStatus(statusRes);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoadingData(false);
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

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const result = await api.syncEmails(200, selectedYear);
      setSyncResult({
        success: true,
        message: `Scanned ${result.totalEmails || result.processed} emails, found ${result.transactions} transactions`,
      });
      // Refresh data after sync
      await fetchData();
    } catch (error: any) {
      setSyncResult({
        success: false,
        message: error.message || 'Failed to sync emails',
      });
    } finally {
      setIsSyncing(false);
    }
  };

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

  // Prepare tax relief chart data
  const taxReliefData = summary?.byTaxRelief
    ? Object.entries(summary.byTaxRelief)
        .filter(([key]) => key !== 'non_deductible')
        .map(([key, data]) => ({
          name: data.name.length > 20 ? data.name.substring(0, 18) + '...' : data.name,
          fullName: data.name,
          claimed: Math.min(data.amount, data.limit),
          remaining: data.remaining,
          limit: data.limit,
          color: getTaxReliefColor(key),
        }))
        .filter(d => d.claimed > 0)
        .sort((a, b) => b.claimed - a.claimed)
        .slice(0, 8)
    : [];

  // Check if we're in filing period (March-April)
  const now = new Date();
  const isFilingPeriod = now.getMonth() >= 2 && now.getMonth() <= 3; // March = 2, April = 3

  return (
    <div className="min-h-screen mesh-bg">
      <Sidebar />
      
      <main className={`p-8 transition-all duration-300 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'} ml-0 pt-16 md:pt-8`}>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-3xl font-display font-bold">
                Tax Year {selectedYear}
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
                        {year === getCurrentFilingYear() && (
                          <span className="ml-2 text-xs text-accent-400">(filing now)</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <p className="text-midnight-400">
              Malaysian Tax Filing • File by{' '}
              <span className={isFilingPeriod && selectedYear === getCurrentFilingYear() ? 'text-amber-400 font-medium' : ''}>
                30 April {selectedYear + 1}
              </span>
            </p>
          </div>
          
          {/* Sync Button */}
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-6 py-3 bg-accent-500 hover:bg-accent-600 disabled:bg-accent-500/50 rounded-xl font-medium transition-all duration-200 text-white"
          >
            <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Scanning Emails...' : `Sync ${selectedYear} Emails`}
          </button>
        </div>

        {/* Filing Period Alert */}
        {isFilingPeriod && selectedYear === getCurrentFilingYear() && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
            <Calendar className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="text-amber-400 font-medium">Filing Period Active</span>
              <span className="text-midnight-300 ml-2">
                Submit your tax return for YA {selectedYear} by 30 April {selectedYear + 1}
              </span>
            </div>
          </div>
        )}

        {/* Sync Result Message */}
        {syncResult && (
          <div
            className={`mb-6 p-4 rounded-xl flex items-center gap-3 animate-slide-in-right ${
              syncResult.success
                ? 'bg-accent-500/10 border border-accent-500/20 text-accent-400'
                : 'bg-coral-500/10 border border-coral-500/20 text-coral-400'
            }`}
          >
            {syncResult.success ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0" />
            )}
            <span>{syncResult.message}</span>
          </div>
        )}

        {/* Tax Filing Summary Card */}
        <div className="glass-card p-6 mb-8 border-l-4 border-l-accent-500">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-accent-500/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-accent-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Tax Year {selectedYear} Summary</h2>
                  <p className="text-sm text-midnight-400">
                    Assessment Year {selectedYear} • Filing deadline: 30 April {selectedYear + 1}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div>
                  <p className="text-sm text-midnight-400">Total Spending</p>
                  <p className="text-xl font-bold font-mono">{formatCurrency(summary?.total || 0)}</p>
                </div>
                <div>
                  <p className="text-sm text-midnight-400">Transactions</p>
                  <p className="text-xl font-bold font-mono">{summary?.count || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-midnight-400">Tax Relief Eligible</p>
                  <p className="text-xl font-bold font-mono gradient-text">{formatCurrency(summary?.totalTaxRelief || 0)}</p>
                </div>
                <div>
                  <p className="text-sm text-midnight-400">Categories Used</p>
                  <p className="text-xl font-bold font-mono">
                    {Object.keys(summary?.byTaxRelief || {}).filter(k => k !== 'non_deductible' && (summary?.byTaxRelief?.[k]?.amount || 0) > 0).length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="lg:border-l lg:border-midnight-700 lg:pl-6">
              <div className="flex flex-col gap-2">
                <a
                  href="https://mytax.hasil.gov.my/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-accent-500 hover:bg-accent-600 rounded-lg text-white font-medium transition-colors"
                >
                  File on MyTax
                  <ArrowRight className="w-4 h-4" />
                </a>
                <p className="text-xs text-midnight-500 text-center">
                  LHDN e-Filing Portal
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<CreditCard className="w-6 h-6" />}
            label="Total Spending"
            value={formatCurrency(summary?.total || 0)}
            isLoading={isLoadingData}
          />
          <StatCard
            icon={<Receipt className="w-6 h-6" />}
            label="Transactions"
            value={summary?.count?.toString() || '0'}
            isLoading={isLoadingData}
          />
          <StatCard
            icon={<PiggyBank className="w-6 h-6" />}
            label="Tax Relief Eligible"
            value={formatCurrency(summary?.totalTaxRelief || 0)}
            isLoading={isLoadingData}
            highlight
          />
          <StatCard
            icon={<FileText className="w-6 h-6" />}
            label="Categories Claimed"
            value={Object.keys(summary?.byTaxRelief || {}).filter(k => k !== 'non_deductible' && (summary?.byTaxRelief?.[k]?.amount || 0) > 0).length.toString()}
            isLoading={isLoadingData}
          />
        </div>

        {/* Tax Relief Breakdown */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Tax Relief Breakdown (YA {selectedYear})</h2>
            <Link
              href="/transactions"
              className="flex items-center gap-1 text-accent-400 hover:text-accent-300 text-sm font-medium transition-colors"
            >
              View all transactions
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {isLoadingData ? (
            <div className="h-64 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : taxReliefData.length > 0 ? (
            <>
              <div className="h-72 chart-dark-bg">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={taxReliefData} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <XAxis 
                      type="number" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#a1a1aa', fontSize: 12 }}
                      tickFormatter={(value) => `RM${value.toLocaleString()}`}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#a1a1aa', fontSize: 11 }}
                      width={150}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="glass-card px-4 py-3 text-sm">
                              <p className="font-medium mb-1">{data.fullName}</p>
                              <p className="text-accent-400">Claimed: {formatCurrency(data.claimed)}</p>
                              <p className="text-midnight-400">Limit: {formatCurrency(data.limit)}</p>
                              <p className="text-amber-400">Remaining: {formatCurrency(data.remaining)}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="claimed"
                      fill="#3b82f6"
                      radius={[0, 4, 4, 0]}
                      name="Claimed"
                      background={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Tax Relief Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                {Object.entries(summary?.byTaxRelief || {})
                  .filter(([key, data]) => key !== 'non_deductible' && data.amount > 0)
                  .sort(([, a], [, b]) => b.amount - a.amount)
                  .slice(0, 8)
                  .map(([key, data]) => (
                    <div
                      key={key}
                      className="p-4 rounded-xl bg-midnight-800/50 border border-midnight-700"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getTaxReliefColor(key) }}
                        />
                        <span className="text-xs text-midnight-400 truncate">{data.name}</span>
                      </div>
                      <div className="text-lg font-bold font-mono">
                        {formatCurrency(Math.min(data.amount, data.limit))}
                      </div>
                      <div className="text-xs text-midnight-500">
                        of {formatCurrency(data.limit)} limit
                      </div>
                      <div className="mt-2 h-1.5 bg-midnight-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, (data.amount / data.limit) * 100)}%`,
                            backgroundColor: getTaxReliefColor(key),
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-midnight-400">
              <div className="text-center">
                <p className="mb-4">No tax-eligible transactions found yet.</p>
                <button
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-accent-500/10 hover:bg-accent-500/20 rounded-lg text-accent-400 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  Sync your Gmail to detect transactions
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Transactions</h2>
            <Link
              href="/transactions"
              className="flex items-center gap-1 text-accent-400 hover:text-accent-300 text-sm font-medium transition-colors"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-3">
            {isLoadingData ? (
              <>
                <TransactionCardSkeleton />
                <TransactionCardSkeleton />
                <TransactionCardSkeleton />
              </>
            ) : recentTransactions.length > 0 ? (
              recentTransactions.map((transaction) => (
                <TransactionCard
                  key={transaction.id}
                  transaction={transaction}
                  onClick={() => router.push(`/transactions?id=${transaction.id}`)}
                />
              ))
            ) : (
              <div className="text-center py-12 text-midnight-400">
                <p className="mb-4">No transactions found</p>
                <button
                  onClick={handleSync}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-accent-500/10 hover:bg-accent-500/20 rounded-lg text-accent-400 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Sync your Gmail to detect transactions
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sync Status */}
        {syncStatus && (
          <div className="mt-6 text-center text-sm text-midnight-400">
            {syncStatus.lastSyncAt
              ? `Last synced: ${new Date(syncStatus.lastSyncAt).toLocaleString('en-MY')}`
              : 'Never synced'}
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  isLoading,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  isLoading: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={`glass-card p-6 ${highlight ? 'border-accent-500/30' : ''}`}>
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${highlight ? 'bg-accent-500/20 text-accent-300' : 'bg-accent-500/10 text-accent-400'}`}>
          {icon}
        </div>
        <div>
          <p className="text-midnight-400 text-sm">{label}</p>
          {isLoading ? (
            <div className="h-8 w-24 rounded skeleton mt-1" />
          ) : (
            <p className={`text-2xl font-bold font-mono ${highlight ? 'gradient-text' : ''}`}>{value}</p>
          )}
        </div>
      </div>
    </div>
  );
}
