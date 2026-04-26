import { useState } from "react";
import PhotoCheckIn from "./PhotoCheckIn";

/**
 * MedList — renders the medication list with:
 *   - Due / overdue indicator
 *   - Recurring toggle
 *   - Photo check-in flow
 *   - Last-taken timestamp
 */
export default function MedList({
  meds,
  onCheckIn,
  onToggleRecurring,
  onRefresh,
}) {
  const [checkingIn, setCheckingIn] = useState(null); // name of med currently in photo check-in

  if (!meds || meds.length === 0) {
    return (
      <p style={{ color: "#888", marginTop: 20 }}>
        No medications yet. Scan a bottle to get started.
      </p>
    );
  }

  const isDue = (med) => med.check_in_required || med.checkInRequired;

  const cardStyle = (med) => ({
    border: isDue(med) ? "2px solid #e94560" : "1px solid #444",
    borderRadius: 10,
    padding: "14px 16px",
    marginBottom: 12,
    background: isDue(med) ? "#1f0a10" : "#1a1a2e",
    color: "#eee",
    position: "relative",
  });

  const badgeStyle = (color) => ({
    display: "inline-block",
    background: color,
    color: "#fff",
    borderRadius: 4,
    padding: "2px 8px",
    fontSize: 11,
    fontWeight: 700,
    marginRight: 6,
    marginBottom: 6,
    textTransform: "uppercase",
  });

  const btnStyle = (color = "#e94560") => ({
    background: color,
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "7px 14px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
    marginRight: 8,
    marginTop: 8,
  });

  const formatTime = (iso) => {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <div style={{ marginTop: 20 }}>
      <h2 style={{ color: "#eee", marginBottom: 12 }}>
        💊 My Medications ({meds.length})
      </h2>

      {meds.map((med, index) => (
        <div key={med.name || index} style={cardStyle(med)}>
          {/* Header row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <h3 style={{ margin: 0, color: "#fff" }}>{med.name}</h3>
            <div>
              {isDue(med) && (
                <span style={badgeStyle("#e94560")}>⚠️ Due Now</span>
              )}
              {med.recurring && (
                <span style={badgeStyle("#2196f3")}>🔁 Recurring</span>
              )}
            </div>
          </div>

          {/* Details */}
          <p style={{ margin: "6px 0 2px", color: "#aaa", fontSize: 14 }}>
            <strong style={{ color: "#ddd" }}>Dosage:</strong> {med.dosage}
          </p>
          <p style={{ margin: "2px 0", color: "#aaa", fontSize: 14 }}>
            <strong style={{ color: "#ddd" }}>Frequency:</strong>{" "}
            {med.frequency}
          </p>

          {med.instructions?.food_recommendation &&
            med.instructions.food_recommendation !== "unknown" && (
              <p style={{ margin: "2px 0", color: "#aaa", fontSize: 13 }}>
                🍽️{" "}
                {med.instructions.food_recommendation === "take_with_food"
                  ? "Take with food"
                  : "No food restriction"}
              </p>
            )}

          {med.instructions?.notes && (
            <p
              style={{
                margin: "4px 0",
                color: "#bbb",
                fontSize: 13,
                fontStyle: "italic",
              }}
            >
              📝 {med.instructions.notes}
            </p>
          )}

          {/* Timing info */}
          {med.last_taken && (
            <p style={{ margin: "6px 0 0", color: "#666", fontSize: 12 }}>
              Last taken: {formatTime(med.last_taken)}
            </p>
          )}
          {med.next_due && !isDue(med) && (
            <p style={{ margin: "2px 0", color: "#666", fontSize: 12 }}>
              Next due: {formatTime(med.next_due)}
            </p>
          )}

          {/* Action buttons */}
          <div style={{ marginTop: 8 }}>
            {/* Photo check-in — shown when due */}
            {isDue(med) && checkingIn !== med.name && (
              <button
                style={btnStyle("#e94560")}
                onClick={() => setCheckingIn(med.name)}
              >
                📸 Photo Check-In
              </button>
            )}

            {/* Recurring toggle */}
            <button
              style={btnStyle(med.recurring ? "#555" : "#2196f3")}
              onClick={() => onToggleRecurring?.(index)}
            >
              {med.recurring ? "🔕 Disable Recurring" : "🔁 Enable Recurring"}
            </button>
          </div>

          {/* Photo check-in panel — inline */}
          {checkingIn === med.name && (
            <div style={{ marginTop: 12 }}>
              <PhotoCheckIn
                medName={med.name}
                onSuccess={() => {
                  setCheckingIn(null);
                  onRefresh?.();
                }}
                onCancel={() => setCheckingIn(null)}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
