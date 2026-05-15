'use client';

import { useApp } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DOMAIN_COLORS, DOMAIN_FULL_NAMES, DOMAIN_ICONS, getBandFromBirthDate, getBandShortLabel } from '@/lib/utils';
import type { DomainCode } from '@/types';
import Link from 'next/link';
import DateInput from '@/components/ui/DateInput';

const DOMAINS: DomainCode[] = ['LANG', 'MOTR', 'NUMR', 'SOCL', 'ROUT', 'SENS', 'INDP'];

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !!url && !url.includes('placeholder');
}

function ProgressDots({ active }: { active: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      {[0, 1, 2].map(i => (
        <div key={i} className={`w-2 h-2 rounded-full ${i === active ? 'bg-brand' : 'bg-border'}`} />
      ))}
    </div>
  );
}

export default function LandingPage() {
  const { user, loading, isOnboarded, children, setParentName, addChild, completeOnboarding } = useApp();
  const router = useRouter();
  const hasAuth = isSupabaseConfigured();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [childName, setChildName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (hasAuth && user) {
      if (children.length > 0) {
        router.replace('/home');
      } else {
        router.replace('/onboarding');
      }
      return;
    }
    if (!hasAuth && isOnboarded && children.length > 0) {
      router.replace('/home');
    }
  }, [loading, user, isOnboarded, children.length, router, hasAuth]);

  if (loading) return null;
  if (hasAuth && user) return null;
  if (!hasAuth && isOnboarded && children.length > 0) return null;

  // ── Local Step 1: Your Name ─────────────────────────────────────────

  if (!hasAuth && step === 1) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <button
            onClick={() => setStep(0)}
            className="flex items-center gap-1 text-sm text-muted hover:text-foreground mb-6 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <h2 className="text-xl font-bold text-foreground mb-1">What should we call you?</h2>
          <p className="text-secondary text-sm mb-6">
            Just your first name — we&apos;ll use it to greet you each time you open the app.
          </p>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name"
            className="w-full border border-border rounded-xl px-4 py-3 text-foreground bg-card focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 mb-4"
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter' && name.trim()) {
                setParentName(name.trim());
                setStep(2);
              }
            }}
          />
          <button
            onClick={() => { setParentName(name.trim()); setStep(2); }}
            disabled={!name.trim()}
            className="w-full bg-brand text-white py-3 px-6 rounded-xl font-semibold text-sm hover:bg-brand-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue
          </button>
          <ProgressDots active={1} />
        </div>
      </div>
    );
  }

  // ── Local Step 2: Add Child ─────────────────────────────────────────

  if (!hasAuth && step === 2) {
    const previewBand = birthDate ? getBandShortLabel(getBandFromBirthDate(birthDate)) : null;

    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <button
            onClick={() => setStep(1)}
            className="flex items-center gap-1 text-sm text-muted hover:text-foreground mb-6 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <h2 className="text-xl font-bold text-foreground mb-1">Tell us about your little one</h2>
          <p className="text-secondary text-sm mb-6">
            We&apos;ll match every activity, script, and milestone to their developmental stage.
          </p>
          <input
            type="text"
            value={childName}
            onChange={e => setChildName(e.target.value)}
            placeholder="Child's name"
            className="w-full border border-border rounded-xl px-4 py-3 text-foreground bg-card focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 mb-3"
            autoFocus
          />
          <label className="block text-sm text-secondary mb-1.5">Date of birth</label>
          <DateInput value={birthDate} onChange={setBirthDate} className="mb-2" />

          {previewBand && (
            <p className="text-xs text-muted mb-3 text-center">
              Stage: <span className="font-semibold text-brand">{previewBand}</span>
            </p>
          )}

          <div className="flex flex-wrap gap-1.5 mb-5">
            {DOMAINS.map(code => (
              <span
                key={code}
                className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{
                  backgroundColor: `color-mix(in srgb, ${DOMAIN_COLORS[code]} 12%, white)`,
                  color: DOMAIN_COLORS[code],
                }}
              >
                {DOMAIN_ICONS[code]} {DOMAIN_FULL_NAMES[code]}
              </span>
            ))}
          </div>

          <button
            onClick={async () => {
              setSubmitting(true);
              try {
                await addChild(childName.trim(), birthDate);
                completeOnboarding();
                router.push('/home');
              } catch {
                setSubmitting(false);
              }
            }}
            disabled={!childName.trim() || !birthDate || submitting}
            className="w-full bg-brand text-white py-3 px-6 rounded-xl font-semibold text-sm hover:bg-brand-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Setting up...' : 'Start Planting'}
          </button>
          <ProgressDots active={2} />
        </div>
      </div>
    );
  }

  // ── Welcome screen (Step 0) ─────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <div className="w-20 h-20 rounded-full bg-brand mx-auto flex items-center justify-center mb-6">
          <span className="text-4xl">🌱</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Evergreen Homeschool</h1>
        <p className="text-secondary text-sm mb-6 leading-relaxed">
          Open the app. See what to do. Do it with your child.
          No prep, no lesson plans, no guesswork.
        </p>

        {/* Value props */}
        <div className="space-y-3 mb-8 text-left">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border">
            <span className="text-lg mt-0.5">📋</span>
            <div>
              <p className="text-sm font-semibold text-foreground">Open and go</p>
              <p className="text-xs text-secondary">One moment at a time, matched to your child&apos;s age and the time of day.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border">
            <span className="text-lg mt-0.5">🎯</span>
            <div>
              <p className="text-sm font-semibold text-foreground">Seven developmental domains</p>
              <p className="text-xs text-secondary">Language, motor, numeracy, social, routines, sensory, and independence.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border">
            <span className="text-lg mt-0.5">✅</span>
            <div>
              <p className="text-sm font-semibold text-foreground">Track milestones</p>
              <p className="text-xs text-secondary">Celebrate progress and know what comes next.</p>
            </div>
          </div>
        </div>

        {hasAuth ? (
          <>
            <Link
              href="/signup"
              className="w-full bg-brand text-white py-3 px-6 rounded-xl font-semibold text-sm text-center hover:bg-brand-dark transition-colors block"
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
            className="w-full bg-brand text-white py-3 px-6 rounded-xl font-semibold text-sm hover:bg-brand-dark transition-colors"
          >
            Get Started
          </button>
        )}
        <ProgressDots active={0} />
      </div>
    </div>
  );
}
