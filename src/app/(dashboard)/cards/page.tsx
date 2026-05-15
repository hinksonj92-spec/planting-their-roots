'use client';

import { useState } from 'react';
import { useApp } from '@/lib/store';
import { getMomentCards } from '@/lib/content';
import { ChildSwitcher } from '@/components/ui/ChildSwitcher';
import { GraduatedState } from '@/components/content/GraduatedState';
import { DOMAIN_COLORS, DOMAIN_NAMES, DOMAIN_ICONS } from '@/lib/utils';
import { SayThisBlock } from '@/components/content/SayThisBlock';
import { DoThisBlock } from '@/components/content/DoThisBlock';
import { DomainBadge } from '@/components/ui/DomainBadge';
import {
  type Location, getAvailableLocationsForCards, getCardsForLocation, getMomentCardLocations, LOCATIONS,
} from '@/lib/locations';
import type { DomainCode } from '@/types';

export default function CardsPage() {
  const { activeBand, activeChild, isGraduated } = useApp();
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [activeLocation, setActiveLocation] = useState<Location | null>(null);

  if (isGraduated) return <div className="py-4"><ChildSwitcher /><GraduatedState /></div>;

  const allCards = getMomentCards(activeBand);
  const availableLocations = getAvailableLocationsForCards(allCards);
  const cards = activeLocation ? getCardsForLocation(allCards, activeLocation) : allCards;

  return (
    <div className="py-4 space-y-4">
      <div>
        <ChildSwitcher />
        <h1 className="text-xl font-bold text-foreground mt-2">Moment Cards for {activeChild?.name}</h1>
        <p className="text-secondary text-sm mt-0.5">
          Tap a card for the full script. Post where the action happens.
        </p>
      </div>

      {/* Location filter */}
      {availableLocations.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1">
          <button
            onClick={() => { setActiveLocation(null); setExpandedIdx(null); }}
            className={`shrink-0 flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-full border transition-colors ${
              !activeLocation
                ? 'border-brand bg-brand-light/40 text-brand-dark font-semibold'
                : 'border-border text-secondary hover:border-brand/30'
            }`}
          >
            All ({allCards.length})
          </button>
          {availableLocations.map(loc => {
            const count = getCardsForLocation(allCards, loc.id).length;
            return (
              <button
                key={loc.id}
                onClick={() => {
                  setActiveLocation(activeLocation === loc.id ? null : loc.id);
                  setExpandedIdx(null);
                }}
                className={`shrink-0 flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-full border transition-colors ${
                  activeLocation === loc.id
                    ? 'border-brand bg-brand-light/40 text-brand-dark font-semibold'
                    : 'border-border text-secondary hover:border-brand/30'
                }`}
              >
                <span className="text-xs">{loc.icon}</span>
                {loc.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      <div className="space-y-3">
        {cards.map((card, idx) => {
          const isExpanded = expandedIdx === idx;
          const primaryDomain = card.domains_tagged[0] as DomainCode | undefined;
          const color = primaryDomain ? DOMAIN_COLORS[primaryDomain] : '#497C59';

          return (
            <button
              key={idx}
              onClick={() => setExpandedIdx(isExpanded ? null : idx)}
              className="w-full text-left bg-card rounded-2xl border border-border overflow-hidden transition-all"
            >
              {/* Card header */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg shrink-0"
                  style={{ backgroundColor: color }}
                >
                  {primaryDomain ? DOMAIN_ICONS[primaryDomain] : '🌱'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm">{card.moment_name}</h3>
                  {card.post_at && (() => {
                    const locs = getMomentCardLocations(card);
                    const locMeta = LOCATIONS.find(l => l.id === locs[0]);
                    return (
                      <p className="text-xs text-muted">
                        {locMeta ? `${locMeta.icon} ` : ''}{card.post_at}
                      </p>
                    );
                  })()}
                </div>
                <svg
                  className={`w-5 h-5 text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-border-light">
                  {/* Domain tags */}
                  <div className="flex flex-wrap gap-1.5 mt-3 mb-2">
                    {card.domains_tagged.map(code => (
                      <DomainBadge key={code} code={code as DomainCode} size="sm" />
                    ))}
                  </div>

                  <SayThisBlock text={card.say_this} />
                  <DoThisBlock items={card.do_this} />

                  {card.what_this_builds && (
                    <p className="text-sm text-muted mt-3 italic">
                      {card.what_this_builds}
                    </p>
                  )}

                  {card.closing_line && (
                    <p className="text-sm font-medium mt-3 italic" style={{ color }}>
                      {card.closing_line}
                    </p>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
