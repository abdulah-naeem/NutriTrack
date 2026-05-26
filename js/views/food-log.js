// ============================================
// NutriTrack — Food Log View
// Search food, select meal, log entries
// ============================================

import { MEAL_TYPES } from '../services/storage.js';
import { NutritionService } from '../services/nutrition.js';
import { APIClient } from '../api/client.js';

let searchTimeout = null;
let activeMeal = 'breakfast';
let selectedFoodItem = null;
let editingEntryId = null;
let editingMealType = null;
let updatePortionPreview = null;

export class FoodLogView {
  static render(foodLog, currentDate, selectedMeal) {
    if (selectedMeal) {
      activeMeal = selectedMeal;
    }
    const parsedDate = parseDateString(currentDate);

    return `
      <div class="food-log-container">
        <div class="view-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-4); margin-bottom: var(--space-8);">
          <div>
            <h1>Food Log</h1>
            <p>Logging for <span style="color: var(--accent-orange); font-weight: 600;">${formatDate(parsedDate)}</span></p>
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

        <!-- Meal Tabs -->
        <div class="meal-tabs" id="meal-tabs">
          ${Object.entries(MEAL_TYPES).map(([key, meta]) => `
            <button class="meal-tab${key === activeMeal ? ' active' : ''}" data-meal="${key}">
              <span class="tab-emoji">${meta.emoji}</span>
              ${meta.label}
            </button>
          `).join('')}
        </div>

        <!-- Search -->
        <div class="search-container">
          <div class="search-input-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input type="text"
              id="food-search-input"
              class="search-input"
              placeholder="Search food... e.g. '2 eggs and toast'"
              autocomplete="off"
              spellcheck="false">
          </div>
          <div class="search-hint">💡 Use natural language: "200g grilled chicken breast" or "1 cup rice"</div>
        </div>

        <!-- Search Results -->
        <div id="search-results" class="search-results"></div>

        <!-- Logged Items for Active Meal -->
        <div id="logged-items-container">
          ${renderLoggedItems(foodLog)}
        </div>

        <!-- Portion Selection Modal -->
        <div id="portion-modal" class="modal-overlay hidden" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: var(--space-4);">
          <div class="modal-card glass-card" style="width: 100%; max-width: 420px; animation: scaleIn 0.3s var(--ease-out); background: var(--bg-surface); border: 1px solid var(--border-medium); border-radius: var(--radius-lg); padding: var(--space-6); box-shadow: var(--shadow-lg);">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: var(--space-3); margin-bottom: var(--space-4);">
              <h3 id="portion-food-name" style="font-size: var(--font-lg); font-weight: 700; color: var(--text-primary);">Food Name</h3>
              <button type="button" id="close-portion-modal" class="btn-ghost" style="font-size: var(--font-xl); padding: 0; width: 24px; height: 24px; line-height: 1; border: none; background: none; color: inherit; cursor: pointer;">&times;</button>
            </div>
            <div class="modal-body" style="display: flex; flex-direction: column; gap: var(--space-4);">
              <p style="font-size: var(--font-xs); color: var(--text-secondary);">
                Specify the portion size and unit to log.
              </p>
              
              <div class="form-row" style="margin-bottom: var(--space-2); display: grid; grid-template-columns: 2fr 1fr; gap: var(--space-3);">
                <div class="form-group">
                  <label for="portion-quantity">Quantity</label>
                  <input type="number" id="portion-quantity" class="form-input" value="100" min="0.1" step="any">
                </div>
                <div class="form-group">
                  <label for="portion-unit">Unit</label>
                  <select id="portion-unit" class="form-select" style="min-width: 90px;"></select>
                </div>
              </div>

              <!-- Live Macros Preview -->
              <div style="background: rgba(255,255,255,0.015); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3);">
                <div style="font-size: var(--font-xs); font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">Portion Nutrition</div>
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: var(--space-2);">
                  <span style="font-size: var(--font-sm); color: var(--text-secondary);">Calories</span>
                  <span style="font-size: var(--font-lg); font-weight: 800; color: var(--accent-orange);"><span id="portion-cals">0</span> kcal</span>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--space-2); text-align: center;">
                  <div style="background: rgba(99, 102, 241, 0.04); border-radius: var(--radius-sm); padding: var(--space-2); border: 1px solid rgba(99, 102, 241, 0.08);">
                    <div style="font-size: var(--font-xs); color: var(--text-secondary); margin-bottom: 2px;">Protein</div>
                    <div style="font-size: var(--font-sm); font-weight: 700; color: var(--accent-indigo);"><span id="portion-protein">0</span>g</div>
                  </div>
                  <div style="background: rgba(249, 115, 22, 0.04); border-radius: var(--radius-sm); padding: var(--space-2); border: 1px solid rgba(249, 115, 22, 0.08);">
                    <div style="font-size: var(--font-xs); color: var(--text-secondary); margin-bottom: 2px;">Carbs</div>
                    <div style="font-size: var(--font-sm); font-weight: 700; color: var(--accent-orange);"><span id="portion-carbs">0</span>g</div>
                  </div>
                  <div style="background: rgba(236, 72, 153, 0.04); border-radius: var(--radius-sm); padding: var(--space-2); border: 1px solid rgba(236, 72, 153, 0.08);">
                    <div style="font-size: var(--font-xs); color: var(--text-secondary); margin-bottom: 2px;">Fat</div>
                    <div style="font-size: var(--font-sm); font-weight: 700; color: var(--accent-pink);"><span id="portion-fat">0</span>g</div>
                  </div>
                </div>
              </div>
              
              <div style="display: flex; gap: var(--space-3); justify-content: flex-end; margin-top: var(--space-2);">
                <button type="button" class="btn btn-secondary" id="cancel-portion-modal">Cancel</button>
                <button type="button" class="btn btn-primary" id="confirm-portion-modal">Add to Log</button>
              </div>
            </div>
          </div>
        </div>

      </div>
    `;
  }

  static init(app) {
    const searchInput = document.getElementById('food-search-input');
    const resultsContainer = document.getElementById('search-results');

    const portionModal = document.getElementById('portion-modal');
    const closePortionModalBtn = document.getElementById('close-portion-modal');
    const cancelPortionModalBtn = document.getElementById('cancel-portion-modal');
    const confirmPortionModalBtn = document.getElementById('confirm-portion-modal');
    const portionQtyInput = document.getElementById('portion-quantity');
    const portionUnitSelect = document.getElementById('portion-unit');
    const portionCalsSpan = document.getElementById('portion-cals');
    const portionProteinSpan = document.getElementById('portion-protein');
    const portionCarbsSpan = document.getElementById('portion-carbs');
    const portionFatSpan = document.getElementById('portion-fat');

    updatePortionPreview = () => {
      if (!selectedFoodItem) return;
      const quantity = parseFloat(portionQtyInput.value) || 0;
      const unit = portionUnitSelect.value;

      // Convert quantity to baseline grams (assuming 1ml = 1g density)
      let grams = quantity;
      if (unit === 'lb') {
        grams = quantity * 453.592;
      } else if (unit === 'floz') {
        grams = quantity * 29.5735;
      }

      const baseServing = selectedFoodItem.serving_size_g || 100;
      const scale = baseServing > 0 ? grams / baseServing : 1;

      portionCalsSpan.textContent = Math.round(selectedFoodItem.calories * scale);
      portionProteinSpan.textContent = (Math.round(selectedFoodItem.protein_g * scale * 10) / 10).toFixed(1);
      portionCarbsSpan.textContent = (Math.round(selectedFoodItem.carbohydrates_total_g * scale * 10) / 10).toFixed(1);
      portionFatSpan.textContent = (Math.round(selectedFoodItem.fat_total_g * scale * 10) / 10).toFixed(1);
    };

    portionQtyInput?.addEventListener('input', updatePortionPreview);
    portionUnitSelect?.addEventListener('change', updatePortionPreview);

    const closePortionModal = () => {
      portionModal?.classList.add('hidden');
      selectedFoodItem = null;
      editingEntryId = null;
      editingMealType = null;
    };

    closePortionModalBtn?.addEventListener('click', closePortionModal);
    cancelPortionModalBtn?.addEventListener('click', closePortionModal);

    confirmPortionModalBtn?.addEventListener('click', () => {
      if (!selectedFoodItem) return;
      const quantity = parseFloat(portionQtyInput.value) || 0;
      if (quantity <= 0) {
        app.showToast('Please enter a valid quantity', 'error');
        return;
      }
      const unit = portionUnitSelect.value;

      // Convert quantity to baseline grams
      let grams = quantity;
      if (unit === 'lb') {
        grams = quantity * 453.592;
      } else if (unit === 'floz') {
        grams = quantity * 29.5735;
      }

      const baseServing = selectedFoodItem.serving_size_g || 100;
      const scale = baseServing > 0 ? grams / baseServing : 1;

      // Format decimals cleanly
      const formatVal = (v) => Math.round(v * 10) / 10;

      const finalItem = {
        ...selectedFoodItem,
        serving_size_g: Math.round(grams),
        calories: Math.round(selectedFoodItem.calories * scale),
        protein_g: formatVal(selectedFoodItem.protein_g * scale),
        carbohydrates_total_g: formatVal(selectedFoodItem.carbohydrates_total_g * scale),
        fat_total_g: formatVal(selectedFoodItem.fat_total_g * scale),
        fiber_g: formatVal((selectedFoodItem.fiber_g || 0) * scale),
        sugar_g: formatVal((selectedFoodItem.sugar_g || 0) * scale),
        sodium_mg: formatVal((selectedFoodItem.sodium_mg || 0) * scale),
        fat_saturated_g: formatVal((selectedFoodItem.fat_saturated_g || 0) * scale),
        potassium_mg: formatVal((selectedFoodItem.potassium_mg || 0) * scale),
        cholesterol_mg: formatVal((selectedFoodItem.cholesterol_mg || 0) * scale),
        name: `${selectedFoodItem.name} (${quantity} ${unit})`
      };

      if (editingEntryId) {
        app.updateFoodEntry(editingMealType, editingEntryId, finalItem);
      } else {
        app.addFoodEntry(activeMeal, finalItem);
      }
      
      // Clean up search
      if (searchInput) searchInput.value = '';
      if (resultsContainer) resultsContainer.innerHTML = '';
      closePortionModal();
    });

    // Debounced search
    searchInput?.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      const query = searchInput.value.trim();

      if (query.length < 2) {
        resultsContainer.innerHTML = '';
        return;
      }

      searchTimeout = setTimeout(async () => {
        resultsContainer.innerHTML = `
          <div class="search-loading">
            <div class="spinner-lg"></div>
            <div>Searching across multiple sources...</div>
          </div>
        `;

        try {
          const items = await APIClient.searchFood(query);

          if (items.length === 0) {
            resultsContainer.innerHTML = `
              <div class="search-loading" style="color: var(--text-muted)">
                No results found. Try a different query.
              </div>
            `;
            return;
          }

          let resultsHtml = '';
          if (items.length > 1) {
            resultsHtml += `
              <div class="search-batch-actions stagger-in" style="margin-bottom: var(--space-4); display: flex; justify-content: space-between; align-items: center; background: rgba(99, 102, 241, 0.05); padding: var(--space-3); border-radius: var(--radius-md); border: 1px solid rgba(99, 102, 241, 0.1);">
                <div style="font-size: var(--font-sm); color: var(--text-secondary);">Found ${items.length} distinct items.</div>
                <button id="add-all-search-btn" class="btn btn-primary" style="padding: var(--space-2) var(--space-4);">Log All Items</button>
              </div>
            `;
          }

          resultsHtml += items.map((item, i) => `
            <div class="food-result-card stagger-in" data-index="${i}" style="animation-delay: ${i * 0.05}s">
              <div class="food-icon">🍽️</div>
              <div class="food-info">
                <div class="food-name">${item.name}</div>
                <div class="food-serving">${item.serving_size_g}g serving${item.sources ? ` · ${item.sources.join(', ')}` : ''}</div>
                <div class="food-macros">
                  <span class="food-macro protein">P ${Math.round(item.protein_g)}g</span>
                  <span class="food-macro carbs">C ${Math.round(item.carbohydrates_total_g)}g</span>
                  <span class="food-macro fat">F ${Math.round(item.fat_total_g)}g</span>
                </div>
              </div>
              <div class="food-cals">
                <div class="cal-value">${Math.round(item.calories)}</div>
                <div class="cal-unit">kcal</div>
              </div>
            </div>
          `).join('');

          resultsContainer.innerHTML = resultsHtml;

          // Attach click handler for Add All
          document.getElementById('add-all-search-btn')?.addEventListener('click', async () => {
            const btn = document.getElementById('add-all-search-btn');
            btn.disabled = true;
            btn.textContent = 'Adding...';
            
            for (const item of items) {
              const formatVal = (v) => Math.round(v * 10) / 10;
              const finalItem = {
                ...item,
                name: `${item.name} (${item.serving_size_g} ${item.is_drinkable ? 'ml' : 'g'})`
              };
              await app.addFoodEntry(activeMeal, finalItem);
            }
            
            if (searchInput) searchInput.value = '';
            resultsContainer.innerHTML = '';
          });

          // Attach click handlers to results
          resultsContainer.querySelectorAll('.food-result-card').forEach((card, i) => {
            card.addEventListener('click', () => {
              selectedFoodItem = items[i];
              editingEntryId = null;
              editingMealType = null;
              
              // Set up modal elements
              document.getElementById('portion-food-name').textContent = selectedFoodItem.name;
              
              // Populate units select based on drinkable/edible
              const select = document.getElementById('portion-unit');
              if (selectedFoodItem.is_drinkable) {
                select.innerHTML = `
                  <option value="ml">ml</option>
                  <option value="floz">fl oz</option>
                `;
                select.value = 'ml';
                document.getElementById('portion-quantity').value = selectedFoodItem.serving_size_g || 250;
              } else {
                select.innerHTML = `
                  <option value="g">g</option>
                  <option value="lb">lb</option>
                `;
                select.value = 'g';
                document.getElementById('portion-quantity').value = selectedFoodItem.serving_size_g || 100;
              }
              
              // Update values
              updatePortionPreview();
              
              // Show modal
              portionModal?.classList.remove('hidden');
            });
          });
        } catch (err) {
          resultsContainer.innerHTML = `
            <div class="search-loading" style="color: var(--accent-red)">
              ${err.message}
            </div>
          `;
        }
      }, 500);
    });

    // Enter key to search immediately
    searchInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        clearTimeout(searchTimeout);
        searchInput.dispatchEvent(new Event('input'));
      }
    });

    // Meal tab switching
    document.getElementById('meal-tabs')?.addEventListener('click', (e) => {
      const tab = e.target.closest('.meal-tab');
      if (!tab) return;

      activeMeal = tab.dataset.meal;
      document.querySelectorAll('.meal-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Re-render logged items
      const container = document.getElementById('logged-items-container');
      if (container) {
        container.innerHTML = renderLoggedItems(app.currentFoodLog);
        attachDeleteHandlers(app);
        attachEditHandlers(app);
        attachDragAndDropHandlers(app);
      }
    });

    // Delete buttons
    attachDeleteHandlers(app);

    // Edit buttons/items
    attachEditHandlers(app);

    // Drag and drop
    attachDragAndDropHandlers(app);

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

  static getActiveMeal() {
    return activeMeal;
  }

  static setActiveMeal(meal) {
    activeMeal = meal;
  }
}

function attachDeleteHandlers(app) {
  document.querySelectorAll('.delete-food-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const entryId = btn.dataset.id;
      const mealType = btn.dataset.meal;
      app.deleteFoodEntry(mealType, entryId);
    });
  });
}

function attachDragAndDropHandlers(app) {
  const items = document.querySelectorAll('.logged-item');
  const lists = document.querySelectorAll('.logged-items');

  items.forEach(item => {
    item.addEventListener('dragstart', (e) => {
      e.stopPropagation();
      item.classList.add('dragging');
      e.dataTransfer.setData('text/plain', JSON.stringify({
        id: item.dataset.id,
        sourceMeal: item.dataset.meal
      }));
      e.dataTransfer.effectAllowed = 'move';
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      lists.forEach(list => list.classList.remove('drag-over'));
    });
  });

  lists.forEach(list => {
    list.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      list.classList.add('drag-over');
    });

    list.addEventListener('dragleave', () => {
      list.classList.remove('drag-over');
    });

    list.addEventListener('drop', async (e) => {
      e.preventDefault();
      list.classList.remove('drag-over');

      try {
        const rawData = e.dataTransfer.getData('text/plain');
        if (!rawData) return;
        const data = JSON.parse(rawData);
        if (!data || !data.id || !data.sourceMeal) return;

        const targetMeal = list.dataset.meal;
        const sourceMeal = data.sourceMeal;

        if (targetMeal === sourceMeal) return;

        // Find the item in current food log
        const sourceList = app.currentFoodLog[sourceMeal] || [];
        const foodItem = sourceList.find(i => String(i.id) === String(data.id));
        if (!foodItem) return;

        // Construct updated item with target meal_type
        const updatedItem = {
          ...foodItem,
          meal_type: targetMeal
        };

        // Optimistic UI update
        const draggedEl = document.querySelector(`.logged-item[data-id="${data.id}"]`);
        if (draggedEl) {
          draggedEl.dataset.meal = targetMeal;
          draggedEl.querySelectorAll('[data-meal]').forEach(el => el.dataset.meal = targetMeal);
          list.appendChild(draggedEl);
        }

        await app.updateFoodEntry(sourceMeal, data.id, updatedItem);
      } catch (err) {
        console.error('Drag and drop error:', err);
      }
    });
  });
}

function parseLoggedName(name, servingSizeG, isDrinkable) {
  const match = name.match(/^(.*?)\s*\((\d+(?:\.\d+)?)\s*([a-zA-Z/]+)\)$/);
  if (match) {
    return {
      baseName: match[1],
      quantity: parseFloat(match[2]),
      unit: match[3]
    };
  }
  return {
    baseName: name,
    quantity: servingSizeG || 100,
    unit: isDrinkable ? 'ml' : 'g'
  };
}

function attachEditHandlers(app) {
  document.querySelectorAll('.edit-food-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();

      const entryId = btn.dataset.id;
      const mealType = btn.dataset.meal;
      
      // Find the logged item in current food log
      const mealItems = app.currentFoodLog[mealType] || [];
      const item = mealItems.find(i => i.id === entryId);
      if (!item) return;

      // Mark that we are editing this entry
      editingEntryId = entryId;
      editingMealType = mealType;

      // Extract base name, quantity and unit
      const parsed = parseLoggedName(item.name, item.serving_size_g, item.is_drinkable);
      
      // Set baseline item for calculations: strip portion from name so it is not doubled
      selectedFoodItem = { ...item, name: parsed.baseName };

      // Pre-fill modal
      document.getElementById('portion-food-name').textContent = parsed.baseName;
      
      const select = document.getElementById('portion-unit');
      if (item.is_drinkable) {
        select.innerHTML = `
          <option value="ml">ml</option>
          <option value="floz">fl oz</option>
        `;
        select.value = parsed.unit || 'ml';
      } else {
        select.innerHTML = `
          <option value="g">g</option>
          <option value="lb">lb</option>
        `;
        select.value = parsed.unit || 'g';
      }
      
      document.getElementById('portion-quantity').value = parsed.quantity;
      
      // Update values preview
      if (typeof updatePortionPreview === 'function') {
        updatePortionPreview();
      }

      // Show modal
      const portionModal = document.getElementById('portion-modal');
      portionModal?.classList.remove('hidden');
    });
  });
}

function renderLoggedItems(foodLog) {
  if (!foodLog) return '';

  let html = '';
  Object.entries(MEAL_TYPES).forEach(([key, meta]) => {
    const items = foodLog[key] || [];
    const mealTotals = NutritionService.calculateMealTotals(items);

    html += `
      <div class="meal-section">
        <div class="meal-section-header">
          <div class="meal-section-title">
            <span class="meal-section-emoji">${meta.emoji}</span>
            ${meta.label}
          </div>
          ${items.length > 0 ? `<span class="meal-section-cals">${Math.round(mealTotals.calories)} kcal</span>` : ''}
        </div>
        <div class="logged-items" data-meal="${key}">
          ${items.length > 0 ? items.map(item => `
            <div class="logged-item" data-id="${item.id}" data-meal="${key}" draggable="true">
              <span class="logged-name">${item.name}</span>
              <div style="display: flex; align-items: center; gap: var(--space-2);">
                <span class="logged-cals" style="margin-right: var(--space-2);">${Math.round(item.calories)} kcal</span>
                <button class="edit-btn edit-food-btn" data-id="${item.id}" data-meal="${key}" title="Edit Portion">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                </button>
                <button class="delete-btn delete-food-btn" data-id="${item.id}" data-meal="${key}" title="Remove">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
            </div>
          `).join('') : `
            <div class="empty-meal">No items logged</div>
          `}
        </div>
      </div>
    `;
  });

  return html;
}

// ─── Date Helpers ──────────────────────────

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
