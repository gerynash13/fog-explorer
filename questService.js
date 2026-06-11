import { THEMES } from "./themes.js";

// CONSTANTS
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

// TIME GATES
// Since Overpass doesn't give reliable hours, we use sensible time gates.

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

// Place interesting places to generate quests for.
const QUERY_WORTH_TYPES = new Set([
    "cafe", "restaurant", "bar", "pub", "ice_cream", "bakery",
    "library", "museum", "gallery", "cinema", "theatre",
    "park", "garden", "nature_reserve", "viewpoint",
    "shrine", "temple", "monument", "memorial", "ruins", "castle",
    "attraction", "artwork", "marketplace", "books", "community_centre",
    "zoo", "aquarium",
]);

// VALIDATION

// Is this place interesting enough to build a quest for?
export function isQuestWorthy(place) {
    return QUERY_WORTH_TYPES.has(place.type);
}

// Is it an appropriate time to visit this place?
export function isWithinTimeGate(place) {
    const hour = new Date().getHours();
    const gate = TIME_GATES[place.type] ?? TIME_GATES.default;
    return hour >= gate.open && hour <= gate.close;
}

// GEOMETRY HELPERS

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
export function getDistanceMeters(lat1, lat2, lng1, lng2) {
    const R = 6_371_000; // radius of the Earth in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = 
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// QUEST NARRATIVE GENERATION
// Calls the Gemini API to write a quest hook for a given place.
// Returns the narrative string or throws on failure.
export async function generateQuestNarrative(place, playerPosition, themeId, apiKey) {
    const theme = THEMES[themeId];
    const direction = getCompassDirection(
        playerPosition.lat1, playerPosition.lng1,
        place.lat, place.lng
    );
    const distance = Math.round(
        getDistanceMeters(playerPosition.lat1, place.lat, playerPosition.lng1, place.lng)
    );

    // Use theme vocab if available, otherwise humanize raw type
    const placeTypeName = theme.vocabulary[place.type] ?? place.type.replace(/_/g, " ");

    // The user prompt gives the AI the specific facts about the place,
    // and the system prompt asks it to write a narrative hook for the player.
    // Keeping them separate makes it easy to adjust the tone without touching the data pipeline.
    const userPrompt = `Write a quest hook about this location:
    Name: ${place.name}
    Type: ${placeTypeName}
    Direction from the player: ${direction}
    Approximate distance: ${distance} meters

    Requirements: 2-3 sentences max. Make the player want to go there.`;

    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            // System instruction sets the AI's persona for the whole conversation.
            system_instruction: {
                parts: [{ text: theme.systemPrompt }],
            },
            // contents is the actual conversation
            contents: [
                { role: "user", parts: [{ text: userPrompt }] },
            ],
            generationConfig: {
                maxOutputTokens: 150, // quest hooks should be short
                temperature: 0.85, // make it creative, not unhinged
            },
        }),
    }),

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error ${response.status}: ${error}`);
    }

    const data = await response.json();
    const narrative = data.candidates?.[0]?.contents?.parts?.[0]?.text?.trim();

    if (!narrative) throw new Error("Gemini API returned no narrative");

    return narrative;
}