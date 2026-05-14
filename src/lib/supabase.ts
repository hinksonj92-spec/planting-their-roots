import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

// Singleton browser client. Using the standard createClient (localStorage auth)
// instead of createBrowserClient from @supabase/ssr which deadlocks on init.
// MUST be a singleton — multiple GoTrueClient instances on the same storage key
// cause them to deadlock each other during initialization.
let client: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  if (!client) {
    client = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}
