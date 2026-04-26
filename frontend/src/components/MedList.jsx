import { useState } from "react";
import PhotoCheckIn from "./PhotoCheckIn";
import { motion, AnimatePresence } from "framer-motion";

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
      <AnimatePresence>
        {meds.map((med) => (
          <motion.div
            key={med.name}
            className="card"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            style={{
              marginBottom: 10,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 500 }}>{med.name}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                Active medication
              </div>
            </div>

            <button className="btn">Check In</button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
