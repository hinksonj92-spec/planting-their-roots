'use client';

import { useState } from 'react';
import { useApp } from '@/lib/store';
import { getMilestones } from '@/lib/content';
import { DOMAIN_COLORS, DOMAIN_ICONS, DOMAIN_FULL_NAMES, getBandShortLabel } from '@/lib/utils';
import { ChildSwitcher } from '@/components/ui/ChildSwitcher';
import type { DomainCode } from '@/types';

const ALL_DOMAINS: DomainCode[] = ['LANG', 'MOTR', 'NUMR', 'SOCL', 'ROUT', 'SENS', 'INDP'];

export default function MilestonesPage() {
  const { activeBand, activeChild, isMilestoneComplete, toggleMilestone } = useApp();
  const [activeDomain, setActiveDomain] = useState<DomainCode>('LANG');
  const allMilestones = getMilestones(activeBand);

  const domainMilestones = allMilestones.filter(m => m.domain_code === activeDomain);

  // Count per domain
  const domainCounts = ALL_DOMAINS.map(code => {
    const dm = allMilestones.filter(m => m.domain_code === code);
    const completed = dm.filter(m => isMilestoneComplete(`${m.band}-${m.domain_code}-${m.description}`)).length;
    return { code, total: dm.length, completed };
  });

  return (
    <div className="py-4 space-y-4">
      <div>
        <ChildSwitcher />
        <h1 className="text-xl font-bold text-foreground mt-2">Milestones for {activeChild?.name}</h1>
        <p className="text-secondary text-sm mt-0.5">
          {getBandShortLabel(activeBand)} &middot; Track what you observe
        </p>
      </div>

      {/* Domain selector (horizontal scroll) */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {domainCounts.map(d => {
          const isActive = d.code === activeDomain;
          const color = DOMAIN_COLORS[d.code];
          return (
            <button
              key={d.code}
              onClick={() => setActiveDomain(d.code)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap shrink-0 transition-all ${
                isActive ? 'text-white shadow-sm' : 'bg-card border border-border text-secondary'
              }`}
              style={isActive ? { backgroundColor: color } : undefined}
            >
              <span>{DOMAIN_ICONS[d.code]}</span>
              <span>{DOMAIN_FULL_NAMES[d.code].split(' ')[0]}</span>
              <span className={`text-xs ${isActive ? 'text-white/80' : 'text-muted'}`}>
                {d.completed}/{d.total}
              </span>
            </button>
          );
        })}
      </div>

      {/* Domain header */}
      <div
        className="rounded-2xl p-4"
        style={{
          backgroundColor: `color-mix(in srgb, ${DOMAIN_COLORS[activeDomain]} 8%, white)`,
        }}
      >
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <span>{DOMAIN_ICONS[activeDomain]}</span>
          {DOMAIN_FULL_NAMES[activeDomain]}
        </h2>
        <p className="text-xs text-muted mt-1">
          These are awareness tools, not diagnoses. Wide variation is normal.
        </p>
      </div>

      {/* Milestone checklist */}
      <div className="space-y-2">
        {domainMilestones.map((m, i) => {
          const milestoneId = `${m.band}-${m.domain_code}-${m.description}`;
          const isComplete = isMilestoneComplete(milestoneId);
          const color = DOMAIN_COLORS[activeDomain];

          return (
            <button
              key={i}
              onClick={() => toggleMilestone(milestoneId)}
              className="w-full flex items-start gap-3 bg-card rounded-xl border border-border p-3 text-left transition-all hover:border-brand/20"
            >
              <div
                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                  isComplete ? 'border-transparent' : ''
                }`}
                style={{
                  borderColor: isComplete ? color : undefined,
                  backgroundColor: isComplete ? color : 'transparent',
                }}
              >
                {isComplete && (
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-relaxed ${isComplete ? 'text-muted line-through' : 'text-foreground'}`}>
                  {m.description}
                </p>
                <p className="text-xs text-muted mt-0.5">{m.typical_range}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
