import { useState } from "react";
import { QUEST_STATUS } from "./useQuests.js";
import { THEMES } from "./themes.js";

// ─── STATUS DISPLAY CONFIG ────────────────────────────────────────────────────
const STATUS_CONFIG = {
  [QUEST_STATUS.ACTIVE]: {
    label: "進行中",
    color: "var(--status-active)",
    dot:   "●",
  },
  [QUEST_STATUS.ARRIVED]: {
    label: "到着",
    color: "var(--status-arrived)",
    dot:   "✦",
  },
  [QUEST_STATUS.COMPLETE]: {
    label: "達成",
    color: "#8a7a5c",
    dot:   "✓",
  },
};

// ─── COMPONENT — BOTTOM SCROLL SHEET ─────────────────────────────────────────
// Previously a floating right-side panel. Real JRPG dialogue/quest boxes are
// bottom-anchored (Fire Emblem, Pokémon, Final Fantasy) — and a bottom sheet
// also solves the mobile width problem, since it can span the full screen
// instead of competing for a narrow phone's width.
//
// `expanded` is local UI state — only this component cares whether the
// sheet is open or collapsed, so it doesn't need to live in App.
export function QuestPanel({ quests, onComplete, themeId }) {
  const [expanded, setExpanded] = useState(true);
  const theme   = THEMES[themeId];
  const visible = quests.filter(q => q.status !== QUEST_STATUS.EXPIRED);

  if (visible.length === 0) return null;

  return (
    <div style={styles.sheet} className="jrpg-panel">

      {/* ── Drag handle / collapse toggle ── */}
      {/* Tapping anywhere on the header toggles expand/collapse.
          min-height 44px keeps it comfortably tappable on a phone. */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={styles.handle}
        className="jrpg-touch-target"
      >
        <span style={styles.handleBar} />
        <span style={styles.headerText}>
          {theme.ui.questPanel} ({visible.length})
        </span>
        <span style={{
          ...styles.chevron,
          transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
        }}>
          ▲
        </span>
      </button>

      {/* ── Scrollable quest list ── */}
      {/* maxHeight + overflowY with a CSS transition on the wrapper gives a
          smooth slide rather than an abrupt show/hide. */}
      <div style={{
        ...styles.listWrapper,
        maxHeight: expanded ? "46vh" : "0px",
      }}>
        <div style={styles.list}>
          {visible.map(quest => {
            const cfg = STATUS_CONFIG[quest.status];
            const isComplete = quest.status === QUEST_STATUS.COMPLETE;

            return (
              <div
                key={quest.id}
                style={{ ...styles.card, opacity: isComplete ? 0.45 : 1 }}
              >
                <span className="jrpg-corner" style={{ top: 4, left: 4 }}>✦</span>
                <span className="jrpg-corner" style={{ top: 4, right: 4 }}>✦</span>

                <div style={styles.cardHeader}>
                  <span style={styles.placeName}>{quest.place.name}</span>
                  <span style={{ ...styles.statusDot, color: cfg.color }}>
                    {cfg.dot} {cfg.label}
                  </span>
                </div>

                <div style={styles.narrative}>{quest.narrative}</div>

                {quest.status === QUEST_STATUS.ARRIVED && (
                  <button
                    style={styles.completeBtn}
                    className="jrpg-touch-target"
                    onClick={() => onComplete(quest.id)}
                  >
                    {theme.ui.completeButton}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = {
  sheet: {
    position:     "fixed",
    bottom:       0,
    left:         0,
    right:        0,
    // Side padding respects notch/rounded-corner safe areas on real phones
    paddingLeft:  "var(--safe-left)",
    paddingRight: "var(--safe-right)",
    paddingBottom: "var(--safe-bottom)",
    borderRadius: "14px 14px 0 0",
    borderBottom: "none",
    zIndex:       1000,
    pointerEvents: "auto",
  },
  handle: {
    width:          "100%",
    background:     "transparent",
    border:         "none",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    gap:            8,
    padding:        "10px 16px",
    cursor:         "pointer",
    position:       "relative",
  },
  handleBar: {
    position:     "absolute",
    top:          6,
    left:         "50%",
    transform:    "translateX(-50%)",
    width:        36,
    height:       4,
    borderRadius: 99,
    background:   "rgba(61,40,23,0.35)",
  },
  headerText: {
    fontFamily: "var(--font-jp)",
    fontSize:   14,
    fontWeight: 700,
    color:      "var(--parchment-text)",
    marginTop:  4,
  },
  chevron: {
    fontSize:   10,
    color:      "var(--gold)",
    marginTop:  4,
    transition: "transform 0.3s ease",
  },
  listWrapper: {
    overflow:   "hidden",
    transition: "max-height 0.35s ease",
  },
  list: {
    display:       "flex",
    flexDirection: "column",
    gap:           10,
    padding:       "0 14px 14px",
    overflowY:     "auto",
    maxHeight:     "46vh",
  },
  card: {
    position:     "relative",
    background:   "rgba(255, 250, 235, 0.55)",
    border:       "1px solid rgba(61,40,23,0.3)",
    borderRadius: 8,
    padding:      "12px 14px",
    transition:   "opacity 0.4s",
  },
  cardHeader: {
    display:        "flex",
    justifyContent: "space-between",
    alignItems:     "center",
    marginBottom:   6,
    flexWrap:       "wrap",
    gap:            4,
  },
  placeName: {
    fontFamily: "var(--font-jp)",
    fontSize:   14,
    fontWeight: 700,
    color:      "var(--parchment-text)",
  },
  statusDot: {
    fontFamily: "var(--font-jp-sans)",
    fontSize:   11,
    fontWeight: 600,
  },
  narrative: {
    fontFamily: "var(--font-jp-sans)",
    fontSize:   12.5,
    lineHeight: 1.6,
    color:      "#5a4530",
    marginBottom: 8,
  },
  completeBtn: {
    fontFamily:   "var(--font-jp)",
    fontSize:     13,
    fontWeight:   700,
    width:        "100%",
    padding:      "8px 0",
    background:   "linear-gradient(180deg, var(--gold-bright), var(--gold))",
    border:       "1px solid #8a6d1f",
    borderRadius: 6,
    color:        "#3d2817",
    cursor:       "pointer",
    boxShadow:    "0 2px 4px rgba(0,0,0,0.3)",
  },
};