import { useEffect, useState, useRef, useCallback } from "react";
import UploadBox from "./components/UploadBox";
import MedList from "./components/MedList";
import { getMeds } from "./api";
import { motion } from "framer-motion";
const POLL_INTERVAL_MS = 30_000;

function App() {
  const [meds, setMeds] = useState([]);
  const [notification, setNotification] = useState(null);
  const pollRef = useRef(null);
  const loaded = useRef(false);

  const loadMeds = useCallback(async () => {
    try {
      const data = await getMeds();
      const fresh = data?.meds || [];
      setMeds(fresh);

      const due = fresh.filter((m) => m.check_in_required);
      if (due.length > 0 && "Notification" in window) {
        if (Notification.permission === "granted") {
          due.forEach((m) => {
            new Notification("💊 Time to take your medication!", {
              body: `${m.name} — ${m.dosage}`,
              icon: "/favicon.svg",
            });
          });
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission();
        }
      }
    } catch (err) {
      console.error("Failed to load meds:", err);
    }
  }, []);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    loadMeds();

    pollRef.current = setInterval(loadMeds, POLL_INTERVAL_MS);
    return () => clearInterval(pollRef.current);
  }, [loadMeds]);

  const handleToggleRecurring = (index) => {
    setMeds((prev) =>
      prev.map((med, i) =>
        i === index ? { ...med, recurring: !med.recurring } : med,
      ),
    );
  };

  const showNotification = (text, type = "info") => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const dueMeds = meds.filter((m) => m.check_in_required);

  const appStyle = {
    minHeight: "100vh",
    background: "#0f0f1a",
    color: "#eee",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    padding: "20px 24px 40px",
    maxWidth: 680,
    margin: "0 auto",
  };

  const headerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    borderBottom: "1px solid #333",
    paddingBottom: 12,
  };

  const notifStyle = {
    position: "fixed",
    bottom: 20,
    right: 20,
    background: notification?.type === "error" ? "#c62828" : "#1565c0",
    color: "#fff",
    borderRadius: 8,
    padding: "12px 18px",
    fontSize: 14,
    zIndex: 9999,
    boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
    maxWidth: 320,
  };

  return (
<div
  style={{
    position: "fixed",
    top: -100,
    left: -100,
    width: 400,
    height: 400,
    background: "radial-gradient(circle, #6366f1 0%, transparent 70%)",
    filter: "blur(120px)",
    zIndex: -1
  }}
/>
    <div style={appStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h1 style={{ margin: 0, color: "#e94560", fontSize: 28 }}>
            medsup 💊
          </h1>
          <p style={{ margin: "4px 0 0", color: "#666", fontSize: 13 }}>
            Medication tracker with AI verification
          </p>
        </div>
        {dueMeds.length > 0 && (
          <div
            style={{
              background: "#e94560",
              color: "#fff",
              borderRadius: 8,
              padding: "8px 14px",
              fontWeight: 700,
              fontSize: 14,
              animation: "pulse 1.5s infinite",
            }}
          >
            ⚠️ {dueMeds.length} med{dueMeds.length > 1 ? "s" : ""} due
          </div>
        )}
      </div>

      <section style={{ marginBottom: 28 }}>
        <UploadBox
          onUploaded={async () => {
            await loadMeds();
            showNotification("Medication added successfully!", "info");
          }}
        />
      </section>

      <MedList
        meds={meds}
        onToggleRecurring={handleToggleRecurring}
        onRefresh={loadMeds}
      />

      {notification && <div style={notifStyle}>{notification.text}</div>}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}

export default App;
