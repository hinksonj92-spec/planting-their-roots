'use client';

import Link from 'next/link';
import { useApp } from '@/lib/store';
import { getAgeString, getEvergreenPhase, getEvergreenPhaseLabel } from '@/lib/utils';

export function GraduatedState() {
  const { activeChild } = useApp();

  if (!activeChild) return null;

  const evPhase = getEvergreenPhase(activeChild.birth_date);
  const nextPhaseLabel = getEvergreenPhaseLabel(evPhase > 0 ? evPhase : 1);

  return (
    <div className="py-8 text-center space-y-6">
      <div>
        <div className="w-20 h-20 rounded-full bg-brand-light mx-auto flex items-center justify-center mb-4">
          <span className="text-4xl">🌳</span>
        </div>
        <h2 className="text-xl font-bold text-foreground">
          {activeChild.name} has graduated from Planting Roots!
        </h2>
        <p className="text-secondary text-sm mt-2 max-w-sm mx-auto">
          At {getAgeString(activeChild.birth_date)}, {activeChild.name} has moved beyond the Phase 0 developmental content.
          The roots are planted — time to grow.
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border p-5 max-w-sm mx-auto text-left space-y-3">
        <h3 className="font-semibold text-foreground text-sm">What comes next</h3>
        <p className="text-sm text-secondary">
          {activeChild.name} is ready for <span className="font-medium text-brand-dark">{nextPhaseLabel}</span> — the next phase of the Evergreen curriculum with structured pillars, domains, and guided packets.
        </p>
        <Link
          href="/curriculum"
          className="inline-flex items-center gap-2 bg-brand text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-brand-dark transition-colors"
        >
          Browse Curriculum
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      <div className="max-w-sm mx-auto">
        <p className="text-xs text-muted">
          Milestones and progress from Planting Roots are preserved. You can still access chat for guidance.
        </p>
      </div>
    </div>
  );
}
