import { useRef, useState, useEffect, useCallback } from "react";
import { scanMedication, saveMed, checkInteractions } from "../api";

export default function ScanPanel({ onSaved }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState("idle"); // idle | scanning | confirm | saving | done | error
  const [parsed, setParsed] = useState(null);
  const [interactions, setInteractions] = useState(null);
  const [showWarning, setShowWarning] = useState(false);
  const [pendingMed, setPendingMed] = useState(null);
  const [checkingInteractions, setCheckingInteractions] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [alreadyTaken, setAlreadyTaken] = useState(false);
  const [existingMed, setExistingMed] = useState(null);
  const [showDupWarning, setShowDupWarning] = useState(false);
  const [pendingDup, setPendingDup] = useState(null);
  // ── Camera: attach stream only after <video> is rendered ───────────────────
  useEffect(() => {
    if (cameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraOpen]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true); // triggers useEffect above
    } catch (err) {
      setErrorMsg("Camera not available: " + err.message);
      setPhase("error");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
  }, []);

  const captureFromCamera = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        stopCamera();
        processFile(new File([blob], "capture.jpg", { type: "image/jpeg" }));
      }
    }, "image/jpeg");
  };

  // ── Core scan flow ─────────────────────────────────────────────────────────
  const processFile = async (file) => {
    setPhase("scanning");
    setErrorMsg("");
    setParsed(null);
    setInteractions(null);
    try {
      const result = await scanMedication(file);
      if (
        !result.success ||
        !result.parsed?.name ||
        result.parsed.name === "unknown"
      ) {
        setPhase("error");
        setErrorMsg(result.error || "Scan failed — try a clearer photo");
        return;
      }
      setParsed(result.parsed);
      setIsDuplicate(!!result.duplicate);
      setAlreadyTaken(!!result.already_taken);
      setExistingMed(result.existing_med || null);
      setPhase("confirm");
      // Fire interaction check in background while user reads the result
      setCheckingInteractions(true);
      checkInteractions(result.parsed.name)
        .then((ix) => setInteractions(ix))
        .catch(() => setInteractions(null))
        .finally(() => setCheckingInteractions(false));
    } catch (err) {
      setPhase("error");
      setErrorMsg(err.message);
    }
  };

  const handleSave = async (
    recurring,
    override = false,
    overrideDup = false,
  ) => {
    if (!overrideDup && isDuplicate) {
      setPendingDup({ recurring, override });
      setShowDupWarning(true);
      return;
    }
    if (!override && interactions && !interactions.safe) {
      setPendingMed({ recurring });
      setShowWarning(true);
      return;
    }
    setPhase("saving");
    try {
      await saveMed(parsed, recurring, override, overrideDup);
      setPhase("done");
      setTimeout(() => {
        setPhase("idle");
        onSaved?.();
      }, 1200);
    } catch (err) {
      setPhase("error");
      setErrorMsg(err.message);
    }
  };

  const reset = () => {
    setPhase("idle");
    setParsed(null);
    setInteractions(null);
    setIsDuplicate(false);
    setAlreadyTaken(false);
    setExistingMed(null);
    setErrorMsg("");
    stopCamera();
  };

  // ── Drag & drop ────────────────────────────────────────────────────────────
  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith("image/")) processFile(file);
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const panel = {
    background: "rgba(18, 18, 42, 0.55)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    border: dragging
      ? "2px dashed #e94560"
      : "1px solid rgba(255,255,255,0.09)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    transition: "border 0.15s",
    boxShadow:
      "0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
  };
  const btn = (bg = "#e94560", sm = false) => ({
    background: bg,
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: sm ? "6px 12px" : "10px 18px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: sm ? 12 : 14,
  });
  const row = { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 };
  const label = {
    color: "#666",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  };
  const value = { color: "#eee", fontSize: 14, marginBottom: 10 };

  return (
    <div style={panel}>
      <h2
        style={{
          margin: "0 0 14px",
          color: "#e94560",
          fontSize: 17,
          fontWeight: 700,
        }}
      >
        ➕ Add Medication
      </h2>

      {/* ── IDLE ── */}
      {phase === "idle" && (
        <>
          <div style={row}>
            <button style={btn()} onClick={() => fileInputRef.current?.click()}>
              📁 Choose File
            </button>
            <button style={btn("#2196f3")} onClick={startCamera}>
              📸 Use Camera
            </button>
          </div>

          {/* Drag & drop zone */}
          <div
            style={{
              border: "2px dashed #2a2a4a",
              borderRadius: 10,
              padding: "20px",
              textAlign: "center",
              color: "#555",
              fontSize: 13,
              cursor: "pointer",
              background: dragging ? "#1a1a3a" : "transparent",
              transition: "background 0.15s",
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {dragging
              ? "Drop image here…"
              : "or drag & drop a medication photo here"}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) processFile(f);
              e.target.value = "";
            }}
          />
        </>
      )}

      {/* ── CAMERA VIEW — only rendered when open so srcObject assignment is safe ── */}
      {cameraOpen && phase === "idle" && (
        <div style={{ marginTop: 12 }}>
          <video
            ref={videoRef}
            playsInline
            muted
            style={{
              width: "100%",
              borderRadius: 8,
              background: "#000",
              display: "block",
            }}
          />
          <div style={{ ...row, marginTop: 10 }}>
            <button style={btn()} onClick={captureFromCamera}>
              📷 Capture
            </button>
            <button style={btn("#555")} onClick={stopCamera}>
              ✕ Cancel
            </button>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* ── SCANNING ── */}
      {phase === "scanning" && (
        <p style={{ color: "#64b5f6", padding: "12px 0", fontSize: 14 }}>
          ⏳ Scanning with AI…
        </p>
      )}

      {/* ── CONFIRM ── */}
      {phase === "confirm" && parsed && (
        <div>
          {/* Parsed result card */}
          <div
            style={{
              background: "#1a1a2e",
              border: "1px solid #2a2a3a",
              borderRadius: 10,
              padding: 16,
              marginTop: 4,
            }}
          >
            <div style={label}>Medication</div>
            <div
              style={{ ...value, fontWeight: 700, fontSize: 17, color: "#fff" }}
            >
              {parsed.name}
            </div>
            <div style={label}>Dosage</div>
            <div style={value}>{parsed.dosage}</div>
            <div style={label}>Frequency</div>
            <div style={value}>{parsed.frequency}</div>
            {parsed.instructions?.food_recommendation === "take_with_food" && (
              <div style={{ color: "#aaa", fontSize: 13 }}>
                🍽️ Take with food
              </div>
            )}
            {parsed.instructions?.notes && (
              <div
                style={{
                  color: "#777",
                  fontSize: 12,
                  marginTop: 6,
                  fontStyle: "italic",
                }}
              >
                {parsed.instructions.notes}
              </div>
            )}
          </div>

          {/* Duplicate / already-taken warning */}
          {isDuplicate && (
            <div
              style={{
                background: alreadyTaken
                  ? "rgba(240,64,96,0.1)"
                  : "rgba(251,191,36,0.08)",
                border: `1px solid ${alreadyTaken ? "rgba(240,64,96,0.45)" : "rgba(251,191,36,0.4)"}`,
                borderRadius: 9,
                padding: "11px 14px",
                marginTop: 12,
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 13,
                  color: alreadyTaken ? "#f04060" : "#fbbf24",
                  marginBottom: 4,
                }}
              >
                {alreadyTaken
                  ? "⛔ Already Taken Recently"
                  : "⚠️ Duplicate Medication"}
              </div>
              <div style={{ color: "#bbb", fontSize: 12 }}>
                {alreadyTaken
                  ? `You already logged ${parsed.name} within its current dose window. Adding again may cause a double-dose.`
                  : `${parsed.name} is already in your medication list. Saving again will reset its schedule.`}
              </div>
              {existingMed?.last_taken && (
                <div style={{ color: "#777", fontSize: 11, marginTop: 5 }}>
                  Last taken:{" "}
                  {new Date(existingMed.last_taken + "Z").toLocaleString()}
                </div>
              )}
            </div>
          )}

          {/* Interaction check */}
          {checkingInteractions && (
            <p style={{ color: "#777", fontSize: 12, marginTop: 10 }}>
              ⏳ Checking for drug interactions…
            </p>
          )}
          {interactions && (
            <div style={{ marginTop: 10 }}>
              {interactions.safe ? (
                <div
                  style={{
                    background: "#0a2a0a",
                    border: "1px solid #2e7d32",
                    borderRadius: 8,
                    padding: "10px 14px",
                    fontSize: 13,
                    color: "#66bb6a",
                  }}
                >
                  ✅ No significant interactions with your active medications.
                </div>
              ) : (
                <div
                  style={{
                    background: "#1a0a0a",
                    border: "1px solid #c62828",
                    borderRadius: 8,
                    padding: "12px 14px",
                  }}
                >
                  <div
                    style={{
                      color: "#ef5350",
                      fontWeight: 700,
                      marginBottom: 8,
                    }}
                  >
                    ⚠️ Interaction Warning
                  </div>
                  {interactions.interactions.map((ix, i) => (
                    <div key={i} style={{ marginBottom: 8, fontSize: 13 }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 10,
                          textTransform: "uppercase",
                          color:
                            ix.severity === "severe"
                              ? "#ef5350"
                              : ix.severity === "moderate"
                                ? "#ffa726"
                                : "#90a4ae",
                          marginRight: 6,
                        }}
                      >
                        [{ix.severity}]
                      </span>
                      <strong style={{ color: "#ddd" }}>{ix.med}</strong>
                      <p style={{ margin: "3px 0 0", color: "#999" }}>
                        {ix.description}
                      </p>
                    </div>
                  ))}
                  <p style={{ color: "#aaa", fontSize: 12, margin: "8px 0 0" }}>
                    {interactions.summary}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Save options */}
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginTop: 14,
            }}
          >
            <button style={btn("#2196f3")} onClick={() => handleSave(true)}>
              🔁 Save as Recurring
            </button>
            <button style={btn("#4a4a5a")} onClick={() => handleSave(false)}>
              ⏱ Log as One-Time
            </button>
            <button style={btn("#2a2a2a")} onClick={reset}>
              ✕ Cancel
            </button>
          </div>
          <p style={{ color: "#555", fontSize: 11, marginTop: 6 }}>
            Recurring: tracked permanently, reminds you on schedule. &nbsp;
            One-time: auto-removed after the dose window passes.
          </p>
        </div>
      )}

      {/* ── SAVING ── */}
      {phase === "saving" && (
        <p style={{ color: "#64b5f6", padding: "12px 0", fontSize: 14 }}>
          ⏳ Saving…
        </p>
      )}

      {/* ── DONE ── */}
      {phase === "done" && (
        <p style={{ color: "#66bb6a", padding: "12px 0", fontSize: 14 }}>
          ✅ Medication saved!
        </p>
      )}

      {/* ── ERROR ── */}
      {phase === "error" && (
        <div>
          <p style={{ color: "#ef5350", fontSize: 13, margin: "0 0 10px" }}>
            ❌ {errorMsg}
          </p>
          <button style={btn("#444", true)} onClick={reset}>
            Try again
          </button>
        </div>
      )}
      {showWarning && interactions && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
          }}
        >
          <div
            style={{
              background: "#12122a",
              border: "1px solid #c62828",
              borderRadius: 12,
              padding: 20,
              width: "90%",
              maxWidth: 420,
            }}
          >
            <h3 style={{ color: "#ef5350", marginTop: 0 }}>
              🚨 Confirm Medication Risk
            </h3>

            <p style={{ color: "#bbb", fontSize: 13 }}>
              This medication may interact with your current medications.
            </p>

            {interactions.interactions?.map((ix, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ color: "#fff", fontWeight: 600 }}>
                  {ix.med} ({ix.severity})
                </div>
                <div style={{ color: "#aaa", fontSize: 12 }}>
                  {ix.description}
                </div>
              </div>
            ))}

            <p style={{ color: "#888", fontSize: 12 }}>
              {interactions.summary}
            </p>

            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button
                style={{
                  ...btn("#444"),
                  flex: 1,
                }}
                onClick={() => {
                  setShowWarning(false);
                  setPendingMed(null);
                }}
              >
                Cancel
              </button>

              <button
                style={{
                  ...btn("#c62828"),
                  flex: 1,
                }}
                onClick={() => {
                  setShowWarning(false);

                  // ✅ proceed with override
                  handleSave(pendingMed.recurring, true);

                  setPendingMed(null);
                }}
              >
                Add Anyway
              </button>
            </div>
          </div>
        </div>
      )}
      {showDupWarning && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#12122a",
              border: `1px solid ${alreadyTaken ? "#c62828" : "#b45309"}`,
              borderRadius: 12,
              padding: 22,
              width: "90%",
              maxWidth: 420,
            }}
          >
            <h3
              style={{
                color: alreadyTaken ? "#ef5350" : "#fbbf24",
                marginTop: 0,
              }}
            >
              {alreadyTaken
                ? "⛔ Possible Double Dose"
                : "⚠️ Duplicate Medication"}
            </h3>
            <p style={{ color: "#bbb", fontSize: 13, marginBottom: 10 }}>
              {alreadyTaken
                ? `You already took ${parsed?.name} within its current dose window. Adding it again could result in a double dose — are you sure?`
                : `${parsed?.name} is already saved in your medication list. Do you want to re-add it and reset its schedule?`}
            </p>
            {existingMed && (
              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: 8,
                  padding: "10px 12px",
                  fontSize: 12,
                  color: "#888",
                  marginBottom: 14,
                }}
              >
                <div>
                  Current dosage:{" "}
                  <span style={{ color: "#ddd" }}>{existingMed.dosage}</span>
                </div>
                {existingMed.last_taken && (
                  <div>
                    Last taken:{" "}
                    <span style={{ color: "#ddd" }}>
                      {new Date(existingMed.last_taken + "Z").toLocaleString()}
                    </span>
                  </div>
                )}
                {existingMed.next_due && (
                  <div>
                    Next due:{" "}
                    <span style={{ color: "#ddd" }}>
                      {new Date(existingMed.next_due + "Z").toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <button
                style={{
                  ...btn("rgba(255,255,255,0.07)"),
                  flex: 1,
                  color: "#ccc",
                }}
                onClick={() => {
                  setShowDupWarning(false);
                  setPendingDup(null);
                }}
              >
                Cancel
              </button>
              <button
                style={{
                  ...btn(alreadyTaken ? "#c62828" : "#92400e"),
                  flex: 1,
                }}
                onClick={() => {
                  setShowDupWarning(false);
                  handleSave(pendingDup.recurring, pendingDup.override, true);
                  setPendingDup(null);
                }}
              >
                {alreadyTaken ? "Add Anyway (Risk)" : "Replace & Reset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
