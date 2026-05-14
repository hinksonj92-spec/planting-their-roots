'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const redirectTo = typeof window !== 'undefined'
      ? `${window.location.origin}/auth/reset`
      : '/auth/reset';

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-xs text-center">
          <div className="w-14 h-14 rounded-full bg-brand-light mx-auto flex items-center justify-center mb-4">
            <span className="text-2xl">📧</span>
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Check your email</h1>
          <p className="text-secondary text-sm mb-6">
            We sent a password reset link to <span className="font-medium text-foreground">{email}</span>.
            Click the link in the email to set a new password.
          </p>
          <Link
            href="/login"
            className="text-sm text-brand font-medium hover:underline"
          >
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-xs">
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-full bg-brand flex items-center justify-center">
            <span className="text-2xl">🌱</span>
          </div>
        </div>

        <h1 className="text-xl font-bold text-foreground text-center mb-1">Reset your password</h1>
        <p className="text-secondary text-center text-sm mb-6">
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email address"
            required
            className="w-full border border-border rounded-xl px-4 py-3 text-foreground bg-card focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
            autoFocus
          />
          <button
            type="submit"
            disabled={loading || !email}
            className="w-full bg-brand text-white py-3 px-6 rounded-xl font-semibold text-sm hover:bg-brand-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <p className="text-center text-sm text-muted mt-6">
          <Link href="/login" className="text-brand font-medium hover:underline">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
