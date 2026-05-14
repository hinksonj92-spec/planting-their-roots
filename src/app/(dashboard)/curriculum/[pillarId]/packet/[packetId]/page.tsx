'use client';

import { use } from 'react';
import { useSearchParams } from 'next/navigation';
import { getPacket, getPillar, getDomain } from '@/lib/curriculum';
import Link from 'next/link';

export default function PacketPage({ params }: { params: Promise<{ pillarId: string; packetId: string }> }) {
  const { pillarId, packetId } = use(params);
  const searchParams = useSearchParams();
  const tier = searchParams.get('tier') || 'A';

  const packet = getPacket(decodeURIComponent(packetId));
  const pillar = getPillar(decodeURIComponent(pillarId));
  const domain = pillar ? getDomain(pillar.domain_id) : undefined;

  if (!packet || !pillar) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted">Packet not found</p>
        <Link href="/curriculum" className="text-brand text-sm mt-2 inline-block">Back to Curriculum</Link>
      </div>
    );
  }

  return (
    <div className="py-4 space-y-5">
      {/* Back nav */}
      <Link href={`/curriculum/${encodeURIComponent(pillar.id)}?tier=${tier}`} className="flex items-center gap-1 text-sm text-brand">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        {pillar.id} — {pillar.name}
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {domain && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: `${domain.color}15`, color: domain.color }}
            >
              {domain.icon} {domain.name}
            </span>
          )}
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-border-light text-muted font-mono">
            {packet.id}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-brand-light text-brand-dark">
            Tier {packet.tier}
          </span>
        </div>
        <h1 className="text-xl font-bold text-foreground">{packet.title}</h1>
        <p className="text-secondary text-sm mt-1">
          {packet.focus_name}
        </p>
      </div>

      {/* Competence Markers */}
      {packet.competence_markers.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-2">Competence Markers</h2>
          <div className="space-y-2">
            {packet.competence_markers.map((marker, i) => (
              <div key={i} className="flex gap-2 p-3 rounded-xl bg-card border border-border">
                <div className="w-5 h-5 rounded-full bg-brand-light flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-brand-dark">{i + 1}</span>
                </div>
                <p className="text-sm text-foreground">{marker}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prerequisites */}
      {packet.prerequisites.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-2">Prerequisites</h2>
          <div className="flex flex-wrap gap-2">
            {packet.prerequisites.map(pre => (
              <span
                key={pre}
                className="text-xs px-2.5 py-1 rounded-lg bg-card border border-border font-mono text-secondary"
              >
                {pre}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tier detail */}
      {packet.tier_detail && (
        <div className="p-3 rounded-xl bg-card border border-border">
          <p className="text-xs text-muted font-medium mb-1">Age Range</p>
          <p className="text-sm text-foreground">{packet.tier_detail}</p>
        </div>
      )}
    </div>
  );
}
