'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Sidebar } from '@/components/Sidebar';
import { TransactionCard, TransactionCardSkeleton } from '@/components/TransactionCard';
import { api, Transaction, TransactionSummary, SyncStatus } from '@/lib/api';
import { formatCurrency, getTaxReliefColor, TAX_RELIEF_CATEGORIES, getCurrentMonthDateRange } from '@/lib/utils';
import { 
  RefreshCw, 
  TrendingUp, 
  CreditCard, 
  Receipt,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  PiggyBank,
  FileText
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

export default function DashboardPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const router = useRouter();
  
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setIsLoadingData(true);
      const [summaryRes, transactionsRes, statusRes] = await Promise.all([
        api.getTransactionSummary(),
        api.getTransactions({ limit: 5 }),
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
  }, []);

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
      const result = await api.syncEmails(200);
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

  const { startDate } = getCurrentMonthDateRange();
  const currentMonth = new Date().toLocaleDateString('en-MY', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen mesh-bg">
      <Sidebar />
      
      <main className="ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold mb-2">
              Tax Relief Dashboard
            </h1>
            <p className="text-midnight-400">
              {currentMonth} - Malaysian Tax Filing (YA 2024)
            </p>
          </div>
          
          {/* Sync Button */}
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-6 py-3 bg-accent-500 hover:bg-accent-600 disabled:bg-accent-500/50 rounded-xl font-medium transition-all duration-200 text-midnight-950"
          >
            <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Scanning Emails...' : 'Sync Gmail'}
          </button>
        </div>

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
            <h2 className="text-lg font-semibold">Tax Relief Breakdown (YA 2024)</h2>
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
              <div className="h-72">
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
