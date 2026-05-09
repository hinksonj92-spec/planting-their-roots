'use client';

import { DOMAIN_COLORS, DOMAIN_FULL_NAMES } from '@/lib/utils';
import { DomainCode } from '@/types';

const WEEK_ORDER: DomainCode[] = ['LANG', 'MOTR', 'NUMR', 'SOCL', 'ROUT', 'SENS', 'INDP'];

interface WeekDotsProps {
  currentWeek: number;
  onSelect?: (week: number) => void;
}

export function WeekDots({ currentWeek, onSelect }: WeekDotsProps) {
  return (
    <div className="flex items-center gap-2">
      {WEEK_ORDER.map((code, i) => {
        const weekNum = i + 1;
        const isActive = weekNum === currentWeek;
        const color = DOMAIN_COLORS[code];
        return (
          <button
            key={code}
            onClick={() => onSelect?.(weekNum)}
            className={`rounded-full transition-all ${
              isActive ? 'w-8 h-3' : 'w-3 h-3 opacity-40 hover:opacity-70'
            }`}
            style={{ backgroundColor: color }}
            title={`Week ${weekNum}: ${DOMAIN_FULL_NAMES[code]}`}
            aria-label={`Week ${weekNum}: ${DOMAIN_FULL_NAMES[code]}`}
          />
        );
      })}
    </div>
  );
}
