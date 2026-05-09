// ============================================
// Static content data access layer
// For MVP: content is bundled as JSON, not fetched from Supabase
// Post-MVP: migrate to Supabase queries
// ============================================

import weeklyGuidesData from '@/data/weekly-guides.json';
import momentCardsData from '@/data/moment-cards.json';
import rhythmSheetsData from '@/data/rhythm-sheets.json';
import milestonesData from '@/data/milestones.json';
import type { WeeklyGuide, MomentCard, RhythmSheet, Milestone } from '@/types';

// --- Weekly Guides ---

const guides = weeklyGuidesData as unknown as WeeklyGuide[];
const cards = momentCardsData as unknown as MomentCard[];
const rhythms = rhythmSheetsData as unknown as RhythmSheet[];
const milestones = milestonesData as unknown as Milestone[];

export function getWeeklyGuides(band: number): WeeklyGuide[] {
  return guides.filter(g => g.band === band);
}

export function getWeeklyGuide(band: number, weekNumber: number): WeeklyGuide | undefined {
  return guides.find(g => g.band === band && g.week_number === weekNumber);
}

export function getCurrentWeekNumber(): number {
  // 7-week rotation based on ISO week number
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  const isoWeek = Math.ceil((days + start.getDay() + 1) / 7);
  return ((isoWeek - 1) % 7) + 1;
}

// --- Moment Cards ---

export function getMomentCards(band: number): MomentCard[] {
  return cards.filter(c => c.band === band);
}

export function getMomentCardsByMoment(band: number, momentName: string): MomentCard[] {
  return cards.filter(c => c.band === band && c.moment_name.toLowerCase().includes(momentName.toLowerCase()));
}

// --- Rhythm Sheets ---

export function getRhythmSheet(band: number): RhythmSheet | undefined {
  return rhythms.find(r => r.band === band);
}

// --- Milestones ---

export function getMilestones(band: number): Milestone[] {
  return milestones.filter(m => m.band === band);
}

export function getMilestonesByDomain(band: number, domainCode: string): Milestone[] {
  return milestones.filter(m => m.band === band && m.domain_code === domainCode);
}

// --- Utility ---

export function getBandFromAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const now = new Date();
  const ageMonths = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());

  if (ageMonths < 12) return 1;
  if (ageMonths < 30) return 2;
  return 3;
}
