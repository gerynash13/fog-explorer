import { useState, useEffect, useRef } from "react";
import { fetchPlacesNear } from "./overpassService";

// How large a zone is — must match FETCH_ZONE_METERS in overpassService.js.
// If these ever differ, players get double-fetched zones. Keep them in sync.
const FETCH_ZONE_METERS = 600;

function latLngToZone(lat, lng) {
  return {
    x: Math.floor((lat * 111_000) / FETCH_ZONE_METERS),
    y: Math.floor((lng * 111_000) / FETCH_ZONE_METERS),
  };
}

// ─── HOOK ────────────────────────────────────────────────────────────────────
// Watches the player's position. When they enter a new fetch zone, it requests
// places from overpassService and merges them into the running places list.
//
// Returns: an array of all place objects collected so far this session.
export function usePlaces(playerPosition) {
  // All places found so far, across all visited zones
  const [places, setPlaces] = useState([]);

  // A Set of zone keys we've already triggered a fetch for.
  // useRef instead of useState because changing it shouldn't cause a re-render —
  // it's internal bookkeeping, not UI state.
  const fetchedZones = useRef(new Set());

  useEffect(() => {
    if (!playerPosition) return;

    const zone    = latLngToZone(playerPosition.lat, playerPosition.lng);
    const zoneKey = `${zone.x},${zone.y}`;

    // Already fetched this zone — do nothing
    if (fetchedZones.current.has(zoneKey)) return;

    // Mark as fetched immediately (before the async call finishes) so that
    // rapid position updates don't trigger duplicate fetches for the same zone.
    // This is called an "optimistic lock" — assume success, handle failure in catch.
    fetchedZones.current.add(zoneKey);

    fetchPlacesNear(playerPosition.lat, playerPosition.lng)
      .then(newPlaces => {
        setPlaces(prev => {
          // Merge new places into existing list, deduplicating by OSM id.
          // Two zones can overlap and return the same place — we want it once.
          const existingIds = new Set(prev.map(p => p.id));
          const unique      = newPlaces.filter(p => !existingIds.has(p.id));

          if (unique.length > 0) {
            console.log(`[usePlaces] Added ${unique.length} new places. Total: ${prev.length + unique.length}`);
          }

          return [...prev, ...unique];
        });
      })
      .catch(err => {
        // If fetch fails, remove the zone from fetchedZones so the player
        // can retry by moving away and back — though overpassService already
        // handles errors gracefully, this is an extra safety net.
        fetchedZones.current.delete(zoneKey);
        console.warn("[usePlaces] Unexpected error:", err);
      });

  }, [playerPosition?.lat, playerPosition?.lng]);

  return places;
}