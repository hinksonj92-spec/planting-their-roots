'use client';

import { useState, useRef } from 'react';
import { useApp } from '@/lib/store';
import { getMilestones } from '@/lib/content';
import { DOMAIN_COLORS, DOMAIN_ICONS, DOMAIN_FULL_NAMES, getBandShortLabel } from '@/lib/utils';
import { ChildSwitcher } from '@/components/ui/ChildSwitcher';
import { GraduatedState } from '@/components/content/GraduatedState';
import { uploadMilestonePhoto } from '@/lib/photos';
import type { DomainCode } from '@/types';

const ALL_DOMAINS: DomainCode[] = ['LANG', 'MOTR', 'NUMR', 'SOCL', 'ROUT', 'SENS', 'INDP'];

function MilestoneItem({
  milestoneId,
  description,
  typicalRange,
  domainCode,
}: {
  milestoneId: string;
  description: string;
  typicalRange: string;
  domainCode: DomainCode;
}) {
  const {
    user, activeChild,
    isMilestoneComplete, toggleMilestone,
    getMilestonePhoto, getMilestoneNote,
    saveMilestonePhoto, saveMilestoneNote,
  } = useApp();

  const [expanded, setExpanded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [editingNote, setEditingNote] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isComplete = isMilestoneComplete(milestoneId);
  const photo = getMilestonePhoto(milestoneId);
  const note = getMilestoneNote(milestoneId);
  const color = DOMAIN_COLORS[domainCode];

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user || !activeChild) return;

    setUploading(true);
    try {
      const url = await uploadMilestonePhoto(user.id, activeChild.id, milestoneId, file);
      if (url) saveMilestonePhoto(milestoneId, url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    }
    setUploading(false);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function startEditNote() {
    setNoteText(note || '');
    setEditingNote(true);
  }

  function saveNote() {
    saveMilestoneNote(milestoneId, noteText.trim() || null);
    setEditingNote(false);
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <button
        onClick={() => { toggleMilestone(milestoneId); if (!isComplete) setExpanded(true); }}
        className="w-full flex items-start gap-3 p-3 text-left transition-all hover:border-brand/20"
      >
        <div
          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
            isComplete ? 'border-transparent' : ''
          }`}
          style={{
            borderColor: isComplete ? color : undefined,
            backgroundColor: isComplete ? color : 'transparent',
          }}
        >
          {isComplete && (
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm leading-relaxed ${isComplete ? 'text-muted line-through' : 'text-foreground'}`}>
            {description}
          </p>
          <p className="text-xs text-muted mt-0.5">{typicalRange}</p>
        </div>
        {isComplete && (photo || note) && (
          <div className="flex items-center gap-1 shrink-0">
            {photo && <span className="text-xs">📷</span>}
            {note && <span className="text-xs">📝</span>}
          </div>
        )}
      </button>

      {/* Expanded detail for completed milestones */}
      {isComplete && (
        <div className="border-t border-border-light">
          {/* Toggle expand */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full px-3 py-2 flex items-center justify-between text-xs text-secondary hover:text-foreground transition-colors"
          >
            <span>{expanded ? 'Hide details' : 'Add photo or note'}</span>
            <svg
              className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expanded && (
            <div className="px-3 pb-3 space-y-3">
              {/* Photo section */}
              <div>
                {photo ? (
                  <div className="relative">
                    <img
                      src={photo}
                      alt={`${description} milestone`}
                      className="w-full rounded-lg object-cover max-h-48"
                    />
                    <button
                      onClick={() => saveMilestonePhoto(milestoneId, null)}
                      className="absolute top-2 right-2 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center text-xs hover:bg-black/70"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      capture="environment"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-dashed border-border-light text-sm text-secondary hover:border-brand/30 hover:text-foreground transition-colors"
                    >
                      {uploading ? (
                        <span className="animate-pulse">Uploading...</span>
                      ) : (
                        <>
                          <span>📷</span>
                          <span>Add a photo</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Note section */}
              <div>
                {editingNote ? (
                  <div className="space-y-2">
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      rows={2}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:border-brand resize-none"
                      placeholder="What did you notice? How did it happen?"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={saveNote}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg text-white"
                        style={{ backgroundColor: color }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingNote(false)}
                        className="text-xs text-secondary px-3 py-1.5"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : note ? (
                  <button
                    onClick={startEditNote}
                    className="w-full text-left p-2 rounded-lg bg-background text-sm text-secondary hover:bg-border-light/50 transition-colors"
                  >
                    <span className="text-xs text-muted block mb-0.5">Note:</span>
                    {note}
                  </button>
                ) : (
                  <button
                    onClick={startEditNote}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-border-light text-xs text-secondary hover:border-brand/30 hover:text-foreground transition-colors"
                  >
                    <span>📝</span>
                    <span>Add a note</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MilestonesPage() {
  const { activeBand, activeChild, isGraduated } = useApp();
  const [activeDomain, setActiveDomain] = useState<DomainCode>('LANG');

  if (isGraduated) return <div className="py-4"><ChildSwitcher /><GraduatedState /></div>;

  const allMilestones = getMilestones(activeBand);
  const domainMilestones = allMilestones.filter(m => m.domain_code === activeDomain);

  return (
    <div className="py-4 space-y-4">
      <div>
        <ChildSwitcher />
        <h1 className="text-xl font-bold text-foreground mt-2">Milestones for {activeChild?.name}</h1>
        <p className="text-secondary text-sm mt-0.5">
          {getBandShortLabel(activeBand)} &middot; Track what you observe
        </p>
      </div>

      {/* Domain selector (horizontal scroll) */}
      <DomainSelector
        allMilestones={allMilestones}
        activeDomain={activeDomain}
        onSelect={setActiveDomain}
      />

      {/* Domain header */}
      <div
        className="rounded-2xl p-4"
        style={{
          backgroundColor: `color-mix(in srgb, ${DOMAIN_COLORS[activeDomain]} 8%, white)`,
        }}
      >
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <span>{DOMAIN_ICONS[activeDomain]}</span>
          {DOMAIN_FULL_NAMES[activeDomain]}
        </h2>
        <p className="text-xs text-muted mt-1">
          These are awareness tools, not diagnoses. Wide variation is normal.
        </p>
      </div>

      {/* Milestone checklist */}
      <div className="space-y-2">
        {domainMilestones.map((m, i) => {
          const milestoneId = `${m.band}-${m.domain_code}-${m.description}`;
          return (
            <MilestoneItem
              key={i}
              milestoneId={milestoneId}
              description={m.description}
              typicalRange={m.typical_range}
              domainCode={activeDomain}
            />
          );
        })}
      </div>
    </div>
  );
}

function DomainSelector({
  allMilestones,
  activeDomain,
  onSelect,
}: {
  allMilestones: ReturnType<typeof getMilestones>;
  activeDomain: DomainCode;
  onSelect: (code: DomainCode) => void;
}) {
  const { isMilestoneComplete } = useApp();

  const domainCounts = ALL_DOMAINS.map(code => {
    const dm = allMilestones.filter(m => m.domain_code === code);
    const completed = dm.filter(m => isMilestoneComplete(`${m.band}-${m.domain_code}-${m.description}`)).length;
    return { code, total: dm.length, completed };
  });

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
      {domainCounts.map(d => {
        const isActive = d.code === activeDomain;
        const color = DOMAIN_COLORS[d.code];
        return (
          <button
            key={d.code}
            onClick={() => onSelect(d.code)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap shrink-0 transition-all ${
              isActive ? 'text-white shadow-sm' : 'bg-card border border-border text-secondary'
            }`}
            style={isActive ? { backgroundColor: color } : undefined}
          >
            <span>{DOMAIN_ICONS[d.code]}</span>
            <span>{DOMAIN_FULL_NAMES[d.code].split(' ')[0]}</span>
            <span className={`text-xs ${isActive ? 'text-white/80' : 'text-muted'}`}>
              {d.completed}/{d.total}
            </span>
          </button>
        );
      })}
    </div>
  );
}
