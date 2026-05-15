/**
 * Resource type parser for curriculum packet book entries.
 *
 * YAML packets store ALL resources (books, videos, equipment, etc.) in the
 * `books` field.  Each entry's `title` is prefixed with bracket tags like
 * [Video], [Equipment], [Book / Read Aloud], etc.  This module parses those
 * tags into structured, categorised resource objects for UI rendering.
 */

// ── Types ────────────────────────────────────────────────────────────────

export type ResourceCategory = 'book' | 'video' | 'audio' | 'supply' | 'reference' | 'activity';

export interface ParsedResource {
  /** Display title with bracket tags stripped */
  title: string;
  author: string;
  audience: 'mentor' | 'student';
  /** Primary resource category */
  category: ResourceCategory;
  /** Original bracket tags found in the title */
  tags: string[];
  /** Reading mode hint (read-aloud, independent, look-together, etc.) */
  mode?: string;
  /** Pacing hint (early, mid, late, ongoing, etc.) */
  pacing?: string;
  /** Priority tier from book list (required / suggested / supplementary) */
  priority: 'required' | 'suggested' | 'supplementary';
}

export interface CategorisedResources {
  books: ParsedResource[];
  videos: ParsedResource[];
  audio: ParsedResource[];
  supplies: ParsedResource[];
  references: ParsedResource[];
  activities: ParsedResource[];
}

// ── Tag classification maps ──────────────────────────────────────────────

const VIDEO_TAGS = new Set([
  'video', 'watch', 'watch together', 'documentary',
]);

const AUDIO_TAGS = new Set([
  'listen', 'listen together',
]);

const SUPPLY_TAGS = new Set([
  'equipment', 'materials', 'tool', 'tools', 'annotation supply',
]);

const REFERENCE_TAGS = new Set([
  'reference', 'website', 'online', 'atlas', 'field guide',
  'textbook', 'primary source', 'curriculum support', 'curriculum spine',
]);

const ACTIVITY_TAGS = new Set([
  'activity', 'hands-on', 'practice', 'game', 'field exercise',
  'visit', 'join', 'practice tool',
]);

const MODE_TAGS = new Set([
  'read aloud', 'read', 'read together', 'look together',
  'read aloud / look together', 'study', 'read / study',
  'read / reference', 'instruction', 'course', 'use',
]);

const PACING_TAGS = new Set([
  'early packet', 'early in the packet', 'early in packet',
  'early-to-mid packet', 'mid-packet', 'mid packet',
  'mid-to-late packet', 'late packet', 'late in the packet',
  'end of packet', 'end of packet — capstone', 'capstone',
  'ongoing', 'ongoing — backbone of the packet',
  'daily', 'weekly', 'bi-weekly', 'biweekly', 'monthly', 'quarterly',
  'weekly, with mentor', 'as needed', 'as opportunities arise',
]);

const AUDIENCE_TAGS = new Set([
  'for mentor', 'for student', 'for student — read aloud',
  'for student — read aloud or independent',
]);

// ── Parser ───────────────────────────────────────────────────────────────

const BRACKET_RE = /\[([^\]]*)\]/g;

interface RawBookEntry {
  audience: string;
  title: string;
  author: string;
}

function parseTitle(rawTitle: string): { cleanTitle: string; tags: string[] } {
  const tags: string[] = [];
  const cleanTitle = rawTitle.replace(BRACKET_RE, (_, tag: string) => {
    const t = tag.trim();
    if (t.length > 0) tags.push(t);
    return '';
  }).trim();

  return { cleanTitle, tags };
}

function classifyCategory(tags: string[]): ResourceCategory {
  const lower = tags.map(t => t.toLowerCase());

  for (const t of lower) {
    if (VIDEO_TAGS.has(t)) return 'video';
    if (AUDIO_TAGS.has(t)) return 'audio';
    if (SUPPLY_TAGS.has(t)) return 'supply';
    if (ACTIVITY_TAGS.has(t)) return 'activity';
    if (REFERENCE_TAGS.has(t)) return 'reference';
  }

  return 'book'; // default
}

function extractMode(tags: string[]): string | undefined {
  const lower = tags.map(t => t.toLowerCase());
  for (const t of lower) {
    if (MODE_TAGS.has(t)) return t;
  }
  return undefined;
}

function extractPacing(tags: string[]): string | undefined {
  const lower = tags.map(t => t.toLowerCase());
  for (const t of lower) {
    if (PACING_TAGS.has(t)) return t;
  }
  return undefined;
}

function parseAudience(tags: string[], rawAudience: string): 'mentor' | 'student' {
  const lower = tags.map(t => t.toLowerCase());
  if (lower.some(t => t.includes('for mentor'))) return 'mentor';
  if (lower.some(t => t.includes('for student'))) return 'student';
  return rawAudience === 'mentor' ? 'mentor' : 'student';
}

function parseEntry(
  entry: RawBookEntry,
  priority: 'required' | 'suggested' | 'supplementary',
): ParsedResource {
  const { cleanTitle, tags } = parseTitle(entry.title);

  // Filter out audience/pacing/mode tags from display tags
  const lowerSet = new Set([...AUDIENCE_TAGS, ...PACING_TAGS, ...MODE_TAGS]);
  const displayTags = tags.filter(t => !lowerSet.has(t.toLowerCase()));

  return {
    title: cleanTitle || entry.title, // fallback to raw if parsing empties it
    author: entry.author || '',
    audience: parseAudience(tags, entry.audience),
    category: classifyCategory(tags),
    tags: displayTags,
    mode: extractMode(tags),
    pacing: extractPacing(tags),
    priority,
  };
}

// ── Public API ───────────────────────────────────────────────────────────

export function parseBookEntries(books: {
  required: RawBookEntry[];
  suggested: RawBookEntry[];
  supplementary: RawBookEntry[];
}): ParsedResource[] {
  const resources: ParsedResource[] = [];

  for (const entry of books.required || []) {
    resources.push(parseEntry(entry, 'required'));
  }
  for (const entry of books.suggested || []) {
    resources.push(parseEntry(entry, 'suggested'));
  }
  for (const entry of books.supplementary || []) {
    resources.push(parseEntry(entry, 'supplementary'));
  }

  return resources;
}

export function categoriseResources(resources: ParsedResource[]): CategorisedResources {
  const result: CategorisedResources = {
    books: [],
    videos: [],
    audio: [],
    supplies: [],
    references: [],
    activities: [],
  };

  for (const r of resources) {
    switch (r.category) {
      case 'book': result.books.push(r); break;
      case 'video': result.videos.push(r); break;
      case 'audio': result.audio.push(r); break;
      case 'supply': result.supplies.push(r); break;
      case 'reference': result.references.push(r); break;
      case 'activity': result.activities.push(r); break;
    }
  }

  return result;
}

/** Convenience: parse + categorise in one call */
export function getPacketResources(books: {
  required: RawBookEntry[];
  suggested: RawBookEntry[];
  supplementary: RawBookEntry[];
}): CategorisedResources {
  return categoriseResources(parseBookEntries(books));
}

// ── Display helpers ──────────────────────────────────────────────────────

export const RESOURCE_CATEGORY_META: Record<ResourceCategory, { label: string; icon: string; plural: string }> = {
  book: { label: 'Book', icon: '📖', plural: 'Books' },
  video: { label: 'Video', icon: '🎬', plural: 'Videos' },
  audio: { label: 'Audio', icon: '🎧', plural: 'Audio' },
  supply: { label: 'Supply', icon: '🧰', plural: 'Supplies' },
  reference: { label: 'Reference', icon: '📋', plural: 'References' },
  activity: { label: 'Activity', icon: '🎯', plural: 'Activities' },
};

/** Quick count of non-empty categories for summary display */
export function resourceSummary(cat: CategorisedResources): { label: string; count: number }[] {
  const out: { label: string; count: number }[] = [];
  if (cat.books.length) out.push({ label: '📖 Books', count: cat.books.length });
  if (cat.videos.length) out.push({ label: '🎬 Videos', count: cat.videos.length });
  if (cat.audio.length) out.push({ label: '🎧 Audio', count: cat.audio.length });
  if (cat.supplies.length) out.push({ label: '🧰 Supplies', count: cat.supplies.length });
  if (cat.references.length) out.push({ label: '📋 References', count: cat.references.length });
  if (cat.activities.length) out.push({ label: '🎯 Activities', count: cat.activities.length });
  return out;
}
