# I-80 Main Route with Colorado Contingency — Design

**Date:** 2026-07-18
**Status:** Approved in conversation; pending spec review

## Why

New weather guidance (heat, fire, and precipitation outlooks for late July 2026) favors
an I-80 → I-15 routing over both current options:

- Avoids the Colorado West Slope / Glenwood Canyon wildfire-smoke-flood choke point.
- Avoids northern New Mexico and Arizona, where July fire potential is above normal
  and flash flooding is seasonally concentrated.
- Less time in the hotter Southern Plains than an I-40 / Route 66 trip.
- Open Wyoming terrain makes storms easier to see and route around than canyons.

The key structural insight: the trip doesn't need to pick I-80 vs I-70 until the
evening of **July 26 in Kearney, NE** — both western options share the first five
nights. So the app changes from "two separate competing routes" to **one plan with a
shared trunk and a decision point**: a Wyoming main branch and a Colorado weather
backup that fork west of Kearney and converge at Cedar City.

The old Rockies-via-KC/Moab and Route 66 routes are **replaced entirely** (git history
keeps them).

## The itinerary

Depart **Jul 22**, arrive Del Mar **Jul 30** — 9 driving days ("9 gentle days" was
chosen over forcing 8; no day over ~430 mi). User asked for 8 "if possible"; 9 was
explicitly approved because 8 required a 480–560 mi day with a 3.5-year-old and a dog
in July heat.

| Day | Date   | Segment | Overnight | ~mi | ~hrs |
|-----|--------|---------|-----------|-----|------|
| 1 | Jul 22 | Trunk | State College, PA | 310 | 5.25 |
| 2 | Jul 23 | Trunk | Cleveland, OH | 250 | 4 |
| 3 | Jul 24 | Trunk | Chicago, IL | 345 | 5.25 |
| 4 | Jul 25 | Trunk | Des Moines, IA | 333 | 5 |
| 5 | Jul 26 | Trunk | **Kearney, NE** — fork decided tonight | 320 | 4.75 |
| 6 | Jul 27 | WY main / CO backup | Laramie, WY / Golden, CO | 365 / 365 | ~5.5 |
| 7 | Jul 28 | WY main / CO backup | Park City, UT / Glenwood Springs, CO | 385 / 160 | ~5.5 / 2.75 |
| 8 | Jul 29 | WY main / CO backup | Cedar City, UT (both converge) | 255 / 370 | 3.75 / 5.5 |
| 9 | Jul 30 | Shared | Del Mar, CA | 430 | 6.5 |

Mileage/hours are estimates from the design conversation; verify against a mapping
source during implementation and correct the data (do not silently keep these numbers
if they're off by more than ~10%).

## Data model — Approach A: two Routes sharing Day objects

Keep the existing `Route` / `Day` / `Stop` / `Hotel` types and the `RouteSwitcher` UI.
No new types for "branches."

- **Day objects:** `trunk-day-1` … `trunk-day-5`, `wy-day-6` … `wy-day-8`,
  `co-day-6` … `co-day-8`, `final-day-9`. Trunk and final days are single objects
  referenced by both routes (edit once, both branches update). Branch days share
  `num` values 6–8 across branches — this is fine; `routeDays(route)` resolves via
  `route.dayIds`, and nothing keys days by `num` globally.
- **Routes:**
  - `wyoming` — name "Wyoming — main plan", tagline positions it as the weather-first
    default. `dayIds`: trunk 1–5 + wy 6–8 + final 9. Color `terra` (primary route).
  - `colorado` — name "Colorado — weather backup", tagline positions it as the more
    scenic contingency taken only if conditions allow. `dayIds`: trunk 1–5 + co 6–8 +
    final 9. Color `blue`.
  - `strengths` / `cautions` / `recommendation` fields carry the decision guidance
    (below) in condensed form.
- **Why not alternatives:** an explicit `branches` model (B) adds new types and UI for
  no user-visible gain; two fully independent routes (C) duplicates the trunk and
  loses the shared-nights truth. A reuses the existing two-route map comparison for
  free — the "other" branch renders as the comparison line automatically.

### Rejected/approved alternatives (record)

- 8-day variants (merge East or merge West) — rejected for pace.
- Grand Canyon detour — rejected; too hot for hiking, off the I-15 line.
- Parks stop-in (Zion shuttle morning) — rejected for the same heat reason. Instead:
  **drive-up photo ops flagged along the route** (user's words: "reasonable stops with
  worthwhile photo ops, you should flag those").

## Stop philosophy — heat-first, Americana-rich

It will be very hot; assume **no hiking**. Every stop must be one of: a drive-up
photo op (≤15 min in sun), an air-conditioned indoor thing, water play, or high
elevation. Outdoor stops slot early-morning or evening in the day summaries.

Each driving day aims for this kit (some days won't fill every slot — that's fine,
don't force filler stops):

1. **Marquee photo op** — drive-up, ≤15 min exposure.
2. **Americana / weird roadside** — `kind: "iconic"`, `category: "roadside-giant"`
   where it fits.
3. **Truly unique playground** — `category: "playground"`; prefer shaded or
   splash-pad; these are the toddler energy-burn stops.
4. **A/C or water/elevation cool-off** — museum, cave, dog beach, alpine overlook.
5. **Dog-friendly patio lunch** — `lunch: true`, one per day.

Candidate stops from the design conversation (all require verification during
implementation — confirm each exists, is open July 2026, is on/near the route, and
check dog policy; drop or replace any that fail):

- **Trunk:** Knoebels (free, tree-shaded amusement park, PA); Punxsutawney;
  Pymatuning "ducks walk on fish" spillway; Cleveland Edgewater dog beach;
  "A Christmas Story" house (A/C); Leaning Tower of Niles; Indiana Dunes;
  Cloud Gate + Maggie Daley Park + Montrose Dog Beach (Chicago); Iowa 80 World's
  Largest Truck Stop; Riverside, IA "Future Birthplace of Captain Kirk"; Pappajohn
  Sculpture Park + Union Park Heritage Carousel (Des Moines); Kearney Archway
  (indoor museum spanning I-80); Yanney Heritage Park splash pad (Kearney).
- **Wyoming branch:** Cheyenne Lions Park (lake + mini-train); Vedauwoo hoodoos;
  Ames Pyramid + giant Lincoln head (I-80 summit); UW Geological Museum (free, A/C);
  Little America ice cream; Park City Main Street (7,000 ft = cool evenings);
  Cedar Breaks 10,000-ft drive-up overlook (60s °F in July).
- **Colorado branch:** Red Rocks; Glenwood Caverns (52 °F caves); Glenwood Hot
  Springs; San Rafael Swell I-70 overlooks.
- **Final day:** Virgin River Gorge; Las Vegas A/C lunch; Seven Magic Mountains;
  Alien Fresh Jerky + Baker World's Tallest Thermometer; Peggy Sue's Diner.

Existing trunk-relevant stops in `julyTrip.ts` (e.g. `north-branford-ct`) are reused
where they fit; everything tied only to the old routes is removed.

## Hotels

One characterful, dog-friendly pick per overnight city, each with a dog-friendly
restaurant/bar inside or immediately nearby ("unique stays over chains" is a standing
family preference). Candidates from the conversation — same verification rule as
stops, and every pick gets `dogVerify: true` (policies re-confirmed, never trusted):

Cleveland Kimpton Schofield; Des Moines Surety Hotel (old bank); Golden The Golden
Hotel (over Clear Creek); Glenwood Springs Hotel Colorado (historic); Park City
Washington School House. Remaining cities (State College, Chicago, Kearney, Laramie,
Cedar City, Del Mar) get researched picks meeting the same bar. Kimpton properties
are a reliable fallback (pets free, no weight limit — the family flags weight limits).

`hotels` entries keyed by the new `hotelCity` values; `bookingGuides` rebuilt for the
new cities.

## The Kearney decision card

A card on the **Live tab** (and referenced from the Plan tab), rendered when viewing
either route, that explains the Jul 26 fork:

- **Default:** Wyoming branch (weather-first).
- **Take Colorado instead** only if, on the evening of Jul 26: I-70 fully open, air
  quality acceptable, and no Moderate/High excessive-rainfall outlook over western
  Colorado.
- **Fall back to Wyoming** if Colorado has a fire closure, heavy smoke, a significant
  canyon-flood forecast, or disruptive thunderstorms.
- **Reroute/delay thresholds** (don't reroute over a "Marginal"/"Slight" map label):
  active road closure/evacuation/fire on the highway; WPC Moderate or High
  excessive-rainfall risk over a mountain/canyon segment; active tornado warning or
  organized severe watch covering hours of the route; smoke producing unhealthy AQI
  at planned outdoor stops; heat warning combined with unreliable vehicle A/C.

The card links to the existing hazards board (both branches' condition points are
scanned — the safety system already takes `selectedRouteId`, so viewing either route
shows that branch's look-ahead; the card nudges checking both before deciding). No
new alerting logic — this is a static-content card wired to existing tab navigation,
mirroring how `SafetyBanner`'s "see all" jump works.

## Weather / safety wiring

- `conditionPoints` rebuilt for the new overnight cities: State College, Cleveland,
  Chicago, Des Moines, Kearney, Laramie, Golden, Glenwood Springs, Park City,
  Cedar City, Del Mar. (`conditionPointIdForDay` binds by nearest overnight stop —
  no code change needed, just data.)
- `SafetyBanner`, hazards board, and arrival-date forecasts keep working unchanged;
  they key off `route.dayIds` and condition-point proximity.

## UI changes (small)

- `RouteSwitcher`: relabel copy — it's now "main plan / weather backup", not two
  competing trips. Keep the switch interaction as-is.
- Kearney decision card component (Live tab).
- Home/hero copy in `Home.tsx` (day count, total miles, route naming) updated.
- No layout or navigation changes otherwise.

## What gets removed

- `route66Days` and all old `days` entries; old `Route` objects.
- Stops referenced only by the old routes (Moab, Grand Canyon, St. George, Amarillo,
  Tulsa, Albuquerque, KC, Indianapolis, Pittsburgh, etc.).
- Old `hotels` / `bookingGuides` entries for dropped cities.
- Old `conditionPoints` for dropped cities.
- `trip.ts` keeps the type definitions; its stale seed data is removed if nothing
  imports it (verify importers first — currently only `julyTrip.ts` re-exports the
  types).

## Error handling

Unchanged — the app is static; weather fetches already degrade gracefully. Data
integrity is the risk surface here (see testing).

## Testing / verification

- `npx tsc --noEmit` and `npx vite build` pass.
- Data-integrity assertions (extend the existing pattern if present, otherwise a
  quick script): every `stopIds` entry resolves to a stop; every `hotelCity` has a
  `hotels` entry; every day has exactly one `lunch` stop among its stops or a stated
  exception; both routes' `dayIds` resolve; trunk/final day objects are referenced by
  both routes; every overnight city has a condition point within 50 mi.
- Browser pass at 390 px: both routes render, map draws trunk + both branches
  correctly (selected route solid, other as comparison), decision card renders and
  its links navigate, day cards open, stop links valid.
- Stop/hotel verification: every new stop and hotel pick confirmed against a real
  source (official site) with `sources` populated — same bar as the existing 22
  verified stops.
- Service worker: bump `VERSION` in `client/public/sw.js` (app-shell data changes).
- `STATUS.md` updated after implementation.
