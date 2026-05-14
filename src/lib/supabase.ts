import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

// CRITICAL FIX: Monkey-patch navigator.locks BEFORE any Supabase code runs.
//
// supabase-js v2.x GoTrueClient uses navigator.locks.request() internally for
// auth token operations. In Next.js App Router, the exclusive lock acquired
// during _initialize() never releases, causing every subsequent auth call
// (getSession, signInWithPassword, onAuthStateChange) to deadlock.
//
// The auth.lock constructor option doesn't reliably bypass this because
// GoTrueClient may capture navigator.locks.request at module load time.
// Patching the global ensures ALL lock calls become pass-through.
//
// Safe for a single-tab SPA — no concurrent tab contention to protect against.
if (typeof window !== 'undefined' && navigator.locks) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const noopLocks = {
      request: async (_name: string, optionsOrFn: any, maybeFn?: any) => {
        const fn = typeof optionsOrFn === 'function' ? optionsOrFn : maybeFn;
        return fn();
      },
      query: async () => ({ held: [], pending: [] }),
    };
    // navigator.locks may be read-only (getter-only) in some browsers,
    // so use Object.defineProperty to force-override it.
    Object.defineProperty(navigator, 'locks', {
      value: noopLocks,
      writable: true,
      configurable: true,
    });
  } catch {
    // If the property is truly immutable, fall back gracefully —
    // the auth.lock option in createClient will handle it instead.
  }
}

// Singleton browser client — multiple GoTrueClient instances on the same
// storage key cause them to deadlock each other during initialization.
let client: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  if (!client) {
    client = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return client;
}
