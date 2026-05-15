/**
 * Curriculum progress tracking for older kids (Phase 1-3).
 *
 * Persists to localStorage per child.  Tracks:
 * - Which packets have been started / completed
 * - Current position (pillar + packet) per child
 *
 * Designed to be lightweight and decoupled from the main AppState store.
 */

import { getDomains, getPillarsForDomain, phaseToTier, type CurriculumPillar } from './curriculum';

// ── Types ────────────────────────────────────────────────────────────────

export type PacketStatus = 'not_started' | 'in_progress' | 'completed';

export interface ChildCurriculumProgress {
  /** Map of packetId → status */
  packets: Record<string, PacketStatus>;
  /** Last viewed packet ID (for "resume" UX) */
  lastViewedPacket: string | null;
  /** Timestamp of last activity */
  lastActiveAt: string | null;
}

export interface CurrentPacketInfo {
  packetId: string;
  packetTitle: string;
  pillarId: string;
  pillarName: string;
  domainId: string;
  domainName: string;
  domainColor: string;
  domainIcon: string;
  tier: string;
  /** 1-based index within the pillar's tier packets */
  packetIndex: number;
  /** Total packets in this pillar at this tier */
  totalInPillar: number;
  /** Status of this specific packet */
  status: PacketStatus;
}

// ── Storage ──────────────────────────────────────────────────────────────

const STORAGE_PREFIX = 'evergreen-curriculum-';

function getStorageKey(childId: string): string {
  return `${STORAGE_PREFIX}${childId}`;
}

function loadProgress(childId: string): ChildCurriculumProgress {
  if (typeof window === 'undefined') {
    return { packets: {}, lastViewedPacket: null, lastActiveAt: null };
  }
  try {
    const raw = localStorage.getItem(getStorageKey(childId));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore parse errors */ }
  return { packets: {}, lastViewedPacket: null, lastActiveAt: null };
}

function saveProgress(childId: string, progress: ChildCurriculumProgress): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getStorageKey(childId), JSON.stringify(progress));
  } catch { /* ignore quota errors */ }
}

// ── Public API ───────────────────────────────────────────────────────────

/** Get the full progress object for a child */
export function getProgress(childId: string): ChildCurriculumProgress {
  return loadProgress(childId);
}

/** Get status of a single packet */
export function getPacketStatus(childId: string, packetId: string): PacketStatus {
  const p = loadProgress(childId);
  return p.packets[packetId] || 'not_started';
}

/** Mark a packet as started */
export function startPacket(childId: string, packetId: string): void {
  const p = loadProgress(childId);
  if (p.packets[packetId] !== 'completed') {
    p.packets[packetId] = 'in_progress';
  }
  p.lastViewedPacket = packetId;
  p.lastActiveAt = new Date().toISOString();
  saveProgress(childId, p);
}

/** Mark a packet as completed */
export function completePacket(childId: string, packetId: string): void {
  const p = loadProgress(childId);
  p.packets[packetId] = 'completed';
  p.lastViewedPacket = packetId;
  p.lastActiveAt = new Date().toISOString();
  saveProgress(childId, p);
}

/** Toggle packet between completed and in_progress */
export function togglePacketComplete(childId: string, packetId: string): PacketStatus {
  const p = loadProgress(childId);
  const current = p.packets[packetId] || 'not_started';
  const next: PacketStatus = current === 'completed' ? 'in_progress' : 'completed';
  p.packets[packetId] = next;
  p.lastActiveAt = new Date().toISOString();
  saveProgress(childId, p);
  return next;
}

/** Record that a packet was viewed (for "resume" without changing status) */
export function viewPacket(childId: string, packetId: string): void {
  const p = loadProgress(childId);
  p.lastViewedPacket = packetId;
  p.lastActiveAt = new Date().toISOString();
  if (!p.packets[packetId]) {
    p.packets[packetId] = 'in_progress';
  }
  saveProgress(childId, p);
}

// ── Derived data ─────────────────────────────────────────────────────────

/** Get all packet IDs for a given tier, ordered by domain → pillar → focus */
export function getAllPacketsForTier(tier: string): string[] {
  const domains = getDomains();
  const packets: string[] = [];
  for (const domain of domains) {
    const pillars = getPillarsForDomain(domain.id);
    for (const pillar of pillars) {
      const tierPackets = pillar.packets[tier as 'A' | 'B' | 'C'] || [];
      packets.push(...tierPackets);
    }
  }
  return packets;
}

/** Find the next unfinished packet for a child at a given phase.
 *  Now prereq-aware: only returns unlocked packets. */
export function getNextPacket(childId: string, phase: number): string | null {
  const tier = phaseToTier(phase);
  const progress = loadProgress(childId);

  // First: resume last viewed if it's not completed AND still unlocked
  if (progress.lastViewedPacket) {
    const status = progress.packets[progress.lastViewedPacket];
    if (status === 'in_progress') {
      return progress.lastViewedPacket;
    }
  }

  // Use prereq engine to get recommended next packet
  // Dynamic require to avoid circular dependency at module level
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const prereqEngine = require('./prereq-engine');
  const recommended = prereqEngine.getNextRecommended(childId, tier, 1) as { packet: { id: string } }[];
  if (recommended.length > 0) {
    return recommended[0].packet.id;
  }

  // Fallback: all done or everything locked
  return null;
}

/** Get current packet info with full context for the hero card */
export function getCurrentPacketInfo(
  childId: string,
  phase: number,
  packetDataLookup: (id: string) => { title: string; pillar_id: string; pillar_name: string; tier: string } | undefined,
): CurrentPacketInfo | null {
  const nextId = getNextPacket(childId, phase);
  if (!nextId) return null;

  const packet = packetDataLookup(nextId);
  if (!packet) return null;

  const tier = phaseToTier(phase);

  // Find the pillar to get positional info
  const domains = getDomains();
  let pillarObj: CurriculumPillar | undefined;
  let domainObj: { id: string; name: string; color: string; icon: string } | undefined;

  for (const d of domains) {
    const pillars = getPillarsForDomain(d.id);
    const found = pillars.find(p => p.id === packet.pillar_id);
    if (found) {
      pillarObj = found;
      domainObj = d;
      break;
    }
  }

  if (!pillarObj || !domainObj) return null;

  const tierPackets = pillarObj.packets[tier as 'A' | 'B' | 'C'] || [];
  const packetIndex = tierPackets.indexOf(nextId);
  const progress = loadProgress(childId);

  return {
    packetId: nextId,
    packetTitle: packet.title,
    pillarId: packet.pillar_id,
    pillarName: packet.pillar_name,
    domainId: domainObj.id,
    domainName: domainObj.name,
    domainColor: domainObj.color,
    domainIcon: domainObj.icon,
    tier,
    packetIndex: packetIndex + 1,
    totalInPillar: tierPackets.length,
    status: progress.packets[nextId] || 'not_started',
  };
}

/** Summary stats for a child at a given phase */
export function getProgressStats(childId: string, phase: number): {
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  pct: number;
} {
  const tier = phaseToTier(phase);
  const allPackets = getAllPacketsForTier(tier);
  const progress = loadProgress(childId);

  let completed = 0;
  let inProgress = 0;

  for (const id of allPackets) {
    const s = progress.packets[id];
    if (s === 'completed') completed++;
    else if (s === 'in_progress') inProgress++;
  }

  const total = allPackets.length;
  return {
    total,
    completed,
    inProgress,
    notStarted: total - completed - inProgress,
    pct: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

/** Per-domain progress for a child at a given phase */
export function getDomainProgress(childId: string, phase: number): {
  domainId: string;
  domainName: string;
  domainColor: string;
  domainIcon: string;
  total: number;
  completed: number;
  pct: number;
}[] {
  const tier = phaseToTier(phase);
  const domains = getDomains();
  const progress = loadProgress(childId);

  return domains.map(domain => {
    const pillars = getPillarsForDomain(domain.id);
    let total = 0;
    let completed = 0;

    for (const pillar of pillars) {
      const tierPackets = pillar.packets[tier as 'A' | 'B' | 'C'] || [];
      total += tierPackets.length;
      for (const id of tierPackets) {
        if (progress.packets[id] === 'completed') completed++;
      }
    }

    return {
      domainId: domain.id,
      domainName: domain.name,
      domainColor: domain.color,
      domainIcon: domain.icon,
      total,
      completed,
      pct: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  });
}
