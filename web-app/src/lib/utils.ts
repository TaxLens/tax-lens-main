import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | null, currency: string = 'MYR'): string {
  if (amount === null) return '-';
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

export function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-MY', {
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
  { value: 'insurance', label: 'Insurance', color: '#0ea5e9' },
  { value: 'childcare', label: 'Childcare', color: '#f472b6' },
  { value: 'sports', label: 'Sports', color: '#84cc16' },
  { value: 'electronics', label: 'Electronics', color: '#a855f7' },
  { value: 'other', label: 'Other', color: '#64748b' },
] as const;

// Malaysian Tax Relief Categories for YA 2024
export const TAX_RELIEF_CATEGORIES = [
  { value: 'individual', label: 'Individual & Dependent Relatives', limit: 9000, color: '#3b82f6' },
  { value: 'medical_parents', label: 'Medical (Parents)', limit: 8000, color: '#ef4444' },
  { value: 'medical_serious', label: 'Medical (Serious Diseases)', limit: 10000, color: '#dc2626' },
  { value: 'disabled_equipment', label: 'Disabled Equipment', limit: 6000, color: '#7c3aed' },
  { value: 'education_self', label: 'Education (Self)', limit: 7000, color: '#6366f1' },
  { value: 'lifestyle', label: 'Lifestyle', limit: 2500, color: '#ec4899' },
  { value: 'lifestyle_sports', label: 'Lifestyle - Sports', limit: 1000, color: '#84cc16' },
  { value: 'breastfeeding', label: 'Breastfeeding Equipment', limit: 1000, color: '#f472b6' },
  { value: 'childcare', label: 'Childcare Fees', limit: 3000, color: '#14b8a6' },
  { value: 'sspn', label: 'SSPN (Education Savings)', limit: 8000, color: '#0ea5e9' },
  { value: 'life_insurance_epf', label: 'Life Insurance & EPF', limit: 7000, color: '#22c55e' },
  { value: 'private_retirement', label: 'Private Retirement Scheme', limit: 3000, color: '#10b981' },
  { value: 'education_medical_insurance', label: 'Education & Medical Insurance', limit: 3000, color: '#06b6d4' },
  { value: 'socso', label: 'SOCSO Contribution', limit: 350, color: '#f59e0b' },
  { value: 'domestic_travel', label: 'Domestic Tourism', limit: 1000, color: '#8b5cf6' },
  { value: 'ev_charging', label: 'EV Charging Facilities', limit: 2500, color: '#16a34a' },
  { value: 'spouse', label: 'Spouse Relief', limit: 4000, color: '#e11d48' },
  { value: 'child', label: 'Child Relief', limit: 8000, color: '#be185d' },
  { value: 'disabled_spouse', label: 'Disabled Spouse', limit: 5000, color: '#9333ea' },
  { value: 'disabled_child', label: 'Disabled Child', limit: 6000, color: '#7c3aed' },
  { value: 'non_deductible', label: 'Non-Deductible', limit: 0, color: '#64748b' },
] as const;

export function getCategoryColor(category: string | null): string {
  const found = CATEGORIES.find(c => c.value === category);
  return found?.color || '#64748b';
}

export function getCategoryLabel(category: string | null): string {
  const found = CATEGORIES.find(c => c.value === category);
  return found?.label || 'Uncategorized';
}

export function getTaxReliefColor(category: string | null): string {
  const found = TAX_RELIEF_CATEGORIES.find(c => c.value === category);
  return found?.color || '#64748b';
}

export function getTaxReliefLabel(category: string | null): string {
  const found = TAX_RELIEF_CATEGORIES.find(c => c.value === category);
  return found?.label || 'Non-Deductible';
}

export function getTaxReliefLimit(category: string | null): number {
  const found = TAX_RELIEF_CATEGORIES.find(c => c.value === category);
  return found?.limit || 0;
}

export function getCurrentMonthDateRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  const startDate = new Date(year, month, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
  
  return { startDate, endDate };
}

export function getCurrentYearDateRange(): { startDate: string; endDate: string } {
  const year = new Date().getFullYear();
  return {
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
  };
}
