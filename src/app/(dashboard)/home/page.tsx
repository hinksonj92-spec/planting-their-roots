'use client';

import { useState } from 'react';
import { useApp } from '@/lib/store';
import { getAgeString, getBandShortLabel, getBandLabel, DOMAIN_COLORS, DOMAIN_NAMES, DOMAIN_ICONS } from '@/lib/utils';
import { getWeeklyGuide, getCurrentWeekNumber, getMilestones } from '@/lib/content';
import { Card } from '@/components/ui/Card';
import { WeekDots } from '@/components/ui/WeekDots';
import Link from 'next/link';
import type { DomainCode } from '@/types';

const ALL_DOMAINS: DomainCode[] = ['LANG', 'MOTR', 'NUMR', 'SOCL', 'ROUT', 'SENS', 'INDP'];

export default function HomePage() {
  const { parentName, activeChild, activeBand, activeWeek, setChildWeek, isMilestoneComplete } = useApp();
  const [showWeekPicker, setShowWeekPicker] = useState(false);

  if (!activeChild) return null;

  const suggestedWeek = getCurrentWeekNumber();
  const currentWeek = activeWeek ?? suggestedWeek;
  const guide = getWeeklyGuide(activeBand, currentWeek);
  const allMilestones = getMilestones(activeBand);

  // Calculate milestone progress per domain
  const domainProgress = ALL_DOMAINS.map(code => {
    const domainMilestones = allMilestones.filter(m => m.domain_code === code);
    const total = domainMilestones.length;
    const completed = domainMilestones.filter(m =>
      isMilestoneComplete(`${m.band}-${m.domain_code}-${m.description}`)
    ).length;
    return { code, total, completed, pct: total > 0 ? Math.round((completed / total) * 100) : 0 };
  });

  const totalMilestones = allMilestones.length;
  const totalCompleted = domainProgress.reduce((sum, d) => sum + d.completed, 0);
  const overallPct = totalMilestones > 0 ? Math.round((totalCompleted / totalMilestones) * 100) : 0;

  return (
    <div className="py-4 space-y-5">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold text-foreground">
          Hi, {parentName || 'there'}
        </h1>
        <p className="text-secondary text-sm mt-0.5">
          {activeChild.name} &middot; {getAgeString(activeChild.birth_date)} &middot; {getBandLabel(activeBand)}
        </p>
      </div>

      {/* Week selection */}
      <Card className="relative">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted uppercase tracking-wide mb-0.5">Current Week</p>
            <p className="font-semibold text-foreground">Week {currentWeek} of 7</p>
            {activeWeek === null && (
              <p className="text-[10px] text-muted mt-0.5">Auto-rotating based on calendar</p>
            )}
            {activeWeek !== null && (
              <p className="text-[10px] text-brand mt-0.5">Manually set &middot; <button onClick={() => setChildWeek(activeChild.id, null)} className="underline">reset to auto</button></p>
            )}
          </div>
          <button
            onClick={() => setShowWeekPicker(!showWeekPicker)}
            className="text-xs text-brand font-medium hover:underline"
          >
            {showWeekPicker ? 'Done' : 'Change'}
          </button>
        </div>
        {showWeekPicker && (
          <div className="mt-3 pt-3 border-t border-border-light">
            <p className="text-xs text-secondary mb-2">
              PTR uses a 7-week rotating cycle. Each week focuses on a different developmental domain. We suggest Week {suggestedWeek} based on the calendar, but you can start wherever you like — the content builds on itself gently, not sequentially.
            </p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map(w => (
                <button
                  key={w}
                  onClick={() => { setChildWeek(activeChild.id, w); setShowWeekPicker(false); }}
                  className={`w-9 h-9 rounded-full text-sm font-semibold transition-all ${
                    w === currentWeek
                      ? 'bg-brand text-white'
                      : 'bg-border-light text-secondary hover:bg-brand-light/50'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* This Week card */}
      {guide && (
        <Link href="/week" className="block">
          <Card className="relative overflow-hidden">
            <div
              className="absolute top-0 left-0 w-1.5 h-full rounded-l-2xl"
              style={{ backgroundColor: DOMAIN_COLORS[guide.domain_code as DomainCode] }}
            />
            <div className="pl-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted uppercase tracking-wide">This Week</span>
                <WeekDots currentWeek={currentWeek} />
              </div>
              <h2 className="font-semibold text-foreground">{guide.title}</h2>
              <p className="text-secondary text-sm mt-1 italic">&ldquo;{guide.parent_frame}&rdquo;</p>
              <div className="flex items-center gap-2 mt-3">
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${DOMAIN_COLORS[guide.domain_code as DomainCode]} 12%, white)`,
                    color: DOMAIN_COLORS[guide.domain_code as DomainCode],
                  }}
                >
                  {DOMAIN_ICONS[guide.domain_code as DomainCode]} {DOMAIN_NAMES[guide.domain_code as DomainCode]}
                </span>
                <span className="text-xs text-muted">{guide.daily_moments.length} daily moments</span>
              </div>
            </div>
          </Card>
        </Link>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/cards">
          <Card className="text-center py-5">
            <div className="text-2xl mb-1">🃏</div>
            <p className="text-sm font-medium text-foreground">Moment Cards</p>
            <p className="text-xs text-muted mt-0.5">Quick reference</p>
          </Card>
        </Link>
        <Link href="/rhythm">
          <Card className="text-center py-5">
            <div className="text-2xl mb-1">🔄</div>
            <p className="text-sm font-medium text-foreground">Daily Rhythm</p>
            <p className="text-xs text-muted mt-0.5">Your day&apos;s flow</p>
          </Card>
        </Link>
      </div>

      {/* Milestone overview */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-foreground">Milestones</h2>
          <Link href="/milestones" className="text-sm text-brand font-medium">View all</Link>
        </div>

        {/* Overall progress bar */}
        <Card className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-secondary">{getBandShortLabel(activeBand)} Progress</span>
            <span className="text-sm font-semibold text-foreground">{totalCompleted}/{totalMilestones}</span>
          </div>
          <div className="h-2 bg-border-light rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all duration-500"
              style={{ width: `${overallPct}%` }}
            />
          </div>
        </Card>

        {/* Per-domain mini bars */}
        <div className="space-y-2">
          {domainProgress.map(d => (
            <div key={d.code} className="flex items-center gap-3">
              <span className="text-sm w-6 text-center">{DOMAIN_ICONS[d.code]}</span>
              <div className="flex-1">
                <div className="h-1.5 bg-border-light rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${d.pct}%`, backgroundColor: DOMAIN_COLORS[d.code] }}
                  />
                </div>
              </div>
              <span className="text-xs text-muted w-10 text-right">{d.completed}/{d.total}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
