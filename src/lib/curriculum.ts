import curriculumIndex from '@/data/curriculum-index.json';

export interface CurriculumDomain {
  id: string;
  name: string;
  full_name: string;
  color: string;
  icon: string;
  order: number;
  pillars: string[];
}

export interface CurriculumPillar {
  id: string;
  name: string;
  domain_id: string;
  focuses: Record<string, string>;
  packets: { A: string[]; B: string[]; C: string[] };
  packet_count: number;
}

export interface CurriculumPacket {
  id: string;
  title: string;
  pillar_id: string;
  pillar_name: string;
  focus_id: string;
  focus_name: string;
  tier: string;
  tier_detail: string;
  domain_raw: string;
  prerequisites: string[];
  competence_markers: string[];
}

const data = curriculumIndex as {
  domains: Record<string, CurriculumDomain>;
  pillars: Record<string, CurriculumPillar>;
  packets: CurriculumPacket[];
  stats: { total_packets: number; total_pillars: number; total_domains: number; total_focuses: number; by_tier: Record<string, number> };
};

export function getDomains(): CurriculumDomain[] {
  return Object.values(data.domains).sort((a, b) => a.order - b.order);
}

export function getDomain(id: string): CurriculumDomain | undefined {
  return data.domains[id];
}

export function getPillar(id: string): CurriculumPillar | undefined {
  return data.pillars[id];
}

export function getPillarsForDomain(domainId: string): CurriculumPillar[] {
  const domain = data.domains[domainId];
  if (!domain) return [];
  return domain.pillars.map(pid => data.pillars[pid]).filter(Boolean).sort((a, b) => a.id.localeCompare(b.id));
}

export function getPacketsForPillar(pillarId: string, tier?: string): CurriculumPacket[] {
  let packets = data.packets.filter(p => p.pillar_id === pillarId);
  if (tier) packets = packets.filter(p => p.tier === tier);
  return packets.sort((a, b) => a.id.localeCompare(b.id));
}

export function getPacket(id: string): CurriculumPacket | undefined {
  return data.packets.find(p => p.id === id);
}

export function getStats() {
  return data.stats;
}

// Map phase number to tier letter
export function phaseToTier(phase: number): string {
  switch (phase) {
    case 1: return 'A';
    case 2: return 'B';
    case 3: return 'C';
    default: return 'A';
  }
}

export const PHASES = [
  { id: 0, name: 'Planting Roots', ages: '0-4', description: 'Developmental formation — building the human substrate' },
  { id: 1, name: 'Stretching Branches', ages: '5-10', description: 'Foundation building across all domains' },
  { id: 2, name: 'Weathering Storms', ages: '11-14', description: 'Deepening competence and resilience' },
  { id: 3, name: 'Standing Ground', ages: '15-18', description: 'Mastery, independence, and sovereignty' },
];
