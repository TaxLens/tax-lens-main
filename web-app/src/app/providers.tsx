'use client';

import { AuthProvider } from '@/context/AuthContext';
import { SidebarProvider } from '@/context/SidebarContext';
import { YearProvider } from '@/context/YearContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SidebarProvider>
        <YearProvider>
          {children}
        </YearProvider>
      </SidebarProvider>
    </AuthProvider>
  );
}

