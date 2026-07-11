import { useEffect, useRef } from "react";
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
  const selectedStops = (() => {
    const orderedIds: string[] = [];
    const seen = new Set<string>();
    selectedDays.forEach(d => d.stopIds.forEach(id => { if (!seen.has(id)) { seen.add(id); orderedIds.push(id); } }));
    return orderedIds.map(id => stops.find(s => s.id === id)).filter(Boolean) as Stop[];
  })();

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

    // Fit overall route
    const bounds = L.latLngBounds(stops.filter(s => ["north-branford-ct","del-mar-ca"].includes(s.id)).map(s => [s.lat, s.lng] as [number, number]));
    map.fitBounds(bounds.pad(0.08));
  }, []);

  // Render markers + lines whenever inputs change
  useEffect(() => {
    const map = mapRef.current; const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

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
      marker.on("click", () => { setActiveStopId(s.id); setSelectedPlaceId(s.id); });
      marker.on("popupopen", (e) => {
        const el = (e.popup.getElement() as HTMLElement | null);
        if (!el) return;
        const btn = el.querySelector(`[data-stop-toggle="${s.id}"]`);
        btn?.addEventListener("click", () => { toggleSaved(s.id); marker.closePopup(); });
      });
      marker.addTo(layer);
    });
    if (selectedStops.length > 1) {
      map.fitBounds(L.latLngBounds(selectedStops.map(s => [s.lat, s.lng])).pad(0.08), { animate: true });
    }
  }, [selectedStops, selectedRoute, activeDayId, activeStopId, selectedPlaceId, saved, setActiveStopId, setSelectedPlaceId, toggleSaved]);

  // pan to active day
  useEffect(() => {
    const map = mapRef.current; if (!map || !activeDayId) return;
    const day = allDays.find(d => d.id === activeDayId); if (!day || day.stopIds.length === 0) return;
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
