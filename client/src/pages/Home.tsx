import { TripMap } from "@/components/TripMap";
import { Planner, SafetyBanner } from "@/components/Planner";
import { Logo } from "@/components/Logo";
import { useTrip } from "@/lib/state";
import { allDays, routes } from "@/data/julyTrip";
import { Sun, Moon, Map as MapIcon, ListChecks } from "lucide-react";

export default function Home() {
  const { theme, toggleTheme, selectedRouteId, mobileView, setMobileView } = useTrip();

  const selectedRoute = routes.find(r => r.id === selectedRouteId) ?? routes[0];
  const selectedDays = selectedRoute.dayIds.map(id => allDays.find(d => d.id === id)).filter(Boolean);
  const totalMiles = selectedRoute.totalMiles;
  const totalHours = selectedDays.reduce((a, d) => a + (d?.hours ?? 0), 0);

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-background paper-texture">
      <header
        className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-card/85 px-3 py-3 backdrop-blur sm:gap-4 sm:px-4"
        data-testid="header-app"
      >
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="hidden min-[360px]:block">
            <Logo size={26} />
          </span>
          <div className="min-w-0 leading-tight">
            <div className="truncate font-serif text-base font-semibold sm:text-lg">Pathfinder</div>
            <div className="hidden max-w-[48vw] truncate text-[13px] uppercase tracking-[0.12em] text-muted-foreground sm:block lg:max-w-none">
              July 22-31 · North Branford, CT to Del Mar, CA · {selectedRoute.name}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-5">
          <Stat label="Days"  value={`${selectedRoute.totalDays}`} testid="stat-days" />
          <Stat label="Miles" value={totalMiles.toLocaleString()} testid="stat-miles" />
          <Stat label="Drive" value={`~${Math.round(totalHours)} hr`} testid="stat-hours" />
          <button
            type="button"
            onClick={toggleTheme}
            data-testid="button-toggle-theme"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="ml-0 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background hover-elevate sm:ml-1"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* Mobile view toggle */}
      <div className="flex shrink-0 border-b border-border bg-card/40 lg:hidden" role="tablist" aria-label="Mobile view">
        <button
          type="button" role="tab" aria-selected={mobileView === "map"}
          onClick={() => setMobileView("map")}
          data-testid="mobile-tab-map"
          className={`flex flex-1 items-center justify-center gap-2 px-4 py-2 text-sm hover-elevate ${mobileView === "map" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}
        >
          <MapIcon className="h-4 w-4" /> Map
        </button>
        <button
          type="button" role="tab" aria-selected={mobileView === "plan"}
          onClick={() => setMobileView("plan")}
          data-testid="mobile-tab-plan"
          className={`flex flex-1 items-center justify-center gap-2 px-4 py-2 text-sm hover-elevate ${mobileView === "plan" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}
        >
          <ListChecks className="h-4 w-4" /> Planner
        </button>
      </div>

      <SafetyBanner />

      <main className="flex flex-1 min-h-0 overflow-hidden">
        <section
          className={`flex-1 min-w-0 ${mobileView === "map" ? "block" : "hidden"} lg:block relative`}
          aria-label="Interactive trip map"
        >
          <TripMap />
          <Legend />
        </section>

        <section
          className={`shrink-0 w-full lg:w-[440px] xl:w-[480px] ${mobileView === "plan" ? "block" : "hidden"} lg:block`}
        >
          <Planner />
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value, accent, testid }: { label: string; value: string; accent?: boolean; testid: string }) {
  return (
    <div className="min-w-[2.25rem] text-center leading-tight sm:min-w-[3.25rem]" data-testid={testid}>
      <div className={`whitespace-nowrap font-sans text-[14px] font-bold tabular-nums sm:text-base ${accent ? "text-accent" : ""}`}>{value}</div>
      <div className="text-[8px] uppercase tracking-[0.08em] text-muted-foreground sm:text-[12px] sm:tracking-[0.1em]">{label}</div>
    </div>
  );
}

function Legend() {
  return (
    <div
      className="absolute left-3 bottom-6 z-[400] rounded-md border border-border bg-card/95 p-3 shadow-md backdrop-blur"
      data-testid="map-legend"
    >
      <div className="text-[12px] uppercase tracking-[0.12em] text-muted-foreground">Legend</div>
      <div className="mt-1.5 space-y-1 text-xs">
        <LegendRow color="hsl(var(--primary))" label="Main stop" />
        <LegendRow color="hsl(var(--accent))" label="Today’s drive" line />
        <LegendRow color="hsl(var(--foreground))" label="Full route ahead" line dashed />
        <LegendRow color="hsl(8 38% 36%)" label="Overnight" />
        <LegendRow color="hsl(200 40% 38%)" label="Comparison route" line dashed />
      </div>
    </div>
  );
}

function LegendRow({ color, label, dashed, line }: { color: string; label: string; dashed?: boolean; line?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={line ? "inline-block h-0 w-4 rounded-full" : "inline-block h-2.5 w-2.5 rounded-full"}
        style={line ? { borderTop: `2px ${dashed ? "dashed" : "solid"} ${color}` } : { background: color }}
      />
      <span>{label}</span>
    </div>
  );
}
