/**
 * Prerequisite Engine for Evergreen Homeschool
 *
 * Port of the Evergreen Engine's prereq_engine.py to TypeScript.
 * Determines which packets a student can access based on completed work.
 *
 * Core concepts:
 * - A packet is UNLOCKED when ALL its hard prerequisites are completed
 * - Tier-A packets with no prerequisites are always unlocked (entry points)
 * - Co-requisites (not yet implemented in data) would be non-blocking
 * - Dangling prerequisites (unresolvable IDs) are treated as auto-satisfied
 * - Uses curriculum-index.json for packet metadata + localStorage for progress
 */

import { getPacket, type CurriculumPacket } from './curriculum';
import curriculumIndex from '@/data/curriculum-index.json';
import { getProgress, type PacketStatus } from './curriculum-progress';

// ── Types ────────────────────────────────────────────────────────────────

export interface PrereqCheck {
  unlocked: boolean;
  satisfied: string[];
  missing: string[];
  unresolvable: string[];
  progressPct: number;
}

export interface RecommendedPacket {
  packet: CurriculumPacket;
  score: number;
  reason: string;
}

// ── Resolution ───────────────────────────────────────────────────────────

/**
 * Resolve a prerequisite ID to actual packet IDs.
 * - If it's a real packet ID → [id]
 * - If it's a tier alias (e.g., "IC1.1-B" without sub-number) → all matching packets
 * - If unresolvable → [] (treated as auto-satisfied)
 */
export function resolvePrerequisite(requiresId: string): string[] {
  // Direct packet lookup
  const direct = getPacket(requiresId);
  if (direct) return [requiresId];

  // Tier alias: "IC1.1-B" could mean "any IC1.1-B* packet"
  // Try prefix matching for tier aliases
  const allPackets = getAllPackets();
  const matches = allPackets.filter(p =>
    p.id.startsWith(requiresId) && p.id !== requiresId
  );

  if (matches.length > 0) {
    return matches.map(p => p.id);
  }

  // Dangling — can't resolve. Treat as satisfied so it doesn't block progress.
  return [];
}

// ── Prerequisite Checking ────────────────────────────────────────────────

/**
 * Check if a packet is unlocked for a given child.
 */
export function isPacketUnlocked(childId: string, packetId: string): PrereqCheck {
  const packet = getPacket(packetId);
  if (!packet) {
    return { unlocked: false, satisfied: [], missing: [], unresolvable: [packetId], progressPct: 0 };
  }

  // No prerequisites → always unlocked
  if (!packet.prerequisites || packet.prerequisites.length === 0) {
    return { unlocked: true, satisfied: [], missing: [], unresolvable: [], progressPct: 100 };
  }

  const progress = getProgress(childId);
  const completed = new Set(
    Object.entries(progress.packets)
      .filter(([, status]) => status === 'completed')
      .map(([id]) => id)
  );

  const satisfied: string[] = [];
  const missing: string[] = [];
  const unresolvable: string[] = [];

  for (const prereqId of packet.prerequisites) {
    const resolved = resolvePrerequisite(prereqId);

    if (resolved.length === 0) {
      // Dangling reference — auto-satisfy
      unresolvable.push(prereqId);
      continue;
    }

    // For tier aliases: ALL resolved packets must be completed
    // For direct refs: the single packet must be completed
    const allSatisfied = resolved.every(id => completed.has(id));

    if (allSatisfied) {
      satisfied.push(prereqId);
    } else {
      missing.push(prereqId);
    }
  }

  const total = satisfied.length + missing.length;
  const progressPct = total > 0 ? Math.round((satisfied.length / total) * 100) : 100;

  return {
    unlocked: missing.length === 0,
    satisfied,
    missing,
    unresolvable,
    progressPct,
  };
}

/**
 * Get the lock status for a packet — combines prereq check with progress status.
 */
export type LockStatus = 'locked' | 'unlocked' | 'in_progress' | 'completed';

export function getPacketLockStatus(childId: string, packetId: string): LockStatus {
  const progress = getProgress(childId);
  const currentStatus = progress.packets[packetId];

  if (currentStatus === 'completed') return 'completed';
  if (currentStatus === 'in_progress') return 'in_progress';

  const check = isPacketUnlocked(childId, packetId);
  return check.unlocked ? 'unlocked' : 'locked';
}

// ── Recommendations ──────────────────────────────────────────────────────

/**
 * Get all unlocked-but-not-started packets for a child at a given tier.
 */
export function getUnlockedPackets(childId: string, tier: string): CurriculumPacket[] {
  const allPackets = getAllPackets().filter(p => p.tier === tier);
  const progress = getProgress(childId);

  return allPackets.filter(p => {
    const status = progress.packets[p.id];
    if (status === 'completed' || status === 'in_progress') return false;

    const check = isPacketUnlocked(childId, p.id);
    return check.unlocked;
  });
}

/**
 * Get recommended next packets, scored by priority.
 * Mirrors the Python engine's get_next_packets logic.
 */
export function getNextRecommended(childId: string, tier: string, limit = 5): RecommendedPacket[] {
  const progress = getProgress(childId);
  const completed = new Set(
    Object.entries(progress.packets)
      .filter(([, status]) => status === 'completed')
      .map(([id]) => id)
  );

  // First: in-progress packets (highest priority — resume what you started)
  const inProgress = getAllPackets()
    .filter(p => p.tier === tier && progress.packets[p.id] === 'in_progress')
    .map(p => ({ packet: p, score: 100, reason: 'Continue where you left off' }));

  // Second: unlocked packets, scored
  const unlocked = getUnlockedPackets(childId, tier);
  const scored = unlocked.map(p => {
    let score = 0;
    let reason = '';

    // Bonus: continuing a focus area the student has already started
    const focusId = p.focus_id;
    const hasFocusProgress = [...completed].some(id => {
      const pkt = getPacket(id);
      return pkt && pkt.focus_id === focusId;
    });
    if (hasFocusProgress) {
      score += 50;
      reason = 'Continue this focus area';
    }

    // Bonus: Inner Core is foundational
    if (p.id.startsWith('IC')) {
      score += 20;
      reason = reason || 'Inner Core — foundational';
    }

    // Bonus: entry points (no prerequisites) for fresh students
    if (!p.prerequisites || p.prerequisites.length === 0) {
      score += 10;
      reason = reason || 'Entry point — no prerequisites';
    }

    return { packet: p, score, reason: reason || 'Available to start' };
  });

  // Combine in-progress + scored unlocked
  const all = [...inProgress, ...scored];
  all.sort((a, b) => b.score - a.score);

  return all.slice(0, limit);
}

/**
 * Get packets that would be newly unlocked if a given packet were completed.
 */
export function getNewlyUnlockedBy(childId: string, packetId: string, tier: string): CurriculumPacket[] {
  const allPackets = getAllPackets().filter(p => p.tier === tier);
  const progress = getProgress(childId);

  // Simulate completion
  const simulatedCompleted = new Set(
    Object.entries(progress.packets)
      .filter(([, status]) => status === 'completed')
      .map(([id]) => id)
  );
  simulatedCompleted.add(packetId);

  return allPackets.filter(p => {
    // Already started or completed
    const status = progress.packets[p.id];
    if (status === 'completed' || status === 'in_progress') return false;

    // Must reference the just-completed packet (directly or via alias)
    if (!p.prerequisites || p.prerequisites.length === 0) return false;
    const refsTarget = p.prerequisites.some(pre => {
      const resolved = resolvePrerequisite(pre);
      return resolved.includes(packetId);
    });
    if (!refsTarget) return false;

    // Check if NOW unlocked with simulated completion
    const allPrereqsSatisfied = p.prerequisites.every(pre => {
      const resolved = resolvePrerequisite(pre);
      if (resolved.length === 0) return true; // dangling = auto-satisfied
      return resolved.every(id => simulatedCompleted.has(id));
    });

    return allPrereqsSatisfied;
  });
}

// ── Dashboard Stats ──────────────────────────────────────────────────────

export interface PrereqDashboard {
  totalPackets: number;
  completedCount: number;
  inProgressCount: number;
  unlockedCount: number;
  lockedCount: number;
  completionPct: number;
}

export function getPrereqDashboard(childId: string, tier: string): PrereqDashboard {
  const allPackets = getAllPackets().filter(p => p.tier === tier);
  const progress = getProgress(childId);

  let completed = 0;
  let inProgress = 0;
  let unlocked = 0;
  let locked = 0;

  for (const p of allPackets) {
    const status = progress.packets[p.id];
    if (status === 'completed') {
      completed++;
    } else if (status === 'in_progress') {
      inProgress++;
    } else {
      const check = isPacketUnlocked(childId, p.id);
      if (check.unlocked) {
        unlocked++;
      } else {
        locked++;
      }
    }
  }

  const total = allPackets.length;
  return {
    totalPackets: total,
    completedCount: completed,
    inProgressCount: inProgress,
    unlockedCount: unlocked,
    lockedCount: locked,
    completionPct: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

// ── Entry Points ─────────────────────────────────────────────────────────

/**
 * Get all entry-point packets (Tier A with no prerequisites).
 */
export function getEntryPackets(): CurriculumPacket[] {
  return getAllPackets().filter(p =>
    p.tier === 'A' && (!p.prerequisites || p.prerequisites.length === 0)
  );
}

// ── Internal Helpers ─────────────────────────────────────────────────────

function getAllPackets(): CurriculumPacket[] {
  return (curriculumIndex as unknown as { packets: CurriculumPacket[] }).packets;
}
