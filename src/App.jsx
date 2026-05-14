import { useState, useEffect } from "react";
import { MapContainer, TileLayer, useMapEvents, useMap } from "react-leaflet";
import { usePlayerPosition } from "./usePlayerPosition";
import { FogOverlay } from "./FogOverlay";
import { PlaceMarkers } from "./PlaceMarkers";
import { usePlaces } from "./usePlaces";
import "leaflet/dist/leaflet.css";
import "./App.css";

// ─── DEV MODE ────────────────────────────────────────────────────────────────
const DEV_MODE = true; // set false before shipping

// ─── HELPERS ─────────────────────────────────────────────────────────────────
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
const DEFAULT_POSITION = { lat: 34.6901, lng: 135.1956 }; // Kobe

export default function App() {
  const { position: gpsPosition, error: gpsError } = usePlayerPosition();
  const [testPosition, setTestPosition]             = useState(DEFAULT_POSITION);

  const playerPosition = DEV_MODE
    ? (testPosition || gpsPosition)
    : (gpsPosition  || testPosition);

  // ── Lifted state ───────────────────────────────────────────────────────────
  // visitedTiles used to live inside FogOverlay.
  // It now lives here so both FogOverlay (draws fog) and PlaceMarkers
  // (decides which pins are visible) can access the same Set.
  // This pattern is called "lifting state up" — move state to the nearest
  // common ancestor of all components that need it.
  const [visitedTiles, setVisitedTiles] = useState(new Set());

  // ── Places ────────────────────────────────────────────────────────────────
  // usePlaces watches playerPosition and fetches from Overpass when the
  // player enters a new zone. Returns a flat array of all places found so far.
  const places = usePlaces(playerPosition);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>

      <MapContainer
        center={[DEFAULT_POSITION.lat, DEFAULT_POSITION.lng]}
        zoom={16}
        style={{ width: "100%", height: "100%" }}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />

        <MapFollowPlayer position={playerPosition} />

        {/* FogOverlay now reads AND writes visitedTiles via props */}
        <FogOverlay
          playerPosition={playerPosition}
          visitedTiles={visitedTiles}
          onTilesUpdate={setVisitedTiles}
        />

        {/* PlaceMarkers reads visitedTiles to decide which pins to show */}
        <PlaceMarkers
          places={places}
          visitedTiles={visitedTiles}
        />

        {(DEV_MODE || !gpsPosition) && (
          <ClickToReveal onPositionChange={setTestPosition} />
        )}
      </MapContainer>

      {/* ── HUD ── */}
      <div style={styles.statusBar}>
        {gpsPosition
          ? `GPS active — accuracy ~${Math.round(gpsPosition.accuracy)}m`
          : gpsError
          ? `No GPS — click map to simulate walking`
          : "Acquiring GPS..."}
      </div>

      <div style={styles.debugBox}>
        {`${playerPosition.lat.toFixed(5)}, ${playerPosition.lng.toFixed(5)}`}
        {` · ${visitedTiles.size} tiles · ${places.length} places`}
      </div>

    </div>
  );
}

const styles = {
  statusBar: {
    position:   "absolute",
    bottom:     20,
    left:       "50%",
    transform:  "translateX(-50%)",
    background: "rgba(0,0,0,0.65)",
    color:      "#e0e0e0",
    padding:    "6px 16px",
    borderRadius: 20,
    fontSize:   12,
    zIndex:     1000,
    pointerEvents: "none",
    whiteSpace: "nowrap",
  },
  debugBox: {
    position:   "absolute",
    top:        12,
    left:       12,
    background: "rgba(0,0,0,0.55)",
    color:      "#a0ffb0",
    padding:    "4px 10px",
    borderRadius: 6,
    fontSize:   11,
    fontFamily: "monospace",
    zIndex:     1000,
    pointerEvents: "none",
  },
};