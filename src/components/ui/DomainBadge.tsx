'use client';

import { DomainCode } from '@/types';
import { DOMAIN_COLORS, DOMAIN_NAMES, DOMAIN_ICONS } from '@/lib/utils';

interface DomainBadgeProps {
  code: DomainCode;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export function DomainBadge({ code, size = 'sm', showIcon = true }: DomainBadgeProps) {
  const color = DOMAIN_COLORS[code];
  const name = DOMAIN_NAMES[code];
  const icon = DOMAIN_ICONS[code];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 12%, white)`,
        color: color,
      }}
    >
      {showIcon && <span>{icon}</span>}
      {name}
    </span>
  );
}
