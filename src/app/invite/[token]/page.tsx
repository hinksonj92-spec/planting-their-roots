'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/lib/store';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function InviteAcceptPage() {
  const { user, acceptInvite, loading } = useApp();
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'needs_auth'>('loading');
  const [message, setMessage] = useState('');
  const [childName, setChildName] = useState('');

  useEffect(() => {
    if (loading) return;

    if (!user) {
      setStatus('needs_auth');
      // Store invite token so we can process it after login
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('pending_invite', token);
      }
      return;
    }

    async function processInvite() {
      const result = await acceptInvite(token);
      if (result.success) {
        setStatus('success');
        setChildName(result.childName || 'your child');
      } else {
        setStatus('error');
        setMessage(result.error || 'Something went wrong.');
      }
    }

    processInvite();
  }, [user, loading, token, acceptInvite]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="w-14 h-14 rounded-full bg-brand flex items-center justify-center mb-4">
          <span className="text-2xl">🌱</span>
        </div>
        <p className="text-secondary text-sm">Processing invite...</p>
      </div>
    );
  }

  if (status === 'needs_auth') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-xs text-center">
          <div className="w-14 h-14 rounded-full bg-brand flex items-center justify-center mb-4 mx-auto">
            <span className="text-2xl">🌱</span>
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">You&apos;ve been invited!</h1>
          <p className="text-secondary text-sm mb-6">
            Someone wants to share their child&apos;s developmental journey with you. Sign in or create an account to accept the invite.
          </p>
          <Link
            href="/login"
            className="block w-full bg-brand text-white py-3 px-6 rounded-xl font-semibold text-sm text-center hover:bg-brand-dark transition-colors mb-3"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="block w-full border border-brand text-brand py-3 px-6 rounded-xl font-semibold text-sm text-center hover:bg-brand-light/30 transition-colors"
          >
            Create Account
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-xs text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4 mx-auto">
            <span className="text-3xl">✓</span>
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">You&apos;re connected!</h1>
          <p className="text-secondary text-sm mb-6">
            You now have access to {childName}&apos;s developmental journey. Welcome to the team.
          </p>
          <button
            onClick={() => router.push('/home')}
            className="w-full bg-brand text-white py-3 px-6 rounded-xl font-semibold text-sm hover:bg-brand-dark transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-xs text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4 mx-auto">
          <span className="text-3xl">✗</span>
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">Invite issue</h1>
        <p className="text-secondary text-sm mb-6">{message}</p>
        <Link
          href="/home"
          className="block w-full bg-brand text-white py-3 px-6 rounded-xl font-semibold text-sm text-center hover:bg-brand-dark transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
