import type { Express } from "express";
import type { Server } from 'node:http';

interface ConditionPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

const conditionPoints: ConditionPoint[] = [
  { id: "cleveland", name: "Cleveland / Westlake", lat: 41.4993, lng: -81.6944 },
  { id: "st-louis", name: "St. Louis", lat: 38.6270, lng: -90.1994 },
  { id: "kansas-city", name: "Kansas City / Topeka", lat: 39.0473, lng: -95.6752 },
  { id: "denver-golden", name: "Denver / Golden", lat: 39.7555, lng: -105.2211 },
  { id: "garden-gods", name: "Garden of the Gods", lat: 38.8784, lng: -104.8694 },
  { id: "great-sand-dunes", name: "Great Sand Dunes", lat: 37.7916, lng: -105.5943 },
  { id: "moab", name: "Moab", lat: 38.5733, lng: -109.5498 },
  { id: "grand-canyon", name: "Grand Canyon South Rim", lat: 36.0579, lng: -112.1431 },
  { id: "sedona", name: "Sedona", lat: 34.8697, lng: -111.7610 },
  { id: "scottsdale", name: "Phoenix / Scottsdale", lat: 33.5397, lng: -111.9225 },
  { id: "palm-springs", name: "Palm Springs / Indio", lat: 33.8303, lng: -116.5453 },
  { id: "del-mar", name: "Del Mar", lat: 32.9595, lng: -117.2653 },
  { id: "tulsa", name: "Tulsa / Oklahoma City", lat: 36.1540, lng: -95.9928 },
  { id: "amarillo", name: "Amarillo", lat: 35.2220, lng: -101.8313 },
  { id: "albuquerque", name: "Albuquerque / Santa Fe", lat: 35.0844, lng: -106.6504 },
  { id: "flagstaff", name: "Flagstaff / Williams", lat: 35.1983, lng: -111.6513 },
];

function round(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null;
}

async function fetchJson<T>(url: string, headers?: Record<string, string>): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function buildCondition(point: ConditionPoint) {
  const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
  weatherUrl.searchParams.set("latitude", String(point.lat));
  weatherUrl.searchParams.set("longitude", String(point.lng));
  weatherUrl.searchParams.set("current", "temperature_2m,apparent_temperature,wind_speed_10m,weather_code");
  weatherUrl.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,uv_index_max");
  weatherUrl.searchParams.set("temperature_unit", "fahrenheit");
  weatherUrl.searchParams.set("wind_speed_unit", "mph");
  weatherUrl.searchParams.set("timezone", "auto");
  weatherUrl.searchParams.set("forecast_days", "16");

  const weather = await fetchJson<{
    current?: Record<string, number>;
    daily?: Record<string, number[]>;
  }>(weatherUrl.toString());

  const alerts = await fetchJson<{
    features?: Array<{ properties?: Record<string, string> }>;
  }>(
    `https://api.weather.gov/alerts/active?point=${point.lat},${point.lng}`,
    { "User-Agent": "PathfinderTripPlanner/1.0 (https://www.perplexity.ai)" },
  );

  const current = weather?.current ?? {};
  const daily = weather?.daily ?? {};
  const temp = round(current.temperature_2m);
  const feelsLike = round(current.apparent_temperature);
  const windMph = round(current.wind_speed_10m);
  const dailyMax = round(daily.temperature_2m_max?.[0]);
  const dailyMin = round(daily.temperature_2m_min?.[0]);
  const precipitationProbability = round(daily.precipitation_probability_max?.[0]);
  const uvIndex = round(daily.uv_index_max?.[0]);

  const activeAlerts = (alerts?.features ?? []).slice(0, 6).map(feature => ({
    event: feature.properties?.event ?? "Weather alert",
    severity: feature.properties?.severity,
    headline: feature.properties?.headline,
    areaDesc: feature.properties?.areaDesc,
    expires: feature.properties?.expires,
  }));

  const riskReasons: string[] = [];
  if ((feelsLike ?? temp ?? 0) >= 100) riskReasons.push("Extreme heat risk for dog paws and toddler outdoor time.");
  else if ((feelsLike ?? temp ?? 0) >= 92) riskReasons.push("Heat watch: move outdoor stops to dawn or evening.");
  if ((windMph ?? 0) >= 28) riskReasons.push("High wind may affect mountain/desert driving and dust.");
  if ((uvIndex ?? 0) >= 8) riskReasons.push("High UV: shade, hats, and short exposure windows matter.");
  if (activeAlerts.length > 0) riskReasons.push(`${activeAlerts.length} active NWS alert${activeAlerts.length === 1 ? "" : "s"} returned.`);

  const high = riskReasons.some(r => r.includes("Extreme") || r.includes("High wind")) || activeAlerts.some(a => ["Extreme", "Severe"].includes(a.severity ?? ""));
  const watch = riskReasons.length > 0;

  return {
    ...point,
    weather: {
      temperature: temp,
      feelsLike,
      windMph,
      code: round(current.weather_code),
      dailyMax,
      dailyMin,
      precipitationProbability,
      uvIndex,
    },
    alerts: activeAlerts,
    wildfire: {
      nearbyCount: 0,
      note: "Open NIFC’s live incident maps before committing to this leg; smoke and closures can change quickly.",
      link: "https://www.nifc.gov/fire-information/maps",
    },
    risk: high ? "high" : watch ? "watch" : "low",
    riskReasons,
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // prefix all routes with /api
  // use storage to perform CRUD operations on the storage interface
  // e.g. app.get("/api/items", async (_req, res) => { ... })

  app.get("/api/conditions", async (_req, res) => {
    const results = await Promise.all(conditionPoints.map(buildCondition));
    res.json({
      generatedAt: new Date().toISOString(),
      forecastCoverageNote:
        "Open-Meteo provides a rolling 16-day forecast, so the July 22-31 trip dates will fill in as they enter range. NWS alerts are active-now alerts, not long-range predictions.",
      points: results,
      sources: [
        { label: "Open-Meteo forecast API", url: "https://open-meteo.com/en/docs" },
        { label: "National Weather Service API", url: "https://www.weather.gov/documentation/services-web-api" },
        { label: "NIFC fire maps", url: "https://www.nifc.gov/fire-information/maps" },
      ],
    });
  });

  return httpServer;
}
