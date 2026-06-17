import { useState, useEffect, useRef } from "react";
import {
  isQuestWorthy,
  isWithinTimeGate,
  getDistanceMeters,
  generateQuestNarrative,
} from "./questService.js";

// ─── QUEST STATUS ─────────────────────────────────────────────────────────────
// Exported so QuestPanel can use the same constants — one source of truth.
// Think of this like an Enum in Python.
export const QUEST_STATUS = {
  ACTIVE:   "active",    // quest exists, player hasn't arrived yet
  ARRIVED:  "arrived",   // player is at the location
  COMPLETE: "complete",  // player confirmed the visit
};

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const MAX_ACTIVE_QUESTS    = 3;    // never overwhelm the player
const QUEST_TRIGGER_RADIUS = 300;  // meters — generate quest when place is this close
const ARRIVAL_RADIUS       = 60;   // meters — "arrived" when this close

// ─── HOOK ─────────────────────────────────────────────────────────────────────
// Manages the full quest lifecycle:
//   1. Scans nearby places for quest candidates
//   2. Generates narratives via AI for candidates
//   3. Detects when the player arrives at a quest location
//   4. Exposes a completeQuest() function for the UI
//
// Parameters:
//   places         — array from usePlaces
//   playerPosition — { lat, lng } from App
//   themeId        — "rpg" | "hacker" | "chill"
//   apiKey         — Gemini API key from .env.local
export function useQuests(places, playerPosition, themeId, apiKey) {
  const [quests, setQuests] = useState([]);

  // Tracks place IDs currently being sent to the AI.
  // useRef because this is internal coordination, not UI state.
  // Without this, rapid position updates could fire duplicate AI calls
  // for the same place before the first one resolves.
  const generatingIds = useRef(new Set());

  // ── Step 1: Generate quests for newly nearby places ──────────────────────
  useEffect(() => {
    if (!playerPosition || !apiKey) return;

    const activeCount = quests.filter(
      q => q.status === QUEST_STATUS.ACTIVE || q.status === QUEST_STATUS.ARRIVED
    ).length;

    // Already at the quest limit — don't generate more
    if (activeCount >= MAX_ACTIVE_QUESTS) return;

    // IDs of places that already have (or are getting) a quest
    const claimedIds = new Set([
      ...quests.map(q => q.placeId),
      ...generatingIds.current,
    ]);

    // Filter places down to valid candidates
    const candidates = places.filter(place => {
      if (claimedIds.has(place.id))               return false; // already a quest
      if (!isQuestWorthy(place))                   return false; // not interesting enough
      if (!isWithinTimeGate(place))                return false; // wrong time of day

      const dist = getDistanceMeters(
        playerPosition.lat, playerPosition.lng,
        place.lat, place.lng
      );
      return dist <= QUEST_TRIGGER_RADIUS;
    });

    if (candidates.length === 0) return;

    // Shuffle candidates so we don't always pick the same nearby place
    const slots = MAX_ACTIVE_QUESTS - activeCount;
    const picks = [...candidates]
      .sort(() => Math.random() - 0.5)
      .slice(0, slots);

    for (const place of picks) {
      // Claim this place ID immediately to prevent duplicate generation
      generatingIds.current.add(place.id);
      console.log(`[useQuests] Generating quest for: ${place.name}`);

      generateQuestNarrative(place, playerPosition, themeId, apiKey)
        .then(narrative => {
          const newQuest = {
            id:        `quest_${place.id}_${Date.now()}`,
            placeId:   place.id,
            place,
            narrative,
            status:    QUEST_STATUS.ACTIVE,
            createdAt: Date.now(),
          };

          setQuests(prev => [...prev, newQuest]);
          console.log(`[useQuests] Quest created: "${narrative.slice(0, 60)}..."`);
        })
        .catch(err => {
          console.warn(`[useQuests] Failed to generate quest for ${place.name}:`, err.message);
        })
        .finally(() => {
          // Release the claim whether it succeeded or failed
          generatingIds.current.delete(place.id);
        });
    }

  // We depend on places.length so this runs when new places are discovered.
  // We also depend on quest count so it runs when a quest completes (freeing a slot).
  }, [places.length, quests.length, playerPosition?.lat, playerPosition?.lng]);

  // ── Step 2: Detect arrivals ───────────────────────────────────────────────
  // On every position update, check if the player has reached any active quest.
  useEffect(() => {
    if (!playerPosition) return;

    setQuests(prev =>
      prev.map(quest => {
        // Only check quests that are still active
        if (quest.status !== QUEST_STATUS.ACTIVE) return quest;

        const dist = getDistanceMeters(
          playerPosition.lat, playerPosition.lng,
          quest.place.lat, quest.place.lng
        );

        if (dist <= ARRIVAL_RADIUS) {
          console.log(`[useQuests] Arrived at: ${quest.place.name}`);
          // Return a new object with updated status.
          // In React, you must never mutate state directly —
          // always return a new object. { ...quest } spreads all existing
          // fields, then we override just the status.
          return { ...quest, status: QUEST_STATUS.ARRIVED };
        }

        return quest;
      })
    );

  }, [playerPosition?.lat, playerPosition?.lng]);

  // ── Step 3: Complete a quest ──────────────────────────────────────────────
  // Called by the UI when the player taps the complete button.
  const completeQuest = (questId) => {
    setQuests(prev =>
      prev.map(q =>
        q.id === questId ? { ...q, status: QUEST_STATUS.COMPLETE } : q
      )
    );
    console.log(`[useQuests] Quest completed: ${questId}`);
  };

  return { quests, completeQuest };
}