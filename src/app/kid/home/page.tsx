'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useKidSession } from '@/lib/kid-session';
import { getEvergreenPhase, getEvergreenPhaseLabel } from '@/lib/utils';
import { getDomains, phaseToTier, getPillarsForDomain, getPacket } from '@/lib/curriculum';
import { getCurrentPacketInfo, getProgressStats } from '@/lib/curriculum-progress';
import Link from 'next/link';

type TimeOfDay = 'morning' | 'midday' | 'evening';

function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'midday';
  return 'evening';
}

function getKidGreeting(timeOfDay: TimeOfDay, name: string): string {
  switch (timeOfDay) {
    case 'morning': return `Good morning, ${name}!`;
    case 'midday': return `Hey ${name}!`;
    case 'evening': return `Good evening, ${name}!`;
  }
}

function getTimeIcon(timeOfDay: TimeOfDay): string {
  switch (timeOfDay) {
    case 'morning': return '🌅';
    case 'midday': return '☀️';
    case 'evening': return '🌙';
  }
}

export default function KidHomePage() {
  const router = useRouter();
  const { session, logout } = useKidSession();
  const [mounted, setMounted] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('morning');

  useEffect(() => {
    setMounted(true);
    setTimeOfDay(getTimeOfDay());
  }, []);

  useEffect(() => {
    if (mounted && !session) {
      router.replace('/kid');
    }
  }, [mounted, session, router]);

  if (!mounted || !session) return null;

  const phase = getEvergreenPhase(session.birthDate);
  const phaseLabel = getEvergreenPhaseLabel(phase);
  const tier = phaseToTier(phase);
  const domains = getDomains();

  // Get current packet info
  const currentPacket = getCurrentPacketInfo(session.childId, phase, getPacket);

  // Get progress stats
  const stats = getProgressStats(session.childId, phase);

  return (
    <div className="min-h-screen bg-background">
      {/* Kid top bar */}
      <header className="fixed top-0 left-0 right-0 bg-card/90 backdrop-blur-md border-b border-border z-50">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center">
              <span className="text-white text-sm font-bold">{session.childName[0].toUpperCase()}</span>
            </div>
            <span className="font-semibold text-sm text-foreground">{session.childName}</span>
            <span className="text-xs bg-brand-light text-brand-dark px-2 py-0.5 rounded-full font-medium">
              {phaseLabel}
            </span>
          </div>
          <button
            onClick={() => { logout(); router.replace('/kid'); }}
            className="text-xs text-secondary hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-border hover:border-brand/30"
          >
            Exit
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-20 pb-8">
        {/* Greeting */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-foreground">
            {getKidGreeting(timeOfDay, session.childName.split(' ')[0])}
          </h1>
          <span className="text-2xl">{getTimeIcon(timeOfDay)}</span>
        </div>

        {/* Current lesson card */}
        {currentPacket && (
          <Link href={`/kid/learn?packet=${currentPacket.packetId}`}>
            <div className="bg-card border border-border rounded-2xl p-5 mb-4 hover:border-brand/30 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{currentPacket.domainIcon}</span>
                <span className="text-xs font-medium" style={{ color: currentPacket.domainColor }}>
                  {currentPacket.domainName}
                </span>
                <span className="text-xs text-muted ml-auto">
                  {currentPacket.packetIndex} of {currentPacket.totalInPillar}
                </span>
              </div>
              <h2 className="text-lg font-bold text-foreground mb-1">{currentPacket.pillarName}</h2>
              <p className="text-sm text-secondary mb-3">{currentPacket.packetTitle}</p>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  currentPacket.status === 'in_progress'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-brand-light text-brand-dark'
                }`}>
                  {currentPacket.status === 'in_progress' ? 'In Progress' : 'Up Next'}
                </span>
                <span className="text-sm text-brand font-medium">Open Lesson →</span>
              </div>
            </div>
          </Link>
        )}

        {/* Progress overview */}
        <div className="bg-card border border-border rounded-2xl p-5 mb-6">
          <h3 className="font-semibold text-foreground mb-3">Your Progress</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-bold text-brand">{stats.completed}</p>
              <p className="text-xs text-secondary">Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{stats.inProgress}</p>
              <p className="text-xs text-secondary">In Progress</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-muted">{stats.total}</p>
              <p className="text-xs text-secondary">Total</p>
            </div>
          </div>
          {stats.total > 0 && (
            <div className="mt-3 w-full bg-border-light rounded-full h-2">
              <div
                className="bg-brand rounded-full h-2 transition-all"
                style={{ width: `${Math.round((stats.completed / stats.total) * 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* Domain cards */}
        <h3 className="font-semibold text-foreground mb-3">Explore by Subject</h3>
        <div className="grid grid-cols-2 gap-3 mb-8">
          {domains.map(domain => {
            const pillars = getPillarsForDomain(domain.id);
            const packetCount = pillars.reduce((sum, p) => sum + (p.packets[tier as keyof typeof p.packets] || []).length, 0);
            if (packetCount === 0) return null;

            return (
              <Link
                key={domain.id}
                href={`/kid/learn?domain=${domain.id}`}
                className="bg-card border border-border rounded-xl p-4 hover:border-brand/30 transition-colors"
              >
                <span className="text-2xl block mb-2">{domain.icon}</span>
                <p className="font-semibold text-sm text-foreground">{domain.name}</p>
                <p className="text-xs text-muted">{packetCount} lessons</p>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
