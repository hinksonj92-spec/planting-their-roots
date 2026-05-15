// ============================================
// Location tagging + filtering for moments
// ============================================

import type { DailyMoment, MomentCard } from '@/types';

// Canonical locations a parent might be "at" right now
export type Location =
  | 'kitchen'
  | 'bedroom'
  | 'bathroom'
  | 'play-area'
  | 'outside'
  | 'living-room'
  | 'reading-spot'
  | 'anywhere';

export interface LocationMeta {
  id: Location;
  label: string;
  icon: string;
}

export const LOCATIONS: LocationMeta[] = [
  { id: 'kitchen',      label: 'Kitchen',      icon: '🍳' },
  { id: 'bedroom',      label: 'Bedroom',      icon: '🛏️' },
  { id: 'bathroom',     label: 'Bathroom',     icon: '🛁' },
  { id: 'play-area',    label: 'Play Area',    icon: '🧸' },
  { id: 'outside',      label: 'Outside',      icon: '🌳' },
  { id: 'living-room',  label: 'Living Room',  icon: '🛋️' },
  { id: 'reading-spot', label: 'Reading Spot', icon: '📚' },
  { id: 'anywhere',     label: 'Anywhere',     icon: '🏠' },
];

// ── post_at → Location mapping ───────────────────────────────────────
// Maps keywords found in the free-text post_at field to canonical locations

const POST_AT_KEYWORDS: [string, Location][] = [
  ['kitchen', 'kitchen'],
  ['highchair', 'kitchen'],
  ['dining', 'kitchen'],
  ['chore', 'kitchen'],
  ['changing table', 'bedroom'],
  ['bedroom', 'bedroom'],
  ['dresser', 'bedroom'],
  ['closet', 'bedroom'],
  ['nursery', 'bedroom'],
  ['crib', 'bedroom'],
  ['rocker', 'bedroom'],
  ['bathroom', 'bathroom'],
  ['tub', 'bathroom'],
  ['bath', 'bathroom'],
  ['play area', 'play-area'],
  ['play room', 'play-area'],
  ['front door', 'outside'],
  ['coat', 'outside'],
  ['outside', 'outside'],
  ['living', 'living-room'],
  ['reading', 'reading-spot'],
  ['book', 'reading-spot'],
  ['couch', 'living-room'],
  ['bed', 'bedroom'],
  ['chair', 'reading-spot'],
  ['wherever', 'anywhere'],
];

// ── moment_name → Location mapping ───────────────────────────────────
// For DailyMoments (weekly guides) that don't have post_at

const MOMENT_NAME_KEYWORDS: [string, Location][] = [
  ['diaper', 'bedroom'],
  ['dress', 'bedroom'],
  ['wake', 'bedroom'],
  ['meal', 'kitchen'],
  ['breakfast', 'kitchen'],
  ['lunch', 'kitchen'],
  ['dinner', 'kitchen'],
  ['food', 'kitchen'],
  ['bottle', 'kitchen'],
  ['nursing', 'kitchen'],
  ['bath', 'bathroom'],
  ['tummy', 'play-area'],
  ['floor play', 'play-area'],
  ['play', 'play-area'],
  ['outside', 'outside'],
  ['nature', 'outside'],
  ['walk', 'outside'],
  ['bed', 'bedroom'],
  ['goodnight', 'bedroom'],
  ['sleep', 'bedroom'],
  ['read', 'reading-spot'],
  ['story', 'reading-spot'],
  ['narration', 'reading-spot'],
  ['book', 'reading-spot'],
  ['transition', 'living-room'],
  ['cleanup', 'living-room'],
  ['chore', 'kitchen'],
  ['tantrum', 'anywhere'],
  ['meltdown', 'anywhere'],
];

/**
 * Derive canonical locations from a MomentCard's post_at field.
 * Returns 1-2 locations (first match wins for primary, checks for secondary).
 */
export function getLocationsFromPostAt(postAt: string): Location[] {
  if (!postAt) return ['anywhere'];
  const lower = postAt.toLowerCase();
  const found = new Set<Location>();

  for (const [keyword, loc] of POST_AT_KEYWORDS) {
    if (lower.includes(keyword)) {
      found.add(loc);
    }
  }

  return found.size > 0 ? Array.from(found) : ['anywhere'];
}

/**
 * Derive canonical locations from a DailyMoment's moment_name.
 * Used for weekly guide moments that lack post_at.
 */
export function getLocationsFromMomentName(momentName: string): Location[] {
  if (!momentName) return ['anywhere'];
  const lower = momentName.toLowerCase();
  const found = new Set<Location>();

  for (const [keyword, loc] of MOMENT_NAME_KEYWORDS) {
    if (lower.includes(keyword)) {
      found.add(loc);
    }
  }

  return found.size > 0 ? Array.from(found) : ['anywhere'];
}

/**
 * Get locations for a MomentCard (uses post_at).
 */
export function getMomentCardLocations(card: MomentCard): Location[] {
  return getLocationsFromPostAt(card.post_at);
}

/**
 * Get locations for a DailyMoment (uses moment_name since no post_at).
 */
export function getDailyMomentLocations(moment: DailyMoment): Location[] {
  return getLocationsFromMomentName(moment.moment_name);
}

/**
 * Filter DailyMoments by location.
 * Returns moments whose derived location matches the target.
 */
export function getMomentsForLocation(
  moments: DailyMoment[],
  location: Location,
): DailyMoment[] {
  if (location === 'anywhere') return moments;

  return moments.filter(m => {
    const locs = getDailyMomentLocations(m);
    return locs.includes(location) || locs.includes('anywhere');
  });
}

/**
 * Filter MomentCards by location.
 */
export function getCardsForLocation(
  cards: MomentCard[],
  location: Location,
): MomentCard[] {
  if (location === 'anywhere') return cards;

  return cards.filter(c => {
    const locs = getMomentCardLocations(c);
    return locs.includes(location) || locs.includes('anywhere');
  });
}

/**
 * Get available locations for a set of DailyMoments.
 * Returns only locations that have at least one matching moment.
 */
export function getAvailableLocationsForMoments(moments: DailyMoment[]): LocationMeta[] {
  const available = new Set<Location>();
  for (const m of moments) {
    for (const loc of getDailyMomentLocations(m)) {
      available.add(loc);
    }
  }
  return LOCATIONS.filter(l => available.has(l.id));
}

/**
 * Get available locations for a set of MomentCards.
 */
export function getAvailableLocationsForCards(cards: MomentCard[]): LocationMeta[] {
  const available = new Set<Location>();
  for (const c of cards) {
    for (const loc of getMomentCardLocations(c)) {
      available.add(loc);
    }
  }
  return LOCATIONS.filter(l => available.has(l.id));
}
