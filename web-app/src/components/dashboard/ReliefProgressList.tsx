"use client";

import { formatCurrency, getTaxReliefColor } from "@/lib/utils";
import { ArrowRight, Info } from "lucide-react";
import Link from "next/link";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"; // Assuming we might need to create a simple tooltip if not available, or use browser title for now. 
// Actually, let's stick to standard HTML title or custom hover for simplicity unless shadcn is present.
// Checking project layout... no shadcn/ui components evident in layout, so I'll implement a simple custom tooltip or just use standard UI patterns.

interface ReliefData {
  name: string;
  amount: number;
  limit: number;
  remaining: number;
}

interface ReliefProgressListProps {
  reliefs: Record<string, any>; // Using any for raw data, will process inside
  isLoading: boolean;
}

export function ReliefProgressList({ reliefs, isLoading }: ReliefProgressListProps) {
  if (isLoading) {
    return (
      <div className="glass-card p-6 h-full">
        <div className="flex items-center justify-between mb-6">
          <div className="h-6 w-32 rounded skeleton" />
          <div className="h-4 w-16 rounded skeleton" />
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <div className="h-4 w-24 rounded skeleton" />
                <div className="h-4 w-16 rounded skeleton" />
              </div>
              <div className="h-2 w-full rounded-full skeleton" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const processedReliefs = Object.entries(reliefs)
    .filter(([key]) => key !== "non_deductible")
    .map(([key, data]) => ({
      key,
      name: data.name,
      amount: data.amount,
      limit: data.limit,
      remaining: data.limit - Math.min(data.amount, data.limit),
      claimed: Math.min(data.amount, data.limit),
      percentage: Math.min(100, (data.amount / data.limit) * 100),
      color: getTaxReliefColor(key),
    }))
    .filter((d) => d.limit > 0) // Only show reliefs that have limits (valid ones)
    .sort((a, b) => b.percentage - a.percentage);

  const topReliefs = processedReliefs.slice(0, 6);

  return (
    <div className="glass-card p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-lg">Relief Utilization</h3>
        <Link
          href="/relief"
          className="text-xs flex items-center gap-1 text-accent-400 hover:text-accent-300 transition-colors"
        >
          View All
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {topReliefs.length > 0 ? (
        <div className="space-y-5 overflow-y-auto pr-2 custom-scrollbar flex-1">
          {topReliefs.map((relief) => (
            <div key={relief.key} className="group">
              <div className="flex items-center justify-between mb-1.5 text-sm">
                <span className="text-midnight-100 font-medium truncate max-w-[180px]" title={relief.name}>
                  {relief.name}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-white">
                    {formatCurrency(relief.claimed)}
                  </span>
                  <span className="text-midnight-500 text-xs">
                    / {formatCurrency(relief.limit)}
                  </span>
                </div>
              </div>
              
              <div className="relative h-2.5 bg-midnight-800 rounded-full overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out group-hover:brightness-110"
                  style={{
                    width: `${relief.percentage}%`,
                    backgroundColor: relief.color,
                  }}
                />
              </div>
              
              <div className="flex justify-between mt-1 text-[10px] text-midnight-500 opacity-0 group-hover:opacity-100 transition-opacity">
                <span>{relief.percentage.toFixed(0)}% used</span>
                <span className={relief.remaining > 0 ? "text-green-400" : "text-amber-400"}>
                  {relief.remaining > 0 
                    ? `${formatCurrency(relief.remaining)} left` 
                    : "Maxed out"}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center text-midnight-400 py-8">
          <div className="w-12 h-12 rounded-full bg-midnight-800 flex items-center justify-center mb-3">
            <Info className="w-5 h-5 text-midnight-400" />
          </div>
          <p className="text-sm">No eligible tax reliefs found yet.</p>
          <p className="text-xs mt-1 opacity-60">Transactions with relief categories will appear here.</p>
        </div>
      )}
    </div>
  );
}

