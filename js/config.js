// ============================================
// NutriTrack — Public Configuration
// ============================================
// These are safe to expose client-side.
// Supabase anon key is designed to be public
// (Row Level Security protects the data).
//
// Replace these with your Supabase project values
// from: https://supabase.com/dashboard → Settings → API
// ============================================

export const CONFIG = {
  SUPABASE_URL: 'https://YOUR_PROJECT.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR_ANON_KEY',
};

/**
 * Returns true if Supabase credentials have been configured.
 * When false, the app runs in demo mode with localStorage.
 */
export function isSupabaseConfigured() {
  return (
    CONFIG.SUPABASE_URL !== 'https://YOUR_PROJECT.supabase.co' &&
    CONFIG.SUPABASE_ANON_KEY !== 'YOUR_ANON_KEY' &&
    CONFIG.SUPABASE_URL.length > 10 &&
    CONFIG.SUPABASE_ANON_KEY.length > 10
  );
}
