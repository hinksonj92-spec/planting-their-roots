'use client';

import { createClient } from '@/lib/supabase';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DOMAIN_COLORS, DOMAIN_FULL_NAMES } from '@/lib/utils';
import type { DomainCode } from '@/types';

const DOMAINS: DomainCode[] = ['LANG', 'MOTR', 'NUMR', 'SOCL', 'ROUT', 'SENS', 'INDP'];

export default function SignupPage() {
  const [parentName, setParentName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: parentName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="w-16 h-16 rounded-full bg-brand-light flex items-center justify-center mb-6">
          <span className="text-3xl">✉️</span>
        </div>
        <h1 className="text-xl font-bold text-foreground text-center mb-2">Check your email</h1>
        <p className="text-secondary text-center text-sm max-w-xs mb-6">
          We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then come back here to log in.
        </p>
        <Link
          href="/login"
          className="text-brand font-semibold text-sm hover:underline"
        >
          Go to login
        </Link>
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

        <h1 className="text-xl font-bold text-foreground text-center mb-1">Create your account</h1>
        <p className="text-secondary text-center text-sm mb-6">Join Planting Their Roots</p>

        <div className="flex flex-wrap justify-center gap-1.5 mb-6">
          {DOMAINS.map(code => (
            <span
              key={code}
              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: `color-mix(in srgb, ${DOMAIN_COLORS[code]} 15%, white)`,
                color: DOMAIN_COLORS[code],
              }}
            >
              {DOMAIN_FULL_NAMES[code]}
            </span>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-3">
          <input
            type="text"
            value={parentName}
            onChange={e => setParentName(e.target.value)}
            placeholder="Your first name"
            required
            className="w-full border border-border rounded-xl px-4 py-3 text-foreground bg-card focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
            autoFocus
          />
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email address"
            required
            className="w-full border border-border rounded-xl px-4 py-3 text-foreground bg-card focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password (min 6 characters)"
            required
            minLength={6}
            className="w-full border border-border rounded-xl px-4 py-3 text-foreground bg-card focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
          />
          <button
            type="submit"
            disabled={loading || !parentName.trim() || !email || !password}
            className="w-full bg-brand text-white py-3 px-6 rounded-xl font-semibold text-sm hover:bg-brand-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center text-sm text-muted mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-brand font-medium hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
