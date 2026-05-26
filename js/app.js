// ============================================
// NutriTrack — Main Application
// Router, state management, and initialization
// Supports DEMO MODE (localStorage) when
// Supabase is not configured.
// ============================================

import { isSupabaseConfigured } from './config.js';
import { NutritionService } from './services/nutrition.js';
import { MEAL_TYPES } from './services/storage.js';
import { AuthView } from './views/auth.js';
import { DashboardView } from './views/dashboard.js';
import { FoodLogView } from './views/food-log.js';
import { ProfileView } from './views/profile.js';

// Lazy-loaded services (only when Supabase is configured)
let AuthService = null;
let DatabaseService = null;
let APIClient = null;

class NutriTrackApp {
  constructor() {
    this.user = null;
    this.profile = null;
    this.currentView = 'dashboard';
    this.currentDate = new Date().toISOString().split('T')[0];
    this.currentFoodLog = this._emptyFoodLog();
    this.waterData = { glasses: 0 };
    this.sleepData = { hours: 0, quality: 'good' };
    this.streak = 0;
    this.aiSuggestion = null;
    this.demoMode = false;
    this.theme = localStorage.getItem('nutritrack_theme') || 'light';
    this.applyTheme();
  }

  applyTheme() {
    if (this.theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  toggleTheme() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('nutritrack_theme', this.theme);
    this.applyTheme();
    this.renderApp(); // Re-render to update the toggle button text
    this.showToast(`${this.theme === 'dark' ? 'Dark' : 'Light'} theme applied`, 'success');
  }

  _emptyFoodLog() {
    const log = {};
    Object.keys(MEAL_TYPES).forEach(key => { log[key] = []; });
    return log;
  }

  async init() {
    this.demoMode = !isSupabaseConfigured();

    if (this.demoMode) {
      console.log('%c🍎 NutriTrack running in DEMO MODE (localStorage)', 'color: #f97316; font-size: 14px;');
      this.user = { id: 'demo', email: 'demo@nutritrack.app', user_metadata: { name: 'Demo User' } };
      this.loadDemoData();
      this.renderApp();
      return;
    }

    // --- Live Mode (Supabase) ---
    try {
      const authModule = await import('./services/auth.js');
      const dbModule = await import('./services/database.js');
      const apiModule = await import('./api/client.js');
      AuthService = authModule.AuthService;
      DatabaseService = dbModule.DatabaseService;
      APIClient = apiModule.APIClient;
    } catch (err) {
      console.error('Failed to load services, falling back to demo mode:', err);
      this.demoMode = true;
      this.user = { id: 'demo', email: 'demo@nutritrack.app', user_metadata: { name: 'Demo User' } };
      this.loadDemoData();
      this.renderApp();
      return;
    }

    // Listen for auth state changes
    AuthService.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        this.user = session.user;
        await this.loadUserData();
        this.renderApp();
      } else if (event === 'SIGNED_OUT') {
        this.user = null;
        this.profile = null;
        this.renderAuth();
      }
    });

    // Check for existing session and verify with Supabase server
    try {
      const user = await AuthService.getUser();
      if (user) {
        this.user = user;
        await this.loadUserData();
        this.renderApp();
      } else {
        this.logout();
      }
    } catch (err) {
      console.error('Session check failed:', err);
      this.logout();
    }
  }

  // ── Demo Mode Data ────────────────────

  loadDemoData() {
    const stored = localStorage.getItem('nutritrack_demo_profile');
    this.profile = stored ? JSON.parse(stored) : {
      name: 'Demo User',
      age: 25, weight: 70, height: 170,
      gender: 'male', activity_level: 'moderate', goal_type: 'maintain',
      calorie_goal: 2000, protein_goal: 150, carbs_goal: 250, fat_goal: 65,
    };

    const date = this.currentDate;
    const foodLogStr = localStorage.getItem(`nutritrack_demo_food_${date}`);
    this.currentFoodLog = foodLogStr ? JSON.parse(foodLogStr) : this._emptyFoodLog();

    const waterStr = localStorage.getItem(`nutritrack_demo_water_${date}`);
    this.waterData = waterStr ? JSON.parse(waterStr) : { glasses: 0 };

    const sleepStr = localStorage.getItem(`nutritrack_demo_sleep_${date}`);
    this.sleepData = sleepStr ? JSON.parse(sleepStr) : { hours: 0, quality: 'good' };

    this.streak = parseInt(localStorage.getItem('nutritrack_demo_streak') || '0');
  }

  saveDemoData() {
    const date = this.currentDate;
    localStorage.setItem('nutritrack_demo_profile', JSON.stringify(this.profile));
    localStorage.setItem(`nutritrack_demo_food_${date}`, JSON.stringify(this.currentFoodLog));
    localStorage.setItem(`nutritrack_demo_water_${date}`, JSON.stringify(this.waterData));
    localStorage.setItem(`nutritrack_demo_sleep_${date}`, JSON.stringify(this.sleepData));
    localStorage.setItem('nutritrack_demo_streak', String(this.streak));
  }

  // ── Live Mode Data ────────────────────

  async loadUserData() {
    if (!this.user || this.demoMode) return;

    try {
      let profile = await DatabaseService.getProfile(this.user.id);

      // Client-side synchronization:
      // If the profile does not exist in the database, OR it exists but has default values
      // and we have user metadata from signup, sync them immediately to the profiles table.
      const meta = this.user.user_metadata || {};
      const hasMetadata = meta.age !== undefined || meta.weight !== undefined || meta.height !== undefined;
      
      if (!profile || (hasMetadata && (
        profile.age === 25 || 
        profile.weight === 70 || 
        profile.height === 170
      ))) {
        console.log('Syncing database profile with signup metadata...');
        const syncedProfile = {
          name: profile?.name || meta.name || '',
          age: meta.age !== undefined ? parseInt(meta.age) : (profile?.age || 25),
          weight: meta.weight !== undefined ? parseFloat(meta.weight) : (profile?.weight || 70),
          height: meta.height !== undefined ? parseFloat(meta.height) : (profile?.height || 170),
          gender: meta.gender || profile?.gender || 'male',
          activity_level: meta.activity_level || profile?.activity_level || 'moderate',
          goal_type: meta.goal_type || profile?.goal_type || 'maintain',
          calorie_goal: meta.calorie_goal !== undefined ? parseInt(meta.calorie_goal) : (profile?.calorie_goal || 2000),
          protein_goal: meta.protein_goal !== undefined ? parseInt(meta.protein_goal) : (profile?.protein_goal || 150),
          carbs_goal: meta.carbs_goal !== undefined ? parseInt(meta.carbs_goal) : (profile?.carbs_goal || 250),
          fat_goal: meta.fat_goal !== undefined ? parseInt(meta.fat_goal) : (profile?.fat_goal || 65),
          water_goal: meta.water_goal !== undefined ? parseInt(meta.water_goal) : (profile?.water_goal || 8)
        };
        profile = await DatabaseService.upsertProfile(this.user.id, syncedProfile);
      }

      const [foodLog, waterData, sleepData, streak] = await Promise.all([
        DatabaseService.getFoodLog(this.user.id, this.currentDate),
        DatabaseService.getWaterEntry(this.user.id, this.currentDate),
        DatabaseService.getSleepEntry(this.user.id, this.currentDate),
        DatabaseService.getStreak(this.user.id),
      ]);

      this.profile = profile;
      this.currentFoodLog = foodLog;
      this.waterData = waterData;
      this.sleepData = sleepData;
      this.streak = streak;

      // Fetch AI suggestion (non-blocking)
      this.fetchAISuggestion();
    } catch (err) {
      console.error('Failed to load user data:', err);
      
      // If error is due to deleted user or invalid JWT, redirect to login
      const isAuthError = err.status === 401 || err.status === 403 || 
                          err.message?.includes('JWT') || 
                          err.message?.includes('unauthorized');

      if (isAuthError) {
        this.showToast('Session invalid or user deleted. Logging out...', 'error');
        setTimeout(() => this.logout(), 2000);
      } else {
        this.showToast('Failed to load data. Using defaults.', 'error');
      }
    }
  }

  async fetchAISuggestion() {
    if (!APIClient) return;
    try {
      const totals = NutritionService.calculateDayTotals(this.currentFoodLog);
      const goals = this.getGoals();
      const remaining = NutritionService.getRemaining(totals, goals);

      if (remaining.calories > 0) {
        const result = await APIClient.getAISuggestion({ remaining });
        if (result?.suggestion) {
          this.aiSuggestion = result.suggestion;
          if (this.currentView === 'dashboard') {
            this.renderCurrentView();
          }
        }
      }
    } catch {
      // AI suggestions are optional
    }
  }

  getGoals() {
    return {
      calories: this.profile?.calorie_goal || 2000,
      protein: this.profile?.protein_goal || 150,
      carbs: this.profile?.carbs_goal || 250,
      fat: this.profile?.fat_goal || 65,
    };
  }

  // ── Rendering ─────────────────────────

  renderAuth() {
    const appEl = document.getElementById('app-root');
    appEl.innerHTML = AuthView.render();
    AuthView.init();
  }

  renderApp() {
    const appEl = document.getElementById('app-root');
    const userDisplay = this.demoMode
      ? { name: this.profile?.name || 'Demo User', email: 'demo@nutritrack.app', initials: 'D' }
      : (AuthService ? AuthService.getUserDisplay(this.user) : { name: 'User', email: '', initials: 'U' });

    appEl.innerHTML = `
      <div class="app-container">
        <!-- Sidebar (Desktop) -->
        <nav class="sidebar" id="sidebar">
          <div class="sidebar-logo">
            <div class="logo-icon">🍎</div>
            <h2>NutriTrack</h2>
          </div>
          <div class="sidebar-nav">
            <button class="nav-item${this.currentView === 'dashboard' ? ' active' : ''}" data-view="dashboard">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
              Dashboard
            </button>
            <button class="nav-item${this.currentView === 'food-log' ? ' active' : ''}" data-view="food-log">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a4 4 0 0 0-4 4c0 2 1 3.5 2 4.5"/><path d="M12 2a4 4 0 0 1 4 4c0 2-1 3.5-2 4.5"/><path d="M3 20h18"/><path d="M5 20v-6a7 7 0 0 1 14 0v6"/></svg>
              Food Log
            </button>
            <button class="nav-item${this.currentView === 'profile' ? ' active' : ''}" data-view="profile">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Profile
            </button>
          </div>
          <div class="sidebar-footer">
            <button class="nav-item theme-toggle" id="theme-toggle" style="margin-bottom: var(--space-4); justify-content: space-between; width: 100%;">
              <span style="display: flex; align-items: center; gap: var(--space-3);">
                ${this.theme === 'dark' 
                  ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>' 
                  : '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>'}
                Theme
              </span>
              <span style="font-size: var(--font-xs); color: var(--text-tertiary); text-transform: uppercase;">${this.theme === 'dark' ? 'Dark' : 'Light'}</span>
            </button>
            <div class="sidebar-user" id="sidebar-user">
              <div class="avatar">${userDisplay.initials}</div>
              <div class="user-info">
                <div class="user-name">${userDisplay.name}</div>
                <div class="user-email">${userDisplay.email}</div>
              </div>
            </div>
          </div>
        </nav>

        <!-- Main Content -->
        <main class="main-content" id="main-content">
          ${this.demoMode ? `
            <div class="ai-suggestion" style="margin-bottom: var(--space-6); border-color: rgba(249, 115, 22, 0.3); background: linear-gradient(135deg, rgba(249, 115, 22, 0.08), rgba(236, 72, 153, 0.08));">
              <div class="ai-suggestion-header" style="color: var(--accent-orange);">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><circle cx="12" cy="12" r="10"/></svg>
                Demo Mode
              </div>
              <div class="ai-suggestion-text">
                Supabase is not configured. Data is saved locally in your browser. 
                To enable cloud sync &amp; authentication, update <strong>js/config.js</strong> with your Supabase credentials.
                Food search requires running <code>vercel dev</code> or deploying to Vercel.
              </div>
            </div>
          ` : ''}
          <div id="view-container"></div>
        </main>

        <!-- Bottom Nav (Mobile) -->
        <nav class="bottom-nav">
          <div class="bottom-nav-items">
            <button class="bottom-nav-item${this.currentView === 'dashboard' ? ' active' : ''}" data-view="dashboard">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
              Home
            </button>
            <button class="bottom-nav-item${this.currentView === 'food-log' ? ' active' : ''}" data-view="food-log">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              Search
            </button>
            <button class="bottom-nav-item add-btn" data-view="food-log">
              <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            </button>
            <button class="bottom-nav-item${this.currentView === 'profile' ? ' active' : ''}" data-view="profile">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Profile
            </button>
          </div>
        </nav>
      </div>

      <!-- Toast Container -->
      <div class="toast-container" id="toast-container"></div>
    `;

    // Nav handlers
    document.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.navigateTo(btn.dataset.view);
      });
    });

    // Theme toggle
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      this.toggleTheme();
    });

    // Sidebar user click → profile
    document.getElementById('sidebar-user')?.addEventListener('click', () => {
      this.navigateTo('profile');
    });

    this.renderCurrentView();
  }

  renderCurrentView() {
    const container = document.getElementById('view-container');
    if (!container) return;

    const goals = this.getGoals();

    switch (this.currentView) {
      case 'dashboard':
        container.innerHTML = DashboardView.render(
          this.currentFoodLog, goals, this.waterData, this.sleepData, this.streak, this.aiSuggestion, this.currentDate
        );
        DashboardView.init(this);
        break;

      case 'food-log':
        container.innerHTML = FoodLogView.render(this.currentFoodLog, this.currentDate);
        FoodLogView.init(this);
        break;

      case 'profile':
        container.innerHTML = ProfileView.render(this.profile || {}, goals);
        ProfileView.init(this);
        break;
    }

    // Update active states
    document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(btn => {
      const isActive = btn.dataset.view === this.currentView;
      btn.classList.toggle('active', isActive);
    });
  }

  // ── Navigation ────────────────────────

  navigateTo(view, params = {}) {
    this.currentView = view;

    if (params.mealType) {
      FoodLogView.setActiveMeal(params.mealType);
    }

    this.renderCurrentView();

    // Scroll to top
    document.getElementById('main-content')?.scrollTo(0, 0);
  }

  // ── Actions ───────────────────────────

  async addFoodEntry(mealType, foodItem) {
    if (this.demoMode) {
      // Demo mode: store in localStorage
      const entry = {
        ...foodItem,
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        meal_type: mealType,
      };
      if (!this.currentFoodLog[mealType]) this.currentFoodLog[mealType] = [];
      this.currentFoodLog[mealType].push(entry);
      this.saveDemoData();
      this.renderCurrentView();
      this.showToast(`Added ${foodItem.name} to ${MEAL_TYPES[mealType]?.label || mealType}`, 'success');
      return;
    }

    if (!this.user) return;

    try {
      await DatabaseService.addFoodEntry(this.user.id, {
        ...foodItem,
        meal_type: mealType,
        date: this.currentDate,
      });

      this.currentFoodLog = await DatabaseService.getFoodLog(this.user.id, this.currentDate);
      this.renderCurrentView();
      this.showToast(`Added ${foodItem.name} to ${MEAL_TYPES[mealType]?.label || mealType}`, 'success');
    } catch (err) {
      console.error('Failed to add food:', err);
      this.showToast('Failed to add food entry', 'error');
    }
  }

  async deleteFoodEntry(mealType, entryId) {
    if (this.demoMode) {
      if (this.currentFoodLog[mealType]) {
        this.currentFoodLog[mealType] = this.currentFoodLog[mealType].filter(e => e.id !== entryId);
        this.saveDemoData();
        this.renderCurrentView();
        this.showToast('Item removed', 'info');
      }
      return;
    }

    if (!this.user) return;

    try {
      await DatabaseService.deleteFoodEntry(entryId);
      this.currentFoodLog = await DatabaseService.getFoodLog(this.user.id, this.currentDate);
      this.renderCurrentView();
      this.showToast('Item removed', 'info');
    } catch (err) {
      console.error('Failed to delete food:', err);
      this.showToast('Failed to remove item', 'error');
    }
  }

  async updateFoodEntry(mealType, entryId, updatedItem) {
    if (this.demoMode) {
      if (this.currentFoodLog[mealType]) {
        const item = this.currentFoodLog[mealType].find(e => e.id === entryId);
        if (item) {
          const newItem = { ...item, ...updatedItem };
          const targetMeal = updatedItem.meal_type || mealType;
          
          if (targetMeal !== mealType) {
            // Remove from source list
            this.currentFoodLog[mealType] = this.currentFoodLog[mealType].filter(e => e.id !== entryId);
            // Add to target list
            if (!this.currentFoodLog[targetMeal]) {
              this.currentFoodLog[targetMeal] = [];
            }
            this.currentFoodLog[targetMeal].push(newItem);
          } else {
            // Update in-place
            this.currentFoodLog[mealType] = this.currentFoodLog[mealType].map(e => 
              e.id === entryId ? newItem : e
            );
          }
          this.saveDemoData();
          this.renderCurrentView();
          this.showToast('Item updated', 'success');
        }
      }
      return;
    }

    if (!this.user) return;

    try {
      await DatabaseService.updateFoodEntry(entryId, updatedItem);
      this.currentFoodLog = await DatabaseService.getFoodLog(this.user.id, this.currentDate);
      this.renderCurrentView();
      this.showToast('Item updated', 'success');
    } catch (err) {
      console.error('Failed to update food:', err);
      this.showToast('Failed to update item', 'error');
    }
  }

  async addWater() {
    if (this.demoMode) {
      this.waterData.glasses = (this.waterData.glasses || 0) + 1;
      this.saveDemoData();
      this.renderCurrentView();
      this.showToast('💧 +1 glass of water!', 'success');
      return;
    }

    if (!this.user) return;

    try {
      const current = this.waterData.glasses || 0;
      this.waterData = await DatabaseService.upsertWater(this.user.id, this.currentDate, current + 1);
      this.renderCurrentView();
      this.showToast('💧 +1 glass of water!', 'success');
    } catch (err) {
      console.error('Failed to add water:', err);
      this.showToast('Failed to log water', 'error');
    }
  }

  async removeWater() {
    const current = this.waterData.glasses || 0;
    if (current <= 0) {
      this.showToast('Water count is already 0', 'warning');
      return;
    }

    if (this.demoMode) {
      this.waterData.glasses = current - 1;
      this.saveDemoData();
      this.renderCurrentView();
      this.showToast('💧 Removed 1 glass of water', 'info');
      return;
    }

    if (!this.user) return;

    try {
      this.waterData = await DatabaseService.upsertWater(this.user.id, this.currentDate, current - 1);
      this.renderCurrentView();
      this.showToast('💧 Removed 1 glass of water', 'info');
    } catch (err) {
      console.error('Failed to remove water:', err);
      this.showToast('Failed to remove water', 'error');
    }
  }

  async setDate(dateStr) {
    this.currentDate = dateStr;
    if (this.demoMode) {
      this.loadDemoData();
      this.renderCurrentView();
    } else {
      await this.loadDateData();
      this.renderCurrentView();
    }
  }

  async loadDateData() {
    if (this.demoMode) return;
    try {
      const [foodLog, waterData, sleepData] = await Promise.all([
        DatabaseService.getFoodLog(this.user.id, this.currentDate),
        DatabaseService.getWaterEntry(this.user.id, this.currentDate),
        DatabaseService.getSleepEntry(this.user.id, this.currentDate),
      ]);
      this.currentFoodLog = foodLog;
      this.waterData = waterData;
      this.sleepData = sleepData;
      this.aiSuggestion = null;
      this.fetchAISuggestion();
    } catch (err) {
      console.error('Failed to load date data:', err);
      this.showToast('Failed to load data for selected date', 'error');
    }
  }

  async saveProfile(profileData) {
    if (this.demoMode) {
      this.profile = { ...this.profile, ...profileData };
      this.saveDemoData();
      this.showToast('Profile saved!', 'success');
      return;
    }

    if (!this.user) return;

    try {
      this.profile = await DatabaseService.upsertProfile(this.user.id, profileData);
      this.showToast('Profile saved!', 'success');
      this.aiSuggestion = null;
      this.fetchAISuggestion();
    } catch (err) {
      console.error('Failed to save profile:', err);
      this.showToast('Failed to save profile', 'error');
    }
  }

  async saveSleepEntry(hours, quality) {
    if (this.demoMode) {
      this.sleepData = { hours, quality };
      this.saveDemoData();
      this.renderCurrentView();
      this.showToast('Sleep logged!', 'success');
      return;
    }

    if (!this.user) return;

    try {
      this.sleepData = await DatabaseService.upsertSleepEntry(this.user.id, this.currentDate, hours, quality);
      this.renderCurrentView();
      this.showToast('Sleep logged!', 'success');
    } catch (err) {
      console.error('Failed to save sleep:', err);
      this.showToast('Failed to log sleep', 'error');
    }
  }

  async logout() {
    if (this.demoMode) {
      this.showToast('Demo mode — no account to sign out from', 'info');
      return;
    }

    try {
      await AuthService.signOut();
    } catch (err) {
      console.warn('Backend signOut failed, logging out locally:', err);
    } finally {
      // Always clear local session and show login screen even if server request fails
      this.user = null;
      this.profile = null;
      this.renderAuth();
    }
  }

  // ── Toast Notifications ───────────────

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('exit');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// ── Bootstrap ─────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const app = new NutriTrackApp();
  app.init();
});
