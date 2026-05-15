'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/lib/store';
import {
  getAgeString, getBandShortLabel, getBandFromBirthDate,
  DOMAIN_COLORS, DOMAIN_ICONS, DOMAIN_FULL_NAMES,
  getPhaseDomain, getEvergreenPhase, getEvergreenPhaseLabel, getEvergreenPhaseAges,
} from '@/lib/utils';
import { getWeeklyGuide, getDefaultPhase, getMilestones } from '@/lib/content';
import { getDomains, getStats, phaseToTier, getPacket } from '@/lib/curriculum';
import { getCurrentPacketInfo, getProgressStats, getDomainProgress, viewPacket } from '@/lib/curriculum-progress';
import { getPrereqDashboard, getNextRecommended } from '@/lib/prereq-engine';
import { startReminderInterval, isRemindersEnabled } from '@/lib/reminders';
import { ChildSwitcher } from '@/components/ui/ChildSwitcher';
import Link from 'next/link';
import {
  type Location, LOCATIONS, getMomentsForLocation, getDailyMomentLocations,
  getAvailableLocationsForMoments,
} from '@/lib/locations';
import type { DomainCode, DailyMoment, Child } from '@/types';

const ALL_DOMAINS: DomainCode[] = ['LANG', 'MOTR', 'NUMR', 'SOCL', 'ROUT', 'SENS', 'INDP'];

// ── Time-of-day helpers ───────────────────────────────────────────────

type TimeOfDay = 'morning' | 'midday' | 'evening';

function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'midday';
  return 'evening';
}

function getGreeting(timeOfDay: TimeOfDay, name: string): string {
  switch (timeOfDay) {
    case 'morning': return `Good morning, ${name}`;
    case 'midday': return `Good afternoon, ${name}`;
    case 'evening': return `Good evening, ${name}`;
  }
}

function getTimeIcon(timeOfDay: TimeOfDay): string {
  switch (timeOfDay) {
    case 'morning': return '🌅';
    case 'midday': return '☀️';
    case 'evening': return '🌙';
  }
}

function getMomentsForTime(moments: DailyMoment[], timeOfDay: TimeOfDay): DailyMoment[] {
  const morningKeywords = ['wake', 'morning', 'diaper', 'dress', 'breakfast', 'tummy'];
  const middayKeywords = ['lunch', 'nap', 'play', 'walk', 'outside', 'explore', 'read', 'book', 'art', 'music'];
  const eveningKeywords = ['dinner', 'bath', 'bed', 'evening', 'night', 'sleep', 'story', 'goodnight', 'wind'];

  const keywords = timeOfDay === 'morning' ? morningKeywords
    : timeOfDay === 'midday' ? middayKeywords
    : eveningKeywords;

  const matched = moments.filter(m =>
    keywords.some(k => m.moment_name.toLowerCase().includes(k))
  );

  if (matched.length === 0) {
    const sorted = [...moments].sort((a, b) => a.sort_order - b.sort_order);
    const third = Math.ceil(sorted.length / 3);
    if (timeOfDay === 'morning') return sorted.slice(0, third);
    if (timeOfDay === 'midday') return sorted.slice(third, third * 2);
    return sorted.slice(third * 2);
  }

  return matched;
}

// ── Hero: "Do This Now" card ──────────────────────────────────────────

function HeroMomentCard({
  childName,
  moment,
  domainCode,
  color,
  timeOfDay,
  otherMoments,
  onPickMoment,
  activeLocation,
}: {
  childName: string;
  moment: DailyMoment;
  domainCode: DomainCode;
  color: string;
  timeOfDay: TimeOfDay;
  otherMoments: DailyMoment[];
  onPickMoment: (m: DailyMoment) => void;
  activeLocation: Location | null;
}) {
  const momentLocations = getDailyMomentLocations(moment);
  const locationMeta = LOCATIONS.filter(l => momentLocations.includes(l.id));
  const [showSteps, setShowSteps] = useState(false);
  const [didIt, setDidIt] = useState<'yes' | 'skipped' | 'modified' | null>(null);

  // Reset state when moment changes
  useEffect(() => {
    setShowSteps(false);
    setDidIt(null);
  }, [moment.moment_name]);

  const preview = moment.say_this.length > 140
    ? moment.say_this.slice(0, 140).replace(/\s+\S*$/, '') + '...'
    : moment.say_this;

  return (
    <div className="rounded-2xl overflow-hidden border border-border">
      {/* Top band with time + domain */}
      <div
        className="px-4 py-2.5 flex items-center justify-between"
        style={{ backgroundColor: `color-mix(in srgb, ${color} 10%, white)` }}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{getTimeIcon(timeOfDay)}</span>
          <span className="text-xs font-semibold" style={{ color }}>
            Try this now with {childName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {locationMeta.length > 0 && locationMeta[0].id !== 'anywhere' && (
            <span className="text-[10px] text-muted">
              {locationMeta[0].icon} {locationMeta[0].label}
            </span>
          )}
          <span className="text-[10px] text-muted">
            {DOMAIN_ICONS[domainCode]} {DOMAIN_FULL_NAMES[domainCode]}
          </span>
        </div>
      </div>

      {/* Main moment content */}
      <div className="p-4">
        <h2 className="text-lg font-bold text-foreground mb-1">{moment.moment_name}</h2>
        <p className="text-sm text-secondary leading-relaxed italic">
          &ldquo;{preview}&rdquo;
        </p>

        {/* Action buttons row */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setShowSteps(!showSteps)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-colors border"
            style={showSteps
              ? { backgroundColor: `color-mix(in srgb, ${color} 10%, white)`, borderColor: color, color }
              : { borderColor: '#e5e5e5' }
            }
          >
            <span>🎯</span>
            {showSteps ? 'Hide Steps' : `Show Steps (${moment.do_this.length})`}
          </button>
          <Link
            href="/week"
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium text-muted border border-border hover:border-brand/30 hover:text-foreground transition-colors"
          >
            💬 Full Script
          </Link>
        </div>

        {/* Steps panel */}
        {showSteps && (
          <div className="mt-3 space-y-2">
            {moment.do_this.map((step, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm text-secondary">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5"
                  style={{ backgroundColor: color }}
                >
                  {i + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </div>
            ))}
            {moment.what_this_builds && (
              <p className="text-xs text-muted italic mt-2 pl-7">
                Builds: {moment.what_this_builds}
              </p>
            )}
          </div>
        )}

        {/* Daily check-in: did you do this? */}
        {!didIt ? (
          <div className="mt-4 pt-3 border-t border-border-light">
            <p className="text-xs text-muted mb-2">Did you do this moment?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setDidIt('yes')}
                className="flex-1 py-2 rounded-xl text-xs font-medium bg-brand-light text-brand-dark hover:bg-brand hover:text-white transition-colors"
              >
                Yes!
              </button>
              <button
                onClick={() => setDidIt('modified')}
                className="flex-1 py-2 rounded-xl text-xs font-medium border border-border text-secondary hover:border-brand/30 hover:text-foreground transition-colors"
              >
                Modified it
              </button>
              <button
                onClick={() => setDidIt('skipped')}
                className="flex-1 py-2 rounded-xl text-xs font-medium border border-border text-secondary hover:border-brand/30 hover:text-foreground transition-colors"
              >
                Skipped
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 pt-3 border-t border-border-light text-center">
            <p className="text-xs text-muted">
              {didIt === 'yes' && '🌟 Great job! Every moment counts.'}
              {didIt === 'modified' && '👍 Making it your own is part of the process.'}
              {didIt === 'skipped' && '💚 No worries — tomorrow is a fresh start.'}
            </p>
          </div>
        )}
      </div>

      {/* Other moments for this time of day */}
      {otherMoments.length > 0 && (
        <div className="px-4 pb-3 border-t border-border-light pt-3">
          <p className="text-[10px] text-muted mb-2">Also try:</p>
          <div className="flex flex-wrap gap-1.5">
            {otherMoments.map((m, i) => (
              <button
                key={i}
                onClick={() => onPickMoment(m)}
                className="text-[11px] px-2.5 py-1 rounded-full border border-border-light text-secondary hover:border-brand/30 hover:text-foreground transition-colors"
              >
                {m.moment_name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Compact child info strip ──────────────────────────────────────────

function ChildInfoStrip({
  child,
  milestoneProgress,
}: {
  child: Child;
  milestoneProgress: Record<string, { observed_date: string | null }>;
}) {
  const band = getBandFromBirthDate(child.birth_date);
  const graduated = band === 0;
  const allMilestones = graduated ? getMilestones(3) : getMilestones(band);
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

  return (
    <Link href="/milestones" className="block rounded-xl border border-border p-3 hover:border-brand/30 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-foreground">
          {child.name}&apos;s Milestones
        </span>
        <span className="text-[10px] text-muted">{completedMilestones}/{totalMilestones}</span>
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
    </Link>
  );
}

// ── Quick Nav (2x2 grid, compact) ─────────────────────────────────────

function QuickNav({ isPhase0 }: { isPhase0: boolean }) {
  if (isPhase0) {
    return (
      <div className="grid grid-cols-4 gap-2">
        <Link href="/week" className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-card border border-border hover:border-brand/30 transition-colors">
          <span className="text-lg">📋</span>
          <span className="text-[10px] text-secondary font-medium">Guide</span>
        </Link>
        <Link href="/cards" className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-card border border-border hover:border-brand/30 transition-colors">
          <span className="text-lg">🃏</span>
          <span className="text-[10px] text-secondary font-medium">Cards</span>
        </Link>
        <Link href="/rhythm" className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-card border border-border hover:border-brand/30 transition-colors">
          <span className="text-lg">🔄</span>
          <span className="text-[10px] text-secondary font-medium">Rhythm</span>
        </Link>
        <Link href="/milestones" className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-card border border-border hover:border-brand/30 transition-colors">
          <span className="text-lg">✅</span>
          <span className="text-[10px] text-secondary font-medium">Milestones</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-2">
      <Link href="/curriculum" className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-card border border-border hover:border-brand/30 transition-colors">
        <span className="text-lg">📚</span>
        <span className="text-[10px] text-secondary font-medium">Curriculum</span>
      </Link>
      <Link href="/chat" className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-card border border-border hover:border-brand/30 transition-colors">
        <span className="text-lg">💬</span>
        <span className="text-[10px] text-secondary font-medium">Ask EH</span>
      </Link>
      <Link href="/milestones" className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-card border border-border hover:border-brand/30 transition-colors">
        <span className="text-lg">✅</span>
        <span className="text-[10px] text-secondary font-medium">Progress</span>
      </Link>
      <Link href="/settings" className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-card border border-border hover:border-brand/30 transition-colors">
        <span className="text-lg">⚙️</span>
        <span className="text-[10px] text-secondary font-medium">Settings</span>
      </Link>
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

// ── Older Kid Hero (Phase 1-3 "open and go" card) ────────────────────

function OlderKidHero({ child, phase }: { child: Child; phase: number }) {
  const info = getCurrentPacketInfo(child.id, phase, (id) => {
    const p = getPacket(id);
    return p ? { title: p.title, pillar_id: p.pillar_id, pillar_name: p.pillar_name, tier: p.tier } : undefined;
  });
  const stats = getProgressStats(child.id, phase);

  if (!info) {
    // All packets completed — celebration state
    return (
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="px-4 py-5 text-center">
          <span className="text-3xl block mb-2">🏆</span>
          <p className="text-sm font-semibold text-foreground mb-1">
            {child.name} has completed all {stats.total} packets!
          </p>
          <p className="text-xs text-secondary">
            Every packet at this tier is done. Amazing work.
          </p>
          <Link href="/curriculum" className="inline-block mt-3 text-xs font-medium text-brand hover:underline">
            Review Curriculum →
          </Link>
        </div>
      </div>
    );
  }

  const isResume = info.status === 'in_progress';

  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      {/* Domain / pillar header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: `${info.domainColor}10` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">{info.domainIcon}</span>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: info.domainColor }}>
              {info.pillarId} — {info.pillarName}
            </p>
            <p className="text-[10px] text-muted">
              {info.domainName} · Tier {info.tier}
            </p>
          </div>
        </div>
        <span className="text-[10px] text-muted shrink-0 ml-2">
          {info.packetIndex}/{info.totalInPillar}
        </span>
      </div>

      {/* Packet content */}
      <div className="p-4">
        <p className="text-sm font-semibold text-foreground mb-1">{info.packetTitle}</p>
        <p className="text-xs text-muted font-mono mb-3">{info.packetId}</p>

        {/* Progress bar for this pillar */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 h-1.5 bg-border-light rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.round(((info.packetIndex - 1) / info.totalInPillar) * 100)}%`,
                backgroundColor: info.domainColor,
              }}
            />
          </div>
          <span className="text-[10px] text-muted">{Math.round(((info.packetIndex - 1) / info.totalInPillar) * 100)}%</span>
        </div>

        {/* CTA */}
        <Link
          href={`/curriculum/${encodeURIComponent(info.pillarId)}/packet/${encodeURIComponent(info.packetId)}?tier=${info.tier}`}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-colors"
          style={{ backgroundColor: info.domainColor }}
        >
          {isResume ? 'Continue Lesson' : 'Start Lesson'}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Prereq-aware progress footer */}
      {stats.total > 0 && (() => {
        const tier = phase === 1 ? 'A' : phase === 2 ? 'B' : 'C';
        const prereqDash = getPrereqDashboard(child.id, tier);
        return (
          <div className="px-4 pb-3 border-t border-border-light pt-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted">
                {prereqDash.completedCount} completed · {prereqDash.inProgressCount} in progress · {prereqDash.unlockedCount} available
              </span>
              <span className="text-[10px] font-medium" style={{ color: info.domainColor }}>
                {prereqDash.completionPct}%
              </span>
            </div>
            {prereqDash.lockedCount > 0 && (
              <p className="text-[10px] text-muted">
                🔒 {prereqDash.lockedCount} packets locked — complete prerequisites to unlock
              </p>
            )}
          </div>
        );
      })()}
    </div>
  );
}

// ── Curriculum Progress Strip (older kids) ───────────────────────────

function CurriculumProgressStrip({ child, phase }: { child: Child; phase: number }) {
  const domainProg = getDomainProgress(child.id, phase);
  const stats = getProgressStats(child.id, phase);

  return (
    <Link href="/curriculum" className="block rounded-xl border border-border p-3 hover:border-brand/30 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-foreground">
          Curriculum Progress
        </span>
        <span className="text-[10px] text-muted">{stats.completed}/{stats.total} packets</span>
      </div>
      <div className="h-1.5 bg-border-light rounded-full overflow-hidden mb-2">
        <div className="h-full bg-brand rounded-full transition-all duration-500" style={{ width: `${stats.pct}%` }} />
      </div>
      <div className="flex gap-1">
        {domainProg.map(d => (
          <div key={d.domainId} className="flex-1" title={`${d.domainName}: ${d.completed}/${d.total}`}>
            <div className="h-1 rounded-full" style={{
              backgroundColor: d.pct > 0 ? `color-mix(in srgb, ${d.domainColor} ${Math.max(d.pct, 20)}%, #e5e7eb)` : '#e5e7eb',
            }} />
          </div>
        ))}
      </div>
    </Link>
  );
}

// ── Graduated Hero (replaces moment card for graduated kids) ──────────

function GraduatedHero({ child }: { child: Child }) {
  return (
    <Link href="/curriculum" className="block rounded-2xl border border-border overflow-hidden">
      <div className="px-4 py-3 bg-amber-50/50">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🌳</span>
          <span className="text-sm font-semibold text-amber-700">
            {child.name} has graduated from Planting Roots
          </span>
        </div>
        <p className="text-xs text-secondary">
          Ready for the next phase. Explore the full curriculum to continue their formation journey.
        </p>
      </div>
      <div className="px-4 py-3 flex items-center justify-between">
        <span className="text-xs font-medium text-brand">Explore Curriculum</span>
        <svg className="w-4 h-4 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

// ── Main Home Page ─────────────────────────────────────────────────────

export default function HomePage() {
  const { parentName, children, activeChild, activeBand, activeWeek, milestoneProgress, setActiveChild, setChildWeek } = useApp();
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('morning');
  const [pickedMoment, setPickedMoment] = useState<DailyMoment | null>(null);
  const [activeLocation, setActiveLocation] = useState<Location | null>(null);

  const currentPhase = activeWeek ?? getDefaultPhase();
  const activeGuide = activeBand > 0 ? getWeeklyGuide(activeBand, currentPhase) : null;
  const activeDomainCode = (activeGuide?.domain_code || 'LANG') as DomainCode;
  const color = DOMAIN_COLORS[activeDomainCode];

  useEffect(() => {
    setTimeOfDay(getTimeOfDay());
  }, []);

  // Reset picked moment and location when child changes
  useEffect(() => {
    setPickedMoment(null);
    setActiveLocation(null);
  }, [activeChild?.id]);

  // Browser notification reminders
  useEffect(() => {
    if (!activeChild || !activeGuide) return;
    const cleanup = startReminderInterval(() => {
      if (!activeGuide.daily_moments?.length) return null;
      const m = activeGuide.daily_moments[Math.floor(Math.random() * activeGuide.daily_moments.length)];
      return { childName: activeChild.name, momentName: m.moment_name, sayThis: m.say_this };
    });
    return cleanup;
  }, [activeChild, activeGuide]);

  // No children — welcome
  if (!activeChild || children.length === 0) {
    return <div className="py-4"><WelcomeState /></div>;
  }

  const evergreenPhase = getEvergreenPhase(activeChild.birth_date);
  const isPhase0 = evergreenPhase === 0;
  const isOlderKid = evergreenPhase > 0;
  const isGraduated = activeBand === 0;
  const hasMoments = activeGuide && activeGuide.daily_moments?.length > 0 && isPhase0 && !isGraduated;

  // Get time-filtered moments, then optionally filter by location
  const timeMoments = hasMoments ? getMomentsForTime(activeGuide.daily_moments, timeOfDay) : [];
  const filteredMoments = activeLocation
    ? getMomentsForLocation(timeMoments, activeLocation)
    : timeMoments;
  const heroMoment = pickedMoment || filteredMoments[0] || timeMoments[0] || (hasMoments ? activeGuide.daily_moments[0] : null);
  const otherMoments = heroMoment
    ? filteredMoments.filter(m => m.moment_name !== heroMoment.moment_name).slice(0, 3)
    : [];

  // Available locations for the current time's moments
  const availableLocations = hasMoments ? getAvailableLocationsForMoments(timeMoments) : [];

  // Subtitle for greeting
  const greetingSubtitle = isPhase0 && activeGuide
    ? `Phase ${currentPhase} · ${DOMAIN_ICONS[activeDomainCode]} ${DOMAIN_FULL_NAMES[activeDomainCode]}`
    : isPhase0 && isGraduated
    ? 'Graduated from Planting Roots'
    : isOlderKid
    ? `${getEvergreenPhaseLabel(evergreenPhase)} · ${getEvergreenPhaseAges(evergreenPhase)}`
    : '';

  return (
    <div className="py-4 space-y-4">
      {/* Greeting — compact */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">
            {getGreeting(timeOfDay, parentName || 'there')}
          </h1>
          {greetingSubtitle && (
            <p className="text-xs text-muted mt-0.5">{greetingSubtitle}</p>
          )}
        </div>
        <span className="text-2xl">{getTimeIcon(timeOfDay)}</span>
      </div>

      {/* Child switcher — only if multiple children */}
      {children.length > 1 && <ChildSwitcher />}

      {/* Location filter — Phase 0 only, when moments available */}
      {hasMoments && availableLocations.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1">
          <button
            onClick={() => { setActiveLocation(null); setPickedMoment(null); }}
            className={`shrink-0 flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-full border transition-colors ${
              !activeLocation
                ? 'border-brand bg-brand-light/40 text-brand-dark font-semibold'
                : 'border-border text-secondary hover:border-brand/30'
            }`}
          >
            All
          </button>
          {availableLocations.map(loc => (
            <button
              key={loc.id}
              onClick={() => {
                setActiveLocation(activeLocation === loc.id ? null : loc.id);
                setPickedMoment(null);
              }}
              className={`shrink-0 flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-full border transition-colors ${
                activeLocation === loc.id
                  ? 'border-brand bg-brand-light/40 text-brand-dark font-semibold'
                  : 'border-border text-secondary hover:border-brand/30'
              }`}
            >
              <span className="text-xs">{loc.icon}</span>
              {loc.label}
            </button>
          ))}
        </div>
      )}

      {/* HERO: What to do right now */}
      {heroMoment ? (
        <HeroMomentCard
          childName={activeChild.name}
          moment={heroMoment}
          domainCode={activeDomainCode}
          color={color}
          timeOfDay={timeOfDay}
          otherMoments={otherMoments}
          onPickMoment={setPickedMoment}
          activeLocation={activeLocation}
        />
      ) : isOlderKid ? (
        <OlderKidHero child={activeChild} phase={evergreenPhase} />
      ) : isGraduated ? (
        <GraduatedHero child={activeChild} />
      ) : null}

      {/* Quick nav — compact icon strip */}
      <QuickNav isPhase0={isPhase0} />

      {/* Progress strip — context-appropriate */}
      {isPhase0 && !isGraduated && (
        <ChildInfoStrip
          child={activeChild}
          milestoneProgress={milestoneProgress}
        />
      )}
      {isOlderKid && (
        <CurriculumProgressStrip child={activeChild} phase={evergreenPhase} />
      )}

      {/* Add child — subtle */}
      <Link
        href="/child"
        className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-dashed border-border text-xs text-muted hover:text-brand hover:border-brand/30 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Add Another Child
      </Link>
    </div>
  );
}
