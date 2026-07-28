import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Service-role client for trusted server contexts only (cron/API routes).
// Never import this into client components — it bypasses row-level security.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
