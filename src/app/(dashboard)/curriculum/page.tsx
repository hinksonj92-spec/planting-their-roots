'use client';

import { useState } from 'react';
import { getDomains, getPillarsForDomain, phaseToTier, PHASES } from '@/lib/curriculum';
import { useApp } from '@/lib/store';
import { ChildSwitcher } from '@/components/ui/ChildSwitcher';
import Link from 'next/link';

export default function CurriculumPage() {
  const { activeChild } = useApp();
  // Default to phase 1 for now; later this will come from child's assigned phase
  const [activePhase, setActivePhase] = useState(1);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);

  const domains = getDomains();
  const tier = phaseToTier(activePhase);
  const currentPhaseInfo = PHASES.find(p => p.id === activePhase);

  return (
    <div className="py-4 space-y-5">
      <ChildSwitcher />

      <div>
        <h1 className="text-xl font-bold text-foreground">
          Curriculum for {activeChild?.name || 'Your Child'}
        </h1>
        <p className="text-secondary text-sm mt-0.5">
          {currentPhaseInfo?.description}
        </p>
      </div>

      {/* Phase selector */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {PHASES.filter(p => p.id > 0).map(phase => (
          <button
            key={phase.id}
            onClick={() => setActivePhase(phase.id)}
            className={`shrink-0 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
              activePhase === phase.id
                ? 'bg-brand text-white'
                : 'bg-card border border-border text-secondary hover:text-foreground'
            }`}
          >
            <div>{phase.name}</div>
            <div className="text-[10px] opacity-70">Ages {phase.ages}</div>
          </button>
        ))}
      </div>

      {/* Domain cards */}
      <div className="space-y-3">
        {domains.map(domain => {
          const pillars = getPillarsForDomain(domain.id);
          const isExpanded = expandedDomain === domain.id;
          const packetCount = pillars.reduce((sum, p) => sum + (p.packets[tier as 'A'|'B'|'C']?.length || 0), 0);

          return (
            <div key={domain.id} className="rounded-2xl border border-border overflow-hidden">
              <button
                onClick={() => setExpandedDomain(isExpanded ? null : domain.id)}
                className="w-full text-left p-4 flex items-center gap-3"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{ backgroundColor: `${domain.color}15` }}
                >
                  {domain.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground">{domain.name}</h3>
                  <p className="text-xs text-muted">
                    {pillars.length} pillars &middot; {packetCount} packets at Tier {tier}
                  </p>
                </div>
                <svg
                  className={`w-5 h-5 text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-2">
                  {pillars.map(pillar => {
                    const tierPackets = pillar.packets[tier as 'A'|'B'|'C'] || [];
                    return (
                      <Link
                        key={pillar.id}
                        href={`/curriculum/${encodeURIComponent(pillar.id)}?tier=${tier}`}
                        className="flex items-center justify-between p-3 rounded-xl bg-background hover:bg-border-light/50 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">{pillar.id} — {pillar.name}</p>
                          <p className="text-xs text-muted">{Object.keys(pillar.focuses).length} focuses &middot; {tierPackets.length} packets</p>
                        </div>
                        <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
