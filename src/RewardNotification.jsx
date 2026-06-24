import { useEffect, useState } from "react";

// REWARD NOTIFICATION
// Renders a stack of brief animated pops for level-ups and badge unlocks.
// Each notification slides in, lingers, then fades. Handled via CSS transitions
// triggered by a React state flag.
//
// Props:
//   notifications -> array of { id, type, level?, badge? } from useProgression
export function RewardNotification({ notifications }) {
    if (notifications.length === 0) return null;

    return (
        <div style={styles.stack}>
            {notifications.map(notif => (
                <NotifCard key={notif.id} notif={notif} />
            ))}
        </div>
    );
}

// SINGLE NOTIFICATION CARD
// Mounts invisible, then triggers a CSS transition to slide in.
// This pattern (mount -> flip flag -> CSS transition) is common in React when
// animating elements entering the DOM.
function NotifCard({ notif }) {
    const [visible, setVisible] = useState(false);

    // After mounting, flip visible to true on the next frame
    // Without the tiny delay, the CSS transition has no "before" state to animate from
    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 16); // one frame = ~16ms
        return () => clearTimeout(t);
    }, []);

    const isLevelUp = notif.type === "levelUp";

    return (
        <div style={{
            ...styles.card,
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(60px)",
        }}>

            {isLevelUp ? (
                <>
                    <div style={styles.icon}>🎉</div>
                    <div style={styles.text}>
                        <div style={styles.title}>冒険者ランクアップ!</div>
                        <div style={styles.sub}>ランク {notif.level} に到達した</div>
                    </div>
                </>
            ) : (
                <>
                    <div style={styles.icon}>{notif.badge.emoji}</div>
                    <div style={styles.text}>
                        <div style={styles.title}>称号獲得: {notif.badge.name}</div>
                        <div style={styles.sub}>{notif.badge.description}</div>
                    </div>
                </>
            )}

        </div>
    );
}

// STYLES
const styles = {
    stack: {
        position: "absolute",
        bottom: 110,
        right: 12,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        zIndex: 2000,
        pointerEvents: "none",
    },
    card: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "rgba(10, 10, 25, 0.95)",
        border: "0.5px solid rgba(255, 215, 0, 0.4)",
        borderRadius: 10,
        padding: "10px 14px",
        minWidth: 220,
        backdropFilter: "blur(6px)",
        transition: "opacity 0.3s ease, transform 0.3s ease",
        boxShadow: "0 2px 12px rgba(0, 0, 0, 0.4)",
    },
    icon: {
        fontSize: 24,
        lineHeight: 1,
    },
    text: {
        flex: 1,
    },
    title: {
        fontSize: 13,
        fontWeight: 600,
        color: "#ffd97d",
        marginBottom: 2,
    },
    sub: {
        fontSize: 11,
        color: "#b0b8cc",
    },
};