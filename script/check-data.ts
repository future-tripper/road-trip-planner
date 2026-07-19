// Data-integrity checks for the trip data. Run: npm run check:data
import {
  allDays, conditionPoints, hotels, routes, stops,
  type Day, type Route,
} from "../client/src/data/julyTrip";

const stopById = new Map(stops.map(s => [s.id, s]));
const dayById = new Map(allDays.map(d => [d.id, d]));
// New-plan days intentionally allowed to differ from the one-lunch rule.
const LUNCH_EXCEPTIONS = new Set<string>([]);

let failures = 0;
const fail = (msg: string) => { failures++; console.error("FAIL:", msg); };

function haversineMi(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 3958.8;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const la1 = (aLat * Math.PI) / 180;
  const la2 = (bLat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function checkDay(day: Day) {
  if (day.stopIds.length < 2) fail(`${day.id}: fewer than 2 stops`);
  for (const id of day.stopIds) if (!stopById.has(id)) fail(`${day.id}: unknown stop "${id}"`);
  const resolved = day.stopIds.map(id => stopById.get(id)).filter((s): s is NonNullable<typeof s> => !!s);
  const lunches = resolved.filter(s => s.lunch).length;
  if (lunches !== 1 && !LUNCH_EXCEPTIONS.has(day.id)) {
    fail(`${day.id}: ${lunches} lunch stops (want exactly 1)`);
  }
  const last = resolved[resolved.length - 1];
  if (last?.city && last.city !== day.hotelCity) {
    fail(`${day.id}: last stop city "${last.city}" !== hotelCity "${day.hotelCity}"`);
  }
  for (const s of resolved) {
    if (s.lat < 24 || s.lat > 50 || s.lng < -126 || s.lng > -65) fail(`${s.id}: coords out of range`);
  }
}

function checkRoute(route: Route) {
  const seq: Day[] = [];
  for (const id of route.dayIds) {
    const d = dayById.get(id);
    if (!d) { fail(`${route.id}: unknown day "${id}"`); continue; }
    seq.push(d);
  }
  for (const d of seq) {
    checkDay(d);
    if (!hotels.some(h => h.city === d.hotelCity)) fail(`${route.id}/${d.id}: no hotels entry for "${d.hotelCity}"`);
    const overnight = stopById.get(d.stopIds[d.stopIds.length - 1]);
    if (overnight && !conditionPoints.some(p => haversineMi(overnight.lat, overnight.lng, p.lat, p.lng) <= 50)) {
      fail(`${route.id}/${d.id}: no condition point within 50 mi of ${overnight.id}`);
    }
  }
  for (let i = 1; i < seq.length; i++) {
    const prevLast = seq[i - 1].stopIds[seq[i - 1].stopIds.length - 1];
    if (seq[i].stopIds[0] !== prevLast) {
      fail(`${route.id}: ${seq[i].id} first stop "${seq[i].stopIds[0]}" !== previous overnight "${prevLast}"`);
    }
  }
  const sumMiles = seq.reduce((a, d) => a + d.miles, 0);
  if (Math.abs(sumMiles - route.totalMiles) > 25) {
    fail(`${route.id}: totalMiles ${route.totalMiles} !== day sum ${sumMiles}`);
  }
  if (route.totalDays !== seq.length) fail(`${route.id}: totalDays ${route.totalDays} !== ${seq.length} days`);
  for (const bid of route.bonusStopIds ?? []) {
    const s = stopById.get(bid);
    if (!s) { fail(`${route.id}: unknown bonus stop "${bid}"`); continue; }
    if (!s.optional) fail(`${route.id}: bonus stop "${bid}" is not marked optional`);
  }
}

for (const r of routes) checkRoute(r);

// Optional (bonus/detour) stops are off-polyline map extras — they should
// never also be listed as a core stop on any day's drive.
for (const d of allDays) {
  for (const id of d.stopIds) {
    const s = stopById.get(id);
    if (s?.optional) fail(`${d.id}: optional stop "${id}" appears in day stopIds`);
  }
}

// Fork-model shape: both routes share the trunk (nights 1-5) and the final day.
const wy = routes.find(r => r.id === "wyoming-i80-main");
const co = routes.find(r => r.id === "colorado-i70-backup");
if (wy && co) {
  const shared = wy.dayIds.filter(id => co.dayIds.includes(id));
  const expected = ["trunk-day-1", "trunk-day-2", "trunk-day-3", "trunk-day-4", "trunk-day-5", "final-day-9"];
  if (shared.join(",") !== expected.join(",")) {
    fail(`shared days [${shared.join(",")}] !== trunk 1-5 + final-day-9`);
  }
}

if (failures > 0) { console.error(`\n${failures} data check(s) failed`); process.exit(1); }
console.log(`Data checks passed: ${routes.map(r => r.id).join(", ")}`);
