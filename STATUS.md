# Project Status — Pathfinder Road Trip Planner

**Updated:** 2026-07-19

Family road-trip planner web app for a Connecticut → Del Mar, CA drive (July 22–30, 2026) with a ~3.5-year-old and a dog. Live PWA at https://future-tripper.github.io/road-trip-planner/ — GitHub Pages, auto-deploys on push to `main`.

## Completed (recent work)

- **I-80 reroute — one plan with a fork, not two competing routes.** New weather guidance (heat, fire, and precipitation outlooks for late July 2026) argued against both of the old routes: the Colorado West Slope/Glenwood Canyon corridor carries wildfire-smoke-flood risk, and a Route 66/I-40 option runs through above-normal Southwest fire zones with more time in Southern Plains heat. The trip doesn't need to pick a western routing until the evening of **July 26 in Kearney, NE** — everything before that is shared. The app now models that as a single trip with a 5-night shared trunk (North Branford → State College → Cleveland → Chicago → Des Moines → Kearney), a decision point in Kearney, two western branches (`wyoming-i80-main`, terra, the weather-first default: Laramie → Park City → Cedar City; `colorado-i70-backup`, blue, the scenic backup taken only if conditions are ordinary: Golden → Glenwood Springs → Cedar City), and a shared final desert day into Del Mar on Jul 30. The two prior routes (northern Rockies+Utah+Grand Canyon and Historic Route 66) are removed from the data.
- **Kearney decision card** — a dedicated card on the Live tab (`KearneyDecisionCard` in `client/src/components/Planner.tsx`) surfaces the Jul 26 go/no-go with the threshold conditions for taking Colorado (I-70 fully open, acceptable AQI, no Moderate/High excessive-rainfall outlook over western Colorado) versus defaulting to Wyoming.
- **Data-integrity gate** — `script/check-data.ts`, run via `npm run check:data`, validates the trip data (day/stop cross-references, one-lunch-per-day rule with a documented exception set, distance sanity checks) against `client/src/data/julyTrip.ts`. This is a new local gate; it is not yet wired into CI.
- **67 verified stops across 11 hotel cities** in the rebuilt itinerary, replacing the old two-route stop set.
- **Copy pass for the single-plan model** (this task): the route picker's section label changed from "Route" to "Trip plan" (`Planner.tsx`), the map legend's "Comparison route" swatch is now labeled "Other branch" (`client/src/pages/Home.tsx` — the legend actually lives here, not in `TripMap.tsx`), the header date range is "July 22-30" (was "22-31"), the `index.html` meta description now describes the I-80/Wyoming-main/Colorado-backup framing instead of the old "northern route," and the service worker `VERSION` bumped `v1` → `v2` to force clients to pick up the new caches.
- Prior work (still in place, unchanged by the reroute): arrival-date weather on the Live tab and Drive card (`client/src/lib/conditions.ts`, `client/src/lib/forecast.ts`); fire/flood/tornado safety banner + full-route hazard board (`client/src/lib/safety.ts`, `SafetyBanner`/`ConditionsPane`/`Tabs` in `Planner.tsx`); mobile map/route-picker usability fixes.

## Decisions

- **Single plan, one fork, not two independent routes.** `routes` in `julyTrip.ts` still holds two `Route` entries (so the existing route-switcher/map-legend UI keeps working), but they now share the same trunk days and only diverge for the Jul 27–29 western leg — the data and copy both describe this as "one plan with a branch," not "pick a route at the start."
- **Fully static, no backend.** Weather / alerts / AQI are fetched client-side, so it hosts free on GitHub Pages and works offline (PWA). The Express server in `server/` is a dev-only leftover, not deployed.
- **Safety banner is scoped to today + tomorrow** to avoid nagging about hazards 1,500 mi away; the whole-route look-ahead lives on the Live tab (badge + board).
- **Per-device state** — saved stops / notes / checklists live in `localStorage`, so each phone keeps its own plan.
- Public repo, accepted tradeoff (hometown + dates visible in data); site carries a `noindex` meta.

## Current Work

- The I-80 reroute (routes, data, decision card, copy pass, data-integrity script) is complete on the `i80-reroute` branch and **not yet merged or pushed**. `main` still reflects the pre-reroute app.

## Blockers and Open Questions

- None technical. The reroute work needs to be merged to `main` before it deploys — GitHub Pages only auto-fires on push to `main`, so nothing above is live yet.
- Weather/AQI/NWS data is live and time-varying; trip-date forecasts fill in as each date enters Open-Meteo's rolling 16-day window.

## Important Artifacts

- `client/src/data/julyTrip.ts` — all trip data: shared trunk days, the two western branches, stops, hotels, `conditionPoints`, and the `routes` array (`wyoming-i80-main` / `colorado-i70-backup`).
- `client/src/lib/{conditions,forecast,safety}.ts` — weather + hazard logic.
- `script/check-data.ts` — data-integrity checks, run via `npm run check:data`.
- `client/src/components/Planner.tsx` — planner UI (tabs, safety banner, `KearneyDecisionCard`, day cards, route picker).
- `client/src/pages/Home.tsx` — header copy and map legend.
- `client/src/components/TripMap.tsx` — Leaflet map (mount/fit/marker logic).
- `docs/superpowers/specs/2026-07-18-i80-main-route-with-colorado-contingency-design.md` — the reroute design spec (rationale, structural model).
- `docs/superpowers/plans/2026-07-18-i80-main-route-with-colorado-contingency.md` — the implementation plan (task breakdown) this work executed against.
- `.github/workflows/deploy.yml` — the Pages deploy.

## Dev & Deploy

- Run locally: `PORT=5599 npm run dev` (port 5000 is taken by macOS AirPlay).
- Typecheck / build: `npx tsc --noEmit` / `npx vite build` (output `dist/public`).
- Data integrity: `npm run check:data`.
- Deploy: push to `main` → the Actions workflow builds and publishes to Pages (~40s). Work on `i80-reroute` will not deploy until it's merged/pushed to `main`.
- Bump the `VERSION` constant in `client/public/sw.js` when service-worker caching behavior changes (currently `v2`).

## Next Action

Merge/push `i80-reroute` to `main` to make the new I-80 plan live before the trip departs Jul 22. After that, no further work is required for the trip itself; possible follow-ups if asked: weave the new stops into day-summary prose, add per-stop hazard context, packing-list tweaks.

## Read First

1. This file.
2. `docs/superpowers/specs/2026-07-18-i80-main-route-with-colorado-contingency-design.md` — why the reroute happened and the shared-trunk-with-fork model.
3. `client/src/data/julyTrip.ts` — the trip data model.
4. `client/src/components/Planner.tsx` — the main UI, including the Kearney decision card.
