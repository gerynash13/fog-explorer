import { THEMES } from "./themes.js";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// ─── MOCK MODE ────────────────────────────────────────────────────────────────
// Set to true when the Gemini API quota is exhausted, or when I want to test the
// quest UI without burning API calls. Returns instantly.
const MOCK_MODE = true;

const MOCK_NARRATIVES = [
  "古き石畳の先に、旅人たちが語り継ぐ場所がある。その扉を開く者だけが、真実を知るという。",
  "北の風が運ぶのは、かすかな煙の香り。腕利きの料理人が、今日も火を熾しているようだ。",
  "地図には載っていない路地の奥。かつて多くの冒険者が足を踏み入れ、誰も後悔しなかったと伝わる。",
]

// Mock version means no network call, instant response
async function mockNarrative() {
  // Simulate a slight delay so the UI behaves realistically
  await new Promise(resolve => setTimeout(resolve, 400));
  return MOCK_NARRATIVES[Math.floor(Math.random() * MOCK_NARRATIVES.length)];
}

// ─── TIME GATES ───────────────────────────────────────────────────────────────
// Since Overpass doesn't give reliable opening hours, we use sensible defaults.
// A quest for a restaurant at 6am would be useless. This prevents that.
// { open: H, close: H } — 24h format. close: 24 means midnight.
const TIME_GATES = {
  cafe:             { open: 7,  close: 21 },
  restaurant:       { open: 10, close: 22 },
  bar:              { open: 16, close: 24 },
  pub:              { open: 12, close: 24 },
  fast_food:        { open: 8,  close: 23 },
  ice_cream:        { open: 11, close: 21 },
  bakery:           { open: 7,  close: 19 },
  library:          { open: 9,  close: 19 },
  museum:           { open: 9,  close: 18 },
  gallery:          { open: 10, close: 18 },
  cinema:           { open: 11, close: 23 },
  theatre:          { open: 14, close: 23 },
  // outdoor/always-open types
  park:             { open: 0,  close: 24 },
  garden:           { open: 0,  close: 24 },
  viewpoint:        { open: 0,  close: 24 },
  nature_reserve:   { open: 0,  close: 24 },
  playground:       { open: 0,  close: 24 },
  shrine:           { open: 0,  close: 24 },
  temple:           { open: 0,  close: 24 },
  monument:         { open: 0,  close: 24 },
  memorial:         { open: 0,  close: 24 },
  ruins:            { open: 0,  close: 24 },
  castle:           { open: 0,  close: 24 },
  // default fallback for anything not listed
  default:          { open: 8,  close: 21 },
};

// Place types interesting enough to generate quests for.
// Parking lots and ATMs are NOT on this list.
const QUEST_WORTHY_TYPES = new Set([
  "cafe", "restaurant", "bar", "pub", "bakery", "ice_cream",
  "library", "museum", "gallery", "cinema", "theatre",
  "park", "garden", "viewpoint", "nature_reserve",
  "shrine", "temple", "monument", "castle", "ruins", "memorial",
  "attraction", "artwork", "marketplace", "books", "community_centre",
  "zoo", "aquarium",
]);

// ─── VALIDATION ───────────────────────────────────────────────────────────────

// Is this place interesting enough to build a quest around?
export function isQuestWorthy(place) {
  return QUEST_WORTHY_TYPES.has(place.type);
}

// Is it an appropriate time to suggest visiting this place?
export function isWithinTimeGate(place) {
  const hour = new Date().getHours();
  const gate = TIME_GATES[place.type] ?? TIME_GATES.default;
  return hour >= gate.open && hour < gate.close;
}

// ─── GEOMETRY HELPERS ─────────────────────────────────────────────────────────

// Returns a compass direction string from one point to another.
// atan2 gives us the angle in radians; we convert to one of 8 directions.
export function getCompassDirection(fromLat, fromLng, toLat, toLng) {
  const dLat = toLat - fromLat;
  const dLng = toLng - fromLng;
  const angle = Math.atan2(dLng, dLat) * (180 / Math.PI);
  const dirs = [
    "north", "northeast", "east", "southeast",
    "south", "southwest", "west", "northwest",
  ];
  const index = Math.round(((angle + 360) % 360) / 45) % 8;
  return dirs[index];
}

// Haversine formula: straight-line distance between two lat/lng points in meters.
// Haversine accounts for the curvature of the Earth — more accurate than
// the simple flat-grid math we use for tile coordinates.
export function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const R    = 6_371_000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── QUEST NARRATIVE GENERATION ───────────────────────────────────────────────
// Calls the Gemini API to write a quest hook for a given place.
// Returns the narrative string, or throws on failure.
export async function generateQuestNarrative(place, playerPosition, themeId, apiKey) {
  if (MOCK_MODE) return mockNarrative(); // Mock version, short-circuits everything below.

  const theme     = THEMES[themeId];
  const direction = getCompassDirection(
    playerPosition.lat, playerPosition.lng,
    place.lat, place.lng
  );
  const distance  = Math.round(
    getDistanceMeters(playerPosition.lat, playerPosition.lng, place.lat, place.lng)
  );

  // Use themed vocabulary if available, otherwise humanize the raw type
  const placeTypeName =
    theme.vocabulary[place.type] ?? place.type.replace(/_/g, " ");

  // The user prompt gives the AI the specific facts. The system prompt
  // (set in THEMES) tells it how to write. Keeping them separate makes
  // it easy to adjust tone without touching the data pipeline.
  const userPrompt = `Write a quest hook for this location:
Name: ${place.name}
Type: ${placeTypeName}
Direction from the player: ${direction}
Approximate distance: ${distance} meters

Requirements: 2-3 sentences max. Make the player want to go there.`;

  // Retry loop
  const MAX_ATTEMPTS = 3;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {

    // If this isn't the first attempt, wait a bit before retrying
    // 2^0, 2^1, 2^2, 2^3 = 1, 2, 4, 8 seconds
    if (attempt > 0) {
      const waitMs = Math.pow(2, attempt) * 1000;
      console.log(`[questService] Retrying ${place.name} in ${waitMs/1000}s (attempt ${attempt+1})`);
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }

  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      // system_instruction sets the AI's persona for the whole conversation
      system_instruction: {
        parts: [{ text: theme.systemPrompt }],
      },
      // contents is the actual conversation — just one user turn here
      contents: [
        { role: "user", parts: [{ text: userPrompt }] },
      ],
      generationConfig: {
        maxOutputTokens: 150,  // quest hooks should be short
        temperature:     0.85, // some creativity, but not unhinged
      },
    }),
  });

  // 503 is the only error worth retrying ("try again later")
  // 404 (wrong model) or 401 (wrong API key) would fail on retry anyways
  if (response.status == 503 && attempt < MAX_ATTEMPTS -1) {
    console.warn(`[questService] 503 for ${place.name}. Retrying...`);
    continue;
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${error}`);
  }

  const data      = await response.json();
  const narrative = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

  if (!narrative) throw new Error("Gemini returned empty content");

  return narrative;

  }

  throw new Error(`Failed to generate quest for ${place.name} after ${MAX_ATTEMPTS} attempts`);
}