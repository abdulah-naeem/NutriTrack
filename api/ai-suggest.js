// ============================================
// NutriTrack — AI Meal Suggestion
// Vercel Serverless Function
//
// Uses Groq (primary) or Gemini (fallback)
// to generate smart meal suggestions based
// on remaining macros and preferences.
// ============================================

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { remaining, mealType, preferences } = req.body || {};

  if (!remaining) {
    return res.status(400).json({ error: 'Remaining macros are required' });
  }

  const prompt = buildPrompt(remaining, mealType, preferences);

  try {
    // Try Groq first (faster), fall back to Gemini
    let suggestion = await queryGroq(prompt);
    if (!suggestion) {
      suggestion = await queryGemini(prompt);
    }

    if (!suggestion) {
      return res.status(200).json({
        suggestion: getDefaultSuggestion(remaining, mealType),
        source: 'default',
      });
    }

    return res.status(200).json({
      suggestion,
      source: suggestion._source || 'ai',
    });
  } catch (err) {
    console.error('AI suggestion error:', err);
    return res.status(200).json({
      suggestion: getDefaultSuggestion(remaining, mealType),
      source: 'default',
    });
  }
}

function buildPrompt(remaining, mealType, preferences) {
  const meal = mealType || 'next meal';
  const prefs = preferences ? `Dietary preferences: ${preferences}.` : '';

  return `You are a friendly nutritionist assistant. The user has the following remaining macro budget for today:
- Calories: ${remaining.calories} kcal
- Protein: ${remaining.protein}g
- Carbs: ${remaining.carbs}g
- Fat: ${remaining.fat}g

They need a suggestion for their ${meal}. ${prefs}

Give a brief, helpful suggestion (2-3 sentences) for what they could eat to stay within their remaining budget. Include 1-2 specific food ideas with approximate portions. Keep it conversational and encouraging. Do not use markdown formatting.`;
}

// ─── Groq API ────────────────────────────
async function queryGroq(prompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'You are a helpful nutritionist. Keep responses brief and practical.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    return text ? { text, _source: 'groq' } : null;
  } catch {
    return null;
  }
}

// ─── Gemini API ──────────────────────────
async function queryGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 200,
            temperature: 0.7,
          },
        }),
      }
    );

    if (!response.ok) return null;
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return text ? { text, _source: 'gemini' } : null;
  } catch {
    return null;
  }
}

// ─── Default Fallback ───────────────────
function getDefaultSuggestion(remaining, mealType) {
  const cals = remaining.calories;
  let text;

  if (cals <= 0) {
    text = "You've reached your calorie goal for today! If you're still hungry, try a glass of water or herbal tea.";
  } else if (cals < 200) {
    text = `You have about ${cals} kcal remaining. A light snack like a handful of almonds (23 pieces ≈ 160 kcal) or a small apple (≈ 95 kcal) would be perfect.`;
  } else if (cals < 500) {
    text = `With ${cals} kcal remaining, you could enjoy a Greek yogurt with berries (≈ 200 kcal) or a chicken salad wrap (≈ 350 kcal).`;
  } else {
    text = `You still have ${cals} kcal available. Consider a balanced meal like grilled chicken (150g) with rice (1 cup) and steamed vegetables for a filling, nutritious option.`;
  }

  return { text };
}
