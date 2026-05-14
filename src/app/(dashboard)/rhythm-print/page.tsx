'use client';

import { useApp } from '@/lib/store';
import { getWeeklyGuide, getDefaultPhase, getRhythmSheet } from '@/lib/content';
import {
  DOMAIN_COLORS, DOMAIN_ICONS, DOMAIN_FULL_NAMES,
  getBandLabel, getAgeString, cleanGuideTitle,
} from '@/lib/utils';
import type { DomainCode } from '@/types';

const TIME_ICONS: Record<string, string> = {
  MORNING: '🌅',
  MIDDAY: '☀️',
  EVENING: '🌙',
};

const TIME_LABELS: Record<string, string> = {
  MORNING: 'Morning',
  MIDDAY: 'Midday',
  EVENING: 'Evening',
};

export default function RhythmPrintPage() {
  const { activeChild, activeBand, activeWeek } = useApp();
  const currentPhase = activeWeek ?? getDefaultPhase();
  const guide = getWeeklyGuide(activeBand, currentPhase);
  const rhythm = getRhythmSheet(activeBand);

  if (!activeChild || !guide || !rhythm) {
    return (
      <div className="py-8 text-center text-muted text-sm">
        No rhythm sheet available for this child.
      </div>
    );
  }

  const domainCode = guide.domain_code as DomainCode;
  const color = DOMAIN_COLORS[domainCode];
  const childAge = getAgeString(activeChild.birth_date);
  const bandLabel = getBandLabel(activeBand);

  return (
    <>
      {/* Print-specific styles */}
      <style>{`
        @media print {
          /* Hide app chrome */
          header, nav, .no-print { display: none !important; }
          main { padding: 0 !important; max-width: none !important; }
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-page { break-after: page; }
          .print-sheet {
            padding: 0.4in;
            font-size: 11px;
            line-height: 1.4;
          }
          .print-sheet h1 { font-size: 18px; }
          .print-sheet h2 { font-size: 14px; }
          .print-sheet h3 { font-size: 12px; }
        }
        @media screen {
          .print-sheet {
            max-width: 700px;
            margin: 0 auto;
          }
        }
      `}</style>

      {/* Screen-only print button */}
      <div className="no-print py-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Print Rhythm Sheet</h1>
            <p className="text-sm text-secondary mt-0.5">
              {activeChild.name}&apos;s daily rhythm for {DOMAIN_FULL_NAMES[domainCode]} week
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="bg-brand text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-brand-dark transition-colors shrink-0"
          >
            Print / Save PDF
          </button>
        </div>
        <div className="p-3 rounded-xl bg-brand-light/30 border border-brand/10 text-sm text-secondary">
          Tip: Use &quot;Save as PDF&quot; in your print dialog to download a copy.
        </div>
      </div>

      {/* Printable sheet */}
      <div className="print-sheet">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 pb-3 mb-4" style={{ borderColor: color }}>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {activeChild.name}&apos;s Daily Rhythm
            </h1>
            <p className="text-sm text-secondary mt-0.5">
              {childAge} · {bandLabel}
            </p>
          </div>
          <div className="text-right">
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
              style={{
                backgroundColor: `color-mix(in srgb, ${color} 15%, white)`,
                color: color,
              }}
            >
              {DOMAIN_ICONS[domainCode]} {DOMAIN_FULL_NAMES[domainCode]}
            </div>
            <p className="text-xs text-muted mt-1">
              {cleanGuideTitle(guide.title)}
            </p>
          </div>
        </div>

        {/* Parent frame */}
        <div
          className="rounded-xl p-3 mb-4 text-sm"
          style={{ backgroundColor: `color-mix(in srgb, ${color} 6%, white)` }}
        >
          <p className="font-medium text-foreground mb-1">This week&apos;s focus:</p>
          <p className="text-secondary leading-relaxed">{guide.parent_frame}</p>
        </div>

        {/* Daily Rhythm Sections */}
        <div className="space-y-4 mb-5">
          {rhythm.sections.map((section: { time_of_day: string; items: string[]; what_is_built: string }) => (
            <div key={section.time_of_day}>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-2">
                <span>{TIME_ICONS[section.time_of_day] || '⏰'}</span>
                {TIME_LABELS[section.time_of_day] || section.time_of_day}
              </h2>
              <div className="space-y-1.5 ml-6">
                {section.items.map((item: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="w-4 h-4 rounded border border-border shrink-0 mt-0.5" />
                    <span className="text-foreground">{item}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted mt-2 ml-6 italic">
                Building: {section.what_is_built}
              </p>
            </div>
          ))}
        </div>

        {/* This week's daily moments */}
        {guide.daily_moments?.length > 0 && (
          <div className="border-t border-border pt-4 mb-4">
            <h2 className="text-sm font-bold text-foreground mb-2">
              {DOMAIN_ICONS[domainCode]} Daily Moments — {DOMAIN_FULL_NAMES[domainCode]}
            </h2>
            <div className="grid grid-cols-1 gap-1.5">
              {guide.daily_moments.map((moment: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="w-4 h-4 rounded border border-border shrink-0 mt-0.5" />
                  <span className="text-foreground">{moment}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weekly check-in */}
        <div className="border-t border-border pt-4">
          <h2 className="text-sm font-bold text-foreground mb-3">Weekly Check-In</h2>
          <div className="space-y-4">
            {rhythm.weekly_checkin.map((q: string, i: number) => (
              <div key={i}>
                <p className="text-sm font-medium text-foreground mb-1">{q}</p>
                <div className="border-b border-border-light h-6" />
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-3 border-t border-border text-center">
          <p className="text-xs text-muted">
            Evergreen Homeschool · Planting Roots · {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
          <p className="text-xs text-muted italic mt-1">
            Your child does not need a perfect week. They need a present parent.
          </p>
        </div>
      </div>
    </>
  );
}
