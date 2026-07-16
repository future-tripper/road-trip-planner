# Project Status — Pathfinder Road Trip Planner

**Updated:** 2026-07-16

Family road-trip planner web app for a Connecticut → Del Mar, CA drive (July 22–31, 2026) with a ~3.5-year-old and a dog. Two route options (Rockies+Utah+Grand Canyon; Historic Route 66+Grand Canyon). Live PWA at https://future-tripper.github.io/road-trip-planner/ — GitHub Pages, auto-deploys on push to `main`.

## Completed (recent work)

- **Arrival-date weather** — the Live tab and Drive card show each day's forecast for the date you'll be in that city (not today's), with heat/UV/wind/rain flags and a sunrise/sunset dog-walk window. `client/src/lib/conditions.ts`, `client/src/lib/forecast.ts`.
- **Fire / flood / tornado safety** — route-wide NWS-alert + air-quality scan. Collapsible "today & tomorrow" banner (persists, keyed to the hazard set), a full "hazards ahead" board and count badge on the Live tab, NOAA outlook deep-links, and links to the readable NWS point pages. `client/src/lib/safety.ts` + `SafetyBanner`/`ConditionsPane`/`Tabs` in `client/src/components/Planner.tsx`.
- **22 new verified stops** across both routes (interesting playgrounds, scenic pull-offs, dog-patio cafes, Americana kitsch), deduped and wired into day itineraries. `client/src/data/julyTrip.ts`.
- **Mobile usability** — route picker collapses so the day fills the screen; the map now frames the current day's leg (fixed a Leaflet world-zoom bug via ResizeObserver + deferred fit); removed the day-level "Map drive" button and the day re-anchor control.
- **Full code review** (build/typecheck/data-integrity + a browser pass + three independent logic reviewers) → fixed 5 issues: alert-severity read from a truncated list, a Leaflet map leak on unmount, hazard double-count on multi-night stays, map-marker popup flash-close, and a missing NWS "Fire Warning" match. Latest commit `be06d2c`.

## Decisions

- **Fully static, no backend.** Weather / alerts / AQI are fetched client-side, so it hosts free on GitHub Pages and works offline (PWA). The Express server in `server/` is a dev-only leftover, not deployed.
- **Safety banner is scoped to today + tomorrow** to avoid nagging about hazards 1,500 mi away; the whole-route look-ahead lives on the Live tab (badge + board).
- **Per-device state** — saved stops / notes / checklists live in `localStorage`, so each phone keeps its own plan.
- Public repo, accepted tradeoff (hometown + dates visible in data); site carries a `noindex` meta.

## Current Work

- None in flight. Everything built is committed, deployed, and verified.

## Blockers and Open Questions

- None. Note: weather/AQI/NWS data is live and time-varying; trip-date forecasts fill in as each date enters Open-Meteo's rolling 16-day window (all July 22–31 dates are in range now).

## Important Artifacts

- `client/src/data/julyTrip.ts` — all trip data (days, stops, hotels, `conditionPoints`).
- `client/src/lib/{conditions,forecast,safety}.ts` — weather + hazard logic.
- `client/src/components/Planner.tsx` — planner UI (tabs, safety banner, day cards).
- `client/src/components/TripMap.tsx` — Leaflet map (mount/fit/marker logic).
- `.github/workflows/deploy.yml` — the Pages deploy.

## Dev & Deploy

- Run locally: `PORT=5599 npm run dev` (port 5000 is taken by macOS AirPlay).
- Typecheck / build: `npx tsc --noEmit` / `npx vite build` (output `dist/public`).
- Deploy: push to `main` → the Actions workflow builds and publishes to Pages (~40s).
- Bump the `VERSION` constant in `client/public/sw.js` when service-worker caching behavior changes.

## Next Action

Nothing required — the app is complete and live for the July 22–31 trip. Possible follow-ups if asked: weave the new stops into the day-summary prose; add per-stop (not just per-city) hazard context; packing-list tweaks.

## Read First

1. This file.
2. `client/src/data/julyTrip.ts` — the trip data model.
3. `client/src/components/Planner.tsx` — the main UI.
