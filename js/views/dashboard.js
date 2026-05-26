// ============================================
// NutriTrack — Dashboard View
// Daily overview: calorie ring, macros,
// meal timeline, water tracker, AI suggestion
// ============================================

import { MEAL_TYPES } from '../services/storage.js';
import { NutritionService } from '../services/nutrition.js';
import { DatabaseService } from '../services/database.js';
import { APIClient } from '../api/client.js';

export class DashboardView {
  static render(foodLog, goals, waterData, sleepData, streak, aiSuggestion, currentDate) {
    const totals = NutritionService.calculateDayTotals(foodLog);
    const remaining = NutritionService.getRemaining(totals, goals);
    const itemCount = NutritionService.getDayItemCount(foodLog);
    const calPercent = goals.calories > 0 ? Math.min((totals.calories / goals.calories) * 100, 100) : 0;

    const qVal = {'poor':1, 'fair':2, 'good':3, 'excellent':4}[sleepData?.quality] || 3;
    const hVal = sleepData?.hours || 0;
    
    let hScore = 0;
    if (hVal <= 7) hScore = (hVal / 7) * 60;
    else if (hVal <= 9) hScore = 60;
    else hScore = Math.max(0, 60 - (hVal - 9) * 10);

    const initialScore = hVal > 0 ? Math.round(hScore + (qVal * 10)) : '--';

    const parsedDate = parseDateString(currentDate);

    // SVG ring calculations
    const size = 200;
    const stroke = 14;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (calPercent / 100) * circumference;

    return `
      <div class="view-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-4); margin-bottom: var(--space-8);">
        <div>
          <h1>Dashboard</h1>
          <p class="date-display">${formatDate(parsedDate)}</p>
        </div>
        <div class="date-navigator glass-card" style="display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); border-radius: var(--radius-md);">
          <button id="prev-date-btn" class="btn-ghost btn-icon-sm" title="Previous Day" style="padding: var(--space-1); width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div style="position: relative; display: flex; align-items: center;">
            <button id="date-picker-trigger" class="btn-ghost" style="font-weight: 600; font-size: var(--font-sm); padding: var(--space-1) var(--space-2); display: flex; align-items: center; gap: var(--space-1); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); background: var(--bg-surface);">
              📅 <span id="current-date-text">${formatShortDate(parsedDate)}</span>
            </button>
            <input type="date" id="date-picker-input" value="${currentDate}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer;">
          </div>
          <button id="next-date-btn" class="btn-ghost btn-icon-sm" title="Next Day" style="padding: var(--space-1); width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
      </div>

      ${aiSuggestion ? `
        <div class="ai-suggestion">
          <div class="ai-suggestion-header">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4z"/><circle cx="12" cy="15" r="2"/></svg>
            AI Suggestion
          </div>
          <div class="ai-suggestion-text">${aiSuggestion.text}</div>
        </div>
      ` : ''}

      <div class="dashboard-grid">
        <!-- Calorie Ring -->
        <div class="glass-card calorie-ring-card">
          <div class="glass-card-title">Today's Calories</div>
          <div class="progress-ring" style="width:${size}px;height:${size}px">
            <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
              <defs>
                <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#f97316"/>
                  <stop offset="100%" style="stop-color:#ec4899"/>
                </linearGradient>
              </defs>
              <circle cx="${size / 2}" cy="${size / 2}" r="${radius}"
                fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="${stroke}"/>
              <circle class="progress-ring__circle"
                cx="${size / 2}" cy="${size / 2}" r="${radius}"
                fill="none" stroke="url(#ring-grad)" stroke-width="${stroke}"
                stroke-linecap="round"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${offset}"
                transform="rotate(-90 ${size / 2} ${size / 2})"
                style="transition: stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)"/>
            </svg>
            <div class="progress-ring__content">
              <span class="progress-ring__value">${Math.round(totals.calories)}</span>
              <span class="progress-ring__label">/ ${goals.calories} kcal</span>
            </div>
          </div>
          <div class="calorie-summary">
            <div class="calorie-stat eaten">
              <div class="stat-value">${Math.round(totals.calories)}</div>
              <div class="stat-label">Eaten</div>
            </div>
            <div class="calorie-stat remaining">
              <div class="stat-value">${Math.max(0, remaining.calories)}</div>
              <div class="stat-label">Remaining</div>
            </div>
            <div class="calorie-stat burned">
              <div class="stat-value">0</div>
              <div class="stat-label">Burned</div>
            </div>
          </div>
        </div>

        <!-- Macros -->
        <div class="glass-card">
          <div class="glass-card-title">Macronutrients</div>
          <div class="macro-bars">
            ${renderMacroBar('Protein', totals.protein, goals.protein, 'protein')}
            ${renderMacroBar('Carbs', totals.carbs, goals.carbs, 'carbs')}
            ${renderMacroBar('Fat', totals.fat, goals.fat, 'fat')}
          </div>
        </div>

        <!-- Detailed Nutrition -->
        <div class="glass-card">
          <div class="glass-card-title">Detailed Nutrition</div>
          <div class="detailed-nutrition-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); margin-top: var(--space-2);">
            <div class="macro-detail" style="display: flex; justify-content: space-between; font-size: var(--font-sm);">
              <span style="color: var(--text-secondary);">Fiber</span>
              <span style="font-weight: 600;">${totals.fiber}g</span>
            </div>
            <div class="macro-detail" style="display: flex; justify-content: space-between; font-size: var(--font-sm);">
              <span style="color: var(--text-secondary);">Sugar</span>
              <span style="font-weight: 600;">${totals.sugar}g</span>
            </div>
            <div class="macro-detail" style="display: flex; justify-content: space-between; font-size: var(--font-sm);">
              <span style="color: var(--text-secondary);">Sat Fat</span>
              <span style="font-weight: 600;">${totals.fat_saturated}g</span>
            </div>
            <div class="macro-detail" style="display: flex; justify-content: space-between; font-size: var(--font-sm);">
              <span style="color: var(--text-secondary);">Sodium</span>
              <span style="font-weight: 600;">${totals.sodium}mg</span>
            </div>
            <div class="macro-detail" style="display: flex; justify-content: space-between; font-size: var(--font-sm);">
              <span style="color: var(--text-secondary);">Potassium</span>
              <span style="font-weight: 600;">${totals.potassium}mg</span>
            </div>
            <div class="macro-detail" style="display: flex; justify-content: space-between; font-size: var(--font-sm);">
              <span style="color: var(--text-secondary);">Cholesterol</span>
              <span style="font-weight: 600;">${totals.cholesterol}mg</span>
            </div>
          </div>
        </div>

        <!-- Quick Stats -->
        <div class="glass-card span-2">
          <div class="glass-card-title">Quick Stats</div>
          <div class="quick-stats">
            <div class="quick-stat">
              <div class="stat-icon">🔥</div>
              <div class="stat-value">${streak}</div>
              <div class="stat-label">Day Streak</div>
            </div>
            <div class="quick-stat">
              <div class="stat-icon">🍽️</div>
              <div class="stat-value">${itemCount}</div>
              <div class="stat-label">Items Logged</div>
            </div>
            <div class="quick-stat">
              <div class="stat-icon">💧</div>
              <div class="stat-value">${waterData.glasses || 0}</div>
              <div class="stat-label">Glasses Water</div>
            </div>
          </div>
        </div>

        <!-- Water Tracker -->
        <div class="glass-card">
          <div class="glass-card-title">Water Tracker</div>
          <div class="water-tracker">
            <div class="water-glasses">
              ${renderWaterGlasses(waterData.glasses || 0, 8)}
            </div>
            <div class="water-info">
              <div class="water-count">${waterData.glasses || 0}/8</div>
              <div class="water-label">glasses today</div>
            </div>
          </div>
          <div class="water-btn-container">
            <button class="water-remove-btn" id="remove-water-btn">
              − Remove
            </button>
            <button class="water-add-btn" id="add-water-btn">
              + Add Glass
            </button>
          </div>
        </div>

        <!-- Sleep Tracker -->
        <div class="glass-card sleep-tracker-card" style="background: linear-gradient(145deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.7) 100%); position: relative; overflow: hidden;">
          <div style="position: absolute; top: -50px; right: -50px; width: 150px; height: 150px; background: radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(0,0,0,0) 70%); border-radius: 50%;"></div>
          <div class="glass-card-title" style="display: flex; align-items: center; gap: 8px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H2v-2h7a2 2 0 0 0 2-2v-14a2 2 0 0 0-2-2H2V4zm11 0h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7v-2h7a2 2 0 0 0 2-2v-14a2 2 0 0 0-2-2h-7V4z"/></svg>
            Sleep Tracker
          </div>
          <div style="display: flex; flex-direction: column; gap: var(--space-6); margin-top: var(--space-4);">
            
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
              <div style="display: flex; flex-direction: column; gap: var(--space-2);">
                <label for="sleep-hours" style="color: var(--text-secondary); font-size: var(--font-sm); text-transform: uppercase; letter-spacing: 1px;">Hours Slept</label>
                <div style="display: flex; align-items: baseline; gap: var(--space-2);">
                  <input type="number" id="sleep-hours" value="${sleepData?.hours || ''}" placeholder="0" step="0.5" min="0" max="24" class="form-input" style="width: 90px; height: 50px; font-size: 28px; font-weight: 700; text-align: center; border-radius: var(--radius-md); border: 2px solid var(--border-medium); background: rgba(0,0,0,0.2); color: var(--text-primary); transition: border-color 0.2s;">
                  <span style="color: var(--text-secondary); font-size: var(--font-md); font-weight: 500;">hrs</span>
                </div>
              </div>
              <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(99, 102, 241, 0.1); width: 80px; height: 80px; border-radius: 50%; border: 2px solid rgba(99, 102, 241, 0.3); box-shadow: 0 0 20px rgba(99, 102, 241, 0.2);">
                <div id="calculated-sleep-score" style="font-size: 28px; font-weight: 800; color: var(--accent-blue); text-shadow: 0 0 10px rgba(99,102,241,0.5);">${initialScore}</div>
                <div style="font-size: 10px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Score</div>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: var(--space-3);">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <label for="sleep-quality" style="margin: 0; color: var(--text-secondary); font-size: var(--font-sm); text-transform: uppercase; letter-spacing: 1px;">Sleep Quality</label>
                <span id="sleep-quality-label" style="font-size: var(--font-lg); font-weight: 700; color: var(--accent-blue); text-shadow: 0 0 10px rgba(99,102,241,0.3);">${sleepData?.quality ? sleepData.quality.charAt(0).toUpperCase() + sleepData.quality.slice(1) : 'Good'}</span>
              </div>
              <div style="position: relative; padding: 10px 0;">
                <input type="range" id="sleep-quality" min="1" max="4" step="1" value="${{'poor':1, 'fair':2, 'good':3, 'excellent':4}[sleepData?.quality] || 3}" class="styled-slider">
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 500; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">
                <span style="cursor: pointer;" onclick="document.getElementById('sleep-quality').value=1; document.getElementById('sleep-quality').dispatchEvent(new Event('input'))">Poor</span>
                <span style="cursor: pointer;" onclick="document.getElementById('sleep-quality').value=2; document.getElementById('sleep-quality').dispatchEvent(new Event('input'))">Fair</span>
                <span style="cursor: pointer;" onclick="document.getElementById('sleep-quality').value=3; document.getElementById('sleep-quality').dispatchEvent(new Event('input'))">Good</span>
                <span style="cursor: pointer;" onclick="document.getElementById('sleep-quality').value=4; document.getElementById('sleep-quality').dispatchEvent(new Event('input'))">Excellent</span>
              </div>
            </div>
            
            <button id="save-sleep-btn" class="btn btn-primary btn-block" style="padding: var(--space-3); font-weight: 600; font-size: var(--font-md); letter-spacing: 0.5px; margin-top: var(--space-2); background: linear-gradient(135deg, var(--accent-blue), #4f46e5); border: none; box-shadow: 0 4px 15px rgba(99,102,241,0.3);">Log Sleep</button>
          </div>
        </div>

        <!-- Today's Meals -->
        <div class="glass-card">
          <div class="glass-card-title">Today's Meals</div>
          <div class="meal-timeline stagger-in">
            ${Object.entries(MEAL_TYPES).map(([key, meta]) => {
              const items = foodLog[key] || [];
              const mealTotals = NutritionService.calculateMealTotals(items);
              return `
                <div class="meal-slot" data-meal="${key}">
                  <div class="meal-emoji">${meta.emoji}</div>
                  <div class="meal-info">
                    <div class="meal-name">${meta.label}</div>
                    <div class="meal-items">${items.length > 0 ? `${items.length} item${items.length > 1 ? 's' : ''}` : 'No items yet'}</div>
                  </div>
                  <div class="meal-calories">${items.length > 0 ? Math.round(mealTotals.calories) : '—'}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }

  static init(app) {
    // Water buttons
    document.getElementById('add-water-btn')?.addEventListener('click', () => {
      app.addWater();
    });

    document.getElementById('remove-water-btn')?.addEventListener('click', () => {
      app.removeWater();
    });

    // Sleep button and auto-evaluation
    const sleepHoursInput = document.getElementById('sleep-hours');
    const sleepQualitySlider = document.getElementById('sleep-quality');
    const sleepQualityLabel = document.getElementById('sleep-quality-label');
    const sleepMap = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Excellent' };

    const updateScoreDisplay = () => {
      const h = parseFloat(sleepHoursInput.value) || 0;
      const q = parseFloat(sleepQualitySlider.value) || 3;
      const scoreEl = document.getElementById('calculated-sleep-score');
      if (scoreEl) {
        if (h > 0) {
          let hScore = 0;
          if (h <= 7) hScore = (h / 7) * 60;
          else if (h <= 9) hScore = 60;
          else hScore = Math.max(0, 60 - (h - 9) * 10);

          scoreEl.textContent = Math.round(hScore + (q * 10));
        } else {
          scoreEl.textContent = '--';
        }
      }
    };

    sleepQualitySlider?.addEventListener('input', (e) => {
      if (sleepQualityLabel) sleepQualityLabel.textContent = sleepMap[e.target.value];
      updateScoreDisplay();
    });

    sleepHoursInput?.addEventListener('input', (e) => {
      const hours = parseFloat(e.target.value) || 0;
      let val = 3;
      if (hours > 0 && hours < 5) val = 1;
      else if (hours >= 5 && hours < 7) val = 2;
      else if (hours >= 7 && hours <= 8.5) val = 3;
      else if (hours > 8.5) val = 4;
      
      if (sleepQualitySlider) {
        sleepQualitySlider.value = val;
        if (sleepQualityLabel) sleepQualityLabel.textContent = sleepMap[val];
      }
      updateScoreDisplay();
    });

    document.getElementById('save-sleep-btn')?.addEventListener('click', () => {
      const hours = parseFloat(sleepHoursInput.value) || 0;
      const quality = sleepMap[sleepQualitySlider.value].toLowerCase();
      app.saveSleepEntry(hours, quality);
    });

    // Meal slot clicks → navigate to food log with that meal type
    document.querySelectorAll('.meal-slot').forEach(slot => {
      slot.addEventListener('click', () => {
        const mealType = slot.dataset.meal;
        app.navigateTo('food-log', { mealType });
      });
    });

    // Date switching
    const prevBtn = document.getElementById('prev-date-btn');
    const nextBtn = document.getElementById('next-date-btn');
    const dateInput = document.getElementById('date-picker-input');

    prevBtn?.addEventListener('click', () => {
      const prevDate = shiftDateString(dateInput.value, -1);
      app.setDate(prevDate);
    });

    nextBtn?.addEventListener('click', () => {
      const nextDate = shiftDateString(dateInput.value, 1);
      app.setDate(nextDate);
    });

    dateInput?.addEventListener('change', (e) => {
      app.setDate(e.target.value);
    });
  }
}

// ─── Helpers ──────────────────────────────

function renderMacroBar(label, current, goal, type) {
  const percent = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
  return `
    <div class="macro-bar ${type}">
      <div class="macro-bar-header">
        <span class="macro-bar-label"><span class="dot"></span>${label}</span>
        <span class="macro-bar-value">${Math.round(current)}g / ${goal}g</span>
      </div>
      <div class="macro-bar-track">
        <div class="macro-bar-fill" style="width: ${percent}%"></div>
      </div>
    </div>
  `;
}

function renderWaterGlasses(filled, total) {
  let html = '';
  for (let i = 0; i < total; i++) {
    html += `<div class="water-glass${i < filled ? ' filled' : ''}"></div>`;
  }
  return html;
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatShortDate(date) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function parseDateString(dateStr) {
  const parts = dateStr.split('-');
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function getLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftDateString(dateStr, days) {
  const d = parseDateString(dateStr);
  d.setDate(d.getDate() + days);
  return getLocalDateString(d);
}
