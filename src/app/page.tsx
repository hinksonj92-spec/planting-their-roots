'use client';

import { useApp } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DOMAIN_COLORS, DOMAIN_FULL_NAMES } from '@/lib/utils';
import type { DomainCode } from '@/types';
import Link from 'next/link';
import DateInput from '@/components/ui/DateInput';

const DOMAINS: DomainCode[] = ['LANG', 'MOTR', 'NUMR', 'SOCL', 'ROUT', 'SENS', 'INDP'];

// Check if Supabase is actually configured
function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !!url && !url.includes('placeholder');
}

export default function LandingPage() {
  const { user, isOnboarded, children, setParentName, addChild, completeOnboarding } = useApp();
  const router = useRouter();
  const hasAuth = isSupabaseConfigured();

  // Local-only onboarding state
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [childName, setChildName] = useState('');
  const [birthDate, setBirthDate] = useState('');

  useEffect(() => {
    // If already set up, go to dashboard
    if ((user || isOnboarded) && children.length > 0) {
      router.replace('/home');
    }
    // If authenticated but no children, go to onboarding
    if (hasAuth && user && children.length === 0) {
      router.replace('/onboarding');
    }
  }, [user, isOnboarded, children.length, router, hasAuth]);

  if ((user || isOnboarded) && children.length > 0) return null;

  // --- Local-only onboarding (no Supabase) ---
  if (!hasAuth && step === 1) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-xs">
          <h2 className="text-xl font-bold text-foreground mb-1">What should we call you?</h2>
          <p className="text-secondary text-sm mb-6">Your first name is perfect.</p>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name"
            className="w-full border border-border rounded-xl px-4 py-3 text-foreground bg-card focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 mb-4"
            autoFocus
          />
          <button
            onClick={() => { setParentName(name); setStep(2); }}
            disabled={!name.trim()}
            className="w-full bg-brand text-white py-3 px-6 rounded-xl font-semibold text-sm hover:bg-brand-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  if (!hasAuth && step === 2) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-xs">
          <h2 className="text-xl font-bold text-foreground mb-1">Tell us about your little one</h2>
          <p className="text-secondary text-sm mb-6">We&apos;ll match content to their developmental band.</p>
          <input
            type="text"
            value={childName}
            onChange={e => setChildName(e.target.value)}
            placeholder="Child's name"
            className="w-full border border-border rounded-xl px-4 py-3 text-foreground bg-card focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 mb-3"
            autoFocus
          />
          <label className="block text-sm text-secondary mb-1.5">Date of birth</label>
          <DateInput value={birthDate} onChange={setBirthDate} className="mb-6" />
          <button
            onClick={async () => {
              await addChild(childName.trim(), birthDate);
              completeOnboarding();
              router.push('/home');
            }}
            disabled={!childName.trim() || !birthDate}
            className="w-full bg-brand text-white py-3 px-6 rounded-xl font-semibold text-sm hover:bg-brand-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Start Planting
          </button>
        </div>
      </div>
    );
  }

  // --- Welcome screen ---
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-16 h-16 rounded-full bg-brand flex items-center justify-center mb-6">
        <span className="text-3xl">🌱</span>
      </div>
      <h1 className="text-2xl font-bold text-foreground text-center mb-2">Evergreen Homeschool</h1>
      <p className="text-secondary text-center mb-2 max-w-sm">
        The complete formation system for ages 0–18.
      </p>
      <p className="text-muted text-center text-sm mb-8 max-w-xs">
        Four phases. Twenty-four pillars. One mission: raise sovereign, capable human beings.
      </p>

      <div className="flex flex-wrap justify-center gap-2 mb-8 max-w-xs">
        {DOMAINS.map(code => (
          <span
            key={code}
            className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={{
              backgroundColor: `color-mix(in srgb, ${DOMAIN_COLORS[code]} 15%, white)`,
              color: DOMAIN_COLORS[code],
            }}
          >
            {DOMAIN_FULL_NAMES[code]}
          </span>
        ))}
      </div>

      {hasAuth ? (
        <>
          <Link
            href="/signup"
            className="w-full max-w-xs bg-brand text-white py-3 px-6 rounded-xl font-semibold text-sm text-center hover:bg-brand-dark transition-colors block"
          >
            Get Started
          </Link>
          <p className="text-center text-sm text-muted mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-brand font-medium hover:underline">Log in</Link>
          </p>
        </>
      ) : (
        <button
          onClick={() => setStep(1)}
          className="w-full max-w-xs bg-brand text-white py-3 px-6 rounded-xl font-semibold text-sm hover:bg-brand-dark transition-colors"
        >
          Get Started
        </button>
      )}
    </div>
  );
}
