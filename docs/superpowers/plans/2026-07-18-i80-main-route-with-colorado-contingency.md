# I-80 Main Route with Colorado Contingency — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the app's two competing routes with one plan: a shared 5-night trunk (North Branford → Kearney), a Jul 26 fork into a Wyoming main branch or Colorado weather backup, converging at Cedar City and ending in Del Mar Jul 30.

**Architecture:** Pure data rewrite of `client/src/data/julyTrip.ts` (stops, days, routes, hotels, booking guides, condition points) using the existing `Route`/`Day`/`Stop` types — the two new `Route` objects literally share the trunk and final `Day` objects. Plus a new data-integrity script, a Kearney decision card in the Live tab, and small copy updates. No new types, no layout changes.

**Tech Stack:** TypeScript + React + Vite (static build), tsx for scripts. No test framework exists in this repo — the data-integrity script and `tsc`/`vite build` are the automated gates; final task is a browser pass.

**Spec:** `docs/superpowers/specs/2026-07-18-i80-main-route-with-colorado-contingency-design.md` — read it before starting. The itinerary table, stop-kit rules, and decision thresholds there are normative.

## Global Constraints

Every task's requirements implicitly include this section.

**Commands (run from repo root):**
- Typecheck: `npx tsc --noEmit` — expect no output, exit 0.
- Data check: `npm run check:data` — expect `Data checks passed…`, exit 0 (exists after Task 1).
- Build: `npx vite build` — expect `✓ built`, exit 0.
- Dev server: `PORT=5599 npm run dev` (port 5000 is taken by macOS AirPlay).

**Research/verification bar (every new stop and hotel):**
- Confirm via web research (WebSearch/WebFetch) that the place exists, is open in July 2026 (or seasonal note added), and is on/near the route (≤ ~20 min off-highway unless flagged `optional`).
- Populate `sources` with ≥1 real URL (official site preferred). Never invent URLs — only ones you actually found.
- Any claim a dog depends on (patio allowed, dogs on grounds) → set `dogVerify: true`. Interiors that don't allow dogs → `photoOnly: true` or an explicit `dogNote` saying who waits where.
- Candidate lists in tasks are candidates, not commitments: verify each; drop or replace any that fail. Don't force filler — a day may leave kit slots empty.
- Get coordinates from your research (map page / official site), 4 decimal places.
- Verify each day's `miles`/`hours` against a mapping source; correct the spec's estimate if off by >10%.

**Data conventions (new data):**
- Route IDs: `WYOMING = "wyoming-i80-main"`, `COLORADO = "colorado-i70-backup"`, `NEW_BOTH = [WYOMING, COLORADO]`. Stops on the trunk/final day use `routeIds: NEW_BOTH`; branch-only stops use `[WYOMING]` or `[COLORADO]`.
- Day IDs: `trunk-day-1`…`trunk-day-5`, `wy-day-6`…`wy-day-8`, `co-day-6`…`co-day-8`, `final-day-9`. Branch days share `num` 6–8 — that's fine, nothing keys days by `num` globally.
- Overnight-city stops: `kind: "overnight"`, `city` set exactly equal to the day's `hotelCity`, `state` set.
- `hotelCity` strings (exact): `State College`, `Cleveland`, `Chicago`, `Des Moines`, `Kearney`, `Laramie`, `Park City`, `Golden`, `Glenwood Springs`, `Cedar City`, `Del Mar`.
- Each day: `stopIds` starts with the previous day's overnight stop and ends with tonight's overnight stop; exactly one stop with `lunch: true` per day.
- Stop kit per day (from spec): marquee photo op (≤15 min sun) · Americana/weird roadside · unique playground (shaded/splash preferred) · A/C-or-water/elevation cool-off · dog-patio lunch. Outdoor stops framed as early-morning/evening in the day `summary`.
- Optional detours: `optional: true` on the stop, listed in the route's `bonusStopIds`, NOT in any day's `stopIds` (existing app behavior: bonus stops render as map markers off the polyline).
- Copy voice: match existing entries — short, concrete, heat/dog/toddler-aware (read 3–4 existing stops in `julyTrip.ts` first).

**Commits:** one per task minimum. End commit messages with:
```
Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Rjp4CfAjmHxdhwt5pHqhn5
```

## File Structure

- `script/check-data.ts` — **create** (Task 1). Data-integrity assertions; the automated gate for every data task.
- `package.json` — **modify** (Task 1): add `check:data` script.
- `client/src/data/julyTrip.ts` — **modify** (Tasks 2–8). Single data file (existing pattern, kept). New data is added alongside old, old data deleted in the Task 8 swap.
- `client/src/components/Planner.tsx` — **modify** (Tasks 9–10): `KearneyDecisionCard` component + copy tweaks.
- `client/src/components/TripMap.tsx` — **modify** (Task 10): legend label.
- `client/src/pages/Home.tsx`, `client/index.html`, `client/public/sw.js`, `STATUS.md` — **modify** (Task 10).

---

### Task 1: Data-integrity script

**Files:**
- Create: `script/check-data.ts`
- Modify: `package.json` (scripts block, lines 6–12)
- Modify: `client/src/data/julyTrip.ts` (add one export near the top, after the `BOTH` constant around line 27)

**Interfaces:**
- Consumes: existing exports of `julyTrip.ts` (`allDays`, `conditionPoints`, `hotels`, `routes`, `stops`, types `Day`, `Route`, `Stop`).
- Produces: `npm run check:data` gate; `pendingDayGroups: Day[][]` export in `julyTrip.ts` that Tasks 2–5 register new day arrays into (deleted in Task 8). Deep checks skip the two legacy route IDs so the script passes on every intermediate commit.

- [ ] **Step 1: Add the pending-days export to `julyTrip.ts`**

After the `const BOTH = [ROCKIES, ROUTE66];` line:

```ts
// Days for the new I-80 plan, validated by script/check-data.ts while they're
// being authored, before the routes swap over. Removed when the swap lands.
export const pendingDayGroups: Day[][] = [];
```

- [ ] **Step 2: Write `script/check-data.ts`**

```ts
// Data-integrity checks for the trip data. Run: npm run check:data
// Deep checks are skipped for the legacy routes (they're being replaced);
// the LEGACY set and pendingDayGroups plumbing are deleted in the swap task.
import {
  allDays, conditionPoints, hotels, pendingDayGroups, routes, stops,
  type Day, type Route,
} from "../client/src/data/julyTrip";

const stopById = new Map(stops.map(s => [s.id, s]));
const dayById = new Map(allDays.map(d => [d.id, d]));
const LEGACY = new Set(["rockies-utah-grand-canyon-10", "route66-grand-canyon-10"]);
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

function checkRoute(route: Route, deep: boolean) {
  const seq: Day[] = [];
  for (const id of route.dayIds) {
    const d = dayById.get(id);
    if (!d) { fail(`${route.id}: unknown day "${id}"`); continue; }
    seq.push(d);
  }
  if (!deep) return;
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
  for (const bid of route.bonusStopIds ?? []) if (!stopById.has(bid)) fail(`${route.id}: unknown bonus stop "${bid}"`);
}

for (const r of routes) checkRoute(r, !LEGACY.has(r.id));
for (const group of pendingDayGroups) for (const d of group) checkDay(d);

// Fork-model shape, once the new routes are live.
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
console.log(`Data checks passed: ${routes.map(r => r.id).join(", ")}; ${pendingDayGroups.length} pending group(s)`);
```

- [ ] **Step 3: Add the npm script**

In `package.json` scripts block, after `"check": "tsc",`:

```json
    "check:data": "tsx script/check-data.ts",
```

- [ ] **Step 4: Run gates**

Run: `npm run check:data` → expect `Data checks passed: rockies-utah-grand-canyon-10, route66-grand-canyon-10; 0 pending group(s)`, exit 0. (Legacy routes get shallow checks only, so this must pass as-is; if a shallow check fails, the legacy data has a broken reference — fix it.)
Run: `npx tsc --noEmit` → clean.

- [ ] **Step 5: Commit**

```bash
git add script/check-data.ts package.json client/src/data/julyTrip.ts
git commit -m "Add data-integrity check script (npm run check:data)"
```

---

### Task 2: Trunk days 1–2 — stops + day objects (State College, Cleveland)

**Files:**
- Modify: `client/src/data/julyTrip.ts` — new constants next to the old ones (~line 24); new stops appended at the end of the `stops` array; new `trunkDays` array after the `pendingDayGroups` export.

**Interfaces:**
- Consumes: `pendingDayGroups` (Task 1); existing stop `north-branford-ct`; types `Day`, `Stop`.
- Produces: constants `WYOMING`, `COLORADO`, `NEW_BOTH`; `export const trunkDays: Day[]` containing `trunk-day-1`, `trunk-day-2`; overnight stops with ids `state-college-pa` (city `State College`) and `cleveland-oh` (city `Cleveland`). Tasks 3–5 and 8 depend on these exact ids.

- [ ] **Step 1: Add the new route-ID constants**

Next to `const ROCKIES/ROUTE66/BOTH`:

```ts
const WYOMING = "wyoming-i80-main";
const COLORADO = "colorado-i70-backup";
const NEW_BOTH = [WYOMING, COLORADO];
```

- [ ] **Step 2: Research the legs, select stops**

Day 1 — North Branford, CT → State College, PA (spec estimate 310 mi / 5.25 h via I-84/I-81/I-80; verify). Day 2 — State College → Cleveland, OH (250 mi / 4 h; verify). Research each candidate against the Global-Constraints bar; drop/replace failures; fill the stop kit for each day. Candidates from the spec conversation:

- Day 1: Knoebels (free-admission, tree-shaded amusement park, Elysburg PA — unique-playground slot); a dog-patio lunch you find en route (Scranton/Bloomsburg area); State College arrival ideas (The Creamery at Penn State — famous ice cream; Tudek Park playground).
- Day 2: Punxsutawney (Phil's Burrow at the library — Americana; short detour south of I-80 at DuBois); Pymatuning Spillway "ducks walk on the fish" (Linesville PA — weird-Americana + photo op); Cleveland arrival: "A Christmas Story" House (A/C, leg lamp photo; dogs likely not inside → `photoOnly` or dogNote), Edgewater Park dog beach on Lake Erie (evening cool-off).

- [ ] **Step 3: Author the stops**

Append to the `stops` array. Every stop follows this worked example's completeness (all these fields, real researched values):

```ts
{
  id: "knoebels-pa",
  name: "Knoebels Amusement Resort",
  region: "Central Pennsylvania",
  kind: "iconic",
  lat: 40.8790, lng: -76.5030,
  blurb: "America's largest free-admission amusement park, under a canopy of old-growth trees — shade the whole visit, pay per ride.",
  practical: "Free parking and entry; buy a small ticket book for kiddie rides. The shade keeps it workable even on a hot afternoon.",
  tags: ["kid-friendly", "iconic", "nap-stop"],
  sources: [{ label: "Knoebels — plan your visit", url: "https://www.knoebels.com/" }],
  state: "PA",
  category: "playground",
  kidNote: "Kiddie rides section has a classic carousel; a 3.5-year-old clears most height limits there.",
  dogNote: "Pets are not allowed on rides or in ride queues — one adult walks the shaded grounds with the dog while the other rides.",
  dogVerify: true,
  timeNeeded: "1.5–2 hrs",
  routeIds: NEW_BOTH,
},
```

Overnight stops for State College and Cleveland must set `kind: "overnight"`, `city: "State College"` / `city: "Cleveland"`, and a blurb/practical in the existing overnight style (see `north-branford-ct`, old `pittsburgh-pa` for tone). Exactly one `lunch: true` stop per day.

Also update the reused `north-branford-ct` stop: change its `routeIds` to `NEW_BOTH` (it currently references the legacy `BOTH` constant, which Task 8 deletes).

- [ ] **Step 4: Author the day objects and register them**

After `pendingDayGroups`:

```ts
export const trunkDays: Day[] = [
  {
    id: "trunk-day-1",
    num: 1,
    title: "Jul 22: North Branford, CT to State College, PA",
    from: "North Branford, CT",
    to: "State College, PA",
    miles: 310,   // corrected to researched value
    hours: 5.25,  // corrected to researched value
    pace: "moderate",
    summary: "…written fresh: the day's arc, which stop is the lunch/energy-burn, what's morning vs evening…",
    weatherNote: "…heat framing for the day…",
    stopIds: ["north-branford-ct", /* researched stops in drive order */, "state-college-pa"],
    hotelCity: "State College",
  },
  // trunk-day-2 same shape: from State College, to Cleveland, hotelCity "Cleveland",
  // stopIds starting "state-college-pa" and ending "cleveland-oh".
];
```

Change the registration line to:

```ts
export const pendingDayGroups: Day[][] = [trunkDays];
```

- [ ] **Step 5: Run gates**

`npx tsc --noEmit` clean; `npm run check:data` → `…; 1 pending group(s)`, exit 0.

- [ ] **Step 6: Commit**

```bash
git add client/src/data/julyTrip.ts
git commit -m "I-80 trunk days 1-2: State College and Cleveland legs (verified stops)"
```

---

### Task 3: Trunk days 3–5 — stops + day objects (Chicago, Des Moines, Kearney)

**Files:**
- Modify: `client/src/data/julyTrip.ts` — stops appended; days appended to `trunkDays`.

**Interfaces:**
- Consumes: `trunkDays`, constants from Task 2; existing stop `cleveland-oh` from Task 2.
- Produces: `trunk-day-3`, `trunk-day-4`, `trunk-day-5` in `trunkDays`; overnight stops `chicago-il` (city `Chicago`), `des-moines-ia` (city `Des Moines`), `kearney-ne` (city `Kearney`). Task 4 and 5 both start from `kearney-ne`.

- [ ] **Step 1: Research the legs, select stops**

Day 3 — Cleveland → Chicago (345 mi / 5.25 h; verify). Day 4 — Chicago → Des Moines (333 mi / 5 h; verify). Day 5 — Des Moines → Kearney, NE (320 mi / 4.75 h; verify). Candidates:

- Day 3: Leaning Tower of Niles (half-scale Pisa, IL — Americana photo); Indiana Dunes National Park lakeshore (morning-flagged; dogs on most beaches — verify which); Chicago arrival: Cloud Gate "The Bean" (photo, early evening), Maggie Daley Park play garden (unique playground), Montrose Dog Beach (cool-off).
- Day 4: Iowa 80 World's Largest Truck Stop (Walcott IA — Americana + A/C + food); Riverside IA "Future Birthplace of Captain Kirk" (optional detour candidate); West Branch Herbert Hoover site (optional); Des Moines arrival: Pappajohn Sculpture Park (photo, evening walkable, dogs on leash — verify), Union Park Heritage Carousel (unique playground).
- Day 5: Elk Horn Danish Windmill (Americana, short detour); a dog-patio lunch around Omaha/Lincoln (research one); Kearney arrival: Great Platte River Road Archway (spans I-80, indoor A/C museum — the fork-eve landmark), Yanney Heritage Park splash pad + tower (unique playground/cool-off).

- [ ] **Step 2: Author the stops**

Same completeness bar as Task 2's worked example. Worked example for this task:

```ts
{
  id: "kearney-archway-ne",
  name: "The Archway (Great Platte River Road)",
  region: "Central Nebraska",
  kind: "iconic",
  lat: 40.6670, lng: -99.0400,
  blurb: "A museum bridge arched OVER I-80 — you drive under it, then walk the pioneer-trail exhibits in the A/C above the traffic.",
  practical: "Right at the Kearney exit; ~1 hr inside. This is the landmark for fork-decision night — Wyoming vs Colorado gets decided at dinner.",
  tags: ["kid-friendly", "iconic"],
  sources: [{ label: "The Archway", url: "https://archway.org/" }],
  state: "NE",
  category: "roadside-giant",
  kidNote: "Costumed-mannequin dioramas and headphone audio keep a preschooler moving through it.",
  dogNote: "Indoor museum — dogs wait out the visit; there's green space below for a leg stretch.",
  dogVerify: true,
  timeNeeded: "1 hr",
  routeIds: NEW_BOTH,
},
```

Optional-detour candidates that verify well (e.g. Riverside IA) get `optional: true` and are NOT placed in `stopIds` — hold their ids for Task 8's `bonusStopIds`.

- [ ] **Step 3: Author days 3–5, append to `trunkDays`**

Same `Day` shape as Task 2 Step 4, ids `trunk-day-3`/`trunk-day-4`/`trunk-day-5`, nums 3–5, dates Jul 24/25/26, chained stopIds (`cleveland-oh` → … → `chicago-il`, etc.). `trunk-day-5`'s summary must name the fork: tonight in Kearney you pick Wyoming (default) or Colorado (conditions permitting) — point at the Live tab.

- [ ] **Step 4: Run gates**

`npx tsc --noEmit` clean; `npm run check:data` exit 0 (still `1 pending group(s)` — same array, now 5 days).

- [ ] **Step 5: Commit**

```bash
git add client/src/data/julyTrip.ts
git commit -m "I-80 trunk days 3-5: Chicago, Des Moines, Kearney legs (verified stops)"
```

---

### Task 4: Wyoming branch days 6–8 — stops + day objects

**Files:**
- Modify: `client/src/data/julyTrip.ts` — stops appended; new `wyDays` array after `trunkDays`.

**Interfaces:**
- Consumes: `kearney-ne` stop (Task 3); constants (Task 2).
- Produces: `export const wyDays: Day[]` with `wy-day-6`/`wy-day-7`/`wy-day-8` (nums 6–8); overnight stops `laramie-wy` (city `Laramie`), `park-city-ut` (city `Park City`), `cedar-city-ut` (city `Cedar City`). **Task 5 reuses `cedar-city-ut` as day 9's start and may reuse this task's Kearney→Big Springs-stretch stops in `co-day-6`** — give I-80-shared stops (before the I-76 split at Big Springs, NE) `routeIds: NEW_BOTH`.

- [ ] **Step 1: Research the legs, select stops**

Day 6 — Kearney → Laramie, WY (365 mi / ~5.5 h; verify). Day 7 — Laramie → Park City, UT (385 mi / ~5.5 h; verify). Day 8 — Park City → Cedar City, UT (255 mi / 3.75 h; verify). Candidates:

- Day 6: Ole's Big Game Steakhouse & Lounge (Paxton NE — taxidermy Americana; dog patio? verify); Golden Spike Tower (North Platte — A/C tower over the world's largest rail yard); Cheyenne: Big Boy steam engine + Lions Park (lake, mini-train, playground); Wyoming State Capitol lawn (photo). Note: Paxton/North Platte are WEST of Kearney but EAST of Big Springs → `routeIds: NEW_BOTH` (Colorado branch passes them too).
- Day 7 (all `[WYOMING]`): Lincoln Highway giant Lincoln head + Ames Monument pyramid (I-80 Summit rest area between Cheyenne and Laramie — if research shows they fit better late Day 6, put them there); Vedauwoo hoodoos pull-off (photo, short walk from lot); UW Geological Museum, Laramie (free, A/C, dinosaur skeletons — morning); Little America WY travel-center ice cream (Americana); Park City arrival: Main Street evening stroll at 7,000 ft (cool; many dog-tolerant patios — verify one for the next morning).
- Day 8 (all `[WYOMING]` until Cedar City which is `NEW_BOTH`): Utah Olympic Park (Park City — morning); Cove Fort (historic waystation at the I-15/I-70 junction — also on the CO branch → `NEW_BOTH`); Cedar City arrival: Bicentennial splash pad / Main Street Park. Cedar Breaks 10,000-ft overlook (60s °F, drive-up) → `optional: true`, hold for `bonusStopIds`.

- [ ] **Step 2: Author the stops**

Same completeness bar as Task 2's example. Worked example:

```ts
{
  id: "vedauwoo-wy",
  name: "Vedauwoo Recreation Area",
  region: "Southeast Wyoming",
  kind: "scenic",
  lat: 41.1560, lng: -105.3770,
  blurb: "Billion-year-old granite blobs stacked like a giant's toy box, minutes off I-80 — the trip's best five-minute photo stop.",
  practical: "Paved access from exit 329; the overlook loop near the lot needs no real hiking. Elevation ~8,200 ft keeps it cool.",
  tags: ["scenic", "dog-friendly", "outdoor"],
  sources: [{ label: "US Forest Service — Vedauwoo", url: "https://www.fs.usda.gov/recarea/mbr/recarea/?recid=81869" }],
  state: "WY",
  category: "photo-stop",
  dogNote: "Dogs on leash welcome on the rocks and paths.",
  timeNeeded: "20–30 min",
  routeIds: [WYOMING],
},
```

- [ ] **Step 3: Author `wyDays`, register**

```ts
export const wyDays: Day[] = [ /* wy-day-6, wy-day-7, wy-day-8 — same Day shape as trunk,
  dates Jul 27/28/29, chained kearney-ne → laramie-wy → park-city-ut → cedar-city-ut */ ];
```

Update registration: `export const pendingDayGroups: Day[][] = [trunkDays, wyDays];`

- [ ] **Step 4: Run gates** — `npx tsc --noEmit` clean; `npm run check:data` exit 0, `2 pending group(s)`.

- [ ] **Step 5: Commit**

```bash
git add client/src/data/julyTrip.ts
git commit -m "Wyoming branch days 6-8: Laramie, Park City, Cedar City (verified stops)"
```

---

### Task 5: Colorado branch days 6–8 + shared final day 9

**Files:**
- Modify: `client/src/data/julyTrip.ts` — stops appended; `coDays` array + `finalDay` after `wyDays`.

**Interfaces:**
- Consumes: `kearney-ne`, `cedar-city-ut`, NEW_BOTH-flagged Nebraska stops (Task 4); existing stops `del-mar-ca` (id exists at ~line 427), `vail-pass-rest-area`, `two-rivers-glenwood` (reuse if they fit; update their `routeIds` to `[COLORADO]`).
- Produces: `export const coDays: Day[]` (`co-day-6`/`co-day-7`/`co-day-8`, nums 6–8); `export const finalDay: Day` (`final-day-9`, num 9); overnight stops `golden-co` (city `Golden`), `glenwood-springs-co` (city `Glenwood Springs`). Day 9 ends at `del-mar-ca` — update that stop: `kind: "overnight"`, `city: "Del Mar"`, `state: "CA"`, `routeIds: NEW_BOTH` (keep its existing blurb/sources unless research improves them).

- [ ] **Step 1: Research the legs, select stops**

co-day-6 — Kearney → Golden, CO via I-80/I-76 (365 mi / ~5.5 h; verify). co-day-7 — Golden → Glenwood Springs (160 mi / 2.75 h; verify). co-day-8 — Glenwood Springs → Cedar City (370 mi / ~5.5 h; verify). final-day-9 — Cedar City → Del Mar (430 mi / 6.5 h; verify). Candidates:

- co-day-6: reuse the shared Nebraska stops (Ole's, Golden Spike Tower); Golden arrival: Red Rocks Amphitheatre (drive-up photo, evening), Clear Creek History Park / creekside walk.
- co-day-7: Georgetown or Idaho Springs stroll (candidates); reuse `vail-pass-rest-area`; Glenwood arrival: Glenwood Caverns (52 °F caves + tram — dogs can't ride the tram, plan the split; verify), Glenwood Hot Springs or Two Rivers Park (reuse `two-rivers-glenwood`), Iron Mountain Hot Springs.
- co-day-8: San Rafael Swell / Eagle Canyon I-70 overlooks (photo pull-offs — pick the best 1–2 with real names); Cove Fort (reuse, `NEW_BOTH`); Cedar City arrival as Task 4.
- final-day-9 (all `NEW_BOTH`): Virgin River Gorge pull-off (Cedar Pocket rec area, AZ strip); a Las Vegas–area A/C lunch with dog-friendly patio (research one concrete pick — e.g. a Container Park-area patio; verify dog policy); Seven Magic Mountains (neon boulder stacks, S of Vegas — early, it's exposed); Alien Fresh Jerky (Baker) + World's Tallest Thermometer (photo); Peggy Sue's 50's Diner (Yermo — Americana; patio dog policy verify). Frame all desert stops ≤15 min in the summary; A/C is the day's spine.

- [ ] **Step 2: Author the stops**

Same completeness bar as Task 2's example. Worked example:

```ts
{
  id: "seven-magic-mountains-nv",
  name: "Seven Magic Mountains",
  region: "Southern Nevada",
  kind: "iconic",
  lat: 35.8394, lng: -115.2710,
  blurb: "Seven neon-painted boulder totems, three stories tall, glowing against the desert — the trip's most surreal photo.",
  practical: "Ten minutes off I-15 south of Vegas. Zero shade: go before 9am or keep it to a 10-minute photo, water for everyone.",
  tags: ["iconic", "scenic"],
  sources: [{ label: "Seven Magic Mountains", url: "https://sevenmagicmountains.com/" }],
  state: "NV",
  category: "photo-stop",
  dogNote: "Open desert site, dogs on leash fine — but the ground is griddle-hot by midday; paws need morning timing.",
  timeNeeded: "15 min",
  routeIds: NEW_BOTH,
},
```

- [ ] **Step 3: Author `coDays` + `finalDay`, register**

```ts
export const coDays: Day[] = [ /* co-day-6..8, dates Jul 27/28/29, chained
  kearney-ne → golden-co → glenwood-springs-co → cedar-city-ut */ ];

export const finalDay: Day = {
  id: "final-day-9",
  num: 9,
  title: "Jul 30: Cedar City to Del Mar — the desert run",
  from: "Cedar City, UT",
  to: "Del Mar, CA",
  miles: 430,   // corrected to researched value
  hours: 6.5,   // corrected to researched value
  pace: "long",
  summary: "…leave at dawn, Virgin River Gorge, Vegas A/C lunch, quick Baker/Yermo Americana hits, beach by dinner…",
  weatherNote: "…the hottest day of the trip; every stop is short or air-conditioned…",
  stopIds: ["cedar-city-ut", /* researched stops */, "del-mar-ca"],
  hotelCity: "Del Mar",
};
```

Update registration: `export const pendingDayGroups: Day[][] = [trunkDays, wyDays, coDays, [finalDay]];`

- [ ] **Step 4: Run gates** — `npx tsc --noEmit` clean; `npm run check:data` exit 0, `4 pending group(s)`.

- [ ] **Step 5: Commit**

```bash
git add client/src/data/julyTrip.ts
git commit -m "Colorado branch days 6-8 + shared final desert day (verified stops)"
```

---

### Task 6: Hotels + booking guides — trunk cities

**Files:**
- Modify: `client/src/data/julyTrip.ts` — new entries appended to `hotels` and `bookingGuides` arrays.

**Interfaces:**
- Consumes: `picks(city, state)` helper, `source()` helper, `BookingGuide`/`BookingItem` shapes (top of file); city strings from Global Constraints.
- Produces: `hotels` + `bookingGuides` entries for `State College` (PA), `Cleveland` (OH), `Chicago` (IL), `Des Moines` (IA), `Kearney` (NE). Task 8's swap requires every new `hotelCity` to have a `hotels` entry.

- [ ] **Step 1: Research one characterful dog-friendly pick per city**

Bar: dog sleeps in the room (family rule — flag any weight limit explicitly), unique/interesting property over a chain, dog-friendly restaurant/bar inside or immediately nearby. Verify pet policy on the property's own site; `dogVerify` semantics apply (in `BookingItem.note`, state "confirm pet policy at booking"). Candidates: State College — Graduate State College or The Nittany Lion Inn; Cleveland — Kimpton Schofield (Kimpton: pets free, no weight limit); Chicago — a Kimpton (Gray / Monaco) or Hotel Lincoln; Des Moines — Surety Hotel (1913 bank building); Kearney — honest fallback if nothing unique verifies (say so in `hotelStrategy`; Best Western Plus Mid-Nebraska Inn-class is acceptable here).

- [ ] **Step 2: Author the entries**

`hotels` entry pattern (matches existing):

```ts
{
  city: "Cleveland",
  state: "OH",
  notes: "Night 2. Downtown puts you walkable to East 4th patios; Edgewater dog beach is a 10-minute drive for the evening cool-off.",
  picks: picks("Cleveland", "OH"),
},
```

`bookingGuides` entry carries the unique pick, with `unique: true` and a real source URL:

```ts
{
  city: "Cleveland",
  headline: "…one line on why this night works…",
  hotelStrategy: "…unique pick first, chain fallback logic second, weight-limit warnings…",
  hotelTargets: [
    { name: "Kimpton Schofield Hotel", note: "1902 clock-tower building; Kimpton pets stay free, no weight limit — confirm at booking.", source: source("Kimpton Schofield pet policy", "…researched URL…"), unique: true },
    // + 1–2 fallbacks
  ],
  foodDrink: [ /* 2–3 researched dog-patio options near the hotel */ ],
  logistics: [ /* parking / check-in realities you found */ ],
  attractionNotes: [ /* tie-ins to that day's stops */ ],
},
```

- [ ] **Step 3: Run gates** — `npx tsc --noEmit` clean; `npm run check:data` exit 0.

- [ ] **Step 4: Commit**

```bash
git add client/src/data/julyTrip.ts
git commit -m "Hotels + booking guides for the five trunk cities"
```

---

### Task 7: Hotels + booking guides — western cities

**Files:**
- Modify: `client/src/data/julyTrip.ts` — `hotels` + `bookingGuides` entries appended.

**Interfaces:**
- Consumes: same helpers/shapes as Task 6.
- Produces: `hotels` + `bookingGuides` entries for `Laramie` (WY), `Park City` (UT), `Golden` (CO), `Glenwood Springs` (CO), `Cedar City` (UT), `Del Mar` (CA). (A Del Mar entry may already exist from the old data — if so, refresh it in place rather than duplicating; `hotels` must end up with exactly one entry per city.)

- [ ] **Step 1: Research picks** — same bar as Task 6. Candidates: Laramie — research (few boutiques; a verified dog-friendly downtown option or honest fallback); Park City — Washington School House (flag price; give a realistic fallback), Marriott/Kimpton-class alternates; Golden — The Golden Hotel (on Clear Creek, walk to downtown patios); Glenwood Springs — Hotel Colorado (1893 historic, Teddy Roosevelt lore); Cedar City — research (Big Yellow Inn-class B&B if dog policy verifies, else fallback); Del Mar — keep/refresh existing guidance (arrival night, family destination).

- [ ] **Step 2: Author entries** — same shapes as Task 6 Step 2 (hotels entry + bookingGuides entry per city, unique pick flagged `unique: true`, weight limits called out).

- [ ] **Step 3: Run gates** — `npx tsc --noEmit` clean; `npm run check:data` exit 0.

- [ ] **Step 4: Commit**

```bash
git add client/src/data/julyTrip.ts
git commit -m "Hotels + booking guides for the six western cities"
```

---

### Task 8: Condition points, routes swap, old-data removal

This is the cut-over commit: after it, the app shows only the new plan.

**Files:**
- Modify: `client/src/data/julyTrip.ts` (routes, conditionPoints, deletions)
- Modify: `script/check-data.ts` (delete legacy plumbing)

**Interfaces:**
- Consumes: everything Tasks 2–7 produced.
- Produces: `routes` = exactly `[wyoming, colorado]`; `days`/`allDays` = the 10 new Day objects; `conditionPoints` for the 11 new cities; no legacy exports (`route66Days`, `pendingDayGroups`, old constants) remain. UI tasks 9–10 run against this state.

- [ ] **Step 1: Replace `conditionPoints`**

```ts
export const conditionPoints: ConditionPoint[] = [
  { id: "state-college", name: "State College", routeIds: NEW_BOTH, lat: 40.7934, lng: -77.8600 },
  { id: "cleveland", name: "Cleveland", routeIds: NEW_BOTH, lat: 41.4993, lng: -81.6944 },
  { id: "chicago", name: "Chicago", routeIds: NEW_BOTH, lat: 41.8781, lng: -87.6298 },
  { id: "des-moines", name: "Des Moines", routeIds: NEW_BOTH, lat: 41.5868, lng: -93.6250 },
  { id: "kearney", name: "Kearney", routeIds: NEW_BOTH, lat: 40.6993, lng: -99.0817 },
  { id: "laramie", name: "Laramie", routeIds: [WYOMING], lat: 41.3114, lng: -105.5911 },
  { id: "park-city", name: "Park City", routeIds: [WYOMING], lat: 40.6461, lng: -111.4980 },
  { id: "golden", name: "Golden", routeIds: [COLORADO], lat: 39.7555, lng: -105.2211 },
  { id: "glenwood-springs", name: "Glenwood Springs", routeIds: [COLORADO], lat: 39.5505, lng: -107.3248 },
  { id: "cedar-city", name: "Cedar City", routeIds: NEW_BOTH, lat: 37.6775, lng: -113.0619 },
  { id: "del-mar", name: "Del Mar", routeIds: NEW_BOTH, lat: 32.9595, lng: -117.2653 },
];
```

- [ ] **Step 2: Replace `routes`, `days`, `allDays`**

```ts
export const days: Day[] = [...trunkDays, ...wyDays, ...coDays, finalDay];
export const allDays: Day[] = days;

export const routes: Route[] = [
  {
    id: WYOMING,
    name: "Wyoming — main plan",
    tagline: "The weather-first default: I-80 west, I-15 south",
    totalMiles: 0, // set to the sum of this route's day miles
    totalDays: 9,
    description: "North Branford → State College → Cleveland → Chicago → Des Moines → Kearney → Laramie → Park City → Cedar City → Del Mar. Open Wyoming terrain instead of canyon choke points: storms are easier to see and route around, and it skips the Southwest's above-normal July fire zones.",
    dayIds: [...trunkDays.map(d => d.id), ...wyDays.map(d => d.id), finalDay.id],
    comparisonStopIds: [...trunkDays, ...wyDays, finalDay].flatMap(d => d.stopIds),
    bonusStopIds: [ /* this route's optional-detour stop ids from Tasks 3–5 */ ],
    overnightCities: ["State College", "Cleveland", "Chicago", "Des Moines", "Kearney", "Laramie", "Park City", "Cedar City", "Del Mar"],
    strengths: ["Avoids Glenwood Canyon's fire/smoke/flood choke point", "Open terrain — storms visible and routable", "Cooler high-elevation nights in Laramie and Park City", "Same first five nights as the Colorado option"],
    cautions: ["Nebraska heat, Wyoming wind/hail t-storms still possible", "Utah fire potential is elevated", "The I-15 desert final day is unavoidable either way"],
    recommendation: "The default. Commit in Kearney on the evening of Jul 26 unless Colorado's forecast is clearly ordinary.",
    color: "terra",
  },
  {
    id: COLORADO,
    name: "Colorado — weather backup",
    tagline: "The scenic branch, taken only if conditions are ordinary",
    totalMiles: 0, // set to the sum of this route's day miles
    totalDays: 9,
    description: "Same first five nights, then Kearney → Golden → Glenwood Springs → Cedar City → Del Mar via I-76/I-70. More spectacular — Red Rocks, Glenwood Canyon, the San Rafael Swell — but it runs the canyon segment the main plan exists to avoid.",
    dayIds: [...trunkDays.map(d => d.id), ...coDays.map(d => d.id), finalDay.id],
    comparisonStopIds: [...trunkDays, ...coDays, finalDay].flatMap(d => d.stopIds),
    bonusStopIds: [ /* this route's optional-detour stop ids */ ],
    overnightCities: ["State College", "Cleveland", "Chicago", "Des Moines", "Kearney", "Golden", "Glenwood Springs", "Cedar City", "Del Mar"],
    strengths: ["The scenery play: Rockies, Glenwood Canyon, red rock", "Short recovery day into Glenwood (~160 mi)", "Hot-springs cool-off built in"],
    cautions: ["Take ONLY if on Jul 26: I-70 fully open, AQI acceptable, no Moderate/High excessive-rainfall outlook over western Colorado", "Glenwood Canyon can close with little notice"],
    recommendation: "The reward branch if the Jul 26 forecast is boring. Any doubt → Wyoming.",
    color: "blue",
  },
];
```

- [ ] **Step 3: Delete old data**

- Delete the old `days` array contents (rockies days), `route66Days`, old `routes` entries, `ROCKIES`/`ROUTE66`/`BOTH` constants, `pendingDayGroups` and the `trunkDays`-era registration comment.
- Delete every stop not referenced by any new day's `stopIds` or either route's `bonusStopIds`. Find them mechanically: temporarily add to `check-data.ts` (or run as a one-off) a pass that prints `stops.filter(s => !referenced.has(s.id))`, then delete those objects. Keep `north-branford-ct`, `del-mar-ca`, and any reused stops.
- Delete old `hotels`/`bookingGuides` entries for dropped cities (Pittsburgh, Indianapolis, Kansas City, St. Louis, Tulsa / Catoosa, Amarillo, Albuquerque / Santa Fe, Flagstaff / Holbrook, Williams / Tusayan / Flagstaff, Moab, St. George, Denver / Golden, Palm Springs / Temecula — everything not in the 11-city list).
- In `script/check-data.ts`: delete the `LEGACY` set (and pass `true` for deep unconditionally), the `pendingDayGroups` import and its loop.
- Search for stragglers: `grep -n "rockies\|route66\|ROCKIES\|ROUTE66\|pendingDayGroups" client/src script/ -r` → only historical comments may remain; delete those too.

- [ ] **Step 4: Set real `totalMiles`**

Run `npm run check:data` — the totalMiles assertion will print the day sums; set both routes' `totalMiles` to their sums.

- [ ] **Step 5: Run all gates**

`npx tsc --noEmit` clean; `npm run check:data` → `Data checks passed: wyoming-i80-main, colorado-i70-backup` (deep checks + fork-shape check now active for both), exit 0; `npx vite build` succeeds. Quick sanity: `PORT=5599 npm run dev`, load `http://localhost:5599`, confirm the app renders with the two new routes and no console errors (stale localStorage route ids fall back safely — `state.tsx:94-97` validates against `routes`).

- [ ] **Step 6: Commit**

```bash
git add client/src/data/julyTrip.ts script/check-data.ts
git commit -m "Cut over to I-80 plan: routes swap, condition points, legacy data removed"
```

---

### Task 9: Kearney decision card (Live tab + Plan-tab pointer)

**Files:**
- Modify: `client/src/components/Planner.tsx` — new component + two insertions.

**Interfaces:**
- Consumes: `ConditionsPane` (Planner.tsx:1359, post-Task-8 line numbers will have shifted — locate by name), `SavedPane`, `useTrip()` (`setPlannerTab`), existing section styling idioms.
- Produces: `KearneyDecisionCard` rendered at the top of `ConditionsPane` (after the `conditions-note` div); a one-line pointer in `SavedPane`. `data-testid="kearney-decision-card"` for the browser pass.

- [ ] **Step 1: Add the component (place it above `ConditionsPane`)**

```tsx
// The Jul 26 fork: decided in Kearney the night before the western branches split.
// Static guidance card — the live signals it references are the hazards board below it.
function KearneyDecisionCard() {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border bg-card p-3" data-testid="kearney-decision-card">
      <div className="flex items-center gap-1.5 text-[13px] uppercase tracking-[0.12em] text-muted-foreground">
        <Signpost className="h-3.5 w-3.5" /> The Kearney decision — evening of Jul 26
      </div>
      <p className="mt-1.5 text-xs text-foreground/90">
        Both branches share the first five nights. In Kearney, pick:
        <strong> Wyoming (default)</strong> unless Colorado is clearly ordinary —
        I-70 fully open, acceptable air quality, and no Moderate/High
        excessive-rainfall outlook over western Colorado.
      </p>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        data-testid="button-decision-thresholds"
        className="mt-2 inline-flex items-center gap-1 text-[13px] text-primary hover:underline"
      >
        {open ? "Hide" : "Show"} reroute/delay thresholds
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-foreground/90">
          <li>Don't reroute over a "Marginal" or "Slight" label on a big regional map.</li>
          <li>Do change or delay for: an active road closure, evacuation order, or fire incident on the highway.</li>
          <li>A WPC Moderate or High excessive-rainfall risk over a mountain or canyon segment.</li>
          <li>An active tornado warning, or an organized severe-weather watch covering hours of the route.</li>
          <li>Smoke pushing air quality to unhealthy around planned outdoor stops.</li>
          <li>A heat warning combined with unreliable vehicle A/C.</li>
        </ul>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Check the hazards board below for both branches before deciding — switch the
        trip plan above to compare Wyoming vs Colorado look-aheads.
      </p>
    </div>
  );
}
```

Add `Signpost` to the existing `lucide-react` import (verify the icon name exists in the installed version; `Milestone` is the fallback).

- [ ] **Step 2: Render it in `ConditionsPane`**

Insert `<KearneyDecisionCard />` immediately after the `data-testid="conditions-note"` div, before the "Conditions for" header row.

- [ ] **Step 3: Add the Plan-tab pointer**

In `SavedPane`, after its `PaneHeader`, insert:

```tsx
<button
  type="button"
  onClick={() => setPlannerTab("conditions")}
  data-testid="link-kearney-decision"
  className="flex w-full items-center gap-1.5 border-b border-border px-3 py-2 text-left text-xs text-primary hover-elevate"
>
  <Signpost className="h-3.5 w-3.5" /> Wyoming or Colorado? The Jul 26 Kearney go/no-go lives on the Live tab →
</button>
```

(`SavedPane` must destructure `setPlannerTab` from `useTrip()` — add it if absent.)

- [ ] **Step 4: Run gates** — `npx tsc --noEmit` clean; `npx vite build` succeeds; dev-server spot-check: Live tab shows the card, thresholds toggle works, Plan-tab pointer jumps to Live.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/Planner.tsx
git commit -m "Kearney decision card: Jul 26 fork guidance on the Live tab"
```

---

### Task 10: Copy, legend, service worker, STATUS.md

**Files:**
- Modify: `client/src/components/Planner.tsx` (RouteSwitcher label), `client/src/components/TripMap.tsx` (legend), `client/src/pages/Home.tsx` (dates), `client/index.html` (meta description), `client/public/sw.js` (VERSION), `STATUS.md`.

**Interfaces:**
- Consumes: post-swap route names from data (RouteSwitcher renders them automatically — only static labels change here).
- Produces: user-facing copy consistent with "one plan, two branches".

- [ ] **Step 1: RouteSwitcher label** — in `RouteSwitcher` (Planner.tsx, locate `>Route<`): change the `Route` section label to `Trip plan`.

- [ ] **Step 2: Map legend** — `grep -n "Comparison route" client/src/components/TripMap.tsx`, change that label to `Other branch`.

- [ ] **Step 3: Home dates** — in `Home.tsx` header: `July 22-31` → `July 22-30`.

- [ ] **Step 4: index.html meta description** — replace the existing `<meta name="description" …>` content with: `An interactive I-80 family road trip planner from Connecticut to Del Mar, California — Wyoming main route, Colorado weather backup, dog- and toddler-friendly stops.`

- [ ] **Step 5: Service worker** — `client/public/sw.js:13`: `const VERSION = "v1";` → `"v2"`.

- [ ] **Step 6: STATUS.md** — rewrite the Completed/Decisions/Artifacts sections to describe the new single-plan-with-fork model, the Kearney decision card, the check-data script, and the spec/plan paths. Keep the Dev & Deploy section.

- [ ] **Step 7: Run gates** — `npx tsc --noEmit`; `npx vite build`.

- [ ] **Step 8: Commit**

```bash
git add client/src/components/Planner.tsx client/src/components/TripMap.tsx client/src/pages/Home.tsx client/index.html client/public/sw.js STATUS.md
git commit -m "Copy for the single-plan model, sw bump, STATUS refresh"
```

---

### Task 11: Full verification pass + deploy gate

**Files:** none new — fixes only if the pass finds problems.

**Interfaces:**
- Consumes: the complete app.
- Produces: verified deployable state. **Do not push without the user's go-ahead** (push = live deploy to the family's phones).

- [ ] **Step 1: Automated gates** — `npx tsc --noEmit` && `npm run check:data` && `npx vite build`, all exit 0.

- [ ] **Step 2: Browser pass at 390×844** (dev server on port 5599; Playwright browser tools or the webapp-testing skill):
  - Map view: trunk polyline + selected branch solid, other branch as comparison line; markers cluster sensibly on both branches.
  - Trip-plan switcher: both cards show new names/taglines; switching updates map + days; day 1 auto-selects.
  - Itinerary: all 9 days per route; day cards open; every stop card renders (no missing names/blurbs); source links are real URLs.
  - Drive tab: shows a day with lunch stop + weather block.
  - Book tab: 11 cities, unique picks visible with `unique` styling.
  - Live tab: Kearney decision card renders, thresholds expand; hazards board populates (or shows the clean-state message); no console errors.
  - Plan tab: pointer link jumps to Live.
  - Fresh-profile check: clear site localStorage, reload — defaults to the Wyoming route, nothing crashes.
- [ ] **Step 3: Screenshot** the map + itinerary + decision card at phone width for the user.
- [ ] **Step 4: Fix anything found, re-run gates, commit fixes.**
- [ ] **Step 5: Ask the user** to approve pushing to `main` (auto-deploys via GitHub Pages in ~40s). Push only on their yes.
