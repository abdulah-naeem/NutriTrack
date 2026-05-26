// ============================================
// NutriTrack — Profile & Settings View
// Personal info, goals, and account management
// ============================================

import { GoalsService } from '../services/goals.js';

export class ProfileView {
  static renderCalorieBreakdown(profile) {
    const breakdown = GoalsService.getCalorieBreakdown({
      weight: profile.weight || 70,
      height: profile.height || 170,
      age: profile.age || 25,
      gender: profile.gender || 'male',
      activityLevel: profile.activity_level || 'moderate',
      goalType: profile.goal_type || 'maintain',
    });

    const activeGoal = profile.goal_type || 'maintain';

    const rows = [
      { id: 'bmr', label: 'BMR (Basal Metabolic Rate)', val: breakdown.bmr, desc: 'Calories burned at complete rest (essential bodily functions).' },
      { id: 'maintain', label: 'Maintenance (TDEE)', val: breakdown.maintenance, desc: 'Calories needed to maintain current weight.', highlight: activeGoal === 'maintain' },
      { id: 'lose', label: 'Weight Loss (Cut)', val: breakdown.cut, desc: 'Healthy weight loss target (-500 kcal from TDEE).', highlight: activeGoal === 'lose' },
      { id: 'aggressiveCut', label: 'Aggressive Weight Loss', val: breakdown.aggressiveCut, desc: 'Accelerated weight loss target (-750 kcal from TDEE). Use with caution.' },
      { id: 'leanBulk', label: 'Lean Weight Gain', val: breakdown.leanBulk, desc: 'Slow, clean weight gain target (+250 kcal from TDEE).' },
      { id: 'gain', label: 'Weight Gain (Bulk)', val: breakdown.bulk, desc: 'Standard weight gain target (+500 kcal from TDEE).', highlight: activeGoal === 'gain' },
    ];

    return `
      <div class="calorie-breakdown-card glass-card" style="margin-top: var(--space-6);">
        <h2 style="margin-bottom: var(--space-2); display: flex; align-items: center; gap: var(--space-2);">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          Calorie Targets Breakdown
        </h2>
        <p style="color: var(--text-secondary); font-size: var(--font-sm); margin-bottom: var(--space-4);">
          Depending on your fitness objective, here is your target daily intake:
        </p>
        <div class="breakdown-rows" style="display: flex; flex-direction: column; gap: var(--space-3);">
          ${rows.map(r => `
            <div class="breakdown-row${r.highlight ? ' active-target-row' : ''}" style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-3) var(--space-4); border-radius: var(--radius-md); border: 1px solid ${r.highlight ? 'var(--accent-orange)' : 'var(--border-subtle)'}; background: ${r.highlight ? 'rgba(249, 115, 22, 0.05)' : 'var(--bg-glass)'};">
              <div style="flex: 1; padding-right: var(--space-4);">
                <div style="font-weight: 600; font-size: var(--font-base); display: flex; align-items: center; gap: var(--space-2); color: ${r.highlight ? 'var(--accent-orange)' : 'var(--text-primary)'};">
                  ${r.label}
                  ${r.highlight ? '<span class="active-badge" style="font-size: var(--font-xs); padding: 2px 6px; background: var(--accent-orange); color: white; border-radius: 4px; font-weight: 700;">ACTIVE GOAL</span>' : ''}
                </div>
                <div style="font-size: var(--font-xs); color: var(--text-secondary); margin-top: 2px;">${r.desc}</div>
              </div>
              <div style="font-size: var(--font-xl); font-weight: 800; color: ${r.highlight ? 'var(--accent-orange)' : 'var(--text-primary)'}; whitespace: nowrap;">
                ${r.val} <span style="font-size: var(--font-xs); font-weight: 500; color: var(--text-secondary);">kcal</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  static render(profile, goals) {
    const weightUnit = localStorage.getItem('nutritrack_weight_unit') || 'kg';
    const heightUnit = localStorage.getItem('nutritrack_height_unit') || 'cm';

    let displayWeight = profile.weight || 70;
    if (weightUnit === 'lbs') {
      displayWeight = Math.round(displayWeight * 2.20462 * 10) / 10;
    }

    let displayHeightCm = profile.height || 170;
    let displayHeightFt = 5;
    let displayHeightIn = 7;
    
    const totalInches = (profile.height || 170) / 2.54;
    displayHeightFt = Math.floor(totalInches / 12);
    displayHeightIn = Math.round(totalInches % 12);
    if (displayHeightIn === 12) {
      displayHeightFt++;
      displayHeightIn = 0;
    }

    return `
      <div class="profile-container">
        <div class="view-header">
          <h1>Profile & Settings</h1>
          <p>Manage your goals and personal info</p>
        </div>

        <!-- Personal Info -->
        <div class="profile-section glass-card">
          <h2>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Personal Info
          </h2>
          <form id="profile-form">
            <div class="form-group" style="margin-bottom: var(--space-4)">
              <label for="profile-name">Name</label>
              <input type="text" id="profile-name" class="form-input" value="${profile.name || ''}" placeholder="Your name">
            </div>
            <div class="form-row" style="margin-bottom: var(--space-4)">
              <div class="form-group">
                <label for="profile-age">Age</label>
                <input type="number" id="profile-age" class="form-input" value="${profile.age || 25}" min="10" max="120">
              </div>
              <div class="form-group">
                <label for="profile-gender">Gender</label>
                <select id="profile-gender" class="form-select">
                  <option value="male" ${profile.gender === 'male' ? 'selected' : ''}>Male</option>
                  <option value="female" ${profile.gender === 'female' ? 'selected' : ''}>Female</option>
                </select>
              </div>
            </div>
            
            <!-- Weight and Height Inputs with Segmented Unit Toggles -->
            <div class="form-row" style="margin-bottom: var(--space-4)">
              <div class="form-group">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                  <label for="profile-weight">Weight</label>
                  <div class="unit-toggle" id="weight-unit-toggle">
                    <button type="button" class="unit-btn ${weightUnit === 'kg' ? 'active' : ''}" data-unit="kg">kg</button>
                    <button type="button" class="unit-btn ${weightUnit === 'lbs' ? 'active' : ''}" data-unit="lbs">lbs</button>
                  </div>
                </div>
                <input type="number" id="profile-weight" class="form-input" value="${displayWeight}" min="1" max="2000" step="0.1">
              </div>
              <div class="form-group">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                  <label for="profile-height-cm">Height</label>
                  <div class="unit-toggle" id="height-unit-toggle">
                    <button type="button" class="unit-btn ${heightUnit === 'cm' ? 'active' : ''}" data-unit="cm">cm</button>
                    <button type="button" class="unit-btn ${heightUnit === 'ftin' ? 'active' : ''}" data-unit="ftin">ft/in</button>
                  </div>
                </div>
                
                <!-- Metric Container -->
                <div id="height-metric-container" class="${heightUnit === 'cm' ? '' : 'hidden'}">
                  <input type="number" id="profile-height-cm" class="form-input" value="${displayHeightCm}" min="50" max="300" step="0.1">
                </div>
                
                <!-- Imperial Container -->
                <div id="height-imperial-container" class="form-row ${heightUnit === 'ftin' ? '' : 'hidden'}" style="gap: var(--space-2); margin-top: 0;">
                  <div style="position: relative; flex: 1;">
                    <input type="number" id="profile-height-ft" class="form-input" value="${displayHeightFt}" placeholder="ft" min="1" max="10" style="padding-right: 28px;">
                    <span style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-size: var(--font-sm); color: var(--text-secondary); pointer-events: none;">ft</span>
                  </div>
                  <div style="position: relative; flex: 1;">
                    <input type="number" id="profile-height-in" class="form-input" value="${displayHeightIn}" placeholder="in" min="0" max="11" style="padding-right: 28px;">
                    <span style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-size: var(--font-sm); color: var(--text-secondary); pointer-events: none;">in</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="form-row" style="margin-bottom: var(--space-4)">
              <div class="form-group">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <label for="profile-activity">Activity Level</label>
                  <button type="button" id="btn-auto-calc-activity" style="padding: 0; color: var(--accent-orange); font-size: var(--font-xs); text-decoration: underline; background: none; border: none; cursor: pointer;">
                    🪄 Auto-Calculate
                  </button>
                </div>
                <select id="profile-activity" class="form-select">
                  ${Object.entries(GoalsService.ACTIVITY_LEVELS).map(([key, val]) => `
                    <option value="${key}" ${profile.activity_level === key ? 'selected' : ''}>${val.label}</option>
                  `).join('')}
                </select>
                <div id="activity-level-desc" class="activity-desc-box" style="font-size: var(--font-xs); color: var(--text-secondary); margin-top: var(--space-2); min-height: 36px; padding: var(--space-2); background: rgba(255,255,255,0.02); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); line-height: 1.4;">
                  ${GoalsService.ACTIVITY_LEVELS[profile.activity_level || 'moderate']?.description || ''}
                </div>
              </div>
              <div class="form-group">
                <label for="profile-goal">Goal</label>
                <select id="profile-goal" class="form-select">
                  <option value="lose" ${profile.goal_type === 'lose' ? 'selected' : ''}>Lose Weight (−500 kcal)</option>
                  <option value="maintain" ${profile.goal_type === 'maintain' ? 'selected' : ''}>Maintain Weight</option>
                  <option value="gain" ${profile.goal_type === 'gain' ? 'selected' : ''}>Gain Weight (+500 kcal)</option>
                </select>
              </div>
            </div>
          </form>
        </div>

        <!-- Calculated Goals -->
        <div class="profile-section glass-card">
          <h2>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
            Daily Targets
          </h2>
          <p style="color: var(--text-secondary); font-size: var(--font-sm); margin-bottom: var(--space-4);">
            Auto-calculated from your profile using the Mifflin-St Jeor equation.
          </p>
          <div class="goals-preview" id="goals-preview">
            <div class="goal-chip calories">
              <div class="chip-value">${goals.calorie_goal || goals.calories || 2000}</div>
              <div class="chip-label">Calories</div>
            </div>
            <div class="goal-chip protein">
              <div class="chip-value">${goals.protein_goal || goals.protein || 150}g</div>
              <div class="chip-label">Protein</div>
            </div>
            <div class="goal-chip carbs">
              <div class="chip-value">${goals.carbs_goal || goals.carbs || 250}g</div>
              <div class="chip-label">Carbs</div>
            </div>
            <div class="goal-chip fat">
              <div class="chip-value">${goals.fat_goal || goals.fat || 65}g</div>
              <div class="chip-label">Fat</div>
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" id="recalculate-goals" style="margin-top: var(--space-4);">
            ↻ Recalculate from Profile
          </button>
        </div>

        <!-- Calorie Targets Breakdown -->
        <div id="calorie-breakdown-container">
          ${ProfileView.renderCalorieBreakdown(profile)}
        </div>

        <!-- Actions -->
        <div class="profile-actions" style="margin-top: var(--space-6);">
          <button class="btn btn-primary" id="save-profile">
            Save Changes
          </button>
          <button class="btn btn-danger" id="logout-btn">
            Sign Out
          </button>
        </div>
      </div>

      <!-- Activity level modal -->
      <div id="activity-calc-modal" class="modal-overlay hidden" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: var(--space-4);">
        <div class="modal-card glass-card" style="width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; animation: scaleIn 0.3s var(--ease-out);">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: var(--space-3); margin-bottom: var(--space-4);">
            <h3 style="font-size: var(--font-lg); font-weight: 700;">Activity Auto-Calculator</h3>
            <button type="button" id="close-activity-calc" class="btn-ghost" style="font-size: var(--font-xl); padding: 0; width: 24px; height: 24px; line-height: 1; border: none; background: none; color: inherit; cursor: pointer;">&times;</button>
          </div>
          <div class="modal-body" style="display: flex; flex-direction: column; gap: var(--space-4);">
            <p style="font-size: var(--font-sm); color: var(--text-secondary);">
              Answer these questions about your regular lifestyle to estimate your daily activity level.
            </p>
            
            <div class="form-group">
              <label for="calc-job" style="font-weight: 600;">Workday / Job Type</label>
              <select id="calc-job" class="form-select">
                <option value="desk">Desk Job (sitting most of the day, coder, writer)</option>
                <option value="standing">Standing (walking/standing most of the day, retail, teacher)</option>
                <option value="physical">Physical Labor (heavy lifting, active movement, builder, nurse)</option>
              </select>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="calc-steps" style="font-weight: 600;">Avg Steps / Day</label>
                <input type="number" id="calc-steps" class="form-input" value="6000" min="0" max="50000" step="500">
              </div>
              <div class="form-group">
                <label for="calc-walking-days" style="font-weight: 600;">Active Days / Week</label>
                <input type="number" id="calc-walking-days" class="form-input" value="5" min="0" max="7">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="calc-gym" style="font-weight: 600;">Gym / Workouts (days/wk)</label>
                <input type="number" id="calc-gym" class="form-input" value="3" min="0" max="7">
              </div>
              <div class="form-group">
                <label for="calc-gym-duration" style="font-weight: 600;">Mins / Workout</label>
                <input type="number" id="calc-gym-duration" class="form-input" value="45" min="0" max="240" step="5">
              </div>
            </div>

            <div class="form-group">
              <label for="calc-sports" style="font-weight: 600;">Sports & Outdoor Activities</label>
              <select id="calc-sports" class="form-select">
                <option value="none">None or very low intensity</option>
                <option value="casual">Casual (light swimming, weekend cycling, casual sports 1-2x/week)</option>
                <option value="regular">Regular (vigorous football, tennis, running 3-4x/week)</option>
                <option value="intense">Intense (competitive training, high-endurance sports daily)</option>
              </select>
            </div>

            <div style="display: flex; gap: var(--space-3); justify-content: flex-end; margin-top: var(--space-2);">
              <button type="button" class="btn btn-secondary" id="cancel-activity-calc">Cancel</button>
              <button type="button" class="btn btn-primary" id="apply-activity-calc">Apply Estimate</button>
            </div>
        </div>
      </div>
    </div>
    `;
  }


  static init(app) {
    const weightInput = document.getElementById('profile-weight');
    const heightMetricContainer = document.getElementById('height-metric-container');
    const heightImperialContainer = document.getElementById('height-imperial-container');

    // Handle weight unit toggle
    const weightToggles = document.querySelectorAll('#weight-unit-toggle .unit-btn');
    weightToggles.forEach(btn => {
      btn.addEventListener('click', () => {
        const unit = btn.dataset.unit;
        const currentUnit = localStorage.getItem('nutritrack_weight_unit') || 'kg';
        if (unit === currentUnit) return; // No change

        localStorage.setItem('nutritrack_weight_unit', unit);
        
        // Toggle active class
        weightToggles.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Convert current weight value
        const currentVal = parseFloat(weightInput.value) || 0;
        if (unit === 'lbs') {
          weightInput.value = (currentVal * 2.20462).toFixed(1);
        } else {
          weightInput.value = (currentVal / 2.20462).toFixed(1);
        }
      });
    });

    // Handle height unit toggle
    const heightToggles = document.querySelectorAll('#height-unit-toggle .unit-btn');
    heightToggles.forEach(btn => {
      btn.addEventListener('click', () => {
        const unit = btn.dataset.unit;
        const currentUnit = localStorage.getItem('nutritrack_height_unit') || 'cm';
        if (unit === currentUnit) return; // No change

        localStorage.setItem('nutritrack_height_unit', unit);
        
        // Toggle active class
        heightToggles.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (unit === 'ftin') {
          heightMetricContainer.classList.add('hidden');
          heightImperialContainer.classList.remove('hidden');

          // Convert current cm value to ft/in
          const cmVal = parseFloat(document.getElementById('profile-height-cm').value) || 170;
          const totalInches = cmVal / 2.54;
          let ft = Math.floor(totalInches / 12);
          let inch = Math.round(totalInches % 12);
          if (inch === 12) {
            ft++;
            inch = 0;
          }
          document.getElementById('profile-height-ft').value = ft;
          document.getElementById('profile-height-in').value = inch;
        } else {
          heightImperialContainer.classList.add('hidden');
          heightMetricContainer.classList.remove('hidden');

          // Convert current ft/in value to cm
          const ftVal = parseFloat(document.getElementById('profile-height-ft').value) || 5;
          const inVal = parseFloat(document.getElementById('profile-height-in').value) || 7;
          const cmVal = (ftVal * 12 + inVal) * 2.54;
          document.getElementById('profile-height-cm').value = cmVal.toFixed(1);
        }
      });
    });

    // Recalculate goals from profile
    document.getElementById('recalculate-goals')?.addEventListener('click', () => {
      const profileData = getFormData();
      const newGoals = GoalsService.generateGoals({
        weight: profileData.weight,
        height: profileData.height,
        age: profileData.age,
        gender: profileData.gender,
        activityLevel: profileData.activity_level,
        goalType: profileData.goal_type,
      });

      // Update preview
      const preview = document.getElementById('goals-preview');
      if (preview) {
        preview.querySelector('.calories .chip-value').textContent = newGoals.calories;
        preview.querySelector('.protein .chip-value').textContent = newGoals.protein + 'g';
        preview.querySelector('.carbs .chip-value').textContent = newGoals.carbs + 'g';
        preview.querySelector('.fat .chip-value').textContent = newGoals.fat + 'g';
      }

      // Update breakdown card
      const breakdownContainer = document.getElementById('calorie-breakdown-container');
      if (breakdownContainer) {
        breakdownContainer.innerHTML = ProfileView.renderCalorieBreakdown(profileData);
      }

      app.showToast('Goals recalculated!', 'success');
    });

    // Save profile
    document.getElementById('save-profile')?.addEventListener('click', async () => {
      const profileData = getFormData();
      const calculatedGoals = GoalsService.generateGoals({
        weight: profileData.weight,
        height: profileData.height,
        age: profileData.age,
        gender: profileData.gender,
        activityLevel: profileData.activity_level,
        goalType: profileData.goal_type,
      });

      await app.saveProfile({
        ...profileData,
        calorie_goal: calculatedGoals.calories,
        protein_goal: calculatedGoals.protein,
        carbs_goal: calculatedGoals.carbs,
        fat_goal: calculatedGoals.fat,
      });
    });

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', () => {
      app.logout();
    });

    // Update activity description box when selection changes
    const activitySelect = document.getElementById('profile-activity');
    activitySelect?.addEventListener('change', (e) => {
      const selected = e.target.value;
      const descEl = document.getElementById('activity-level-desc');
      if (descEl && GoalsService.ACTIVITY_LEVELS[selected]) {
        descEl.textContent = GoalsService.ACTIVITY_LEVELS[selected].description;
      }
    });

    // Activity level auto-calculator modal
    const openModalBtn = document.getElementById('btn-auto-calc-activity');
    const modalEl = document.getElementById('activity-calc-modal');
    const closeModalBtn = document.getElementById('close-activity-calc');
    const cancelModalBtn = document.getElementById('cancel-activity-calc');
    const applyModalBtn = document.getElementById('apply-activity-calc');

    const closeModal = () => modalEl?.classList.add('hidden');
    
    openModalBtn?.addEventListener('click', () => {
      modalEl?.classList.remove('hidden');
    });

    closeModalBtn?.addEventListener('click', closeModal);
    cancelModalBtn?.addEventListener('click', closeModal);

    applyModalBtn?.addEventListener('click', () => {
      const jobType = document.getElementById('calc-job')?.value || 'desk';
      const stepsPerDay = parseInt(document.getElementById('calc-steps')?.value) || 5000;
      const walkingDays = parseInt(document.getElementById('calc-walking-days')?.value) || 5;
      const gymPerWeek = parseInt(document.getElementById('calc-gym')?.value) || 0;
      const gymDuration = parseInt(document.getElementById('calc-gym-duration')?.value) || 0;
      const sports = document.getElementById('calc-sports')?.value || 'none';

      const result = GoalsService.calculateActivityLevel({
        jobType,
        stepsPerDay,
        walkingDays,
        gymPerWeek,
        gymDuration,
        sports
      });

      if (activitySelect) {
        activitySelect.value = result.level;
        activitySelect.dispatchEvent(new Event('change'));
      }

      closeModal();
      app.showToast(`Estimated: ${result.label}! Click "Recalculate" to update targets.`, 'success');
    });
  }
}

function getFormData() {
  const weightUnit = localStorage.getItem('nutritrack_weight_unit') || 'kg';
  const heightUnit = localStorage.getItem('nutritrack_height_unit') || 'cm';

  let weight = parseFloat(document.getElementById('profile-weight')?.value) || 70;
  if (weightUnit === 'lbs') {
    weight = weight / 2.20462;
  }

  let height = 170;
  if (heightUnit === 'cm') {
    height = parseFloat(document.getElementById('profile-height-cm')?.value) || 170;
  } else {
    const ftVal = parseFloat(document.getElementById('profile-height-ft')?.value) || 5;
    const inVal = parseFloat(document.getElementById('profile-height-in')?.value) || 7;
    height = (ftVal * 12 + inVal) * 2.54;
  }

  return {
    name: document.getElementById('profile-name')?.value || '',
    age: parseInt(document.getElementById('profile-age')?.value) || 25,
    gender: document.getElementById('profile-gender')?.value || 'male',
    weight: Math.round(weight * 10) / 10,
    height: Math.round(height * 10) / 10,
    activity_level: document.getElementById('profile-activity')?.value || 'moderate',
    goal_type: document.getElementById('profile-goal')?.value || 'maintain',
  };
}
