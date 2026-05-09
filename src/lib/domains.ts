import { Domain, DomainCode } from '@/types';

export const DOMAINS: Domain[] = [
  { id: 1, code: 'LANG', name: 'Language Acquisition', color: '#E07A5F', icon: '💬', sort_order: 1 },
  { id: 2, code: 'MOTR', name: 'Motor Development', color: '#5B8FBE', icon: '🏃', sort_order: 2 },
  { id: 3, code: 'NUMR', name: 'Numeracy Roots', color: '#D4A843', icon: '🔢', sort_order: 3 },
  { id: 4, code: 'SOCL', name: 'Social-Emotional Foundation', color: '#C97B84', icon: '❤️', sort_order: 4 },
  { id: 5, code: 'ROUT', name: 'Routine & Habit Formation', color: '#7BAE7F', icon: '🔄', sort_order: 5 },
  { id: 6, code: 'SENS', name: 'Sensory & Environmental Awareness', color: '#9B7653', icon: '🌿', sort_order: 6 },
  { id: 7, code: 'INDP', name: 'Independence & Practical Life', color: '#4EADA3', icon: '⭐', sort_order: 7 },
];

export function getDomain(code: DomainCode): Domain {
  const d = DOMAINS.find(d => d.code === code);
  if (!d) throw new Error(`Unknown domain code: ${code}`);
  return d;
}

export function getDomainColor(code: DomainCode): string {
  return getDomain(code).color;
}

// Week number → Domain mapping (the 7-week rotation)
export const WEEK_DOMAIN_MAP: Record<number, DomainCode> = {
  1: 'LANG',
  2: 'MOTR',
  3: 'NUMR',
  4: 'SOCL',
  5: 'ROUT',
  6: 'SENS',
  7: 'INDP',
};
