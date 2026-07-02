import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMapEvents, useMap } from "react-leaflet";
import { usePlayerPosition } from "./usePlayerPosition";
import { FogOverlay } from "./FogOverlay";
import { PlayerTorch } from "./PlayerTorch";
import { PlaceMarkers } from "./PlaceMarkers";
import { usePlaces } from "./usePlaces";
import { useQuests } from "./useQuests";
import { QuestPanel } from "./QuestPanel";
import { useProgression } from "./useProgression";
import { PlayerHUD } from "./PlayerHUD";
import { RewardNotification } from "./RewardNotification";
import { THEMES, DEFAULT_THEME } from "./themes";
import "leaflet/dist/leaflet.css";
import "./theme.css";
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
  const [themeMenuOpen, setThemeMenuOpen]           = useState(false);

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
        url={`https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg?api_key=${import.meta.env.VITE_STADIA_KEY}`}
        attribution='Map tiles by <a href="https://stamen.com">Stamen Design</a>, under CC BY 3.0. Data by <a href="https://openstreetmap.org">OpenStreetMap</a>, under ODbL.'
        maxZoom={19}
        />
        <MapFollowPlayer position={playerPosition} />
        <FogOverlay
          playerPosition={playerPosition}
          visitedTiles={visitedTiles}
          onTilesUpdate={setVisitedTiles}
        />
        <PlayerTorch playerPosition={playerPosition} />
        <PlaceMarkers places={places} visitedTiles={visitedTiles} />
        {(DEV_MODE || !gpsPosition) && (
          <ClickToReveal onPositionChange={setTestPosition} />
        )}
      </MapContainer>

      {/* ── Quest panel ── */}
      <QuestPanel
        quests={quests}
        onComplete={handleQuestComplete}
        themeId={themeId}
      />

      <PlayerHUD player={player} />

      <RewardNotification notifications={notifications} />

       {DEV_MODE && (
        <div style={styles.debugBox}>
          {gpsPosition ? "GPS✓" : gpsError ? "GPS✗" : "GPS..."}
          {`· ${playerPosition?.lat.toFixed(4)}, ${playerPosition?.lng.toFixed(4)}`}
          {`· ${visitedTiles.size}t · ${places.length}p · Lv.${player.level}`}
        </div>
      )}

      {/* ── API key warning ── */}
      {!GEMINI_KEY && (
        <div style={styles.apiWarning}>
          ⚠ No Gemini API key found. Add VITE_GEMINI_KEY to .env.local to enable quests.
        </div>
      )}
    </div>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = {
  debugBox: {
    position:     "absolute",
    // Top-right so it never collides with the medallion (top-left)
    top:          "calc(var(--safe-top) + 10px)",
    right:        "calc(var(--safe-right) + 10px)",
    background:   "rgba(0,0,0,0.55)",
    color:        "#a0ffb0",
    padding:      "4px 8px",
    borderRadius: 6,
    fontSize:     10,
    fontFamily:   "monospace",
    zIndex:       999,
    pointerEvents: "none",
    maxWidth:     "60vw",
  },
  themeMenuWrapper: {
    position: "absolute",
    // Sits below the debug box when DEV_MODE is on, otherwise top-right corner
    top:      "calc(var(--safe-top) + 50px)",
    right:    "calc(var(--safe-right) + 10px)",
    zIndex:   1000,
  },
  themeIconBtn: {
    width:        40,
    height:       40,
    borderRadius: "50%",
    background:   "var(--ink-black-soft)",
    border:       "1px solid var(--gold)",
    fontSize:     18,
    cursor:       "pointer",
    boxShadow:    "0 2px 6px rgba(0,0,0,0.4)",
  },
  themeDropdown: {
    position:     "absolute",
    top:          48,
    right:        0,
    borderRadius: 8,
    padding:      "6px 0",
    minWidth:     120,
    display:      "flex",
    flexDirection: "column",
  },
  themeOption: {
    background:  "transparent",
    border:      "none",
    textAlign:   "left",
    padding:     "8px 14px",
    fontFamily:  "var(--font-jp-sans)",
    fontSize:    13,
    cursor:      "pointer",
  },
  apiWarning: {
    position:   "absolute",
    top:        "calc(var(--safe-top) + 10px)",
    left:       "50%",
    transform:  "translateX(-50%)",
    background: "rgba(180,100,0,0.85)",
    color:      "#fff",
    padding:    "8px 16px",
    borderRadius: 8,
    fontSize:   12,
    zIndex:     1000,
    whiteSpace: "nowrap",
    maxWidth:   "90vw",
    textAlign:  "center",
  },
};