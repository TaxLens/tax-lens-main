"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Mail, Receipt, Calculator, Shield, Sparkles, FileText, Zap, ExternalLink, Server } from "lucide-react";

const WARMUP_DURATION = 35; // seconds

export default function HomePage() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const router = useRouter();
  const [isWarmingUp, setIsWarmingUp] = useState(true);
  const [warmupProgress, setWarmupProgress] = useState(0);
  const [backendReady, setBackendReady] = useState(false);

  // Backend warmup with repeated pings
  useEffect(() => {
    let pingInterval: NodeJS.Timeout;
    let progressInterval: NodeJS.Timeout;
    let warmupTimeout: NodeJS.Timeout;

    const pingBackend = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/health`);
        if (res.ok) {
          setBackendReady(true);
          // Backend is ready, can skip warmup now
          setTimeout(() => {
            setIsWarmingUp(false);
            clearInterval(pingInterval);
            clearInterval(progressInterval);
            clearTimeout(warmupTimeout);
          }, 1500); // Small delay to show "Backend ready" message
        }
      } catch (err) {
        // Backend not ready yet, continue pinging
      }
    };

    // Start pinging immediately
    pingBackend();

    // Ping every second
    pingInterval = setInterval(pingBackend, 1000);

    // Update progress bar
    progressInterval = setInterval(() => {
      setWarmupProgress(prev => {
        const newProgress = prev + (100 / WARMUP_DURATION);
        return Math.min(newProgress, 100);
      });
    }, 1000);

    // End warmup after duration
    warmupTimeout = setTimeout(() => {
      setIsWarmingUp(false);
      clearInterval(pingInterval);
      clearInterval(progressInterval);
    }, WARMUP_DURATION * 1000);

    return () => {
      clearInterval(pingInterval);
      clearInterval(progressInterval);
      clearTimeout(warmupTimeout);
    };
  }, []);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  // Warmup loading screen
  if (isWarmingUp) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center mesh-bg">
        {/* Animated background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-accent-500/10 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-coral-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "1s" }} />
        </div>

        <div className="relative z-10 flex flex-col items-center">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center">
              <Image src="/logo.png" alt="TaxLens" width={64} height={64} />
            </div>
          </div>

          <h1 className="font-display text-3xl font-bold gradient-text mb-2">TaxLens</h1>
          <p className="text-midnight-400 mb-8">Preparing your experience...</p>

          {/* Progress bar */}
          <div className="w-64 h-2 bg-midnight-800 rounded-full overflow-hidden mb-4">
            <div 
              className="h-full bg-gradient-to-r from-accent-500 to-accent-400 transition-all duration-1000 ease-linear"
              style={{ width: `${warmupProgress}%` }}
            />
          </div>

          {/* Status indicators */}
          <div className="flex flex-col items-center gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Server className={`w-4 h-4 ${backendReady ? 'text-green-400' : 'text-accent-400 animate-pulse'}`} />
              <span className={backendReady ? 'text-green-400' : 'text-midnight-400'}>
                {backendReady ? 'Backend ready' : 'Waking up server...'}
              </span>
            </div>
          </div>

        </div>
      </div>
    );
  }

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
        <div
          className="absolute bottom-20 right-10 w-96 h-96 bg-coral-500/10 rounded-full blur-3xl animate-pulse-slow"
          style={{ animationDelay: "1s" }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-midnight-800/50 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
            <Image src="/logo.png" alt="TaxLens" width={40} height={40} />
          </div>
          <span className="font-display text-2xl font-bold gradient-text">
            TaxLens
          </span>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-12 pb-24">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-midnight-800/60 border border-midnight-700 mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-accent-400 animate-pulse" />
            <span className="text-sm text-midnight-300">
              AI-Powered Malaysian Tax Relief Tracker
            </span>
          </div>

          <h1
            className="font-display text-4xl md:text-6xl font-bold mb-6 leading-tight animate-slide-up"
            style={{ animationDelay: "0.1s" }}
          >
            Stop Losing Money on{" "}
            <span className="gradient-text">Missed Tax Relief</span>
          </h1>

          <p
            className="text-xl text-midnight-300 mb-8 leading-relaxed animate-slide-up max-w-3xl mx-auto"
            style={{ animationDelay: "0.2s" }}
          >
            Receipts scattered across emails, photos, and drawers? TaxLens automatically extracts, categorizes, and tracks your claimable receipts for Malaysian tax relief. No manual entry. No missing deductions.
          </p>

          {/* Problem Stats */}
          <div 
            className="flex flex-wrap justify-center gap-6 mb-10 animate-slide-up"
            style={{ animationDelay: "0.25s" }}
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-coral-500/10 border border-coral-500/20">
              <span className="text-coral-400 font-semibold">17M</span>
              <span className="text-midnight-400 text-sm">labor force</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-coral-500/10 border border-coral-500/20">
              <span className="text-coral-400 font-semibold">Only 5.7M</span>
              <span className="text-midnight-400 text-sm">pay income tax</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-coral-500/10 border border-coral-500/20">
              <span className="text-coral-400 font-semibold">#2 Lowest</span>
              <span className="text-midnight-400 text-sm">tax-to-GDP in ASEAN</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <button
              onClick={login}
              className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-accent-500 to-accent-600 rounded-2xl font-semibold text-lg text-white transition-all duration-300 hover:shadow-lg hover:shadow-accent-500/25 hover:scale-105 btn-glow"
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
              Connect Gmail & Start Tracking
              <span className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            <a
              href="https://github.com/TaxLens/tax-lens-main/blob/master/TESTING.md"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative inline-flex items-center gap-2 px-8 py-4 bg-midnight-800/50 border border-midnight-700 rounded-2xl font-semibold text-lg text-white hover:bg-midnight-700/50 transition-all duration-300"
            >
              <FileText className="w-5 h-5 text-accent-400" />
              View Testing Guide
              <ExternalLink className="w-4 h-4 text-midnight-400 group-hover:text-white transition-colors" />
            </a>
          </div>

          <p className="text-midnight-500 text-sm mt-4 animate-slide-up" style={{ animationDelay: "0.35s" }}>
            Read-only access. We never send or modify your emails.
          </p>
        </div>

        {/* How It Works */}
        <div className="mt-20">
          <h2 className="text-center font-display text-2xl font-bold mb-12 animate-slide-up" style={{ animationDelay: "0.4s" }}>
            How TaxLens Works
          </h2>
          <div className="grid md:grid-cols-4 gap-4">
            <StepCard
              step="1"
              icon={<Mail className="w-5 h-5" />}
              title="Connect Gmail"
              description="Securely link your email with OAuth"
              delay="0.45s"
            />
            <StepCard
              step="2"
              icon={<Sparkles className="w-5 h-5" />}
              title="AI Scans Receipts"
              description="Claude AI extracts transaction details"
              delay="0.5s"
            />
            <StepCard
              step="3"
              icon={<FileText className="w-5 h-5" />}
              title="Auto-Categorize"
              description="Matched to LHDN tax relief categories"
              delay="0.55s"
            />
            <StepCard
              step="4"
              icon={<Calculator className="w-5 h-5" />}
              title="Track Relief"
              description="See your accumulated tax savings"
              delay="0.6s"
            />
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mt-20">
          <FeatureCard
            icon={<Receipt className="w-6 h-6" />}
            title="Auto Receipt Detection"
            description="AI scans emails for purchase receipts, invoices, and payment confirmations - no manual upload needed"
            delay="0.65s"
          />
          <FeatureCard
            icon={<Calculator className="w-6 h-6" />}
            title="Tax Relief Tracking"
            description="Automatically categorizes spending into Malaysian tax relief categories with real-time limit tracking"
            delay="0.7s"
          />
          <FeatureCard
            icon={<Shield className="w-6 h-6" />}
            title="Privacy First"
            description="Read-only Gmail access. Your data stays secure. We never send, modify, or store your email content"
            delay="0.75s"
          />
        </div>

        {/* Tax Relief Categories Preview */}
        <div
          className="mt-20 glass-card p-8 animate-slide-up"
          style={{ animationDelay: "0.8s" }}
        >
          <h3 className="text-center font-display text-xl font-bold mb-6">Malaysian Tax Relief Categories We Track</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ReliefCategory name="Lifestyle" limit="RM 2,500" />
            <ReliefCategory name="Medical" limit="RM 10,000" />
            <ReliefCategory name="Education" limit="RM 7,000" />
            <ReliefCategory name="Insurance & EPF" limit="RM 7,000" />
            <ReliefCategory name="Childcare" limit="RM 3,000" />
            <ReliefCategory name="Sports" limit="RM 1,000" />
            <ReliefCategory name="Domestic Travel" limit="RM 1,000" />
            <ReliefCategory name="EV Charging" limit="RM 2,500" />
          </div>
        </div>

        {/* Sample Stats */}
        <div
          className="mt-12 glass-card p-8 animate-slide-up"
          style={{ animationDelay: "0.85s" }}
        >
          <h3 className="text-center font-display text-lg font-semibold mb-6 text-midnight-400">Sample Dashboard Preview</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatPreview label="Tax Relief Claimed" value="RM 8,420" />
            <StatPreview label="Transactions Found" value="47" />
            <StatPreview label="Categories Used" value="6 / 20" />
            <StatPreview label="Potential Savings" value="RM 1,263" />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-8 text-midnight-400 text-sm">
        <p>Built with Claude AI for intelligent receipt detection & tax categorization</p>
      </footer>
    </div>
  );
}

function StepCard({
  step,
  icon,
  title,
  description,
  delay,
}: {
  step: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: string;
}) {
  return (
    <div
      className="relative glass-card p-5 animate-slide-up group hover:border-accent-500/30 transition-all"
      style={{ animationDelay: delay }}
    >
      <div className="absolute -top-3 -left-3 w-7 h-7 rounded-full bg-accent-500 flex items-center justify-center text-white text-sm font-bold">
        {step}
      </div>
      <div className="w-10 h-10 rounded-lg bg-accent-500/10 flex items-center justify-center text-accent-400 mb-3 group-hover:bg-accent-500/20 transition-colors">
        {icon}
      </div>
      <h3 className="font-semibold text-base mb-1">{title}</h3>
      <p className="text-midnight-400 text-xs leading-relaxed">{description}</p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  delay,
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

function ReliefCategory({ name, limit }: { name: string; limit: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-midnight-800/50 border border-midnight-700">
      <span className="text-sm font-medium">{name}</span>
      <span className="text-xs text-accent-400 font-mono">{limit}</span>
    </div>
  );
}

function StatPreview({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl md:text-3xl font-bold font-mono gradient-text">{value}</div>
      <div className="text-midnight-400 text-sm mt-1">{label}</div>
    </div>
  );
}
