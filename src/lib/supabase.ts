import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Use the standard Supabase client (localStorage-based auth) instead of
// createBrowserClient from @supabase/ssr. The SSR cookie-based client has
// a known deadlock in its internal _initialize() that blocks ALL auth methods
// (getSession, getUser, signInWithPassword) indefinitely in supabase-js v2.105+.
// The middleware still uses createServerClient for server-side cookie refresh.
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
