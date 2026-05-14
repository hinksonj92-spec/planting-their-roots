'use client';

import { useApp } from '@/lib/store';
import { getRhythmSheet } from '@/lib/content';
import { getBandShortLabel } from '@/lib/utils';
import { ChildSwitcher } from '@/components/ui/ChildSwitcher';
import { GraduatedState } from '@/components/content/GraduatedState';

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

export default function RhythmPage() {
  const { activeBand, activeChild, isGraduated } = useApp();

  if (!activeChild) return <div className="py-8 text-center text-muted">No rhythm sheet found.</div>;
  if (isGraduated) return <div className="py-4"><ChildSwitcher /><GraduatedState /></div>;

  const rhythm = getRhythmSheet(activeBand);
  if (!rhythm) return <div className="py-8 text-center text-muted">No rhythm sheet found.</div>;

  return (
    <div className="py-4 space-y-4">
      <div>
        <ChildSwitcher />
        <h1 className="text-xl font-bold text-foreground mt-2">Daily Rhythm for {activeChild.name}</h1>
        <p className="text-secondary text-sm mt-0.5">
          {getBandShortLabel(activeBand)} &middot; Not a schedule &mdash; a flow.
        </p>
      </div>

      <div className="space-y-4">
        {rhythm.sections.map((section) => (
          <div key={section.time_of_day} className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="px-4 py-3 bg-border-light/50 border-b border-border flex items-center gap-2">
              <span className="text-lg">{TIME_ICONS[section.time_of_day]}</span>
              <h2 className="font-semibold text-foreground">{TIME_LABELS[section.time_of_day]}</h2>
            </div>
            <div className="px-4 py-3">
              <ul className="space-y-2">
                {section.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-[15px]">
                    <span className="text-brand mt-0.5 shrink-0">&#8226;</span>
                    <span className="text-foreground leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
              {section.what_is_built && (
                <p className="text-sm text-muted mt-3 italic border-t border-border-light pt-3">
                  {section.what_is_built}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Weekly check-in */}
      {rhythm.weekly_checkin && rhythm.weekly_checkin.length > 0 && (
        <div className="bg-brand-light/30 rounded-2xl p-4">
          <h2 className="font-semibold text-brand-dark mb-3">Check-In</h2>
          <p className="text-sm text-secondary mb-3">Take two minutes to notice:</p>
          <ul className="space-y-2">
            {rhythm.weekly_checkin.map((q, i) => (
              <li key={i} className="text-sm text-foreground">{q}</li>
            ))}
          </ul>
          <p className="text-sm font-medium text-brand-dark mt-4 italic">
            {activeChild.name} does not need a perfect day. They need a predictable one.
          </p>
        </div>
      )}
    </div>
  );
}
