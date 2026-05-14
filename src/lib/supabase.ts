import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

// Singleton browser client. Using the standard createClient (localStorage auth)
// instead of createBrowserClient from @supabase/ssr which deadlocks on init.
// MUST be a singleton — multiple GoTrueClient instances on the same storage key
// cause them to deadlock each other during initialization.
//
// CRITICAL: navigator.locks is disabled via a no-op lock function.
// supabase-js v2.x uses navigator.locks.request() internally for auth token
// operations. In Next.js App Router, the lock acquired during _initialize()
// never releases, causing every subsequent auth call (getSession,
// signInWithPassword, onAuthStateChange) to deadlock waiting for the lock.
// Bypassing it is safe for a single-tab SPA — there's no concurrent tab
// contention to protect against.
let client: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  if (!client) {
    client = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<unknown>) => {
            return fn();
          },
        },
      }
    );
  }
  return client;
}
