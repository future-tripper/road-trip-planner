// Northern / Middle scenic-family route from Connecticut to Del Mar, CA.
// Sources cited per-place in `sources` arrays. Pet policies change frequently —
// always verify on the hotel chain's own page before booking.

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

// =============================================================
// STOPS
// =============================================================
export const stops: Stop[] = [
  // ---------- DAY 1 — CT to Niagara region ----------
  {
    id: "hartford-ct",
    name: "Hartford, CT",
    region: "Connecticut",
    kind: "city",
    lat: 41.7658, lng: -72.6734,
    blurb: "Trip start. Top off the tank, cooler full of ice, dog walked.",
    practical: "Aim for an early roll — clearing NYC-area traffic before noon makes Day 1 much easier.",
    tags: ["food-break"],
    sources: [
      { label: "Visit Hartford", url: "https://www.visithartford.com/" }
    ],
  },
  {
    id: "howe-caverns-ny",
    name: "Howe Caverns, NY",
    region: "Upstate New York",
    kind: "scenic",
    lat: 42.6951, lng: -74.3621,
    blurb: "156 ft underground, naturally 52°F year-round — a gift in summer heat.",
    practical: "Strollers don't fit; toddler can walk the paved path or ride in a carrier. Dogs not allowed inside the cave; on-site kennel listed seasonally — call ahead.",
    tags: ["scenic","kid-friendly","easy-day"],
    sources: [
      { label: "Howe Caverns — Official", url: "https://howecaverns.com/" }
    ],
  },
  {
    id: "niagara-falls-ny",
    name: "Niagara Falls State Park, NY",
    region: "Western New York",
    kind: "iconic",
    lat: 43.0828, lng: -79.0742,
    blurb: "America's oldest state park. Free to enter; Cave of the Winds and Maid of the Mist are paid add-ons.",
    practical: "Stroller-friendly paved paths along the rim. Maid of the Mist is dog-friendly on its boats; Cave of the Winds is not. Mist is real — pack a change for the toddler.",
    tags: ["iconic","kid-friendly","dog-friendly","scenic","outdoor"],
    sources: [
      { label: "Niagara Falls State Park", url: "https://www.niagarafallsstatepark.com/" },
      { label: "Maid of the Mist", url: "https://www.maidofthemist.com/" }
    ],
  },

  // ---------- DAY 2 — Niagara to Cleveland / Cuyahoga ----------
  {
    id: "presque-isle-pa",
    name: "Presque Isle State Park, Erie, PA",
    region: "Lake Erie",
    kind: "park",
    lat: 42.1614, lng: -80.1153,
    blurb: "13 miles of sandy Great Lakes beach on a curving peninsula — easy lunch and stretch stop.",
    practical: "Dogs allowed on most beaches except Beach 6/7/8/10/11 — designated dog beaches at Beach 11 in summer. Free entry.",
    tags: ["scenic","outdoor","dog-friendly","kid-friendly","food-break"],
    sources: [
      { label: "Presque Isle SP — PA DCNR", url: "https://www.dcnr.pa.gov/StateParks/FindAPark/PresqueIsleStatePark/Pages/default.aspx" }
    ],
  },
  {
    id: "cuyahoga-valley-oh",
    name: "Cuyahoga Valley NP, OH",
    region: "Northeast Ohio",
    kind: "park",
    lat: 41.2808, lng: -81.5678,
    blurb: "Brandywine Falls, Towpath Trail, and a scenic railroad — surprisingly toddler-paced.",
    practical: "One of the most dog-friendly national parks: leashed dogs allowed on nearly all trails. Brandywine Falls boardwalk is short and stroller-friendly.",
    tags: ["scenic","outdoor","dog-friendly","kid-friendly","easy-day"],
    sources: [
      { label: "Cuyahoga Valley NP — Pets (NPS)", url: "https://www.nps.gov/cuva/planyourvisit/pets.htm" },
      { label: "Brandywine Falls (NPS)", url: "https://www.nps.gov/cuva/planyourvisit/brandywine-falls.htm" }
    ],
  },
  {
    id: "cleveland-oh",
    name: "Cleveland, OH",
    region: "Northeast Ohio",
    kind: "overnight",
    lat: 41.4993, lng: -81.6944,
    blurb: "Overnight near Edgewater Park — Lake Erie sunset, dog beach right in town.",
    practical: "Edgewater's east end has an off-leash dog beach. Skip downtown traffic; pick a hotel near I-90 west of the city.",
    tags: ["lodging","dog-friendly"],
    sources: [
      { label: "Edgewater Park — Cleveland Metroparks", url: "https://www.clevelandmetroparks.com/parks/visit/parks/lakefront-reservation/edgewater-park" }
    ],
  },

  // ---------- DAY 3 — Indiana Dunes & Chicago ----------
  {
    id: "indiana-dunes",
    name: "Indiana Dunes NP, IN",
    region: "Lake Michigan",
    kind: "park",
    lat: 41.6533, lng: -87.0524,
    blurb: "Sand dunes meeting Lake Michigan, with the Chicago skyline on the horizon.",
    practical: "Dogs on leash welcome on most beaches and trails (NOT West Beach, Cowles Bog, or Pinhook Bog). Stroller-friendly Dune Ridge Trail.",
    tags: ["scenic","outdoor","dog-friendly","kid-friendly"],
    sources: [
      { label: "Indiana Dunes NP — Pets (NPS)", url: "https://www.nps.gov/indu/planyourvisit/pets.htm" }
    ],
  },
  {
    id: "chicago-il",
    name: "Chicago, IL",
    region: "Northern Illinois",
    kind: "city",
    lat: 41.8781, lng: -87.6298,
    blurb: "Cloud Gate, Maggie Daley playground, deep-dish for dinner. A real city night.",
    practical: "Maggie Daley Park's play garden is free, fenced, and made for 3-year-olds. Most riverwalk patios are dog-welcoming. Heat: Lakefront Trail breeze beats inland blocks.",
    tags: ["iconic","kid-friendly","food-break","lodging"],
    sources: [
      { label: "Maggie Daley Park", url: "https://maggiedaleypark.com/things-to-do/play-garden/" },
      { label: "Choose Chicago — pet-friendly", url: "https://www.choosechicago.com/things-to-do/family-friendly/pet-friendly/" }
    ],
  },

  // ---------- DAY 4 — Chicago to Mississippi River / Iowa ----------
  {
    id: "starved-rock-il",
    name: "Starved Rock State Park, IL",
    region: "Illinois River Valley",
    kind: "park",
    lat: 41.3197, lng: -89.0001,
    blurb: "Short, kid-paced trails to canyons and seasonal waterfalls — a great morning leg-stretcher.",
    practical: "Dogs on leash welcome on trails, NOT in the lodge. Strollers struggle on stairs — bring a carrier for the toddler.",
    tags: ["scenic","outdoor","dog-friendly","kid-friendly","nap-stop"],
    sources: [
      { label: "Starved Rock SP — IDNR", url: "https://dnr.illinois.gov/parks/park.starvedrock.html" }
    ],
  },
  {
    id: "field-of-dreams-ia",
    name: "Field of Dreams, Dyersville, IA",
    region: "Eastern Iowa",
    kind: "iconic",
    lat: 42.4888, lng: -91.0610,
    blurb: "The actual movie site. Free to walk the bases. Pure Americana.",
    practical: "Open daily, no reservation, free. Dogs on leash welcome on the field outside the house.",
    tags: ["iconic","kid-friendly","dog-friendly","easy-day"],
    sources: [
      { label: "Field of Dreams Movie Site", url: "https://www.fieldofdreamsmoviesite.com/" }
    ],
  },
  {
    id: "des-moines-ia",
    name: "Des Moines, IA",
    region: "Central Iowa",
    kind: "overnight",
    lat: 41.5868, lng: -93.6250,
    blurb: "Halfway-ish overnight. Pammel Park or Greenwood/Ashworth for dog walk before bed.",
    practical: "Mid-range chains cluster near I-235 and the western suburbs. Ashworth Park has shaded paths.",
    tags: ["lodging","dog-friendly"],
    sources: [
      { label: "Catch Des Moines — pet-friendly", url: "https://www.catchdesmoines.com/things-to-do/pet-friendly/" }
    ],
  },

  // ---------- DAY 5 — Des Moines to Badlands / Wall ----------
  {
    id: "wall-drug-sd",
    name: "Wall Drug, SD",
    region: "Western South Dakota",
    kind: "iconic",
    lat: 43.9939, lng: -102.2410,
    blurb: "The roadside attraction that built itself with billboards. Free ice water, 5¢ coffee, an animatronic T-Rex, and a backyard playground.",
    practical: "Massive paved parking. Dogs welcome outside; water bowls at the entrance. Indoor shaded play area for the toddler.",
    tags: ["iconic","kid-friendly","dog-friendly","food-break","easy-day"],
    sources: [
      { label: "Wall Drug Store", url: "https://www.walldrug.com/" }
    ],
  },
  {
    id: "badlands-np-sd",
    name: "Badlands NP, SD",
    region: "Western South Dakota",
    kind: "park",
    lat: 43.8554, lng: -101.9777,
    blurb: "Otherworldly stripes and spires. Dark-sky park; Big Pig Dig and prairie-dog towns delight kids.",
    practical: "Open Hike policy means kids can climb low formations. Dogs allowed in parking areas/campgrounds only — not on trails. Drive Badlands Loop Rd at golden hour, AC on full.",
    tags: ["iconic","scenic","outdoor","kid-friendly","long-day"],
    sources: [
      { label: "Badlands NP (NPS)", url: "https://www.nps.gov/badl/index.htm" },
      { label: "Pets in Badlands (NPS)", url: "https://www.nps.gov/badl/planyourvisit/pets.htm" }
    ],
  },
  {
    id: "rapid-city-sd",
    name: "Rapid City, SD",
    region: "Black Hills",
    kind: "overnight",
    lat: 44.0805, lng: -103.2310,
    blurb: "Base camp for the Black Hills. Storybook Island (free) is heaven for a 3.5-year-old.",
    practical: "Several La Quinta, Best Western, Holiday Inn Express options near I-90 exits. Verify pet rooms at booking.",
    tags: ["lodging","dog-friendly","kid-friendly"],
    sources: [
      { label: "Visit Rapid City", url: "https://www.visitrapidcity.com/" },
      { label: "Storybook Island", url: "https://www.storybookisland.org/" }
    ],
  },

  // ---------- DAY 6 — Mount Rushmore + Custer State Park ----------
  {
    id: "mount-rushmore-sd",
    name: "Mount Rushmore National Memorial, SD",
    region: "Black Hills",
    kind: "iconic",
    lat: 43.8791, lng: -103.4591,
    blurb: "The faces. Presidential Trail loops 0.6 mi under the carving — short enough for a 3-year-old.",
    practical: "Free entry, paid parking ($10/vehicle). Service animals only on Presidential Trail; pets allowed in parking lot/picnic area.",
    tags: ["iconic","scenic","kid-friendly","easy-day"],
    sources: [
      { label: "Mount Rushmore (NPS)", url: "https://www.nps.gov/moru/index.htm" },
      { label: "Pets at Mount Rushmore (NPS)", url: "https://www.nps.gov/moru/planyourvisit/pets.htm" }
    ],
  },
  {
    id: "custer-state-park-sd",
    name: "Custer State Park, SD",
    region: "Black Hills",
    kind: "park",
    lat: 43.7637, lng: -103.4214,
    blurb: "Sylvan Lake's 1.1 mi loop is the perfect kid hike. Wildlife Loop Rd has bison, burros, and prairie dogs from the car.",
    practical: "Dogs on leash welcome on most trails (excellent for a national-park-region park). Sylvan Lake water is cold but the rocks are climbable. Burros may stick their heads in the car — keep dog seated.",
    tags: ["scenic","outdoor","dog-friendly","kid-friendly","iconic"],
    sources: [
      { label: "Custer State Park", url: "https://gfp.sd.gov/parks/detail/custer-state-park/" }
    ],
  },

  // ---------- DAY 7 — Black Hills to Cody / Yellowstone gateway ----------
  {
    id: "devils-tower-wy",
    name: "Devils Tower National Monument, WY",
    region: "Northeast Wyoming",
    kind: "iconic",
    lat: 44.5902, lng: -104.7146,
    blurb: "America's first national monument. The 1.3 mi Tower Trail circles the base.",
    practical: "Pets allowed only in parking areas, on roadways, and at the campground. The Tower Trail is closed to pets. Service animals welcome everywhere.",
    tags: ["iconic","scenic","outdoor","kid-friendly"],
    sources: [
      { label: "Devils Tower (NPS)", url: "https://www.nps.gov/deto/index.htm" },
      { label: "Pets at Devils Tower", url: "https://www.nps.gov/deto/planyourvisit/pets.htm" }
    ],
  },
  {
    id: "cody-wy",
    name: "Cody, WY",
    region: "Yellowstone gateway",
    kind: "overnight",
    lat: 44.5263, lng: -109.0566,
    blurb: "Buffalo Bill country. The Buffalo Bill Center of the West has 5 museums under one roof.",
    practical: "Cody is more dog-flexible than inside Yellowstone. Walk the Shoshone River paths in the cool morning.",
    tags: ["lodging","dog-friendly","iconic","kid-friendly","long-day"],
    sources: [
      { label: "Visit Cody/Yellowstone", url: "https://www.codyyellowstone.org/" },
      { label: "Buffalo Bill Center of the West", url: "https://centerofthewest.org/" }
    ],
  },

  // ---------- DAY 8 — Yellowstone (Lamar / Hayden) ----------
  {
    id: "yellowstone-np",
    name: "Yellowstone NP, WY",
    region: "Greater Yellowstone",
    kind: "park",
    lat: 44.4280, lng: -110.5885,
    blurb: "Old Faithful, Grand Prismatic, and bison traffic jams. Plan for one big-loop day.",
    practical: "Pets stay in cars or within 100 ft of roads/parking — no trails or boardwalks. Plan to leave the dog with one parent or in a kennel for boardwalk stops; never leave a pet in a hot car. Enter from the East Entrance via Cody.",
    tags: ["iconic","scenic","outdoor","kid-friendly","long-day"],
    sources: [
      { label: "Pets in Yellowstone (NPS)", url: "https://www.nps.gov/yell/planyourvisit/pets.htm" },
      { label: "Yellowstone NP (NPS)", url: "https://www.nps.gov/yell/index.htm" }
    ],
  },
  {
    id: "jackson-wy",
    name: "Jackson, WY",
    region: "Teton Valley",
    kind: "overnight",
    lat: 43.4799, lng: -110.7624,
    blurb: "Town Square's antler arches, Snow King for a fast scenic chairlift, dog-friendly patios.",
    practical: "Lodging is pricier than the rest of the trip — book early. Pet-friendly options include Hampton Inn Jackson and Anvil Hotel.",
    tags: ["lodging","dog-friendly","scenic","kid-friendly"],
    sources: [
      { label: "Visit Jackson Hole — pet-friendly", url: "https://www.visitjacksonhole.com/things-to-do/pet-friendly" }
    ],
  },

  // ---------- DAY 9 — Tetons + drive south ----------
  {
    id: "grand-teton-np",
    name: "Grand Teton NP, WY",
    region: "Teton Range",
    kind: "park",
    lat: 43.7904, lng: -110.6818,
    blurb: "Jenny Lake shore, Mormon Row barns, Snake River overlooks — postcard country.",
    practical: "Same NPS pet rules as Yellowstone. Stroller-friendly Lakeshore Trail at Colter Bay (2 mi). Bring afternoon snacks; toddler nap window is the long drive south.",
    tags: ["scenic","outdoor","kid-friendly","iconic"],
    sources: [
      { label: "Grand Teton NP (NPS)", url: "https://www.nps.gov/grte/index.htm" }
    ],
  },
  {
    id: "salt-lake-city-ut",
    name: "Salt Lake City, UT",
    region: "Wasatch Front",
    kind: "overnight",
    lat: 40.7608, lng: -111.8910,
    blurb: "Liberty Park playground, dog-friendly Memory Grove trails, Lagoon if you want a low-key amusement-park add-on.",
    practical: "Best Western Plus and Kimpton Hotel Monaco both pet-friendly. Liberty Park has a 1.5 mi shaded loop with playground in the middle.",
    tags: ["lodging","dog-friendly","kid-friendly","long-day"],
    sources: [
      { label: "Visit Salt Lake — pet-friendly", url: "https://www.visitsaltlake.com/blog/post/pet-friendly-salt-lake/" }
    ],
  },

  // ---------- DAY 10 — SLC to Bryce / Zion side ----------
  {
    id: "bryce-canyon-np",
    name: "Bryce Canyon NP, UT",
    region: "Southern Utah",
    kind: "park",
    lat: 37.5930, lng: -112.1871,
    blurb: "Hoodoos at Sunset Point and Inspiration Point — accessible from the rim with no hiking required.",
    practical: "Dogs allowed on the paved 1-mile Rim Trail between Sunset and Sunrise Points (rare among Utah parks). Elevation 8,000–9,000 ft — go slow with the toddler.",
    tags: ["iconic","scenic","outdoor","dog-friendly","kid-friendly"],
    sources: [
      { label: "Bryce Canyon Pets (NPS)", url: "https://www.nps.gov/brca/planyourvisit/pets.htm" }
    ],
  },
  {
    id: "zion-np",
    name: "Zion NP, UT",
    region: "Southern Utah",
    kind: "park",
    lat: 37.2982, lng: -113.0263,
    blurb: "The Pa'rus Trail is a paved 1.7 mi riverside walk — open to bikes, strollers, and leashed dogs.",
    practical: "Pa'rus is the ONLY Zion trail open to pets. Shuttle does not allow pets except service animals. Mt. Carmel Hwy from the east entrance is family-pleasing.",
    tags: ["iconic","scenic","outdoor","dog-friendly","kid-friendly"],
    sources: [
      { label: "Zion Pa'rus Trail (NPS)", url: "https://www.nps.gov/zion/planyourvisit/the-pa-rus-trail.htm" },
      { label: "Pets in Zion (NPS)", url: "https://www.nps.gov/zion/planyourvisit/pets.htm" }
    ],
  },
  {
    id: "st-george-ut",
    name: "St. George, UT",
    region: "Southern Utah",
    kind: "overnight",
    lat: 37.0965, lng: -113.5684,
    blurb: "Lower-elevation overnight than Bryce — easier on a tired toddler. Lots of mid-range chains.",
    practical: "Town Square downtown has a splash pad, carousel, and shaded play area. Dog walks best after sundown — pavement is hot.",
    tags: ["lodging","kid-friendly","dog-friendly"],
    sources: [
      { label: "Greater Zion — Family", url: "https://www.greaterzion.com/things-to-do/family-friendly/" }
    ],
  },

  // ---------- DAY 11 — Vegas pause + Mojave ----------
  {
    id: "valley-of-fire-nv",
    name: "Valley of Fire SP, NV",
    region: "Mojave (NV)",
    kind: "park",
    lat: 36.4860, lng: -114.5331,
    blurb: "Red sandstone formations and petroglyphs an hour northeast of Vegas. Easier and quieter than Red Rock.",
    practical: "Dogs on leash welcome on all trails. Mouse's Tank/Petroglyph Canyon is flat and stroller-passable. SUMMER: go at sunrise — temps hit 110°+ by noon.",
    tags: ["scenic","outdoor","dog-friendly","kid-friendly","iconic"],
    sources: [
      { label: "Valley of Fire SP", url: "https://parks.nv.gov/parks/valley-of-fire" }
    ],
  },
  {
    id: "las-vegas-nv",
    name: "Las Vegas, NV",
    region: "Mojave (NV)",
    kind: "overnight",
    lat: 36.1699, lng: -115.1398,
    blurb: "Skip the Strip — sleep in Henderson or Summerlin where pools are family-pet flexible.",
    practical: "Pet-friendly: Vdara, Waldorf Astoria, and many Hilton-brand hotels. Many Strip casino-hotels are NOT pet-friendly. Confirm before driving in.",
    tags: ["lodging","dog-friendly","food-break"],
    sources: [
      { label: "Visit Las Vegas — pet-friendly", url: "https://www.visitlasvegas.com/things-to-do/pet-friendly/" }
    ],
  },

  // ---------- DAY 12 — Vegas to Del Mar ----------
  {
    id: "joshua-tree-np",
    name: "Joshua Tree NP, CA",
    region: "Southern California desert",
    kind: "park",
    lat: 33.8734, lng: -115.9010,
    blurb: "Optional cool-morning detour. Hidden Valley Nature Trail is a flat 1-mile loop through giant boulders.",
    practical: "SUMMER: only do the morning hours. Dogs allowed in campgrounds and on roads but NOT on trails. Skip if forecast > 95°F.",
    tags: ["scenic","outdoor","kid-friendly","iconic"],
    sources: [
      { label: "Joshua Tree NP (NPS)", url: "https://www.nps.gov/jotr/index.htm" },
      { label: "Pets at Joshua Tree", url: "https://www.nps.gov/jotr/planyourvisit/pets.htm" }
    ],
  },
  {
    id: "del-mar-ca",
    name: "Del Mar, CA",
    region: "San Diego North County",
    kind: "overnight",
    lat: 32.9595, lng: -117.2653,
    blurb: "Dog Beach at North Beach (Rivermouth) is famous — leash-optional September–May, leashed in summer.",
    practical: "Powerhouse Park is grassy, fenced, with bluff views. Heat: marine layer keeps mornings cool — beat midday with a beach picnic.",
    tags: ["lodging","scenic","dog-friendly","kid-friendly","iconic"],
    sources: [
      { label: "Del Mar — Dog Beach", url: "https://www.delmar.ca.us/263/Beaches" },
      { label: "Visit Del Mar", url: "https://www.delmarvillage.com/" }
    ],
  },

  // ---------- ALT ROUTE (more direct fallback) — sample alternate stops ----------
  {
    id: "alt-st-louis-mo",
    name: "Gateway Arch, St. Louis, MO",
    region: "Direct route — Missouri",
    kind: "iconic",
    lat: 38.6247, lng: -90.1848,
    blurb: "Direct-route alternate. Skip Niagara/Black Hills, pick up the Arch and head SW.",
    practical: "Tram to the top is paid; the riverfront park is free. Dogs welcome on the grounds, not in the museum.",
    tags: ["iconic","kid-friendly"],
    sources: [
      { label: "Gateway Arch NP (NPS)", url: "https://www.nps.gov/jeff/index.htm" }
    ],
  },
  {
    id: "alt-okc",
    name: "Oklahoma City, OK",
    region: "Direct route — OK",
    kind: "city",
    lat: 35.4676, lng: -97.5164,
    blurb: "Direct-route overnight — Bricktown has dog-friendly patios and a kid-friendly canal water taxi.",
    practical: "Mid-range chains cluster near I-40 and the airport. Heat: 100°+ common in July/August.",
    tags: ["lodging","food-break"],
    sources: [
      { label: "Visit OKC", url: "https://www.visitokc.com/" }
    ],
  },
  {
    id: "alt-amarillo-tx",
    name: "Cadillac Ranch, Amarillo, TX",
    region: "Direct route — TX",
    kind: "iconic",
    lat: 35.1872, lng: -101.9870,
    blurb: "Ten Cadillacs nose-down in a wheat field. Bring spray paint, take photos, leave.",
    practical: "Always free, always open. Walking is muddy after rain. Dogs welcome.",
    tags: ["iconic","dog-friendly","kid-friendly","food-break"],
    sources: [
      { label: "Cadillac Ranch — Visit Amarillo", url: "https://www.visitamarillo.com/listing/cadillac-ranch/3014/" }
    ],
  },
  {
    id: "alt-flagstaff-az",
    name: "Flagstaff, AZ",
    region: "Direct route — AZ",
    kind: "overnight",
    lat: 35.1983, lng: -111.6513,
    blurb: "Mountain-town overnight — 7,000 ft elevation cools things off. Walnut Canyon NM nearby.",
    practical: "Many independent and chain pet-friendly options. Cooler than Phoenix or Vegas in summer.",
    tags: ["lodging","scenic","dog-friendly"],
    sources: [
      { label: "Discover Flagstaff", url: "https://www.flagstaffarizona.org/" }
    ],
  },

  // ---------- COMPARISON ROUTE A — Rockies + Utah red-rock arc ----------
  {
    id: "cmp-indianapolis-in",
    name: "Children's Museum of Indianapolis, IN",
    region: "Rockies route — Indiana",
    kind: "iconic",
    lat: 39.8106, lng: -86.1579,
    blurb: "One of the strongest preschooler stops in the country: dinosaurs, trains, water play, and indoor AC.",
    practical: "Best as a half-day break after two harder driving days. Dog needs hotel/daycare logistics while you are inside.",
    tags: ["kid-friendly","iconic","nap-stop"],
    sources: [
      { label: "Children's Museum of Indianapolis", url: "https://www.childrensmuseum.org/" }
    ],
  },
  {
    id: "cmp-gateway-arch-mo",
    name: "Gateway Arch National Park, St. Louis, MO",
    region: "Rockies route — Missouri",
    kind: "iconic",
    lat: 38.6247, lng: -90.1848,
    blurb: "A true cross-country milestone: riverfront lawn, Arch photos, and an easy stroller walk.",
    practical: "Leashed dogs can enjoy the grounds, but not the tram or museum. Go early for shade and easier parking.",
    tags: ["iconic","kid-friendly","dog-friendly","outdoor"],
    sources: [
      { label: "Gateway Arch NP — NPS", url: "https://www.nps.gov/jeff/index.htm" },
      { label: "Gateway Arch NP — Pets", url: "https://www.nps.gov/jeff/planyourvisit/pets.htm" }
    ],
  },
  {
    id: "cmp-kansas-city-mo",
    name: "Kansas City, MO",
    region: "Rockies route — Missouri/Kansas",
    kind: "overnight",
    lat: 39.0997, lng: -94.5786,
    blurb: "Comfortable middle-country overnight with good hotels, BBQ takeout, and large parks for dog walks.",
    practical: "Loose Park and riverfront paths are easier with a toddler than downtown entertainment districts.",
    tags: ["lodging","food-break","dog-friendly"],
    sources: [
      { label: "Visit KC", url: "https://www.visitkc.com/" }
    ],
  },
  {
    id: "cmp-denver-co",
    name: "Denver, CO",
    region: "Rockies route — Colorado",
    kind: "overnight",
    lat: 39.7392, lng: -104.9903,
    blurb: "Reset night before the mountains: good hotel supply, parks, kid museums, and cooler evenings.",
    practical: "Pick Cherry Creek, Westminster, or Golden if you want easier dog walks and less downtown friction.",
    tags: ["lodging","kid-friendly","dog-friendly"],
    sources: [
      { label: "Visit Denver", url: "https://www.denver.org/" }
    ],
  },
  {
    id: "cmp-garden-of-gods-co",
    name: "Garden of the Gods, Colorado Springs, CO",
    region: "Rockies route — Colorado",
    kind: "scenic",
    lat: 38.8784, lng: -104.8698,
    blurb: "Red rock fins, paved paths, and mountain views without a national-park pet restriction problem.",
    practical: "Leashed dogs are welcome; the Perkins Central Garden Trail is the easy family loop. Morning is best in summer.",
    tags: ["scenic","outdoor","dog-friendly","kid-friendly"],
    sources: [
      { label: "Garden of the Gods", url: "https://gardenofgods.com/" }
    ],
  },
  {
    id: "cmp-great-sand-dunes-co",
    name: "Great Sand Dunes NP, CO",
    region: "Rockies route — Colorado",
    kind: "park",
    lat: 37.7916, lng: -105.5943,
    blurb: "Massive dunes, splashy Medano Creek in early summer, and mountain scenery that feels different from Utah.",
    practical: "Leashed pets are allowed in the main use areas and on the Preserve's Mosca Pass Trail. Sand can burn paws; go sunrise/evening.",
    tags: ["scenic","outdoor","dog-friendly","kid-friendly","iconic"],
    sources: [
      { label: "Great Sand Dunes — Pets (NPS)", url: "https://www.nps.gov/grsa/planyourvisit/pets.htm" }
    ],
  },
  {
    id: "cmp-moab-ut",
    name: "Moab, UT",
    region: "Rockies route — Utah",
    kind: "overnight",
    lat: 38.5733, lng: -109.5498,
    blurb: "Iconic red-rock basecamp for Arches, Canyonlands viewpoints, river drives, and hotel-pool recovery.",
    practical: "Arches/Canyonlands have strict pet limits on trails, but Moab has dog-friendly patios, paved paths, and scenic drives. Book early.",
    tags: ["lodging","scenic","iconic","food-break"],
    sources: [
      { label: "Discover Moab", url: "https://www.discovermoab.com/" },
      { label: "Arches NP — Pets", url: "https://www.nps.gov/arch/planyourvisit/pets.htm" }
    ],
  },
  {
    id: "cmp-capitol-reef-ut",
    name: "Capitol Reef / Fruita, UT",
    region: "Rockies route — Utah",
    kind: "park",
    lat: 38.2889, lng: -111.2470,
    blurb: "Orchards, cliffs, pie at Gifford House, and a calmer red-rock park than Zion or Arches.",
    practical: "Pets are allowed on the trail from the visitor center to Fruita Campground and on roads/open areas; not most hiking trails.",
    tags: ["scenic","iconic","kid-friendly","outdoor"],
    sources: [
      { label: "Capitol Reef — Pets (NPS)", url: "https://www.nps.gov/care/planyourvisit/pets.htm" }
    ],
  },

  // ---------- COMPARISON ROUTE B — Blue Ridge + Texas / New Mexico desert ----------
  {
    id: "cmp-shenandoah-va",
    name: "Shenandoah NP / Skyline Drive, VA",
    region: "Blue Ridge route — Virginia",
    kind: "park",
    lat: 38.2928, lng: -78.6796,
    blurb: "Big mountain views close to the East Coast, with short overlooks instead of long hikes.",
    practical: "Shenandoah is unusually dog-friendly for a national park: pets are allowed on most trails. Skyline Drive is easy nap-window scenery.",
    tags: ["scenic","outdoor","dog-friendly","kid-friendly"],
    sources: [
      { label: "Shenandoah — Pets (NPS)", url: "https://www.nps.gov/shen/planyourvisit/pets.htm" }
    ],
  },
  {
    id: "cmp-asheville-nc",
    name: "Asheville, NC",
    region: "Blue Ridge route — North Carolina",
    kind: "overnight",
    lat: 35.5951, lng: -82.5515,
    blurb: "Blue Ridge Parkway access, easy food, and a dog-friendly mountain-town feel.",
    practical: "Biltmore grounds/gardens are dog-friendly outdoors, but buildings are not. Stay east or south of town for better rates.",
    tags: ["lodging","scenic","dog-friendly","food-break"],
    sources: [
      { label: "Explore Asheville", url: "https://www.exploreasheville.com/" },
      { label: "Biltmore — Pet policy", url: "https://www.biltmore.com/help-center/what-is-your-pet-policy/" }
    ],
  },
  {
    id: "cmp-nashville-tn",
    name: "Nashville, TN",
    region: "Blue Ridge route — Tennessee",
    kind: "overnight",
    lat: 36.1627, lng: -86.7816,
    blurb: "Music-city overnight with kid-friendly parks, easy food, and hotel density.",
    practical: "Avoid Broadway with a toddler and dog. Centennial Park is the better family/dog reset.",
    tags: ["lodging","iconic","kid-friendly","food-break"],
    sources: [
      { label: "Visit Music City", url: "https://www.visitmusiccity.com/" }
    ],
  },
  {
    id: "cmp-shelby-farms-tn",
    name: "Shelby Farms Park, Memphis, TN",
    region: "Blue Ridge route — Tennessee",
    kind: "break",
    lat: 35.1379, lng: -89.8343,
    blurb: "A giant urban park with trails, playgrounds, water, and one of the best dog breaks on this corridor.",
    practical: "Great place to let the toddler run before Arkansas/Texas miles. The off-leash Outback area is massive; bring towels.",
    tags: ["dog-friendly","kid-friendly","outdoor","nap-stop"],
    sources: [
      { label: "Shelby Farms Park", url: "https://www.shelbyfarmspark.org/" }
    ],
  },
  {
    id: "cmp-fort-worth-tx",
    name: "Fort Worth Stockyards, TX",
    region: "Blue Ridge route — Texas",
    kind: "iconic",
    lat: 32.7880, lng: -97.3486,
    blurb: "Longhorn cattle drive, western storefronts, and an iconic Texas stop that kids actually understand.",
    practical: "Outdoor areas are dog-manageable on leash, but heat can be brutal. Go morning, then hotel pool.",
    tags: ["iconic","kid-friendly","food-break"],
    sources: [
      { label: "Fort Worth Stockyards", url: "https://www.fortworthstockyards.org/" }
    ],
  },
  {
    id: "cmp-san-antonio-tx",
    name: "San Antonio River Walk, TX",
    region: "Blue Ridge route — Texas",
    kind: "overnight",
    lat: 29.4252, lng: -98.4946,
    blurb: "Iconic, stroller-friendly, and a nice change from highway hotels if you build in a short city night.",
    practical: "Leashed dogs are generally allowed on the public River Walk paths; avoid midday heat and crowded restaurant zones.",
    tags: ["lodging","iconic","kid-friendly","dog-friendly","food-break"],
    sources: [
      { label: "Visit San Antonio — River Walk", url: "https://www.visitsanantonio.com/things-to-do/river-walk/" }
    ],
  },
  {
    id: "cmp-carlsbad-caverns-nm",
    name: "Carlsbad Caverns NP, NM",
    region: "Blue Ridge route — New Mexico",
    kind: "park",
    lat: 32.1479, lng: -104.5567,
    blurb: "A world-class cave stop and a huge visual payoff after Texas driving.",
    practical: "Pets cannot enter the cavern or trails, but the park concessioner operates a day-use kennel. Bring vaccine records and confirm hours.",
    tags: ["iconic","kid-friendly","scenic"],
    sources: [
      { label: "Carlsbad Caverns — Pets (NPS)", url: "https://www.nps.gov/cave/planyourvisit/pets.htm" }
    ],
  },
  {
    id: "cmp-white-sands-nm",
    name: "White Sands NP, NM",
    region: "Blue Ridge route — New Mexico",
    kind: "park",
    lat: 32.7797, lng: -106.1717,
    blurb: "Otherworldly white gypsum dunes; easy, memorable, and very different from the northern route.",
    practical: "Leashed pets are allowed outdoors. Go at sunrise or sunset because reflective heat and limited shade are real.",
    tags: ["scenic","iconic","dog-friendly","kid-friendly","outdoor"],
    sources: [
      { label: "White Sands — Pets (NPS)", url: "https://www.nps.gov/whsa/planyourvisit/pets.htm" }
    ],
  },
  {
    id: "cmp-tucson-az",
    name: "Tucson / Saguaro National Park, AZ",
    region: "Blue Ridge route — Arizona",
    kind: "overnight",
    lat: 32.2226, lng: -110.9747,
    blurb: "Giant cactus scenery, good food, and a more interesting desert overnight than Phoenix.",
    practical: "Saguaro pet access is limited to roads, picnic areas, and paved trails. Summer heat makes this an early/late-only stop.",
    tags: ["lodging","scenic","iconic","food-break"],
    sources: [
      { label: "Saguaro — Pets (NPS)", url: "https://www.nps.gov/sagu/planyourvisit/pets.htm" },
      { label: "Visit Tucson", url: "https://www.visittucson.org/" }
    ],
  },
  {
    id: "cmp-yuma-az",
    name: "Yuma, AZ",
    region: "Blue Ridge route — Arizona",
    kind: "overnight",
    lat: 32.6927, lng: -114.6277,
    blurb: "Practical final desert overnight before the coast; less charming, but comfortable and efficient.",
    practical: "Prioritize pet-friendly hotels with interior corridors and a pool. Do not plan midday outdoor sightseeing in summer.",
    tags: ["lodging","dog-friendly","long-day"],
    sources: [
      { label: "Visit Yuma", url: "https://www.visityuma.com/" }
    ],
  },
];

// =============================================================
// DAYS — Northern/Middle scenic-family route
// =============================================================
export const days: Day[] = [
  {
    id: "n-day-1",
    num: 1,
    title: "Connecticut → Niagara Falls",
    from: "Hartford, CT",
    to: "Niagara Falls, NY",
    miles: 430,
    hours: 7.0,
    pace: "long",
    summary: "Big push out of the Northeast. Pull off at Howe Caverns to break up the day with a cool underground walk.",
    weatherNote: "Northeast humidity; AC won't be the primary issue today.",
    stopIds: ["hartford-ct","howe-caverns-ny","niagara-falls-ny"],
    hotelCity: "Niagara Falls",
  },
  {
    id: "n-day-2",
    num: 2,
    title: "Niagara → Cuyahoga Valley → Cleveland",
    from: "Niagara Falls, NY",
    to: "Cleveland, OH",
    miles: 285,
    hours: 4.5,
    pace: "easy",
    summary: "Lake Erie miles. Picnic at Presque Isle, then short hikes around Brandywine Falls before sleeping in Cleveland.",
    stopIds: ["niagara-falls-ny","presque-isle-pa","cuyahoga-valley-oh","cleveland-oh"],
    hotelCity: "Cleveland",
  },
  {
    id: "n-day-3",
    num: 3,
    title: "Cleveland → Indiana Dunes → Chicago",
    from: "Cleveland, OH",
    to: "Chicago, IL",
    miles: 345,
    hours: 5.5,
    pace: "moderate",
    summary: "Cross Indiana, drop down to the lakeshore, then pop into Chicago for the night.",
    stopIds: ["cleveland-oh","indiana-dunes","chicago-il"],
    hotelCity: "Chicago",
  },
  {
    id: "n-day-4",
    num: 4,
    title: "Chicago → Field of Dreams → Des Moines",
    from: "Chicago, IL",
    to: "Des Moines, IA",
    miles: 360,
    hours: 5.5,
    pace: "moderate",
    summary: "Starved Rock canyon walk in the morning, then real cornfields and the Field of Dreams.",
    stopIds: ["chicago-il","starved-rock-il","field-of-dreams-ia","des-moines-ia"],
    hotelCity: "Des Moines",
  },
  {
    id: "n-day-5",
    num: 5,
    title: "Des Moines → Wall Drug → Badlands",
    from: "Des Moines, IA",
    to: "Rapid City, SD",
    miles: 590,
    hours: 8.5,
    pace: "long",
    summary: "Longest day. Reward: Wall Drug stretch break, then a sunset Badlands Loop drive into Rapid City.",
    weatherNote: "Plains heat; AC and water for the dog. Storm watch in late afternoon.",
    stopIds: ["des-moines-ia","wall-drug-sd","badlands-np-sd","rapid-city-sd"],
    hotelCity: "Rapid City",
  },
  {
    id: "n-day-6",
    num: 6,
    title: "Black Hills day — Rushmore + Custer",
    from: "Rapid City, SD",
    to: "Rapid City, SD",
    miles: 95,
    hours: 2.5,
    pace: "easy",
    summary: "No long highway hours. Two iconic stops, lots of lake/trail breaks. Sleep in Rapid City again.",
    stopIds: ["rapid-city-sd","mount-rushmore-sd","custer-state-park-sd","rapid-city-sd"],
    hotelCity: "Rapid City",
  },
  {
    id: "n-day-7",
    num: 7,
    title: "Black Hills → Devils Tower → Cody",
    from: "Rapid City, SD",
    to: "Cody, WY",
    miles: 410,
    hours: 6.5,
    pace: "long",
    summary: "Crossing into Wyoming. Tower loop walk, then big-sky miles to Cody at the eastern Yellowstone gate.",
    stopIds: ["rapid-city-sd","devils-tower-wy","cody-wy"],
    hotelCity: "Cody",
  },
  {
    id: "n-day-8",
    num: 8,
    title: "Yellowstone day",
    from: "Cody, WY",
    to: "Jackson, WY",
    miles: 220,
    hours: 5.5,
    pace: "long",
    summary: "Enter at East Entrance. Plan around dog logistics — pets are restricted to cars/parking. Sleep in Jackson.",
    weatherNote: "Cool mornings (40s°F), warm afternoons. Layers.",
    stopIds: ["cody-wy","yellowstone-np","jackson-wy"],
    hotelCity: "Jackson",
  },
  {
    id: "n-day-9",
    num: 9,
    title: "Tetons → Salt Lake City",
    from: "Jackson, WY",
    to: "Salt Lake City, UT",
    miles: 285,
    hours: 5.0,
    pace: "moderate",
    summary: "Slow morning at Jenny Lake or Colter Bay, then south through Star Valley and into SLC.",
    stopIds: ["jackson-wy","grand-teton-np","salt-lake-city-ut"],
    hotelCity: "Salt Lake City",
  },
  {
    id: "n-day-10",
    num: 10,
    title: "SLC → Bryce → Zion → St. George",
    from: "Salt Lake City, UT",
    to: "St. George, UT",
    miles: 380,
    hours: 6.5,
    pace: "long",
    summary: "Two parks in one day if you only do rim viewpoints + Pa'rus. Skip if everyone's tired — sub Bryce only.",
    weatherNote: "Bryce is high (8,500 ft) and cool; Zion + St. George can be 100°+. Big swing.",
    stopIds: ["salt-lake-city-ut","bryce-canyon-np","zion-np","st-george-ut"],
    hotelCity: "St. George",
  },
  {
    id: "n-day-11",
    num: 11,
    title: "St. George → Valley of Fire → Vegas",
    from: "St. George, UT",
    to: "Las Vegas, NV",
    miles: 175,
    hours: 3.0,
    pace: "easy",
    summary: "Sunrise Valley of Fire, lazy afternoon by the hotel pool, dinner away from the Strip.",
    weatherNote: "DESERT HEAT — outdoor stops only before 10am and after 6pm.",
    stopIds: ["st-george-ut","valley-of-fire-nv","las-vegas-nv"],
    hotelCity: "Las Vegas",
  },
  {
    id: "n-day-12",
    num: 12,
    title: "Vegas → Del Mar (arrive)",
    from: "Las Vegas, NV",
    to: "Del Mar, CA",
    miles: 335,
    hours: 5.0,
    pace: "moderate",
    summary: "Optional cool-morning Joshua Tree if temps cooperate, otherwise straight through to the Pacific.",
    weatherNote: "Marine layer kicks in past Temecula; the dog will love the temperature drop.",
    stopIds: ["las-vegas-nv","joshua-tree-np","del-mar-ca"],
    hotelCity: "Del Mar",
  },
];

// =============================================================
// ROUTES
// =============================================================
export const routes: Route[] = [
  {
    id: "northern-scenic",
    name: "Northern Scenic Family Route",
    tagline: "12 days · ~3,910 mi · National parks, Great Lakes, Black Hills",
    totalMiles: 3910,
    totalDays: 12,
    description:
      "Up through New York, along the Great Lakes, across the Plains to the Black Hills, into Yellowstone and the Tetons, then down through Utah's Mighty 5 corner before the desert run to the Pacific. Built for mixed pace, two longer push days, plenty of nature and Americana, and family-practical overnights.",
    dayIds: days.map((d) => d.id),
  },
  {
    id: "direct-southern",
    name: "Direct Southern Route (comparison)",
    tagline: "8 days · ~3,000 mi · I-70 / I-40 the fast way",
    totalMiles: 3000,
    totalDays: 8,
    description:
      "Closer to the trip you previously took. Hartford → Pittsburgh → St. Louis → Oklahoma City → Amarillo → Albuquerque/Flagstaff → Vegas → Del Mar. Faster, fewer parks, more highway. Use this if weather forces a re-route or if a family member needs to fly out.",
    dayIds: [], // shown as comparison only — not a day-by-day plan in v1
    comparisonStopIds: ["hartford-ct","alt-st-louis-mo","alt-oklahoma-city-ok","alt-cadillac-ranch-tx","alt-flagstaff-az","las-vegas-nv","del-mar-ca"],
    overnightCities: ["Pittsburgh","St. Louis","Oklahoma City","Amarillo","Flagstaff","Las Vegas"],
    strengths: ["Fastest backup", "Easy interstate hotel supply", "Simple if weather disrupts the northern plan"],
    cautions: ["Feels closest to Route 66", "More highway monotony", "Hot Southwest finish"],
    recommendation: "Use only as a safety valve, not the best family-vacation route.",
    color: "terra",
  },
  {
    id: "rockies-red-rock",
    name: "Rockies + Utah Red-Rock Route",
    tagline: "12-13 days · ~3,420 mi · Kids museums, Colorado, Moab, Utah parks",
    totalMiles: 3420,
    totalDays: 13,
    description:
      "A middle corridor that trades Yellowstone/Black Hills for Indianapolis, St. Louis, Denver, Garden of the Gods, Great Sand Dunes, Moab, Capitol Reef, St. George, and Vegas. This is probably the best 'new route' if you want iconic scenery, comfortable hotel markets, and fewer extreme dog restrictions than Yellowstone.",
    dayIds: [],
    comparisonStopIds: ["hartford-ct","cuyahoga-valley-oh","cmp-indianapolis-in","cmp-gateway-arch-mo","cmp-kansas-city-mo","cmp-denver-co","cmp-garden-of-gods-co","cmp-great-sand-dunes-co","cmp-moab-ut","cmp-capitol-reef-ut","st-george-ut","las-vegas-nv","del-mar-ca"],
    overnightCities: ["Cleveland/Westlake","Indianapolis","St. Louis","Kansas City","Denver/Golden","Alamosa","Moab","Torrey or St. George","Las Vegas"],
    strengths: ["Best balance of iconic + kid-friendly + dog-manageable", "Strong hotel markets most nights", "Less remote than the Yellowstone version", "Great indoor kid breaks early in the trip"],
    cautions: ["Moab and southern Utah are hot in summer", "Arches/Canyonlands limit dogs on trails", "Some mountain/desert days still need sunrise starts"],
    recommendation: "Best contender for your family if you want the strongest alternative to the current northern route.",
    color: "blue",
  },
  {
    id: "blue-ridge-desert",
    name: "Blue Ridge + Texas Desert Route",
    tagline: "13-14 days · ~3,520 mi · Shenandoah, Nashville, Texas icons, White Sands",
    totalMiles: 3520,
    totalDays: 14,
    description:
      "A southeastern-to-southwestern arc through Shenandoah, Asheville, Nashville, Memphis, Fort Worth, San Antonio, Carlsbad Caverns, White Sands, Tucson, and Yuma. It is culturally rich and kid-friendly, but the summer heat and long Texas/New Mexico stretches make it the least comfortable with a dog unless you build in early starts and pool afternoons.",
    dayIds: [],
    comparisonStopIds: ["hartford-ct","cmp-shenandoah-va","cmp-asheville-nc","cmp-nashville-tn","cmp-shelby-farms-tn","cmp-fort-worth-tx","cmp-san-antonio-tx","cmp-carlsbad-caverns-nm","cmp-white-sands-nm","cmp-tucson-az","cmp-yuma-az","del-mar-ca"],
    overnightCities: ["Harrisonburg/Staunton","Asheville","Nashville","Memphis","Fort Worth","San Antonio","Carlsbad","Las Cruces","Tucson","Yuma"],
    strengths: ["Most varied culture/food/music stops", "Very strong kid attractions", "White Sands and Carlsbad are unforgettable", "Good hotel density in eastern half"],
    cautions: ["Hottest route for a dog", "Very long Texas crossing", "Carlsbad needs kennel logistics", "Less scenic driving between major stops"],
    recommendation: "Choose only if the family is excited by music/Texas/New Mexico icons and you can manage heat aggressively.",
    color: "purple",
  },
];

// =============================================================
// HOTELS — chain-level picks per overnight city
// =============================================================
const ALL_AKC: Source = {
  label: "AKC — Pet-friendly hotel chains overview",
  url: "https://www.akc.org/expert-advice/travel/a-guide-to-pet-friendly-hotel-chains-in-the-united-states/",
};

const standardPicks = (city: string, state: string): HotelPick[] => [
  {
    brand: "La Quinta by Wyndham",
    tier: "mid",
    policy: "Up to 2 pets per room. Pet fee usually $25/night, capped around $75/stay. Some properties have weight limits — verify on the property page.",
    source: { label: "La Quinta pet policy", url: "https://www.wyndhamhotels.com/laquinta/about-us/pet-friendly" },
    searchLink: { label: `Search La Quinta in ${city}`, url: `https://www.wyndhamhotels.com/laquinta/${encodeURIComponent(city)}-${state.toLowerCase()}/hotels` },
  },
  {
    brand: "Best Western",
    tier: "mid",
    policy: "Up to 2 dogs per room, up to 80 lbs each. Up to $40/night fee per room and a refundable damage deposit up to $150 per stay can apply. Always book direct.",
    source: { label: "Best Western pet policy", url: "https://www.bestwestern.com/en_US/hotels/discover-best-western/pet-friendly-hotels.html" },
    searchLink: { label: `Search Best Western in ${city}`, url: `https://www.bestwestern.com/en_US/hotels/${state.toLowerCase()}/${encodeURIComponent(city.toLowerCase().replace(/\s+/g,"-"))}-hotels.html` },
  },
  {
    brand: "Red Roof / Red Roof PLUS+",
    tier: "budget",
    policy: "First pet stays free; 2nd pet $15/night. Up to 80 lbs per pet. Service animals free at every property.",
    source: { label: "Red Roof pet policy", url: "https://www.redroof.com/why-red-roof/pet-policy" },
    searchLink: { label: `Search Red Roof in ${city}`, url: `https://www.redroof.com/search?searchString=${encodeURIComponent(city + ", " + state)}` },
  },
  {
    brand: "Motel 6",
    tier: "budget",
    policy: "Pets stay FREE at every Motel 6 location, no weight limit, up to 2 pets/room. Best budget fallback.",
    source: { label: "Motel 6 — petswelcome summary", url: "https://www.petswelcome.com/pet-friendly-hotels/chains" },
    searchLink: { label: `Search Motel 6 in ${city}`, url: `https://www.motel6.com/en/home/search.html?location=${encodeURIComponent(city + ", " + state)}` },
  },
  {
    brand: "Kimpton (boutique splurge)",
    tier: "boutique",
    policy: "Any pet, any size, any breed — no fee, no deposit. Bowls, beds, treats provided. Limited markets but worth it where available.",
    source: { label: "Kimpton pet-friendly", url: "https://www.ihg.com/kimptonhotels/content/us/en/promos/pet-friendly-hotels" },
    searchLink: { label: `Search Kimpton near ${city}`, url: `https://www.ihg.com/kimptonhotels/hotels/us/en/find-hotels/hotel/list?qDest=${encodeURIComponent(city + ", " + state)}&qPt=CASH&qSrt=sBR&qSlH=&qRms=1&qAdlt=2&qChld=0&qCpw=0` },
  },
  {
    brand: "BringFido — independent listings",
    tier: "mid",
    policy: "Aggregator. Useful for one-off motels and B&Bs with explicit pet policies. Always re-confirm by calling.",
    source: { label: "BringFido", url: "https://www.bringfido.com/lodging/" },
    searchLink: { label: `BringFido — ${city}`, url: `https://www.bringfido.com/lodging/city/${encodeURIComponent(city.toLowerCase().replace(/\s+/g,"_"))}_${state.toLowerCase()}_us/` },
  },
];

export const hotels: Hotel[] = [
  {
    city: "Niagara Falls", state: "NY",
    notes: "Stay on the U.S. side near the State Park to skip border lines with a dog. Properties along Buffalo Ave have river views.",
    picks: standardPicks("Niagara Falls","NY"),
  },
  {
    city: "Cleveland", state: "OH",
    notes: "Pick a hotel west of downtown near I-90 (Westlake/Rocky River) for an easy Day-3 morning departure.",
    picks: standardPicks("Cleveland","OH"),
  },
  {
    city: "Chicago", state: "IL",
    notes: "Kimpton Hotel Allegro and Kimpton Gray are downtown and pet-perfect; for a budget, check Hampton Inn O'Hare with pet rooms.",
    picks: standardPicks("Chicago","IL"),
  },
  {
    city: "Des Moines", state: "IA",
    notes: "I-235 west side has clusters of pet-friendly chains. Living History Farms is a fun morning-of-Day-5 add-on.",
    picks: standardPicks("Des Moines","IA"),
  },
  {
    city: "Rapid City", state: "SD",
    notes: "Two nights here. Pick a property near I-90 with a real grass area — your dog will need a real walk after the long day.",
    picks: standardPicks("Rapid City","SD"),
  },
  {
    city: "Cody", state: "WY",
    notes: "Old Trail Town and the Buffalo Bill Center keep kids engaged. Cody Cowboy Village (cabins) and Best Western Premier Ivy Inn both list pet rooms.",
    picks: standardPicks("Cody","WY"),
  },
  {
    city: "Jackson", state: "WY",
    notes: "Most expensive overnight on the trip. Anvil Hotel and Hampton Inn Jackson Hole both pet-friendly. Book months ahead for summer.",
    picks: standardPicks("Jackson","WY"),
  },
  {
    city: "Salt Lake City", state: "UT",
    notes: "Hotel Monaco (Kimpton) downtown is a no-fee pet stay if you want a treat. Many Best Western Plus airport-area options as a fallback.",
    picks: standardPicks("Salt Lake City","UT"),
  },
  {
    city: "St. George", state: "UT",
    notes: "Lower elevation = warmer than Bryce. Pool is a feature you'll use. Inn on the Cliff and many La Quintas allow pets.",
    picks: standardPicks("St. George","UT"),
  },
  {
    city: "Las Vegas", state: "NV",
    notes: "Confirm pets BEFORE arrival — many casino-hotels don't allow them. Vdara and Waldorf Astoria are reliable; off-Strip Hampton/Hilton Garden Inn properties also work.",
    picks: standardPicks("Las Vegas","NV"),
  },
  {
    city: "Del Mar", state: "CA",
    notes: "L'Auberge Del Mar is a pet-welcome splurge ($250 fee/stay). For budget, look in nearby Solana Beach or Carmel Valley. Powerhouse Park is your morning dog walk.",
    picks: standardPicks("Del Mar","CA"),
  },
];

export const akcOverviewSource = ALL_AKC;
