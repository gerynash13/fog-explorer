import { useState, useEffect, useCallback } from "react";
import {
    DEFAULT_PLAYER,
    REWARDS,
    BADGES,
    xpToLevelUp,
    checkNewBadges,
} from "./progressionService.js";

// STORAGE KEY
const STORAGE_KEY = "unveil_player";

// LOAD / SAVE HELPERS
// localStorage only stores strings, so we serialize with JSON.

function loadPlayer() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return { ...DEFAULT_PLAYER };
        // Merge saved data with defaults so new fields added later don't break old saves
        return { ...DEFAULT_PLAYER, ...JSON.parse(saved) };
    } catch {
        return { ...DEFAULT_PLAYER };
    }
}

function savePlayer(player) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(player));
    } catch (err) {
        console.warn("[useProgression] Failed to save player:", err);
    }
}

// XP AWARD HELPER
// Adds XP to the player, handling level ups if the bar fills.
// Returns the updates player object AND an array of any level-ups that occurred.
function applyXP(player, xpGained) {
    let { level, currentXP, totalXP } = player;
    const levelUps = [];

    totalXP += xpGained;
    currentXP += xpGained;

    // A single XP gain could theoretically trigger multiple level-ups
    // so we loop until the bar is stable.
    while (currentXP >= xpToLevelUp(level)) {
        currentXP -= xpToLevelUp(level);
        level++;
        levelUps.push(level);
        console.log(`[useProgression] Level up to ${level}`);
    }

    return { updatedPlayer: { ...player, level, currentXP, totalXP }, levelUps };
}

// HOOK
export function useProgression() {
    // Load save player on first render, or start fresh with defaults
    const [player, setPlayer] = useState(loadPlayer);

    // Notification queue. Each entry is { type, data } to show briefly in the UI
    // type: "levelUp" | "badge"
    const [notifications, setNotifications] = useState([]);

    // Persist to localStorage whenever player state changes
    useEffect(() => {
        savePlayer(player);
    }, [player]);

    // Internal: push a notification and auto-dismiss after 3.5 seconds
    const pushNotification = useCallback((type, data) => {
        const id = `notif_${Date.now()}_${Math.random()}`;
        setNotifications(prev => [...prev, { ...notification, id }]);
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 3500);
    }, []);

    // Internal: check and award any newly earned badges
    const processBadges = useCallback((updatedStats) => {
        const newBadges = checkNewBadges(updatedStats);
        if (newBadges.length === 0) return updatedStats;

        const newIds = newBadges.map(b => b.id);
        const merged = {
            ...updatedStats,
            earnedBadgeIds: [...updatedStats.earnedBadgeIds, ...newIds],
        };

        // Queue a notification for each new badge
        newBadges.forEach(badge => {
            console.log(`[useProgression] Badge earned: ${badge.name}`);
            pushNotification({ type: "badge", badge });
        });

        return merged;
    }, [pushNotification]);

    // onQuestComplete: called by App when the player completes a quest
    const onQuestComplete = useCallback((quest) => {
        setPlayer(prev => {
            const isFirstQuest = prev.questsCompleted === 0;
            let xpGain = REWARDS.QUEST_COMPLETE.xp;
            let currencyGain = REWARDS.QUEST_COMPLETE.currency;
        
        if (isFirstQuest) {
            xpGain += REWARDS.FIRST_QUEST_BONUS.xp;
            currencyGain += REWARDS.FIRST_QUEST_BONUS.currency;
        }

        const afterCurrency = {
            ...prev,
            currency: prev.currency + currencyGain,
            questsCompleted: prev.questsCompleted + 1,
        };

        const { updatedPlayer, levelUps } = applyXP(afterCurrency, xpGain);

        // Queue level-up notifications
        levelUps.forEach(level => {
            pushNotification({ type: "levelUp", level: newLevel });
        });

        // Check for new badges on updated stats
        return processBadges(updatedPlayer);
        });
        
    }, [pushNotification, processBadges]);

    // onPlaceDiscovered: called by App when the places array grows
    const onPlaceDiscovered = useCallback((count = 1) => {
        setPlayer(prev => {
            const xpGain = REWARDS.PLACE_DISCOVERED.xp * count;
            const afterCount = {
                ...prev,
                placesDiscovered: prev.placesDiscovered + count,
            };
            const { updatedPlayer, levelUps } = applyXP(afterCount, xpGain);
            levelUps.forEach(newLevel => {
                pushNotification({ type: "levelUp", level: newLevel });
            });
            return processBadges(updatedPlayer);
        });
    }, [pushNotification, processBadges]);

    // onTilesRevealed: called by App when visitedTiles.size increases
    const onTilesRevealed = useCallback((count = 1) => {
        setPlayer(prev => {
            const updated = {
                ...prev,
                tilesRevealed: prev.tilesRevealed + count,
            };
            // Tiles don't grant XP but do unlock badges, so check for new badges
            return processBadges(updated);
        });
    }, [processBadges]);

    // updateProfile: lets the player change their name / avatar
    const updateProfile = useCallback((name, avatar) => {
        setPlayer(prev => ({ ...prev, name, avatar }));
    }, []);

    return {
        player,
        notifications,
        onQuestComplete,
        onPlaceDiscovered,
        onTilesRevealed,
        updateProfile,
    };
}