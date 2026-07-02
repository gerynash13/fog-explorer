import { useEffect, useState } from "react";

// ─── REWARD NOTIFICATION — SCROLL BANNER STYLE ───────────────────────────────
// Restyled to match the parchment/gold language of the rest of the UI.
// Positioned above the quest sheet's collapsed height so the two never overlap,
// using the same safe-area-aware approach as everything else.
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

function NotifCard({ notif }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 16);
    return () => clearTimeout(t);
  }, []);

  const isLevelUp = notif.type === "levelUp";

  return (
    <div
      className="jrpg-panel"
      style={{
        ...styles.card,
        opacity:   visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(50px)",
      }}
    >
      <span className="jrpg-corner" style={{ top: 4, left: 6 }}>✦</span>
      <span className="jrpg-corner" style={{ top: 4, right: 6 }}>✦</span>

      <div style={styles.icon}>
        {isLevelUp ? "⬆" : notif.badge.emoji}
      </div>
      <div>
        <div style={styles.title}>
          {isLevelUp ? "ランクアップ！" : `称号獲得`}
        </div>
        <div style={styles.sub}>
          {isLevelUp ? `ランク ${notif.level} に到達した` : notif.badge.name}
        </div>
      </div>
    </div>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = {
  stack: {
    position:      "fixed",
    // Sits above the collapsed quest sheet handle (~56px) plus safe area
    bottom:        "calc(var(--safe-bottom) + 64px)",
    right:         "calc(var(--safe-right) + 10px)",
    display:       "flex",
    flexDirection: "column",
    gap:           8,
    zIndex:        2000,
    pointerEvents: "none",
    maxWidth:      "min(260px, calc(100vw - 20px))",
  },
  card: {
    position:     "relative",
    display:      "flex",
    alignItems:   "center",
    gap:          10,
    borderRadius: 8,
    padding:      "10px 14px",
    transition:   "opacity 0.3s ease, transform 0.3s ease",
  },
  icon: {
    fontSize:   22,
    lineHeight: 1,
    flexShrink: 0,
  },
  title: {
    fontFamily: "var(--font-jp)",
    fontSize:   13,
    fontWeight: 700,
    color:      "var(--parchment-text)",
  },
  sub: {
    fontFamily: "var(--font-jp-sans)",
    fontSize:   11,
    color:      "#5a4530",
    marginTop:  1,
  },
};