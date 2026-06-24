import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMapEvents, useMap } from "react-leaflet";
import { usePlayerPosition } from "./usePlayerPosition";
import { FogOverlay } from "./FogOverlay";
import { PlaceMarkers } from "./PlaceMarkers";
import { usePlaces } from "./usePlaces";
import { useQuests } from "./useQuests";
import { QuestPanel } from "./QuestPanel";
import { useProgression } from "./useProgression";
import { PlayerHUD } from "./PlayerHUD";
import { RewardNotification } from "./RewardNotification";
import { THEMES, DEFAULT_THEME } from "./themes";
import "leaflet/dist/leaflet.css";
import "./App.css";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const DEV_MODE = true;
const DEFAULT_POSITION = { lat: 34.6901, lng: 135.1956 }; // Kobe

// Vite exposes .env.local variables via import.meta.env
// The key must be prefixed with VITE_ to be accessible in the browser
const GEMINI_KEY = import.meta.env.VITE_GEMINI_KEY;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function ClickToReveal({ onPositionChange }) {
  useMapEvents({
    click: (e) => {
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

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const { position: gpsPosition, error: gpsError } = usePlayerPosition();
  const [testPosition, setTestPosition]             = useState(DEFAULT_POSITION);
  const [visitedTiles, setVisitedTiles]             = useState(new Set());
  const [themeId, setThemeId]                       = useState(DEFAULT_THEME);

  const playerPosition = DEV_MODE
    ? (testPosition || gpsPosition)
    : (gpsPosition  || testPosition);

  const places = usePlaces(playerPosition);

  const { quests, completeQuest } = useQuests(
    places,
    playerPosition,
    themeId,
    GEMINI_KEY
  );

  const {
    player,
    notifications,
    onQuestComplete,
    onPlaceDiscovered,
    onTilesRevealed,
  } = useProgression();

  // Track new place discoveries
  // prevPlacesCount lets us detect how many NEW places were added since last render
  // useRef is right here because changing it shouldn't trigger a re-render
  const prevPlacesCount = useRef(0);

  useEffect(() => {
    const newCount = places.length- prevPlacesCount.current;
    if (newCount > 0) {
      onPlaceDiscovered(newCount);
      prevPlacesCount.current = places.length;
    }
  }, [places.length]);

  // Track new tile reveals
  const prevTileCount = useRef(0);

  useEffect(() => {
    const newCount = visitedTiles.size - prevTileCount.current;
    if (newCount > 0) {
      onTilesRevealed(newCount);
      prevTileCount.current = visitedTiles.size;
    }
  }, [visitedTiles.size]);

  // Quest completion: trigger both quest state AND progression
  // This is the event-driven connection between the quest system and progression
  // Neither system knows about the other. App acts as a proxy between them.
  const handleQuestComplete = (questId) => {
    const quest = quests.find(q => q.id === questId);
    completeQuest(questId); // updates quest state (grey out, then remove)
    if (quest) onQuestComplete(quest); // awards XP, currency, checks badges
  };

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
        <FogOverlay
          playerPosition={playerPosition}
          visitedTiles={visitedTiles}
          onTilesUpdate={setVisitedTiles}
        />
        <PlaceMarkers places={places} visitedTiles={visitedTiles} />
        {(DEV_MODE || !gpsPosition) && (
          <ClickToReveal onPositionChange={setTestPosition} />
        )}
      </MapContainer>

      {/* ── Quest panel ── */}
      <QuestPanel
        quests={quests}
        onComplete={completeQuest}
        themeId={themeId}
      />

      {/* ── Theme selector ── */}
      <div style={styles.themePicker}>
        {Object.values(THEMES).map(theme => (
          <button
            key={theme.id}
            onClick={() => setThemeId(theme.id)}
            style={{
              ...styles.themeBtn,
              background: themeId === theme.id
                ? "rgba(255,255,255,0.15)"
                : "transparent",
              borderColor: themeId === theme.id
                ? "rgba(255,255,255,0.5)"
                : "rgba(255,255,255,0.15)",
            }}
          >
            {theme.name}
          </button>
        ))}
      </div>

      {/* ── Status bar ── */}
      <div style={styles.statusBar}>
        {gpsPosition
          ? `GPS active — ~${Math.round(gpsPosition.accuracy)}m accuracy`
          : gpsError
          ? "No GPS — click map to simulate walking"
          : "Acquiring GPS..."}
      </div>

      {/* ── Debug box ── */}
      <div style={styles.debugBox}>
        {`${playerPosition.lat.toFixed(5)}, ${playerPosition.lng.toFixed(5)}`}
        {` · ${visitedTiles.size} tiles · ${places.length} places · ${quests.length} quests`}
      </div>

      {/* ── API key warning ── */}
      {!GEMINI_KEY && (
        <div style={styles.apiWarning}>
          ⚠ No Gemini API key found. Add VITE_GEMINI_KEY to .env.local to enable quests.
        </div>
      )}
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
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
  themePicker: {
    position:   "absolute",
    bottom:     56,
    left:       "50%",
    transform:  "translateX(-50%)",
    display:    "flex",
    gap:        6,
    zIndex:     1000,
  },
  themeBtn: {
    fontSize:     12,
    padding:      "5px 14px",
    borderRadius: 20,
    border:       "1px solid",
    color:        "#e0e0e0",
    cursor:       "pointer",
    transition:   "background 0.15s",
  },
  apiWarning: {
    position:   "absolute",
    top:        50,
    left:       "50%",
    transform:  "translateX(-50%)",
    background: "rgba(180,100,0,0.85)",
    color:      "#fff",
    padding:    "8px 16px",
    borderRadius: 8,
    fontSize:   12,
    zIndex:     1000,
    whiteSpace: "nowrap",
  },
};