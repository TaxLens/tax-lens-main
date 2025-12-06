'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import { Sidebar } from '@/components/Sidebar';
import { api, SyncStatus } from '@/lib/api';
import { 
  User, 
  Mail, 
  Clock, 
  Shield, 
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  DollarSign,
  Calculator,
  Info
} from 'lucide-react';
import { 
  formatCurrency, 
  calculateTax, 
  formatTaxBracket, 
  PERSONAL_RELIEF,
  EPF_EMPLOYEE_RATE,
  EPF_RELIEF_LIMIT
} from '@/lib/utils';

const SALARY_STORAGE_KEY = 'user-annual-salary';

export default function SettingsPage() {
  const { isAuthenticated, isLoading: authLoading, user, logout } = useAuth();
  const router = useRouter();
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const { isCollapsed: sidebarCollapsed } = useSidebar();
  
  // Salary state
  const [annualSalary, setAnnualSalary] = useState<number>(0);
  const [salaryInput, setSalaryInput] = useState<string>('');
  const [isSalarySaved, setIsSalarySaved] = useState(false);

  // Load salary from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(SALARY_STORAGE_KEY);
    if (stored) {
      const salary = parseFloat(stored);
      setAnnualSalary(salary);
      setSalaryInput(salary.toString());
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
      return;
    }
    if (isAuthenticated) {
      api.getSyncStatus().then(setSyncStatus).catch(console.error);
    }
  }, [isAuthenticated, authLoading, router]);

  const handleSaveSalary = () => {
    const salary = parseFloat(salaryInput) || 0;
    setAnnualSalary(salary);
    localStorage.setItem(SALARY_STORAGE_KEY, salary.toString());
    setIsSalarySaved(true);
    setTimeout(() => setIsSalarySaved(false), 2000);
  };

  // Calculate tax based on salary (without reliefs for preview)
  const taxCalculation = calculateTax(annualSalary, 0);

  const handleReconnectGmail = async () => {
    setIsReconnecting(true);
    try {
      const { url } = await api.getAuthUrl();
      window.location.href = url;
    } catch (error) {
      console.error('Failed to reconnect:', error);
      setIsReconnecting(false);
    }
  };

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
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold mb-2">Settings</h1>
          <p className="text-midnight-400">Manage your account and preferences</p>
        </div>

        {/* Account Section */}
        <section className="glass-card p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-accent-400" />
            Account
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-midnight-800">
              <div>
                <p className="text-midnight-400 text-sm">Name</p>
                <p className="font-medium">{user?.name || 'Not set'}</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between py-3 border-b border-midnight-800">
              <div>
                <p className="text-midnight-400 text-sm">Email</p>
                <p className="font-medium">{user?.email}</p>
              </div>
              <span className="flex items-center gap-1 text-sm text-accent-400">
                <CheckCircle2 className="w-4 h-4" />
                Verified
              </span>
            </div>
            
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-midnight-400 text-sm">Member since</p>
                <p className="font-medium">
                  {user?.created_at
                    ? new Date(user.created_at).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '-'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Income & Tax Section */}
        <section className="glass-card p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-accent-400" />
            Income & Tax (YA 2024)
          </h2>
          
          <div className="space-y-4">
            {/* Annual Salary Input */}
            <div className="py-3 border-b border-midnight-800">
              <label className="block text-midnight-400 text-sm mb-2">
                Annual Gross Salary (RM)
              </label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-midnight-500">RM</span>
                  <input
                    type="number"
                    value={salaryInput}
                    onChange={(e) => setSalaryInput(e.target.value)}
                    placeholder="e.g. 60000"
                    className="w-full pl-12 pr-4 py-3 bg-midnight-800 border border-midnight-700 rounded-xl text-white placeholder-midnight-500 focus:outline-none focus:border-accent-500 transition-colors"
                  />
                </div>
                <button
                  onClick={handleSaveSalary}
                  className="px-6 py-3 bg-accent-500 hover:bg-accent-600 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                >
                  {isSalarySaved ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Saved
                    </>
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </div>

            {/* Tax Bracket Preview */}
            {annualSalary > 0 && (
              <>
                <div className="flex items-center justify-between py-3 border-b border-midnight-800">
                  <div>
                    <p className="text-midnight-400 text-sm">Your Tax Bracket</p>
                    <p className="font-medium text-accent-400">
                      {formatTaxBracket(taxCalculation.bracketInfo.bracketIndex)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-midnight-400 text-sm">Marginal Rate</p>
                    <p className="font-mono font-bold text-lg">{taxCalculation.bracketInfo.marginalRate}%</p>
                  </div>
                </div>

                {/* EPF Contribution Breakdown */}
                <div className="py-3 border-b border-midnight-800">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-midnight-400 text-sm">EPF Contribution ({(EPF_EMPLOYEE_RATE * 100).toFixed(0)}% of salary)</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 p-3 bg-midnight-800/50 rounded-lg">
                    <div>
                      <p className="text-midnight-500 text-xs">Monthly</p>
                      <p className="font-mono font-medium">{formatCurrency(taxCalculation.epfDetails.monthlyEPF)}</p>
                    </div>
                    <div>
                      <p className="text-midnight-500 text-xs">Annual</p>
                      <p className="font-mono font-medium">{formatCurrency(taxCalculation.epfDetails.annualEPF)}</p>
                    </div>
                    <div>
                      <p className="text-midnight-500 text-xs">Tax Relief (max {formatCurrency(EPF_RELIEF_LIMIT)})</p>
                      <p className="font-mono font-medium text-accent-400">{formatCurrency(taxCalculation.epfDetails.epfTaxRelief)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-midnight-800">
                  <div>
                    <p className="text-midnight-400 text-sm">Personal Relief</p>
                    <p className="font-medium">{formatCurrency(PERSONAL_RELIEF)}</p>
                  </div>
                  <Calculator className="w-5 h-5 text-midnight-500" />
                </div>

                <div className="flex items-center justify-between py-3 border-b border-midnight-800">
                  <div>
                    <p className="text-midnight-400 text-sm">Total Automatic Deductions</p>
                    <p className="font-mono font-medium text-accent-400">
                      {formatCurrency(PERSONAL_RELIEF + taxCalculation.epfDetails.epfTaxRelief)}
                    </p>
                    <p className="text-xs text-midnight-500">Personal + EPF Relief</p>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-midnight-400 text-sm">Estimated Tax (before other deductions)</p>
                    <p className="font-mono font-bold text-xl text-amber-400">
                      {formatCurrency(taxCalculation.taxPayable)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-midnight-400 text-sm">Effective Rate</p>
                    <p className="font-mono">{taxCalculation.effectiveRate}%</p>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="mt-4 p-4 bg-midnight-800/50 rounded-xl flex items-start gap-3">
            <Info className="w-5 h-5 text-accent-400 shrink-0 mt-0.5" />
            <p className="text-sm text-midnight-400">
              EPF contribution is calculated at {(EPF_EMPLOYEE_RATE * 100).toFixed(0)}% of your salary (employee rate for under 60 years old).
              Tax relief for EPF is capped at {formatCurrency(EPF_RELIEF_LIMIT)} per year.
              Additional tax relief from your tracked transactions will be applied on the Dashboard.
            </p>
          </div>
        </section>

        {/* Gmail Integration Section */}
        <section className="glass-card p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-accent-400" />
            Gmail Integration
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-midnight-800">
              <div>
                <p className="text-midnight-400 text-sm">Connection Status</p>
                <p className="font-medium flex items-center gap-2">
                  {syncStatus?.gmailConnected ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-green-400" />
                      Connected
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      Not connected
                    </>
                  )}
                </p>
              </div>
              <button
                onClick={handleReconnectGmail}
                disabled={isReconnecting}
                className="flex items-center gap-2 px-4 py-2 bg-midnight-800 hover:bg-midnight-700 rounded-lg text-sm transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isReconnecting ? 'animate-spin' : ''}`} />
                {isReconnecting ? 'Reconnecting...' : 'Reconnect'}
              </button>
            </div>
            
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-midnight-400 text-sm">Last Sync</p>
                <p className="font-medium">
                  {syncStatus?.lastSyncAt
                    ? new Date(syncStatus.lastSyncAt).toLocaleString()
                    : 'Never'}
                </p>
              </div>
              <Clock className="w-5 h-5 text-midnight-500" />
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-midnight-800/50 rounded-xl">
            <p className="text-sm text-midnight-400">
              TaxLens only reads your emails to detect transactions. We never send, delete, or modify your emails.
              You can revoke access at any time from your{' '}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-400 hover:text-accent-300 inline-flex items-center gap-1"
              >
                Google Account settings
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>
        </section>

        {/* Privacy & Security Section */}
        <section className="glass-card p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent-400" />
            Privacy & Security
          </h2>
          
          <div className="space-y-4">
            <div className="p-4 bg-midnight-800/50 rounded-xl">
              <h3 className="font-medium mb-2">Data Storage</h3>
              <p className="text-sm text-midnight-400">
                Your transaction data is securely stored in our database. Email content is processed 
                by Claude AI to detect transactions but is not stored permanently.
              </p>
            </div>
            
            <div className="p-4 bg-midnight-800/50 rounded-xl">
              <h3 className="font-medium mb-2">AI Processing</h3>
              <p className="text-sm text-midnight-400">
                We use Claude AI (Anthropic) to analyze emails and detect spending transactions. 
                Only email subject lines and relevant content snippets are processed.
              </p>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="glass-card p-6 border-coral-500/20">
          <h2 className="text-lg font-semibold mb-4 text-coral-400">Danger Zone</h2>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Sign Out</p>
              <p className="text-sm text-midnight-400">Sign out of your account on this device</p>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 bg-coral-500/10 hover:bg-coral-500/20 text-coral-400 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

