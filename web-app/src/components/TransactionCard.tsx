'use client';

import { Transaction } from '@/lib/api';
import { formatCurrency, formatDate, getCategoryColor, getCategoryLabel } from '@/lib/utils';
import { 
  Utensils, 
  Car, 
  ShoppingBag, 
  Tv, 
  FileText, 
  CreditCard, 
  Plane, 
  Heart, 
  GraduationCap, 
  MoreHorizontal,
  Mail
} from 'lucide-react';

const categoryIcons: Record<string, React.ElementType> = {
  food: Utensils,
  transport: Car,
  shopping: ShoppingBag,
  entertainment: Tv,
  bills: FileText,
  subscription: CreditCard,
  travel: Plane,
  health: Heart,
  education: GraduationCap,
  other: MoreHorizontal,
};

interface TransactionCardProps {
  transaction: Transaction;
  onClick?: () => void;
}

export function TransactionCard({ transaction, onClick }: TransactionCardProps) {
  const Icon = categoryIcons[transaction.category || 'other'] || MoreHorizontal;
  const categoryColor = getCategoryColor(transaction.category);

  return (
    <div
      onClick={onClick}
      className="group glass-card p-4 hover:border-accent-500/30 transition-all duration-200 cursor-pointer"
    >
      <div className="flex items-center gap-4">
        {/* Category Icon */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
          style={{ backgroundColor: `${categoryColor}15` }}
        >
          <Icon className="w-5 h-5" style={{ color: categoryColor }} />
        </div>

        {/* Transaction Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold truncate">
              {transaction.merchant || 'Unknown Merchant'}
            </h3>
            {transaction.confidence_score && transaction.confidence_score < 0.8 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Low confidence
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-midnight-400">
            <span className="flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" />
              <span className="truncate max-w-[200px]">{transaction.email_subject || 'No subject'}</span>
            </span>
          </div>
        </div>

        {/* Amount & Date */}
        <div className="text-right shrink-0">
          <div className="font-mono font-semibold text-lg">
            {formatCurrency(transaction.amount, transaction.currency)}
          </div>
          <div className="text-sm text-midnight-400">
            {formatDate(transaction.transaction_date)}
          </div>
        </div>
      </div>

      {/* Category Badge */}
      <div className="mt-3 flex items-center justify-between">
        <span
          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
          style={{ 
            backgroundColor: `${categoryColor}15`,
            color: categoryColor,
            borderColor: `${categoryColor}30`,
            borderWidth: 1
          }}
        >
          {getCategoryLabel(transaction.category)}
        </span>
        <span className="text-xs text-midnight-500 opacity-0 group-hover:opacity-100 transition-opacity">
          Click to view details
        </span>
      </div>
    </div>
  );
}

export function TransactionCardSkeleton() {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl skeleton" />
        <div className="flex-1">
          <div className="h-5 w-32 rounded skeleton mb-2" />
          <div className="h-4 w-48 rounded skeleton" />
        </div>
        <div className="text-right">
          <div className="h-6 w-20 rounded skeleton mb-2" />
          <div className="h-4 w-16 rounded skeleton" />
        </div>
      </div>
      <div className="mt-3">
        <div className="h-6 w-24 rounded-full skeleton" />
      </div>
    </div>
  );
}

