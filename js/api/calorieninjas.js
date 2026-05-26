// ============================================
// NutriTrack — CalorieNinjas API Wrapper
// Natural language nutrition lookup
// Free tier: 10,000 requests/month
// ============================================

export class CalorieNinjasAPI {
  static BASE_URL = 'https://api.calorieninjas.com/v1/nutrition';

  /**
   * Search for food items using natural language
   * e.g. "2 eggs and a slice of toast" or "200g grilled chicken breast"
   *
   * @param {string} query - Natural language food query
   * @param {string} apiKey - CalorieNinjas API key
   * @returns {Array} Array of food items with nutrition data
   */
  static async search(query, apiKey) {
    if (!apiKey) {
      throw new Error('CalorieNinjas API key is not configured. Go to Settings to add your key.');
    }

    if (!query || query.trim().length === 0) {
      return [];
    }

    try {
      const response = await fetch(
        `${this.BASE_URL}?query=${encodeURIComponent(query.trim())}`,
        {
          method: 'GET',
          headers: {
            'X-Api-Key': apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your CalorieNinjas API key in Settings.');
      }

      if (response.status === 429) {
        throw new Error('API rate limit reached. Please try again later.');
      }

      if (!response.ok) {
        throw new Error(`API error (${response.status}). Please try again.`);
      }

      const data = await response.json();

      return (data.items || []).map(item => ({
        name: item.name || 'Unknown',
        calories: Math.round((item.calories || 0) * 10) / 10,
        serving_size_g: item.serving_size_g || 100,
        fat_total_g: Math.round((item.fat_total_g || 0) * 10) / 10,
        fat_saturated_g: Math.round((item.fat_saturated_g || 0) * 10) / 10,
        protein_g: Math.round((item.protein_g || 0) * 10) / 10,
        sodium_mg: Math.round((item.sodium_mg || 0) * 10) / 10,
        potassium_mg: Math.round((item.potassium_mg || 0) * 10) / 10,
        cholesterol_mg: Math.round((item.cholesterol_mg || 0) * 10) / 10,
        carbohydrates_total_g: Math.round((item.carbohydrates_total_g || 0) * 10) / 10,
        fiber_g: Math.round((item.fiber_g || 0) * 10) / 10,
        sugar_g: Math.round((item.sugar_g || 0) * 10) / 10,
      }));
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error('Network error. Please check your internet connection.');
      }
      throw err;
    }
  }
}
