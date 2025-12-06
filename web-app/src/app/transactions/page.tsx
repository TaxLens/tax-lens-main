'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import { Sidebar } from '@/components/Sidebar';
import { TransactionCard, TransactionCardSkeleton } from '@/components/TransactionCard';
import { api, Transaction } from '@/lib/api';
import { CATEGORIES, TAX_RELIEF_CATEGORIES, formatCurrency, formatDate, getCategoryColor, getCategoryLabel, getTaxReliefColor, getTaxReliefLabel, getTaxReliefLimit } from '@/lib/utils';
import { 
  Filter, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Calendar,
  Tag,
  Mail,
  Trash2,
  Edit2,
  Save,
  Shield
} from 'lucide-react';

function TransactionsContent() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Transaction>>({});
  
  // Filters
  const [filters, setFilters] = useState({
    category: '',
    taxReliefCategory: '',
    startDate: '',
    endDate: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const { isCollapsed: sidebarCollapsed } = useSidebar();
  
  // Pagination
  const [page, setPage] = useState(0);
  const limit = 20;

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.getTransactions({
        category: filters.category || undefined,
        taxReliefCategory: filters.taxReliefCategory || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        limit,
        offset: page * limit,
      });
      setTransactions(response.transactions);
      setTotal(response.total);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
      return;
    }
    if (isAuthenticated) {
      fetchTransactions();
    }
  }, [isAuthenticated, authLoading, router, fetchTransactions]);

  // Check for transaction ID in URL to open details
  useEffect(() => {
    const id = searchParams.get('id');
    if (id && transactions.length > 0) {
      const found = transactions.find(t => t.id === id);
      if (found) {
        setSelectedTransaction(found);
      }
    }
  }, [searchParams, transactions]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(0);
  };

  const clearFilters = () => {
    setFilters({ category: '', taxReliefCategory: '', startDate: '', endDate: '' });
    setPage(0);
  };

  const handleTransactionClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsEditing(false);
    setEditData({});
    router.push(`/transactions?id=${transaction.id}`, { scroll: false });
  };

  const handleCloseDetails = () => {
    setSelectedTransaction(null);
    setIsEditing(false);
    router.push('/transactions', { scroll: false });
  };

  const handleEdit = () => {
    if (selectedTransaction) {
      setEditData({
        merchant: selectedTransaction.merchant,
        amount: selectedTransaction.amount,
        category: selectedTransaction.category,
        tax_relief_category: selectedTransaction.tax_relief_category,
        transaction_date: selectedTransaction.transaction_date,
        description: selectedTransaction.description,
      });
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!selectedTransaction) return;
    try {
      const { transaction } = await api.updateTransaction(selectedTransaction.id, editData);
      setSelectedTransaction(transaction);
      setTransactions(prev =>
        prev.map(t => (t.id === transaction.id ? transaction : t))
      );
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating transaction:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedTransaction) return;
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    try {
      await api.deleteTransaction(selectedTransaction.id);
      setTransactions(prev => prev.filter(t => t.id !== selectedTransaction.id));
      setTotal(prev => prev - 1);
      handleCloseDetails();
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  const totalPages = Math.ceil(total / limit);
  const hasActiveFilters = filters.category || filters.taxReliefCategory || filters.startDate || filters.endDate;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center mesh-bg">
        <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen mesh-bg">
      <Sidebar />
      
      <main className={`p-8 transition-all duration-300 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'} ml-0 pt-16 md:pt-8`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold mb-2">Transactions</h1>
            <p className="text-midnight-400">
              {total} transaction{total !== 1 ? 's' : ''} found
            </p>
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 ${
              showFilters || hasActiveFilters
                ? 'bg-accent-500/20 text-accent-400 border border-accent-500/30'
                : 'bg-midnight-800/50 text-midnight-300 hover:bg-midnight-800'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-accent-400" />
            )}
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="glass-card p-6 mb-6 animate-slide-up">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm text-midnight-400 mb-2">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="w-full px-4 py-2 bg-midnight-800 border border-midnight-700 rounded-xl text-white focus:border-accent-500 focus:outline-none"
                >
                  <option value="">All Categories</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tax Relief Category Filter */}
              <div>
                <label className="block text-sm text-midnight-400 mb-2">Tax Relief</label>
                <select
                  value={filters.taxReliefCategory}
                  onChange={(e) => handleFilterChange('taxReliefCategory', e.target.value)}
                  className="w-full px-4 py-2 bg-midnight-800 border border-midnight-700 rounded-xl text-white focus:border-accent-500 focus:outline-none"
                >
                  <option value="">All Tax Categories</option>
                  {TAX_RELIEF_CATEGORIES.filter(c => c.value !== 'non_deductible').map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                  <option value="non_deductible">Non-Deductible</option>
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm text-midnight-400 mb-2">From Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="w-full px-4 py-2 bg-midnight-800 border border-midnight-700 rounded-xl text-white focus:border-accent-500 focus:outline-none"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm text-midnight-400 mb-2">To Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="w-full px-4 py-2 bg-midnight-800 border border-midnight-700 rounded-xl text-white focus:border-accent-500 focus:outline-none"
                />
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full px-4 py-2 text-midnight-400 hover:text-white hover:bg-midnight-800 rounded-xl transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transactions List */}
        <div className="space-y-3">
          {isLoading ? (
            <>
              <TransactionCardSkeleton />
              <TransactionCardSkeleton />
              <TransactionCardSkeleton />
              <TransactionCardSkeleton />
              <TransactionCardSkeleton />
            </>
          ) : transactions.length > 0 ? (
            transactions.map((transaction) => (
              <TransactionCard
                key={transaction.id}
                transaction={transaction}
                onClick={() => handleTransactionClick(transaction)}
              />
            ))
          ) : (
            <div className="glass-card p-12 text-center">
              <p className="text-midnight-400 mb-2">No transactions found</p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-accent-400 hover:text-accent-300 text-sm"
                >
                  Clear filters to see all transactions
                </button>
              )}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-2 rounded-lg bg-midnight-800 hover:bg-midnight-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-midnight-400">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-2 rounded-lg bg-midnight-800 hover:bg-midnight-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </main>

      {/* Transaction Details Slide-over */}
      {selectedTransaction && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={handleCloseDetails}
          />
          <div className="fixed right-0 top-0 h-screen w-full max-w-lg bg-midnight-900 border-l border-midnight-800 z-50 animate-slide-in-right overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Transaction Details</h2>
                <button
                  onClick={handleCloseDetails}
                  className="p-2 hover:bg-midnight-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="space-y-6">
                {/* Merchant */}
                <div>
                  <label className="block text-sm text-midnight-400 mb-2">Merchant</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.merchant || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, merchant: e.target.value }))}
                      className="w-full px-4 py-2 bg-midnight-800 border border-midnight-700 rounded-xl text-white focus:border-accent-500 focus:outline-none"
                    />
                  ) : (
                    <p className="text-lg font-medium">
                      {selectedTransaction.merchant || 'Unknown Merchant'}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm text-midnight-400 mb-2">Description</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.description || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-4 py-2 bg-midnight-800 border border-midnight-700 rounded-xl text-white focus:border-accent-500 focus:outline-none"
                    />
                  ) : (
                    <p>{selectedTransaction.description || '-'}</p>
                  )}
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm text-midnight-400 mb-2">Amount</label>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editData.amount || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
                      className="w-full px-4 py-2 bg-midnight-800 border border-midnight-700 rounded-xl text-white focus:border-accent-500 focus:outline-none"
                    />
                  ) : (
                    <p className="text-2xl font-bold font-mono gradient-text">
                      {formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
                    </p>
                  )}
                </div>

                {/* Category */}
                <div>
                  <label className="flex items-center gap-2 text-sm text-midnight-400 mb-2">
                    <Tag className="w-4 h-4" />
                    Category
                  </label>
                  {isEditing ? (
                    <select
                      value={editData.category || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-2 bg-midnight-800 border border-midnight-700 rounded-xl text-white focus:border-accent-500 focus:outline-none"
                    >
                      <option value="">Select category</option>
                      {CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                      style={{
                        backgroundColor: `${getCategoryColor(selectedTransaction.category)}15`,
                        color: getCategoryColor(selectedTransaction.category),
                      }}
                    >
                      {getCategoryLabel(selectedTransaction.category)}
                    </span>
                  )}
                </div>

                {/* Tax Relief Category */}
                <div>
                  <label className="flex items-center gap-2 text-sm text-midnight-400 mb-2">
                    <Shield className="w-4 h-4" />
                    Tax Relief Category
                  </label>
                  {isEditing ? (
                    <select
                      value={editData.tax_relief_category || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, tax_relief_category: e.target.value }))}
                      className="w-full px-4 py-2 bg-midnight-800 border border-midnight-700 rounded-xl text-white focus:border-accent-500 focus:outline-none"
                    >
                      <option value="">Select tax relief category</option>
                      {TAX_RELIEF_CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label} (RM{cat.limit.toLocaleString()} limit)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div>
                      <span
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                        style={{
                          backgroundColor: `${getTaxReliefColor(selectedTransaction.tax_relief_category)}15`,
                          color: getTaxReliefColor(selectedTransaction.tax_relief_category),
                        }}
                      >
                        {getTaxReliefLabel(selectedTransaction.tax_relief_category)}
                      </span>
                      {selectedTransaction.tax_relief_category && selectedTransaction.tax_relief_category !== 'non_deductible' && (
                        <p className="text-sm text-midnight-400 mt-2">
                          Relief limit: {formatCurrency(getTaxReliefLimit(selectedTransaction.tax_relief_category))}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Date */}
                <div>
                  <label className="flex items-center gap-2 text-sm text-midnight-400 mb-2">
                    <Calendar className="w-4 h-4" />
                    Date
                  </label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editData.transaction_date || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, transaction_date: e.target.value }))}
                      className="w-full px-4 py-2 bg-midnight-800 border border-midnight-700 rounded-xl text-white focus:border-accent-500 focus:outline-none"
                    />
                  ) : (
                    <p>{formatDate(selectedTransaction.transaction_date)}</p>
                  )}
                </div>

                {/* Email Info */}
                <div className="pt-4 border-t border-midnight-800">
                  <label className="flex items-center gap-2 text-sm text-midnight-400 mb-2">
                    <Mail className="w-4 h-4" />
                    Source Email
                  </label>
                  <div className="glass-card p-4">
                    <p className="font-medium mb-2">{selectedTransaction.email_subject || 'No subject'}</p>
                    <p className="text-sm text-midnight-400 line-clamp-3">
                      {selectedTransaction.email_snippet || 'No preview available'}
                    </p>
                    {selectedTransaction.email_date && (
                      <p className="text-xs text-midnight-500 mt-2">
                        Received: {new Date(selectedTransaction.email_date).toLocaleString('en-MY', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                      </p>
                    )}
                  </div>
                </div>

                {/* Confidence Score */}
                {selectedTransaction.confidence_score && (
                  <div>
                    <label className="block text-sm text-midnight-400 mb-2">AI Confidence</label>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-midnight-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent-500 rounded-full transition-all duration-500"
                          style={{ width: `${selectedTransaction.confidence_score * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-mono">
                        {Math.round(selectedTransaction.confidence_score * 100)}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleSave}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-accent-500 hover:bg-accent-600 rounded-xl font-medium text-midnight-950 transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        Save Changes
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-3 bg-midnight-800 hover:bg-midnight-700 rounded-xl font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleEdit}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-midnight-800 hover:bg-midnight-700 rounded-xl font-medium transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={handleDelete}
                        className="px-4 py-3 bg-coral-500/10 hover:bg-coral-500/20 text-coral-400 rounded-xl font-medium transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center mesh-bg">
        <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <TransactionsContent />
    </Suspense>
  );
}
