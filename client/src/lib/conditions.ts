import { conditionPoints, type Source } from "@/data/julyTrip";

// Live conditions are computed in the browser from two public, CORS-enabled
// APIs (Open-Meteo forecast + NWS active alerts). No backend required, which
// lets the whole app deploy as a static site — no server cold-starts on the
// road. Weather for every point is batched into ONE Open-Meteo request;
// alerts are one small request per point.

export interface ConditionAlert {
  event: string;
  severity?: string;
  headline?: string;
  areaDesc?: string;
  expires?: string;
  url?: string;
}

// Parallel per-date arrays from the rolling 16-day forecast, so the UI can
// read the forecast for the date the family will actually be at each city.
export interface DailyForecast {
  dates: string[];        // "2026-07-22", …
  max: (number | null)[];
  min: (number | null)[];
  feelsMax: (number | null)[];
  precip: (number | null)[];
  uv: (number | null)[];
  windMax: (number | null)[];
  sunrise: (string | null)[];
  sunset: (string | null)[];
}

export interface ConditionResult {
  id: string;
  name: string;
  lat: number;
  lng: number;
  weather?: {
    temperature: number | null;
    feelsLike: number | null;
    windMph: number | null;
    code: number | null;
    dailyMax?: number | null;
    dailyMin?: number | null;
    precipitationProbability?: number | null;
    uvIndex?: number | null;
  };
  daily?: DailyForecast;
  // Current (not forecast — the AQI feed only runs a few days out) air quality,
  // used as a real-time wildfire-smoke read.
  airQuality?: {
    usAqi: number | null;
    pm25: number | null;
  };
  alerts: ConditionAlert[];
  wildfire?: {
    nearbyCount: number;
    note: string;
    link: string;
  };
  risk: "low" | "watch" | "high";
  riskReasons: string[];
}

export interface ConditionsResponse {
  generatedAt: string;
  forecastCoverageNote: string;
  points: ConditionResult[];
  sources: Source[];
}

function round(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

interface OpenMeteoForecast {
  current?: Record<string, number>;
  daily?: Record<string, (number | string)[]>;
}

interface NwsAlerts {
  features?: Array<{ id?: string; properties?: Record<string, string> }>;
}

interface AirQualityResponse {
  current?: { us_aqi?: number; pm2_5?: number };
}

function buildResult(
  point: (typeof conditionPoints)[number],
  weather: OpenMeteoForecast | undefined,
  alerts: NwsAlerts | null,
  air: AirQualityResponse | undefined,
): ConditionResult {
  const current = weather?.current ?? {};
  const daily = weather?.daily ?? {};
  const temp = round(current.temperature_2m);
  const feelsLike = round(current.apparent_temperature);
  const windMph = round(current.wind_speed_10m);
  const dailyMax = round(daily.temperature_2m_max?.[0]);
  const dailyMin = round(daily.temperature_2m_min?.[0]);
  const precipitationProbability = round(daily.precipitation_probability_max?.[0]);
  const uvIndex = round(daily.uv_index_max?.[0]);

  const asStrings = (v: (number | string)[] | undefined): (string | null)[] =>
    (v ?? []).map(x => (typeof x === "string" ? x : null));
  const asNums = (v: (number | string)[] | undefined): (number | null)[] =>
    (v ?? []).map(round);
  const dailyForecast: DailyForecast = {
    dates: (daily.time ?? []).map(x => String(x)),
    max: asNums(daily.temperature_2m_max),
    min: asNums(daily.temperature_2m_min),
    feelsMax: asNums(daily.apparent_temperature_max),
    precip: asNums(daily.precipitation_probability_max),
    uv: asNums(daily.uv_index_max),
    windMax: asNums(daily.wind_speed_10m_max),
    sunrise: asStrings(daily.sunrise),
    sunset: asStrings(daily.sunset),
  };

  const activeAlerts: ConditionAlert[] = (alerts?.features ?? []).slice(0, 6).map(feature => ({
    event: feature.properties?.event ?? "Weather alert",
    severity: feature.properties?.severity,
    headline: feature.properties?.headline,
    areaDesc: feature.properties?.areaDesc,
    expires: feature.properties?.expires,
    url: feature.id ?? feature.properties?.["@id"],
  }));

  const riskReasons: string[] = [];
  if ((feelsLike ?? temp ?? 0) >= 100) riskReasons.push("Extreme heat risk for dog paws and toddler outdoor time.");
  else if ((feelsLike ?? temp ?? 0) >= 92) riskReasons.push("Heat watch: move outdoor stops to dawn or evening.");
  if ((windMph ?? 0) >= 28) riskReasons.push("High wind may affect mountain/desert driving and dust.");
  if ((uvIndex ?? 0) >= 8) riskReasons.push("High UV: shade, hats, and short exposure windows matter.");
  if (activeAlerts.length > 0) riskReasons.push(`${activeAlerts.length} active NWS alert${activeAlerts.length === 1 ? "" : "s"} returned.`);

  const high =
    riskReasons.some(r => r.includes("Extreme") || r.includes("High wind")) ||
    activeAlerts.some(a => ["Extreme", "Severe"].includes(a.severity ?? ""));
  const watch = riskReasons.length > 0;

  return {
    id: point.id,
    name: point.name,
    lat: point.lat,
    lng: point.lng,
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
    daily: dailyForecast,
    airQuality: {
      usAqi: round(air?.current?.us_aqi),
      pm25: round(air?.current?.pm2_5),
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

export async function fetchConditions(): Promise<ConditionsResponse> {
  const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
  weatherUrl.searchParams.set("latitude", conditionPoints.map(p => p.lat).join(","));
  weatherUrl.searchParams.set("longitude", conditionPoints.map(p => p.lng).join(","));
  weatherUrl.searchParams.set("current", "temperature_2m,apparent_temperature,wind_speed_10m,weather_code");
  weatherUrl.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_probability_max,wind_speed_10m_max,uv_index_max,sunrise,sunset");
  weatherUrl.searchParams.set("temperature_unit", "fahrenheit");
  weatherUrl.searchParams.set("wind_speed_unit", "mph");
  weatherUrl.searchParams.set("timezone", "auto");
  weatherUrl.searchParams.set("forecast_days", "16");

  // Batched current air quality (one request), same multi-location shape as the
  // weather call. Used as a real-time wildfire-smoke read.
  const airUrl = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  airUrl.searchParams.set("latitude", conditionPoints.map(p => p.lat).join(","));
  airUrl.searchParams.set("longitude", conditionPoints.map(p => p.lng).join(","));
  airUrl.searchParams.set("current", "us_aqi,pm2_5");
  airUrl.searchParams.set("timezone", "auto");

  const [weatherRaw, airRaw, ...alertsList] = await Promise.all([
    fetchJson<OpenMeteoForecast | OpenMeteoForecast[]>(weatherUrl.toString()),
    fetchJson<AirQualityResponse | AirQualityResponse[]>(airUrl.toString()),
    ...conditionPoints.map(p => fetchJson<NwsAlerts>(`https://api.weather.gov/alerts/active?point=${p.lat},${p.lng}`)),
  ]);

  // Open-Meteo returns an array for multi-location requests, an object for one.
  const weathers: (OpenMeteoForecast | undefined)[] = Array.isArray(weatherRaw)
    ? weatherRaw
    : weatherRaw
      ? [weatherRaw]
      : [];
  const airs: (AirQualityResponse | undefined)[] = Array.isArray(airRaw)
    ? airRaw
    : airRaw
      ? [airRaw]
      : [];

  return {
    generatedAt: new Date().toISOString(),
    forecastCoverageNote:
      "Open-Meteo provides a rolling 16-day forecast, so the July 22-31 trip dates will fill in as they enter range. NWS alerts and air quality are current conditions, not long-range predictions.",
    points: conditionPoints.map((p, i) => buildResult(p, weathers[i], alertsList[i], airs[i])),
    sources: [
      { label: "Open-Meteo forecast API", url: "https://open-meteo.com/en/docs" },
      { label: "Open-Meteo air quality API", url: "https://open-meteo.com/en/docs/air-quality-api" },
      { label: "National Weather Service API", url: "https://www.weather.gov/documentation/services-web-api" },
      { label: "NIFC fire maps", url: "https://www.nifc.gov/fire-information/maps" },
    ],
  };
}
