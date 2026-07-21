import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTrip } from "@/lib/state";
import { allDays, routes, stops, type Day, type Stop } from "@/data/julyTrip";
import { renderToStaticMarkup } from "react-dom/server";

// Use a simple SVG inside a Leaflet DivIcon — avoids the broken-default-marker problem.
function pinIcon(kind: "default" | "active" | "saved" | "overnight" | "alt", num?: number) {
  const inner = num != null
    ? `<div><span style="font-family:var(--font-sans);font-weight:700;font-size:11px;line-height:1">${num}</span></div>`
    : `<div>${renderToStaticMarkup(
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="10" r="3" />
          <path d="M12 22s7-7.5 7-12a7 7 0 1 0-14 0c0 4.5 7 12 7 12z" />
        </svg>
      )}</div>`;
  return L.divIcon({
    className: `pin-marker pin-${kind}`,
    html: inner,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -26],
  });
}

export function TripMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const altLayerRef = useRef<L.LayerGroup | null>(null);
  const dayLineRef = useRef<L.Polyline | null>(null);
  const fullLineRef = useRef<L.Polyline | null>(null);
  const altLineRef = useRef<L.Polyline | null>(null);

  const { activeDayId, setActiveStopId, activeStopId, saved, toggleSaved, selectedRouteId, selectedPlaceId, setSelectedPlaceId } = useTrip();

  const routeColor = (color?: string) => {
    if (color === "purple") return "hsl(276 34% 42%)";
    if (color === "terra") return "hsl(var(--accent))";
    return "hsl(200 40% 38%)";
  };

  const selectedRoute = routes.find(r => r.id === selectedRouteId) ?? routes[0];
  const selectedDays = selectedRoute.dayIds
    .map(id => allDays.find(d => d.id === id))
    .filter((d): d is Day => !!d);
  // Memoized so the marker effect only rebuilds when the route's stops actually
  // change — not on every unrelated re-render (which would tear down an open popup).
  const selectedStops = useMemo(() => {
    const orderedIds: string[] = [];
    const seen = new Set<string>();
    selectedDays.forEach(d => d.stopIds.forEach(id => { if (!seen.has(id)) { seen.add(id); orderedIds.push(id); } }));
    return orderedIds.map(id => stops.find(s => s.id === id)).filter(Boolean) as Stop[];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoute]);

  // Off-polyline optional detours for the selected route — rendered as markers
  // only (never added to a line) using the muted dashed "alt" pin so they read
  // as bonus stops at a glance.
  const bonusStops = useMemo(() => {
    const ids = selectedRoute.bonusStopIds ?? [];
    return ids.map(id => stops.find(s => s.id === id)).filter(Boolean) as Stop[];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoute]);

  // The other route's branch-only days (trunk + final day are shared, so diffing
  // out the selected route's day ids leaves just the diverging leg) — drawn as a
  // dashed comparison line so the map shows what the fork gives up either way.
  const otherBranchStops = useMemo(() => {
    const otherRoute = routes.find(r => r.id !== selectedRoute.id);
    if (!otherRoute) return [] as Stop[];
    const branchOnlyDayIds = otherRoute.dayIds.filter(id => !selectedRoute.dayIds.includes(id));
    const otherDays = branchOnlyDayIds
      .map(id => allDays.find(d => d.id === id))
      .filter((d): d is Day => !!d);
    const orderedIds: string[] = [];
    const seen = new Set<string>();
    otherDays.forEach(d => d.stopIds.forEach(id => { if (!seen.has(id)) { seen.add(id); orderedIds.push(id); } }));
    return orderedIds.map(id => stops.find(s => s.id === id)).filter(Boolean) as Stop[];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoute]);

  // Keep the latest route stops / active day reachable from the mount-only effect.
  const selectedStopsRef = useRef(selectedStops);
  selectedStopsRef.current = selectedStops;
  const activeDayIdRef = useRef(activeDayId);
  activeDayIdRef.current = activeDayId;
  const didFitRef = useRef(false);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  // The selection the marker effect last acted on — popups only auto-open when
  // the selection actually changes, not on every unrelated marker rebuild.
  const prevSelIdRef = useRef<string | null>(null);

  // mount
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [40, -98],
      zoom: 4,
      worldCopyJump: false,
      zoomControl: true,
      attributionControl: true,
    });

    // CARTO Voyager — neutral, paper-friendly. No API key required.
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 18,
      subdomains: "abcd",
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(map);

    layerRef.current = L.layerGroup().addTo(map);
    altLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // On phones the flex/100dvh layout (and the Map/Planner tab toggle) can leave
    // the container mis-sized when Leaflet first measures it, so it renders at
    // world zoom. Recompute size whenever the container gets real dimensions, and
    // the first time it does, fit to today's leg (falling back to the whole route).
    const fitInitial = () => {
      const day = activeDayIdRef.current ? allDays.find(d => d.id === activeDayIdRef.current) : undefined;
      const dayPts = day
        ? (day.stopIds.map(id => stops.find(s => s.id === id)).filter(Boolean) as Stop[])
        : [];
      if (dayPts.length > 1) {
        map.fitBounds(L.latLngBounds(dayPts.map(s => [s.lat, s.lng] as [number, number])).pad(0.4), { animate: false });
      } else if (dayPts.length === 1) {
        map.setView([dayPts[0].lat, dayPts[0].lng], 9, { animate: false });
      } else if (selectedStopsRef.current.length > 1) {
        map.fitBounds(L.latLngBounds(selectedStopsRef.current.map(s => [s.lat, s.lng] as [number, number])).pad(0.08), { animate: false });
      }
    };
    const ro = new ResizeObserver(() => {
      const el = containerRef.current;
      if (!el || el.clientWidth < 80 || el.clientHeight < 80) return;
      map.invalidateSize();
      if (!didFitRef.current) {
        didFitRef.current = true;
        // Defer a frame: fitting synchronously here gets clobbered by Leaflet's
        // deferred initial-view application. didFitRef is set now so the day-pan
        // effect owns framing for any later day change.
        requestAnimationFrame(fitInitial);
      }
    });
    ro.observe(containerRef.current);
    return () => {
      ro.disconnect();
      map.remove(); // tear down Leaflet's document/window listeners so nothing leaks
      mapRef.current = null;
    };
  }, []);

  // Render markers + lines whenever inputs change
  useEffect(() => {
    const map = mapRef.current; const layer = layerRef.current;
    if (!map || !layer) return;
    // Which popup is open right now, before the rebuild tears everything down —
    // so a rebuild caused by unrelated state (saving a stop from the planner)
    // preserves it, while a popup the user explicitly closed stays closed.
    let openPopupId: string | null = null;
    markersRef.current.forEach((m, id) => { if (m.isPopupOpen()) openPopupId = id; });
    layer.clearLayers();
    markersRef.current.clear();

    // overall dashed line
    if (fullLineRef.current) { fullLineRef.current.remove(); }
    fullLineRef.current = L.polyline(selectedStops.map(s => [s.lat, s.lng]), {
      color: "hsl(var(--foreground))",
      opacity: 0.45,
      weight: 3,
      dashArray: "8 6",
      lineCap: "round",
    }).addTo(layer);

    // current-day solid line
    if (dayLineRef.current) { dayLineRef.current.remove(); }
    if (activeDayId) {
      const day = allDays.find(d => d.id === activeDayId);
      if (day) {
        const pts = day.stopIds.map(id => stops.find(s => s.id === id)).filter(Boolean) as Stop[];
        if (pts.length > 1) {
          dayLineRef.current = L.polyline(pts.map(s => [s.lat, s.lng]), {
            color: "hsl(var(--accent))",
            opacity: 0.95,
            weight: 4,
            lineCap: "round",
          }).addTo(layer);
        }
      }
    }

    // other-branch comparison line — the fixed blue from the legend swatch, not
    // routeColor(), so it stays visually distinct from "today's drive" no matter
    // which route is selected. clearLayers() (not .remove()) so the old polyline
    // is actually dropped from altLayerRef's internal registry, not just detached
    // from the map — otherwise it accumulates there across effect re-runs.
    altLayerRef.current?.clearLayers();
    if (otherBranchStops.length > 1 && altLayerRef.current) {
      altLineRef.current = L.polyline(otherBranchStops.map(s => [s.lat, s.lng]), {
        color: "hsl(200 40% 38%)",
        opacity: 0.6,
        weight: 3,
        dashArray: "4 8",
        lineCap: "round",
      }).addTo(altLayerRef.current);
    } else {
      altLineRef.current = null;
    }

    // markers
    const dayStopIds = new Set<string>();
    if (activeDayId) {
      const day = allDays.find(d => d.id === activeDayId);
      day?.stopIds.forEach(id => dayStopIds.add(id));
    }

    selectedStops.forEach((s) => {
      const isOvernight = s.kind === "overnight";
      const isSaved = saved.has(s.id);
      const isActive = activeStopId === s.id || selectedPlaceId === s.id;
      const inDay = dayStopIds.has(s.id);
      const kind: "default" | "active" | "saved" | "overnight" =
        isActive ? "active" : isSaved ? "saved" : isOvernight ? "overnight" : "default";

      const marker = L.marker([s.lat, s.lng], {
        icon: pinIcon(kind, inDay ? (allDays.find(d => d.id === activeDayId)?.stopIds.indexOf(s.id)! + 1) : undefined),
        title: s.name,
        keyboard: true,
        riseOnHover: true,
      });

      const popup = `
        <div style="min-width:200px">
          <div style="font-family:var(--font-serif);font-weight:600;font-size:14px;margin-bottom:4px">${s.name}</div>
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:hsl(var(--muted-foreground));margin-bottom:6px">${s.region}</div>
          <p style="margin:0 0 8px 0;color:hsl(var(--foreground))">${s.blurb}</p>
          <button data-stop-toggle="${s.id}" style="font-size:12px;padding:4px 8px;border-radius:4px;border:1px solid hsl(var(--border));background:${isSaved ? "hsl(var(--accent))" : "hsl(var(--card))"};color:${isSaved ? "hsl(var(--accent-foreground))" : "hsl(var(--foreground))"};cursor:pointer">
            ${isSaved ? "✓ In your plan" : "+ Add to plan"}
          </button>
        </div>`;
      marker.bindPopup(popup, { closeButton: true, offset: [0, -2] });
      marker.on("click", () => { setActiveStopId(s.id); setSelectedPlaceId(s.id, "map"); });
      marker.on("popupopen", (e) => {
        const el = (e.popup.getElement() as HTMLElement | null);
        if (!el) return;
        const btn = el.querySelector<HTMLButtonElement>(`[data-stop-toggle="${s.id}"]`);
        // Assign (don't addEventListener): reopening the same popup re-fires this
        // handler, and stacked listeners made the toggle fire twice — a no-op.
        if (btn) btn.onclick = () => { toggleSaved(s.id); marker.closePopup(); };
      });
      marker.addTo(layer);
      markersRef.current.set(s.id, marker);
    });

    // bonus/optional detour markers — off-polyline extras for this route.
    // Default to the muted dashed "alt" pin so they read as optional at a
    // glance; still promote to "active"/"saved" so selecting or saving one
    // gives the same feedback as any other marker. Never added to a line.
    bonusStops.forEach((s) => {
      const isSaved = saved.has(s.id);
      const isActive = activeStopId === s.id || selectedPlaceId === s.id;
      const kind: "default" | "active" | "saved" | "overnight" | "alt" =
        isActive ? "active" : isSaved ? "saved" : "alt";

      const marker = L.marker([s.lat, s.lng], {
        icon: pinIcon(kind),
        title: s.name,
        keyboard: true,
        riseOnHover: true,
      });

      const popup = `
        <div style="min-width:200px">
          <div style="font-family:var(--font-serif);font-weight:600;font-size:14px;margin-bottom:4px">${s.name}</div>
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:hsl(var(--muted-foreground));margin-bottom:6px">${s.region} · optional detour</div>
          <p style="margin:0 0 8px 0;color:hsl(var(--foreground))">${s.blurb}</p>
          <button data-stop-toggle="${s.id}" style="font-size:12px;padding:4px 8px;border-radius:4px;border:1px solid hsl(var(--border));background:${isSaved ? "hsl(var(--accent))" : "hsl(var(--card))"};color:${isSaved ? "hsl(var(--accent-foreground))" : "hsl(var(--foreground))"};cursor:pointer">
            ${isSaved ? "✓ In your plan" : "+ Add to plan"}
          </button>
        </div>`;
      marker.bindPopup(popup, { closeButton: true, offset: [0, -2] });
      marker.on("click", () => { setActiveStopId(s.id); setSelectedPlaceId(s.id, "map"); });
      marker.on("popupopen", (e) => {
        const el = (e.popup.getElement() as HTMLElement | null);
        if (!el) return;
        const btn = el.querySelector<HTMLButtonElement>(`[data-stop-toggle="${s.id}"]`);
        // Assign (don't addEventListener) — see the main-marker handler above.
        if (btn) btn.onclick = () => { toggleSaved(s.id); marker.closePopup(); };
      });
      marker.addTo(layer);
      markersRef.current.set(s.id, marker);
    });
    // Re-open a popup only when (a) the selection just changed — a fresh click
    // should show its popup even though the rebuild closed it — or (b) that
    // popup was open before this rebuild (an unrelated state change shouldn't
    // flash it shut). A popup the user closed with X stays closed: unrelated
    // rebuilds no longer resurrect it.
    const selId = selectedPlaceId ?? activeStopId;
    if (selId && (selId !== prevSelIdRef.current || openPopupId === selId)) {
      markersRef.current.get(selId)?.openPopup();
    }
    prevSelIdRef.current = selId;
    // NOTE: no fitBounds here — this effect re-runs when selectedStops / the day
    // changes; refitting would fight the day-pan and zoom the map back out.
    // Framing is owned by the initial-fit observer and the day-pan effect.
  }, [selectedStops, bonusStops, otherBranchStops, selectedRoute, activeDayId, activeStopId, selectedPlaceId, saved, setActiveStopId, setSelectedPlaceId, toggleSaved]);

  // pan to active day
  useEffect(() => {
    const map = mapRef.current; if (!map || !activeDayId) return;
    // Hold off until the container has been measured and framed once (see the
    // initial-fit observer). Animating before that runs against a mis-sized map
    // and lands at the wrong zoom; the observer owns the first frame.
    if (!didFitRef.current) return;
    const day = allDays.find(d => d.id === activeDayId); if (!day || day.stopIds.length === 0) return;
    // When the day changed because the user selected a stop IN that day (the
    // planner syncs activeDayId to the selection), the stop-pan effect owns the
    // camera — flying to day bounds here cancelled that flyTo and yanked the
    // map away from the very stop the user just clicked.
    const selId = selectedPlaceId ?? activeStopId;
    if (selId && day.stopIds.includes(selId)) return;
    const pts = day.stopIds.map(id => stops.find(s => s.id === id)).filter(Boolean) as Stop[];
    if (pts.length === 0) return;
    if (pts.length === 1) {
      map.flyTo([pts[0].lat, pts[0].lng], 9, { duration: 0.7 });
    } else {
      map.flyToBounds(L.latLngBounds(pts.map(p => [p.lat, p.lng])).pad(0.4), { duration: 0.7 });
    }
  }, [activeDayId]);

  // pan to active / selected stop
  useEffect(() => {
    const map = mapRef.current;
    const targetId = selectedPlaceId ?? activeStopId;
    if (!map || !targetId) return;
    const s = stops.find(x => x.id === targetId); if (!s) return;
    map.flyTo([s.lat, s.lng], Math.max(map.getZoom(), 7), { duration: 0.5 });
  }, [activeStopId, selectedPlaceId]);

  return (
    <div
      ref={containerRef}
      data-testid="map-container"
      style={{ width: "100%", height: "100%", minHeight: 0 }}
      role="region"
      aria-label="Trip map"
    />
  );
}
