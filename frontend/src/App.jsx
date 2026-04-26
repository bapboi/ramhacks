import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ScanPanel from "./components/ScanPanel";
import MedList from "./components/MedList";
import { getMeds } from "./api";

const POLL_MS = 30_000;

const ease = [0.16, 1, 0.3, 1];

export default function App() {
  const [meds, setMeds] = useState([]);
  const [toast, setToast] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const pollRef = useRef(null);
  const notifiedRef = useRef(new Set());

  const showToast = (text, type = "info") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadMeds = useCallback(async () => {
    try {
      const data = await getMeds();
      const fresh = data?.meds || [];
      setMeds(fresh);
      setLoaded(true);
      const due = fresh.filter((m) => m.check_in_required);
      due.forEach((m) => {
        const key = `${m.name}-${m.next_due}`;
        if (notifiedRef.current.has(key)) return;
        notifiedRef.current.add(key);
        if ("Notification" in window) {
          if (Notification.permission === "granted") {
            new Notification("💊 Medication due!", {
              body: `Time to take ${m.name} — ${m.dosage}`,
              icon: "/favicon.svg",
            });
          } else if (Notification.permission !== "denied") {
            Notification.requestPermission();
          }
        }
      });
    } catch (err) {
      console.error("loadMeds:", err);
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadMeds();
    pollRef.current = setInterval(loadMeds, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [loadMeds]);

  const dueMeds = meds.filter((m) => m.check_in_required);

  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      {/* Ambient gradient orbs */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -200,
            left: "50%",
            transform: "translateX(-50%)",
            width: 700,
            height: 700,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(124,106,247,0.12) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 100,
            right: -150,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(240,64,96,0.09) 0%, transparent 70%)",
          }}
        />
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 680,
          margin: "0 auto",
          padding: "0 20px 80px",
        }}
      >
        {/* ── Header ── */}
        <motion.header
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          style={{
            padding: "28px 0 24px",
            borderBottom: "1px solid var(--border)",
            marginBottom: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, var(--accent), #a78bfa)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  boxShadow: "0 0 28px var(--accent-glow)",
                }}
              >
                💊
              </div>
              <h1
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  letterSpacing: "-0.04em",
                  color: "var(--text)",
                  lineHeight: 1,
                }}
              >
                medsup
              </h1>
            </div>
            <p
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                letterSpacing: "0.01em",
              }}
            >
              AI-powered medication tracker
            </p>
          </div>

          <AnimatePresence>
            {dueMeds.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                style={{
                  background: "var(--red-soft)",
                  border: "1px solid rgba(240,64,96,0.3)",
                  color: "var(--red)",
                  borderRadius: "var(--radius-sm)",
                  padding: "7px 13px",
                  fontWeight: 600,
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.8,
                    ease: "easeInOut",
                  }}
                >
                  ⚠️
                </motion.span>
                {dueMeds.length} due now
              </motion.div>
            )}
          </AnimatePresence>
        </motion.header>

        {/* ── Scan Panel ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease, delay: 0.1 }}
        >
          <ScanPanel
            onSaved={async () => {
              await loadMeds();
              showToast("Medication saved successfully", "success");
            }}
          />
        </motion.div>

        {/* ── Med List ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease, delay: 0.2 }}
        >
          <MedList meds={meds} onRefresh={loadMeds} loaded={loaded} />
        </motion.div>
      </div>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.text}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            style={{
              position: "fixed",
              bottom: 24,
              right: 24,
              background:
                toast.type === "error"
                  ? "rgba(240,64,96,0.12)"
                  : toast.type === "success"
                    ? "rgba(52,211,153,0.1)"
                    : "rgba(124,106,247,0.12)",
              border: `1px solid ${
                toast.type === "error"
                  ? "rgba(240,64,96,0.3)"
                  : toast.type === "success"
                    ? "rgba(52,211,153,0.25)"
                    : "rgba(124,106,247,0.3)"
              }`,
              color:
                toast.type === "error"
                  ? "var(--red)"
                  : toast.type === "success"
                    ? "var(--green)"
                    : "#a78bfa",
              borderRadius: "var(--radius)",
              padding: "12px 18px",
              fontSize: 14,
              fontWeight: 500,
              zIndex: 9998,
              backdropFilter: "blur(12px)",
              maxWidth: 320,
            }}
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
