'use client';

import { useApp } from '@/lib/store';
import { getBandShortLabel } from '@/lib/utils';
import Link from 'next/link';

export function TopBar() {
  const { activeChild, activeBand, children } = useApp();

  return (
    <header className="fixed top-0 left-0 right-0 bg-card/90 backdrop-blur-md border-b border-border z-50">
      <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center">
            <span className="text-white text-xs font-bold">P</span>
          </div>
          <span className="font-semibold text-sm text-foreground">Planting Their Roots</span>
        </div>
        {activeChild && (
          <Link href="/child" className="flex items-center gap-2 text-sm text-secondary hover:text-foreground transition-colors">
            <span>{activeChild.name}</span>
            <span className="text-xs bg-brand-light text-brand-dark px-2 py-0.5 rounded-full font-medium">
              {getBandShortLabel(activeBand)}
            </span>
          </Link>
        )}
      </div>
    </header>
  );
}
