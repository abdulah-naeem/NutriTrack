// ============================================
// NutriTrack — Multi-Source Nutrition API
// Vercel Serverless Function
//
// Queries CalorieNinjas, USDA, and AI Estimator
// in parallel, then averages/picks the best result.
// Supports complex NLP and local international foods.
// ============================================

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { query } = req.query;
  if (!query || query.trim().length === 0) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  try {
    // Query all available APIs (including the AI Estimator for NLP/Pakistani foods) in parallel
    const results = await Promise.allSettled([
      queryCalorieNinjas(query),
      queryUSDA(query),
      queryAI(query),
    ]);

    const sources = [];
    const allItems = [];

    results.forEach((result, i) => {
      const sourceName = ['CalorieNinjas', 'USDA', 'AI Estimator'][i];
      if (result.status === 'fulfilled' && result.value.length > 0) {
        sources.push(sourceName);
        allItems.push({ source: sourceName, items: result.value });
      }
    });

    if (allItems.length === 0) {
      return res.status(200).json({ items: [], sources: [], message: 'No results found' });
    }

    // Aggregate results — merge items by name similarity, average the values
    const aggregated = aggregateResults(allItems, query);

    return res.status(200).json({
      items: aggregated,
      sources,
      query: query.trim(),
    });
  } catch (err) {
    console.error('Nutrition API error:', err);
    return res.status(500).json({ error: 'Failed to fetch nutrition data' });
  }
}

// ─── Heuristic for Drinkable/Beverage check ─
function isDrinkableHeuristic(name) {
  const lowercaseName = (name || '').toLowerCase();
  const drinkableKeywords = [
    'tea', 'coffee', 'doodh patti', 'chai', 'milk', 'juice', 'soda', 'water', 'coke', 'pepsi', 'sprite', 'drink',
    'smoothie', 'shake', 'lassi', 'beer', 'wine', 'alcohol', 'beverage', 'soup', 'broth', 'shake', 'green tea',
    'kahwa', 'tang', 'squash', 'milo'
  ];
  return drinkableKeywords.some(keyword => lowercaseName.includes(keyword));
}

// ─── CalorieNinjas ───────────────────────
async function queryCalorieNinjas(query) {
  const apiKey = process.env.CALORIENINJAS_API_KEY;
  if (!apiKey) return [];

  const response = await fetch(
    `https://api.calorieninjas.com/v1/nutrition?query=${encodeURIComponent(query)}`,
    { headers: { 'X-Api-Key': apiKey } }
  );

  if (!response.ok) return [];
  const data = await response.json();

  return (data.items || []).map(item => ({
    name: item.name || 'Unknown',
    calories: item.calories || 0,
    serving_size_g: item.serving_size_g || 100,
    is_drinkable: isDrinkableHeuristic(item.name),
    protein_g: item.protein_g || 0,
    carbohydrates_total_g: item.carbohydrates_total_g || 0,
    fat_total_g: item.fat_total_g || 0,
    fiber_g: item.fiber_g || 0,
    sugar_g: item.sugar_g || 0,
    sodium_mg: item.sodium_mg || 0,
    fat_saturated_g: item.fat_saturated_g || 0,
    potassium_mg: item.potassium_mg || 0,
    cholesterol_mg: item.cholesterol_mg || 0,
  }));
}

// ─── USDA FoodData Central ───────────────
async function queryUSDA(query) {
  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) return [];

  const response = await fetch(
    `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}&query=${encodeURIComponent(query)}&pageSize=5&dataType=Foundation,SR%20Legacy`,
  );

  if (!response.ok) return [];
  const data = await response.json();

  return (data.foods || []).slice(0, 5).map(food => {
    const nutrients = {};
    (food.foodNutrients || []).forEach(n => {
      // Map USDA nutrient IDs to our schema
      switch (n.nutrientId) {
        case 1008: nutrients.calories = n.value || 0; break;
        case 1003: nutrients.protein_g = n.value || 0; break;
        case 1005: nutrients.carbohydrates_total_g = n.value || 0; break;
        case 1004: nutrients.fat_total_g = n.value || 0; break;
        case 1079: nutrients.fiber_g = n.value || 0; break;
        case 2000: nutrients.sugar_g = n.value || 0; break;
        case 1093: nutrients.sodium_mg = n.value || 0; break;
        case 1258: nutrients.fat_saturated_g = n.value || 0; break;
        case 1092: nutrients.potassium_mg = n.value || 0; break;
        case 1253: nutrients.cholesterol_mg = n.value || 0; break;
      }
    });

    return {
      name: food.description?.toLowerCase() || 'unknown',
      serving_size_g: 100, // USDA is per 100g
      is_drinkable: isDrinkableHeuristic(food.description),
      ...nutrients,
    };
  });
}

// ─── AI Estimator (NLP / Pakistani Foods Fallback) ───
async function queryAI(query) {
  const groqApiKey = process.env.GROQ_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!groqApiKey && !geminiApiKey) return [];

  const prompt = `You are an expert nutrition database API. The user is searching for: "${query}".
Analyze the query. If it is in natural language (like "2 eggs and a glass of milk") or contains localized/Pakistani/Indian/other international foods (like "doodh patti", "roti", "biryani", "samosa", "nihari", "doodh soda"), estimate the nutritional contents accurately based on standard recipes.
Return a valid JSON array of food items found in the query.
For each food item, the JSON object MUST have these properties:
- "name": (string, e.g. "Doodh Patti", "Chicken Biryani", "Roti")
- "calories": (number, kcal per serving)
- "serving_size_g": (number, serving size in grams, e.g. 100 or 250)
- "is_drinkable": (boolean, true if it is a beverage/liquid like tea, milk, juice, water, false if edible food)
- "protein_g": (number, protein in grams per serving)
- "carbohydrates_total_g": (number, carbs in grams per serving)
- "fat_total_g": (number, fat in grams per serving)
- "fiber_g": (number, fiber in grams per serving)
- "sugar_g": (number, sugar in grams per serving)
- "sodium_mg": (number, sodium in milligrams per serving)

Special guidance for popular South Asian entries:
- "Doodh Patti": Standard recipe has milk, water, tea leaves, and sugar: 1 cup (200g/200ml) is approx 120 kcal, 4g protein, 15g carbs, 4.5g fat, 12g sugar. is_drinkable is true.
- "Roti / Chapati": Standard 1 whole wheat roti (approx 60g) is 120 kcal, 3.5g protein, 24g carbs, 0.4g fat.
- "Chicken Biryani": 1 plate (approx 350g) is 500 kcal, 22g protein, 70g carbs, 14g fat.

Return ONLY the raw JSON array. Do not wrap in markdown code blocks or add any other text.`;

  let text = null;

  // Try Groq first (extremely fast)
  if (groqApiKey) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: 'You are a nutrition API. You only output raw JSON arrays.' },
            { role: 'user', content: prompt },
          ],
          max_tokens: 800,
          temperature: 0.2,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        text = data.choices?.[0]?.message?.content?.trim();
      }
    } catch (e) {
      console.error('Groq AI nutrition search failed:', e);
    }
  }

  // Try Gemini if Groq failed or is not available
  if (!text && geminiApiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              maxOutputTokens: 800,
              temperature: 0.2,
              responseMimeType: "application/json"
            },
          }),
        }
      );
      if (response.ok) {
        const data = await response.json();
        text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      }
    } catch (e) {
      console.error('Gemini AI nutrition search failed:', e);
    }
  }

  if (!text) return [];

  try {
    let cleaned = text.trim();
    // Strip markdown code block wrappers if present
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '').trim();
    }
    
    let parsed = JSON.parse(cleaned);
    if (parsed && !Array.isArray(parsed)) {
      const arrayKey = Object.keys(parsed).find(k => Array.isArray(parsed[k]));
      if (arrayKey) {
        parsed = parsed[arrayKey];
      } else {
        parsed = [parsed];
      }
    }
    return parsed.map(item => ({
      name: item.name || 'Unknown',
      calories: item.calories || 0,
      serving_size_g: item.serving_size_g || 100,
      is_drinkable: item.is_drinkable !== undefined ? !!item.is_drinkable : isDrinkableHeuristic(item.name),
      protein_g: item.protein_g || 0,
      carbohydrates_total_g: item.carbohydrates_total_g || 0,
      fat_total_g: item.fat_total_g || 0,
      fiber_g: item.fiber_g || 0,
      sugar_g: item.sugar_g || 0,
      sodium_mg: item.sodium_mg || 0,
    }));
  } catch (err) {
    console.error('Failed to parse AI nutrition response:', err, 'Raw text:', text);
    return [];
  }
}

// ─── Aggregation Logic ──────────────────
function getRelevanceScore(name, query) {
  const normName = name.toLowerCase();
  const normQuery = query.toLowerCase().trim();

  // Exact match (highest priority)
  if (normName === normQuery) return 1000;

  // Starts with query
  if (normName.startsWith(normQuery)) return 500;

  // Contains exact query phrase
  if (normName.includes(normQuery)) return 200;

  // Count how many words of the query are present in the food name
  const queryWords = normQuery.split(/\s+/).filter(w => w.length > 1);
  if (queryWords.length === 0) return 0;
  
  let matchedWords = 0;
  queryWords.forEach(word => {
    if (normName.includes(word)) {
      matchedWords++;
    }
  });

  // Calculate percentage of query words matched
  const wordRatio = matchedWords / queryWords.length;
  if (wordRatio > 0) {
    return wordRatio * 100;
  }

  return 0;
}

function aggregateResults(allItems, query) {
  // Collect all unique food names (normalize)
  const foodMap = new Map();

  allItems.forEach(({ source, items }) => {
    items.forEach(item => {
      const key = normalizeItemName(item.name);
      if (!foodMap.has(key)) {
        foodMap.set(key, { name: item.name, sources: [], entries: [] });
      }
      foodMap.get(key).sources.push(source);
      foodMap.get(key).entries.push(item);
    });
  });

  // For each food, average the nutrition values across sources
  const aggregated = [];
  foodMap.forEach(({ name, sources, entries }) => {
    const averaged = averageNutrition(entries);
    const relevance = getRelevanceScore(name, query);
    aggregated.push({
      ...averaged,
      name,
      sources,
      source_count: sources.length,
      is_drinkable: entries.some(e => e.is_drinkable),
      relevance,
    });
  });

  // Sort by relevance (text matching similarity), then by number of sources (agreement)
  aggregated.sort((a, b) => {
    if (b.relevance !== a.relevance) {
      return b.relevance - a.relevance;
    }
    return b.source_count - a.source_count;
  });

  return aggregated;
}

function normalizeItemName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function averageNutrition(entries) {
  const fields = [
    'calories', 'protein_g', 'carbohydrates_total_g', 'fat_total_g',
    'fiber_g', 'sugar_g', 'sodium_mg', 'fat_saturated_g',
    'potassium_mg', 'cholesterol_mg', 'serving_size_g',
  ];

  const result = {};
  fields.forEach(field => {
    const values = entries.map(e => e[field] || 0).filter(v => v > 0);
    if (values.length > 0) {
      result[field] = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
    } else {
      result[field] = 0;
    }
  });

  return result;
}
