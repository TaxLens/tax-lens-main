'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Sidebar } from '@/components/Sidebar';
import { TransactionCard, TransactionCardSkeleton } from '@/components/TransactionCard';
import { api, Transaction, TransactionSummary, SyncStatus } from '@/lib/api';
import { formatCurrency, getCategoryColor, CATEGORIES } from '@/lib/utils';
import { 
  RefreshCw, 
  TrendingUp, 
  CreditCard, 
  Calendar,
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
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
      const result = await api.syncEmails(30);
      setSyncResult({
        success: true,
        message: `Found ${result.transactions} new transactions from ${result.processed} emails`,
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

  // Prepare chart data
  const categoryData = summary?.byCategory
    ? Object.entries(summary.byCategory).map(([category, amount]) => ({
        name: CATEGORIES.find(c => c.value === category)?.label || category,
        value: amount,
        color: getCategoryColor(category),
      }))
    : [];

  const monthlyData = summary?.byMonth
    ? Object.entries(summary.byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([month, amount]) => ({
          month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' }),
          amount,
        }))
    : [];

  return (
    <div className="min-h-screen mesh-bg">
      <Sidebar />
      
      <main className="ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold mb-2">
              Welcome back, {user?.name?.split(' ')[0] || 'there'}
            </h1>
            <p className="text-midnight-400">
              Here&apos;s your spending overview
            </p>
          </div>
          
          {/* Sync Button */}
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-6 py-3 bg-accent-500 hover:bg-accent-600 disabled:bg-accent-500/50 rounded-xl font-medium transition-all duration-200 text-midnight-950"
          >
            <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Gmail'}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            icon={<CreditCard className="w-6 h-6" />}
            label="Total Spending"
            value={formatCurrency(summary?.total || 0)}
            isLoading={isLoadingData}
          />
          <StatCard
            icon={<TrendingUp className="w-6 h-6" />}
            label="Transactions"
            value={summary?.count?.toString() || '0'}
            isLoading={isLoadingData}
          />
          <StatCard
            icon={<Calendar className="w-6 h-6" />}
            label="Average"
            value={formatCurrency(summary?.average || 0)}
            isLoading={isLoadingData}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Category Breakdown */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-4">Spending by Category</h2>
            {isLoadingData ? (
              <div className="h-64 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : categoryData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="glass-card px-3 py-2 text-sm">
                              <p className="font-medium">{payload[0].name}</p>
                              <p className="text-accent-400">{formatCurrency(payload[0].value as number)}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-midnight-400">
                No data yet. Sync your emails to get started.
              </div>
            )}
            
            {/* Legend */}
            {categoryData.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-4">
                {categoryData.slice(0, 6).map((cat) => (
                  <div key={cat.name} className="flex items-center gap-2 text-sm">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-midnight-300 truncate">{cat.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Monthly Trend */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-4">Monthly Spending</h2>
            {isLoadingData ? (
              <div className="h-64 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : monthlyData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#9fb3c8', fontSize: 12 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#9fb3c8', fontSize: 12 }}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="glass-card px-3 py-2 text-sm">
                              <p className="text-accent-400">{formatCurrency(payload[0].value as number)}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="amount"
                      fill="#14b8a6"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-midnight-400">
                No data yet. Sync your emails to get started.
              </div>
            )}
          </div>
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
              ? `Last synced: ${new Date(syncStatus.lastSyncAt).toLocaleString()}`
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
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  isLoading: boolean;
}) {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-accent-500/10 flex items-center justify-center text-accent-400">
          {icon}
        </div>
        <div>
          <p className="text-midnight-400 text-sm">{label}</p>
          {isLoading ? (
            <div className="h-8 w-24 rounded skeleton mt-1" />
          ) : (
            <p className="text-2xl font-bold font-mono">{value}</p>
          )}
        </div>
      </div>
    </div>
  );
}

