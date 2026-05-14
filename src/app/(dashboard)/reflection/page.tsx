'use client';

import { useState } from 'react';
import { useApp } from '@/lib/store';
import { getWeeklyGuide, getDefaultPhase } from '@/lib/content';
import { DOMAIN_COLORS, DOMAIN_ICONS, DOMAIN_FULL_NAMES, cleanGuideTitle } from '@/lib/utils';
import { ChildSwitcher } from '@/components/ui/ChildSwitcher';
import Link from 'next/link';
import type { DomainCode } from '@/types';

export default function ReflectionPage() {
  const { activeBand, activeChild, activeWeek } = useApp();
  const currentPhase = activeWeek ?? getDefaultPhase();
  const guide = getWeeklyGuide(activeBand, currentPhase);

  const [answers, setAnswers] = useState({ q1: '', q2: '', q3: '', q4: '' });

  if (!guide || !activeChild) return null;

  const domainCode = guide.domain_code as DomainCode;
  const color = DOMAIN_COLORS[domainCode];

  const questions = guide.reflection_questions?.length
    ? guide.reflection_questions
    : [
        `What is ${activeChild.name} doing now that they were not doing last week?`,
        'Which part of our rhythm is strongest?',
        'Which part keeps falling apart?',
        'What did I enjoy most this week?',
      ];

  return (
    <div className="py-4 space-y-4">
      <div>
        <ChildSwitcher />
        <h1 className="text-xl font-bold text-foreground mt-2">Reflection for {activeChild?.name}</h1>
        <p className="text-secondary text-sm mt-0.5">
          {DOMAIN_ICONS[domainCode]} {DOMAIN_FULL_NAMES[domainCode]}
        </p>
      </div>

      <div className="space-y-4">
        {questions.slice(0, 4).map((q, i) => {
          const key = `q${i + 1}` as keyof typeof answers;
          return (
            <div key={i} className="bg-card rounded-2xl border border-border p-4">
              <label className="block text-sm font-medium text-foreground mb-2">{q}</label>
              <textarea
                value={answers[key]}
                onChange={e => setAnswers(prev => ({ ...prev, [key]: e.target.value }))}
                rows={3}
                className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:border-brand resize-none"
                placeholder="Write your observations..."
              />
            </div>
          );
        })}
      </div>

      <div
        className="rounded-2xl p-4 text-center"
        style={{ backgroundColor: `color-mix(in srgb, ${color} 8%, white)` }}
      >
        <p className="text-sm italic" style={{ color }}>
          Your child does not need a perfect week. They need a present parent.
        </p>
      </div>

      <Link
        href="/rhythm-print"
        className="flex items-center justify-center gap-2 p-3 rounded-xl border border-border text-sm text-secondary hover:border-brand/30 hover:text-foreground transition-colors"
      >
        <span>🖨️</span>
        Print this week&apos;s rhythm sheet
      </Link>
    </div>
  );
}
