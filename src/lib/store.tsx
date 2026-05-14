'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  isGraduated: boolean;
  activeWeek: number | null;
  loading: boolean;
  setParentName: (name: string) => void;
  addChild: (name: string, birthDate: string) => Promise<void>;
  editChild: (id: string, name: string, birthDate: string) => Promise<void>;
  removeChild: (id: string) => Promise<void>;
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

const STORAGE_KEY = 'evergreen-app-state';

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
  // Load local state IMMEDIATELY — no waiting for Supabase.
  // This may cause a React hydration mismatch warning (#418) but
  // suppressHydrationWarning on html/body handles it. Deferring to
  // useEffect breaks the dashboard layout's hasAccess check.
  const [state, setState] = useState<AppState>(() => loadLocalState());
  const [user, setUser] = useState<User | null>(null);
  const [loaded, setLoaded] = useState(true);  // Start loaded — local state is ready
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  // Track explicit sign-out so we don't nuke state on spontaneous
  // SIGNED_OUT events (e.g., tab visibility change + token refresh failure)
  const signOutRequested = useRef(false);

  // Initialize: check auth state, load data
  useEffect(() => {
    let mounted = true;

    async function loadFromSupabase(userId: string) {
      try {
        // Load profile
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (profileErr) console.warn('Profile load failed:', profileErr.message);

        // Load child access rows for this user
        const { data: accessRows, error: accessErr } = await supabase
          .from('child_access')
          .select('*')
          .eq('user_id', userId);

        if (accessErr) console.warn('Child access load failed:', accessErr.message);

        const childIds = (accessRows || []).map((a: Record<string, unknown>) => a.child_id as string);

        // Load children the user has access to
        let kids: Child[] = [];
        if (childIds.length > 0) {
          const { data: childData, error: childErr } = await supabase
            .from('children')
            .select('*')
            .in('id', childIds)
            .order('created_at');

          if (childErr) console.warn('Children load failed:', childErr.message);

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
          const { data: progress, error: progressErr } = await supabase
            .from('milestone_progress')
            .select('*')
            .in('child_id', childIds);

          if (progressErr) console.warn('Milestone progress load failed:', progressErr.message);

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
          const { data: guides, error: guidesErr } = await supabase
            .from('completed_guides')
            .select('*')
            .in('child_id', childIds);

          if (guidesErr) console.warn('Completed guides load failed:', guidesErr.message);

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
      } catch (err) {
        console.warn('loadFromSupabase failed:', err);
        if (mounted) setState(loadLocalState());
      }
    }

    // Strategy: local state is already loaded (see useState initializers above).
    // Now using standard createClient (localStorage-based) instead of
    // createBrowserClient (cookie-based SSR client that deadlocks).
    // getSession() works correctly with localStorage-based auth.

    async function tryInit() {
      try {
        console.log('[EH] Calling getSession()...');
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('[EH] getSession error:', error.message);
          return;
        }
        if (!mounted) return;
        if (session?.user) {
          console.log('[EH] Session found for user:', session.user.id);
          setUser(session.user);
          await loadFromSupabase(session.user.id);
          console.log('[EH] Supabase data loaded successfully');
        } else {
          console.log('[EH] No active session');
        }
      } catch (err) {
        console.warn('[EH] Auth init failed:', err);
      }
    }

    // Race against timeout — never block UI for more than 8s
    let resolved = false;
    const initPromise = tryInit().then(() => { resolved = true; });
    const timeoutId = setTimeout(() => {
      if (!resolved && mounted) {
        console.warn('[EH] Auth init timed out after 8s, keeping local state');
      }
    }, 8000);
    initPromise.finally(() => clearTimeout(timeoutId));

    // Listen for future auth changes (sign in, sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        console.log('[EH] Auth event:', event);
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          setLoading(true);
          try { await loadFromSupabase(session.user.id); } catch {}
          setLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          // Only nuke local state if the user explicitly signed out.
          // Spontaneous SIGNED_OUT events (tab switch, token refresh failure)
          // should NOT destroy children/milestones/onboarding state — the
          // dashboard layout falls back to local state via hasAccess check.
          if (signOutRequested.current) {
            signOutRequested.current = false;
            setState(defaultState);
            saveLocalState(defaultState);
          }
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save to localStorage as fallback (always, for offline support)
  useEffect(() => {
    if (loaded) saveLocalState(state);
  }, [state, loaded]);

  const activeChild = state.children.find(c => c.id === state.activeChildId) || null;
  const activeBand: number = activeChild ? getBandFromBirthDate(activeChild.birth_date) : 2;
  const isGraduated: boolean = activeBand === 0;
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
        throw new Error(error?.message || 'Failed to create child record');
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

  const editChild = useCallback(async (id: string, name: string, birthDate: string) => {
    const band = getBandFromBirthDate(birthDate);
    if (user) {
      const { error } = await supabase
        .from('children')
        .update({ name, birth_date: birthDate, current_band: band })
        .eq('id', id);
      if (error) {
        console.error('Failed to update child:', error);
        throw new Error(error.message);
      }
    }
    setState(s => ({
      ...s,
      children: s.children.map(c =>
        c.id === id ? { ...c, name, birth_date: birthDate, current_band: band } : c
      ),
    }));
  }, [user, supabase]);

  const removeChild = useCallback(async (id: string) => {
    if (user) {
      // Delete in order: milestone_progress, completed_guides, invite_links, child_access, children
      await supabase.from('milestone_progress').delete().eq('child_id', id);
      await supabase.from('completed_guides').delete().eq('child_id', id);
      await supabase.from('invite_links').delete().eq('child_id', id);
      await supabase.from('child_access').delete().eq('child_id', id);
      const { error } = await supabase.from('children').delete().eq('id', id);
      if (error) {
        console.error('Failed to remove child:', error);
        throw new Error(error.message);
      }
    }
    setState(s => {
      const remaining = s.children.filter(c => c.id !== id);
      // Clean up milestone progress and completed guides for this child
      const milestoneProgress = { ...s.milestoneProgress };
      const completedGuides = { ...s.completedGuides };
      for (const key of Object.keys(milestoneProgress)) {
        if (key.startsWith(id + '-')) delete milestoneProgress[key];
      }
      for (const key of Object.keys(completedGuides)) {
        if (key.startsWith(id + '-')) delete completedGuides[key];
      }
      return {
        ...s,
        children: remaining,
        childAccess: s.childAccess.filter(a => a.child_id !== id),
        activeChildId: s.activeChildId === id ? (remaining[0]?.id || null) : s.activeChildId,
        milestoneProgress,
        completedGuides,
      };
    });
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
    signOutRequested.current = true;
    await supabase.auth.signOut();
    // State nuke is handled by onAuthStateChange SIGNED_OUT handler
    // when signOutRequested is true. Belt-and-suspenders:
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
      isGraduated,
      activeWeek,
      loading,
      setParentName,
      addChild,
      editChild,
      removeChild,
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
