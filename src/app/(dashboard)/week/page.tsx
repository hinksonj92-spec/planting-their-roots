'use client';

import { useState } from 'react';
import { useApp } from '@/lib/store';
import { getWeeklyGuide, getDefaultPhase } from '@/lib/content';
import { DOMAIN_COLORS, DOMAIN_ICONS, DOMAIN_FULL_NAMES, getPhaseDomain, cleanGuideTitle } from '@/lib/utils';
import { ChildSwitcher } from '@/components/ui/ChildSwitcher';
import { MomentSection } from '@/components/content/MomentSection';
import { GraduatedState } from '@/components/content/GraduatedState';
import type { DomainCode } from '@/types';

const TOTAL_PHASES = 7;

function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  color,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  color?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <svg
          className={`w-4 h-4 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border-light">
          {children}
        </div>
      )}
    </div>
  );
}

export default function WeekPage() {
  const { activeBand, activeChild, activeWeek, isGraduated } = useApp();
  const [currentPhase, setCurrentPhase] = useState(activeWeek ?? getDefaultPhase());

  if (isGraduated) return <div className="py-4"><ChildSwitcher /><GraduatedState /></div>;

  const guide = getWeeklyGuide(activeBand, currentPhase);
  if (!guide) return <div className="py-8 text-center text-muted">No guide found.</div>;

  const domainCode = guide.domain_code as DomainCode;
  const color = DOMAIN_COLORS[domainCode];

  const canPrev = currentPhase > 1;
  const canNext = currentPhase < TOTAL_PHASES;

  return (
    <div className="py-4 space-y-4">
      <ChildSwitcher />

      {/* Progress bar + phase indicator */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted">Phase {currentPhase} of {TOTAL_PHASES}</span>
          <span className="text-xs text-muted">{DOMAIN_ICONS[domainCode]} {DOMAIN_FULL_NAMES[domainCode]}</span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: TOTAL_PHASES }, (_, i) => {
            const p = i + 1;
            const pDomain = getPhaseDomain(p);
            const pColor = DOMAIN_COLORS[pDomain];
            const isCurrent = p === currentPhase;
            const isPast = p < currentPhase;
            return (
              <button
                key={p}
                onClick={() => setCurrentPhase(p)}
                className="flex-1 h-2 rounded-full transition-all"
                style={{
                  backgroundColor: isCurrent ? pColor : isPast ? `color-mix(in srgb, ${pColor} 40%, white)` : '#e5e5e5',
                }}
                title={`Phase ${p}: ${DOMAIN_FULL_NAMES[pDomain]}`}
              />
            );
          })}
        </div>
      </div>

      {/* Lesson header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">
          {cleanGuideTitle(guide.title)}
        </h1>
        <p className="text-xs text-muted mt-0.5">
          Phase {currentPhase} &middot; {activeChild?.name}
        </p>
        <p className="text-secondary text-sm mt-2 italic">&ldquo;{guide.parent_frame}&rdquo;</p>
      </div>

      {/* Why This Matters — collapsed by default */}
      {guide.why_this_matters && (
        <CollapsibleSection title="Why This Matters" color={color}>
          <p className="text-sm text-secondary leading-relaxed mt-3">{guide.why_this_matters}</p>
        </CollapsibleSection>
      )}

      {/* What You Need — collapsed */}
      {guide.what_you_need && (
        <CollapsibleSection title="What You Need">
          <p className="text-sm text-secondary mt-3">{guide.what_you_need}</p>
        </CollapsibleSection>
      )}

      {/* Focus Areas — collapsed */}
      {guide.focus_items.length > 0 && (
        <CollapsibleSection title="Focus Areas">
          <ul className="space-y-1.5 mt-3">
            {guide.focus_items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span style={{ color }} className="mt-0.5 shrink-0">&#10003;</span>
                <span className="text-secondary">{item}</span>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      {/* Keep Doing — collapsed */}
      {guide.keep_doing && (
        <CollapsibleSection title="Keep Doing (Always)">
          <p className="text-sm text-secondary mt-3">{guide.keep_doing}</p>
        </CollapsibleSection>
      )}

      {/* Daily Moments — OPEN by default (this is what parents need) */}
      <div>
        <h2 className="font-semibold text-foreground mb-3">Today&apos;s Moments</h2>
        <div className="space-y-3">
          {guide.daily_moments.map((moment, i) => (
            <MomentSection
              key={i}
              momentName={moment.moment_name}
              sayThis={moment.say_this}
              doThis={moment.do_this}
              whatThisBuilds={moment.what_this_builds}
            />
          ))}
        </div>
      </div>

      {/* Prev / Next navigation */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => canPrev && setCurrentPhase(currentPhase - 1)}
          disabled={!canPrev}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-border text-sm font-medium text-secondary hover:border-brand/30 hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Previous
        </button>
        <button
          onClick={() => canNext && setCurrentPhase(currentPhase + 1)}
          disabled={!canNext}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ backgroundColor: canNext ? DOMAIN_COLORS[getPhaseDomain(currentPhase + 1)] : '#ccc' }}
        >
          Next: {canNext ? DOMAIN_FULL_NAMES[getPhaseDomain(currentPhase + 1)].split(' ')[0] : ''}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
