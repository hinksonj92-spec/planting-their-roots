'use client';

import { useApp } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getBandFromBirthDate, getBandShortLabel } from '@/lib/utils';
import DateInput from '@/components/ui/DateInput';

export default function OnboardingPage() {
  const { user, children, addChild, completeOnboarding } = useApp();
  const router = useRouter();
  const [childName, setChildName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
    if (children.length > 0) {
      router.replace('/home');
    }
  }, [user, children.length, router]);

  if (!user || children.length > 0) return null;

  async function handleSubmit() {
    if (!childName.trim() || !birthDate) return;
    setSubmitting(true);
    await addChild(childName.trim(), birthDate);
    completeOnboarding();
    router.push('/home');
  }

  const previewBand = birthDate ? getBandShortLabel(getBandFromBirthDate(birthDate)) : null;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-xs">
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-full bg-brand flex items-center justify-center">
            <span className="text-2xl">🌱</span>
          </div>
        </div>

        <h2 className="text-xl font-bold text-foreground text-center mb-1">Tell us about your little one</h2>
        <p className="text-secondary text-center text-sm mb-6">
          We&apos;ll match content to their developmental band.
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
          <p className="text-xs text-muted mb-4 text-center">
            Band: <span className="font-semibold text-brand">{previewBand}</span>
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!childName.trim() || !birthDate || submitting}
          className="w-full bg-brand text-white py-3 px-6 rounded-xl font-semibold text-sm hover:bg-brand-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-2"
        >
          {submitting ? 'Setting up...' : 'Start Planting'}
        </button>
      </div>
    </div>
  );
}
