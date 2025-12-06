'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Mail, TrendingUp, Shield, Sparkles } from 'lucide-react';

export default function HomePage() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center mesh-bg">
        <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen mesh-bg overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-accent-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-coral-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-midnight-800/50 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-midnight-950" />
          </div>
          <span className="font-display text-2xl font-bold gradient-text">TaxLens</span>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-24">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-midnight-800/60 border border-midnight-700 mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-accent-400 animate-pulse" />
            <span className="text-sm text-midnight-300">AI-Powered Transaction Detection</span>
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-bold mb-6 leading-tight animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Track Every Ringgit{' '}
            <span className="gradient-text">Automatically</span>
          </h1>

          <p className="text-xl text-midnight-300 mb-12 leading-relaxed animate-slide-up" style={{ animationDelay: '0.2s' }}>
            Connect your Gmail and let AI detect spending transactions from receipts, 
            invoices, and payment confirmations. No manual entry required.
          </p>

          <button
            onClick={login}
            className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-accent-500 to-accent-600 rounded-2xl font-semibold text-lg text-white transition-all duration-300 hover:shadow-lg hover:shadow-accent-500/25 hover:scale-105 animate-slide-up btn-glow"
            style={{ animationDelay: '0.3s' }}
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
            <span className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mt-24">
          <FeatureCard
            icon={<Mail className="w-6 h-6" />}
            title="Gmail Integration"
            description="Automatically scan your emails for receipts, invoices, and payment confirmations"
            delay="0.4s"
          />
          <FeatureCard
            icon={<TrendingUp className="w-6 h-6" />}
            title="Smart Analytics"
            description="Get insights into your spending patterns with beautiful charts and summaries"
            delay="0.5s"
          />
          <FeatureCard
            icon={<Shield className="w-6 h-6" />}
            title="Privacy First"
            description="Your data stays secure. We only read emails, never send or modify them"
            delay="0.6s"
          />
        </div>

        {/* Stats Preview */}
        <div className="mt-24 glass-card p-8 animate-slide-up" style={{ animationDelay: '0.7s' }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatPreview label="Total Tracked" value="$12,847" />
            <StatPreview label="Transactions" value="234" />
            <StatPreview label="Categories" value="10" />
            <StatPreview label="Avg Monthly" value="$1,284" />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-8 text-midnight-400 text-sm">
        <p>Built with Claude AI for intelligent transaction detection</p>
      </footer>
    </div>
  );
}

function FeatureCard({ 
  icon, 
  title, 
  description, 
  delay 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
  delay: string;
}) {
  return (
    <div 
      className="glass-card p-6 hover:border-accent-500/30 transition-all duration-300 animate-slide-up group"
      style={{ animationDelay: delay }}
    >
      <div className="w-12 h-12 rounded-xl bg-accent-500/10 flex items-center justify-center text-accent-400 mb-4 group-hover:bg-accent-500/20 transition-colors">
        {icon}
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-midnight-300 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function StatPreview({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-bold font-mono gradient-text">{value}</div>
      <div className="text-midnight-400 text-sm mt-1">{label}</div>
    </div>
  );
}

