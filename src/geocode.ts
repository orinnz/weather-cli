const GEOCODING_API = "https://geocoding-api.open-meteo.com/v1/search";

export type GeocodedPlace = {
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
};

type GeocodingResponse = {
  results?: GeocodedPlace[];
};

async function geocodeLocation(query: string): Promise<GeocodedPlace | null> {
  const url = new URL(GEOCODING_API);
  url.searchParams.set("name", query);
  url.searchParams.set("count", "5");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Geocoding failed with status ${response.status}`);
  }

  const data = (await response.json()) as GeocodingResponse;
  if (!data.results || data.results.length === 0) {
    return null;
  }

  return data.results[0] ?? null;
}

export { geocodeLocation };
