import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | null, currency: string = 'USD'): string {
  if (amount === null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

export function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatRelativeDate(dateString: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  return formatDate(dateString);
}

export const CATEGORIES = [
  { value: 'food', label: 'Food & Dining', color: '#22c55e' },
  { value: 'transport', label: 'Transport', color: '#3b82f6' },
  { value: 'shopping', label: 'Shopping', color: '#f59e0b' },
  { value: 'entertainment', label: 'Entertainment', color: '#ec4899' },
  { value: 'bills', label: 'Bills & Utilities', color: '#ef4444' },
  { value: 'subscription', label: 'Subscriptions', color: '#8b5cf6' },
  { value: 'travel', label: 'Travel', color: '#06b6d4' },
  { value: 'health', label: 'Health', color: '#10b981' },
  { value: 'education', label: 'Education', color: '#6366f1' },
  { value: 'other', label: 'Other', color: '#64748b' },
] as const;

export function getCategoryColor(category: string | null): string {
  const found = CATEGORIES.find(c => c.value === category);
  return found?.color || '#64748b';
}

export function getCategoryLabel(category: string | null): string {
  const found = CATEGORIES.find(c => c.value === category);
  return found?.label || 'Uncategorized';
}

