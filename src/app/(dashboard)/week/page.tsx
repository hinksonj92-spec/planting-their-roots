'use client';

import { useState } from 'react';
import { useApp } from '@/lib/store';
import { getWeeklyGuide, getDefaultPhase } from '@/lib/content';
import { DOMAIN_COLORS, DOMAIN_ICONS, DOMAIN_FULL_NAMES, getPhaseDomain, cleanGuideTitle } from '@/lib/utils';
import { ChildSwitcher } from '@/components/ui/ChildSwitcher';
import { MomentSection } from '@/components/content/MomentSection';
import { GraduatedState } from '@/components/content/GraduatedState';
import type { DomainCode } from '@/types';

export default function WeekPage() {
  const { activeBand, activeChild, activeWeek, isGraduated } = useApp();
  const [currentPhase, setCurrentPhase] = useState(activeWeek ?? getDefaultPhase());

  if (isGraduated) return <div className="py-4"><ChildSwitcher /><GraduatedState /></div>;

  const guide = getWeeklyGuide(activeBand, currentPhase);
  if (!guide) return <div className="py-8 text-center text-muted">No guide found.</div>;

  const domainCode = guide.domain_code as DomainCode;
  const color = DOMAIN_COLORS[domainCode];

  return (
    <div className="py-4 space-y-4">
      <ChildSwitcher />

      {/* Domain selector */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {[1, 2, 3, 4, 5, 6, 7].map(p => {
          const pDomain = getPhaseDomain(p);
          const pColor = DOMAIN_COLORS[pDomain];
          const isSelected = p === currentPhase;
          return (
            <button
              key={p}
              onClick={() => setCurrentPhase(p)}
              className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                isSelected ? 'text-white' : 'text-secondary bg-border-light hover:bg-border-light/70'
              }`}
              style={isSelected ? { backgroundColor: pColor } : {}}
            >
              <span>{DOMAIN_ICONS[pDomain]}</span>
              <span className="whitespace-nowrap">{DOMAIN_FULL_NAMES[pDomain].split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span
            className="text-xs px-2.5 py-1 rounded-full font-semibold"
            style={{
              backgroundColor: `color-mix(in srgb, ${color} 15%, white)`,
              color: color,
            }}
          >
            {DOMAIN_ICONS[domainCode]} {DOMAIN_FULL_NAMES[domainCode]}
          </span>
        </div>
        <h1 className="text-xl font-bold text-foreground">{cleanGuideTitle(guide.title)} for {activeChild?.name}</h1>
        <p className="text-secondary text-sm mt-1 italic">&ldquo;{guide.parent_frame}&rdquo;</p>
      </div>

      {/* Why This Matters */}
      {guide.why_this_matters && (
        <div
          className="rounded-2xl p-4 border-l-4"
          style={{
            backgroundColor: `color-mix(in srgb, ${color} 6%, white)`,
            borderLeftColor: color,
          }}
        >
          <h2 className="text-sm font-semibold text-foreground mb-1">Why This Matters</h2>
          <p className="text-sm text-secondary leading-relaxed">{guide.why_this_matters}</p>
        </div>
      )}

      {/* Focus Items */}
      {guide.focus_items.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-4">
          <h2 className="text-sm font-semibold text-foreground mb-2">Focus Areas</h2>
          <ul className="space-y-1.5">
            {guide.focus_items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span style={{ color }} className="mt-0.5 shrink-0">&#10003;</span>
                <span className="text-secondary">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Keep Doing */}
      {guide.keep_doing && (
        <div className="bg-brand-light/30 rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-brand-dark mb-1">Keep Doing (Always)</h2>
          <p className="text-sm text-secondary">{guide.keep_doing}</p>
        </div>
      )}

      {/* What You Need */}
      {guide.what_you_need && (
        <div className="bg-card rounded-2xl border border-border p-4">
          <h2 className="text-sm font-semibold text-foreground mb-1">What You Need</h2>
          <p className="text-sm text-secondary">{guide.what_you_need}</p>
        </div>
      )}

      {/* Daily Moments */}
      <div>
        <h2 className="font-semibold text-foreground mb-3">Daily Moments</h2>
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
    </div>
  );
}
