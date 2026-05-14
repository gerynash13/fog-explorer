import { Marker, Popup } from "react-leaflet";
import L from "leaflet";

// ─── LEAFLET ICON FIX ────────────────────────────────────────────────────────
// Leaflet's default marker icons reference image files by relative path.
// When bundled by Vite, those paths break. This is a known issue with
// Leaflet + any modern bundler. The fix: point the icons to a CDN copy.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ─── TYPE → EMOJI MAP ────────────────────────────────────────────────────────
// Visual shorthand for place categories. Each type maps to an emoji icon.
// These will eventually become themed icons (sword for RPG, terminal for hacker).
// For now, emoji is lightweight and readable.
const TYPE_EMOJI = {
  // Food & drink
  cafe:             "☕",
  restaurant:       "🍽️",
  bar:              "🍺",
  pub:              "🍺",
  fast_food:        "🍟",
  ice_cream:        "🍦",
  bakery:           "🥐",
  // Culture & learning
  library:          "📚",
  cinema:           "🎬",
  theatre:          "🎭",
  museum:           "🏛️",
  gallery:          "🖼️",
  artwork:          "🎨",
  // Nature & outdoor
  park:             "🌳",
  garden:           "🌸",
  nature_reserve:   "🌿",
  viewpoint:        "👁️",
  playground:       "🛝",
  sports_centre:    "⚽",
  // Shopping
  books:            "📖",
  supermarket:      "🛒",
  convenience:      "🏪",
  marketplace:      "🏪",
  // History
  monument:         "🗿",
  castle:           "🏰",
  temple:           "⛩️",
  shrine:           "⛩️",
  ruins:            "🏚️",
  memorial:         "🕯️",
  // Misc
  attraction:       "⭐",
  information:      "ℹ️",
  community_centre: "🏢",
  zoo:              "🦁",
  aquarium:         "🐟",
};

// ─── EMOJI ICON FACTORY ───────────────────────────────────────────────────────
// Creates a Leaflet DivIcon — a custom HTML element used as a map pin.
// DivIcon lets us use any HTML (including emoji) instead of just image files.
function createEmojiIcon(emoji) {
  return L.divIcon({
    className: "",    // empty string prevents Leaflet adding default white box styles
    html: `<div style="
      font-size: 22px;
      line-height: 1;
      filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));
      cursor: pointer;
    ">${emoji}</div>`,
    iconSize:   [28, 28],
    iconAnchor: [14, 14],  // center of the icon sits on the coordinate
    popupAnchor: [0, -16], // popup appears above the icon
  });
}

// ─── VISIBILITY CHECK ─────────────────────────────────────────────────────────
// Only show a place marker if its tile has been revealed.
// We use the same tile math as FogOverlay so they stay in sync.
const FOG_TILE_METERS = 60;

function isRevealed(place, visitedTiles) {
  const tx = Math.floor((place.lat * 111_000) / FOG_TILE_METERS);
  const ty = Math.floor((place.lng * 111_000) / FOG_TILE_METERS);
  return visitedTiles.has(`${tx},${ty}`);
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────
// Renders a marker for each place that sits inside a revealed fog tile.
// Places in fog stay hidden — discovering them is part of the game.
//
// Props:
//   places       — array of place objects from usePlaces
//   visitedTiles — Set of "x,y" strings from App (lifted from FogOverlay)
export function PlaceMarkers({ places, visitedTiles }) {
  const visiblePlaces = places.filter(p => isRevealed(p, visitedTiles));

  return (
    <>
      {visiblePlaces.map(place => {
        const emoji = TYPE_EMOJI[place.type] || "📍";

        return (
          <Marker
            key={place.id}
            position={[place.lat, place.lng]}
            icon={createEmojiIcon(emoji)}
          >
            {/* Popup appears when the marker is clicked */}
            <Popup>
              <div style={{ minWidth: 140 }}>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>
                  {place.name}
                </div>
                <div style={{
                  textTransform: "capitalize",
                  color: "#888",
                  fontSize: 12
                }}>
                  {place.type.replace(/_/g, " ")}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}