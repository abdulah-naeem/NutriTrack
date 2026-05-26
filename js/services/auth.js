// ============================================
// NutriTrack — Supabase Auth Service
// Handles signup, login, logout, and session
// ============================================

import { CONFIG } from '../config.js';

let supabaseClient = null;

function getClient() {
  if (!supabaseClient) {
    if (typeof window.supabase === 'undefined') {
      throw new Error('Supabase SDK not loaded. Check your internet connection.');
    }
    supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}

export class AuthService {
  /**
   * Sign up with email and password
   */
  static async signUp(email, password, metadata = {}) {
    const client = getClient();
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: typeof metadata === 'string' ? { name: metadata } : metadata,
      },
    });

    if (error) throw error;
    return data;
  }

  /**
   * Sign in with email and password
   */
  static async signIn(email, password) {
    const client = getClient();
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  }

  /**
   * Sign in with Google OAuth
   */
  static async signInWithGoogle() {
    const client = getClient();
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) throw error;
    return data;
  }

  /**
   * Sign out
   */
  static async signOut() {
    const client = getClient();
    const { error } = await client.auth.signOut();
    if (error) throw error;
  }

  /**
   * Get current session
   */
  static async getSession() {
    const client = getClient();
    const { data: { session }, error } = await client.auth.getSession();
    if (error) throw error;
    return session;
  }

  /**
   * Get current user (verified with Supabase server)
   */
  static async getUser() {
    try {
      const client = getClient();
      const { data: { user }, error } = await client.auth.getUser();
      if (error) return null;
      return user;
    } catch {
      return null;
    }
  }

  /**
   * Listen for auth state changes
   */
  static onAuthStateChange(callback) {
    const client = getClient();
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
    return subscription;
  }

  /**
   * Get user display info
   */
  static getUserDisplay(user) {
    if (!user) return { name: 'Guest', email: '', initials: '?' };
    const name = user.user_metadata?.name || user.email?.split('@')[0] || 'User';
    const email = user.email || '';
    const initials = name.charAt(0).toUpperCase();
    return { name, email, initials };
  }
}
