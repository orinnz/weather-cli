import type { ForecastDaily, Units } from "./weather.js";
import type { CurrentWeather } from "./weather.js";
import { detectDateFromQuestion } from "./date-utils.js";

type CurrentDescriptionInput = {
  weatherCode: number;
  location: string;
  units: Units;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  cloudCover: number;
  visibility: number;
  pressure: number;
  runtime?: AiRuntimeOptions;
};

type ForecastDescriptionInput = {
  location: string;
  units: Units;
  daily: ForecastDaily;
  runtime?: AiRuntimeOptions;
};

type WeatherQuestionInput = {
  location: string;
  units: Units;
  question: string;
  requestedDate?: string;
  current: CurrentWeather;
  forecast: ForecastDaily;
  runtime?: AiRuntimeOptions;
};

type AiRuntimeOptions = {
  apiBaseUrl?: string;
  apiToken?: string;
};

type CurrentAiInsight = {
  condition: string;
  summary: string;
  recommendation: string;
  outfitTip: string;
  source: "ai" | "fallback";
};

type ForecastAiInsight = {
  dayDescriptions: string[];
  recommendation: string;
  source: "ai" | "fallback";
};

type WeatherQuestionInsight = {
  answer: string;
  targetDate: string | null;
  source: "ai" | "fallback";
};

const FALLBACK_DESCRIPTIONS: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snowfall",
  73: "Moderate snowfall",
  75: "Heavy snowfall",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail"
};

function getApiKey(): string | null {
  return process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? null;
}

function getModelName(): string {
  return process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
}

function fallbackDescription(code: number): string {
  return FALLBACK_DESCRIPTIONS[code] ?? "Unknown weather";
}

function extractJsonBlock(text: string): string | null {
  const firstBracket = text.indexOf("[");
  const firstBrace = text.indexOf("{");
  const start = [firstBracket, firstBrace].filter((v) => v >= 0).sort((a, b) => a - b)[0];

  if (start === undefined) {
    return null;
  }

  const lastBracket = text.lastIndexOf("]");
  const lastBrace = text.lastIndexOf("}");
  const end = Math.max(lastBracket, lastBrace);

  if (end < start) {
    return null;
  }

  return text.slice(start, end + 1);
}

function sanitizeDescription(text: string): string {
  return text.replace(/[\r\n]+/g, " ").trim().replace(/^"|"$/g, "");
}

function sanitizeLine(text: string, fallback: string): string {
  const normalized = sanitizeDescription(text);
  return normalized.length > 0 ? normalized : fallback;
}

function normalizeBaseUrl(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function buildQuestionFallbackAnswer(input: WeatherQuestionInput, targetDate: string | null): string {
  const index = targetDate ? input.forecast.time.indexOf(targetDate) : 0;

  if (targetDate && index < 0) {
    return "That date is outside the current 3-day forecast. Please choose today, tomorrow, or one of the next 3 days.";
  }

  const safeIndex = index >= 0 ? index : 0;
  const day = input.forecast.time[safeIndex] ?? "the requested day";
  const min = input.forecast.temperature_2m_min[safeIndex] ?? 0;
  const max = input.forecast.temperature_2m_max[safeIndex] ?? 0;
  const precipitation = input.forecast.precipitation_sum[safeIndex] ?? 0;
  const description = fallbackDescription(input.forecast.weather_code[safeIndex] ?? -1);

  if (precipitation > 2) {
    return `You can go for a walk on ${day}, but rain is likely (${precipitation}). Bring an umbrella.`;
  }

  if (max >= 32) {
    return `You can walk on ${day}, but it may get hot (${max}${input.units === "imperial" ? "F" : "C"}). Morning or evening is better.`;
  }

  return `Yes, walking looks fine on ${day}: ${description.toLowerCase()}, around ${min}-${max}${input.units === "imperial" ? "F" : "C"}, with low rain risk.`;
}

async function callGemini(prompt: string, runtime?: AiRuntimeOptions): Promise<string | null> {
  if (runtime?.apiBaseUrl) {
    try {
      const endpoint = `${normalizeBaseUrl(runtime.apiBaseUrl)}/v1/ask`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(runtime.apiToken ? { "x-weather-token": runtime.apiToken } : {})
        },
        body: JSON.stringify({
          prompt,
          model: getModelName()
        })
      });

      if (response.ok) {
        const data = (await response.json()) as { text?: unknown };
        if (typeof data.text === "string" && data.text.trim().length > 0) {
          return data.text.trim();
        }
      }
    } catch {
      // Fall through to direct Gemini mode.
    }
  }

  const apiKey = getApiKey();

  if (!apiKey) {
    return null;
  }

  try {
    const mod = await import("@google/genai");
    const GoogleGenAI = (mod as { GoogleGenAI?: new (opts: { apiKey: string }) => any }).GoogleGenAI;
    if (!GoogleGenAI) {
      return null;
    }

    const client = new GoogleGenAI({ apiKey });
    const response = await client.models.generateContent({
      model: getModelName(),
      contents: prompt
    });

    const textValue = (response as { text?: string }).text;
    if (!textValue || typeof textValue !== "string") {
      return null;
    }

    return textValue.trim();
  } catch {
    return null;
  }
}

async function getCurrentWeatherInsight(input: CurrentDescriptionInput): Promise<CurrentAiInsight> {
  const fallback = fallbackDescription(input.weatherCode);
  const tempUnit = input.units === "imperial" ? "F" : "C";
  const windUnit = input.units === "imperial" ? "mph" : "km/h";
  const precipitationUnit = input.units === "imperial" ? "in" : "mm";
  const prompt = [
    "You are a weather assistant in a CLI app.",
    "Return strict JSON object only with keys: condition, summary, recommendation, outfitTip.",
    "condition should be 2-6 words.",
    "summary should be one short sentence under 18 words.",
    "recommendation should be one actionable sentence under 16 words.",
    "outfitTip should be one short sentence under 12 words.",
    "Tone: clear, natural, and practical.",
    "Avoid jokes or slang.",
    "No emoji. No markdown.",
    `Location: ${input.location}`,
    `Weather code: ${input.weatherCode}`,
    `Fallback meaning: ${fallback}`,
    `Temperature: ${input.temperature} ${tempUnit}`,
    `Feels like: ${input.feelsLike} ${tempUnit}`,
    `Humidity: ${input.humidity}%`,
    `Wind speed: ${input.windSpeed} ${windUnit}`,
    `Precipitation: ${input.precipitation} ${precipitationUnit}`,
    `Cloud cover: ${input.cloudCover}%`,
    `Visibility: ${input.visibility} m`,
    `Surface pressure: ${input.pressure} hPa`
  ].join("\n");

  const aiText = await callGemini(prompt, input.runtime);
  if (!aiText) {
    return {
      condition: fallback,
      summary: `${fallback} with humidity around ${input.humidity}%.`,
      recommendation: "Carry water and check rain before heading out.",
      outfitTip: "Wear light, breathable clothing.",
      source: "fallback"
    };
  }

  const jsonText = extractJsonBlock(aiText);
  if (!jsonText) {
    const raw = sanitizeDescription(aiText);
    return {
      condition: fallback,
      summary: raw.length > 0 ? raw : `${fallback} with humidity around ${input.humidity}%.`,
      recommendation: "Carry water and check rain before heading out.",
      outfitTip: "Wear light, breathable clothing.",
      source: "fallback"
    };
  }

  try {
    const parsed = JSON.parse(jsonText) as Partial<CurrentAiInsight>;
    return {
      condition: sanitizeLine(parsed.condition ?? fallback, fallback),
      summary: sanitizeLine(parsed.summary ?? `${fallback} with humidity around ${input.humidity}%.`, `${fallback} with humidity around ${input.humidity}%.`),
      recommendation: sanitizeLine(parsed.recommendation ?? "Carry water and check rain before heading out.", "Carry water and check rain before heading out."),
      outfitTip: sanitizeLine(parsed.outfitTip ?? "Wear light, breathable clothing.", "Wear light, breathable clothing."),
      source: "ai"
    };
  } catch {
    return {
      condition: fallback,
      summary: `${fallback} with humidity around ${input.humidity}%.`,
      recommendation: "Carry water and check rain before heading out.",
      outfitTip: "Wear light, breathable clothing.",
      source: "fallback"
    };
  }
}

function getFallbackForecastDescriptions(daily: ForecastDaily): string[] {
  return daily.weather_code.map((code) => fallbackDescription(code));
}

async function getForecastWeatherInsight(input: ForecastDescriptionInput): Promise<ForecastAiInsight> {
  const fallback = getFallbackForecastDescriptions(input.daily);
  const dayData = input.daily.time.map((date, i) => ({
    date,
    weatherCode: input.daily.weather_code[i] ?? -1,
    fallback: fallback[i] ?? "Unknown weather",
    min: input.daily.temperature_2m_min[i] ?? 0,
    max: input.daily.temperature_2m_max[i] ?? 0,
    precipitation: input.daily.precipitation_sum[i] ?? 0
  }));

  const prompt = [
    "You are a weather assistant for a CLI forecast.",
    "Return strict JSON object only with keys: dayDescriptions, recommendation.",
    "dayDescriptions must be array of short strings (2-6 words), same order and same length as input days.",
    "recommendation should be one practical sentence under 18 words for the next 3 days.",
    `Location: ${input.location}`,
    `Units: ${input.units}`,
    `Data: ${JSON.stringify(dayData)}`
  ].join("\n");

  const aiText = await callGemini(prompt, input.runtime);
  if (!aiText) {
    return {
      dayDescriptions: fallback,
      recommendation: "Plan outdoor activities in cooler hours and keep water with you.",
      source: "fallback"
    };
  }

  const jsonText = extractJsonBlock(aiText);
  if (!jsonText) {
    return {
      dayDescriptions: fallback,
      recommendation: "Plan outdoor activities in cooler hours and keep water with you.",
      source: "fallback"
    };
  }

  try {
    const parsed = JSON.parse(jsonText) as {
      dayDescriptions?: unknown;
      recommendation?: unknown;
    };

    if (!Array.isArray(parsed.dayDescriptions) || parsed.dayDescriptions.length !== input.daily.time.length) {
      return {
        dayDescriptions: fallback,
        recommendation: "Plan outdoor activities in cooler hours and keep water with you.",
        source: "fallback"
      };
    }

    const cleaned = parsed.dayDescriptions.map((item, i) => {
      if (typeof item !== "string") {
        return fallback[i] ?? "Unknown weather";
      }
      const normalized = sanitizeDescription(item);
      return normalized.length > 0 ? normalized : fallback[i] ?? "Unknown weather";
    });

    const recommendation = typeof parsed.recommendation === "string" && sanitizeDescription(parsed.recommendation).length > 0
      ? sanitizeDescription(parsed.recommendation)
      : "Plan outdoor activities in cooler hours and keep water with you.";

    return {
      dayDescriptions: cleaned,
      recommendation,
      source: "ai"
    };
  } catch {
    return {
      dayDescriptions: fallback,
      recommendation: "Plan outdoor activities in cooler hours and keep water with you.",
      source: "fallback"
    };
  }
}

async function getWeatherQuestionInsight(input: WeatherQuestionInput): Promise<WeatherQuestionInsight> {
  const fallbackDate = input.requestedDate ?? detectDateFromQuestion(input.question);
  const normalizedQuestion = input.question.toLowerCase();
  const inferredTomorrow = !input.requestedDate && normalizedQuestion.includes("tomorrow")
    ? detectDateFromQuestion("tomorrow")
    : null;
  const forecastData = input.forecast.time.map((date, i) => ({
    date,
    weatherCode: input.forecast.weather_code[i] ?? -1,
    description: fallbackDescription(input.forecast.weather_code[i] ?? -1),
    min: input.forecast.temperature_2m_min[i] ?? 0,
    max: input.forecast.temperature_2m_max[i] ?? 0,
    precipitation: input.forecast.precipitation_sum[i] ?? 0
  }));

  const prompt = [
    "You are a weather decision assistant in a CLI app.",
    "Answer the user's question using current weather and 3-day forecast data.",
    "Return strict JSON object only with keys: answer, targetDate.",
    "answer should be 1-2 concise sentences with practical recommendation.",
    "Tone: clear, practical, and natural.",
    "Avoid jokes, slang, or developer references.",
    "Avoid generic lines like 'conditions look manageable'.",
    "Include at least one concrete weather detail (temp range, rain, wind, or humidity).",
    "No emoji. No markdown.",
    "targetDate should be YYYY-MM-DD if relevant, otherwise null.",
    `Location: ${input.location}`,
    `Units: ${input.units}`,
    `User question: ${input.question}`,
    `Requested date (optional): ${input.requestedDate ?? "none"}`,
    `Current weather: ${JSON.stringify(input.current)}`,
    `Forecast data: ${JSON.stringify(forecastData)}`
  ].join("\n");

  const aiText = await callGemini(prompt, input.runtime);
  if (!aiText) {
    return {
      answer: buildQuestionFallbackAnswer(input, fallbackDate ?? null),
      targetDate: fallbackDate ?? null,
      source: "fallback"
    };
  }

  const jsonText = extractJsonBlock(aiText);
  if (!jsonText) {
    const rawAnswer = sanitizeDescription(aiText);
    return {
      answer: rawAnswer.length > 0 ? rawAnswer : buildQuestionFallbackAnswer(input, fallbackDate ?? null),
      targetDate: fallbackDate ?? null,
      source: "ai"
    };
  }

  try {
    const parsed = JSON.parse(jsonText) as {
      answer?: unknown;
      targetDate?: unknown;
    };

    const answer = typeof parsed.answer === "string" && sanitizeDescription(parsed.answer).length > 0
      ? sanitizeDescription(parsed.answer)
      : buildQuestionFallbackAnswer(input, fallbackDate ?? null);

    const targetDate = typeof parsed.targetDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.targetDate)
      ? parsed.targetDate
      : null;

    const correctedTargetDate = inferredTomorrow ?? targetDate;

    return { answer, targetDate: correctedTargetDate, source: "ai" };
  } catch {
    const rawAnswer = sanitizeDescription(aiText);
    return {
      answer: rawAnswer.length > 0 ? rawAnswer : buildQuestionFallbackAnswer(input, fallbackDate ?? null),
      targetDate: fallbackDate ?? null,
      source: rawAnswer.length > 0 ? "ai" : "fallback"
    };
  }
}

export { getCurrentWeatherInsight, getForecastWeatherInsight };
export type { CurrentAiInsight, ForecastAiInsight };
export { getWeatherQuestionInsight };
export type { WeatherQuestionInsight };
