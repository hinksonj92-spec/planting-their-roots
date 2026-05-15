'use client';

import { useApp } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getBandFromBirthDate, getBandShortLabel, DOMAIN_COLORS, DOMAIN_ICONS, DOMAIN_FULL_NAMES } from '@/lib/utils';
import DateInput from '@/components/ui/DateInput';
import type { DomainCode } from '@/types';

const DOMAINS: DomainCode[] = ['LANG', 'MOTR', 'NUMR', 'SOCL', 'ROUT', 'SENS', 'INDP'];

/**
 * 3-screen onboarding for authenticated users with no children.
 * Screen 0: Welcome — what this is, 3 value props
 * Screen 1: Your name
 * Screen 2: Your child — name + DOB → lands on hero home
 */
export default function OnboardingPage() {
  const { user, loading, children, parentName, setParentName, addChild, completeOnboarding } = useApp();
  const router = useRouter();

  const [screen, setScreen] = useState(0);
  const [name, setName] = useState(parentName || '');
  const [childName, setChildName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    if (children.length > 0) router.replace('/home');
  }, [loading, user, children.length, router]);

  if (loading) return null;
  if (!user || children.length > 0) return null;

  // If they already have a name set, skip to screen 2
  const effectiveScreen = screen === 0 ? 0 : (screen === 1 && parentName) ? 2 : screen;

  // ── Progress dots ─────────────────────────────────────────────────

  function ProgressDots({ active }: { active: number }) {
    return (
      <div className="flex items-center justify-center gap-2 mt-6">
        {[0, 1, 2].map(i => (
          <div key={i} className={`w-2 h-2 rounded-full ${i === active ? 'bg-brand' : 'bg-border'}`} />
        ))}
      </div>
    );
  }

  // ── Screen 0: Welcome ─────────────────────────────────────────────

  if (effectiveScreen === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 rounded-full bg-brand mx-auto flex items-center justify-center mb-6">
            <span className="text-4xl">🌱</span>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2">Welcome to Evergreen</h1>
          <p className="text-secondary text-sm mb-6 leading-relaxed">
            Open the app. See what to do. Do it with your child.
            No prep, no lesson plans, no guesswork.
          </p>

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

          <button
            onClick={() => setScreen(1)}
            className="w-full bg-brand text-white py-3 px-6 rounded-xl font-semibold text-sm hover:bg-brand-dark transition-colors"
          >
            Let&apos;s Go
          </button>
          <ProgressDots active={0} />
        </div>
      </div>
    );
  }

  // ── Screen 1: Your Name ───────────────────────────────────────────

  if (effectiveScreen === 1) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <button
            onClick={() => setScreen(0)}
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
                setScreen(2);
              }
            }}
          />

          <button
            onClick={() => { setParentName(name.trim()); setScreen(2); }}
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

  // ── Screen 2: Add Your Child ──────────────────────────────────────

  const previewBand = birthDate ? getBandShortLabel(getBandFromBirthDate(birthDate)) : null;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <button
          onClick={() => setScreen(1)}
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

        {/* Domain preview chips */}
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

        {error && (
          <p className="text-sm text-red-600 text-center mb-2">{error}</p>
        )}

        <button
          onClick={async () => {
            if (!childName.trim() || !birthDate) return;
            setSubmitting(true);
            setError('');
            try {
              await addChild(childName.trim(), birthDate);
              completeOnboarding();
              router.push('/home');
            } catch (err) {
              console.error('Onboarding error:', err);
              setError(err instanceof Error ? err.message : 'Failed to add child. Please try again.');
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
