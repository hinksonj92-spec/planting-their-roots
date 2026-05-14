'use client';

import { useState, useEffect } from 'react';
import { DOMAIN_COLORS, DOMAIN_ICONS, DOMAIN_FULL_NAMES } from '@/lib/utils';
import type { DailyMoment, DomainCode } from '@/types';

type TimeOfDay = 'morning' | 'midday' | 'evening';

function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'midday';
  return 'evening';
}

function getGreeting(timeOfDay: TimeOfDay): string {
  switch (timeOfDay) {
    case 'morning': return 'Good morning';
    case 'midday': return 'This afternoon';
    case 'evening': return 'This evening';
  }
}

function getTimeIcon(timeOfDay: TimeOfDay): string {
  switch (timeOfDay) {
    case 'morning': return '🌅';
    case 'midday': return '☀️';
    case 'evening': return '🌙';
  }
}

// Map daily moments to rough time-of-day based on moment_name keywords
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

  // If no keyword match, distribute evenly by sort_order
  if (matched.length === 0) {
    const sorted = [...moments].sort((a, b) => a.sort_order - b.sort_order);
    const third = Math.ceil(sorted.length / 3);
    if (timeOfDay === 'morning') return sorted.slice(0, third);
    if (timeOfDay === 'midday') return sorted.slice(third, third * 2);
    return sorted.slice(third * 2);
  }

  return matched;
}

export function DailyMomentPrompt({
  childName,
  moments,
  domainCode,
}: {
  childName: string;
  moments: DailyMoment[];
  domainCode: DomainCode;
}) {
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('morning');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setTimeOfDay(getTimeOfDay());
  }, []);

  if (!moments || moments.length === 0) return null;

  const timeMoments = getMomentsForTime(moments, timeOfDay);
  const displayMoment = timeMoments[0] || moments[0];
  const color = DOMAIN_COLORS[domainCode];

  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: `color-mix(in srgb, ${color} 8%, white)` }}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{getTimeIcon(timeOfDay)}</span>
          <div>
            <p className="text-xs font-semibold" style={{ color }}>
              {getGreeting(timeOfDay)}, try this with {childName}
            </p>
            <p className="text-[10px] text-muted">
              {DOMAIN_ICONS[domainCode]} {DOMAIN_FULL_NAMES[domainCode]}
            </p>
          </div>
        </div>
        {timeMoments.length > 1 && (
          <span className="text-[10px] text-muted">{timeMoments.length} moments</span>
        )}
      </div>

      {/* Featured moment */}
      <div className="p-4">
        <p className="text-sm font-semibold text-foreground mb-1">
          {displayMoment.moment_name}
        </p>
        <p className="text-sm text-secondary leading-relaxed mb-2">
          &ldquo;{displayMoment.say_this.length > 120
            ? displayMoment.say_this.slice(0, 120) + '...'
            : displayMoment.say_this}&rdquo;
        </p>

        {!expanded && displayMoment.do_this.length > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className="text-xs font-medium hover:underline"
            style={{ color }}
          >
            Show what to do ({displayMoment.do_this.length} steps) →
          </button>
        )}

        {expanded && (
          <div className="mt-2 space-y-1.5">
            {displayMoment.do_this.map((step, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-secondary">
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5"
                  style={{ backgroundColor: color }}
                >
                  {i + 1}
                </span>
                <span>{step}</span>
              </div>
            ))}
            <p className="text-[10px] text-muted italic mt-2">
              Builds: {displayMoment.what_this_builds}
            </p>
            <button
              onClick={() => setExpanded(false)}
              className="text-xs font-medium hover:underline"
              style={{ color }}
            >
              Show less
            </button>
          </div>
        )}
      </div>

      {/* Other moments for this time */}
      {timeMoments.length > 1 && (
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
          {timeMoments.slice(1, 4).map((m, i) => (
            <div
              key={i}
              className="shrink-0 text-[10px] px-2.5 py-1 rounded-full border border-border-light text-secondary"
            >
              {m.moment_name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
