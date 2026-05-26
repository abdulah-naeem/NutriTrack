// ============================================
// NutriTrack — Supabase Database Service
// CRUD operations for food entries, profiles, water
// ============================================

import { CONFIG } from '../config.js';

let supabaseClient = null;

function getClient() {
  if (!supabaseClient) {
    if (typeof window.supabase === 'undefined') {
      throw new Error('Supabase SDK not loaded.');
    }
    supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}

export class DatabaseService {
  // ── Profile ──────────────────────────

  static async getProfile(userId) {
    const { data, error } = await getClient()
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return data;
  }

  static async upsertProfile(userId, profile) {
    const { data, error } = await getClient()
      .from('profiles')
      .upsert({
        id: userId,
        ...profile,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ── Food Entries ─────────────────────

  static async getFoodEntries(userId, date) {
    const dateStr = date || new Date().toISOString().split('T')[0];

    const { data, error } = await getClient()
      .from('food_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('date', dateStr)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async addFoodEntry(userId, entry) {
    const { data, error } = await getClient()
      .from('food_entries')
      .insert({
        user_id: userId,
        date: entry.date || new Date().toISOString().split('T')[0],
        meal_type: entry.meal_type,
        name: entry.name,
        calories: entry.calories || 0,
        protein_g: entry.protein_g || 0,
        carbohydrates_total_g: entry.carbohydrates_total_g || 0,
        fat_total_g: entry.fat_total_g || 0,
        serving_size_g: entry.serving_size_g || 100,
        fiber_g: entry.fiber_g || 0,
        sugar_g: entry.sugar_g || 0,
        sodium_mg: entry.sodium_mg || 0,
        fat_saturated_g: entry.fat_saturated_g || 0,
        potassium_mg: entry.potassium_mg || 0,
        cholesterol_mg: entry.cholesterol_mg || 0,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteFoodEntry(entryId) {
    const { error } = await getClient()
      .from('food_entries')
      .delete()
      .eq('id', entryId);

    if (error) throw error;
  }

  static async updateFoodEntry(entryId, entry) {
    const { data, error } = await getClient()
      .from('food_entries')
      .update({
        meal_type: entry.meal_type,
        name: entry.name,
        calories: entry.calories || 0,
        protein_g: entry.protein_g || 0,
        carbohydrates_total_g: entry.carbohydrates_total_g || 0,
        fat_total_g: entry.fat_total_g || 0,
        serving_size_g: entry.serving_size_g || 100,
        fiber_g: entry.fiber_g || 0,
        sugar_g: entry.sugar_g || 0,
        sodium_mg: entry.sodium_mg || 0,
        fat_saturated_g: entry.fat_saturated_g || 0,
        potassium_mg: entry.potassium_mg || 0,
        cholesterol_mg: entry.cholesterol_mg || 0,
      })
      .eq('id', entryId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get entries grouped by meal type (for dashboard/food-log views)
   */
  static async getFoodLog(userId, date) {
    const entries = await this.getFoodEntries(userId, date);
    const log = {
      breakfast: [],
      morningSnack: [],
      lunch: [],
      afternoonSnack: [],
      dinner: [],
      eveningSnack: [],
      beverages: [],
    };

    entries.forEach(entry => {
      if (log[entry.meal_type]) {
        log[entry.meal_type].push(entry);
      }
    });

    return log;
  }

  /**
   * Get food entries for a date range (for analytics)
   */
  static async getFoodEntriesRange(userId, startDate, endDate) {
    const { data, error } = await getClient()
      .from('food_entries')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  // ── Water Tracking ───────────────────

  static async getWaterEntry(userId, date) {
    const dateStr = date || new Date().toISOString().split('T')[0];

    const { data, error } = await getClient()
      .from('water_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('date', dateStr)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || { glasses: 0 };
  }

  static async upsertWater(userId, date, glasses) {
    const dateStr = date || new Date().toISOString().split('T')[0];

    const { data, error } = await getClient()
      .from('water_entries')
      .upsert({
        user_id: userId,
        date: dateStr,
        glasses,
      }, { onConflict: 'user_id,date' })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ── Sleep Tracking ───────────────────

  static async getSleepEntry(userId, date) {
    const dateStr = date || new Date().toISOString().split('T')[0];

    try {
      const { data, error } = await getClient()
        .from('sleep_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('date', dateStr)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || { hours: 0, quality: 'good' };
    } catch (err) {
      console.warn('Sleep entries table might not exist yet:', err.message);
      return { hours: 0, quality: 'good' };
    }
  }

  static async upsertSleepEntry(userId, date, hours, quality) {
    const dateStr = date || new Date().toISOString().split('T')[0];

    const { data, error } = await getClient()
      .from('sleep_entries')
      .upsert({
        user_id: userId,
        date: dateStr,
        hours,
        quality
      }, { onConflict: 'user_id,date' })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ── Streaks ──────────────────────────

  static async getStreak(userId) {
    // Get last 60 days of entries to calculate streak
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 60 * 86400000).toISOString().split('T')[0];

    const { data, error } = await getClient()
      .from('food_entries')
      .select('date')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) throw error;

    // Get unique dates with entries
    const datesWithEntries = new Set((data || []).map(e => e.date));

    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 60; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      if (datesWithEntries.has(dateStr)) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }
}
