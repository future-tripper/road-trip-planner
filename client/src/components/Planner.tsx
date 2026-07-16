import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTrip } from "@/lib/state";
import { fetchConditions, type ConditionResult, type ConditionsResponse } from "@/lib/conditions";
import { conditionPointIdForDay, dogWalkWindow, forecastForDay } from "@/lib/forecast";
import {
  allDays,
  bookingGuides,
  hotels,
  routes,
  stops,
  type BookingItem,
  type Day,
  type Route,
  type Stop,
  type Tag,
} from "@/data/julyTrip";
import {
  Bone, Mountain, Sparkles, Trees, Bed, UtensilsCrossed, Baby, Clock,
  Sun, X, ExternalLink, Check, Plus, ChevronRight, MapPin, Trash2, Hotel,
  Flame, CloudSun, AlertTriangle, Wind, RefreshCw, Dog, Martini, MapPinned, CarFront,
  ChevronDown,
} from "lucide-react";

const TAG_DEFS: { tag: Tag; label: string; Icon: any }[] = [
  { tag: "kid-friendly", label: "Kids", Icon: Baby },
  { tag: "dog-friendly", label: "Dog OK", Icon: Bone },
  { tag: "scenic",       label: "Scenic", Icon: Mountain },
  { tag: "iconic",       label: "Iconic", Icon: Sparkles },
  { tag: "outdoor",      label: "Outdoor", Icon: Trees },
  { tag: "lodging",      label: "Lodging", Icon: Bed },
  { tag: "food-break",   label: "Food", Icon: UtensilsCrossed },
  { tag: "nap-stop",     label: "Nap", Icon: Sun },
  { tag: "long-day",     label: "Long day", Icon: Clock },
  { tag: "easy-day",     label: "Easy day", Icon: Sun },
];

type PlannerTab = "drive" | "days" | "stops" | "hotels" | "conditions" | "saved";

export function Planner() {
  const [tab, setTab] = useState<PlannerTab>("drive");
  const { selectedPlaceId, selectedRouteId, activeDayId, setActiveDayId } = useTrip();

  // When a place is selected, keep the active day synced to the day that contains it
  // (within the current route). This drives the Drive/Itinerary/Map "jump to day" behavior.
  useEffect(() => {
    if (!selectedPlaceId) return;
    const route = routes.find(r => r.id === selectedRouteId) ?? routes[0];
    const day = findDayForStopInRoute(selectedPlaceId, route);
    if (day && day.id !== activeDayId) setActiveDayId(day.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlaceId, selectedRouteId]);

  return (
    <aside
      className="flex h-full min-h-0 flex-col overflow-hidden border-l border-border bg-card"
      data-testid="planner-panel"
    >
      <RouteSwitcher />
      <Tabs tab={tab} setTab={setTab} />
      <SelectedPlaceBar tab={tab} setTab={setTab} />

      <div className="scroll-pane flex-1 min-h-0 overflow-y-auto">
        {tab === "drive" && <DrivePane />}
        {tab === "days"  && <DaysPane />}
        {tab === "stops" && <StopsPane />}
        {tab === "hotels"&& <HotelsPane />}
        {tab === "conditions" && <ConditionsPane />}
        {tab === "saved" && <SavedPane />}
      </div>
    </aside>
  );
}

// The overnight/booking city a stop belongs to (for the “Show booking options” jump).
function cityForStop(stop: Stop): string | undefined {
  if (stop.city) return stop.city;
  // Fallback: if this stop is itself an overnight city with a matching hotel, use its name.
  if (hotels.some(h => h.city === stop.name)) return stop.name;
  return undefined;
}

// Find the day (within a route) that contains a given stop id.
function findDayForStopInRoute(stopId: string, route: Route): Day | undefined {
  const dayList = routeDays(route);
  return dayList.find(d => d.stopIds.includes(stopId));
}

// The booking city that actually has hotel/guide coverage for a selected stop.
// Priority:
//  1. The stop's own city if it has booking coverage (Blue Slide -> Pittsburgh, Thunder Junction -> St. George).
//  2. The containing day's hotelCity (Grand Canyon's city has no coverage -> Williams/Tusayan/Flagstaff).
//  3. A self-match for stops that ARE an overnight city.
// Only returns a city that has real booking coverage.
function bookingCityForStop(stop: Stop, route: Route): string | undefined {
  const hasCoverage = (city?: string) =>
    !!city && (bookingGuides.some(g => g.city === city) || hotels.some(h => h.city === city));
  const own = cityForStop(stop);
  if (hasCoverage(own)) return own;
  const day = findDayForStopInRoute(stop.id, route);
  if (hasCoverage(day?.hotelCity)) return day!.hotelCity;
  return undefined;
}

// Haversine distance in miles between two stops.
function milesBetween(a: Stop, b: Stop): number {
  const R = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Stops related to the selected one, ranked: same city, then same day, then nearest on the route.
function relatedStops(selected: Stop, route: Route, limit = 6): { stop: Stop; reason: string }[] {
  const routeStopIds = Array.from(new Set(routeDays(route).flatMap(d => d.stopIds)));
  const pool = routeStopIds
    .map(id => stops.find(s => s.id === id))
    .filter((s): s is Stop => !!s && s.id !== selected.id);
  const day = findDayForStopInRoute(selected.id, route);
  const dayIds = new Set(day?.stopIds ?? []);
  const scored = pool.map(s => {
    const sameCity = !!selected.city && s.city === selected.city;
    const sameDay = dayIds.has(s.id);
    const dist = milesBetween(selected, s);
    // lower score = closer to top
    let score = dist;
    if (sameCity) score -= 100000;
    else if (sameDay) score -= 50000;
    const reason = sameCity
      ? `Same city · ${selected.city}`
      : sameDay
        ? `Same day · Day ${day?.num}`
        : `${Math.round(dist)} mi away`;
    return { stop: s, reason, score };
  });
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, limit).map(({ stop, reason }) => ({ stop, reason }));
}

// Compact one-row context bar shown across all tabs when a place is selected.
// Deliberately small: it never dominates vertical space. Rich per-place context
// now lives inside each tab (Drive/Itinerary/All stops/Book/Plan).
function SelectedPlaceBar({ tab, setTab }: { tab: PlannerTab; setTab: (t: PlannerTab) => void }) {
  const { selectedPlaceId, setSelectedPlaceId, selectedRouteId } = useTrip();
  if (!selectedPlaceId) return null;
  const stop = stops.find(s => s.id === selectedPlaceId);
  if (!stop) return null;

  const route = routes.find(r => r.id === selectedRouteId) ?? routes[0];
  const day = findDayForStopInRoute(stop.id, route);
  const bookingCity = bookingCityForStop(stop, route);
  const website = stop.website ?? stop.sources[0]?.url;
  const locationLabel = `${stop.city ?? stop.region}${stop.state ? `, ${stop.state}` : ""}`;

  // Only surface a jump chip for tabs the selected place is NOT already on,
  // so the bar stays a single compact row.
  return (
    <div
      className="shrink-0 border-b border-border bg-primary/5 px-3 py-2"
      data-testid="selected-place-bar"
    >
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              className="truncate font-serif text-sm font-semibold"
              data-testid="text-selected-place-name"
              title={stop.name}
            >
              {stop.name}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] leading-tight text-muted-foreground">
            <span className="truncate" data-testid="text-selected-place-location">{locationLabel}</span>
            {day && (
              <span className="inline-flex items-center gap-1" data-testid="text-selected-place-day">
                <CarFront className="h-3 w-3" /> Day {day.num}
              </span>
            )}
            {stop.timeNeeded && (
              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {stop.timeNeeded}</span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <a
            href={googleMapsSearch(`${stop.name} ${stop.region}`)}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="link-selected-place-map"
            aria-label="Open in Google Maps"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background hover-elevate"
          >
            <MapPin className="h-3.5 w-3.5" />
          </a>
          {website && (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-selected-place-website"
              aria-label="Open website"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background hover-elevate"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <button
            type="button"
            onClick={() => setSelectedPlaceId(null)}
            data-testid="button-clear-selected-place"
            aria-label="Clear selected place"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background hover-elevate"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* One compact row of tab jumps — omit the tab you're already on. */}
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {tab !== "drive" && day && (
          <JumpChip onClick={() => setTab("drive")} testid="chip-jump-drive" Icon={CarFront} label={`Drive · Day ${day.num}`} />
        )}
        {tab !== "days" && (
          <JumpChip onClick={() => setTab("days")} testid="chip-jump-days" Icon={MapPinned} label="Itinerary" />
        )}
        {tab !== "stops" && (
          <JumpChip onClick={() => setTab("stops")} testid="chip-jump-stops" Icon={Sparkles} label="Nearby stops" />
        )}
        {tab !== "hotels" && bookingCity && (
          <JumpChip onClick={() => setTab("hotels")} testid="chip-jump-hotels" Icon={Bed} label={`Book ${bookingCity}`} />
        )}
      </div>
    </div>
  );
}

function JumpChip({ onClick, testid, Icon, label }: { onClick: () => void; testid: string; Icon: any; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testid}
      className="inline-flex max-w-full items-center gap-1 truncate rounded-full border border-border bg-background px-2.5 py-1 text-[11px] hover-elevate"
    >
      <Icon className="h-3 w-3 shrink-0" /> <span className="truncate">{label}</span>
    </button>
  );
}

function RouteSwitcher() {
  const { selectedRouteId, setSelectedRouteId, setActiveDayId } = useTrip();
  // Collapsed on phones so the day fills the screen; always open on desktop (lg).
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(false);
  const active = routes.find(r => r.id === selectedRouteId) ?? routes[0];
  const colorFor = (color?: string) => {
    if (color === "purple") return "hsl(276 34% 42%)";
    if (color === "terra") return "hsl(var(--accent))";
    return "hsl(200 40% 38%)";
  };
  return (
    <div className="shrink-0 border-b border-border">
      {/* Compact header — tap to expand on mobile; the route picker is always open on desktop */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        data-testid="button-toggle-route-picker"
        className="flex w-full items-center justify-between gap-3 p-3 text-left hover-elevate lg:pointer-events-none"
      >
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Route</div>
          <div className="mt-0.5 flex items-center gap-2 text-sm font-semibold" data-testid="text-selected-route-compact">
            <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorFor(active.color) }} />
            <span className="truncate">{active.name}</span>
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground lg:hidden">
          {open ? "Done" : "Change"}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {/* Route cards + notes: hidden on mobile until expanded, always shown on desktop */}
      <div className={`${open ? "block" : "hidden"} px-3 pb-3 lg:block`}>
        <div className="grid gap-2 sm:grid-cols-2" data-testid="route-comparison-list">
          {routes.map(route => {
            const selected = selectedRouteId === route.id;
            return (
              <button
                key={route.id}
                type="button"
                onClick={() => {
                  setSelectedRouteId(route.id);
                  setActiveDayId(route.dayIds[0] ?? null);
                }}
                data-testid={`button-route-${route.id}`}
                className={`rounded-md border px-3 py-2 text-left hover-elevate ${
                  selected ? "border-primary bg-primary/10" : "border-border bg-background"
                }`}
                aria-pressed={selected}
              >
                <div className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorFor(route.color) }} />
                  <span className="min-w-0 whitespace-normal font-sans text-[13px] font-semibold leading-snug tracking-normal">{route.name}</span>
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{route.tagline}</div>
              </button>
            );
          })}
        </div>
        {active && (
          <div className="mt-2 rounded-md border border-border bg-background/70 p-2.5" data-testid="text-alt-route-blurb">
            <div className="flex items-start justify-between gap-2">
              <p className={`text-xs text-foreground/85 ${notes ? "" : "line-clamp-2"}`}>
                {notes ? active.description : (active.recommendation ?? active.description)}
              </p>
              <button
                type="button"
                onClick={() => setNotes(v => !v)}
                data-testid="button-toggle-route-details"
                aria-expanded={notes}
                className="shrink-0 rounded-md border border-border bg-background px-2 py-1 text-[11px] hover-elevate"
              >
                {notes ? "Less" : "More"}
              </button>
            </div>
            {notes && (
              <>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <RouteMiniList title="Why it works" items={active.strengths ?? []} />
                  <RouteMiniList title="Watch-outs" items={active.cautions ?? []} />
                </div>
                {active.recommendation && (
                  <p className="mt-3 rounded border border-accent/30 bg-accent/10 px-2 py-1.5 text-xs text-foreground">
                    <strong>Assessment:</strong> {active.recommendation}
                  </p>
                )}
                {active.overnightCities && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Overnight anchors: {active.overnightCities.join(" → ")}
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RouteMiniList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{title}</div>
      <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] text-foreground/80">
        {items.map(item => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}

function Tabs({ tab, setTab }: { tab: string; setTab: (t: any) => void }) {
  const items: { id: any; label: string; testid: string }[] = [
    { id: "drive",  label: "Drive", testid: "tab-drive" },
    { id: "days",   label: "Itinerary", testid: "tab-days" },
    { id: "stops",  label: "All stops", testid: "tab-stops" },
    { id: "hotels", label: "Book", testid: "tab-hotels" },
    { id: "conditions", label: "Live", testid: "tab-conditions" },
    { id: "saved",  label: "Plan", testid: "tab-saved" },
  ];
  return (
    <nav className="flex border-b border-border" role="tablist" aria-label="Planner views">
      {items.map(it => (
        <button
          key={it.id} type="button" role="tab" aria-selected={tab === it.id}
          data-testid={it.testid}
          onClick={() => setTab(it.id)}
          className={`flex-1 px-3 py-2.5 text-xs font-medium hover-elevate ${tab === it.id ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}
        >
          {it.label}
        </button>
      ))}
    </nav>
  );
}

function googleMapsSearch(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function DrivePane() {
  const { activeDayId, setActiveDayId, selectedRouteId, selectedPlaceId } = useTrip();
  const { data: conditions } = useQuery<ConditionsResponse>({ queryKey: ["conditions"], queryFn: fetchConditions });
  const selectedRoute = routes.find(r => r.id === selectedRouteId) ?? routes[0];
  const daysForRoute = routeDays(selectedRoute);
  const selectedDay = daysForRoute.find(d => d.id === activeDayId) ?? daysForRoute[0];
  const selectedStop = selectedPlaceId ? stops.find(s => s.id === selectedPlaceId) : undefined;
  const selectedInThisDay = !!selectedStop && !!selectedDay && selectedDay.stopIds.includes(selectedStop.id);
  const dayIndex = Math.max(0, daysForRoute.findIndex(d => d.id === selectedDay?.id));
  const dayStops = selectedDay
    ? selectedDay.stopIds.map(id => stops.find(s => s.id === id)).filter((s): s is Stop => !!s)
    : [];
  // The designated lunch + energy-burn stop leads; kid/dog picks only render
  // when they are genuinely different stops (no triple-duplicate cards).
  const lunchStop = dayStops.find(s => s.lunch)
    ?? dayStops.find(s => s.tags.includes("food-break") && s.kind !== "overnight")
    ?? dayStops.find(s => s.kind === "city") ?? dayStops[1] ?? dayStops[0];
  const kidStop = dayStops.find(s => (s.category === "playground" || s.category === "kid-museum") && s.id !== lunchStop?.id)
    ?? dayStops.find(s => s.tags.includes("kid-friendly") && s.kind !== "overnight" && s.id !== lunchStop?.id);
  const dogStop = dayStops.find(s => s.tags.includes("dog-friendly") && s.kind !== "overnight" && s.id !== lunchStop?.id && s.id !== kidStop?.id)
    ?? dayStops.find(s => !!s.dogNote && !s.photoOnly && s.kind !== "overnight" && s.id !== lunchStop?.id && s.id !== kidStop?.id);
  const hotel = selectedDay ? hotels.find(h => h.city === selectedDay.hotelCity) : undefined;
  const guide = selectedDay ? bookingGuides.find(g => g.city === selectedDay.hotelCity) : undefined;

  if (!selectedDay) {
    return (
      <div>
        <PaneHeader title="Drive" eyebrow="No day selected" body="Choose a route to see the driving-day view." />
      </div>
    );
  }

  const condPointId = conditionPointIdForDay(selectedDay);
  const condPoint = condPointId ? conditions?.points.find(p => p.id === condPointId) : undefined;
  const dayForecast = forecastForDay(condPoint, selectedDay);
  const walkWindow = dogWalkWindow(dayForecast);
  const forecastBorder = {
    low: "border-border bg-background/60",
    watch: "border-accent/40 bg-accent/10",
    high: "border-[hsl(6_64%_42%/_.4)] bg-[hsl(6_64%_42%/_.1)]",
  } as const;

  return (
    <div>
      <PaneHeader
        title="Drive"
        eyebrow={`Day ${selectedDay.num} of ${selectedRoute.totalDays}`}
        body="A simplified in-car view: today’s drive, best kid reset, dog break, food/patio idea, and booking target."
      />
      {selectedStop && (
        <div
          className="border-b border-border bg-accent/10 px-3 py-2 text-xs text-foreground"
          data-testid="drive-selected-context"
        >
          {selectedInThisDay ? (
            <>Showing <strong>Day {selectedDay.num}</strong> for <strong>{selectedStop.name}</strong>.</>
          ) : (
            <>Viewing Day {selectedDay.num} for the selected place <strong>{selectedStop.name}</strong>.</>
          )}
        </div>
      )}
      <div className="space-y-3 p-3">
        <section className="rounded-md border border-card-border bg-card p-3" data-testid="drive-day-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Today</div>
              <h3 className="mt-0.5 font-serif text-base font-semibold">{selectedDay.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedDay.miles} mi · ~{selectedDay.hours} hrs drive · sleep in {selectedDay.hotelCity}
              </p>
            </div>
            <PaceBadge pace={selectedDay.pace} />
          </div>
          <p className="mt-2 text-sm text-foreground/85">{selectedDay.summary}</p>
          {selectedDay.weatherNote && (
            <p className="mt-2 rounded border border-accent/30 bg-accent/10 p-2 text-xs text-foreground/85">
              {selectedDay.weatherNote}
            </p>
          )}
          {dayForecast && (
            <div className={`mt-2 rounded-md border p-2 ${forecastBorder[dayForecast.risk]}`} data-testid="drive-forecast">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-medium">{dayForecast.label} in {selectedDay.hotelCity}</span>
                <span className="tabular-nums">
                  {dayForecast.max ?? "—"}° / {dayForecast.min ?? "—"}°{dayForecast.feelsMax != null ? ` · feels ${dayForecast.feelsMax}°` : ""}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                <span>{dayForecast.precip ?? "—"}% rain</span>
                <span>UV {dayForecast.uv ?? "—"}</span>
                <span>{dayForecast.windMax ?? "—"} mph wind</span>
              </div>
              {walkWindow && <p className="mt-1 text-[11px] text-muted-foreground">{walkWindow}</p>}
              {dayForecast.reasons[0] && (
                <p className="mt-1 text-[11px] font-medium text-foreground/85">{dayForecast.reasons[0]}</p>
              )}
            </div>
          )}
          <div className="mt-3">
            <a
              href={googleMapsSearch(`${selectedDay.hotelCity} pet friendly hotel`)}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-drive-hotel-map"
              className="inline-flex w-full items-center justify-center gap-1 rounded-md border border-border bg-background px-2 py-2 text-xs font-medium hover-elevate"
            >
              <Hotel className="h-3.5 w-3.5" /> Search hotels tonight
            </a>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setActiveDayId(daysForRoute[Math.max(0, dayIndex - 1)]?.id ?? selectedDay.id)}
              disabled={dayIndex === 0}
              data-testid="button-drive-prev-day"
              className="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs disabled:opacity-40"
            >
              Previous day
            </button>
            <select
              value={selectedDay.id}
              onChange={(e) => setActiveDayId(e.target.value)}
              data-testid="select-drive-day"
              className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs"
              aria-label="Choose drive day"
            >
              {daysForRoute.map(d => (
                <option key={d.id} value={d.id}>Day {d.num} overnight: {d.hotelCity}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setActiveDayId(daysForRoute[Math.min(daysForRoute.length - 1, dayIndex + 1)]?.id ?? selectedDay.id)}
              disabled={dayIndex === daysForRoute.length - 1}
              data-testid="button-drive-next-day"
              className="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs disabled:opacity-40"
            >
              Next day
            </button>
          </div>
        </section>

        {selectedInThisDay && selectedStop && selectedStop.kind !== "overnight" &&
          ![kidStop?.id, dogStop?.id, lunchStop?.id].includes(selectedStop.id) && (
            <DrivePick title="Selected place" Icon={MapPin} stop={selectedStop} dayId={selectedDay.id} testid="drive-selected-pick" highlight />
        )}
        <div className="grid gap-2">
          <DrivePick title="Lunch pit stop" Icon={UtensilsCrossed} stop={lunchStop} dayId={selectedDay.id} testid="drive-food-pick" highlight={selectedStop?.id === lunchStop?.id} />
          <DrivePick title="Kid reset" Icon={Baby} stop={kidStop} dayId={selectedDay.id} testid="drive-kid-pick" highlight={selectedStop?.id === kidStop?.id} />
          <DrivePick title="Dog break" Icon={Dog} stop={dogStop} dayId={selectedDay.id} testid="drive-dog-pick" highlight={selectedStop?.id === dogStop?.id} />
        </div>

        <section className="rounded-md border border-card-border bg-card p-3" data-testid="drive-booking-card">
          <div className="flex items-center gap-2">
            <Bed className="h-4 w-4 text-primary" />
            <h3 className="font-serif text-base font-semibold">Tonight: {selectedDay.hotelCity}</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{guide?.headline ?? hotel?.notes ?? "Use the Book tab for hotel options."}</p>
          {guide?.hotelTargets[0] && (
            <div className="mt-2 rounded border border-border bg-background/60 p-2">
              <div className="text-sm font-semibold">{guide.hotelTargets[0].name}</div>
              <p className="mt-1 text-xs text-foreground/85">{guide.hotelTargets[0].note}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <a
                  href={guide.hotelTargets[0].source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="link-drive-hotel-source"
                  className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                >
                  Open hotel source <ExternalLink className="h-3 w-3" />
                </a>
                <a
                  href={googleMapsSearch(`${guide.hotelTargets[0].name} ${selectedDay.hotelCity}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="link-drive-hotel-target-map"
                  className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                >
                  Google Maps <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">
            Call/check: pet fee, weight limit, ground-floor room, nearby grass, whether dog can be left unattended, pool, breakfast, and parking.
          </p>
        </section>
      </div>
    </div>
  );
}

function DrivePick({ title, Icon, stop, dayId, testid, highlight }: { title: string; Icon: any; stop?: Stop; dayId?: string; testid: string; highlight?: boolean }) {
  const { setActiveStopId, setSelectedPlaceId, setActiveDayId } = useTrip();
  if (!stop) return null;
  const selectDriveStop = () => {
    if (dayId) setActiveDayId(dayId);
    setActiveStopId(stop.id);
    setSelectedPlaceId(stop.id);
  };
  return (
    <section
      className={`cursor-pointer rounded-md border bg-card p-3 hover-elevate ${highlight ? "border-accent ring-2 ring-accent/40" : "border-card-border"}`}
      data-testid={testid}
      onClick={selectDriveStop}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectDriveStop(); } }}
      tabIndex={0}
      role="button"
      aria-pressed={highlight}
    >
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {title}
      </div>
      <h3 className="mt-1 font-serif text-base font-semibold">{stop.name}</h3>
      <p className="mt-1 text-xs text-foreground/85">{stop.practical}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <a
          href={googleMapsSearch(`${stop.name} ${stop.region}`)}
          target="_blank"
          rel="noopener noreferrer"
          data-testid={`${testid}-map`}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs hover-elevate"
        >
          <MapPin className="h-3.5 w-3.5" /> Map
        </a>
        {stop.sources[0] && (
          <a
            href={stop.sources[0].url}
            target="_blank"
            rel="noopener noreferrer"
            data-testid={`${testid}-source`}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs hover-elevate"
          >
            Website <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); selectDriveStop(); }}
          data-testid={`${testid}-select`}
          className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover-elevate"
        >
          Use this stop
        </button>
      </div>
    </section>
  );
}

function FilterBar() {
  const { filters, toggleFilter, clearFilters } = useTrip();
  return (
    <div className="border-b border-border bg-card/50 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Filter</span>
        {filters.size > 0 && (
          <button
            type="button"
            onClick={clearFilters}
            data-testid="button-clear-filters"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="inline h-3 w-3 -mt-0.5" /> clear
          </button>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {TAG_DEFS.map(({ tag, label, Icon }) => {
          const on = filters.has(tag);
          return (
            <button
              key={tag} type="button"
              data-testid={`filter-${tag}`}
              onClick={() => toggleFilter(tag)}
              aria-pressed={on}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs hover-elevate ${
                on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground"
              }`}
            >
              <Icon className="h-3 w-3" /> {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function matchesFilters(s: Stop, filters: Set<Tag>) {
  if (filters.size === 0) return true;
  for (const f of Array.from(filters)) if (!s.tags.includes(f)) return false;
  return true;
}

function routeDays(route: Route): Day[] {
  return route.dayIds.map(id => allDays.find(d => d.id === id)).filter((d): d is Day => !!d);
}

function DaysPane() {
  const { activeDayId, setActiveDayId, filters, clearFilters, selectedRouteId, selectedPlaceId } = useTrip();
  const selectedRoute = routes.find(r => r.id === selectedRouteId) ?? routes[0];
  const daysForRoute = routeDays(selectedRoute);
  const selectedStop = selectedPlaceId ? stops.find(s => s.id === selectedPlaceId) : undefined;
  const selectedDay = selectedPlaceId ? findDayForStopInRoute(selectedPlaceId, selectedRoute) : undefined;

  // If the selected stop is hidden by active filters, clear them so it can highlight/scroll into view.
  useEffect(() => {
    if (!selectedStop) return;
    if (filters.size > 0 && !matchesFilters(selectedStop, filters)) clearFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlaceId]);

  const rowRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (selectedDay && rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedDay?.id, selectedPlaceId]);

  return (
    <div>
      <PaneHeader
        title="Itinerary"
        eyebrow={`${daysForRoute.length} driving days`}
        body="Open a day to see its mapped stops, toddler/dog notes, and save buttons."
      />
      {selectedStop && selectedDay && (
        <div className="border-b border-border bg-accent/10 px-3 py-2 text-xs text-foreground" data-testid="days-selected-context">
          Jumped to <strong>Day {selectedDay.num}</strong> — the day with <strong>{selectedStop.name}</strong>.
        </div>
      )}
      <FilterBar />
      <ol className="divide-y divide-border" role="list">
        {daysForRoute.map(d => {
          const dayStops = d.stopIds
            .map(id => stops.find(s => s.id === id))
            .filter((s): s is Stop => !!s)
            .filter(s => matchesFilters(s, filters));
          const isOpen = activeDayId === d.id;
          const isSelectedDay = selectedDay?.id === d.id;
          return (
            <li
              key={d.id}
              data-testid={`day-row-${d.num}`}
              ref={isSelectedDay ? rowRef : undefined}
              className={`bg-card ${isSelectedDay ? "ring-2 ring-inset ring-accent/40" : ""}`}
            >
              <button
                type="button"
                onClick={() => setActiveDayId(isOpen ? null : d.id)}
                aria-expanded={isOpen}
                data-testid={`button-day-${d.num}`}
                className="flex w-full items-start gap-3 px-4 py-3 text-left hover-elevate"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-background font-serif text-sm font-semibold">
                  {d.num}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-base leading-tight">{d.title}</span>
                    <PaceBadge pace={d.pace} />
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {d.miles} mi · ~{d.hours} hrs · sleep in {d.hotelCity}
                  </div>
                </div>
                <ChevronRight className={`h-4 w-4 shrink-0 mt-2 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} />
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-1" data-testid={`day-detail-${d.num}`}>
                  <p className="text-sm text-foreground/85">{d.summary}</p>
                  {d.weatherNote && (
                    <p className="mt-2 inline-flex items-start gap-1.5 rounded-md border border-accent/30 bg-accent/10 px-2.5 py-1.5 text-xs text-foreground">
                      <Sun className="h-3.5 w-3.5 shrink-0 mt-0.5 text-accent" />
                      {d.weatherNote}
                    </p>
                  )}

                  <ul className="mt-3 space-y-2" role="list">
                    {dayStops.map(s => <StopCard key={`${d.id}-${s.id}`} stop={s} compact />)}
                    {dayStops.length === 0 && (
                      <li className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                        No stops match the active filters.
                      </li>
                    )}
                  </ul>

                  <DayNotes dayId={d.id} />
                  <DayChecklist dayId={d.id} />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function PaceBadge({ pace }: { pace: "easy" | "moderate" | "long" }) {
  const map = {
    easy:     { label: "easy day",    cls: "bg-[hsl(148_36%_22%/_.12)] text-[hsl(148_36%_22%)] dark:bg-[hsl(148_28%_56%/_.18)] dark:text-[hsl(148_28%_72%)]" },
    moderate: { label: "moderate",    cls: "bg-muted text-foreground" },
    long:     { label: "long day",    cls: "bg-[hsl(18_56%_50%/_.14)] text-[hsl(18_56%_38%)] dark:bg-[hsl(18_62%_60%/_.18)] dark:text-[hsl(18_62%_72%)]" },
  } as const;
  const m = map[pace];
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${m.cls}`}>{m.label}</span>;
}

function StopCard({ stop, compact }: { stop: Stop; compact?: boolean }) {
  const { saved, toggleSaved, setActiveStopId, activeStopId, selectedPlaceId, setSelectedPlaceId } = useTrip();
  const isSaved = saved.has(stop.id);
  const isSelected = selectedPlaceId === stop.id;
  const isActive = activeStopId === stop.id || isSelected;
  const cardRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (isSelected && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isSelected]);
  const select = () => { setActiveStopId(stop.id); setSelectedPlaceId(stop.id); };
  return (
    <li
      ref={cardRef}
      data-testid={`stop-card-${stop.id}`}
      className={`group rounded-md border bg-card p-3 hover-elevate cursor-pointer ${isSelected ? "border-accent ring-2 ring-accent/40" : isActive ? "border-accent" : "border-card-border"}`}
      onClick={select}
      onKeyDown={(e) => { if (e.key === "Enter") select(); }}
      tabIndex={0}
      role="button"
      aria-pressed={isActive}
    >
      <div className="flex items-start gap-2">
        <MapPin className={`mt-0.5 h-4 w-4 shrink-0 ${isSaved ? "text-accent" : "text-primary"}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h4 className="font-serif text-sm font-semibold leading-tight">{stop.name}</h4>
            <span className="flex shrink-0 items-baseline gap-1.5">
              {stop.lunch && (
                <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-accent">lunch stop</span>
              )}
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{stop.kind}</span>
            </span>
          </div>
          <div className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{stop.region}</div>
          <p className="mt-1.5 text-xs text-foreground/90">{stop.blurb}</p>
          {!compact && (
            <p className="mt-1 text-xs text-muted-foreground">{stop.practical}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-1">
            {stop.tags.slice(0, 5).map(t => (
              <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-foreground">{t}</span>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); toggleSaved(stop.id); }}
              data-testid={`button-toggle-stop-${stop.id}`}
              aria-pressed={isSaved}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs hover-elevate ${
                isSaved ? "border-accent bg-accent text-accent-foreground" : "border-border bg-background"
              }`}
            >
              {isSaved ? (<><Check className="h-3 w-3" /> Saved</>) : (<><Plus className="h-3 w-3" /> Save</>)}
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={googleMapsSearch(`${stop.name} ${stop.region}`)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
                data-testid={`link-map-${stop.id}`}
              >
                Map <ExternalLink className="h-3 w-3" />
              </a>
              {stop.sources.slice(0, 2).map(src => (
                <a
                  key={src.url} href={src.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                  data-testid={`link-source-${stop.id}`}
                >
                  {src.label} <ExternalLink className="h-3 w-3" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

function DayNotes({ dayId }: { dayId: string }) {
  const { notes, setNote } = useTrip();
  return (
    <div className="mt-4">
      <label htmlFor={`note-${dayId}`} className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
        Notes
      </label>
      <textarea
        id={`note-${dayId}`}
        data-testid={`input-note-${dayId}`}
        value={notes[dayId] ?? ""}
        onChange={(e) => setNote(dayId, e.target.value)}
        placeholder="Reservation confirmation #, gas budget, who's driving morning leg…"
        rows={3}
        className="mt-1 w-full resize-none rounded-md border border-border bg-background p-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

function DayChecklist({ dayId }: { dayId: string }) {
  const { checklist, addCheckItem, toggleCheckItem, removeCheckItem } = useTrip();
  const [draft, setDraft] = useState("");
  const items = checklist[dayId] ?? [];
  return (
    <div className="mt-4">
      <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Checklist</div>
      <ul className="mt-2 space-y-1.5" role="list">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleCheckItem(dayId, i)}
              data-testid={`button-check-${dayId}-${i}`}
              aria-pressed={it.done}
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${it.done ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}
            >
              {it.done && <Check className="h-3 w-3" />}
            </button>
            <span className={`flex-1 text-sm ${it.done ? "line-through text-muted-foreground" : ""}`}>{it.text}</span>
            <button
              type="button"
              onClick={() => removeCheckItem(dayId, i)}
              data-testid={`button-remove-check-${dayId}-${i}`}
              aria-label="Remove"
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => { e.preventDefault(); addCheckItem(dayId, draft); setDraft(""); }}
        className="mt-2 flex gap-1.5"
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a checklist item…"
          data-testid={`input-add-check-${dayId}`}
          className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          data-testid={`button-add-check-${dayId}`}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover-elevate"
        >
          Add
        </button>
      </form>
    </div>
  );
}

function StopsPane() {
  const { filters, selectedRouteId, selectedPlaceId, setSelectedPlaceId } = useTrip();
  const selectedRoute = routes.find(r => r.id === selectedRouteId) ?? routes[0];
  const routeIds = routeDays(selectedRoute).flatMap(d => d.stopIds);
  const uniqueIds = Array.from(new Set(routeIds));
  const routeStops = uniqueIds.map(id => stops.find(s => s.id === id)).filter((s): s is Stop => !!s);
  const filtered = useMemo(() => routeStops.filter(s => matchesFilters(s, filters)), [filters, routeStops]);

  const selectedStop = selectedPlaceId ? stops.find(s => s.id === selectedPlaceId) : undefined;
  const selectedOnRoute = !!selectedStop && routeStops.some(s => s.id === selectedStop.id);
  const related = useMemo(
    () => (selectedOnRoute && selectedStop ? relatedStops(selectedStop, selectedRoute, 6) : []),
    [selectedOnRoute, selectedStop?.id, selectedRoute.id],
  );

  // Selected-results mode: when a place is selected, show it + related stops instead of
  // a filtered list where it might be buried. Clearing the selection returns to Browse-all.
  if (selectedOnRoute && selectedStop) {
    return (
      <div>
        <PaneHeader
          title="All stops"
          eyebrow="Selected place"
          body="Showing the selected place plus the closest same-city, same-day, and nearby options on this route."
        />
        <div className="flex items-center justify-between gap-2 border-b border-border bg-accent/10 px-3 py-2 text-xs text-foreground" data-testid="stops-selected-context">
          <span>Options near <strong>{selectedStop.name}</strong></span>
          <button
            type="button"
            onClick={() => setSelectedPlaceId(null)}
            data-testid="button-stops-browse-all"
            className="shrink-0 rounded-md border border-border bg-background px-2 py-1 text-[11px] hover-elevate"
          >
            Browse all stops
          </button>
        </div>
        <div className="px-4 pt-3 pb-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Selected</div>
        <ul className="space-y-2 px-3 pb-1" role="list">
          <StopCard stop={selectedStop} />
        </ul>
        {related.length > 0 && (
          <>
            <div className="px-4 pt-3 pb-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground" data-testid="stops-related-heading">
              Related stops near {selectedStop.city ?? selectedStop.region}
            </div>
            <ul className="space-y-2 p-3" role="list" data-testid="stops-related-list">
              {related.map(({ stop: s, reason }) => (
                <div key={s.id}>
                  <div className="mb-1 pl-1 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{reason}</div>
                  <StopCard stop={s} />
                </div>
              ))}
            </ul>
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      <PaneHeader
        title="All stops"
        eyebrow={`${routeStops.length} mapped places`}
        body="Browse every stop on the selected route, including scenic, weird, kid-friendly, and dog-friendly options."
      />
      <FilterBar />
      <div className="px-4 pt-3 pb-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
        {filtered.length} of {routeStops.length} stops on {selectedRoute.name}
      </div>
      <ul className="space-y-2 p-3" role="list">
        {filtered.map(s => <StopCard key={s.id} stop={s} />)}
        {filtered.length === 0 && (
          <li className="rounded-md border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground">
            No stops match these filters. Try clearing one.
          </li>
        )}
      </ul>
    </div>
  );
}

function HotelsPane() {
  const { selectedRouteId, selectedPlaceId } = useTrip();
  const selectedRoute = routes.find(r => r.id === selectedRouteId) ?? routes[0];
  const routeHotelNames = new Set(routeDays(selectedRoute).map(d => d.hotelCity));
  const visibleHotels = hotels.filter(h => routeHotelNames.has(h.city));

  // City to highlight/expand + float to the top when a place is selected elsewhere.
  const selectedStop = selectedPlaceId ? stops.find(s => s.id === selectedPlaceId) : undefined;
  const highlightCity = selectedStop ? bookingCityForStop(selectedStop, selectedRoute) : undefined;

  // Sort the highlighted booking city to the very top so it is immediately visible.
  const orderedHotels = [...visibleHotels].sort((a, b) => {
    if (a.city === highlightCity) return -1;
    if (b.city === highlightCity) return 1;
    return 0;
  });
  const visibleGuides = orderedHotels.map(h => ({
    hotel: h,
    guide: bookingGuides.find(g => g.city === h.city),
  }));

  return (
    <div>
      <PaneHeader
        title="Book"
        eyebrow={`${visibleHotels.length} overnight cities`}
        body="This is where the hotel, patio/food, cocktail, logistics, and sight-specific booking details live. Scroll this pane for each overnight city."
      />
      {selectedStop && highlightCity && (
        <div className="border-b border-border bg-accent/10 px-3 py-2 text-xs text-foreground" data-testid="hotels-selected-context">
          Booking options for <strong>{highlightCity}</strong> — the overnight city for <strong>{selectedStop.name}</strong>.
        </div>
      )}
      <div className="border-b border-border bg-accent/10 p-3 text-xs text-foreground" data-testid="text-hotel-caveat">
        <strong>Booking-ready filter.</strong> Use this as the call-and-click shortlist for {selectedRoute.name}. Verify hotel pet fees, weight limits, breed restrictions, whether pets can be left unattended, patio dog rules, and summer heat before you lock anything in.
      </div>
      <div className="border-b border-border px-3 py-2">
        <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Overnight booking path</div>
        <div className="mt-1 text-sm font-semibold" data-testid="text-booking-route-name">{selectedRoute.name}</div>
        <p className="mt-1 text-xs text-muted-foreground">
          Prioritized for a 3.5-year-old, a dog, easy parking, fast room access, patios or beer gardens, and stops that still feel memorable.
        </p>
      </div>
      <ul className="space-y-3 p-3" role="list">
        {visibleGuides.map(({ hotel: h, guide }, index) => (
          <BookingCityCard key={h.city} h={h} guide={guide} index={index} highlight={highlightCity === h.city} />
        ))}
      </ul>
    </div>
  );
}

function BookingCityCard({ h, guide, index, highlight }: { h: typeof hotels[number]; guide: ReturnType<typeof bookingGuides.find>; index: number; highlight: boolean }) {
  const liRef = useRef<HTMLLIElement>(null);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (highlight) {
      if (detailsRef.current) detailsRef.current.open = true;
      liRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [highlight]);
  return (
          <li ref={liRef} data-testid={`hotel-city-${h.city}`} className={`rounded-md border bg-card ${highlight ? "border-accent ring-2 ring-accent/40" : "border-card-border"}`}>
            <details ref={detailsRef} open={index === 0 || highlight} className="group" data-testid={`details-booking-city-${h.city}`}>
              <summary className="cursor-pointer list-none p-3 marker:hidden">
                <div className="flex items-start gap-2">
                  <Hotel className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-serif text-base font-semibold">{h.city}, {h.state}</h3>
                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{guide?.headline ?? h.notes}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                      <span>{guide?.hotelTargets.length ?? h.picks.length} stay targets</span>
                      <span>·</span>
                      <span>{guide?.foodDrink.length ?? 0} food/patio</span>
                      <span>·</span>
                      <span>tap to {index === 0 ? "close" : "open"}</span>
                    </div>
                  </div>
                </div>
              </summary>
              <div className="border-t border-border px-3 pb-3">
                {guide && (
                  <p className="mt-3 rounded border border-primary/15 bg-primary/5 p-2 text-xs text-foreground/85" data-testid={`text-hotel-strategy-${h.city}`}>
                    <strong>Booking strategy:</strong> {guide.hotelStrategy}
                  </p>
                )}
                {guide ? (
                  <>
                    <BookingSection title="Stay targets" Icon={Bed} items={guide.hotelTargets} city={h.city} testid={`booking-stays-${h.city}`} />
                    <BookingSection title="Dog + kid food or cocktails" Icon={Martini} items={guide.foodDrink} city={h.city} testid={`booking-food-${h.city}`} />
                    <BookingSection title="Logistics to check" Icon={Dog} items={guide.logistics} city={h.city} testid={`booking-logistics-${h.city}`} />
                    <BookingSection title="Sight notes" Icon={MapPinned} items={guide.attractionNotes} city={h.city} testid={`booking-sights-${h.city}`} />
                  </>
                ) : null}
                <details className="mt-3 rounded border border-border bg-background/60 p-2.5" data-testid={`details-chain-backups-${h.city}`}>
                  <summary className="cursor-pointer text-xs font-semibold text-foreground">
                    Chain backup searches
                  </summary>
                  <ul className="mt-2 space-y-2" role="list">
                    {h.picks.map(p => (
                      <li key={p.brand} className="rounded border border-border bg-card/70 p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold">{p.brand}</span>
                          <TierBadge tier={p.tier} />
                        </div>
                        <p className="mt-1 text-xs text-foreground/85">{p.policy}</p>
                        <div className="mt-1.5 flex flex-wrap gap-3">
                          <a href={p.searchLink.url} target="_blank" rel="noopener noreferrer"
                             data-testid={`link-search-${h.city}-${p.brand}`}
                             className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline">
                            {p.searchLink.label} <ExternalLink className="h-3 w-3" />
                          </a>
                          <a href={p.source.url} target="_blank" rel="noopener noreferrer"
                             data-testid={`link-policy-${h.city}-${p.brand}`}
                             className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:underline">
                            Pet policy <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            </details>
          </li>
  );
}

function PaneHeader({ title, eyebrow, body }: { title: string; eyebrow: string; body: string }) {
  return (
    <div className="border-b border-border bg-card px-3 py-3" data-testid={`pane-header-${title.toLowerCase().replaceAll(" ", "-")}`}>
      <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{eyebrow}</div>
      <h2 className="mt-0.5 font-serif text-base font-semibold">{title}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </div>
  );
}

function BookingSection({ title, Icon, items, city, testid }: { title: string; Icon: any; items: BookingItem[]; city: string; testid: string }) {
  if (!items.length) return null;
  return (
    <section className="mt-3" data-testid={testid}>
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {title}
      </div>
      <ul className="mt-1.5 space-y-1.5" role="list">
        {items.map((item, index) => (
          <li key={`${title}-${item.name}`} className={`rounded border p-2 ${item.unique ? "border-accent/40 bg-accent/5" : "border-border bg-background/60"}`}>
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-sm font-semibold" data-testid={`${testid}-name-${index}`}>{item.name}</div>
              {item.unique && (
                <span className="shrink-0 rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-accent">unique stay</span>
              )}
            </div>
            <p className="mt-1 text-xs text-foreground/85">{item.note}</p>
            <a
              href={item.source.url}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={`${testid}-link-${index}`}
              className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
            >
              {item.source.label} <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href={googleMapsSearch(`${item.name} ${city}`)}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={`${testid}-map-${index}`}
              className="ml-3 mt-1.5 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
            >
              Maps <ExternalLink className="h-3 w-3" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ConditionsPane() {
  const { selectedRouteId } = useTrip();
  const selectedRoute = routes.find(r => r.id === selectedRouteId) ?? routes[0];
  // Conditions are fetched directly from public weather APIs in the browser —
  // no backend involved, so this works on a fully static deployment.
  const { data, isLoading, error, refetch, isFetching } = useQuery<ConditionsResponse>({
    queryKey: ["conditions"],
    queryFn: fetchConditions,
  });
  const daysForRoute = routeDays(selectedRoute);
  const pointById = new Map((data?.points ?? []).map(p => [p.id, p]));
  return (
    <div>
      <div className="border-b border-border bg-accent/10 p-3 text-xs text-foreground" data-testid="conditions-note">
        <strong>Live planning layer.</strong> {data?.forecastCoverageNote ?? "Weather forecasts, active alerts, and wildfire links load here for the selected route."}
      </div>
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Conditions for</div>
          <div className="text-sm font-semibold">{selectedRoute.name}</div>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          data-testid="button-refresh-conditions"
          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs hover-elevate"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>
      {isLoading && (
        <div className="space-y-2 p-3" data-testid="conditions-loading">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="rounded-md border border-card-border bg-card p-3">
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
              <div className="mt-3 h-3 w-3/4 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      )}
      {error && (
        <div className="m-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm" data-testid="conditions-error">
          Live conditions did not load. The itinerary still works; use the official NWS, NIFC, and state links in the stop cards before booking.
        </div>
      )}
      {!isLoading && !error && (
        <ul className="space-y-2 p-3" role="list">
          {daysForRoute.map(day => {
            const pid = conditionPointIdForDay(day);
            return <DayConditionCard key={day.id} day={day} point={pid ? pointById.get(pid) : undefined} />;
          })}
        </ul>
      )}
      <div className="border-t border-border p-3 text-[11px] text-muted-foreground">
        Sources: Open-Meteo forecast API, National Weather Service active alerts, and NIFC wildfire map links. Forecasts update as the July 22-31 dates enter the 16-day window.
      </div>
    </div>
  );
}

function DayConditionCard({ day, point }: { day: Day; point?: ConditionResult }) {
  const f = forecastForDay(point, day);
  const walk = dogWalkWindow(f);
  const risk = f?.risk ?? "low";
  const nowTemp = point?.weather?.temperature;
  const alerts = point?.alerts ?? [];
  const riskStyles = {
    low: "bg-[hsl(148_36%_22%/_.12)] text-[hsl(148_36%_22%)] dark:bg-[hsl(148_28%_56%/_.18)] dark:text-[hsl(148_28%_72%)]",
    watch: "bg-[hsl(38_60%_52%/_.18)] text-[hsl(34_65%_30%)] dark:bg-[hsl(38_64%_60%/_.18)] dark:text-[hsl(38_64%_72%)]",
    high: "bg-[hsl(6_64%_42%/_.14)] text-[hsl(6_64%_34%)] dark:bg-[hsl(6_62%_56%/_.18)] dark:text-[hsl(6_62%_74%)]",
  } as const;
  return (
    <li className="rounded-md border border-card-border bg-card p-3" data-testid={`condition-card-${day.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Day {day.num} · {f?.label ?? "date TBD"}</div>
          <h3 className="mt-0.5 font-serif text-base font-semibold leading-tight">{day.hotelCity}</h3>
        </div>
        {f && (
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${riskStyles[risk]}`}>
            {risk === "low" ? "clear" : risk}
          </span>
        )}
      </div>
      {f ? (
        <>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-foreground/85">
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Sun className="h-3 w-3" /> {f.max ?? "—"}° / {f.min ?? "—"}°{f.feelsMax != null ? ` · feels ${f.feelsMax}°` : ""}
            </span>
            <span className="inline-flex items-center gap-1 tabular-nums"><CloudSun className="h-3 w-3" /> {f.precip ?? "—"}% rain</span>
            <span className="inline-flex items-center gap-1 tabular-nums"><Sun className="h-3 w-3" /> UV {f.uv ?? "—"}</span>
            <span className="inline-flex items-center gap-1 tabular-nums"><Wind className="h-3 w-3" /> {f.windMax ?? "—"} mph</span>
          </div>
          {walk && <p className="mt-1.5 text-[11px] text-muted-foreground">{walk}</p>}
          {f.reasons.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-foreground/85">
              {f.reasons.map(reason => <li key={reason}>{reason}</li>)}
            </ul>
          )}
        </>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          Forecast opens as this date enters the 16-day window{nowTemp != null ? ` · ${nowTemp}° near ${day.hotelCity} right now` : ""}.
        </p>
      )}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded border border-border bg-background/60 p-2">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
            <AlertTriangle className="h-3 w-3" /> NWS alerts (now)
          </div>
          <p className="mt-1 text-xs text-foreground/85">
            {alerts.length > 0 ? alerts.slice(0, 2).map(a => a.event).join(", ") : "No active alerts."}
          </p>
        </div>
        <a
          href={point?.wildfire?.link ?? "https://www.nifc.gov/fire-information/maps"}
          target="_blank"
          rel="noopener noreferrer"
          data-testid={`link-wildfire-${day.id}`}
          className="rounded border border-border bg-background/60 p-2 text-left hover-elevate"
        >
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
            <Flame className="h-3 w-3" /> Wildfire map
          </div>
          <p className="mt-1 text-xs text-foreground/85">{point?.wildfire?.note ?? "Open NIFC fire maps before final booking."}</p>
        </a>
      </div>
    </li>
  );
}

function TierBadge({ tier }: { tier: "budget" | "mid" | "boutique" }) {
  const m = {
    budget:   { l: "budget",   c: "bg-muted text-foreground" },
    mid:      { l: "mid-range", c: "bg-primary/10 text-primary" },
    boutique: { l: "boutique", c: "bg-accent/15 text-accent" },
  }[tier];
  return <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${m.c}`}>{m.l}</span>;
}

// Compact strip to add/remove the currently selected place — no repeated giant card.
function SavedSelectedStrip() {
  const { selectedPlaceId, saved, toggleSaved } = useTrip();
  if (!selectedPlaceId) return null;
  const stop = stops.find(s => s.id === selectedPlaceId);
  if (!stop) return null;
  const isSaved = saved.has(stop.id);
  return (
    <div className="flex items-center gap-2 border-b border-border bg-accent/10 px-3 py-2" data-testid="saved-selected-strip">
      <MapPin className="h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold" title={stop.name}>{stop.name}</div>
        <div className="text-[11px] text-muted-foreground">{isSaved ? "In your plan" : "Not in your plan yet"}</div>
      </div>
      <button
        type="button"
        onClick={() => toggleSaved(stop.id)}
        data-testid="button-saved-toggle-selected"
        aria-pressed={isSaved}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs hover-elevate ${
          isSaved ? "border-accent bg-accent text-accent-foreground" : "border-border bg-background"
        }`}
      >
        {isSaved ? (<><Trash2 className="h-3.5 w-3.5" /> Remove</>) : (<><Plus className="h-3.5 w-3.5" /> Add to plan</>)}
      </button>
    </div>
  );
}

function SavedPane() {
  const { saved, toggleSaved } = useTrip();
  const list = stops.filter(s => saved.has(s.id));
  if (list.length === 0) {
    return (
      <div>
        <SavedSelectedStrip />
        <div className="flex flex-col items-center px-6 py-16 text-center">
          <MapPin className="h-10 w-10 text-muted-foreground/40" />
          <h3 className="mt-3 font-serif text-lg">No saved stops yet</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-xs">
            Tap a pin on the map or the <kbd className="rounded border border-border bg-background px-1 py-0.5 text-xs">Save</kbd> button on a stop card to start your draft itinerary.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div>
      <SavedSelectedStrip />
      <div className="flex items-center justify-between border-b border-border p-3">
        <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground" data-testid="text-saved-count">
          {list.length} stop{list.length === 1 ? "" : "s"} in your plan
        </span>
        <button
          type="button"
          onClick={() => list.forEach(s => toggleSaved(s.id))}
          data-testid="button-clear-saved"
          className="text-xs text-muted-foreground hover:text-destructive"
        >
          Clear all
        </button>
      </div>
      <ul className="space-y-2 p-3" role="list">
        {list.map(s => <StopCard key={s.id} stop={s} />)}
      </ul>
    </div>
  );
}
