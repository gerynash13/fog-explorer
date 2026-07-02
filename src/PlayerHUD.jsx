import { xpToLevelUp, BADGES } from "./progressionService.js";

// ─── PLAYER HUD — MEDALLION STYLE ─────────────────────────────────────────────
// Replaces the rectangular card from earlier phases with a circular portrait
// medallion, the convention used by Fire Emblem, Octopath Traveler, and most
// JRPGs for the corner player-status display.
//
// The XP bar is no longer a separate rectangle below the name — it's a ring
// that wraps AROUND the avatar, drawn with a CSS conic-gradient. A conic
// gradient sweeps color around a circle (like a clock hand sweeping around
// a dial) rather than across a line, which is exactly what's needed to turn
// "73% full" into "73% of the way around the circle."
export function PlayerHUD({ player }) {
  const xpNeeded  = xpToLevelUp(player.level);
  const xpPercent = Math.min((player.currentXP / xpNeeded) * 100, 100);

  const earnedBadges = BADGES.filter(b => player.earnedBadgeIds.includes(b.id));

  return (
    <div style={styles.wrapper}>

      {/* ── Medallion: ring + portrait ── */}
      <div
        style={{
          ...styles.ring,
          // Custom property set inline so the conic-gradient can reference
          // a dynamic value. CSS itself can't do math like "73% of 360deg",
          // but it CAN accept a percentage stop directly in conic-gradient.
          background: `conic-gradient(
            var(--gold-bright) ${xpPercent}%,
            rgba(20, 12, 6, 0.65) ${xpPercent}%
          )`,
        }}
      >
        <div style={styles.portrait}>
          <span style={styles.avatarEmoji}>{player.avatar}</span>
        </div>

        {/* Level badge overlapping the bottom-right of the medallion —
            the classic "class rank" tag seen in most JRPG portrait UIs */}
        <div style={styles.levelTag}>{player.level}</div>
      </div>

      {/* ── Name + currency, to the right of the medallion ── */}
      <div style={styles.infoBlock}>
        <div style={styles.name}>{player.name}</div>
        <div style={styles.currency}>
          <span style={styles.coinIcon}>◆</span> {player.currency}
        </div>

        {/* Earned badges as small hanging emblems beneath the name */}
        {earnedBadges.length > 0 && (
          <div style={styles.badgeRow}>
            {earnedBadges.slice(0, 5).map(badge => (
              <span
                key={badge.id}
                title={`${badge.name} — ${badge.description}`}
                style={styles.badgeEmoji}
              >
                {badge.emoji}
              </span>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = {
  wrapper: {
    position:   "absolute",
    // safe-area-inset ensures this never sits under a phone's notch
    top:        "calc(var(--safe-top) + 10px)",
    left:       "calc(var(--safe-left) + 10px)",
    display:    "flex",
    alignItems: "center",
    gap:        10,
    zIndex:     1000,
    pointerEvents: "none",
  },
  ring: {
    position:     "relative",
    width:        58,
    height:       58,
    borderRadius: "50%",
    padding:      3, // ring thickness — the gap between outer ring and portrait
    boxShadow:    "0 2px 8px rgba(0,0,0,0.5)",
    flexShrink:   0,
    // transition makes the ring visibly sweep forward when XP is gained,
    // rather than snapping instantly — feels like a real fill animation
    transition:   "background 0.6s ease",
  },
  portrait: {
    width:        "100%",
    height:       "100%",
    borderRadius: "50%",
    background:   "radial-gradient(circle at 35% 30%, #4a2f1a, #1a0f08)",
    border:       "1px solid rgba(212,175,55,0.6)",
    display:      "flex",
    alignItems:   "center",
    justifyContent: "center",
  },
  avatarEmoji: {
    fontSize: 24,
    lineHeight: 1,
  },
  levelTag: {
    position:     "absolute",
    bottom:       -4,
    right:        -4,
    minWidth:     20,
    height:       20,
    borderRadius: "50%",
    background:   "var(--gold)",
    color:        "#1a0f08",
    fontFamily:   "var(--font-display)",
    fontSize:     11,
    fontWeight:   700,
    display:      "flex",
    alignItems:   "center",
    justifyContent: "center",
    border:       "1.5px solid var(--ink-black)",
    boxShadow:    "0 1px 3px rgba(0,0,0,0.5)",
  },
  infoBlock: {
    display:       "flex",
    flexDirection: "column",
    gap:           3,
  },
  name: {
    fontFamily: "var(--font-jp)",
    fontSize:   14,
    fontWeight: 700,
    color:      "#f3e9d2",
    textShadow: "0 1px 3px rgba(0,0,0,0.8)",
  },
  currency: {
    fontFamily: "var(--font-jp-sans)",
    fontSize:   12,
    color:      "var(--gold-bright)",
    textShadow: "0 1px 2px rgba(0,0,0,0.8)",
    display:    "flex",
    alignItems: "center",
    gap:        3,
  },
  coinIcon: {
    fontSize: 9,
  },
  badgeRow: {
    display: "flex",
    gap:     3,
    marginTop: 1,
  },
  badgeEmoji: {
    fontSize: 13,
    filter:   "drop-shadow(0 1px 2px rgba(0,0,0,0.7))",
  },
};