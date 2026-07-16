import { conditionPoints, stops, type Day } from "@/data/julyTrip";
import type { ConditionResult } from "./conditions";

// The trip is entirely in July 2026; day titles carry the date as "Jul 22: …".
const TRIP_YEAR = 2026;

export function dayDateISO(day: Day): string | null {
  const m = day.title.match(/Jul\s+(\d{1,2})/);
  if (!m) return null;
  return `${TRIP_YEAR}-07-${String(Number(m[1])).padStart(2, "0")}`;
}

export function dayDateLabel(day: Day): string | null {
  const iso = dayDateISO(day);
  if (!iso) return null;
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function haversineMi(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 3958.8;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const la1 = (aLat * Math.PI) / 180;
  const la2 = (bLat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// The condition point nearest a day's overnight (its last stop), so the weather
// we show is for where the family actually sleeps that night.
export function conditionPointIdForDay(day: Day): string | null {
  const overnight = stops.find(s => s.id === day.stopIds[day.stopIds.length - 1]);
  if (!overnight || !conditionPoints.length) return null;
  let best = conditionPoints[0].id;
  let bestD = Infinity;
  for (const p of conditionPoints) {
    const d = haversineMi(overnight.lat, overnight.lng, p.lat, p.lng);
    if (d < bestD) { bestD = d; best = p.id; }
  }
  return best;
}

export interface DayForecast {
  dateISO: string;
  label: string;
  max: number | null;
  min: number | null;
  feelsMax: number | null;
  precip: number | null;
  uv: number | null;
  windMax: number | null;
  sunrise: string | null;
  sunset: string | null;
  risk: "low" | "watch" | "high";
  reasons: string[];
}

// Pull the forecast for the exact date the family is at this stop. Returns null
// when that date isn't in the rolling 16-day window yet (i.e. still too far out).
export function forecastForDay(result: ConditionResult | undefined, day: Day): DayForecast | null {
  const iso = dayDateISO(day);
  const d = result?.daily;
  if (!iso || !d) return null;
  const i = d.dates.indexOf(iso);
  if (i < 0) return null;

  const max = d.max[i] ?? null;
  const feelsMax = d.feelsMax[i] ?? null;
  const uv = d.uv[i] ?? null;
  const windMax = d.windMax[i] ?? null;
  const precip = d.precip[i] ?? null;
  const heat = feelsMax ?? max ?? 0;

  const reasons: string[] = [];
  if (heat >= 100) reasons.push("Extreme heat — keep the dog off hot pavement and cap toddler time outside to short, shaded windows.");
  else if (heat >= 92) reasons.push("Hot — plan outdoor stops for early morning or evening.");
  if ((windMax ?? 0) >= 28) reasons.push("Windy — watch for crosswinds and blowing dust on open stretches.");
  if ((uv ?? 0) >= 8) reasons.push("High UV — hats, shade, and sunscreen.");
  if ((precip ?? 0) >= 60) reasons.push("High rain chance — check radar before setting out.");

  const high = heat >= 100 || (windMax ?? 0) >= 28;
  const risk: "low" | "watch" | "high" = high ? "high" : reasons.length ? "watch" : "low";

  return {
    dateISO: iso,
    label: dayDateLabel(day) ?? iso,
    max,
    min: d.min[i] ?? null,
    feelsMax,
    precip,
    uv,
    windMax,
    sunrise: d.sunrise[i] ?? null,
    sunset: d.sunset[i] ?? null,
    risk,
    reasons,
  };
}

function fmtTime(iso: string | null): string | null {
  if (!iso) return null;
  const t = iso.split("T")[1]; // Open-Meteo local time, e.g. "2026-07-22T05:52"
  if (!t) return null;
  const [hStr, mStr] = t.split(":");
  let h = Number(hStr);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${mStr ?? "00"} ${ampm}`;
}

export function dogWalkWindow(f: DayForecast | null): string | null {
  if (!f) return null;
  const sr = fmtTime(f.sunrise);
  const ss = fmtTime(f.sunset);
  if (!sr && !ss) return null;
  return `Sunrise ${sr ?? "—"}, sunset ${ss ?? "—"} · coolest walks at dawn and after sunset; peak heat ~1–5 PM.`;
}
