// ============================================
// NutriTrack — Storage Service
// Abstraction layer over localStorage
// ============================================

const KEYS = {
  PROFILE: 'nutritrack_profile',
  FOOD_LOG: 'nutritrack_food_log',
  GOALS: 'nutritrack_goals',
  API_KEYS: 'nutritrack_api_keys',
  WATER_LOG: 'nutritrack_water_log',
  SETUP_COMPLETE: 'nutritrack_setup_complete',
  CUSTOM_FOODS: 'nutritrack_custom_foods',
};

// Meal type definitions used across the app
const MEAL_TYPES = {
  breakfast:      { label: 'Breakfast',       icon: 'sunrise',   emoji: '🥣', time: '6:00 – 10:00 AM' },
  morningSnack:   { label: 'Morning Snack',   icon: 'apple',     emoji: '🍎', time: '10:00 – 12:00 PM' },
  lunch:          { label: 'Lunch',           icon: 'utensils',  emoji: '🥗', time: '12:00 – 2:00 PM' },
  afternoonSnack: { label: 'Afternoon Snack', icon: 'cookie',    emoji: '🥜', time: '2:00 – 5:00 PM' },
  dinner:         { label: 'Dinner',          icon: 'moon',      emoji: '🍛', time: '5:00 – 9:00 PM' },
  eveningSnack:   { label: 'Evening Snack',   icon: 'popcorn',   emoji: '🍿', time: '9:00 – 11:00 PM' },
  beverages:      { label: 'Beverages',       icon: 'cup-soda',  emoji: '🥤', time: 'All day' },
};

class StorageService {
  static get(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  static set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  static remove(key) {
    localStorage.removeItem(key);
  }

  // --- Profile ---
  static getProfile() {
    return this.get(KEYS.PROFILE) || {
      name: '',
      age: 25,
      weight: 70,
      height: 170,
      gender: 'male',
      activityLevel: 'moderate',
      goalType: 'maintain', // 'lose' | 'maintain' | 'gain'
    };
  }

  static setProfile(profile) {
    return this.set(KEYS.PROFILE, profile);
  }

  // --- Goals ---
  static getGoals() {
    return this.get(KEYS.GOALS) || {
      calories: 2000,
      protein: 150,
      carbs: 250,
      fat: 65,
    };
  }

  static setGoals(goals) {
    return this.set(KEYS.GOALS, goals);
  }

  // --- API Keys ---
  static getApiKeys() {
    return this.get(KEYS.API_KEYS) || {
      calorieNinjas: '',
    };
  }

  static setApiKeys(keys) {
    return this.set(KEYS.API_KEYS, keys);
  }

  // --- Food Log ---
  static _emptyDayLog() {
    const log = {};
    Object.keys(MEAL_TYPES).forEach(key => { log[key] = []; });
    return log;
  }

  static getTodayStr() {
    return new Date().toISOString().split('T')[0];
  }

  static getFoodLog(date) {
    const dateStr = date || this.getTodayStr();
    const allLogs = this.get(KEYS.FOOD_LOG) || {};
    return allLogs[dateStr] || this._emptyDayLog();
  }

  static setFoodLog(date, log) {
    const dateStr = date || this.getTodayStr();
    const allLogs = this.get(KEYS.FOOD_LOG) || {};
    allLogs[dateStr] = log;
    return this.set(KEYS.FOOD_LOG, allLogs);
  }

  static addFoodToMeal(mealType, foodItem, date) {
    const log = this.getFoodLog(date);
    if (log[mealType]) {
      foodItem.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      foodItem.loggedAt = new Date().toISOString();
      log[mealType].push(foodItem);
      this.setFoodLog(date, log);
    }
    return log;
  }

  static removeFoodFromMeal(mealType, foodId, date) {
    const log = this.getFoodLog(date);
    if (log[mealType]) {
      log[mealType] = log[mealType].filter(f => f.id !== foodId);
      this.setFoodLog(date, log);
    }
    return log;
  }

  // --- Water Log ---
  static getWaterLog(date) {
    const dateStr = date || this.getTodayStr();
    const allLogs = this.get(KEYS.WATER_LOG) || {};
    return allLogs[dateStr] || { glasses: 0, goal: 8 };
  }

  static addWater(amount, date) {
    const log = this.getWaterLog(date);
    log.glasses += amount;
    const dateStr = date || this.getTodayStr();
    const allLogs = this.get(KEYS.WATER_LOG) || {};
    allLogs[dateStr] = log;
    return this.set(KEYS.WATER_LOG, allLogs);
  }

  // --- Setup ---
  static isSetupComplete() {
    return this.get(KEYS.SETUP_COMPLETE) === true;
  }

  static setSetupComplete() {
    return this.set(KEYS.SETUP_COMPLETE, true);
  }

  // --- Utility ---
  static getAllFoodLogs() {
    return this.get(KEYS.FOOD_LOG) || {};
  }

  static getStreak() {
    const allLogs = this.getAllFoodLogs();
    const dates = Object.keys(allLogs).sort().reverse();
    let streak = 0;
    const today = new Date();

    for (let i = 0; i < dates.length; i++) {
      const expected = new Date(today);
      expected.setDate(expected.getDate() - i);
      const expectedStr = expected.toISOString().split('T')[0];

      if (dates.includes(expectedStr)) {
        // Check if the day has any logged items
        const dayLog = allLogs[expectedStr];
        const hasItems = Object.values(dayLog).some(arr => Array.isArray(arr) && arr.length > 0);
        if (hasItems) {
          streak++;
        } else {
          break;
        }
      } else {
        break;
      }
    }
    return streak;
  }

  static clearAll() {
    Object.values(KEYS).forEach(key => localStorage.removeItem(key));
  }

  static exportData() {
    const data = {};
    Object.entries(KEYS).forEach(([name, key]) => {
      data[name] = this.get(key);
    });
    return data;
  }
}

export { StorageService, KEYS, MEAL_TYPES };
