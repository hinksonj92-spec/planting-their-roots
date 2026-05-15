'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useKidSession } from '@/lib/kid-session';
import { getPacket, getDomains, getPillarsForDomain, phaseToTier } from '@/lib/curriculum';
import { viewPacket, togglePacketComplete, getPacketStatus, getProgressStats, type PacketStatus } from '@/lib/curriculum-progress';
import { getPacketResources, type ParsedResource } from '@/lib/resources';
import { renderMarkdown } from '@/lib/markdown';
import { getEvergreenPhase } from '@/lib/utils';
import Link from 'next/link';

interface PacketContent {
  id: string;
  title: string;
  content: {
    why_this_matters: string;
    what_this_develops: string;
    core_content: string;
    formative_practices: string;
  };
  books: {
    required: { audience: string; title: string; author: string }[];
    suggested: { audience: string; title: string; author: string }[];
    supplementary: { audience: string; title: string; author: string }[];
  };
  narration_prompts: { prompt: string; detail: string }[];
}

function KidLearnContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, logout } = useKidSession();
  const [mounted, setMounted] = useState(false);
  const [packetContent, setPacketContent] = useState<PacketContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<PacketStatus>('not_started');

  const packetId = searchParams.get('packet');
  const domainId = searchParams.get('domain');

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && !session) {
      router.replace('/kid');
    }
  }, [mounted, session, router]);

  // Load packet content
  useEffect(() => {
    if (!packetId || !session) return;

    setLoading(true);
    // Mark as viewed
    viewPacket(session.childId, packetId);
    setStatus(getPacketStatus(session.childId, packetId));

    fetch(`/content/packets/${packetId}.json`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        setPacketContent(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [packetId, session]);

  if (!mounted || !session) return null;

  const phase = getEvergreenPhase(session.birthDate);
  const tier = phaseToTier(phase);

  // Domain browse mode
  if (domainId && !packetId) {
    const domains = getDomains();
    const domain = domains.find(d => d.id === domainId);
    if (!domain) return null;

    const pillars = getPillarsForDomain(domainId);

    return (
      <div className="min-h-screen bg-background">
        <header className="fixed top-0 left-0 right-0 bg-card/90 backdrop-blur-md border-b border-border z-50">
          <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
            <Link href="/kid/home" className="text-secondary hover:text-foreground">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <span className="text-xl">{domain.icon}</span>
            <h1 className="font-semibold text-foreground">{domain.name}</h1>
          </div>
        </header>

        <main className="max-w-lg mx-auto px-4 pt-20 pb-8">
          <div className="space-y-4">
            {pillars.map(pillar => {
              const packets = pillar.packets[tier as keyof typeof pillar.packets] || [];
              if (packets.length === 0) return null;

              return (
                <div key={pillar.id} className="bg-card border border-border rounded-xl p-4">
                  <h3 className="font-semibold text-foreground mb-3">{pillar.name}</h3>
                  <div className="space-y-2">
                    {packets.map((pId, idx) => {
                      const packet = getPacket(pId);
                      if (!packet) return null;
                      const pStatus = getPacketStatus(session.childId, pId);

                      return (
                        <Link
                          key={pId}
                          href={`/kid/learn?packet=${pId}`}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-border-light transition-colors"
                        >
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            pStatus === 'completed' ? 'bg-brand text-white' :
                            pStatus === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                            'bg-border-light text-muted'
                          }`}>
                            {pStatus === 'completed' ? '✓' : idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{packet.title}</p>
                            <p className="text-xs text-muted">{packet.focus_name}</p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    );
  }

  // Packet detail mode
  if (!packetId || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-secondary">Loading lesson...</p>
        </div>
      </div>
    );
  }

  const packet = getPacket(packetId);
  if (!packet || !packetContent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-secondary mb-4">Lesson not found</p>
          <Link href="/kid/home" className="text-brand font-medium">Back to home</Link>
        </div>
      </div>
    );
  }

  const categorised = getPacketResources(packetContent.books);
  // Flatten to array for kid view, excluding mentor resources
  const resources = [
    ...categorised.books,
    ...categorised.videos,
    ...categorised.audio,
    ...categorised.supplies,
    ...categorised.references,
    ...categorised.activities,
  ].filter(r => r.audience !== 'mentor');

  function handleToggleComplete() {
    if (!session || !packetId) return;
    togglePacketComplete(session.childId, packetId);
    setStatus(getPacketStatus(session.childId, packetId));
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 bg-card/90 backdrop-blur-md border-b border-border z-50">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
          <Link href="/kid/home" className="text-secondary hover:text-foreground">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{packet.pillar_name}</p>
            <p className="text-xs text-muted truncate">{packet.focus_name}</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-20 pb-24">
        {/* Title */}
        <h1 className="text-xl font-bold text-foreground mb-2">{packet.title}</h1>

        {/* Why it matters */}
        {packetContent.content.why_this_matters && (
          <div className="bg-brand-light/30 border border-brand/10 rounded-xl p-4 mb-4">
            <h3 className="text-sm font-semibold text-brand-dark mb-2">Why This Matters</h3>
            <div
              className="text-sm text-foreground prose-sm"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(packetContent.content.why_this_matters) }}
            />
          </div>
        )}

        {/* Core content */}
        {packetContent.content.core_content && (
          <div className="bg-card border border-border rounded-xl p-4 mb-4">
            <h3 className="text-sm font-semibold text-foreground mb-2">What You&apos;ll Learn</h3>
            <div
              className="text-sm text-secondary prose-sm"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(packetContent.content.core_content) }}
            />
          </div>
        )}

        {/* Activities */}
        {packetContent.content.formative_practices && (
          <div className="bg-card border border-border rounded-xl p-4 mb-4">
            <h3 className="text-sm font-semibold text-foreground mb-2">Activities</h3>
            <div
              className="text-sm text-secondary prose-sm"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(packetContent.content.formative_practices) }}
            />
          </div>
        )}

        {/* Discussion prompts */}
        {packetContent.narration_prompts && packetContent.narration_prompts.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4 mb-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Think About It</h3>
            <div className="space-y-3">
              {packetContent.narration_prompts.map((np, i) => (
                <div key={i} className="pl-3 border-l-2 border-brand/30">
                  <p className="text-sm font-medium text-foreground">{np.prompt}</p>
                  {np.detail && <p className="text-xs text-secondary mt-1">{np.detail}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Books / resources (kid-facing only) */}
        {resources.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4 mb-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Resources</h3>
            <div className="space-y-2">
              {resources
                .slice(0, 8)
                .map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-muted mt-0.5">📚</span>
                    <div>
                      <p className="text-foreground">{r.title}</p>
                      {r.author && <p className="text-xs text-muted">{r.author}</p>}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </main>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-md border-t border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={handleToggleComplete}
            className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors ${
              status === 'completed'
                ? 'bg-brand text-white'
                : 'bg-brand text-white hover:bg-brand-dark'
            }`}
          >
            {status === 'completed' ? '✓ Completed' : 'Mark as Done'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function KidLearnPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <KidLearnContent />
    </Suspense>
  );
}
