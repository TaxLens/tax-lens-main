"use client";

import { calculateTax, formatCurrency, PERSONAL_RELIEF } from "@/lib/utils";
import { TrendingDown, TrendingUp, DollarSign, AlertCircle } from "lucide-react";
import Link from "next/link";

interface TaxHealthCardProps {
  annualSalary: number;
  totalTaxRelief: number;
  isLoading: boolean;
}

export function TaxHealthCard({
  annualSalary,
  totalTaxRelief,
  isLoading,
}: TaxHealthCardProps) {
  if (isLoading) {
    return (
      <div className="glass-card p-6 h-full relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-500/5 to-purple-500/5" />
        <div className="relative z-10 space-y-4">
          <div className="h-8 w-1/3 rounded skeleton" />
          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="h-20 rounded skeleton" />
            <div className="h-20 rounded skeleton" />
          </div>
        </div>
      </div>
    );
  }

  // Calculate tax with reliefs applied
  const taxCalculation = calculateTax(annualSalary, totalTaxRelief);
  const taxWithoutRelief = calculateTax(annualSalary, 0);
  const taxSavings = taxWithoutRelief.taxPayable - taxCalculation.taxPayable;
  
  // Calculate relief utilization percentage (approximation based on common reliefs)
  // This is illustrative as total limit varies by profile, but we can show progress relative to income or a baseline
  const effectiveRate = taxCalculation.effectiveRate;

  return (
    <div className="glass-card p-6 h-full relative overflow-hidden group">
      {/* Background ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent-500/10 via-transparent to-purple-500/10 opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
      
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                Tax Pulse
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              </h2>
              <p className="text-sm text-midnight-400">Real-time tax optimization status</p>
            </div>
            {annualSalary === 0 && (
              <Link 
                href="/settings" 
                className="text-xs px-3 py-1.5 bg-accent-500/20 text-accent-400 rounded-lg hover:bg-accent-500/30 transition-colors"
              >
                Set Salary
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Estimated Tax */}
            <div className="space-y-1">
              <p className="text-sm text-midnight-400">Estimated Tax Payable</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-white">
                  {formatCurrency(taxCalculation.taxPayable)}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-midnight-800 text-midnight-400 border border-midnight-700">
                  {effectiveRate}% Rate
                </span>
              </div>
            </div>

            {/* Potential Savings */}
            <div className="space-y-1">
              <p className="text-sm text-midnight-400">Total Tax Savings</p>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold font-mono ${taxSavings > 0 ? 'text-green-400' : 'text-midnight-500'}`}>
                  {formatCurrency(taxSavings)}
                </span>
                {taxSavings > 0 && (
                  <TrendingDown className="w-4 h-4 text-green-400" />
                )}
              </div>
            </div>

            {/* Total Deductions */}
            <div className="space-y-1">
              <p className="text-sm text-midnight-400">Total Deductions</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-accent-400">
                  {formatCurrency(taxCalculation.totalDeductions)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar / Visual Indicator */}
        <div className="mt-6 pt-6 border-t border-midnight-800">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-midnight-400">Tax Relief Utilization</span>
            <span className="text-accent-400 font-medium">
              {totalTaxRelief > 0 ? 'Active' : 'No reliefs found'}
            </span>
          </div>
          <div className="h-2 bg-midnight-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-accent-500 to-purple-500 relative"
              style={{ width: '100%' }} // Showing full bar as "active" gradient, maybe animate or scale based on something meaningful
            >
              <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" />
            </div>
          </div>
          <div className="mt-2 text-xs text-midnight-500 flex items-center gap-1">
             <DollarSign className="w-3 h-3" />
             <span>Based on annual income of {formatCurrency(annualSalary)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

