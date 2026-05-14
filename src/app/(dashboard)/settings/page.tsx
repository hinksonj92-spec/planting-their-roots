'use client';

import { useApp } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';

export default function SettingsPage() {
  const { parentName, user, signOut } = useApp();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push('/');
  }

  return (
    <div className="py-4 space-y-5">
      <h1 className="text-xl font-bold text-foreground">Settings</h1>
      <Card>
        <p className="text-sm text-muted mb-1">Account</p>
        <p className="font-semibold text-foreground">{parentName}</p>
        {user?.email && (
          <p className="text-xs text-secondary mt-0.5">{user.email}</p>
        )}
      </Card>
      <Card>
        <p className="text-sm font-semibold text-foreground mb-1">About</p>
        <p className="text-sm text-secondary">
          Evergreen Homeschool: Planting Roots is Phase 0 — a developmental formation guide for ages 0-4 that builds the human substrate your child needs for everything that comes next.
        </p>
      </Card>
      <button
        onClick={handleSignOut}
        className="w-full border border-red-200 text-red-600 py-3 px-6 rounded-xl font-semibold text-sm hover:bg-red-50 transition-colors"
      >
        Sign Out
      </button>
    </div>
  );
}
