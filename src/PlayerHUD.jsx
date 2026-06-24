import { xpToLevelUp, BADGES } from "./progressionService.js";

// PLAYER HUD
// A compact panel in the bottom-left showing the player's current stats.
// Designed to be unobtrusive, a user glancing down should get all the key info
// they need.
//
// Props:
//   player -> the full player object from useProgression
export function PlayerHUD({ player }) {
    const xpNeeded = xpToLevelUp(player.level);
    const xpPercent = Math.min((player.currentXP / xpNeeded) * 100, 100);

    // Only show badges that have been earned
    const earnedBadges = BADGES.filter(b => 
        player.earnedBadgeIds.includes(b.id)
    );

    return (
        <div style={styles.hud}>

            {/* Avatar + name + level */}
            <div style={styles.topRow}>
                <span style={styles.avatar}>{player.avatar}</span>
                <div style={styles.nameBlock}>
                    <div style={styles.name}>{player.name}</div>
                    <div style={styles.levelLabel}>冒険者ランク {player.level}</div>
                </div>
                <div style={styles.currency}>
                    💰 {player.currency}
                </div>
            </div>

            {/* XP progress bar */}
            <div style={styles.xpBarTrack}>
                <div style={{ ...styles.xpBarFill, width: `${xpPercent}%`}} />
            </div>
            <div style={styles.xpLabel}>
                {player.currentXP} / {xpNeeded} XP
            </div>

            {/* Earned badges (show up to 6) */}
            {earnedBadges.length > 0 && (
                <div style={styles.badgeRow}>
                    {earnedBadges.slice(0, 6).map(badge => (
                        <span
                            key={badge.id}
                            title={`${badge.name} - ${badge.description}`}
                            style={styles.badgeEmoji}
                        >
                            {badge.emoji}
                        </span>
                    ))}
                </div>
            )}

        </div>
    );
}

// STYLES
const styles = {
    hud: {
        position: "absolute",
        bottom: 56,
        left: 12,
        width: 200,
        background: "rgba(10, 10, 25, 0.88)",
        borderRadius: 10,
        padding: "10px 12px",
        zIndex: 1000,
        backdropFilter: "blur(4px)",
        border: "0.5px solid rgba(255, 255, 255, 0.1)",
    },
    topRow: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 8,
    },
    avatar: {
        fontSize: 22,
        lineHeight: 1,
    },
    nameBlock: {
        flex: 1,
    },
    name: {
        fontSize: 13,
        fontWeight: 600,
        color: "#f0f0f0",
    },
    levelLabel: {
        fontSize: 10,
        color: "#7eb8f7",
        marginTop: 1,
    },
    currency: {
        fontSize: 12,
        color: "#ffd97d",
        fontWeight: 500,
    },
    xpBarTrack: {
        width: "100%",
        height: 5,
        background: "rgba(255, 255, 255, 0.1)",
        borderRadius: 99,
        overflow: "hidden",
        marginBottom: 3,
    },
    xpBarFill: {
        height: "100%",
        background: "linear-gradient(90deg, #3a7fd5, #7eb8fa)",
        borderRadius: 99,
        transition: "width 0.5s ease",
    },
    xpLabel: {
        fontSize: 10,
        color: "#7eb8f7",
        textAlign: "right",
        marginBottom: 6,
    },
    badgeRow: {
        display: "flex",
        gap: 4,
        flexWrap: "wrap",
        marginTop: 2,
    },
    badgeEmoji: {
        fontsize: 14,
        cursor: "default",
    },
};