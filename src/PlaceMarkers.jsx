import { useMemo } from "react";
import { Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import { useState } from "react";
import L from "leaflet";

// ─── LEAFLET ICON FIX ────────────────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ─── TYPE → EMOJI MAP ────────────────────────────────────────────────────────
const TYPE_EMOJI = {
  cafe: "☕", restaurant: "🍽️", bar: "🍺", pub: "🍺", fast_food: "🍟",
  ice_cream: "🍦", bakery: "🥐", library: "📚", cinema: "🎬", theatre: "🎭",
  museum: "🏛️", gallery: "🖼️", artwork: "🎨", park: "🌳", garden: "🌸",
  nature_reserve: "🌿", viewpoint: "👁️", playground: "🛝", sports_centre: "⚽",
  books: "📖", supermarket: "🛒", convenience: "🏪", marketplace: "🏪",
  monument: "🗿", castle: "🏰", temple: "⛩️", shrine: "⛩️", ruins: "🏚️",
  memorial: "🕯️", attraction: "⭐", information: "ℹ️", community_centre: "🏢",
  zoo: "🦁", aquarium: "🐟",
};

function createEmojiIcon(emoji) {
  return L.divIcon({
    className: "",
    html: `<div style="
      font-size: 22px;
      line-height: 1;
      filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));
      cursor: pointer;
    ">${emoji}</div>`,
    iconSize:   [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

const FOG_TILE_METERS = 60;

function isRevealed(place, visitedTiles) {
  const tx = Math.floor((place.lat * 111_000) / FOG_TILE_METERS);
  const ty = Math.floor((place.lng * 111_000) / FOG_TILE_METERS);
  return visitedTiles.has(`${tx},${ty}`);
}

// ─── DECLUTTERING ─────────────────────────────────────────────────────────────
// Minimum pixel distance allowed between two markers on screen.
// Below this distance, icons visually overlap and read as a meaningless blob —
// exactly the "circle clusters" problem from dense areas like central Kobe.
const MIN_MARKER_SPACING_PX = 54;

// Greedy decluttering: walk through candidate places, accept a marker only if
// it's far enough (in screen pixels) from every marker already accepted.
// This is the same family of algorithm used by map labelling engines
// (Google Maps, Mapbox) to avoid overlapping pins/labels.
function declutterMarkers(places, map) {
  const accepted = [];          // markers we've decided to keep
  const acceptedPoints = [];    // their screen positions, parallel array

  for (const place of places) {
    const point = map.latLngToContainerPoint([place.lat, place.lng]);

    // Check distance against every already-accepted marker.
    // For a few hundred candidate places this is fast enough (no need
    // for a spatial index like a quadtree at this scale).
    let tooClose = false;
    for (const existing of acceptedPoints) {
      const dx = point.x - existing.x;
      const dy = point.y - existing.y;
      const distSq = dx * dx + dy * dy; // squared distance — avoids a sqrt call
      if (distSq < MIN_MARKER_SPACING_PX * MIN_MARKER_SPACING_PX) {
        tooClose = true;
        break;
      }
    }

    if (!tooClose) {
      accepted.push(place);
      acceptedPoints.push(point);
    }
  }

  return accepted;
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────
export function PlaceMarkers({ places, visitedTiles }) {
  const map = useMap();

  // Distances between two lat/lng points only change with ZOOM, not with pan
  // (panning is a pure translation — relative spacing is preserved).
  // So we only need to recompute decluttering when zoom changes, not on every
  // map drag. This tick forces useMemo to recalculate exactly when needed.
  const [zoomTick, setZoomTick] = useState(0);
  useMapEvents({
    zoomend: () => setZoomTick(t => t + 1),
  });

  const visiblePlaces = useMemo(() => {
    const revealed = places.filter(p => isRevealed(p, visitedTiles));
    return declutterMarkers(revealed, map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places, visitedTiles, zoomTick]);

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