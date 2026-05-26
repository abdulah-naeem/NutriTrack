// ============================================
// NutriTrack — Nutrition Calculation Service
// Sums, averages, and formats nutrition data
// ============================================

export class NutritionService {
  /**
   * Calculate totals for an entire day's food log
   */
  static calculateDayTotals(foodLog) {
    const totals = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
      fat_saturated: 0,
      potassium: 0,
      cholesterol: 0,
    };

    Object.values(foodLog).forEach(mealItems => {
      if (Array.isArray(mealItems)) {
        mealItems.forEach(item => {
          totals.calories += item.calories || 0;
          totals.protein += item.protein_g || 0;
          totals.carbs += item.carbohydrates_total_g || 0;
          totals.fat += item.fat_total_g || 0;
          totals.fiber += item.fiber_g || 0;
          totals.sugar += item.sugar_g || 0;
          totals.sodium += item.sodium_mg || 0;
          totals.fat_saturated += item.fat_saturated_g || 0;
          totals.potassium += item.potassium_mg || 0;
          totals.cholesterol += item.cholesterol_mg || 0;
        });
      }
    });

    // Round all values to 1 decimal
    Object.keys(totals).forEach(key => {
      totals[key] = Math.round(totals[key] * 10) / 10;
    });

    return totals;
  }

  /**
   * Calculate totals for a single meal's items
   */
  static calculateMealTotals(mealItems) {
    const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    if (!Array.isArray(mealItems)) return totals;

    mealItems.forEach(item => {
      totals.calories += item.calories || 0;
      totals.protein += item.protein_g || 0;
      totals.carbs += item.carbohydrates_total_g || 0;
      totals.fat += item.fat_total_g || 0;
    });

    Object.keys(totals).forEach(key => {
      totals[key] = Math.round(totals[key] * 10) / 10;
    });

    return totals;
  }

  /**
   * Get remaining macros vs goals
   */
  static getRemaining(totals, goals) {
    return {
      calories: Math.round(goals.calories - totals.calories),
      protein: Math.round(goals.protein - totals.protein),
      carbs: Math.round(goals.carbs - totals.carbs),
      fat: Math.round(goals.fat - totals.fat),
    };
  }

  /**
   * Get macro percentages (of total calories)
   */
  static getMacroPercentages(totals) {
    const totalCals = (totals.protein * 4) + (totals.carbs * 4) + (totals.fat * 9);
    if (totalCals === 0) return { protein: 0, carbs: 0, fat: 0 };
    return {
      protein: Math.round((totals.protein * 4 / totalCals) * 100),
      carbs: Math.round((totals.carbs * 4 / totalCals) * 100),
      fat: Math.round((totals.fat * 9 / totalCals) * 100),
    };
  }

  /**
   * Get the count of total items logged in a day
   */
  static getDayItemCount(foodLog) {
    let count = 0;
    Object.values(foodLog).forEach(mealItems => {
      if (Array.isArray(mealItems)) count += mealItems.length;
    });
    return count;
  }

  /**
   * Format a number with commas
   */
  static formatNumber(n) {
    return Math.round(n).toLocaleString();
  }
}
