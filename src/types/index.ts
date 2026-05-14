// ============================================
// Evergreen Homeschool — Type Definitions
// ============================================

// --- Developmental Domains ---

export type DomainCode = 'LANG' | 'MOTR' | 'NUMR' | 'SOCL' | 'ROUT' | 'SENS' | 'INDP';

export interface Domain {
  id: number;
  code: DomainCode;
  name: string;
  color: string;
  icon: string;
  sort_order: number;
}

// --- Profiles & Children ---

export interface Profile {
  id: string;
  display_name: string;
  created_at: string;
}

export interface Child {
  id: string;
  created_by: string;
  name: string;
  birth_date: string;
  current_band: number;
  current_week: number | null;
  created_at: string;
}

export interface ChildAccess {
  id: string;
  user_id: string;
  child_id: string;
  role: 'creator' | 'parent' | 'viewer';
  joined_at: string;
}

export interface InviteLink {
  id: string;
  child_id: string;
  token: string;
  created_by: string;
  expires_at: string;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
}

// Band = developmental stage
// Band 1: Infant (0-12 months)
// Band 2: Toddler (12-30 months)
// Band 3: Pre-Phase 1 (30-48+ months)

export type Band = 1 | 2 | 3;

export const BAND_LABELS: Record<Band, string> = {
  1: 'Infant (0–12 months)',
  2: 'Toddler (12–30 months)',
  3: 'Pre-Phase 1 (30–48 months)',
};

export const BAND_SHORT_LABELS: Record<Band, string> = {
  1: 'Infant',
  2: 'Toddler',
  3: 'Pre-Phase 1',
};

// --- Content: Weekly Guides (static JSON, no id) ---

export interface WeeklyGuide {
  band: number;
  week_number: number;
  domain_code: string;
  title: string;
  parent_frame: string;
  why_this_matters: string;
  focus_items: string[];
  keep_doing: string;
  what_you_need: string;
  daily_moments: DailyMoment[];
  reflection_questions: string[];
}

export interface DailyMoment {
  moment_name: string;
  say_this: string;
  do_this: string[];
  what_this_builds: string;
  sort_order: number;
}

// --- Content: Moment Cards ---

export interface MomentCard {
  band: number;
  moment_name: string;
  domains_tagged: string[];
  say_this: string;
  do_this: string[];
  what_this_builds: string;
  post_at: string;
  closing_line: string;
}

// --- Content: Rhythm Sheets ---

export interface RhythmSection {
  time_of_day: string;
  items: string[];
  what_is_built: string;
}

export interface RhythmSheet {
  band: number;
  sections: RhythmSection[];
  weekly_checkin: string[];
}

// --- Content: Milestones ---

export interface Milestone {
  band: number;
  domain_code: string;
  description: string;
  typical_range: string;
  sort_order: number;
}

// --- Progress Tracking ---

export interface ChildMilestone {
  id: string;
  child_id: string;
  milestone_id: string;
  observed_date: string | null;
  notes: string | null;
}

export interface WeeklyReflection {
  id: string;
  child_id: string;
  guide_id: string;
  started_at: string;
  completed_at: string | null;
  whats_new: string;
  whats_strong: string;
  whats_falling_apart: string;
  what_you_enjoyed: string;
}
