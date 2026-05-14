'use client';

import { use, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getPillar, getPacketsForPillar, getDomain } from '@/lib/curriculum';
import { useApp } from '@/lib/store';
import Link from 'next/link';

function PillarContent({ params }: { params: Promise<{ pillarId: string }> }) {
  const { pillarId } = use(params);
  const searchParams = useSearchParams();
  const tier = searchParams.get('tier') || 'A';
  const { activeChild } = useApp();

  const pillar = getPillar(decodeURIComponent(pillarId));
  const domain = pillar ? getDomain(pillar.domain_id) : undefined;

  if (!pillar) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted">Pillar not found</p>
        <Link href="/curriculum" className="text-brand text-sm mt-2 inline-block">Back to Curriculum</Link>
      </div>
    );
  }

  const packets = getPacketsForPillar(pillar.id, tier);

  // Group packets by focus
  const focusGroups: Record<string, typeof packets> = {};
  for (const packet of packets) {
    const key = packet.focus_id || 'other';
    if (!focusGroups[key]) focusGroups[key] = [];
    focusGroups[key].push(packet);
  }

  return (
    <div className="py-4 space-y-5">
      {/* Back nav */}
      <Link href="/curriculum" className="flex items-center gap-1 text-sm text-brand">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Curriculum
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          {domain && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: `${domain.color}15`, color: domain.color }}
            >
              {domain.icon} {domain.name}
            </span>
          )}
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-brand-light text-brand-dark">
            Tier {tier}
          </span>
        </div>
        <h1 className="text-xl font-bold text-foreground">
          {pillar.id} — {pillar.name}
        </h1>
        <p className="text-secondary text-sm mt-0.5">
          {packets.length} packets across {Object.keys(focusGroups).length} focuses
          {activeChild ? ` for ${activeChild.name}` : ''}
        </p>
      </div>

      {/* Focus groups */}
      <div className="space-y-4">
        {Object.entries(focusGroups).sort(([a], [b]) => a.localeCompare(b)).map(([focusId, focusPackets]) => {
          const focusName = pillar.focuses[focusId] || focusId;
          return (
            <div key={focusId}>
              <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <span className="text-muted font-mono text-xs">{focusId}</span>
                {focusName}
              </h2>
              <div className="space-y-2">
                {focusPackets.map(packet => (
                  <Link
                    key={packet.id}
                    href={`/curriculum/${encodeURIComponent(pillar.id)}/packet/${encodeURIComponent(packet.id)}?tier=${tier}`}
                    className="block p-3 rounded-xl border border-border hover:border-brand/30 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{packet.title}</p>
                        <p className="text-xs text-muted mt-0.5 font-mono">{packet.id}</p>
                      </div>
                      <svg className="w-4 h-4 text-muted mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    {packet.competence_markers.length > 0 && (
                      <p className="text-xs text-secondary mt-1.5 line-clamp-2">
                        {packet.competence_markers[0]}
                      </p>
                    )}
                    {packet.prerequisites.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {packet.prerequisites.slice(0, 3).map(pre => (
                          <span key={pre} className="text-[10px] px-1.5 py-0.5 bg-border-light rounded font-mono text-muted">
                            {pre}
                          </span>
                        ))}
                        {packet.prerequisites.length > 3 && (
                          <span className="text-[10px] text-muted">+{packet.prerequisites.length - 3} more</span>
                        )}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PillarPage({ params }: { params: Promise<{ pillarId: string }> }) {
  return (
    <Suspense fallback={<div className="py-8 text-center"><div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto" /></div>}>
      <PillarContent params={params} />
    </Suspense>
  );
}
