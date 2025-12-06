"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSidebar } from "@/context/SidebarContext";
import { Sidebar } from "@/components/Sidebar";
import {
  TransactionCard,
  TransactionCardSkeleton,
} from "@/components/TransactionCard";
import { api, Transaction, TransactionSummary, SyncStatus } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import {
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { FloatingAddButton } from "@/components/FloatingAddButton";
import { ReceiptScannerModal } from "@/components/ReceiptScannerModal";

// New Dashboard Components
import { TaxHealthCard } from "@/components/dashboard/TaxHealthCard";
import { ActionCenter } from "@/components/dashboard/ActionCenter";
import { ReliefProgressList } from "@/components/dashboard/ReliefProgressList";
import { FilingReadinessWidget } from "@/components/dashboard/FilingReadinessWidget";

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

  const [selectedYear, setSelectedYear] = useState<number>(
    getCurrentFilingYear()
  );
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>(
    []
  );
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const { isCollapsed: sidebarCollapsed } = useSidebar();
  const [isReceiptScannerOpen, setIsReceiptScannerOpen] = useState(false);
  const [annualSalary, setAnnualSalary] = useState<number>(0);

  // Load salary from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("user-annual-salary");
    if (stored) {
      setAnnualSalary(parseFloat(stored));
    }
  }, []);

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
      console.error("Error fetching data:", error);
    } finally {
      setIsLoadingData(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/");
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
        message: `Scanned ${
          result.totalEmails || result.processed
        } emails, found ${result.transactions} transactions`,
      });
      // Refresh data after sync
      await fetchData();
    } catch (error: any) {
      setSyncResult({
        success: false,
        message: error.message || "Failed to sync emails",
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

  // Check if we're in filing period (March-April)
  const now = new Date();
  const isFilingPeriod = now.getMonth() >= 2 && now.getMonth() <= 3; // March = 2, April = 3

  return (
    <div className="min-h-screen mesh-bg">
      <Sidebar />

      <main
        className={`px-4 py-6 md:p-8 transition-all duration-300 ${
          sidebarCollapsed ? "md:ml-20" : "md:ml-64"
        } ml-0 pt-16 md:pt-8`}
      >
        {/* Header / Action Center */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold mb-1">
              Dashboard
            </h1>
            <p className="text-sm text-midnight-400">
              Tax overview for Year of Assessment {selectedYear}
            </p>
          </div>

          <div className="w-full lg:w-auto">
            <ActionCenter
              selectedYear={selectedYear}
              availableYears={availableYears}
              onYearChange={setSelectedYear}
              onSync={handleSync}
              isSyncing={isSyncing}
            />
          </div>
        </div>

        {/* Notifications Area */}
        {syncResult && (
          <div
            className={`mb-6 px-4 py-3 rounded-lg flex items-center gap-3 text-sm animate-in fade-in slide-in-from-top-2 ${
              syncResult.success
                ? "bg-accent-500/10 border border-accent-500/20 text-accent-400"
                : "bg-coral-500/10 border border-coral-500/20 text-coral-400"
            }`}
          >
            {syncResult.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{syncResult.message}</span>
          </div>
        )}

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 items-start">
          {/* Top Row - Tax Health Hero (Full Width or Top Section) */}
          {/* In this 3-col layout, we can make it span 3 cols */}
          <div className="lg:col-span-3">
            <TaxHealthCard
              annualSalary={annualSalary}
              totalTaxRelief={summary?.totalTaxRelief || 0}
              isLoading={isLoadingData}
            />
          </div>

          {/* Middle Row */}
          {/* Relief Progress (2/3) */}
          <div className="lg:col-span-2">
            <ReliefProgressList
              reliefs={summary?.byTaxRelief || {}}
              isLoading={isLoadingData}
            />
          </div>

          {/* Filing Readiness (1/3) */}
          <div className="lg:col-span-1">
            <FilingReadinessWidget
              annualSalary={annualSalary}
              hasTransactions={recentTransactions.length > 0}
              filingYear={selectedYear}
              currentYear={now.getFullYear()}
              isFilingPeriod={isFilingPeriod}
            />
          </div>

          {/* Bottom Row - Recent Activity (Full Width) */}
          <div className="lg:col-span-3">
            <div className="glass-card p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base md:text-lg font-semibold">
                  Recent Transactions
                </h2>
                <Link
                  href="/transactions"
                  className="flex items-center gap-1 text-accent-400 hover:text-accent-300 text-xs md:text-sm font-medium transition-colors"
                >
                  View all
                  <ArrowRight className="w-3 h-3 md:w-4 md:h-4" />
                </Link>
              </div>

              <div className="space-y-2 md:space-y-3">
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
                      onClick={() =>
                        router.push(`/transactions?id=${transaction.id}`)
                      }
                    />
                  ))
                ) : (
                  <div className="text-center py-8 text-midnight-400">
                    <p className="mb-3 text-sm">No transactions found</p>
                    <button
                      onClick={handleSync}
                      disabled={isSyncing}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-accent-500/10 hover:bg-accent-500/20 rounded-lg text-accent-400 text-sm transition-colors"
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`}
                      />
                      Sync Gmail
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Add Button */}
      <FloatingAddButton onClick={() => setIsReceiptScannerOpen(true)} />

      {/* Receipt Scanner Modal */}
      <ReceiptScannerModal
        isOpen={isReceiptScannerOpen}
        onClose={() => setIsReceiptScannerOpen(false)}
        onTransactionCreated={() => {
          fetchData();
        }}
      />
    </div>
  );
}
