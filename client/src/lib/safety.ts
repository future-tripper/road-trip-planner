import type { ConditionResult } from "./conditions";

// The three things the family is most worried about — tornadoes, flooding, and
// wildfire — plus severe storms that spawn them. We surface WARNINGS and WATCHES
// (imminent / likely), not lower advisories, to keep the banner high-signal.
export interface Hazard {
  kind: "tornado" | "flood" | "fire" | "storm" | "smoke";
  label: string;
  city: string;
  severity: "warning" | "watch";
  url?: string;
}

const MATCHERS: { kind: Hazard["kind"]; re: RegExp }[] = [
  { kind: "tornado", re: /tornado/i },
  { kind: "flood", re: /flood/i },
  { kind: "fire", re: /red flag|fire weather/i },
  { kind: "storm", re: /severe thunderstorm/i },
];

export const HAZARD_EMOJI: Record<Hazard["kind"], string> = {
  tornado: "🌪️",
  flood: "🌊",
  fire: "🔥",
  storm: "⛈️",
  smoke: "🌫️",
};

export function collectHazards(points: ConditionResult[]): Hazard[] {
  const seen = new Set<string>();
  const out: Hazard[] = [];
  for (const p of points) {
    for (const a of p.alerts ?? []) {
      const ev = a.event ?? "";
      const m = MATCHERS.find(x => x.re.test(ev));
      if (!m || !/warning|watch/i.test(ev)) continue;
      const key = `${p.id}:${ev}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        kind: m.kind,
        label: ev,
        city: p.name,
        severity: /warning/i.test(ev) ? "warning" : "watch",
        url: a.url,
      });
    }
    const aqi = p.airQuality?.usAqi;
    if (aqi != null && aqi >= 151) {
      out.push({
        kind: "smoke",
        label: `Unhealthy air — AQI ${aqi} (possible wildfire smoke)`,
        city: p.name,
        severity: "warning",
      });
    }
  }
  return out.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "warning" ? -1 : 1));
}

export interface AqiBand {
  label: string;
  level: "good" | "moderate" | "usg" | "unhealthy" | "veryUnhealthy" | "hazardous";
}

export function aqiBand(aqi: number | null | undefined): AqiBand | null {
  if (aqi == null) return null;
  if (aqi <= 50) return { label: "Good", level: "good" };
  if (aqi <= 100) return { label: "Moderate", level: "moderate" };
  if (aqi <= 150) return { label: "Unhealthy for sensitive groups", level: "usg" };
  if (aqi <= 200) return { label: "Unhealthy", level: "unhealthy" };
  if (aqi <= 300) return { label: "Very unhealthy", level: "veryUnhealthy" };
  return { label: "Hazardous", level: "hazardous" };
}

// Forward-looking official risk outlooks — days ahead, before an active warning
// is even issued. Deep links (always authoritative, nothing to maintain).
export const OUTLOOK_LINKS: { label: string; detail: string; url: string }[] = [
  {
    label: "Severe storm & tornado outlook",
    detail: "SPC · days 1–8",
    url: "https://www.spc.noaa.gov/products/outlook/",
  },
  {
    label: "Excessive-rain & flash-flood outlook",
    detail: "WPC · days 1–5",
    url: "https://www.wpc.ncep.noaa.gov/qpf/excessive_rainfall_outlook_hi-res.php",
  },
  {
    label: "Fire-weather outlook",
    detail: "SPC · days 1–8",
    url: "https://www.spc.noaa.gov/products/fire_wx/",
  },
  {
    label: "Live wildfire & smoke map",
    detail: "NIFC / AirNow",
    url: "https://fire.airnow.gov/",
  },
];
