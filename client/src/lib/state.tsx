import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import type { Tag } from "@/data/julyTrip";
import { allDays, days, routes, stops } from "@/data/julyTrip";

interface TripState {
  // selected day for highlight
  activeDayId: string | null;
  setActiveDayId: (id: string | null) => void;
  // hovered stop on map/list
  activeStopId: string | null;
  setActiveStopId: (id: string | null) => void;
  // single source of truth for the currently focused place across all tabs
  selectedPlaceId: string | null;
  setSelectedPlaceId: (id: string | null) => void;
  // draft itinerary: stop ids the user wants
  saved: Set<string>;
  toggleSaved: (id: string) => void;
  // filters
  filters: Set<Tag>;
  toggleFilter: (t: Tag) => void;
  clearFilters: () => void;
  // per-day notes
  notes: Record<string, string>;
  setNote: (dayId: string, text: string) => void;
  // per-day checklist
  checklist: Record<string, ChecklistItem[]>;
  addCheckItem: (dayId: string, text: string) => void;
  toggleCheckItem: (dayId: string, idx: number) => void;
  removeCheckItem: (dayId: string, idx: number) => void;
  // theme
  theme: "light" | "dark";
  toggleTheme: () => void;
  // selected route
  selectedRouteId: string;
  setSelectedRouteId: (id: string) => void;
  // UI navigation (shared so the safety banner can jump to the Live tab)
  mobileView: "map" | "plan";
  setMobileView: (v: "map" | "plan") => void;
  plannerTab: PlannerTab;
  setPlannerTab: (t: PlannerTab) => void;
}

export type PlannerTab = "drive" | "days" | "stops" | "hotels" | "conditions" | "saved";

export interface ChecklistItem { text: string; done: boolean; }

const Ctx = createContext<TripState | null>(null);

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { text: "Top off gas before checkout", done: false },
  { text: "Refill cooler with ice", done: false },
  { text: "Dog walk + relief stop before drive", done: false },
];

// ---------- localStorage persistence ----------
// Anything the family types or saves must survive a refresh / phone reload
// mid-drive. Each slice gets its own key so one bad value can't wipe the plan.
const LS_PREFIX = "pathfinder.v1.";

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(LS_PREFIX + key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function saveJSON(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
  } catch {
    // storage blocked/full — keep working in memory
  }
}

// During the trip window, open on today's drive day. Day titles carry their
// date as "Jul 22: …", so match today's month/day against the route's days.
function todaysDayId(routeId: string): string | null {
  const route = routes.find(r => r.id === routeId);
  const now = new Date();
  if (!route || now.getMonth() !== 6) return null; // trip days are all in July
  const prefix = `Jul ${now.getDate()}:`;
  const match = route.dayIds
    .map(id => allDays.find(d => d.id === id))
    .find(d => d?.title.startsWith(prefix));
  return match?.id ?? null;
}

export function TripProvider({ children }: { children: ReactNode }) {
  const defaultRouteId = routes[0]?.id ?? "rockies-utah-grand-canyon-10";
  const [selectedRouteId, setSelectedRouteId] = useState<string>(() => {
    const stored = loadJSON<string>("route", defaultRouteId);
    return routes.some(r => r.id === stored) ? stored : defaultRouteId;
  });
  const [activeDayId, setActiveDayId] = useState<string | null>(() => {
    const storedRoute = loadJSON<string>("route", defaultRouteId);
    const routeId = routes.some(r => r.id === storedRoute) ? storedRoute : defaultRouteId;
    // Today's drive wins over whatever was open last session.
    const todays = todaysDayId(routeId);
    if (todays) return todays;
    const stored = loadJSON<string | null>("activeDay", null);
    const route = routes.find(r => r.id === routeId);
    if (stored && route?.dayIds.includes(stored)) return stored;
    return route?.dayIds?.[0] ?? days[0]?.id ?? null;
  });
  const [activeStopId, setActiveStopId] = useState<string | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<string>>(() => {
    const stored = loadJSON<string[] | null>("saved", null);
    if (stored) return new Set(stored.filter(id => stops.some(s => s.id === id)));
    return new Set(stops.filter(s => s.tags.includes("iconic")).slice(0, 3).map(s => s.id));
  });
  const [filters, setFilters] = useState<Set<Tag>>(new Set());
  const [notes, setNotes] = useState<Record<string, string>>(() => loadJSON("notes", {}));
  const [checklist, setChecklist] = useState<Record<string, ChecklistItem[]>>(() => {
    const stored = loadJSON<Record<string, ChecklistItem[]> | null>("checklist", null);
    const init: Record<string, ChecklistItem[]> = {};
    allDays.forEach(d => { init[d.id] = stored?.[d.id] ?? DEFAULT_CHECKLIST.map(i => ({ ...i })); });
    return init;
  });
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const stored = loadJSON<"light" | "dark" | null>("theme", null);
    if (stored === "light" || stored === "dark") return stored;
    return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [mobileView, setMobileView] = useState<"map" | "plan">("map");
  const [plannerTab, setPlannerTab] = useState<PlannerTab>("drive");

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark"); else root.classList.remove("dark");
  }, [theme]);

  // Persist each slice as it changes.
  useEffect(() => { saveJSON("route", selectedRouteId); }, [selectedRouteId]);
  useEffect(() => { saveJSON("activeDay", activeDayId); }, [activeDayId]);
  useEffect(() => { saveJSON("saved", Array.from(saved)); }, [saved]);
  useEffect(() => { saveJSON("notes", notes); }, [notes]);
  useEffect(() => { saveJSON("checklist", checklist); }, [checklist]);
  useEffect(() => { saveJSON("theme", theme); }, [theme]);

  const value: TripState = useMemo(() => ({
    activeDayId, setActiveDayId,
    activeStopId, setActiveStopId,
    selectedPlaceId, setSelectedPlaceId,
    saved,
    toggleSaved: (id) => setSaved(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    }),
    filters,
    toggleFilter: (t) => setFilters(prev => {
      const n = new Set(prev); if (n.has(t)) n.delete(t); else n.add(t); return n;
    }),
    clearFilters: () => setFilters(new Set()),
    notes,
    setNote: (dayId, text) => setNotes(prev => ({ ...prev, [dayId]: text })),
    checklist,
    addCheckItem: (dayId, text) => {
      if (!text.trim()) return;
      setChecklist(prev => ({
        ...prev,
        [dayId]: [...(prev[dayId] ?? []), { text: text.trim(), done: false }],
      }));
    },
    toggleCheckItem: (dayId, idx) => setChecklist(prev => {
      const cur = prev[dayId] ?? [];
      return { ...prev, [dayId]: cur.map((it, i) => i === idx ? { ...it, done: !it.done } : it) };
    }),
    removeCheckItem: (dayId, idx) => setChecklist(prev => {
      const cur = prev[dayId] ?? [];
      return { ...prev, [dayId]: cur.filter((_, i) => i !== idx) };
    }),
    theme,
    toggleTheme: () => setTheme(t => t === "dark" ? "light" : "dark"),
    selectedRouteId, setSelectedRouteId,
    mobileView, setMobileView,
    plannerTab, setPlannerTab,
  }), [activeDayId, activeStopId, selectedPlaceId, saved, filters, notes, checklist, theme, selectedRouteId, mobileView, plannerTab]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTrip() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTrip must be inside TripProvider");
  return v;
}
