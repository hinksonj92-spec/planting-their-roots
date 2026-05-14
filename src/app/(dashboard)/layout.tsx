'use client';

import { useApp } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { BottomNav } from '@/components/layout/BottomNav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isOnboarded, children: kids, loading } = useApp();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  // Allow access if authenticated OR if onboarded locally (no Supabase)
  const hasAccess = user || (isOnboarded && kids.length > 0);

  useEffect(() => {
    if (loading) return;
    if (!hasAccess && !redirecting) {
      setRedirecting(true);
      // Use window.location for hard redirect to avoid client router issues
      window.location.href = '/';
    }
  }, [hasAccess, loading, redirecting]);

  if (loading || !hasAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center mx-auto mb-3">
            <span className="text-lg">🌱</span>
          </div>
          <p className="text-sm text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="pt-14 pb-20 max-w-lg mx-auto px-4">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
