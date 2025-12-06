'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Sparkles } from 'lucide-react';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');
      const error = searchParams.get('error');

      if (error) {
        console.error('Auth error:', error);
        router.push('/?error=auth_failed');
        return;
      }

      if (token) {
        api.setToken(token);
        await refreshUser();
        router.push('/dashboard');
      } else {
        router.push('/');
      }
    };

    handleCallback();
  }, [searchParams, router, refreshUser]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center mesh-bg">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center mx-auto mb-6 animate-pulse">
          <Sparkles className="w-8 h-8 text-midnight-950" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">Signing you in...</h2>
        <p className="text-midnight-400">Please wait while we set up your account</p>
        <div className="mt-8 flex justify-center">
          <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center mesh-bg">
        <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}

