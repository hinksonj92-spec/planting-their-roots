'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/lib/store';
import {
  getAgeString, getBandShortLabel, getBandFromBirthDate,
  DOMAIN_COLORS, DOMAIN_ICONS, DOMAIN_FULL_NAMES,
  getPhaseDomain, getEvergreenPhase, getEvergreenPhaseLabel, getEvergreenPhaseAges,
} from '@/lib/utils';
import { getWeeklyGuide, getDefaultPhase, getMilestones } from '@/lib/content';
import { getDomains, getStats, phaseToTier } from '@/lib/curriculum';
import { DailyMomentPrompt } from '@/components/DailyMomentPrompt';
import { startReminderInterval, isRemindersEnabled } from '@/lib/reminders';
import Link from 'next/link';
import type { DomainCode, Child } from '@/types';

const ALL_DOMAINS: DomainCode[] = ['LANG', 'MOTR', 'NUMR', 'SOCL', 'ROUT', 'SENS', 'INDP'];

// ── Phase 0 Child Card (ages 0-4) ──────────────────────────────────────

function Phase0Card({
  child,
  isActive,
  milestoneProgress,
  onSelect,
  onChangeWeek,
}: {
  child: Child;
  isActive: boolean;
  milestoneProgress: Record<string, { observed_date: string | null }>;
  onSelect: () => void;
  onChangeWeek: (week: number | null) => void;
}) {
  const [showWeekPicker, setShowWeekPicker] = useState(false);

  const band = getBandFromBirthDate(child.birth_date);
  const graduated = band === 0;
  const currentPhase = child.current_week ?? getDefaultPhase();
  const guide = graduated ? null : getWeeklyGuide(band, currentPhase);
  const allMilestones = graduated ? getMilestones(3) : getMilestones(band); // Show band 3 milestones for graduated to preserve progress display

  const totalMilestones = allMilestones.length;
  let completedMilestones = 0;
  for (const m of allMilestones) {
    const key = `${child.id}-${m.band}-${m.domain_code}-${m.description}`;
    if (milestoneProgress[key]?.observed_date) completedMilestones++;
  }
  const milestonePct = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  const domainProgress = ALL_DOMAINS.map(code => {
    const dm = allMilestones.filter(m => m.domain_code === code);
    const total = dm.length;
    let completed = 0;
    for (const m of dm) {
      const key = `${child.id}-${m.band}-${m.domain_code}-${m.description}`;
      if (milestoneProgress[key]?.observed_date) completed++;
    }
    return { code, total, completed, pct: total > 0 ? Math.round((completed / total) * 100) : 0 };
  });

  const domainCode = (guide?.domain_code || getPhaseDomain(currentPhase)) as DomainCode;
  const color = DOMAIN_COLORS[domainCode];

  return (
    <div className={`rounded-2xl border-2 transition-all ${isActive ? 'border-brand shadow-sm' : 'border-border'}`}>
      <button onClick={onSelect} className="w-full text-left p-4 pb-3">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-lg ${isActive ? 'bg-brand' : 'bg-muted'}`}>
            {child.name[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-foreground text-lg truncate">{child.name}</h2>
              {isActive && <span className="text-[10px] bg-brand text-white px-1.5 py-0.5 rounded-full font-medium shrink-0">Active</span>}
            </div>
            <p className="text-sm text-secondary">{getAgeString(child.birth_date)}{!graduated && <> &middot; {getBandShortLabel(band)}</>}</p>
          </div>
          {graduated ? (
            <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 font-medium">Graduated</span>
          ) : (
            <span className="text-xs px-2 py-1 rounded-full bg-brand-light text-brand-dark font-medium">Planting Roots</span>
          )}
        </div>
      </button>

      {/* Current focus — or graduated message */}
      {graduated ? (
        <Link href="/curriculum" onClick={onSelect} className="block px-4 pb-3">
          <div className="rounded-xl overflow-hidden border border-border-light bg-amber-50/50 p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🌳</span>
              <span className="text-xs font-semibold text-amber-700">Ready for the next phase</span>
            </div>
            <p className="text-xs text-secondary">
              {child.name} has graduated from Planting Roots. Explore the full curriculum.
            </p>
          </div>
        </Link>
      ) : guide && (
        <Link href="/week" onClick={onSelect} className="block px-4 pb-3">
          <div className="rounded-xl overflow-hidden border border-border-light">
            <div className="flex items-stretch">
              <div className="w-1.5 shrink-0" style={{ backgroundColor: color }} />
              <div className="flex-1 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                    style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, white)`, color }}>
                    {DOMAIN_ICONS[domainCode]} {currentPhase} — {DOMAIN_FULL_NAMES[domainCode]}
                  </span>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowWeekPicker(!showWeekPicker); }}
                    className="text-[10px] text-brand font-medium">
                    {showWeekPicker ? 'Done' : 'Switch'}
                  </button>
                </div>
                <p className="text-secondary text-xs mt-1 italic leading-snug">&ldquo;{guide.parent_frame}&rdquo;</p>
                <span className="text-[10px] text-muted mt-1 block">{guide.daily_moments.length} daily moments</span>
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* Week picker */}
      {!graduated && showWeekPicker && (
        <div className="px-4 pb-3">
          <div className="bg-background rounded-xl p-3 border border-border-light">
            <p className="text-[11px] text-secondary mb-2">
              7 focus areas cycling through developmental domains. Pick any to start.
            </p>
            <div className="space-y-1">
              {[1, 2, 3, 4, 5, 6, 7].map(p => {
                const pDomain = getPhaseDomain(p);
                const pColor = DOMAIN_COLORS[pDomain];
                const isSelected = p === currentPhase;
                return (
                  <button key={p}
                    onClick={() => { onChangeWeek(p); setShowWeekPicker(false); }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs transition-all ${
                      isSelected ? 'font-semibold' : 'text-secondary hover:bg-border-light/50'
                    }`}
                    style={isSelected ? { backgroundColor: `color-mix(in srgb, ${pColor} 12%, white)`, color: pColor } : {}}>
                    <span className="w-4 text-center">{DOMAIN_ICONS[pDomain]}</span>
                    <span>{p} — {DOMAIN_FULL_NAMES[pDomain]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Milestone progress */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-muted">Milestones</span>
          <span className="text-[11px] font-semibold text-foreground">{completedMilestones}/{totalMilestones}</span>
        </div>
        <div className="h-1.5 bg-border-light rounded-full overflow-hidden mb-2">
          <div className="h-full bg-brand rounded-full transition-all duration-500" style={{ width: `${milestonePct}%` }} />
        </div>
        <div className="flex gap-1">
          {domainProgress.map(d => (
            <div key={d.code} className="flex-1">
              <div className="h-1 rounded-full" style={{
                backgroundColor: d.pct > 0 ? `color-mix(in srgb, ${DOMAIN_COLORS[d.code]} ${Math.max(d.pct, 20)}%, #e5e7eb)` : '#e5e7eb',
              }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Phase 1-3 Child Card (ages 5-18) ──────────────────────────────────

function CurriculumCard({
  child,
  isActive,
  onSelect,
}: {
  child: Child;
  isActive: boolean;
  onSelect: () => void;
}) {
  const evPhase = getEvergreenPhase(child.birth_date);
  const phaseLabel = getEvergreenPhaseLabel(evPhase);
  const phaseAges = getEvergreenPhaseAges(evPhase);
  const tier = phaseToTier(evPhase);
  const domains = getDomains();
  const stats = getStats();

  return (
    <div className={`rounded-2xl border-2 transition-all ${isActive ? 'border-brand shadow-sm' : 'border-border'}`}>
      <button onClick={onSelect} className="w-full text-left p-4 pb-3">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-lg ${isActive ? 'bg-brand' : 'bg-muted'}`}>
            {child.name[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-foreground text-lg truncate">{child.name}</h2>
              {isActive && <span className="text-[10px] bg-brand text-white px-1.5 py-0.5 rounded-full font-medium shrink-0">Active</span>}
            </div>
            <p className="text-sm text-secondary">{getAgeString(child.birth_date)}</p>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-brand-light text-brand-dark font-medium">{phaseLabel}</span>
        </div>
      </button>

      {/* Phase overview */}
      <div className="px-4 pb-3">
        <div className="rounded-xl border border-border-light p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-foreground">{phaseLabel}</span>
            <span className="text-[10px] text-muted">{phaseAges} &middot; Tier {tier}</span>
          </div>
          <p className="text-xs text-secondary mb-3">
            {stats.total_packets} packets across {stats.total_pillars} pillars and {domains.length} domains
          </p>

          {/* Domain summary */}
          <div className="space-y-1.5">
            {domains.map(d => (
              <Link
                key={d.id}
                href={`/curriculum`}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-border-light/50 transition-colors"
              >
                <span className="text-sm">{d.icon}</span>
                <span className="text-xs text-foreground flex-1">{d.name}</span>
                <span className="text-[10px] text-muted">{d.pillars.length} pillars</span>
                <svg className="w-3 h-3 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Welcome State (no children) ────────────────────────────────────────

function WelcomeState() {
  return (
    <div className="py-8 text-center space-y-6">
      <div>
        <div className="w-16 h-16 rounded-full bg-brand mx-auto flex items-center justify-center mb-4">
          <span className="text-3xl">🌱</span>
        </div>
        <h1 className="text-xl font-bold text-foreground">Welcome to Evergreen Homeschool</h1>
        <p className="text-secondary text-sm mt-2 max-w-sm mx-auto">
          The complete formation system for ages 0-18. Four phases. Twenty-four pillars. One mission: raise sovereign, capable human beings.
        </p>
      </div>

      <Link
        href="/child"
        className="inline-flex items-center gap-2 bg-brand text-white px-6 py-3 rounded-xl font-medium text-sm hover:bg-brand-dark transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Add Your First Child
      </Link>

      <div className="pt-4 border-t border-border max-w-sm mx-auto">
        <p className="text-xs text-muted mb-3">Or explore the curriculum first</p>
        <Link href="/curriculum" className="text-sm text-brand font-medium">
          Browse All 24 Pillars →
        </Link>
      </div>
    </div>
  );
}

// ── Main Home Page ─────────────────────────────────────────────────────

export default function HomePage() {
  const { parentName, children, activeChild, activeBand, activeWeek, milestoneProgress, setActiveChild, setChildWeek } = useApp();

  // Active child's guide for daily moment prompt
  const currentPhase = activeWeek ?? getDefaultPhase();
  const activeGuide = activeBand > 0 ? getWeeklyGuide(activeBand, currentPhase) : null;
  const activeDomainCode = (activeGuide?.domain_code || 'LANG') as DomainCode;

  // Start browser notification reminders if enabled
  useEffect(() => {
    if (!activeChild || !activeGuide) return;
    const cleanup = startReminderInterval(() => {
      if (!activeGuide.daily_moments?.length) return null;
      const m = activeGuide.daily_moments[Math.floor(Math.random() * activeGuide.daily_moments.length)];
      return { childName: activeChild.name, momentName: m.moment_name, sayThis: m.say_this };
    });
    return cleanup;
  }, [activeChild, activeGuide]);

  // No children yet — show welcome with add-child CTA
  if (!activeChild || children.length === 0) {
    return (
      <div className="py-4">
        <WelcomeState />
      </div>
    );
  }

  return (
    <div className="py-4 space-y-5">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold text-foreground">
          Hi, {parentName || 'there'}
        </h1>
        <p className="text-secondary text-sm mt-0.5">
          {children.length === 1
            ? `Tracking ${children[0].name}'s formation`
            : `Tracking ${children.length} children`
          }
        </p>
      </div>

      {/* Time-aware daily moment prompt for Phase 0 kids */}
      {activeGuide && activeGuide.daily_moments?.length > 0 && getEvergreenPhase(activeChild.birth_date) === 0 && (
        <DailyMomentPrompt
          childName={activeChild.name}
          moments={activeGuide.daily_moments}
          domainCode={activeDomainCode}
        />
      )}

      {/* Per-child cards — phase-aware */}
      <div className="space-y-4">
        {children.map(child => {
          const evPhase = getEvergreenPhase(child.birth_date);
          const isActive = child.id === activeChild.id;

          if (evPhase === 0) {
            return (
              <Phase0Card
                key={child.id}
                child={child}
                isActive={isActive}
                milestoneProgress={milestoneProgress}
                onSelect={() => setActiveChild(child.id)}
                onChangeWeek={(week) => setChildWeek(child.id, week)}
              />
            );
          }

          return (
            <CurriculumCard
              key={child.id}
              child={child}
              isActive={isActive}
              onSelect={() => setActiveChild(child.id)}
            />
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          {getEvergreenPhase(activeChild.birth_date) === 0 ? (
            <>
              <Link href="/cards" className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-brand/30 transition-colors">
                <span className="text-xl">🃏</span>
                <div>
                  <p className="text-sm font-medium text-foreground">Moment Cards</p>
                  <p className="text-[10px] text-muted">Quick reference</p>
                </div>
              </Link>
              <Link href="/rhythm" className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-brand/30 transition-colors">
                <span className="text-xl">🔄</span>
                <div>
                  <p className="text-sm font-medium text-foreground">Daily Rhythm</p>
                  <p className="text-[10px] text-muted">Your day&apos;s flow</p>
                </div>
              </Link>
              <Link href="/week" className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-brand/30 transition-colors">
                <span className="text-xl">📋</span>
                <div>
                  <p className="text-sm font-medium text-foreground">Weekly Guide</p>
                  <p className="text-[10px] text-muted">Focus &amp; activities</p>
                </div>
              </Link>
              <Link href="/milestones" className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-brand/30 transition-colors">
                <span className="text-xl">✅</span>
                <div>
                  <p className="text-sm font-medium text-foreground">Milestones</p>
                  <p className="text-[10px] text-muted">Track progress</p>
                </div>
              </Link>
              <Link href="/rhythm-print" className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-brand/30 transition-colors">
                <span className="text-xl">🖨️</span>
                <div>
                  <p className="text-sm font-medium text-foreground">Print Rhythm</p>
                  <p className="text-[10px] text-muted">Printable sheet</p>
                </div>
              </Link>
            </>
          ) : (
            <>
              <Link href="/curriculum" className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-brand/30 transition-colors">
                <span className="text-xl">📚</span>
                <div>
                  <p className="text-sm font-medium text-foreground">Curriculum</p>
                  <p className="text-[10px] text-muted">Pillars &amp; packets</p>
                </div>
              </Link>
              <Link href="/chat" className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-brand/30 transition-colors">
                <span className="text-xl">💬</span>
                <div>
                  <p className="text-sm font-medium text-foreground">Ask EH</p>
                  <p className="text-[10px] text-muted">Get guidance</p>
                </div>
              </Link>
              <Link href="/milestones" className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-brand/30 transition-colors">
                <span className="text-xl">✅</span>
                <div>
                  <p className="text-sm font-medium text-foreground">Progress</p>
                  <p className="text-[10px] text-muted">Track mastery</p>
                </div>
              </Link>
              <Link href="/settings" className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-brand/30 transition-colors">
                <span className="text-xl">⚙️</span>
                <div>
                  <p className="text-sm font-medium text-foreground">Settings</p>
                  <p className="text-[10px] text-muted">Family &amp; children</p>
                </div>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Add child shortcut */}
      <Link
        href="/child"
        className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-border text-sm text-muted hover:text-brand hover:border-brand/30 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Add Another Child
      </Link>
    </div>
  );
}
