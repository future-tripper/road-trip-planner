// Shared type definitions for the trip data model. The legacy stop/day/hotel/
// route data arrays that used to live here were removed after the I-80 reroute
// cutover to julyTrip.ts — these types are re-exported from julyTrip.ts so
// nothing downstream needs to know this file still exists.

export type Tag =
  | "kid-friendly"
  | "dog-friendly"
  | "scenic"
  | "iconic"
  | "outdoor"
  | "lodging"
  | "food-break"
  | "nap-stop"
  | "long-day"
  | "easy-day";

export type StopKind =
  | "overnight"          // city/town where you sleep
  | "park"               // national/state park
  | "scenic"             // viewpoint, landmark, drive
  | "iconic"             // Americana, must-see roadside
  | "city"               // urban stop
  | "break";             // rest / play / dog-relief stop

export interface Source {
  label: string;
  url: string;
}

export type Category =
  | "playground"
  | "kid-museum"
  | "roadside-giant"
  | "national-park"
  | "scenic-drive"
  | "overnight"
  | "dog-park"
  | "photo-stop"
  | "cafe"
  | "city";

export interface Stop {
  id: string;
  name: string;
  region: string;
  kind: StopKind;
  lat: number;
  lng: number;
  blurb: string;
  practical: string;     // family/dog/heat tips
  tags: Tag[];
  sources: Source[];
  // ----- optional enrichment used by the selected-place card & cross-tab links -----
  city?: string;         // overnight/booking city this stop belongs to (matches Day.hotelCity)
  state?: string;
  category?: Category;
  dogNote?: string;      // dog-specific guidance
  kidNote?: string;      // toddler-specific guidance
  timeNeeded?: string;   // e.g. "30 min", "half day"
  dogVerify?: boolean;   // pet policy must be re-confirmed before relying on it
  photoOnly?: boolean;   // do NOT plan to stay/enter with a pet — photo/exterior only
  optional?: boolean;    // bonus/detour stop, not on the core day polyline
  lunch?: boolean;       // the designated lunch + energy-burn pit stop for its day
  website?: string;      // primary official link
  routeIds?: string[];   // routes this stop is relevant to
}

export interface Day {
  id: string;
  num: number;
  title: string;
  from: string;
  to: string;
  miles: number;
  hours: number;          // approximate driving hours, no stops
  pace: "easy" | "moderate" | "long";
  summary: string;
  weatherNote?: string;
  stopIds: string[];      // ordered: first = depart, last = sleep
  hotelCity: string;      // overnight city (matches Hotel.city)
}

export interface Hotel {
  city: string;
  state: string;
  notes: string;
  picks: HotelPick[];     // chain-level picks with caveats
}

export interface HotelPick {
  brand: string;
  tier: "budget" | "mid" | "boutique";
  policy: string;
  source: Source;
  searchLink: Source;     // direct search link for this city
}

export interface Route {
  id: string;
  name: string;
  tagline: string;
  totalMiles: number;
  totalDays: number;
  description: string;
  dayIds: string[];
  comparisonStopIds?: string[];
  bonusStopIds?: string[];      // optional detours shown as map markers, not on the polyline
  overnightCities?: string[];
  strengths?: string[];
  cautions?: string[];
  recommendation?: string;
  color?: "blue" | "purple" | "terra";
}
