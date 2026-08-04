import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  );
}

/**
 * Password recovery links arrive as `#access_token=...&type=recovery` (or
 * `#error=...&error_code=otp_expired` when they are stale). Route them to the
 * reset screen *before* createClient(), because supabase-js consumes and strips
 * the fragment as soon as it initialises. This also rescues links that land on
 * "/" — Supabase falls back to the Site URL when the redirect URL of the app is
 * not allow-listed in the dashboard.
 */
const RESET_PATH = '/reset-password';

function redirectRecoveryLink() {
  if (window.location.pathname === RESET_PATH) return;

  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const isRecovery = params.get('type') === 'recovery' || params.has('error_code');
  if (!isRecovery) return;

  window.history.replaceState(null, '', RESET_PATH + window.location.search + window.location.hash);
}

redirectRecoveryLink();

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
