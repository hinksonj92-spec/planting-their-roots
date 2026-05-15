'use client';

import { use, useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getPacket, getPillar, getDomain } from '@/lib/curriculum';
import { viewPacket, getPacketStatus, togglePacketComplete, type PacketStatus } from '@/lib/curriculum-progress';
import { getPacketResources, resourceSummary, RESOURCE_CATEGORY_META, type CategorisedResources, type ParsedResource } from '@/lib/resources';
import { renderMarkdown } from '@/lib/markdown';
import { useApp } from '@/lib/store';
import Link from 'next/link';

// Types for the full packet content loaded from JSON
interface BookEntry {
  audience: string;
  title: string;
  author: string;
}

interface NarrationPrompt {
  prompt: string;
  detail: string;
}

interface CrossConnection {
  target_id: string;
  target_name: string;
  description: string;
}

interface CompetenceMarkerFull {
  description: string;
  assessment_type: string;
}

interface PacketContent {
  id: string;
  title: string;
  books: {
    required: BookEntry[];
    suggested: BookEntry[];
    supplementary: BookEntry[];
  };
  narration_prompts: NarrationPrompt[];
  cross_connections: CrossConnection[];
  competence_markers: CompetenceMarkerFull[];
  content: {
    why_this_matters: string;
    what_this_develops: string;
    core_content: string;
    formative_practices: string;
  };
  mentor_guide: {
    formation_environment: string;
    competence_evaluation: string;
    common_pitfalls: string;
    narration_evaluation: string;
  } | null;
}

// Collapsible section component
function Section({ title, icon, children, defaultOpen = false }: {
  title: string;
  icon: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 p-3 bg-card hover:bg-border-light transition-colors text-left"
      >
        <span className="text-base">{icon}</span>
        <span className="text-sm font-semibold text-foreground flex-1">{title}</span>
        <svg
          className={`w-4 h-4 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="p-3 border-t border-border bg-background">{children}</div>}
    </div>
  );
}

// Categorised resource list renderer
function ResourceList({ resources, label }: { resources: ParsedResource[]; label: string }) {
  if (!resources || resources.length === 0) return null;

  const priorityColors: Record<string, string> = {
    required: 'bg-brand-light text-brand-dark',
    suggested: 'bg-border-light text-secondary',
    supplementary: 'bg-border-light text-muted',
  };

  return (
    <div className="mb-4 last:mb-0">
      <p className="text-xs font-semibold text-foreground mb-2">{label}</p>
      <div className="space-y-2">
        {resources.map((r, i) => (
          <div key={i} className="flex gap-2 items-start">
            <span className="text-xs mt-0.5">
              {r.audience === 'mentor' ? '👤' : RESOURCE_CATEGORY_META[r.category].icon}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">{r.title}</p>
              {r.author && (
                <p className="text-xs text-muted">{r.author}</p>
              )}
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${priorityColors[r.priority] || ''}`}>
                  {r.priority}
                </span>
                <span className="text-[10px] text-muted italic">
                  {r.audience === 'mentor' ? 'For mentor' : 'For student'}
                </span>
                {r.mode && (
                  <span className="text-[10px] text-muted">· {r.mode}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Legacy flat book list (fallback)
function BookList({ books, category }: { books: BookEntry[]; category: string }) {
  if (!books || books.length === 0) return null;

  return (
    <div className="mb-3 last:mb-0">
      <span className="text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full bg-border-light text-secondary">
        {category}
      </span>
      <div className="mt-2 space-y-2">
        {books.map((book, i) => (
          <div key={i} className="flex gap-2 items-start">
            <span className="text-xs mt-0.5">
              {book.audience === 'mentor' ? '👤' : '📖'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">{book.title}</p>
              {book.author && (
                <p className="text-xs text-muted">{book.author}</p>
              )}
              <span className="text-[10px] text-muted italic">
                {book.audience === 'mentor' ? 'For mentor' : 'For student'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PacketContentView({ params }: { params: Promise<{ pillarId: string; packetId: string }> }) {
  const { pillarId, packetId } = use(params);
  const searchParams = useSearchParams();
  const tier = searchParams.get('tier') || 'A';
  const { activeChild } = useApp();

  const packet = getPacket(decodeURIComponent(packetId));
  const pillar = getPillar(decodeURIComponent(pillarId));
  const domain = pillar ? getDomain(pillar.domain_id) : undefined;

  // Load full content from JSON
  const [fullContent, setFullContent] = useState<PacketContent | null>(null);
  const [contentLoading, setContentLoading] = useState(true);
  const [contentError, setContentError] = useState(false);
  const [packetStatus, setPacketStatus] = useState<PacketStatus>('not_started');

  // Track that user viewed this packet
  useEffect(() => {
    if (activeChild && packetId) {
      const pid = decodeURIComponent(packetId);
      viewPacket(activeChild.id, pid);
      setPacketStatus(getPacketStatus(activeChild.id, pid));
    }
  }, [activeChild, packetId]);

  useEffect(() => {
    const pid = decodeURIComponent(packetId);
    setContentLoading(true);
    setContentError(false);

    fetch(`/content/packets/${encodeURIComponent(pid)}.json`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((data: PacketContent) => {
        setFullContent(data);
        setContentLoading(false);
      })
      .catch(() => {
        setContentError(true);
        setContentLoading(false);
      });
  }, [packetId]);

  if (!packet || !pillar) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted">Packet not found</p>
        <Link href="/curriculum" className="text-brand text-sm mt-2 inline-block">Back to Curriculum</Link>
      </div>
    );
  }

  const hasBooks = fullContent?.books && (
    fullContent.books.required.length > 0 ||
    fullContent.books.suggested.length > 0 ||
    fullContent.books.supplementary.length > 0
  );

  // Parse resources into categories
  const categorised = fullContent?.books ? getPacketResources(fullContent.books) : null;
  const hasCategorisedResources = categorised && (
    categorised.books.length > 0 ||
    categorised.videos.length > 0 ||
    categorised.audio.length > 0 ||
    categorised.supplies.length > 0 ||
    categorised.references.length > 0 ||
    categorised.activities.length > 0
  );

  return (
    <div className="py-4 space-y-4 pb-24">
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
        <p className="text-secondary text-sm mt-1">{packet.focus_name}</p>
        {packet.tier_detail && (
          <p className="text-xs text-muted mt-1">{packet.tier_detail}</p>
        )}
      </div>

      {/* Loading state for full content */}
      {contentLoading && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-card border border-border">
          <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted">Loading packet content...</p>
        </div>
      )}

      {contentError && (
        <div className="p-3 rounded-xl bg-card border border-border">
          <p className="text-sm text-muted">Full content not available for this packet yet.</p>
        </div>
      )}

      {/* === CONTENT SECTIONS === */}
      {fullContent && (
        <>
          {/* Why This Matters */}
          {fullContent.content.why_this_matters && (
            <Section title="Why This Matters" icon="💡" defaultOpen={true}>
              <div
                className="prose-packet"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(fullContent.content.why_this_matters) }}
              />
            </Section>
          )}

          {/* What This Develops */}
          {fullContent.content.what_this_develops && (
            <Section title="What This Develops" icon="🌱">
              <div
                className="prose-packet"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(fullContent.content.what_this_develops) }}
              />
            </Section>
          )}

          {/* Books & Resources — categorised */}
          {hasCategorisedResources && categorised && (
            <Section title="Books & Resources" icon="📚" defaultOpen={true}>
              {categorised.books.length > 0 && (
                <ResourceList resources={categorised.books} label={`${RESOURCE_CATEGORY_META.book.icon} Books (${categorised.books.length})`} />
              )}
              {categorised.videos.length > 0 && (
                <ResourceList resources={categorised.videos} label={`${RESOURCE_CATEGORY_META.video.icon} Videos (${categorised.videos.length})`} />
              )}
              {categorised.audio.length > 0 && (
                <ResourceList resources={categorised.audio} label={`${RESOURCE_CATEGORY_META.audio.icon} Audio (${categorised.audio.length})`} />
              )}
              {categorised.supplies.length > 0 && (
                <ResourceList resources={categorised.supplies} label={`${RESOURCE_CATEGORY_META.supply.icon} Supplies (${categorised.supplies.length})`} />
              )}
              {categorised.references.length > 0 && (
                <ResourceList resources={categorised.references} label={`${RESOURCE_CATEGORY_META.reference.icon} References (${categorised.references.length})`} />
              )}
              {categorised.activities.length > 0 && (
                <ResourceList resources={categorised.activities} label={`${RESOURCE_CATEGORY_META.activity.icon} Activities (${categorised.activities.length})`} />
              )}
            </Section>
          )}

          {/* Fallback: old flat book list if categorisation produced nothing */}
          {hasBooks && !hasCategorisedResources && (
            <Section title="Books & Resources" icon="📚">
              <BookList books={fullContent.books.required} category="required" />
              <BookList books={fullContent.books.suggested} category="suggested" />
              <BookList books={fullContent.books.supplementary} category="supplementary" />
            </Section>
          )}

          {/* Core Content */}
          {fullContent.content.core_content && (
            <Section title="Core Content" icon="📝">
              <div
                className="prose-packet"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(fullContent.content.core_content) }}
              />
            </Section>
          )}

          {/* Narration Prompts */}
          {fullContent.narration_prompts.length > 0 && (
            <Section title="Narration Prompts" icon="🗣️">
              <div className="space-y-3">
                {fullContent.narration_prompts.map((np, i) => (
                  <div key={i} className="p-3 rounded-lg bg-brand-light/30 border border-brand/10">
                    <p className="text-sm font-medium text-foreground">{np.prompt}</p>
                    {np.detail && (
                      <p className="text-xs text-secondary mt-1 italic">{np.detail}</p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Competence Markers */}
          {fullContent.competence_markers.length > 0 && (
            <Section title="Competence Markers" icon="✅">
              <div className="space-y-2">
                {fullContent.competence_markers.map((marker, i) => (
                  <div key={i} className="flex gap-2 p-2 rounded-lg bg-card">
                    <div className="w-5 h-5 rounded-full bg-brand-light flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] font-bold text-brand-dark">{i + 1}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-foreground">{marker.description}</p>
                      {marker.assessment_type && (
                        <span className="text-[10px] text-muted uppercase tracking-wide">
                          {marker.assessment_type}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Formative Practices */}
          {fullContent.content.formative_practices && (
            <Section title="Formative Practices" icon="🔨">
              <div
                className="prose-packet"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(fullContent.content.formative_practices) }}
              />
            </Section>
          )}

          {/* Cross Connections */}
          {fullContent.cross_connections.length > 0 && (
            <Section title="Cross Connections" icon="🔗">
              <div className="space-y-2">
                {fullContent.cross_connections.map((cc, i) => (
                  <div key={i} className="p-2 rounded-lg bg-card border border-border">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-border-light text-secondary">
                        {cc.target_id}
                      </span>
                      <span className="text-xs font-medium text-foreground">{cc.target_name}</span>
                    </div>
                    <p className="text-xs text-secondary leading-relaxed">{cc.description}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Mentor Guide */}
          {fullContent.mentor_guide && (
            <Section title="Mentor Guide" icon="🧭">
              <div className="space-y-4">
                {fullContent.mentor_guide.formation_environment && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Formation Environment</h3>
                    <div
                      className="prose-packet"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(fullContent.mentor_guide.formation_environment) }}
                    />
                  </div>
                )}
                {fullContent.mentor_guide.competence_evaluation && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Competence Evaluation</h3>
                    <div
                      className="prose-packet"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(fullContent.mentor_guide.competence_evaluation) }}
                    />
                  </div>
                )}
                {fullContent.mentor_guide.common_pitfalls && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Common Pitfalls</h3>
                    <div
                      className="prose-packet"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(fullContent.mentor_guide.common_pitfalls) }}
                    />
                  </div>
                )}
                {fullContent.mentor_guide.narration_evaluation && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Narration Evaluation</h3>
                    <div
                      className="prose-packet"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(fullContent.mentor_guide.narration_evaluation) }}
                    />
                  </div>
                )}
              </div>
            </Section>
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
          {/* Mark Complete / Undo toggle */}
          {activeChild && (
            <div className="pt-2">
              <button
                onClick={() => {
                  const pid = decodeURIComponent(packetId);
                  const next = togglePacketComplete(activeChild.id, pid);
                  setPacketStatus(next);
                }}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors ${
                  packetStatus === 'completed'
                    ? 'bg-card border border-border text-secondary hover:text-foreground'
                    : 'bg-brand text-white hover:bg-brand-dark'
                }`}
              >
                {packetStatus === 'completed' ? '✓ Completed — tap to undo' : 'Mark as Complete'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Fallback: show index-only data if full content failed */}
      {contentError && (
        <>
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
        </>
      )}
    </div>
  );
}

export default function PacketPage({ params }: { params: Promise<{ pillarId: string; packetId: string }> }) {
  return (
    <Suspense fallback={<div className="py-8 text-center"><div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto" /></div>}>
      <PacketContentView params={params} />
    </Suspense>
  );
}
