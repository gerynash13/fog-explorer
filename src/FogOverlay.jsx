import { useEffect, useRef } from "react";
import { useMap, useMapEvents } from "react-leaflet";

const TILE_SIZE_METERS = 60;
const REVEAL_RADIUS    = 2;

function latLngToTile(lat, lng) {
  return {
    x: Math.floor((lat * 111_000) / TILE_SIZE_METERS),
    y: Math.floor((lng * 111_000) / TILE_SIZE_METERS),
  };
}

function tileToLatLng(tx, ty) {
  return {
    lat: (tx + 0.5) * TILE_SIZE_METERS / 111_000,
    lng: (ty + 0.5) * TILE_SIZE_METERS / 111_000,
  };
}

function metersPerPixel(map) {
  const lat  = map.getCenter().lat;
  const zoom = map.getZoom();
  return (156_543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────
// Props:
//   playerPosition — { lat, lng } from App
//   visitedTiles   — Set<string> owned by App, shared with PlaceMarkers
//   onTilesUpdate  — callback to update visitedTiles in App
//
// visitedTiles was previously internal state here. It's been lifted to App
// so that PlaceMarkers can also read it to decide which pins to show.
export function FogOverlay({ playerPosition, visitedTiles, onTilesUpdate }) {
  const map       = useRef(null);
  const mapObj    = useMap();
  map.current     = mapObj;
  const canvasRef = useRef(null);

  // ── Update visited tiles when player moves ────────────────────────────────
  useEffect(() => {
    if (!playerPosition) return;

    const center = latLngToTile(playerPosition.lat, playerPosition.lng);

    const toAdd = [];
    for (let dx = -REVEAL_RADIUS; dx <= REVEAL_RADIUS; dx++) {
      for (let dy = -REVEAL_RADIUS; dy <= REVEAL_RADIUS; dy++) {
        const key = `${center.x + dx},${center.y + dy}`;
        if (!visitedTiles.has(key)) toAdd.push(key);
      }
    }

    // Only call onTilesUpdate if there are actually new tiles to add.
    // This avoids unnecessary re-renders when the player hasn't moved far.
    if (toAdd.length > 0) {
      onTilesUpdate(prev => {
        const next = new Set(prev);
        toAdd.forEach(k => next.add(k));
        return next;
      });
    }

  }, [playerPosition?.lat, playerPosition?.lng]);

  // ── Draw fog ──────────────────────────────────────────────────────────────
  const drawFog = useRef(null);

  drawFog.current = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const size    = map.current.getSize();
    canvas.width  = size.x;
    canvas.height = size.y;

    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "rgba(10, 10, 25, 0.88)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalCompositeOperation = "destination-out";

    const mpp        = metersPerPixel(map.current);
    const tilePixels = TILE_SIZE_METERS / mpp;

    for (const key of visitedTiles) {
      const [tx, ty]     = key.split(",").map(Number);
      const { lat, lng } = tileToLatLng(tx, ty);
      const point        = map.current.latLngToContainerPoint([lat, lng]);
      const radius       = tilePixels * 0.9;
      const gradient     = ctx.createRadialGradient(
        point.x, point.y, 0,
        point.x, point.y, radius
      );
      gradient.addColorStop(0,   "rgba(0,0,0,1)");
      gradient.addColorStop(0.6, "rgba(0,0,0,0.9)");
      gradient.addColorStop(1,   "rgba(0,0,0,0)");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = "source-over";
  };

  useMapEvents({
    move:   () => drawFog.current(),
    zoom:   () => drawFog.current(),
    resize: () => drawFog.current(),
  });

  useEffect(() => {
    drawFog.current();
  }, [visitedTiles]);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvasRef.current = canvas;
    Object.assign(canvas.style, {
      position:      "absolute",
      top:           "0",
      left:          "0",
      pointerEvents: "none",
      zIndex:        "400",
    });
    map.current.getContainer().appendChild(canvas);
    drawFog.current();
    return () => canvas.remove();
  }, []);

  return null;
}