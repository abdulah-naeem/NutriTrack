// ============================================
// NutriTrack — Frontend API Client
// Calls Vercel serverless functions to proxy
// nutrition API requests (keeps keys server-side)
// ============================================

export class APIClient {
  /**
   * Search for food nutrition data via multiple APIs
   * Calls /api/nutrition serverless function which:
   *   1. Queries CalorieNinjas and USDA in parallel
   *   2. Aggregates/averages the results
   *   3. Returns the best match
   *
   * @param {string} query - Natural language food query (e.g. "200g chicken breast")
   * @returns {Array} Array of food items with averaged nutrition data
   */
  static async searchFood(query) {
    if (!query || query.trim().length === 0) return [];

    try {
      const response = await fetch(`/api/nutrition?query=${encodeURIComponent(query.trim())}`);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Search failed (${response.status})`);
      }

      const data = await response.json();
      return data.items || [];
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error('Network error. Please check your internet connection.');
      }
      throw err;
    }
  }

  /**
   * Get AI meal suggestions based on remaining macros
   * Calls /api/ai-suggest serverless function
   *
   * @param {Object} context - { remaining: { calories, protein, carbs, fat }, mealType, preferences }
   * @returns {Object} AI suggestion with text and optional food recommendations
   */
  static async getAISuggestion(context) {
    try {
      const response = await fetch('/api/ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'AI suggestion failed');
      }

      return await response.json();
    } catch (err) {
      console.warn('AI suggestion unavailable:', err.message);
      return null;
    }
  }
}
