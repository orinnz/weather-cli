const WEATHER_API = "https://api.open-meteo.com/v1/forecast";
function getUnitsConfig(units) {
    if (units === "imperial") {
        return {
            temperature_unit: "fahrenheit",
            wind_speed_unit: "mph",
            precipitation_unit: "inch"
        };
    }
    return {
        temperature_unit: "celsius",
        wind_speed_unit: "kmh",
        precipitation_unit: "mm"
    };
}
async function getCurrentWeather(latitude, longitude, units = "metric") {
    const url = new URL(WEATHER_API);
    url.searchParams.set("latitude", String(latitude));
    url.searchParams.set("longitude", String(longitude));
    url.searchParams.set("current", ["temperature_2m", "relative_humidity_2m", "apparent_temperature", "is_day", "precipitation", "wind_speed_10m", "cloud_cover", "visibility", "surface_pressure", "weather_code"].join(","));
    url.searchParams.set("timezone", "auto");
    const unitsConfig = getUnitsConfig(units);
    for (const [key, value] of Object.entries(unitsConfig)) {
        url.searchParams.set(key, value);
    }
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Weather request failed with status ${response.status}`);
    }
    const data = (await response.json());
    if (!data.current) {
        throw new Error("No weather data returned by API");
    }
    return { current: data.current };
}
async function getThreeDayForecast(latitude, longitude, units = "metric") {
    const url = new URL(WEATHER_API);
    url.searchParams.set("latitude", String(latitude));
    url.searchParams.set("longitude", String(longitude));
    url.searchParams.set("daily", ["weather_code", "temperature_2m_max", "temperature_2m_min", "precipitation_sum"].join(","));
    url.searchParams.set("forecast_days", "3");
    url.searchParams.set("timezone", "auto");
    const unitsConfig = getUnitsConfig(units);
    for (const [key, value] of Object.entries(unitsConfig)) {
        url.searchParams.set(key, value);
    }
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Forecast request failed with status ${response.status}`);
    }
    const data = (await response.json());
    if (!data.daily || !Array.isArray(data.daily.time) || data.daily.time.length === 0) {
        throw new Error("No forecast data returned by API");
    }
    return { daily: data.daily };
}
export { getCurrentWeather, getThreeDayForecast };
