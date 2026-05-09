'use client';

import { useApp } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { BottomNav } from '@/components/layout/BottomNav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isOnboarded, children: kids, loading } = useApp();
  const router = useRouter();

  // Allow access if authenticated OR if onboarded locally (no Supabase)
  const hasAccess = user || (isOnboarded && kids.length > 0);

  useEffect(() => {
    if (loading) return;
    if (!hasAccess) {
      router.replace('/');
    }
  }, [hasAccess, router, loading]);

  if (loading || !hasAccess) return null;

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
