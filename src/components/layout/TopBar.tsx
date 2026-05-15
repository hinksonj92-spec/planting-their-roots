'use client';

import { useApp } from '@/lib/store';
import { getBandShortLabel, getEvergreenPhase, getEvergreenPhaseLabel } from '@/lib/utils';
import Link from 'next/link';

export function TopBar() {
  const { activeChild, activeBand, children } = useApp();

  // For older kids (Phase 1-3), show the phase name instead of "Graduated"
  const phase = activeChild ? getEvergreenPhase(activeChild.birth_date) : 0;
  const badgeLabel = phase > 0 ? getEvergreenPhaseLabel(phase) : getBandShortLabel(activeBand);

  return (
    <header className="fixed top-0 left-0 right-0 bg-card/90 backdrop-blur-md border-b border-border z-50">
      <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center">
            <span className="text-white text-xs font-bold">E</span>
          </div>
          <span className="font-semibold text-sm text-foreground">Evergreen</span>
        </div>
        {activeChild && (
          <Link href="/child" className="flex items-center gap-2 text-sm text-secondary hover:text-foreground transition-colors max-w-[50%]">
            <span className="truncate">{activeChild.name}</span>
            <span className="text-xs bg-brand-light text-brand-dark px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
              {badgeLabel}
            </span>
          </Link>
        )}
      </div>
    </header>
  );
}
