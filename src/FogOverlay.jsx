import { useEffect, useRef, useState } from "react";
import { useMap, useMapEvents } from "react-leaflet";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
// How big each "fog tile" is in the real world (meters).
// Smaller = more precise fog. Larger = clears faster. 60m is a good starting point.
const TILE_SIZE_METERS = 60;

// How many tiles in each direction to reveal around the player.
// 2 = a 5×5 square of cleared fog. Feels natural without revealing too much.
const REVEAL_RADIUS = 2;

// ─── COORDINATE HELPERS ──────────────────────────────────────────────────────

// Convert a real-world position to a tile grid address.
// This is the same logic as the Python pseudocode — just JS syntax.
// Note: we ignore longitude scaling (cos(lat)) for simplicity.
// It's accurate enough for a city-scale prototype.
function latLngToTile(lat, lng) {
  return {
    x: Math.floor(lat * 111_000 / TILE_SIZE_METERS),
    y: Math.floor(lng * 111_000 / TILE_SIZE_METERS),
  };
}

// Reverse: given a tile address, what's the lat/lng at its CENTER?
// We add 0.5 to land in the middle of the tile, not the corner.
function tileToLatLng(tx, ty) {
  return {
    lat: (tx + 0.5) * TILE_SIZE_METERS / 111_000,
    lng: (ty + 0.5) * TILE_SIZE_METERS / 111_000,
  };
}

// How many real-world meters does one screen pixel represent at this zoom/lat?
// Standard Web Mercator formula. You don't need to memorize this.
function metersPerPixel(map) {
  const lat  = map.getCenter().lat;
  const zoom = map.getZoom();
  return (156_543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export function FogOverlay({ playerPosition }) {
  // useMap() gives us access to the Leaflet map instance.
  // react-leaflet makes it available anywhere inside a <MapContainer>.
  const map = useMap();

  // A ref is like a variable that persists across renders but doesn't trigger
  // a re-render when it changes. Perfect for holding the canvas element.
  const canvasRef = useRef(null);

  // visitedTiles is a Set of strings like "65851,128706".
  // We use strings because JS Sets compare objects by reference, not value —
  // so new Set([ [1,2] ]) wouldn't deduplicate [1,2] correctly.
  const [visitedTiles, setVisitedTiles] = useState(new Set());

  // ── STEP 1: Update visited tiles when the player moves ───────────────────
  useEffect(() => {
    console.log("2. Player moved to", playerPosition);
    if (!playerPosition) return;

    const center = latLngToTile(playerPosition.lat, playerPosition.lng);
    console.log("3. Player moved to tile", center);

    setVisitedTiles((prev) => {
      const next = new Set(prev); // copy — never mutate state directly

      // Reveal a square of tiles around the player
      for (let dx = -REVEAL_RADIUS; dx <= REVEAL_RADIUS; dx++) {
        for (let dy = -REVEAL_RADIUS; dy <= REVEAL_RADIUS; dy++) {
          next.add(`${center.x + dx},${center.y + dy}`);
        }
      }
      console.log("4. Visited tiles now:", next.size);
      return next;
    });
  }, [playerPosition?.lat, playerPosition?.lng]); // Only re-run when playerPosition changes

  // ── STEP 2: Draw the fog ─────────────────────────────────────────────────
  // We wrap the draw function in a ref so that useMapEvents (below) can always
  // call the *latest* version of it, even after visitedTiles has changed.
  // This is a common React pattern for "stale closure" problems.
  const drawFog = useRef(null);

  drawFog.current = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Resize canvas to match the current map viewport
    const size  = map.getSize();
    canvas.width  = size.x;
    canvas.height = size.y;

    const ctx = canvas.getContext("2d");

    // ── Pass 1: paint the whole canvas with dark fog ──────────────────────
    ctx.fillStyle = "rgba(10, 10, 25, 0.88)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ── Pass 2: cut holes where the player has been ───────────────────────
    // "destination-out" means: whatever we draw next ERASES what's already there.
    // It's like drawing with an invisibility brush.
    ctx.globalCompositeOperation = "destination-out";

    const mpp       = metersPerPixel(map);
    const tilePixels = TILE_SIZE_METERS / mpp; // tile size in screen pixels

    for (const key of visitedTiles) {
      const [tx, ty] = key.split(",").map(Number);
      const { lat, lng } = tileToLatLng(tx, ty);

      // Convert world coordinates → screen pixel coordinates
      const point = map.latLngToContainerPoint([lat, lng]);

      // Draw a radial gradient "hole" — fully clear in the center,
      // fading to nothing at the edge. This gives soft, natural fog borders.
      const radius   = tilePixels * 0.9;
      const gradient = ctx.createRadialGradient(
        point.x, point.y, 0,       // inner circle center + radius
        point.x, point.y, radius   // outer circle center + radius
      );
      gradient.addColorStop(0,   "rgba(0, 0, 0, 1)"); // fully erase center
      gradient.addColorStop(0.6, "rgba(0, 0, 0, 0.9)");
      gradient.addColorStop(1,   "rgba(0, 0, 0, 0)"); // fade out at edge

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Reset composite operation — important, don't leave it in erase mode
    ctx.globalCompositeOperation = "source-over";
  };

  // ── Re-draw whenever the map moves, zooms, or resizes ───────────────────
  // The tile pixel positions change whenever the map view changes,
  // so we need to re-draw the fog from scratch each time.
  useMapEvents({
    move:   () => drawFog.current(),
    zoom:   () => drawFog.current(),
    resize: () => drawFog.current(),
  });

  // ── Re-draw whenever new tiles are revealed ──────────────────────────────
  useEffect(() => {
    drawFog.current();
  }, [visitedTiles]);

  // ── Mount the canvas on top of the Leaflet map ───────────────────────────
  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvasRef.current = canvas;

    // Position it absolutely over the map. z-index 400 puts it above map tiles
    // but Leaflet's UI controls (zoom buttons etc.) sit above 1000, so they stay visible.
    Object.assign(canvas.style, {
      position:      "absolute",
      top:           "0",
      left:          "0",
      pointerEvents: "none",  // let clicks pass through to the map below
      zIndex:        "400",
    });

    map.getContainer().appendChild(canvas);
    drawFog.current(); // initial draw

    // Cleanup: remove canvas when component unmounts
    return () => canvas.remove();
  }, [map]); // only runs once, when the map is ready

  // This component doesn't render any JSX — it works by directly manipulating
  // the canvas DOM element. Returning null is valid in React.
  return null;
}