'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Receipt, 
  Settings, 
  LogOut, 
  Sparkles,
  User,
  Menu,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/transactions', icon: Receipt, label: 'Transactions' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { 
    isCollapsed, 
    isMobile, 
    isMobileOpen, 
    setIsMobileOpen, 
    toggleSidebar 
  } = useSidebar();

  // Close mobile sidebar when clicking outside
  const handleOverlayClick = () => {
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={handleOverlayClick}
        />
      )}

      {/* Mobile hamburger button */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 p-2 rounded-xl bg-midnight-900 border border-midnight-800 text-midnight-400 hover:text-midnight-50 hover:bg-midnight-800 transition-all duration-200 md:hidden"
      >
        {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      <aside 
        className={cn(
          'fixed left-0 top-0 h-screen bg-midnight-950 border-r border-midnight-800 flex flex-col z-50 transition-all duration-300 ease-in-out',
          // Desktop behavior
          !isMobile && (isCollapsed ? 'w-20' : 'w-64'),
          // Mobile behavior
          isMobile && (isMobileOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full')
        )}
      >
        {/* Logo & Toggle */}
        <div className={cn(
          'flex items-center border-b border-midnight-800 py-6',
          isCollapsed && !isMobile ? 'px-4 justify-center' : 'px-6 gap-3 justify-between'
        )}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-midnight-950" />
            </div>
            {(!isCollapsed || isMobile) && (
              <span className="font-display text-xl font-bold gradient-text whitespace-nowrap">
                TaxLens
              </span>
            )}
          </div>
          
          {/* Desktop toggle button */}
          {!isMobile && (
            <button
              onClick={toggleSidebar}
              className={cn(
                'p-2 rounded-lg text-midnight-400 hover:text-midnight-50 hover:bg-midnight-800 transition-all duration-200',
                isCollapsed && 'absolute -right-5 top-7 bg-midnight-900 border border-midnight-800 shadow-lg'
              )}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className={cn(
          'flex-1 py-6',
          isCollapsed && !isMobile ? 'px-2' : 'px-4'
        )}>
          <ul className="space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => isMobile && setIsMobileOpen(false)}
                    title={isCollapsed && !isMobile ? item.label : undefined}
                    className={cn(
                      'flex items-center rounded-xl transition-all duration-200',
                      isCollapsed && !isMobile ? 'justify-center p-3' : 'gap-3 px-4 py-3',
                      isActive
                        ? 'bg-accent-500/10 text-accent-400 border border-accent-500/20'
                        : 'text-midnight-400 hover:bg-midnight-800 hover:text-midnight-50'
                    )}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    {(!isCollapsed || isMobile) && (
                      <span className="font-medium whitespace-nowrap">{item.label}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User section */}
        <div className={cn(
          'py-4 border-t border-midnight-800',
          isCollapsed && !isMobile ? 'px-2' : 'px-4'
        )}>
          <div className={cn(
            'flex items-center rounded-xl bg-midnight-900 mb-3',
            isCollapsed && !isMobile ? 'justify-center p-3' : 'gap-3 px-4 py-3'
          )}>
            <div className="w-9 h-9 rounded-full bg-accent-500/20 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-accent-400" />
            </div>
            {(!isCollapsed || isMobile) && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-midnight-500 truncate">{user?.email}</p>
              </div>
            )}
          </div>
          <button
            onClick={logout}
            title={isCollapsed && !isMobile ? 'Sign Out' : undefined}
            className={cn(
              'flex items-center w-full rounded-xl text-midnight-400 hover:bg-coral-500/10 hover:text-coral-400 transition-all duration-200',
              isCollapsed && !isMobile ? 'justify-center p-3' : 'gap-3 px-4 py-3'
            )}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {(!isCollapsed || isMobile) && (
              <span className="font-medium">Sign Out</span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
