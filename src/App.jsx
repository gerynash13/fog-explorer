import { useState, useEffect } from "react";
import { MapContainer, TileLayer, useMapEvents, useMap } from "react-leaflet";
import { usePlayerPosition } from "./usePlayerPosition";
import { FogOverlay } from "./FogOverlay";
import "leaflet/dist/leaflet.css";
import "./App.css";

const DEV_MODE = true;

// ─── TEST HELPER ─────────────────────────────────────────────────────────────
// During development you're not going to walk around to test this.
// This component lets you click anywhere on the map to "teleport" there.
// We'll remove it (or hide it behind a dev flag) before shipping.
function ClickToReveal({ onPositionChange }) {
  useMapEvents({
    click: (e) => {
      console.log("1. Click detected at", e.latlng);
      onPositionChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function MapFollowPlayer({ position }) {
  const map = useMap();

  useEffect(() => {
    if (!position) return;
    map.setView([position.lat, position.lng], map.getZoom());
  }, []);

  return null;
}

// ─── APP ─────────────────────────────────────────────────────────────────────
// Default starting position — Kobe, Japan
const DEFAULT_POSITION = { lat: 34.6901, lng: 135.1956 };

export default function App() {
  // Real GPS position from the hook we wrote
  const { position: gpsPosition, error: gpsError } = usePlayerPosition();

  // For dev testing: a manually set position (starts at DEFAULT_POSITION)
  const [testPosition, setTestPosition] = useState(DEFAULT_POSITION);

  // Decide which position to use
  const playerPosition = DEV_MODE
    ? ( testPosition || gpsPosition )
    : ( gpsPosition || testPosition );

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>

      <MapContainer
        center={[playerPosition.lat, playerPosition.lng]}
        zoom={16}
        style={{ width: "100%", height: "100%" }}
        zoomControl={true}
      >
        {/* OpenStreetMap tile layer — completely free, no API key */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />

        {/* Our fog system */}
        <MapFollowPlayer position={playerPosition} />
        <FogOverlay playerPosition={playerPosition} />

        {/* Dev helper: click map to simulate walking there */}
        {(DEV_MODE || !gpsPosition) && (
          <ClickToReveal onPositionChange={setTestPosition} />
        )}
      </MapContainer>

      {/* GPS status bar at the bottom */}
      <div style={styles.statusBar}>
        {gpsPosition
          ? `GPS active — accuracy ~${Math.round(gpsPosition.accuracy)}m`
          : gpsError
          ? `No GPS (${gpsError}) — click map to simulate walking`
          : "Acquiring GPS..."}
      </div>

      {/* Tile coordinate display — useful for debugging */}
      <div style={styles.debugBox}>
        {`Player: ${playerPosition.lat.toFixed(5)}, ${playerPosition.lng.toFixed(5)}`}
      </div>
    </div>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
// Inline styles keep things self-contained for now.
// In later phases we'll move to a proper CSS/theme system for the game skin.
const styles = {
  statusBar: {
    position: "absolute",
    bottom: 20,
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(0, 0, 0, 0.65)",
    color: "#e0e0e0",
    padding: "6px 16px",
    borderRadius: 20,
    fontSize: 12,
    zIndex: 1000,
    pointerEvents: "none",
    whiteSpace: "nowrap",
  },
  debugBox: {
    position: "absolute",
    top: 12,
    left: 12,
    background: "rgba(0, 0, 0, 0.55)",
    color: "#a0ffb0",
    padding: "4px 10px",
    borderRadius: 6,
    fontSize: 11,
    fontFamily: "monospace",
    zIndex: 1000,
    pointerEvents: "none",
  },
};