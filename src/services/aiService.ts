import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../config/logger.js';

const GEMINI_MODEL = 'gemini-2.5-flash-lite';

interface NutritionEstimate {
  name: string;
  calories: number;
  protein: number;
  fiber: number;
  vitamins: string;
}

async function callGemini(prompt: string): Promise<string> {
  if (!env.GEMINI_API_KEY) {
    throw new AppError(503, 'AI features not configured', 'AI_DISABLED');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, responseMimeType: 'application/json' },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    logger.warn({ status: response.status, errText: errText.slice(0, 300) }, 'Gemini API error');
    if (response.status === 429) {
      throw new AppError(429, 'AI quota exceeded. Try again later.');
    }
    throw new AppError(502, 'AI service unavailable');
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new AppError(502, 'AI returned empty response');
  return text.replace(/```json|```/g, '').trim();
}

export async function estimateNutrition(foodDescription: string): Promise<NutritionEstimate> {
  const prompt = `Estimate nutrition for: "${foodDescription}".
Return ONLY a JSON object with this exact shape, no markdown, no preamble:
{"name": "short food name", "calories": number, "protein": number, "fiber": number, "vitamins": "comma-separated key vitamins/minerals"}
Numbers are integers (grams for protein/fiber, kcal for calories).
Be realistic for typical Indian portion sizes.`;

  const text = await callGemini(prompt);
  try {
    const parsed = JSON.parse(text);
    return {
      name: String(parsed.name ?? foodDescription).slice(0, 200),
      calories: Math.max(0, Math.min(10000, Number(parsed.calories) || 0)),
      protein: Math.max(0, Math.min(500, Number(parsed.protein) || 0)),
      fiber: Math.max(0, Math.min(200, Number(parsed.fiber) || 0)),
      vitamins: String(parsed.vitamins ?? '').slice(0, 500),
    };
  } catch {
    throw new AppError(502, 'Could not parse AI response');
  }
}

export async function generateRecipes(existingNames: string[]): Promise<unknown[]> {
  const prompt = `Generate 3 unique HEALTHY Indian/global dish ideas different from these: ${existingNames.join(', ')}.
Return ONLY a JSON array, no markdown:
[{"name":"dish","desc":"brief 6-10 word description","calories":number,"protein":number,"fiber":number,"vitamins":"key vitamins","tags":["meal-type","characteristic"]}]
Be diverse: mix breakfast/lunch/dinner/snacks. Realistic portions.`;

  const text = await callGemini(prompt);
  try {
    const arr = JSON.parse(text);
    if (!Array.isArray(arr)) throw new Error('not array');
    return arr;
  } catch {
    throw new AppError(502, 'Could not parse AI response');
  }
}
