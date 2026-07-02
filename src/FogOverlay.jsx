import { useEffect, useRef } from "react";
import { useMap, useMapEvents } from "react-leaflet";

const TILE_SIZE_METERS = 60;
const REVEAL_RADIUS    = 2;
const WISP_COUNT       = 20;

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

function createWisps() {
  return Array.from({ length: WISP_COUNT }, () => ({
    x:       Math.random(),
    y:       Math.random(),
    vx:      (Math.random() * 0.00008 + 0.00003) * (Math.random() > 0.15 ? 1 : -1),
    vy:      (Math.random() - 0.5) * 0.00003,
    r:       Math.random() * 50 + 55,
    opacity: Math.random() * 0.06 + 0.05,
    angle:   (Math.random() - 0.5) * 0.4,
    wVel:    (Math.random() - 0.5) * 0.0002,
    scaleX:  Math.random() * 1.5 + 2.5,
  }));
}

export function FogOverlay({ playerPosition, visitedTiles, onTilesUpdate }) {
  const map       = useRef(null);
  const mapObj    = useMap();
  map.current     = mapObj;
  const canvasRef = useRef(null);
  const wispsRef  = useRef(createWisps());

  // ── Update visited tiles ──────────────────────────────────────────────────
  useEffect(() => {
    if (!playerPosition) return;
    const center = latLngToTile(playerPosition.lat, playerPosition.lng);
    const toAdd  = [];
    for (let dx = -REVEAL_RADIUS; dx <= REVEAL_RADIUS; dx++) {
      for (let dy = -REVEAL_RADIUS; dy <= REVEAL_RADIUS; dy++) {
        const key = `${center.x + dx},${center.y + dy}`;
        if (!visitedTiles.has(key)) toAdd.push(key);
      }
    }
    if (toAdd.length > 0) {
      onTilesUpdate(prev => {
        const next = new Set(prev);
        toAdd.forEach(k => next.add(k));
        return next;
      });
    }
  }, [playerPosition?.lat, playerPosition?.lng]);

  // ── Draw fog ──────────────────────────────────────────────────────────────
  // Pass 1 — Base fog fill
  // Pass 2 — Fog wisps (drifting horizontal ellipses)
  // Pass 3 — Cut holes at visited tiles (stable radius — no flicker here)
  // Pass 4 — Mist halo at each boundary (depth effect)
  //
  // The flicker that was previously on the reveal radius is now handled
  // entirely by PlayerTorch.jsx as a separate visual layer above this canvas.
  const drawFog = useRef(null);

  drawFog.current = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const size    = map.current.getSize();
    canvas.width  = size.x;
    canvas.height = size.y;
    const ctx     = canvas.getContext("2d");
    const w       = canvas.width;
    const h       = canvas.height;

    const mpp        = metersPerPixel(map.current);
    const tilePixels = TILE_SIZE_METERS / mpp;

    // Larger radius ensures adjacent tile circles heavily overlap,
    // merging into one organic shape rather than visible individual blobs.
    // 1.4× tile size means circles overlap by 40% on each side.
    const baseRadius = tilePixels * 1.6;

    // Pre-compute tile screen positions once — reused in Passes 3 and 4
    const tilePoints = [...visitedTiles].map(key => {
      const [tx, ty]     = key.split(",").map(Number);
      const { lat, lng } = tileToLatLng(tx, ty);
      return map.current.latLngToContainerPoint([lat, lng]);
    });

    // ── Pass 1: Base fog ──────────────────────────────────────────────────
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(18, 10, 4, 0.91)";
    ctx.fillRect(0, 0, w, h);

    // ── Pass 2: Fog wisps ─────────────────────────────────────────────────
    for (const puff of wispsRef.current) {
      const px = puff.x * w;
      const py = puff.y * h;

      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.translate(px, py);
      ctx.rotate(puff.angle);
      ctx.scale(puff.scaleX, 1);

      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, puff.r);
      grad.addColorStop(0,   `rgba(55, 32, 12, ${puff.opacity})`);
      grad.addColorStop(0.6, `rgba(50, 28, 10, ${puff.opacity * 0.5})`);
      grad.addColorStop(1,   "rgba(45, 25, 8, 0)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, puff.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ── Pass 3: Cut one compound hole ────────────────────────────────────
    // Previously: one fill() call per tile → 25 independent circles with
    // individually visible edges. No amount of gradient tuning fixes that.
    //
    // Now: all tile arcs are added to ONE path, then filled once.
    // Canvas fills the UNION — one organic shape, no grid.
    //
    // ctx.filter blur softens the boundary of the entire compound shape.
    // It's applied BEFORE drawing and reset AFTER — it affects only this pass.
    //
    // In destination-out mode, "filling" means "erasing". The blur makes the
    // erase gradually fade at the boundary, creating the misty fog edge.
    ctx.globalCompositeOperation = "destination-out";
    ctx.filter    = `blur(${Math.round(tilePixels * 0.85)}px)`;
    ctx.fillStyle = "rgba(0,0,0,1)";
    ctx.beginPath();
    for (const point of tilePoints) {
      ctx.arc(point.x, point.y, baseRadius, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.filter = "none";

    // ── Pass 4: Mist halo at boundaries ──────────────────────────────────
    // Start halo at 92% of baseRadius — right at the fog edge, not over the clear map.
    // Previous value (0.75) started inside the revealed area, tinting the map brown.
    // Opacity also reduced: the halo should be felt, not seen.
    ctx.globalCompositeOperation = "source-over";
    const outerRadius = baseRadius * 1.3;

    for (const point of tilePoints) {
      const haloGrad = ctx.createRadialGradient(
        point.x, point.y, baseRadius * 0.02,
        point.x, point.y, outerRadius
      );
      haloGrad.addColorStop(0,   "rgba(55, 32, 12, 0)");
      haloGrad.addColorStop(0.3, "rgba(55, 32, 12, 0.10)");
      haloGrad.addColorStop(0.7, "rgba(40, 22, 8,  0.05)");
      haloGrad.addColorStop(1,   "rgba(30, 15, 5,  0)");

      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(point.x, point.y, outerRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  useMapEvents({
    move:   () => drawFog.current(),
    zoom:   () => drawFog.current(),
    resize: () => drawFog.current(),
  });

  useEffect(() => {
    drawFog.current();
  }, [visitedTiles]);

  // Animation loop — updates wisp positions each frame
  useEffect(() => {
    let animFrameId;

    const animate = () => {
      for (const puff of wispsRef.current) {
        puff.x     += puff.vx;
        puff.y     += puff.vy;
        puff.angle += puff.wVel;
        if (puff.x >  1.3) puff.x = -0.3;
        if (puff.x < -0.3) puff.x =  1.3;
        if (puff.y >  1.2) puff.y = -0.2;
        if (puff.y < -0.2) puff.y =  1.2;
      }
      drawFog.current();
      animFrameId = requestAnimationFrame(animate);
    };

    animFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameId);
  }, []);

  // Mount canvas
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