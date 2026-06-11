import { useState, useEffect, useRef } from "react";
import {
    isQuestWorthy,
    isWithinTimeGate,
    getDistanceMeters,
    generateQuestNarrative,
} from "./questService.js";

// QUEST STATUS
// Exported so QuestPanel can use the same constants.
export const QUEST_STATUS = {
    ACTIVE: "active",
    ARRIVED: "arrived",
    COMPLETE: "complete",
};

// CONFIG
const MAX_ACTIVE_QUESTS = 3; // not overwhelm the user
const QUEST_TRIGGER_RADIUS = 300; // meters, generate quest when place is close to player
const ARRIVAL_RADIUS = 60; // meters, "arrived" when player is close to place