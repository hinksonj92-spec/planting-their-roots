'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Child, ChildMilestone } from '@/types';
import { getBandFromBirthDate } from '@/lib/utils';
import { getMilestones } from '@/lib/content';
import { createClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AppState {
  parentName: string;
  children: Child[];
  activeChildId: string | null;
  milestoneProgress: Record<string, ChildMilestone>;
  completedGuides: Record<string, boolean>;
  isOnboarded: boolean;
}

interface AppContextType extends AppState {
  user: User | null;
  familyId: string | null;
  activeChild: Child | null;
  activeBand: number;
  loading: boolean;
  setParentName: (name: string) => void;
  addChild: (name: string, birthDate: string) => Promise<void>;
  setActiveChild: (id: string) => void;
  toggleMilestone: (milestoneId: string) => void;
  isMilestoneComplete: (milestoneId: string) => boolean;
  getMilestoneCount: (band: number, domainCode?: string) => { total: number; completed: number };
  markGuideComplete: (guideKey: string) => void;
  isGuideComplete: (guideKey: string) => boolean;
  completeOnboarding: () => void;
  signOut: () => Promise<void>;
  reset: () => void;
}

const STORAGE_KEY = 'ptr-app-state';

const defaultState: AppState = {
  parentName: '',
  children: [],
  activeChildId: null,
  milestoneProgress: {},
  completedGuides: {},
  isOnboarded: false,
};

function loadLocalState(): AppState {
  if (typeof window === 'undefined') return defaultState;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...defaultState, ...JSON.parse(stored) };
  } catch {}
  return defaultState;
}

function saveLocalState(state: AppState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(defaultState);
  const [user, setUser] = useState<User | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  // Initialize: check auth state, load data
  useEffect(() => {
    let mounted = true;

    async function loadFromSupabase(userId: string) {
      // Load family
      const { data: family } = await supabase
        .from('families')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!family || !mounted) return;

      setFamilyId(family.id);

      // Load children
      const { data: kids } = await supabase
        .from('children')
        .select('*')
        .eq('family_id', family.id)
        .order('created_at');

      // Load milestone progress for all children
      const childIds = (kids || []).map((k: Record<string, unknown>) => k.id as string);
      let milestoneProgress: Record<string, ChildMilestone> = {};
      if (childIds.length > 0) {
        const { data: progress } = await supabase
          .from('milestone_progress')
          .select('*')
          .in('child_id', childIds);

        for (const p of (progress || [])) {
          const key = `${p.child_id}-${p.milestone_key}`;
          milestoneProgress[key] = {
            id: p.id,
            child_id: p.child_id,
            milestone_id: p.milestone_key,
            observed_date: p.observed_date,
            notes: p.notes,
          };
        }
      }

      // Load completed guides
      let completedGuides: Record<string, boolean> = {};
      if (childIds.length > 0) {
        const { data: guides } = await supabase
          .from('completed_guides')
          .select('*')
          .in('child_id', childIds);

        for (const g of (guides || [])) {
          completedGuides[`${g.child_id}-${g.guide_key}`] = true;
        }
      }

      const mappedKids: Child[] = (kids || []).map((k: Record<string, unknown>) => ({
        id: k.id as string,
        family_id: k.family_id as string,
        name: k.name as string,
        birth_date: k.birth_date as string,
        current_band: k.current_band as number,
        created_at: k.created_at as string,
      }));

      if (!mounted) return;

      setState({
        parentName: family.parent_name,
        children: mappedKids,
        activeChildId: mappedKids.length > 0 ? mappedKids[0].id : null,
        milestoneProgress,
        completedGuides,
        isOnboarded: mappedKids.length > 0,
      });
    }

    async function init() {
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      if (!mounted) return;

      if (currentUser) {
        setUser(currentUser);
        await loadFromSupabase(currentUser.id);
      } else {
        // No auth — use localStorage fallback
        setState(loadLocalState());
      }

      setLoaded(true);
      setLoading(false);
    }

    init();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          setLoading(true);
          await loadFromSupabase(session.user.id);
          setLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setFamilyId(null);
          setState(defaultState);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save to localStorage as fallback (always, for offline support)
  useEffect(() => {
    if (loaded) saveLocalState(state);
  }, [state, loaded]);

  const activeChild = state.children.find(c => c.id === state.activeChildId) || null;
  const activeBand: number = activeChild ? getBandFromBirthDate(activeChild.birth_date) : 2;

  const setParentName = useCallback((name: string) => {
    setState(s => ({ ...s, parentName: name }));
    if (familyId) {
      supabase.from('families').update({ parent_name: name }).eq('id', familyId).then(() => {});
    }
  }, [familyId, supabase]);

  const addChild = useCallback(async (name: string, birthDate: string) => {
    const band = getBandFromBirthDate(birthDate);

    if (user && familyId) {
      const { data: newChild, error } = await supabase
        .from('children')
        .insert({ family_id: familyId, name, birth_date: birthDate, current_band: band })
        .select()
        .single();

      if (error || !newChild) {
        console.error('Failed to add child:', error);
        return;
      }

      const child: Child = {
        id: newChild.id,
        family_id: newChild.family_id,
        name: newChild.name,
        birth_date: newChild.birth_date,
        current_band: newChild.current_band,
        created_at: newChild.created_at,
      };

      setState(s => ({
        ...s,
        children: [...s.children, child],
        activeChildId: s.activeChildId || child.id,
        isOnboarded: true,
      }));
    } else {
      const id = crypto.randomUUID();
      const child: Child = {
        id,
        family_id: 'local',
        name,
        birth_date: birthDate,
        current_band: band,
        created_at: new Date().toISOString(),
      };
      setState(s => ({
        ...s,
        children: [...s.children, child],
        activeChildId: s.activeChildId || id,
      }));
    }
  }, [user, familyId, supabase]);

  const setActiveChild = useCallback((id: string) => {
    setState(s => ({ ...s, activeChildId: id }));
  }, []);

  const toggleMilestone = useCallback((milestoneId: string) => {
    setState(s => {
      const key = `${s.activeChildId}-${milestoneId}`;
      const existing = s.milestoneProgress[key];
      const updated = { ...s.milestoneProgress };

      if (existing?.observed_date) {
        delete updated[key];
        if (user && s.activeChildId) {
          supabase.from('milestone_progress')
            .delete()
            .eq('child_id', s.activeChildId)
            .eq('milestone_key', milestoneId)
            .then(() => {});
        }
      } else {
        const observedDate = new Date().toISOString().split('T')[0];
        updated[key] = {
          id: key,
          child_id: s.activeChildId || '',
          milestone_id: milestoneId,
          observed_date: observedDate,
          notes: null,
        };
        if (user && s.activeChildId) {
          supabase.from('milestone_progress')
            .upsert({
              child_id: s.activeChildId,
              milestone_key: milestoneId,
              observed_date: observedDate,
            }, { onConflict: 'child_id,milestone_key' })
            .then(() => {});
        }
      }
      return { ...s, milestoneProgress: updated };
    });
  }, [user, supabase]);

  const isMilestoneComplete = useCallback((milestoneId: string) => {
    const key = `${state.activeChildId}-${milestoneId}`;
    return !!state.milestoneProgress[key]?.observed_date;
  }, [state.activeChildId, state.milestoneProgress]);

  const getMilestoneCount = useCallback((band: number, domainCode?: string) => {
    const allMilestones = getMilestones(band);
    let filtered = allMilestones;
    if (domainCode) filtered = filtered.filter(m => m.domain_code === domainCode);
    const total = filtered.length;
    let completed = 0;
    for (const m of filtered) {
      const key = `${state.activeChildId}-${m.band}-${m.domain_code}-${m.description}`;
      if (state.milestoneProgress[key]?.observed_date) completed++;
    }
    return { total, completed };
  }, [state.activeChildId, state.milestoneProgress]);

  const markGuideComplete = useCallback((guideKey: string) => {
    setState(s => {
      const fullKey = `${s.activeChildId}-${guideKey}`;
      if (user && s.activeChildId) {
        supabase.from('completed_guides')
          .upsert({
            child_id: s.activeChildId,
            guide_key: guideKey,
          }, { onConflict: 'child_id,guide_key' })
          .then(() => {});
      }
      return { ...s, completedGuides: { ...s.completedGuides, [fullKey]: true } };
    });
  }, [user, supabase]);

  const isGuideComplete = useCallback((guideKey: string) => {
    return !!state.completedGuides[guideKey];
  }, [state.completedGuides]);

  const completeOnboarding = useCallback(() => {
    setState(s => ({ ...s, isOnboarded: true }));
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setState(defaultState);
    setUser(null);
    setFamilyId(null);
    if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY);
  }, [supabase]);

  const reset = useCallback(() => {
    setState(defaultState);
    if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY);
  }, []);

  if (!loaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center mx-auto mb-3">
            <span className="text-xl">🌱</span>
          </div>
          <div className="text-muted text-sm">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{
      ...state,
      user,
      familyId,
      activeChild,
      activeBand,
      loading,
      setParentName,
      addChild,
      setActiveChild,
      toggleMilestone,
      isMilestoneComplete,
      getMilestoneCount,
      markGuideComplete,
      isGuideComplete,
      completeOnboarding,
      signOut,
      reset,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
