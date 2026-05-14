'use client';

import { useState } from 'react';
import { getDomains, getPillarsForDomain, phaseToTier, PHASES } from '@/lib/curriculum';
import { useApp } from '@/lib/store';
import { ChildSwitcher } from '@/components/ui/ChildSwitcher';
import { getEvergreenPhase, DOMAIN_COLORS, DOMAIN_ICONS, DOMAIN_FULL_NAMES } from '@/lib/utils';
import Link from 'next/link';
import type { DomainCode } from '@/types';

const PHASE_0_DOMAINS: DomainCode[] = ['LANG', 'MOTR', 'NUMR', 'SOCL', 'ROUT', 'SENS', 'INDP'];

const PHASE_0_DESCRIPTIONS: Record<DomainCode, string> = {
  LANG: 'Vocabulary, narration, listening, conversation patterns',
  MOTR: 'Gross motor, fine motor, body awareness, coordination',
  NUMR: 'Counting, sorting, patterns, estimation, spatial sense',
  SOCL: 'Empathy, self-regulation, sharing, turn-taking, emotional vocabulary',
  ROUT: 'Daily rhythms, transitions, responsibility habits, time awareness',
  SENS: 'Nature observation, texture, sound, taste, environmental awareness',
  INDP: 'Self-care, practical life skills, decision-making, problem-solving',
};

// Phase 0 content view
function PlantingRootsView() {
  return (
    <div className="space-y-3">
      <div className="p-3 rounded-xl bg-brand-light/30 border border-brand/10">
        <p className="text-sm text-foreground">
          Planting Roots is the developmental formation phase for ages 0-4. Seven domains cycle through daily moments, weekly guides, and milestone tracking.
        </p>
      </div>

      <div className="space-y-2">
        {PHASE_0_DOMAINS.map(code => {
          const color = DOMAIN_COLORS[code];
          return (
            <Link
              key={code}
              href="/week"
              className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-brand/30 transition-colors"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, white)` }}
              >
                {DOMAIN_ICONS[code]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{DOMAIN_FULL_NAMES[code]}</p>
                <p className="text-xs text-muted">{PHASE_0_DESCRIPTIONS[code]}</p>
              </div>
              <svg className="w-4 h-4 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          );
        })}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-2 pt-2">
        <Link href="/cards" className="text-center p-3 rounded-xl bg-card border border-border hover:border-brand/30 transition-colors">
          <span className="text-lg block mb-1">🃏</span>
          <span className="text-[11px] font-medium text-foreground">Moment Cards</span>
        </Link>
        <Link href="/rhythm" className="text-center p-3 rounded-xl bg-card border border-border hover:border-brand/30 transition-colors">
          <span className="text-lg block mb-1">🔄</span>
          <span className="text-[11px] font-medium text-foreground">Daily Rhythm</span>
        </Link>
        <Link href="/milestones" className="text-center p-3 rounded-xl bg-card border border-border hover:border-brand/30 transition-colors">
          <span className="text-lg block mb-1">✅</span>
          <span className="text-[11px] font-medium text-foreground">Milestones</span>
        </Link>
      </div>
    </div>
  );
}

export default function CurriculumPage() {
  const { activeChild } = useApp();

  // Default phase based on active child's age, or Phase 1 if no child
  const defaultPhase = activeChild ? getEvergreenPhase(activeChild.birth_date) : 1;
  const [activePhase, setActivePhase] = useState(defaultPhase || 1);
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

      {/* Phase selector — now includes Phase 0 */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {PHASES.map(phase => (
          <button
            key={phase.id}
            onClick={() => { setActivePhase(phase.id); setExpandedDomain(null); }}
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

      {/* Phase 0: Planting Roots — developmental domains */}
      {activePhase === 0 && <PlantingRootsView />}

      {/* Phases 1-3: 24-pillar curriculum */}
      {activePhase > 0 && (
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
      )}
    </div>
  );
}
