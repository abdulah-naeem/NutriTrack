// ============================================
// NutriTrack — Goals Calculation Service
// BMR, TDEE, macro targets, activity estimator
// Uses the Mifflin-St Jeor equation
// ============================================

export class GoalsService {
  /**
   * Calculate Basal Metabolic Rate (Mifflin-St Jeor)
   * @param {Object} profile - { weight (kg), height (cm), age, gender }
   */
  static calculateBMR(profile) {
    const { weight, height, age, gender } = profile;
    if (gender === 'female') {
      return (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }
    // male or default
    return (10 * weight) + (6.25 * height) - (5 * age) + 5;
  }

  /**
   * Activity level definitions with detailed descriptions
   */
  static ACTIVITY_LEVELS = {
    sedentary: {
      label: 'Sedentary',
      description: 'Desk job, little to no exercise. Under 5,000 steps/day.',
      multiplier: 1.2,
    },
    light: {
      label: 'Lightly Active',
      description: 'Light walks or exercise 1–3 days/week. 5,000–7,500 steps/day.',
      multiplier: 1.375,
    },
    moderate: {
      label: 'Moderately Active',
      description: 'Moderate gym or sports 3–5 days/week. 7,500–10,000 steps/day.',
      multiplier: 1.55,
    },
    active: {
      label: 'Very Active',
      description: 'Hard training 6–7 days/week, or active job + regular gym.',
      multiplier: 1.725,
    },
    veryActive: {
      label: 'Athlete / Extremely Active',
      description: 'Intense training 2×/day, physical labor job, or competitive sports.',
      multiplier: 1.9,
    },
  };

  /**
   * Calculate Total Daily Energy Expenditure
   */
  static calculateTDEE(profile) {
    const bmr = this.calculateBMR(profile);
    const level = this.ACTIVITY_LEVELS[profile.activityLevel] || this.ACTIVITY_LEVELS.moderate;
    return Math.round(bmr * level.multiplier);
  }

  /**
   * Get recommended calorie target based on goal type
   */
  static getRecommendedCalories(profile) {
    const tdee = this.calculateTDEE(profile);
    switch (profile.goalType) {
      case 'lose':     return Math.round(tdee - 500);
      case 'gain':     return Math.round(tdee + 500);
      case 'maintain':
      default:         return tdee;
    }
  }

  /**
   * Get full calorie breakdown: maintenance, cut, and bulk
   * Returns all three values plus which one is active
   */
  static getCalorieBreakdown(profile) {
    const tdee = this.calculateTDEE(profile);
    const bmr = this.calculateBMR(profile);
    return {
      bmr: Math.round(bmr),
      maintenance: tdee,
      cut: Math.round(tdee - 500),
      aggressiveCut: Math.round(tdee - 750),
      bulk: Math.round(tdee + 500),
      leanBulk: Math.round(tdee + 250),
      activeGoal: profile.goalType || 'maintain',
    };
  }

  /**
   * Calculate macro targets (grams) from calorie target
   * Default split: 30% protein, 40% carbs, 30% fat
   */
  static calculateMacros(calories, split = { protein: 30, carbs: 40, fat: 30 }) {
    return {
      protein: Math.round((calories * split.protein / 100) / 4),
      carbs:   Math.round((calories * split.carbs / 100) / 4),
      fat:     Math.round((calories * split.fat / 100) / 9),
    };
  }

  /**
   * Generate full goal recommendation from profile
   */
  static generateGoals(profile) {
    const calories = this.getRecommendedCalories(profile);
    const macros = this.calculateMacros(calories);
    return {
      calories,
      ...macros,
    };
  }

  // ── Activity Level Auto-Calculator ────

  /**
   * Estimate activity level from lifestyle questionnaire answers.
   *
   * @param {Object} answers
   *   - jobType: 'desk' | 'standing' | 'physical'
   *   - stepsPerDay: number (average)
   *   - walkingDays: 1–7 (how many days per week)
   *   - gymPerWeek: 0–7 (sessions)
   *   - gymDuration: minutes per session
   *   - sports: 'none' | 'casual' | 'regular' | 'intense'
   *
   * @returns {{ level: string, multiplier: number, label: string }}
   */
  static calculateActivityLevel(answers) {
    const {
      jobType = 'desk',
      stepsPerDay = 5000,
      walkingDays = 5,
      gymPerWeek = 0,
      gymDuration = 0,
      sports = 'none',
    } = answers;

    // 1. Base score from job type
    const jobScores = { desk: 1.15, standing: 1.35, physical: 1.55 };
    let score = jobScores[jobType] || 1.15;

    // 2. Steps contribution (scaled by how many days per week)
    const stepsFactor = Math.min(stepsPerDay / 10000, 1.5); // cap at 15k
    const daysFactor = walkingDays / 7;
    score += stepsFactor * daysFactor * 0.15;

    // 3. Gym contribution
    if (gymPerWeek > 0 && gymDuration > 0) {
      const gymIntensity = Math.min(gymDuration, 120) / 60; // cap at 2hrs
      const gymFrequency = Math.min(gymPerWeek, 7) / 7;
      score += gymFrequency * gymIntensity * 0.25;
    }

    // 4. Sports contribution
    const sportsScores = { none: 0, casual: 0.05, regular: 0.12, intense: 0.22 };
    score += sportsScores[sports] || 0;

    // Map score to activity level
    if (score < 1.3)  return { level: 'sedentary',  ...this.ACTIVITY_LEVELS.sedentary };
    if (score < 1.45) return { level: 'light',      ...this.ACTIVITY_LEVELS.light };
    if (score < 1.65) return { level: 'moderate',   ...this.ACTIVITY_LEVELS.moderate };
    if (score < 1.82) return { level: 'active',     ...this.ACTIVITY_LEVELS.active };
    return { level: 'veryActive', ...this.ACTIVITY_LEVELS.veryActive };
  }
}
