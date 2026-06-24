// PROGRESSION SERVICE
// This is a plain JS module — no React, no hooks, no JSX.

// REWARDS
export const REWARDS = {
    QUEST_COMPLETE: { xp: 75, currency: 10 },
    FIRST_QUEST_BONUS: { xp: 25, currency: 5 },
    PLACE_DISCOVERED: { xp: 2, currency: 0 },
};

// LEVEL CURVE
// XP needs to go from level N to level N+1.
// Math.pow(level, 1.4) creates a curve that slows down as you level up.
// 
// Level 1 -> 2: 100 XP
// Level 2 -> 3: 213 XP
// Level 3 -> 4: 350 XP
// Level 4 -> 5: 507 XP
// Level 5 -> 6: 683 XP
export function xpToLevelUp(level) {
    return Math.floor(100 * Math.pow(level, 1.4));
}

// DEFAULT PLAYER
export const DEFAULT_PLAYER = {
    name:               "旅人",
    avatar:             "⚔️",
    level:              1,
    currentXP:          0,
    totalXP:            0,
    currency:           0,
    questsCompleted:    0,
    placesDiscovered:   0,
    tilesRevealed:      0,
    earnedBadgeIds:     [],
}

// BADGES
// Each badge has a condition function that receives the player object.
// If the function returns true, the badge is unlocked.
// I can add new badges as I see fit.
export const BADGES = [
    {
        id: "first_quest",
        name: "旅の始まり",
        description: "初めての依頼を達成した",
        emoji: "🎉",
        condition: (s) => s.questsCompleted >= 1
    },
    {
        id: "fog_clearer",
        name: "霧を払う者",
        description: "50区画の霧を晴らした",
        emoji: "🌫️",
        condition: (s) => s.tilesRevealed >= 50
    },
    {
        id: "explorer",
        name: "探検者",
        description: "100か所の場所を発見した",
        emoji: "🗺️",
        condition: (s) => s.placesDiscovered >= 100
    },
    {
        id: "wanderer",
        name: "放浪の剣士",
        description: "５つの依頼を達成した",
        emoji: "🗡️",
        condition: (s) => s.questsCompleted >= 100
    },
];

// Which badges should now be awarded given the current stats?
// Returns newly unlocked Badge objects only (not already-awarded ones).
export function checkNewBadges(stats) {
    const earned = new Set(stats.earnedBadgeIds);
    return BADGES.filter(b => !earned.has(b.id) && b.condition(stats));
}