import { useEffect, useRef } from "react";
import { useMap, useMapEvents } from "react-leaflet";

// ─── PLAYER TORCH ─────────────────────────────────────────────────────────────
// A separate canvas layer (z-index 401, above the fog at 400) that draws a
// warm, flickering torch glow at the player's exact position.
//
// This does two jobs simultaneously:
//   1. Shows the player where they are on the map (no separate marker needed)
//   2. Creates the torchlight atmosphere that the fog overlay deliberately avoids
//
// Keeping this separate from FogOverlay means the fog can be calm and atmospheric
// while the torch has its own independent, more energetic flicker rhythm.
export function PlayerTorch({ playerPosition }) {
    const map = useRef(null);
    const mapObj = useMap();
    map.current = mapObj;
    const canvasRef = useRef(null);

    const drawTorch = useRef(null);

    drawTorch.current = () => {
        const canvas = canvasRef.current;
        if (!canvas || !playerPosition) return;

        const size = map.current.getSize();
        canvas.width = size.x;
        canvas.height = size.y;

        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Convert player's real world position to a screen pixel coordinate
        const point = map.current.latLngToContainerPoint([
            playerPosition.lat,
            playerPosition.lng,
        ]);

        // ── Torchlight flicker ──────────────────────────────────────────────────
        // Two sine waves at different frequencies for an organic, non-mechanical feel.
        // Faster frequencies than the old fog flicker — the torch responds more
        // immediately to "wind" than the whole fog bank does.
        const flicker = Math.sin(Date.now() / 220) * 3.5 +
                        Math.sin(Date.now() / 65)  * 1.5;

        // ── Layer 1: Wide outer warmth ──────────────────────────────────────────
        // A very soft, large glow. Low opacity — more felt than seen.
        // This is the ambient light that spills beyond the focused flame.
        const outerR = 42 + flicker;
        const outerGrad = ctx.createRadialGradient(
            point.x, point.y, 0,
            point.x, point.y, outerR
        );
        outerGrad.addColorStop(0, "rgba(255, 150, 30, 0.18)");
        outerGrad.addColorStop(0.5, "rgba(220, 90, 15, 0.07)");
        outerGrad.addColorStop(1, "rgba(180, 50, 5, 0)");

        ctx.fillStyle = outerGrad;
        ctx.beginPath();
        ctx.arc(point.x, point.y, outerR, 0, 2 * Math.PI);
        ctx.fill();

        // ── Layer 2: Mid orange flame body ─────────────────────────────────────
        // The main visible glow. Orange-yellow, medium opacity.
        // Flicker is dampened slightly (× 0.7) so this layer feels grounded
        // while the outer halo breathes more freely.
        const midR = 19 + flicker * 0.7;
        const midGrad = ctx.createRadialGradient(
            point.x, point.y, 0,
            point.x, point.y, midR
        );
        midGrad.addColorStop(0, "rgba(255, 200, 70, 0.65)");
        midGrad.addColorStop(0.5, "rgba(255, 130, 25, 0.28)");
        midGrad.addColorStop(1, "rgba(220, 90, 10, 0)");

        ctx.fillStyle = midGrad;
        ctx.beginPath();
        ctx.arc(point.x, point.y, midR, 0, 2 * Math.PI);
        ctx.fill();

        // ── Layer 3: Inner hot core ─────────────────────────────────────────────
        // The brightest point — white-yellow at the center, fading to orange.
        // Very small radius, subtle flicker (× 0.25) — the core stays relatively
        // steady even when the outer flame dances.
        const innerR = 6.5 + flicker * 0.25;
        const innerGrad = ctx.createRadialGradient(
            point.x, point.y, 0,
            point.x, point.y, innerR
        );
        innerGrad.addColorStop(0, "rgba(255, 245, 200, 0.95)");
        innerGrad.addColorStop(0.5, "rgba(255, 210, 90, 0.75)");
        innerGrad.addColorStop(1, "rgba(255, 160, 40, 0)");

        ctx.fillStyle = innerGrad;
        ctx.beginPath();
        ctx.arc(point.x, point.y, innerR, 0, 2 * Math.PI);
        ctx.fill();

        // ── Player position dot ─────────────────────────────────────────────────
        // A small solid dot marks the exact GPS position.
        // Sits at the center of all the glow layers — gives the player a precise
        // point of reference without needing a separate Leaflet marker.
        ctx.fillStyle = "rgba(255, 248, 220, 0.92)";
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
        ctx.fill();
    };

    // Redraw when map pans or zooms (player's screen position changes)
    useMapEvents({
        move: () => drawTorch.current(),
        zoom: () => drawTorch.current(),
        resize: () => drawTorch.current()
    });

    // Redraw when GPS position changes
    useEffect(() => {
        drawTorch.current();
    }, [playerPosition?.lat, playerPosition?.lng]);

    // ── Animation loop ────────────────────────────────────────────────────────
    // Runs independently from FogOverlay's loop — the torch has its own rhythm.
    // Both loops run at ~60fps but their sine wave phases are unrelated,
    // so they never look synchronized.
    useEffect(() => {
        let animFrameId;

        const animate = () => {
            drawTorch.current();
            animFrameId = requestAnimationFrame(animate);
        };

        animFrameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animFrameId);
    }, []);

    // ── Mount canvas above fog ────────────────────────────────────────────────
    // z-index 401 places this above the fog canvas (400).
    // The torch must be visible on top of the fog, not behind it.
    useEffect(() => {
        const canvas = document.createElement("canvas");
        canvasRef.current = canvas;
        Object.assign(canvas.style, {
            position:       "absolute",
            top:            0,
            left:           0,
            pointerEvents:  "none",
            zIndex:         401,
        });
        map.current.getContainer().appendChild(canvas);
        return () => canvas.remove();
    }, []);

    return null;
}