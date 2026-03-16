import { geocodeLocation } from "./geocode.js";
import { getCurrentWeather, getThreeDayForecast } from "./weather.js";
import { getCachedValue, makeKey, setCachedValue } from "./cache.js";
import { getCurrentWeatherInsight, getForecastWeatherInsight, getWeatherQuestionInsight } from "./weather-descriptions.js";
import { listFavorites, removeFavorite, resolveFavorite, saveFavorite } from "./favorites.js";
import { parseIsoDate, resolveWhenToDate } from "./date-utils.js";
const LABEL_WIDTH = 18;
const WEATHER_CODE_LABELS = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    80: "Rain showers",
    95: "Thunderstorm"
};
function weatherCodeToLabel(code) {
    return WEATHER_CODE_LABELS[code] ?? `Code ${code}`;
}
function divider(theme) {
    return theme.dim("-".repeat(64));
}
function sectionTitle(title, theme) {
    console.log(`\n${theme.accent(`[ ${title} ]`)}`);
    console.log(divider(theme));
}
function row(label, value, theme) {
    const padded = label.padEnd(LABEL_WIDTH, " ");
    console.log(`${theme.label(padded)} ${value}`);
}
function getAiRuntimeOptions() {
    const apiBaseUrl = process.env.WEATHER_API_BASE_URL?.trim();
    const apiToken = process.env.WEATHER_API_TOKEN?.trim();
    return {
        apiBaseUrl: apiBaseUrl && apiBaseUrl.length > 0 ? apiBaseUrl : undefined,
        apiToken: apiToken && apiToken.length > 0 ? apiToken : undefined
    };
}
function parseArgs(args) {
    const state = {
        units: "metric",
        forecast: false,
        color: process.stdout.isTTY,
        location: []
    };
    for (let i = 0; i < args.length; i += 1) {
        const arg = args[i];
        if (arg === "--") {
            continue;
        }
        if (arg === "-h" || arg === "--help") {
            state.help = true;
            continue;
        }
        if (arg === "-u" || arg === "--units") {
            const next = args[i + 1];
            if (!next || next.startsWith("-")) {
                throw new Error("Missing value for --units (metric|imperial)");
            }
            state.units = next.toLowerCase();
            i += 1;
            continue;
        }
        if (arg === "-f" || arg === "--forecast") {
            state.forecast = true;
            continue;
        }
        if (arg === "-a" || arg === "--ask") {
            const next = args[i + 1];
            if (!next || next.startsWith("-")) {
                throw new Error("Missing value for --ask");
            }
            state.askQuestion = next;
            i += 1;
            continue;
        }
        if (arg.startsWith("--ask=")) {
            state.askQuestion = arg.slice("--ask=".length);
            continue;
        }
        if (arg === "--date") {
            const next = args[i + 1];
            if (!next || next.startsWith("-")) {
                throw new Error("Missing value for --date (YYYY-MM-DD)");
            }
            state.askDate = next;
            i += 1;
            continue;
        }
        if (arg === "--when") {
            const next = args[i + 1];
            if (!next || next.startsWith("-")) {
                throw new Error("Missing value for --when (today|tomorrow|weekday|YYYY-MM-DD)");
            }
            state.when = next;
            i += 1;
            continue;
        }
        if (arg.startsWith("--when=")) {
            state.when = arg.slice("--when=".length);
            continue;
        }
        if (arg === "--date-check") {
            const next = args[i + 1];
            if (!next || next.startsWith("-")) {
                throw new Error("Missing value for --date-check (YYYY-MM-DD)");
            }
            state.dateCheck = next;
            i += 1;
            continue;
        }
        if (arg === "--save") {
            const next = args[i + 1];
            if (!next || next.startsWith("-")) {
                throw new Error("Missing value for --save <alias>");
            }
            state.saveAlias = next;
            i += 1;
            continue;
        }
        if (arg === "--remove") {
            const next = args[i + 1];
            if (!next || next.startsWith("-")) {
                throw new Error("Missing value for --remove <alias>");
            }
            state.removeAlias = next;
            i += 1;
            continue;
        }
        if (arg === "--list-saved") {
            state.listSaved = true;
            continue;
        }
        if (arg.startsWith("--date-check=")) {
            state.dateCheck = arg.slice("--date-check=".length);
            continue;
        }
        if (arg.startsWith("--date=")) {
            state.askDate = arg.slice("--date=".length);
            continue;
        }
        if (arg === "--no-color") {
            state.color = false;
            continue;
        }
        state.location.push(arg);
    }
    return state;
}
function printHelp() {
    console.log("cli-weather - Check weather in a specific location\n");
    console.log("Usage:");
    console.log("  cli-weather <location> [--ask \"question\"] [--date YYYY-MM-DD] [--when tomorrow] [--date-check YYYY-MM-DD] [--units metric|imperial] [--forecast] [--no-color]");
    console.log("\nOptions:");
    console.log("  -a, --ask        Ask Gemini a weather question");
    console.log("      --date       Optional date for ask mode (YYYY-MM-DD)");
    console.log("      --when       Natural date (today|tomorrow|monday|...|YYYY-MM-DD)");
    console.log("      --date-check Quick weather check for a specific date (YYYY-MM-DD)");
    console.log("      --save       Save current location with alias (e.g., --save home)");
    console.log("      --remove     Remove saved alias");
    console.log("      --list-saved List all saved aliases");
    console.log("  -u, --units      metric (default) | imperial");
    console.log("  -f, --forecast   Show 3-day forecast");
    console.log("      --no-color   Disable ANSI colors");
    console.log("  -h, --help       Show help");
    console.log("\nExamples:");
    console.log("  cli-weather Hanoi --ask \"Can I go for a walk tomorrow?\"");
    console.log("  cli-weather Hanoi --ask \"Can I walk?\" --when tomorrow");
    console.log("  cli-weather Hanoi --date-check 2026-03-18");
    console.log("  cli-weather Hanoi --save home");
    console.log("  cli-weather --list-saved");
}
function getDisplayLocation(place) {
    const parts = [place.name, place.admin1, place.country].filter(Boolean);
    return parts.join(", ");
}
function createTheme(useColor) {
    if (!useColor) {
        return {
            heading: (text) => text,
            label: (text) => text,
            good: (text) => text,
            dim: (text) => text,
            accent: (text) => text
        };
    }
    return {
        heading: (text) => `\x1b[1;36m${text}\x1b[0m`,
        label: (text) => `\x1b[1;33m${text}\x1b[0m`,
        good: (text) => `\x1b[1;32m${text}\x1b[0m`,
        dim: (text) => `\x1b[2m${text}\x1b[0m`,
        accent: (text) => `\x1b[1;35m${text}\x1b[0m`
    };
}
function formatDateLabel(isoDate) {
    const date = new Date(`${isoDate}T00:00:00`);
    return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric"
    });
}
async function fetchLocationWithCache(query) {
    const key = makeKey(["geocode", query]);
    const cached = await getCachedValue(key, 24 * 60 * 60 * 1000);
    if (cached) {
        return cached;
    }
    const location = await geocodeLocation(query);
    if (location) {
        await setCachedValue(key, location);
    }
    return location;
}
async function fetchCurrentWeatherWithCache(place, units) {
    const key = makeKey(["current", place.latitude, place.longitude, units]);
    const cached = await getCachedValue(key, 10 * 60 * 1000);
    if (cached
        && typeof cached.current?.cloud_cover === "number"
        && typeof cached.current?.visibility === "number"
        && typeof cached.current?.surface_pressure === "number") {
        return cached;
    }
    const weather = await getCurrentWeather(place.latitude, place.longitude, units);
    await setCachedValue(key, weather);
    return weather;
}
async function fetchForecastWithCache(place, units) {
    const key = makeKey(["forecast3", place.latitude, place.longitude, units]);
    const cached = await getCachedValue(key, 30 * 60 * 1000);
    if (cached) {
        return cached;
    }
    const forecast = await getThreeDayForecast(place.latitude, place.longitude, units);
    await setCachedValue(key, forecast);
    return forecast;
}
function printCurrentWeather(place, current, units, insight, theme) {
    const tempUnit = units === "imperial" ? "F" : "C";
    const windUnit = units === "imperial" ? "mph" : "km/h";
    const precipitationUnit = units === "imperial" ? "in" : "mm";
    const visibilityUnit = units === "imperial" ? "mi" : "km";
    const visibilityValue = units === "imperial"
        ? (current.visibility / 1609.34).toFixed(1)
        : (current.visibility / 1000).toFixed(1);
    sectionTitle(`Weather for ${getDisplayLocation(place)}`, theme);
    row("Condition:", theme.good(insight.condition), theme);
    row("AI Summary:", insight.summary, theme);
    row("AI Recommendation:", insight.recommendation, theme);
    row("AI Outfit Tip:", insight.outfitTip, theme);
    row("Source:", insight.source === "ai" ? "AI" : "Fallback", theme);
    console.log(divider(theme));
    row("Temperature:", `${current.temperature_2m} ${tempUnit}`, theme);
    row("Feels like:", `${current.apparent_temperature} ${tempUnit}`, theme);
    row("Humidity:", `${current.relative_humidity_2m}%`, theme);
    row("Wind Speed:", `${current.wind_speed_10m} ${windUnit}`, theme);
    row("Precipitation:", `${current.precipitation} ${precipitationUnit}`, theme);
    row("Cloud Cover:", `${current.cloud_cover}%`, theme);
    row("Visibility:", `${visibilityValue} ${visibilityUnit}`, theme);
    row("Surface Pressure:", `${current.surface_pressure} hPa`, theme);
}
function printForecast(place, forecast, insight, units, theme) {
    const daily = forecast.daily;
    const tempUnit = units === "imperial" ? "F" : "C";
    const precipitationUnit = units === "imperial" ? "in" : "mm";
    sectionTitle(`3-Day Forecast for ${getDisplayLocation(place)}`, theme);
    row("AI Recommendation:", insight.recommendation, theme);
    row("Source:", insight.source === "ai" ? "AI" : "Fallback", theme);
    console.log(divider(theme));
    for (let i = 0; i < daily.time.length; i += 1) {
        const dayLabel = formatDateLabel(daily.time[i] ?? "");
        const description = insight.dayDescriptions[i] ?? "Unknown weather";
        const min = daily.temperature_2m_min[i] ?? 0;
        const max = daily.temperature_2m_max[i] ?? 0;
        const precipitation = daily.precipitation_sum[i] ?? 0;
        row(`${dayLabel}:`, description, theme);
        console.log(theme.dim(`  range ${min}/${max} ${tempUnit} | precip ${precipitation} ${precipitationUnit}`));
    }
}
function printQuestionAnswer(question, answer, targetDate, theme) {
    sectionTitle("Gemini Q&A", theme);
    row("Question:", question, theme);
    if (targetDate) {
        row("Target Date:", targetDate, theme);
    }
    row("Answer:", answer, theme);
}
function printSavedLocations(items, theme) {
    sectionTitle("Saved Locations", theme);
    if (items.length === 0) {
        row("Status:", "No saved aliases yet.", theme);
        return;
    }
    for (const item of items) {
        row(`${item.alias}:`, item.location, theme);
    }
}
function printDateCheck(place, forecast, units, date, theme) {
    const index = forecast.daily.time.indexOf(date);
    sectionTitle(`Date Check for ${getDisplayLocation(place)}`, theme);
    row("Date:", date, theme);
    if (index < 0) {
        row("Status:", "Date is outside current 3-day forecast window.", theme);
        row("Tip:", "Use --ask with today/tomorrow or a date in forecast output.", theme);
        return;
    }
    const tempUnit = units === "imperial" ? "F" : "C";
    const precipitationUnit = units === "imperial" ? "in" : "mm";
    const code = forecast.daily.weather_code[index] ?? -1;
    const description = weatherCodeToLabel(code);
    const min = forecast.daily.temperature_2m_min[index] ?? 0;
    const max = forecast.daily.temperature_2m_max[index] ?? 0;
    const precipitation = forecast.daily.precipitation_sum[index] ?? 0;
    row("Condition:", description, theme);
    row("Temperature:", `${min}/${max} ${tempUnit}`, theme);
    row("Precipitation:", `${precipitation} ${precipitationUnit}`, theme);
    if (precipitation > 2) {
        row("Quick Verdict:", "Possible, but expect rain. Bring rain gear.", theme);
    }
    else if (max >= 32) {
        row("Quick Verdict:", "Possible, but hot. Better in early morning/evening.", theme);
    }
    else {
        row("Quick Verdict:", "Looks good for outdoor plans.", theme);
    }
}
async function run(args) {
    try {
        const parsed = parseArgs(args);
        const theme = createTheme(parsed.color);
        const aiRuntime = getAiRuntimeOptions();
        if (parsed.listSaved) {
            const items = await listFavorites();
            printSavedLocations(items, theme);
            console.log("");
            return;
        }
        if (parsed.removeAlias) {
            const removed = await removeFavorite(parsed.removeAlias);
            sectionTitle("Saved Locations", theme);
            row("Removed:", removed ? parsed.removeAlias : `Alias '${parsed.removeAlias}' not found`, theme);
            console.log("");
            return;
        }
        if (parsed.help || parsed.location.length === 0) {
            printHelp();
            process.exitCode = parsed.help ? 0 : 1;
            return;
        }
        if (!["metric", "imperial"].includes(parsed.units)) {
            throw new Error("Invalid units. Use 'metric' or 'imperial'.");
        }
        const locationInput = parsed.location.join(" ");
        const query = await resolveFavorite(locationInput);
        let place = await fetchLocationWithCache(query);
        // Backward compatibility for old saved aliases like "City, State, Country".
        if (!place && query.includes(",")) {
            const simplified = query.split(",")[0]?.trim();
            if (simplified) {
                place = await fetchLocationWithCache(simplified);
            }
        }
        if (!place) {
            throw new Error(`No location found for '${query}'.`);
        }
        const locationLabel = getDisplayLocation(place);
        if (parsed.saveAlias) {
            await saveFavorite(parsed.saveAlias, place.name);
            sectionTitle("Saved Locations", theme);
            row("Saved:", `${parsed.saveAlias} -> ${place.name}`, theme);
            console.log("");
            return;
        }
        if (parsed.when) {
            const resolved = resolveWhenToDate(parsed.when);
            if (!resolved) {
                throw new Error("Invalid --when value. Use today, tomorrow, weekday name, or YYYY-MM-DD.");
            }
            if (parsed.askQuestion && !parsed.askDate) {
                parsed.askDate = resolved;
            }
            if (!parsed.askQuestion && !parsed.dateCheck) {
                parsed.dateCheck = resolved;
            }
        }
        const weather = await fetchCurrentWeatherWithCache(place, parsed.units);
        const current = weather.current;
        const currentInsight = await getCurrentWeatherInsight({
            weatherCode: current.weather_code,
            location: locationLabel,
            units: parsed.units,
            temperature: current.temperature_2m,
            feelsLike: current.apparent_temperature,
            humidity: current.relative_humidity_2m,
            windSpeed: current.wind_speed_10m,
            precipitation: current.precipitation,
            cloudCover: current.cloud_cover,
            visibility: current.visibility,
            pressure: current.surface_pressure,
            runtime: aiRuntime
        });
        const askMode = Boolean(parsed.askQuestion);
        const dateCheckMode = Boolean(parsed.dateCheck);
        if (!askMode && !dateCheckMode) {
            printCurrentWeather(place, current, parsed.units, currentInsight, theme);
        }
        const needsForecast = parsed.forecast || askMode || dateCheckMode;
        let forecast = null;
        if (needsForecast) {
            forecast = await fetchForecastWithCache(place, parsed.units);
        }
        if (parsed.forecast && forecast) {
            const forecastInsight = await getForecastWeatherInsight({
                location: locationLabel,
                units: parsed.units,
                daily: forecast.daily,
                runtime: aiRuntime
            });
            printForecast(place, forecast, forecastInsight, parsed.units, theme);
        }
        if (parsed.askQuestion && forecast) {
            const qaInsight = await getWeatherQuestionInsight({
                location: locationLabel,
                units: parsed.units,
                question: parsed.askQuestion,
                requestedDate: parsed.askDate,
                current,
                forecast: forecast.daily,
                runtime: aiRuntime
            });
            printQuestionAnswer(parsed.askQuestion, qaInsight.answer, qaInsight.targetDate, theme);
            row("Source:", qaInsight.source === "ai" ? "AI" : "Fallback", theme);
        }
        if (parsed.dateCheck && forecast) {
            if (!parseIsoDate(parsed.dateCheck)) {
                throw new Error("Invalid date format for --date-check. Use YYYY-MM-DD.");
            }
            printDateCheck(place, forecast, parsed.units, parsed.dateCheck, theme);
        }
        console.log("");
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(`Error: ${message}`);
        process.exitCode = 1;
    }
}
export { run, parseArgs };
