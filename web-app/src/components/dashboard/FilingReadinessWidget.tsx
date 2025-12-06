"use client";

import { CheckCircle2, Circle, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

interface FilingReadinessWidgetProps {
  annualSalary: number;
  hasTransactions: boolean;
  filingYear: number;
  currentYear: number;
  isFilingPeriod: boolean;
}

export function FilingReadinessWidget({
  annualSalary,
  hasTransactions,
  filingYear,
  currentYear,
  isFilingPeriod
}: FilingReadinessWidgetProps) {
  // Determine steps status
  const steps = [
    {
      id: 'profile',
      label: 'Profile Setup',
      subtext: 'Set annual salary',
      completed: annualSalary > 0,
      action: '/settings'
    },
    {
      id: 'evidence',
      label: 'Evidence Collection',
      subtext: hasTransactions ? 'Transactions found' : 'Sync emails or scan receipts',
      completed: hasTransactions,
      action: null // Main action is sync/scan which is elsewhere
    },
    {
      id: 'filing',
      label: 'Submit Return',
      subtext: isFilingPeriod ? `Due 30 Apr ${currentYear + 1}` : 'Filing opens March 1st',
      completed: false, // Manual check usually
      action: 'https://mytax.hasil.gov.my/',
      external: true
    }
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const progress = (completedCount / (steps.length - 1)) * 100; // Excluding final submission from progress calculation usually

  return (
    <div className="glass-card p-6 flex flex-col">
      <h3 className="font-semibold text-lg mb-1">Filing Readiness</h3>
      <p className="text-xs text-midnight-400 mb-4">Prepare for Year of Assessment {filingYear}</p>

      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start gap-3">
            <div className={`mt-0.5 ${step.completed ? 'text-green-400' : 'text-midnight-600'}`}>
              {step.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${step.completed ? 'text-midnight-200' : 'text-midnight-400'}`}>
                {step.label}
              </p>
              <p className="text-xs text-midnight-500 truncate">
                {step.subtext}
              </p>
            </div>
            {step.action && !step.completed && (
              <Link 
                href={step.action} 
                target={step.external ? "_blank" : undefined}
                className="text-accent-400 hover:text-accent-300 p-1"
              >
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        ))}
      </div>

      {isFilingPeriod && (
        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="text-amber-400 font-medium">Filing Period Active</p>
            <p className="text-amber-400/80">Submit Form BE by 30 April.</p>
          </div>
        </div>
      )}
    </div>
  );
}

