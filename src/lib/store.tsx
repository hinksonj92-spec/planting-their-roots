'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Child, ChildMilestone, ChildAccess, InviteLink } from '@/types';
import { getBandFromBirthDate } from '@/lib/utils';
import { getMilestones } from '@/lib/content';
import { createClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AppState {
  parentName: string;
  children: Child[];
  childAccess: ChildAccess[];
  activeChildId: string | null;
  milestoneProgress: Record<string, ChildMilestone>;
  completedGuides: Record<string, boolean>;
  isOnboarded: boolean;
}

interface AppContextType extends AppState {
  user: User | null;
  activeChild: Child | null;
  activeBand: number;
  activeWeek: number | null;
  loading: boolean;
  setParentName: (name: string) => void;
  addChild: (name: string, birthDate: string) => Promise<void>;
  setActiveChild: (id: string) => void;
  setChildWeek: (childId: string, week: number | null) => void;
  toggleMilestone: (milestoneId: string) => void;
  isMilestoneComplete: (milestoneId: string) => boolean;
  getMilestoneCount: (band: number, domainCode?: string) => { total: number; completed: number };
  markGuideComplete: (guideKey: string) => void;
  isGuideComplete: (guideKey: string) => boolean;
  completeOnboarding: () => void;
  createInviteLink: (childId: string) => Promise<InviteLink | null>;
  getInviteLinks: (childId: string) => Promise<InviteLink[]>;
  acceptInvite: (token: string) => Promise<{ success: boolean; childName?: string; error?: string }>;
  getRoleForChild: (childId: string) => 'creator' | 'parent' | 'viewer' | null;
  signOut: () => Promise<void>;
  reset: () => void;
}

const STORAGE_KEY = 'ptr-app-state';

const defaultState: AppState = {
  parentName: '',
  children: [],
  childAccess: [],
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

export function AppProvider({ children: reactChildren }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(defaultState);
  const [user, setUser] = useState<User | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  // Initialize: check auth state, load data
  useEffect(() => {
    let mounted = true;

    async function loadFromSupabase(userId: string) {
      // Load profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // Load child access rows for this user
      const { data: accessRows } = await supabase
        .from('child_access')
        .select('*')
        .eq('user_id', userId);

      const childIds = (accessRows || []).map((a: Record<string, unknown>) => a.child_id as string);

      // Load children the user has access to
      let kids: Child[] = [];
      if (childIds.length > 0) {
        const { data: childData } = await supabase
          .from('children')
          .select('*')
          .in('id', childIds)
          .order('created_at');

        kids = (childData || []).map((k: Record<string, unknown>) => ({
          id: k.id as string,
          created_by: k.created_by as string,
          name: k.name as string,
          birth_date: k.birth_date as string,
          current_band: k.current_band as number,
          current_week: (k.current_week as number) ?? null,
          created_at: k.created_at as string,
        }));
      }

      // Load milestone progress for all children
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

      if (!mounted) return;

      const mappedAccess: ChildAccess[] = (accessRows || []).map((a: Record<string, unknown>) => ({
        id: a.id as string,
        user_id: a.user_id as string,
        child_id: a.child_id as string,
        role: a.role as 'creator' | 'parent' | 'viewer',
        joined_at: a.joined_at as string,
      }));

      setState({
        parentName: profile?.display_name || 'Parent',
        children: kids,
        childAccess: mappedAccess,
        activeChildId: kids.length > 0 ? kids[0].id : null,
        milestoneProgress,
        completedGuides,
        isOnboarded: kids.length > 0,
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
  const activeWeek: number | null = activeChild?.current_week ?? null;

  const setParentName = useCallback((name: string) => {
    setState(s => ({ ...s, parentName: name }));
    if (user) {
      supabase.from('profiles').update({ display_name: name }).eq('id', user.id).then(() => {});
    }
  }, [user, supabase]);

  const addChild = useCallback(async (name: string, birthDate: string) => {
    const band = getBandFromBirthDate(birthDate);

    if (user) {
      // Insert child with created_by
      const { data: newChild, error } = await supabase
        .from('children')
        .insert({ created_by: user.id, name, birth_date: birthDate, current_band: band })
        .select()
        .single();

      if (error || !newChild) {
        console.error('Failed to add child:', error);
        return;
      }

      // Insert creator access row
      await supabase
        .from('child_access')
        .insert({ user_id: user.id, child_id: newChild.id, role: 'creator' });

      const child: Child = {
        id: newChild.id,
        created_by: newChild.created_by,
        name: newChild.name,
        birth_date: newChild.birth_date,
        current_band: newChild.current_band,
        current_week: newChild.current_week ?? null,
        created_at: newChild.created_at,
      };

      const access: ChildAccess = {
        id: crypto.randomUUID(),
        user_id: user.id,
        child_id: newChild.id,
        role: 'creator',
        joined_at: new Date().toISOString(),
      };

      setState(s => ({
        ...s,
        children: [...s.children, child],
        childAccess: [...s.childAccess, access],
        activeChildId: s.activeChildId || child.id,
        isOnboarded: true,
      }));
    } else {
      // Local-only mode
      const id = crypto.randomUUID();
      const child: Child = {
        id,
        created_by: 'local',
        name,
        birth_date: birthDate,
        current_band: band,
        current_week: null,
        created_at: new Date().toISOString(),
      };
      setState(s => ({
        ...s,
        children: [...s.children, child],
        activeChildId: s.activeChildId || id,
      }));
    }
  }, [user, supabase]);

  const setActiveChild = useCallback((id: string) => {
    setState(s => ({ ...s, activeChildId: id }));
  }, []);

  const setChildWeek = useCallback((childId: string, week: number | null) => {
    setState(s => ({
      ...s,
      children: s.children.map(c =>
        c.id === childId ? { ...c, current_week: week } : c
      ),
    }));
    if (user) {
      supabase.from('children').update({ current_week: week }).eq('id', childId).then(() => {});
    }
  }, [user, supabase]);

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

  // --- Invite Link System ---

  const createInviteLink = useCallback(async (childId: string): Promise<InviteLink | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('invite_links')
      .insert({ child_id: childId, created_by: user.id })
      .select()
      .single();

    if (error || !data) {
      console.error('Failed to create invite link:', error);
      return null;
    }

    return {
      id: data.id,
      child_id: data.child_id,
      token: data.token,
      created_by: data.created_by,
      expires_at: data.expires_at,
      used_by: data.used_by,
      used_at: data.used_at,
      created_at: data.created_at,
    };
  }, [user, supabase]);

  const getInviteLinks = useCallback(async (childId: string): Promise<InviteLink[]> => {
    if (!user) return [];

    const { data } = await supabase
      .from('invite_links')
      .select('*')
      .eq('child_id', childId)
      .order('created_at', { ascending: false });

    return (data || []).map((d: Record<string, unknown>) => ({
      id: d.id as string,
      child_id: d.child_id as string,
      token: d.token as string,
      created_by: d.created_by as string,
      expires_at: d.expires_at as string,
      used_by: (d.used_by as string) || null,
      used_at: (d.used_at as string) || null,
      created_at: d.created_at as string,
    }));
  }, [user, supabase]);

  const acceptInvite = useCallback(async (token: string): Promise<{ success: boolean; childName?: string; error?: string }> => {
    if (!user) return { success: false, error: 'You must be signed in to accept an invite.' };

    // Look up the invite link
    const { data: invite, error: lookupErr } = await supabase
      .from('invite_links')
      .select('*, children(name)')
      .eq('token', token)
      .single();

    if (lookupErr || !invite) {
      return { success: false, error: 'Invite link not found or invalid.' };
    }

    if (invite.used_by) {
      return { success: false, error: 'This invite link has already been used.' };
    }

    if (new Date(invite.expires_at) < new Date()) {
      return { success: false, error: 'This invite link has expired.' };
    }

    // Check if user already has access
    const { data: existing } = await supabase
      .from('child_access')
      .select('id')
      .eq('user_id', user.id)
      .eq('child_id', invite.child_id)
      .single();

    if (existing) {
      return { success: false, error: 'You already have access to this child.' };
    }

    // Grant access
    const { error: accessErr } = await supabase
      .from('child_access')
      .insert({ user_id: user.id, child_id: invite.child_id, role: 'parent' });

    if (accessErr) {
      return { success: false, error: 'Failed to grant access.' };
    }

    // Mark invite as used
    await supabase
      .from('invite_links')
      .update({ used_by: user.id, used_at: new Date().toISOString() })
      .eq('id', invite.id);

    // Reload child data into state
    const { data: childData } = await supabase
      .from('children')
      .select('*')
      .eq('id', invite.child_id)
      .single();

    if (childData) {
      const child: Child = {
        id: childData.id,
        created_by: childData.created_by,
        name: childData.name,
        birth_date: childData.birth_date,
        current_band: childData.current_band,
        current_week: childData.current_week ?? null,
        created_at: childData.created_at,
      };

      const access: ChildAccess = {
        id: crypto.randomUUID(),
        user_id: user.id,
        child_id: childData.id,
        role: 'parent',
        joined_at: new Date().toISOString(),
      };

      setState(s => ({
        ...s,
        children: [...s.children, child],
        childAccess: [...s.childAccess, access],
        activeChildId: s.activeChildId || child.id,
        isOnboarded: true,
      }));
    }

    const childName = (invite as Record<string, unknown>).children
      ? ((invite as Record<string, unknown>).children as Record<string, unknown>).name as string
      : undefined;

    return { success: true, childName };
  }, [user, supabase]);

  const getRoleForChild = useCallback((childId: string): 'creator' | 'parent' | 'viewer' | null => {
    const access = state.childAccess.find(a => a.child_id === childId);
    return access?.role ?? null;
  }, [state.childAccess]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setState(defaultState);
    setUser(null);
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
      activeChild,
      activeBand,
      activeWeek,
      loading,
      setParentName,
      addChild,
      setActiveChild,
      setChildWeek,
      toggleMilestone,
      isMilestoneComplete,
      getMilestoneCount,
      markGuideComplete,
      isGuideComplete,
      completeOnboarding,
      createInviteLink,
      getInviteLinks,
      acceptInvite,
      getRoleForChild,
      signOut,
      reset,
    }}>
      {reactChildren}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
