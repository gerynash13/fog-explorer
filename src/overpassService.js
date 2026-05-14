// ─── OVERPASS API SERVICE ────────────────────────────────────────────────────
// This module handles all communication with Overpass. 
// It is a plain JS module — no React, no hooks, no JSX.
// Think of it like a Python class with static methods.

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

// How large each "fetch zone" is in meters.
// When the player enters a new zone, we fetch places for that area.
// Larger = fewer fetches but coarser coverage. 600m is a good balance.
const FETCH_ZONE_METERS = 600;

// Radius around the player to fetch places within.
// Slightly larger than FETCH_ZONE_METERS to avoid gaps at zone borders.
const FETCH_RADIUS_METERS = 700;

// ─── CACHE ───────────────────────────────────────────────────────────────────
// A simple in-memory Map: "zoneX,zoneY" → array of places.
// In-memory means it resets when the page refreshes — good enough for now.
// Phase 5 will persist this to localStorage or SQLite.
const cache = new Map();

// ─── INTERESTING PLACE TYPES ─────────────────────────────────────────────────
// OSM tags places with key=value pairs like amenity=cafe or tourism=museum.
// These are the categories we consider quest-worthy.
// Add or remove freely — this is your game's definition of "interesting".
export const INTERESTING_TYPES = {
  amenity: [
    "cafe", "restaurant", "bar", "pub", "fast_food", "ice_cream",
    "library", "cinema", "theatre", "marketplace", "community_centre",
  ],
  leisure: [
    "park", "garden", "sports_centre", "playground", "nature_reserve",
  ],
  tourism: [
    "museum", "attraction", "viewpoint", "gallery", "artwork",
    "information", "zoo", "aquarium",
  ],
  shop: [
    "bakery", "books", "supermarket", "convenience",
  ],
  historic: [
    "monument", "castle", "temple", "shrine", "ruins", "memorial",
  ],
};

// ─── COORDINATE → ZONE ───────────────────────────────────────────────────────
// Same tile-grid concept as the fog system, but with a larger cell size.
// Each zone is FETCH_ZONE_METERS wide. The player triggers a fetch when they
// first enter a zone they haven't been in before.
function latLngToZone(lat, lng) {
  return {
    x: Math.floor((lat * 111_000) / FETCH_ZONE_METERS),
    y: Math.floor((lng * 111_000) / FETCH_ZONE_METERS),
  };
}

// ─── QUERY BUILDER ───────────────────────────────────────────────────────────
// Builds an Overpass QL query string.
// QL (Query Language) is specific to Overpass — worth skimming the docs once.
// The (around:RADIUS,LAT,LNG) filter means "within RADIUS meters of this point".
function buildQuery(lat, lng) {
  // Build one filter line per category, e.g.:
  //   node["amenity"~"cafe|restaurant|bar"](around:700,34.69,135.19);
  // The ~"..." operator is a regex match — it means "value matches this pattern".
  const filters = Object.entries(INTERESTING_TYPES)
    .map(([key, values]) => {
      const pattern = values.join("|");
      return `node["${key}"~"${pattern}"](around:${FETCH_RADIUS_METERS},${lat},${lng});`;
    })
    .join("\n  ");

  return `[out:json][timeout:15];
(
  ${filters}
);
out body;`;
}

// ─── PLACE NORMALIZER ────────────────────────────────────────────────────────
// Overpass returns raw OSM elements. This converts them into a clean shape
// our app can work with consistently.
function normalizePlace(element) {
  const tags = element.tags || {};

  // Determine the primary type — check each category key in order
  let type = "place";
  for (const key of Object.keys(INTERESTING_TYPES)) {
    if (tags[key]) { type = tags[key]; break; }
  }

  return {
    id:   element.id,
    lat:  element.lat,
    lng:  element.lon,           // OSM uses "lon", we normalize to "lng"
    name: tags.name || null,     // null if unnamed — we'll filter these out
    type,
    tags,                        // keep raw tags for later (Phase 3 quest gen)
  };
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────
// The only function the rest of the app calls.
// Returns a Promise that resolves to an array of place objects.
export async function fetchPlacesNear(lat, lng) {
  const zone = latLngToZone(lat, lng);
  const zoneKey = `${zone.x},${zone.y}`;

  // Cache hit — return immediately, no network request
  if (cache.has(zoneKey)) {
    console.log(`[Overpass] Cache hit for zone ${zoneKey}`);
    return cache.get(zoneKey);
  }

  console.log(`[Overpass] Fetching zone ${zoneKey} near ${lat.toFixed(4)}, ${lng.toFixed(4)}`);

  try {
    const response = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(buildQuery(lat, lng))}`,
    });

    if (!response.ok) {
      throw new Error(`Overpass responded with status ${response.status}`);
    }

    const data = await response.json();

    const places = data.elements
      .map(normalizePlace)
      .filter(p => p.name !== null); // skip unnamed places — not quest-worthy

    console.log(`[Overpass] Got ${places.length} named places for zone ${zoneKey}`);

    cache.set(zoneKey, places);
    return places;

  } catch (err) {
    // Fail gracefully — a network error shouldn't break the whole app.
    // We still mark the zone as fetched (with empty array) so we don't
    // hammer the API with retries every time the player moves.
    console.warn(`[Overpass] Fetch failed for zone ${zoneKey}:`, err.message);
    cache.set(zoneKey, []);
    return [];
  }
}