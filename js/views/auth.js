import { AuthService } from '../services/auth.js';
import { GoalsService } from '../services/goals.js';

export class AuthView {
  static render() {
    const weightUnit = localStorage.getItem('nutritrack_weight_unit') || 'kg';
    const heightUnit = localStorage.getItem('nutritrack_height_unit') || 'cm';

    return `
      <div class="auth-container">
        <div class="auth-card">
          <div class="auth-logo">
            <h1>🍎 NutriTrack</h1>
            <p>Track your meals. Crush your goals.</p>
          </div>

          <div class="auth-tabs">
            <button class="auth-tab active" data-tab="login" id="tab-login">Sign In</button>
            <button class="auth-tab" data-tab="signup" id="tab-signup">Sign Up</button>
          </div>

          <div id="auth-error" class="auth-error"></div>

          <!-- Login Form -->
          <form id="login-form" class="auth-form">
            <div class="form-group">
              <label for="login-email">Email</label>
              <input type="email" id="login-email" class="form-input" placeholder="you@example.com" required autocomplete="email">
            </div>
            <div class="form-group">
              <label for="login-password">Password</label>
              <input type="password" id="login-password" class="form-input" placeholder="••••••••" required autocomplete="current-password">
            </div>
            <button type="submit" class="btn btn-primary btn-block" id="login-submit">
              Sign In
            </button>
          </form>

          <!-- Signup Form (Expanded to Collect Personal Profile Info) -->
          <form id="signup-form" class="auth-form hidden">
            <div class="form-row">
              <div class="form-group">
                <label for="signup-name">Name</label>
                <input type="text" id="signup-name" class="form-input" placeholder="Your name" required autocomplete="name">
              </div>
              <div class="form-group">
                <label for="signup-age">Age</label>
                <input type="number" id="signup-age" class="form-input" value="22" min="10" max="120" required>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="signup-email">Email</label>
                <input type="email" id="signup-email" class="form-input" placeholder="you@example.com" required autocomplete="email">
              </div>
              <div class="form-group">
                <label for="signup-password">Password</label>
                <input type="password" id="signup-password" class="form-input" placeholder="Min 6 characters" required minlength="6" autocomplete="new-password">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="signup-gender">Gender</label>
                <select id="signup-gender" class="form-select" required>
                  <option value="male" selected>Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div class="form-group">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                  <label for="signup-weight">Weight</label>
                  <div class="unit-toggle" id="signup-weight-unit-toggle">
                    <button type="button" class="unit-btn ${weightUnit === 'kg' ? 'active' : ''}" data-unit="kg">kg</button>
                    <button type="button" class="unit-btn ${weightUnit === 'lbs' ? 'active' : ''}" data-unit="lbs">lbs</button>
                  </div>
                </div>
                <input type="number" id="signup-weight" class="form-input" value="70" min="10" max="500" step="0.1" required>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group" style="grid-column: span 2;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                  <label for="signup-height-cm">Height</label>
                  <div class="unit-toggle" id="signup-height-unit-toggle">
                    <button type="button" class="unit-btn ${heightUnit === 'cm' ? 'active' : ''}" data-unit="cm">cm</button>
                    <button type="button" class="unit-btn ${heightUnit === 'ftin' ? 'active' : ''}" data-unit="ftin">ft/in</button>
                  </div>
                </div>
                
                <!-- Metric Container -->
                <div id="signup-height-metric-container" class="${heightUnit === 'cm' ? '' : 'hidden'}">
                  <input type="number" id="signup-height-cm" class="form-input" value="170" min="50" max="300" step="0.1" required>
                </div>
                
                <!-- Imperial Container -->
                <div id="signup-height-imperial-container" class="form-row ${heightUnit === 'ftin' ? '' : 'hidden'}" style="gap: var(--space-2); margin-top: 0;">
                  <div style="position: relative; flex: 1;">
                    <input type="number" id="signup-height-ft" class="form-input" value="5" placeholder="ft" min="1" max="10" style="padding-right: 28px;">
                    <span style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-size: var(--font-sm); color: var(--text-secondary); pointer-events: none;">ft</span>
                  </div>
                  <div style="position: relative; flex: 1;">
                    <input type="number" id="signup-height-in" class="form-input" value="7" placeholder="in" min="0" max="11" style="padding-right: 28px;">
                    <span style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-size: var(--font-sm); color: var(--text-secondary); pointer-events: none;">in</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <label for="signup-activity">Activity Level</label>
                  <button type="button" id="btn-signup-auto-calc-activity" style="padding: 0; color: var(--accent-orange); font-size: var(--font-xs); text-decoration: underline; background: none; border: none; cursor: pointer;">
                    🪄 Auto-Calculate
                  </button>
                </div>
                <select id="signup-activity" class="form-select" required>
                  ${Object.entries(GoalsService.ACTIVITY_LEVELS).map(([key, val]) => `
                    <option value="${key}" ${key === 'moderate' ? 'selected' : ''}>${val.label}</option>
                  `).join('')}
                </select>
              </div>
              <div class="form-group">
                <label for="signup-goal">Goal</label>
                <select id="signup-goal" class="form-select" required>
                  <option value="lose">Lose Weight (−500 kcal)</option>
                  <option value="maintain" selected>Maintain Weight</option>
                  <option value="gain">Gain Weight (+500 kcal)</option>
                </select>
              </div>
            </div>

            <div id="signup-activity-level-desc" class="activity-desc-box" style="font-size: var(--font-xs); color: var(--text-secondary); min-height: 36px; padding: var(--space-2); background: rgba(255,255,255,0.02); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); line-height: 1.4;">
              ${GoalsService.ACTIVITY_LEVELS.moderate.description}
            </div>

            <button type="submit" class="btn btn-primary btn-block" id="signup-submit">
              Create Account
            </button>
          </form>


          <div class="auth-divider">or</div>

          <button class="btn btn-secondary btn-block" id="google-signin">
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>
        </div>

        <!-- Activity level auto-calculator modal -->
        <div id="signup-activity-calc-modal" class="modal-overlay hidden" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: var(--space-4);">
          <div class="modal-card glass-card" style="width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; animation: scaleIn 0.3s var(--ease-out); background: var(--bg-surface); padding: var(--space-6); border-radius: var(--radius-lg); border: 1px solid var(--border-medium);">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: var(--space-3); margin-bottom: var(--space-4);">
              <h3 style="font-size: var(--font-lg); font-weight: 700;">Activity Auto-Calculator</h3>
              <button type="button" id="signup-close-activity-calc" class="btn-ghost" style="font-size: var(--font-xl); padding: 0; width: 24px; height: 24px; line-height: 1; border: none; background: none; color: inherit; cursor: pointer;">&times;</button>
            </div>
            <div class="modal-body" style="display: flex; flex-direction: column; gap: var(--space-4);">
              <p style="font-size: var(--font-sm); color: var(--text-secondary);">
                Answer these questions about your regular lifestyle to estimate your daily activity level.
              </p>
              
              <div class="form-group">
                <label for="signup-calc-job" style="font-weight: 600;">Workday / Job Type</label>
                <select id="signup-calc-job" class="form-select">
                  <option value="desk">Desk Job (sitting most of the day, coder, writer)</option>
                  <option value="standing">Standing (walking/standing most of the day, retail, teacher)</option>
                  <option value="physical">Physical Labor (heavy lifting, active movement, builder, nurse)</option>
                </select>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="signup-calc-steps" style="font-weight: 600;">Avg Steps / Day</label>
                  <input type="number" id="signup-calc-steps" class="form-input" value="6000" min="0" max="50000" step="500">
                </div>
                <div class="form-group">
                  <label for="signup-calc-walking-days" style="font-weight: 600;">Active Days / Week</label>
                  <input type="number" id="signup-calc-walking-days" class="form-input" value="5" min="0" max="7">
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="signup-calc-gym" style="font-weight: 600;">Gym / Workouts (days/wk)</label>
                  <input type="number" id="signup-calc-gym" class="form-input" value="3" min="0" max="7">
                </div>
                <div class="form-group">
                  <label for="signup-calc-gym-duration" style="font-weight: 600;">Mins / Workout</label>
                  <input type="number" id="signup-calc-gym-duration" class="form-input" value="45" min="0" max="240" step="5">
                </div>
              </div>

              <div class="form-group">
                <label for="signup-calc-sports" style="font-weight: 600;">Sports & Outdoor Activities</label>
                <select id="signup-calc-sports" class="form-select">
                  <option value="none">None or very low intensity</option>
                  <option value="casual">Casual (light swimming, weekend cycling, casual sports 1-2x/week)</option>
                  <option value="regular">Regular (vigorous football, tennis, running 3-4x/week)</option>
                  <option value="intense">Intense (competitive training, high-endurance sports daily)</option>
                </select>
              </div>

              <div style="display: flex; gap: var(--space-3); justify-content: flex-end; margin-top: var(--space-2);">
                <button type="button" class="btn btn-secondary" id="signup-cancel-activity-calc">Cancel</button>
                <button type="button" class="btn btn-primary" id="signup-apply-activity-calc">Apply Estimate</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  static init() {
    const loginTab = document.getElementById('tab-login');
    const signupTab = document.getElementById('tab-signup');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const errorEl = document.getElementById('auth-error');

    // Tab switching
    loginTab?.addEventListener('click', () => {
      loginTab.classList.add('active');
      signupTab.classList.remove('active');
      loginForm.classList.remove('hidden');
      signupForm.classList.add('hidden');
      errorEl.classList.remove('visible');
    });

    signupTab?.addEventListener('click', () => {
      signupTab.classList.add('active');
      loginTab.classList.remove('active');
      signupForm.classList.remove('hidden');
      loginForm.classList.add('hidden');
      errorEl.classList.remove('visible');
    });

    // Login
    loginForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('login-submit');
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Signing in...';
      errorEl.classList.remove('visible');

      try {
        await AuthService.signIn(email, password);
        // Auth state change listener in app.js will handle redirect
      } catch (err) {
        showError(errorEl, err.message);
        btn.disabled = false;
        btn.textContent = 'Sign In';
      }
    });

    // Weight unit toggle
    const weightInput = document.getElementById('signup-weight');
    const weightToggles = document.querySelectorAll('#signup-weight-unit-toggle .unit-btn');
    weightToggles.forEach(btn => {
      btn.addEventListener('click', () => {
        const unit = btn.dataset.unit;
        const currentUnit = localStorage.getItem('nutritrack_weight_unit') || 'kg';
        if (unit === currentUnit) return;

        localStorage.setItem('nutritrack_weight_unit', unit);
        
        weightToggles.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const currentVal = parseFloat(weightInput.value) || 0;
        if (unit === 'lbs') {
          weightInput.value = (currentVal * 2.20462).toFixed(1);
        } else {
          weightInput.value = (currentVal / 2.20462).toFixed(1);
        }
      });
    });

    // Height unit toggle
    const heightMetricContainer = document.getElementById('signup-height-metric-container');
    const heightImperialContainer = document.getElementById('signup-height-imperial-container');
    const heightToggles = document.querySelectorAll('#signup-height-unit-toggle .unit-btn');
    heightToggles.forEach(btn => {
      btn.addEventListener('click', () => {
        const unit = btn.dataset.unit;
        const currentUnit = localStorage.getItem('nutritrack_height_unit') || 'cm';
        if (unit === currentUnit) return;

        localStorage.setItem('nutritrack_height_unit', unit);
        
        heightToggles.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (unit === 'ftin') {
          heightMetricContainer.classList.add('hidden');
          heightImperialContainer.classList.remove('hidden');

          const cmVal = parseFloat(document.getElementById('signup-height-cm').value) || 170;
          const totalInches = cmVal / 2.54;
          let ft = Math.floor(totalInches / 12);
          let inch = Math.round(totalInches % 12);
          if (inch === 12) {
            ft++;
            inch = 0;
          }
          document.getElementById('signup-height-ft').value = ft;
          document.getElementById('signup-height-in').value = inch;
        } else {
          heightImperialContainer.classList.add('hidden');
          heightMetricContainer.classList.remove('hidden');

          const ftVal = parseFloat(document.getElementById('signup-height-ft').value) || 5;
          const inVal = parseFloat(document.getElementById('signup-height-in').value) || 7;
          const cmVal = (ftVal * 12 + inVal) * 2.54;
          document.getElementById('signup-height-cm').value = cmVal.toFixed(1);
        }
      });
    });

    // Activity description block listener
    const activitySelect = document.getElementById('signup-activity');
    activitySelect?.addEventListener('change', (e) => {
      const selected = e.target.value;
      const descEl = document.getElementById('signup-activity-level-desc');
      if (descEl && GoalsService.ACTIVITY_LEVELS[selected]) {
        descEl.textContent = GoalsService.ACTIVITY_LEVELS[selected].description;
      }
    });

    // Activity auto-calculator modal
    const openModalBtn = document.getElementById('btn-signup-auto-calc-activity');
    const modalEl = document.getElementById('signup-activity-calc-modal');
    const closeModalBtn = document.getElementById('signup-close-activity-calc');
    const cancelModalBtn = document.getElementById('signup-cancel-activity-calc');
    const applyModalBtn = document.getElementById('signup-apply-activity-calc');

    const closeModal = () => modalEl?.classList.add('hidden');
    
    openModalBtn?.addEventListener('click', () => {
      modalEl?.classList.remove('hidden');
    });

    closeModalBtn?.addEventListener('click', closeModal);
    cancelModalBtn?.addEventListener('click', closeModal);

    applyModalBtn?.addEventListener('click', () => {
      const jobType = document.getElementById('signup-calc-job')?.value || 'desk';
      const stepsPerDay = parseInt(document.getElementById('signup-calc-steps')?.value) || 5000;
      const walkingDays = parseInt(document.getElementById('signup-calc-walking-days')?.value) || 5;
      const gymPerWeek = parseInt(document.getElementById('signup-calc-gym')?.value) || 0;
      const gymDuration = parseInt(document.getElementById('signup-calc-gym-duration')?.value) || 0;
      const sports = document.getElementById('signup-calc-sports')?.value || 'none';

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
    });

    // Signup submission
    signupForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('signup-submit');
      const name = document.getElementById('signup-name').value;
      const email = document.getElementById('signup-email').value;
      const password = document.getElementById('signup-password').value;
      const age = parseInt(document.getElementById('signup-age').value) || 22;
      const gender = document.getElementById('signup-gender').value || 'male';
      const activityLevel = document.getElementById('signup-activity').value || 'moderate';
      const goalType = document.getElementById('signup-goal').value || 'maintain';

      const weightUnit = localStorage.getItem('nutritrack_weight_unit') || 'kg';
      const heightUnit = localStorage.getItem('nutritrack_height_unit') || 'cm';

      let weight = parseFloat(document.getElementById('signup-weight').value) || 70;
      if (weightUnit === 'lbs') {
        weight = weight / 2.20462;
      }

      let height = 170;
      if (heightUnit === 'cm') {
        height = parseFloat(document.getElementById('signup-height-cm').value) || 170;
      } else {
        const ftVal = parseFloat(document.getElementById('signup-height-ft').value) || 5;
        const inVal = parseFloat(document.getElementById('signup-height-in').value) || 7;
        height = (ftVal * 12 + inVal) * 2.54;
      }

      weight = Math.round(weight * 10) / 10;
      height = Math.round(height * 10) / 10;

      // Calculate targets from form values
      const calculatedGoals = GoalsService.generateGoals({
        weight,
        height,
        age,
        gender,
        activityLevel,
        goalType,
      });

      const metadata = {
        name,
        age,
        weight,
        height,
        gender,
        activity_level: activityLevel,
        goal_type: goalType,
        calorie_goal: calculatedGoals.calories,
        protein_goal: calculatedGoals.protein,
        carbs_goal: calculatedGoals.carbs,
        fat_goal: calculatedGoals.fat,
        water_goal: 8,
      };

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Creating account...';
      errorEl.classList.remove('visible');

      try {
        const result = await AuthService.signUp(email, password, metadata);
        if (result && !result.session) {
          showSuccess(errorEl, 'Account created! Please check your email to verify your address before logging in.');
          btn.disabled = false;
          btn.textContent = 'Create Account';
        }
      } catch (err) {
        showError(errorEl, err.message);
        btn.disabled = false;
        btn.textContent = 'Create Account';
      }
    });

    // Google OAuth
    document.getElementById('google-signin')?.addEventListener('click', async () => {
      try {
        await AuthService.signInWithGoogle();
      } catch (err) {
        showError(errorEl, err.message);
      }
    });
  }
}

function showError(el, message) {
  if (el) {
    el.textContent = message;
    el.style.background = '';
    el.style.borderColor = '';
    el.style.color = '';
    el.classList.add('visible');
  }
}

function showSuccess(el, message) {
  if (el) {
    el.textContent = message;
    el.style.background = 'rgba(16, 185, 129, 0.1)';
    el.style.borderColor = 'rgba(16, 185, 129, 0.2)';
    el.style.color = '#a7f3d0';
    el.classList.add('visible');
  }
}
