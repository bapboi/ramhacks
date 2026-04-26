import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PhotoCheckIn from "./PhotoCheckIn";
import { checkIn, toggleRecurring, deleteMed } from "../api";

const ease = [0.16, 1, 0.3, 1];

export default function MedList({ meds, onRefresh, loaded }) {
  const [checkingIn, setCheckingIn] = useState(null);
  const [loadingAction, setLoadingAction] = useState(null);

  if (loaded && (!meds || meds.length === 0)) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          textAlign: "center",
          padding: "40px 20px",
          color: "var(--text-muted)",
          fontSize: 14,
          border: "1px dashed var(--border)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.4 }}>💊</div>
        No medications tracked yet
        <div
          style={{
            fontSize: 12,
            marginTop: 4,
            color: "var(--text-muted)",
            opacity: 0.7,
          }}
        >
          Scan a bottle above to get started
        </div>
      </motion.div>
    );
  }

  const isDue = (med) => med.check_in_required;

  const formatTime = (iso) => {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const timeUntil = (iso) => {
    if (!iso) return null;
    try {
      const diff = new Date(iso) - Date.now();
      if (diff <= 0) return "now";
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
    } catch {
      return null;
    }
  };

  const handleSimpleCheckIn = async (med) => {
    const key = `checkin-${med.name}`;
    setLoadingAction(key);
    try {
      await checkIn(med.name);
      await onRefresh?.();
    } finally {
      setLoadingAction(null);
    }
  };

  const handleToggle = async (med) => {
    const key = `toggle-${med.name}`;
    setLoadingAction(key);
    try {
      await toggleRecurring(med.name, !med.recurring);
      await onRefresh?.();
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDelete = async (med) => {
    if (!confirm(`Remove ${med.name} from your list?`)) return;
    const key = `delete-${med.name}`;
    setLoadingAction(key);
    try {
      await deleteMed(med.name);
      await onRefresh?.();
    } finally {
      setLoadingAction(null);
    }
  };

  const MedCard = ({ med, index }) => {
    const isLoading = (action) => loadingAction === `${action}-${med.name}`;
    const inCheckIn = checkingIn === med.name;
    const due = isDue(med);

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8, scale: 0.97 }}
        transition={{ duration: 0.35, ease, delay: index * 0.04 }}
        style={{
          background: due ? "rgba(240,64,96,0.05)" : "var(--surface)",
          border: due
            ? "1px solid rgba(240,64,96,0.25)"
            : "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "14px 16px",
          marginBottom: 8,
          boxShadow: due ? "0 0 0 1px rgba(240,64,96,0.08)" : "none",
          transition: "border-color 0.2s, background 0.2s",
        }}
      >
        {/* Due banner */}
        <AnimatePresence>
          {due && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: "var(--red)",
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 10,
              }}
            >
              <motion.span
                animate={{ scale: [1, 1.15, 1] }}
                transition={{
                  repeat: Infinity,
                  duration: 1.6,
                  ease: "easeInOut",
                }}
              >
                ⚠
              </motion.span>
              Time to take your {med.name}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 6,
          }}
        >
          <div>
            <span
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "var(--text)",
                letterSpacing: "-0.01em",
              }}
            >
              {med.name}
            </span>
            {med.dosage && (
              <span
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginLeft: 8,
                }}
              >
                {med.dosage}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            <Tag color={med.recurring ? "accent" : "muted"}>
              {med.recurring ? "Recurring" : "One-time"}
            </Tag>
          </div>
        </div>

        {/* Meta row */}
        <div
          style={{
            display: "flex",
            gap: 14,
            flexWrap: "wrap",
            marginBottom: 10,
          }}
        >
          {med.frequency && (
            <MetaItem label="Frequency" value={med.frequency} />
          )}
          {med.last_taken && (
            <MetaItem label="Last taken" value={formatTime(med.last_taken)} />
          )}
          {med.next_due && !due && timeUntil(med.next_due) && (
            <MetaItem
              label="Next due"
              value={`in ${timeUntil(med.next_due)}`}
              highlight
            />
          )}
          {med.instructions?.food_recommendation === "take_with_food" && (
            <MetaItem label="Note" value="Take with food" />
          )}
        </div>

        {/* Actions */}
        {!inCheckIn && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <SmBtn onClick={() => setCheckingIn(med.name)} accent={due}>
              📸 {due ? "Check in now" : "Check in"}
            </SmBtn>
            {due && (
              <SmBtn
                onClick={() => handleSimpleCheckIn(med)}
                disabled={isLoading("checkin")}
              >
                {isLoading("checkin") ? "…" : "✓ Quick"}
              </SmBtn>
            )}
            <SmBtn
              onClick={() => handleToggle(med)}
              disabled={isLoading("toggle")}
            >
              {isLoading("toggle")
                ? "…"
                : med.recurring
                  ? "Make one-time"
                  : "Make recurring"}
            </SmBtn>
            <SmBtn
              onClick={() => handleDelete(med)}
              disabled={isLoading("delete")}
              danger
            >
              {isLoading("delete") ? "…" : "Remove"}
            </SmBtn>
          </div>
        )}

        {/* Photo check-in panel */}
        <AnimatePresence>
          {inCheckIn && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{ marginTop: 12, overflow: "hidden" }}
            >
              <PhotoCheckIn
                medName={med.name}
                onSuccess={() => {
                  setCheckingIn(null);
                  onRefresh?.();
                }}
                onCancel={() => setCheckingIn(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  const due = meds.filter(isDue);
  const recurring = meds.filter((m) => m.recurring && !isDue(m));
  const temp = meds.filter((m) => !m.recurring && !isDue(m));

  return (
    <div>
      <AnimatePresence>
        {due.length > 0 && (
          <motion.div
            key="due-section"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <SectionLabel color="var(--red)">
              Due now · {due.length}
            </SectionLabel>
            {due.map((med, i) => (
              <MedCard key={med.name} med={med} index={i} />
            ))}
          </motion.div>
        )}
        {recurring.length > 0 && (
          <motion.div
            key="recurring-section"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <SectionLabel>Recurring · {recurring.length}</SectionLabel>
            {recurring.map((med, i) => (
              <MedCard key={med.name} med={med} index={i} />
            ))}
          </motion.div>
        )}
        {temp.length > 0 && (
          <motion.div
            key="temp-section"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <SectionLabel>One-time · {temp.length}</SectionLabel>
            {temp.map((med, i) => (
              <MedCard key={med.name} med={med} index={i} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SectionLabel({ children, color = "var(--text-muted)" }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        color,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        marginBottom: 8,
        marginTop: 4,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      {children}
    </div>
  );
}

function Tag({ children, color = "muted" }) {
  const colors = {
    accent: {
      bg: "var(--accent-soft)",
      border: "rgba(124,106,247,0.2)",
      text: "var(--accent)",
    },
    muted: {
      bg: "rgba(255,255,255,0.04)",
      border: "var(--border)",
      text: "var(--text-muted)",
    },
  };
  const c = colors[color];
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        padding: "2px 7px",
        borderRadius: 4,
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.text,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </span>
  );
}

function MetaItem({ label, value, highlight }) {
  return (
    <div>
      <div
        style={{
          fontSize: 9,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          color: "var(--text-muted)",
          marginBottom: 1,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 12,
          color: highlight ? "#60a5fa" : "var(--text-secondary)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function SmBtn({ children, onClick, accent, danger, disabled }) {
  const [hovered, setHovered] = useState(false);

  const bg = danger
    ? hovered
      ? "rgba(240,64,96,0.15)"
      : "rgba(240,64,96,0.07)"
    : accent
      ? hovered
        ? "var(--accent)"
        : "rgba(124,106,247,0.15)"
      : hovered
        ? "var(--surface-hover)"
        : "var(--surface)";

  const color = danger
    ? "var(--red)"
    : accent
      ? hovered
        ? "#fff"
        : "var(--accent)"
      : "var(--text-secondary)";

  const border = danger
    ? "rgba(240,64,96,0.25)"
    : accent
      ? "rgba(124,106,247,0.3)"
      : "var(--border)";

  return (
    <button
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: bg,
        color,
        border: `1px solid ${border}`,
        borderRadius: "var(--radius-sm)",
        padding: "5px 10px",
        fontSize: 12,
        fontWeight: 500,
        cursor: disabled ? "default" : "pointer",
        fontFamily: "inherit",
        transition: "all 0.15s",
        opacity: disabled ? 0.5 : 1,
        letterSpacing: "-0.01em",
      }}
    >
      {children}
    </button>
  );
}
