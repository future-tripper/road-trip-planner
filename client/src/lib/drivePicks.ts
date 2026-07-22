import { stops, type Day, type Stop } from "@/data/julyTrip";

// The Drive tab's four roles for a day, shared with the map so the same stops
// can render as distinctive pins. Keep the selection rules here in one place —
// if the Drive tab and the map ever disagree on "today's lunch stop", that's a
// bug this module exists to prevent.
export type PickRole = "highlight" | "lunch" | "kid" | "dog";

export const PICK_LABELS: Record<PickRole, string> = {
  highlight: "Today’s highlight",
  lunch: "Lunch pit stop",
  kid: "Kid reset",
  dog: "Dog break",
};

export function drivePicksForDay(day: Day | undefined): Partial<Record<PickRole, Stop>> {
  if (!day) return {};
  const dayStops = day.stopIds
    .map(id => stops.find(s => s.id === id))
    .filter((s): s is Stop => !!s);

  const lunch = dayStops.find(s => s.lunch)
    ?? dayStops.find(s => s.tags.includes("food-break") && s.kind !== "overnight")
    ?? dayStops.find(s => s.kind === "city") ?? dayStops[1] ?? dayStops[0];
  // The day's actual payoff — the iconic/scenic stop everyone will remember.
  const highlight = dayStops.find(s => s.kind !== "overnight" && s.id !== lunch?.id && (s.kind === "iconic" || s.tags.includes("iconic")))
    ?? dayStops.find(s => s.kind !== "overnight" && s.id !== lunch?.id && (s.kind === "scenic" || s.kind === "park" || s.tags.includes("scenic")));
  const kid = dayStops.find(s => (s.category === "playground" || s.category === "kid-museum") && s.id !== lunch?.id && s.id !== highlight?.id)
    ?? dayStops.find(s => s.tags.includes("kid-friendly") && s.kind !== "overnight" && s.id !== lunch?.id && s.id !== highlight?.id);
  const dog = dayStops.find(s => s.tags.includes("dog-friendly") && s.kind !== "overnight" && s.id !== lunch?.id && s.id !== kid?.id && s.id !== highlight?.id)
    ?? dayStops.find(s => !!s.dogNote && !s.photoOnly && s.kind !== "overnight" && s.id !== lunch?.id && s.id !== kid?.id && s.id !== highlight?.id);

  return { highlight, lunch, kid, dog };
}
