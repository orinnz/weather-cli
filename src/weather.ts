const WEATHER_API = "https://api.open-meteo.com/v1/forecast";

type Units = "metric" | "imperial";

type CurrentWeather = {
  temperature_2m: number;
  relative_humidity_2m: number;
  apparent_temperature: number;
  is_day: number;
  precipitation: number;
  wind_speed_10m: number;
  cloud_cover: number;
  visibility: number;
  surface_pressure: number;
  weather_code: number;
};

type CurrentWeatherResponse = {
  current?: CurrentWeather;
};

type ForecastDaily = {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_sum: number[];
};

type ForecastResponse = {
  daily?: ForecastDaily;
};

function getUnitsConfig(units: Units) {
  if (units === "imperial") {
    return {
      temperature_unit: "fahrenheit",
      wind_speed_unit: "mph",
      precipitation_unit: "inch"
    } as const;
  }

  return {
    temperature_unit: "celsius",
    wind_speed_unit: "kmh",
    precipitation_unit: "mm"
  } as const;
}

async function getCurrentWeather(latitude: number, longitude: number, units: Units = "metric"): Promise<Required<CurrentWeatherResponse>> {
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

  const data = (await response.json()) as CurrentWeatherResponse;
  if (!data.current) {
    throw new Error("No weather data returned by API");
  }

  return { current: data.current };
}

async function getThreeDayForecast(latitude: number, longitude: number, units: Units = "metric"): Promise<Required<ForecastResponse>> {
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

  const data = (await response.json()) as ForecastResponse;
  if (!data.daily || !Array.isArray(data.daily.time) || data.daily.time.length === 0) {
    throw new Error("No forecast data returned by API");
  }

  return { daily: data.daily };
}

export { getCurrentWeather, getThreeDayForecast };
export type { CurrentWeather, ForecastDaily, Units };
