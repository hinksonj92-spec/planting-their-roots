import { DomainCode } from '@/types';

const BAND_LABELS: Record<number, string> = {
  1: 'Infant (0-12 months)',
  2: 'Toddler (12-30 months)',
  3: 'Pre-Phase 1 (30-48 months)',
};

const BAND_SHORT_LABELS: Record<number, string> = {
  1: 'Infant',
  2: 'Toddler',
  3: 'Pre-Phase 1',
};

export const DOMAIN_COLORS: Record<DomainCode, string> = {
  LANG: '#E07A5F',
  MOTR: '#5B8FBE',
  NUMR: '#D4A843',
  SOCL: '#C97B84',
  ROUT: '#7BAE7F',
  SENS: '#9B7653',
  INDP: '#4EADA3',
};

export const DOMAIN_ICONS: Record<DomainCode, string> = {
  LANG: '💬',
  MOTR: '🏃',
  NUMR: '🔢',
  SOCL: '❤️',
  ROUT: '🔄',
  SENS: '🌿',
  INDP: '⭐',
};

export const DOMAIN_NAMES: Record<DomainCode, string> = {
  LANG: 'Language',
  MOTR: 'Motor',
  NUMR: 'Numeracy',
  SOCL: 'Social-Emotional',
  ROUT: 'Routine & Habit',
  SENS: 'Sensory & Environment',
  INDP: 'Independence',
};

export const DOMAIN_FULL_NAMES: Record<DomainCode, string> = {
  LANG: 'Language Acquisition',
  MOTR: 'Motor Development',
  NUMR: 'Numeracy Roots',
  SOCL: 'Social-Emotional Foundation',
  ROUT: 'Routine & Habit Formation',
  SENS: 'Sensory & Environmental Awareness',
  INDP: 'Independence & Practical Life',
};

export function getBandLabel(band: number): string {
  return BAND_LABELS[band] || 'Unknown';
}

export function getBandShortLabel(band: number): string {
  return BAND_SHORT_LABELS[band] || 'Unknown';
}

export function getBandFromBirthDate(birthDate: string): number {
  const birth = new Date(birthDate);
  const now = new Date();
  const ageMonths = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (ageMonths < 12) return 1;
  if (ageMonths < 30) return 2;
  return 3;
}

export function getAgeString(birthDate: string): string {
  const birth = new Date(birthDate);
  const now = new Date();
  const ageMonths = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (ageMonths < 12) return ageMonths + ' months';
  const years = Math.floor(ageMonths / 12);
  const months = ageMonths % 12;
  if (months === 0) return years + (years === 1 ? ' year' : ' years');
  return years + (years === 1 ? ' year' : ' years') + ', ' + months + (months === 1 ? ' month' : ' months');
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Phase number -> domain mapping (the 7-phase rotation)
const PHASE_DOMAINS: DomainCode[] = ['LANG', 'MOTR', 'NUMR', 'SOCL', 'ROUT', 'SENS', 'INDP'];

export function getPhaseDomain(phase: number): DomainCode {
  return PHASE_DOMAINS[(phase - 1) % 7] || 'LANG';
}

export function getPhaseLabel(phase: number): string {
  const domain = getPhaseDomain(phase);
  return DOMAIN_FULL_NAMES[domain];
}

export function getPhaseShortLabel(phase: number): string {
  const domain = getPhaseDomain(phase);
  return DOMAIN_NAMES[domain];
}
