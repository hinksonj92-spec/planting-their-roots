import { DomainCode } from '@/types';

const BAND_LABELS: Record<number, string> = {
  0: 'Graduated (4+ years)',
  1: 'Infant (0–12 months)',
  2: 'Toddler (1–2 years)',
  3: 'Pre-Phase 1 (2–4 years)',
};

const BAND_SHORT_LABELS: Record<number, string> = {
  0: 'Graduated',
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

/**
 * Returns the content band for Phase 0 (Planting Roots).
 * Band 1: Infant (0–12 months)
 * Band 2: Toddler (12–30 months)
 * Band 3: Pre-Phase 1 (30–48 months)
 * Band 0: Graduated — child is 4+ and has aged out of Phase 0 content
 */
export function getBandFromBirthDate(birthDate: string): number {
  const birth = new Date(birthDate);
  const now = new Date();
  const ageMonths = (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth()) +
    (now.getDate() < birth.getDate() ? -1 : 0); // Account for day-of-month
  if (ageMonths < 0) return 1; // Future date — treat as newborn
  if (ageMonths >= 48) return 0; // Graduated from Phase 0
  if (ageMonths < 12) return 1;
  if (ageMonths < 30) return 2;
  return 3;
}

export function getAgeString(birthDate: string): string {
  const birth = new Date(birthDate);
  const now = new Date();
  const ageMonths = (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth()) +
    (now.getDate() < birth.getDate() ? -1 : 0); // Account for day-of-month
  if (ageMonths < 0) return 'Not yet born';
  if (ageMonths < 1) return 'Newborn';
  if (ageMonths < 12) return ageMonths + (ageMonths === 1 ? ' month' : ' months');
  const years = Math.floor(ageMonths / 12);
  const months = ageMonths % 12;
  if (months === 0) return years + (years === 1 ? ' year' : ' years');
  return years + (years === 1 ? ' year' : ' years') + ', ' + months + (months === 1 ? ' month' : ' months');
}

/** Validate birth date: must be today or in the past */
export function isValidBirthDate(dateStr: string): boolean {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(23, 59, 59, 999); // Allow today
  return date <= today;
}

/** Strip "Week X: " prefix from guide titles since we show the domain label separately */
export function cleanGuideTitle(title: string): string {
  return title.replace(/^Week\s+\d+:\s*/i, '');
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

/**
 * Determine which Evergreen phase a child belongs to based on birth date.
 * Phase 0: Planting Roots (ages 0-4)
 * Phase 1: Stretching Branches (ages 5-10) → Tier A
 * Phase 2: Weathering Storms (ages 11-14) → Tier B
 * Phase 3: Standing Ground (ages 15-18) → Tier C
 */
export function getEvergreenPhase(birthDate: string): number {
  const birth = new Date(birthDate);
  const now = new Date();
  const ageYears = now.getFullYear() - birth.getFullYear() -
    (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate()) ? 1 : 0);
  if (ageYears < 5) return 0;
  if (ageYears < 11) return 1;
  if (ageYears < 15) return 2;
  return 3;
}

export function getEvergreenPhaseLabel(phase: number): string {
  switch (phase) {
    case 0: return 'Planting Roots';
    case 1: return 'Stretching Branches';
    case 2: return 'Weathering Storms';
    case 3: return 'Standing Ground';
    default: return 'Stretching Branches';
  }
}

export function getEvergreenPhaseAges(phase: number): string {
  switch (phase) {
    case 0: return 'Ages 0-4';
    case 1: return 'Ages 5-10';
    case 2: return 'Ages 11-14';
    case 3: return 'Ages 15-18';
    default: return '';
  }
}
