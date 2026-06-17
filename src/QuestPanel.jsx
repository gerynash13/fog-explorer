import { QUEST_STATUS } from "./useQuests.js";
import { THEMES } from "./themes.js";

// ─── STATUS DISPLAY CONFIG ────────────────────────────────────────────────────
const STATUS_CONFIG = {
  [QUEST_STATUS.ACTIVE]: {
    label:      "Active",
    color:      "#7eb8f7",
    borderLeft: "#3a7fd5",
  },
  [QUEST_STATUS.ARRIVED]: {
    label:      "You're here!",
    color:      "#7ef7a0",
    borderLeft: "#2db85a",
  },
  [QUEST_STATUS.COMPLETE]: {
    label:      "Complete",
    color:      "#888",
    borderLeft: "#444",
  },
};

// ─── COMPONENT ───────────────────────────────────────────────────────────────
// Renders a panel of quest cards on the right side of the screen.
// Only shows quests that aren't expired. Complete quests fade out.
//
// Props:
//   quests     — array of quest objects from useQuests
//   onComplete — function(questId) called when player taps complete
//   themeId    — "rpg" | "hacker" | "chill" — affects labels and header
export function QuestPanel({ quests, onComplete, themeId }) {
  const theme = THEMES[themeId];

  // Show active and arrived quests in full; keep completed ones briefly visible
  // so the player sees the confirmation, then filter them out after render.
  const visible = quests.filter(q => q.status !== QUEST_STATUS.EXPIRED);

  if (visible.length === 0) return null;

  return (
    <div style={styles.panel}>

      {/* Panel header changes label based on theme */}
      <div style={styles.header}>
        {theme.ui.questPanel}
      </div>

      {visible.map(quest => {
        const statusCfg = STATUS_CONFIG[quest.status];
        const isComplete = quest.status === QUEST_STATUS.COMPLETE;

        return (
          <div
            key={quest.id}
            style={{
              ...styles.card,
              borderLeft: `3px solid ${statusCfg.borderLeft}`,
              opacity: isComplete ? 0.45 : 1,
            }}
          >
            {/* Place name */}
            <div style={styles.placeName}>
              {quest.place.name}
            </div>

            {/* AI-generated narrative */}
            <div style={styles.narrative}>
              {quest.narrative}
            </div>

            {/* Footer: status badge + optional complete button */}
            <div style={styles.cardFooter}>
              <span style={{ ...styles.statusBadge, color: statusCfg.color }}>
                ● {statusCfg.label}
              </span>

              {/* Complete button only shows when the player has arrived */}
              {quest.status === QUEST_STATUS.ARRIVED && (
                <button
                  style={styles.completeBtn}
                  onClick={() => onComplete(quest.id)}
                >
                  {theme.ui.completeButton}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = {
  panel: {
    position:    "absolute",
    top:         60,
    right:       12,
    width:       260,
    maxHeight:   "70vh",
    overflowY:   "auto",
    zIndex:      1000,
    display:     "flex",
    flexDirection: "column",
    gap:         8,
    pointerEvents: "auto",
  },
  header: {
    fontSize:    13,
    fontWeight:  600,
    color:       "#e0e0e0",
    background:  "rgba(0,0,0,0.7)",
    padding:     "6px 12px",
    borderRadius: 8,
  },
  card: {
    background:   "rgba(10, 10, 25, 0.88)",
    borderRadius: 8,
    padding:      "10px 12px",
    backdropFilter: "blur(4px)",
    transition:   "opacity 0.4s",
  },
  placeName: {
    fontSize:    13,
    fontWeight:  600,
    color:       "#f0f0f0",
    marginBottom: 5,
  },
  narrative: {
    fontSize:    12,
    color:       "#b0b8cc",
    lineHeight:  1.5,
    marginBottom: 8,
    fontStyle:   "italic",
  },
  cardFooter: {
    display:        "flex",
    justifyContent: "space-between",
    alignItems:     "center",
  },
  statusBadge: {
    fontSize:   11,
    fontWeight: 500,
  },
  completeBtn: {
    fontSize:     11,
    padding:      "4px 10px",
    background:   "rgba(45, 184, 90, 0.2)",
    border:       "1px solid #2db85a",
    borderRadius: 6,
    color:        "#7ef7a0",
    cursor:       "pointer",
  },
};