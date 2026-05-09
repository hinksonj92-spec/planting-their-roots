'use client';

import { useState } from 'react';
import { useApp } from '@/lib/store';
import { getAgeString, getBandShortLabel, getBandFromBirthDate, DOMAIN_COLORS, DOMAIN_ICONS, DOMAIN_NAMES } from '@/lib/utils';
import { getWeeklyGuide, getCurrentWeekNumber, getMilestones } from '@/lib/content';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';
import type { DomainCode, Child } from '@/types';

const ALL_DOMAINS: DomainCode[] = ['LANG', 'MOTR', 'NUMR', 'SOCL', 'ROUT', 'SENS', 'INDP'];

function ChildCard({
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
  const suggestedWeek = getCurrentWeekNumber();
  const currentWeek = child.current_week ?? suggestedWeek;
  const guide = getWeeklyGuide(band, currentWeek);
  const allMilestones = getMilestones(band);

  // Milestone counts
  const totalMilestones = allMilestones.length;
  let completedMilestones = 0;
  for (const m of allMilestones) {
    const key = `${child.id}-${m.band}-${m.domain_code}-${m.description}`;
    if (milestoneProgress[key]?.observed_date) completedMilestones++;
  }
  const milestonePct = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  // Per-domain progress (compact)
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

  const domainCode = guide?.domain_code as DomainCode | undefined;
  const color = domainCode ? DOMAIN_COLORS[domainCode] : '#7BAE7F';

  return (
    <div className={`rounded-2xl border-2 transition-all ${
      isActive ? 'border-brand shadow-sm' : 'border-border'
    }`}>
      {/* Child header — tap to activate */}
      <button
        onClick={onSelect}
        className="w-full text-left p-4 pb-3"
      >
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-lg ${
            isActive ? 'bg-brand' : 'bg-muted'
          }`}>
            {child.name[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-foreground text-lg truncate">{child.name}</h2>
              {isActive && (
                <span className="text-[10px] bg-brand text-white px-1.5 py-0.5 rounded-full font-medium shrink-0">Active</span>
              )}
            </div>
            <p className="text-sm text-secondary">{getAgeString(child.birth_date)} &middot; {getBandShortLabel(band)}</p>
          </div>
        </div>
      </button>

      {/* This week focus */}
      {guide && (
        <Link href="/week" onClick={onSelect} className="block px-4 pb-3">
          <div className="rounded-xl overflow-hidden border border-border-light">
            <div className="flex items-stretch">
              <div className="w-1.5 shrink-0" style={{ backgroundColor: color }} />
              <div className="flex-1 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-medium text-muted uppercase tracking-wide">
                    Week {currentWeek} of 7
                  </span>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowWeekPicker(!showWeekPicker); }}
                    className="text-[10px] text-brand font-medium"
                  >
                    {showWeekPicker ? 'Done' : 'Change'}
                  </button>
                </div>
                <p className="font-semibold text-foreground text-sm">{guide.title}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${color} 12%, white)`,
                      color: color,
                    }}
                  >
                    {domainCode && DOMAIN_ICONS[domainCode]} {domainCode && DOMAIN_NAMES[domainCode]}
                  </span>
                  <span className="text-[10px] text-muted">{guide.daily_moments.length} moments</span>
                </div>
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* Week picker (expandable) */}
      {showWeekPicker && (
        <div className="px-4 pb-3">
          <div className="bg-background rounded-xl p-3 border border-border-light">
            <p className="text-[11px] text-secondary mb-2">
              7-week rotating cycle. Each week = one domain. Start anywhere.
            </p>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7].map(w => (
                <button
                  key={w}
                  onClick={() => { onChangeWeek(w); setShowWeekPicker(false); }}
                  className={`w-8 h-8 rounded-full text-xs font-semibold transition-all ${
                    w === currentWeek
                      ? 'bg-brand text-white'
                      : 'bg-border-light text-secondary hover:bg-brand-light/50'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
            {child.current_week !== null && (
              <button
                onClick={() => { onChangeWeek(null); setShowWeekPicker(false); }}
                className="text-[10px] text-brand mt-2 font-medium"
              >
                Reset to auto-rotation
              </button>
            )}
          </div>
        </div>
      )}

      {/* Milestone progress bar */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-muted">Milestones</span>
          <span className="text-[11px] font-semibold text-foreground">{completedMilestones}/{totalMilestones}</span>
        </div>
        <div className="h-1.5 bg-border-light rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-brand rounded-full transition-all duration-500"
            style={{ width: `${milestonePct}%` }}
          />
        </div>
        {/* Domain dots */}
        <div className="flex gap-1">
          {domainProgress.map(d => (
            <div key={d.code} className="flex-1 flex items-center gap-1">
              <div
                className="h-1 flex-1 rounded-full"
                style={{
                  backgroundColor: d.pct > 0
                    ? `color-mix(in srgb, ${DOMAIN_COLORS[d.code]} ${Math.max(d.pct, 20)}%, #e5e7eb)`
                    : '#e5e7eb',
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { parentName, children, activeChild, milestoneProgress, setActiveChild, setChildWeek } = useApp();

  if (!activeChild || children.length === 0) return null;

  return (
    <div className="py-4 space-y-5">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold text-foreground">
          Hi, {parentName || 'there'}
        </h1>
        <p className="text-secondary text-sm mt-0.5">
          {children.length === 1
            ? `Tracking ${children[0].name}'s development`
            : `Tracking ${children.length} children`
          }
        </p>
      </div>

      {/* Per-child cards */}
      <div className="space-y-4">
        {children.map(child => (
          <ChildCard
            key={child.id}
            child={child}
            isActive={child.id === activeChild.id}
            milestoneProgress={milestoneProgress}
            onSelect={() => setActiveChild(child.id)}
            onChangeWeek={(week) => setChildWeek(child.id, week)}
          />
        ))}
      </div>

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
    </div>
  );
}
