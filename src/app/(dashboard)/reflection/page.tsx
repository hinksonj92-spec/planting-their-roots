'use client';

import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/lib/store';
import { getWeeklyGuide, getDefaultPhase } from '@/lib/content';
import { DOMAIN_COLORS, DOMAIN_ICONS, DOMAIN_FULL_NAMES, cleanGuideTitle } from '@/lib/utils';
import { createClient } from '@/lib/supabase';
import { ChildSwitcher } from '@/components/ui/ChildSwitcher';
import Link from 'next/link';
import type { DomainCode } from '@/types';

interface ReflectionData {
  whats_new: string;
  whats_strong: string;
  whats_falling_apart: string;
  what_you_enjoyed: string;
  completed_at: string | null;
}

interface PastReflection extends ReflectionData {
  guide_key: string;
  started_at: string;
}

export default function ReflectionPage() {
  const { activeBand, activeChild, activeWeek, user, isViewerForActiveChild } = useApp();
  const currentPhase = activeWeek ?? getDefaultPhase();
  const guide = getWeeklyGuide(activeBand, currentPhase);
  const supabase = createClient();

  const [answers, setAnswers] = useState<ReflectionData>({
    whats_new: '', whats_strong: '', whats_falling_apart: '', what_you_enjoyed: '', completed_at: null,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [pastReflections, setPastReflections] = useState<PastReflection[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const guideKey = guide ? `${activeBand}-${currentPhase}` : null;

  // Load current reflection on mount
  useEffect(() => {
    if (!user || !activeChild || !guideKey) return;
    supabase
      .from('weekly_reflections')
      .select('*')
      .eq('child_id', activeChild.id)
      .eq('guide_key', guideKey)
      .single()
      .then(({ data }) => {
        if (data) {
          setAnswers({
            whats_new: data.whats_new || '',
            whats_strong: data.whats_strong || '',
            whats_falling_apart: data.whats_falling_apart || '',
            what_you_enjoyed: data.what_you_enjoyed || '',
            completed_at: data.completed_at,
          });
          if (data.completed_at) setSaved(true);
        }
      });
  }, [user, activeChild, guideKey, supabase]);

  // Save reflection
  const saveReflection = useCallback(async (markComplete: boolean) => {
    if (!user || !activeChild || !guideKey || isViewerForActiveChild) return;
    setSaving(true);
    const payload = {
      child_id: activeChild.id,
      guide_key: guideKey,
      whats_new: answers.whats_new || null,
      whats_strong: answers.whats_strong || null,
      whats_falling_apart: answers.whats_falling_apart || null,
      what_you_enjoyed: answers.what_you_enjoyed || null,
      ...(markComplete ? { completed_at: new Date().toISOString() } : {}),
    };
    await supabase
      .from('weekly_reflections')
      .upsert(payload, { onConflict: 'child_id,guide_key' });
    setSaving(false);
    if (markComplete) {
      setSaved(true);
      setAnswers(prev => ({ ...prev, completed_at: new Date().toISOString() }));
    }
  }, [user, activeChild, guideKey, answers, supabase, isViewerForActiveChild]);

  // Auto-save draft on blur
  const handleBlur = useCallback(() => {
    if (!answers.completed_at && user && activeChild && guideKey && !isViewerForActiveChild) {
      saveReflection(false);
    }
  }, [answers.completed_at, user, activeChild, guideKey, isViewerForActiveChild, saveReflection]);

  // Load past reflections
  async function loadHistory() {
    if (!user || !activeChild) return;
    setLoadingHistory(true);
    const { data } = await supabase
      .from('weekly_reflections')
      .select('*')
      .eq('child_id', activeChild.id)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(10);
    setPastReflections((data || []).map((d: Record<string, unknown>) => ({
      guide_key: d.guide_key as string,
      whats_new: (d.whats_new as string) || '',
      whats_strong: (d.whats_strong as string) || '',
      whats_falling_apart: (d.whats_falling_apart as string) || '',
      what_you_enjoyed: (d.what_you_enjoyed as string) || '',
      completed_at: d.completed_at as string | null,
      started_at: d.started_at as string,
    })));
    setLoadingHistory(false);
    setShowHistory(true);
  }

  if (!guide || !activeChild) return null;

  const domainCode = guide.domain_code as DomainCode;
  const color = DOMAIN_COLORS[domainCode];

  const questions = guide.reflection_questions?.length
    ? guide.reflection_questions
    : [
        `What is ${activeChild.name} doing now that they were not doing last week?`,
        'Which part of our rhythm is strongest?',
        'Which part keeps falling apart?',
        'What did I enjoy most this week?',
      ];

  const fieldKeys: (keyof ReflectionData)[] = ['whats_new', 'whats_strong', 'whats_falling_apart', 'what_you_enjoyed'];
  const hasContent = fieldKeys.some(k => answers[k]);

  return (
    <div className="py-4 space-y-4">
      <div>
        <ChildSwitcher />
        <h1 className="text-xl font-bold text-foreground mt-2">Reflection for {activeChild?.name}</h1>
        <p className="text-secondary text-sm mt-0.5">
          {DOMAIN_ICONS[domainCode]} {DOMAIN_FULL_NAMES[domainCode]} &middot; Phase {currentPhase}
        </p>
      </div>

      {isViewerForActiveChild && (
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 flex items-center gap-2">
          <span className="text-sm">👀</span>
          <p className="text-xs text-blue-700">You&apos;re viewing as a caregiver. Only parents can write reflections.</p>
        </div>
      )}

      {saved && (
        <div className="rounded-xl bg-green-50 border border-green-100 p-3 flex items-center gap-2">
          <span className="text-sm">✓</span>
          <p className="text-xs text-green-700">
            This week&apos;s reflection is complete.
            {!isViewerForActiveChild && ' You can still edit your answers below.'}
          </p>
        </div>
      )}

      <div className="space-y-4">
        {questions.slice(0, 4).map((q, i) => {
          const key = fieldKeys[i];
          return (
            <div key={i} className="bg-card rounded-2xl border border-border p-4">
              <label className="block text-sm font-medium text-foreground mb-2">{q}</label>
              {isViewerForActiveChild ? (
                <p className="text-sm text-secondary">
                  {answers[key] || <span className="text-muted italic">No response yet</span>}
                </p>
              ) : (
                <textarea
                  value={answers[key] as string}
                  onChange={e => setAnswers(prev => ({ ...prev, [key]: e.target.value }))}
                  onBlur={handleBlur}
                  rows={3}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:border-brand resize-none"
                  placeholder="Write your observations..."
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Save button */}
      {!isViewerForActiveChild && hasContent && !saved && (
        <button
          onClick={() => saveReflection(true)}
          disabled={saving}
          className="w-full bg-brand text-white py-3 rounded-xl font-semibold text-sm hover:bg-brand-dark transition-colors disabled:opacity-40"
        >
          {saving ? 'Saving...' : 'Complete This Week’s Reflection'}
        </button>
      )}

      {/* Encouragement */}
      <div
        className="rounded-2xl p-4 text-center"
        style={{ backgroundColor: `color-mix(in srgb, ${color} 8%, white)` }}
      >
        <p className="text-sm italic" style={{ color }}>
          Your child does not need a perfect week. They need a present parent.
        </p>
      </div>

      {/* Past reflections toggle */}
      {user && (
        <button
          onClick={() => showHistory ? setShowHistory(false) : loadHistory()}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-border text-sm text-secondary hover:border-brand/30 hover:text-foreground transition-colors"
        >
          <span>📖</span>
          {showHistory ? 'Hide past reflections' : 'View past reflections'}
        </button>
      )}

      {showHistory && (
        <div className="space-y-3">
          {loadingHistory && <p className="text-sm text-muted text-center">Loading...</p>}
          {!loadingHistory && pastReflections.length === 0 && (
            <p className="text-sm text-muted text-center">No completed reflections yet.</p>
          )}
          {pastReflections.map((r, i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">Phase {r.guide_key.split('-')[1]}</span>
                <span className="text-[10px] text-muted">
                  {r.completed_at ? new Date(r.completed_at).toLocaleDateString() : ''}
                </span>
              </div>
              {r.whats_new && (
                <div>
                  <p className="text-[10px] text-muted">What&apos;s new:</p>
                  <p className="text-xs text-secondary">{r.whats_new}</p>
                </div>
              )}
              {r.whats_strong && (
                <div>
                  <p className="text-[10px] text-muted">Strongest:</p>
                  <p className="text-xs text-secondary">{r.whats_strong}</p>
                </div>
              )}
              {r.whats_falling_apart && (
                <div>
                  <p className="text-[10px] text-muted">Needs work:</p>
                  <p className="text-xs text-secondary">{r.whats_falling_apart}</p>
                </div>
              )}
              {r.what_you_enjoyed && (
                <div>
                  <p className="text-[10px] text-muted">Enjoyed:</p>
                  <p className="text-xs text-secondary">{r.what_you_enjoyed}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Link
        href="/rhythm-print"
        className="flex items-center justify-center gap-2 p-3 rounded-xl border border-border text-sm text-secondary hover:border-brand/30 hover:text-foreground transition-colors"
      >
        <span>🖨️</span>
        Print this week&apos;s rhythm sheet
      </Link>
    </div>
  );
}
