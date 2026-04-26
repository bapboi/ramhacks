import { useRef, useState, useEffect, useCallback } from "react";
import { checkInWithPhoto } from "../api";

/**
 * PhotoCheckIn — camera-based check-in with Gemini verification.
 *
 * Camera bug fix: srcObject is assigned inside a useEffect that watches
 * the `streaming` state, so the <video> element is guaranteed to be in
 * the DOM before we try to attach the stream.
 */
export default function PhotoCheckIn({ medName, onSuccess, onCancel }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [streaming, setStreaming] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | verifying | success | failed
  const [message, setMessage] = useState("");
  const [cameraError, setCameraError] = useState("");

  // ── Attach stream to <video> only after it's rendered ──────────────────────
  useEffect(() => {
    if (streaming && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [streaming]);

  const startCamera = useCallback(async () => {
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      setStreaming(true); // triggers useEffect above to attach stream
    } catch (err) {
      setCameraError("Camera unavailable: " + err.message);
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStreaming(false);
  }, []);

  // Auto-start on mount, clean up on unmount
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []); // eslint-disable-line

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "checkin.jpg", { type: "image/jpeg" });
      stopCamera();
      setStatus("verifying");
      setMessage("Verifying your medication with AI…");

      try {
        const result = await checkInWithPhoto(medName, file);
        if (result.success && result.verified) {
          setStatus("success");
          setMessage(`✅ Confirmed: ${result.detected}`);
          setTimeout(() => onSuccess?.(), 1500);
        } else {
          setStatus("failed");
          setMessage(
            result.message ||
              `❌ Could not verify ${medName}. Please try again.`,
          );
        }
      } catch (err) {
        setStatus("failed");
        setMessage("Network error: " + err.message);
      }
    }, "image/jpeg");
  };

  const retry = () => {
    setStatus("idle");
    setMessage("");
    startCamera();
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const wrap = {
    background: "#12122a",
    border: "2px solid #e94560",
    borderRadius: 12,
    padding: 16,
    color: "#eee",
  };
  const btn = (bg = "#e94560") => ({
    background: bg,
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "9px 16px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
    marginRight: 8,
    marginTop: 10,
  });

  return (
    <div style={wrap}>
      <h3 style={{ margin: "0 0 8px", color: "#e94560", fontSize: 15 }}>
        📸 Photo Check-In
      </h3>
      <p style={{ margin: "0 0 10px", fontSize: 12, color: "#888" }}>
        Hold up your <strong style={{ color: "#ccc" }}>{medName}</strong> bottle
        and capture a photo.
      </p>

      {/* Camera error */}
      {cameraError && (
        <p style={{ color: "#f44336", fontSize: 12, marginBottom: 8 }}>
          {cameraError}
        </p>
      )}

      {/* Live video — only rendered when streaming so srcObject assignment is safe */}
      {streaming && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: "100%",
            borderRadius: 8,
            background: "#000",
            display: "block",
          }}
        />
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Status feedback */}
      {message && (
        <p
          style={{
            margin: "10px 0 0",
            padding: "8px 12px",
            borderRadius: 6,
            fontSize: 13,
            background:
              status === "success"
                ? "#0d2b0d"
                : status === "failed"
                  ? "#2b0d0d"
                  : "#0d1a2b",
            color:
              status === "success"
                ? "#4caf50"
                : status === "failed"
                  ? "#f44336"
                  : "#64b5f6",
          }}
        >
          {status === "verifying" && "⏳ "}
          {message}
        </p>
      )}

      {/* Buttons */}
      <div style={{ marginTop: 4 }}>
        {streaming && (
          <button style={btn()} onClick={capture}>
            📷 Capture
          </button>
        )}
        {status === "failed" && (
          <button style={btn("#2196f3")} onClick={retry}>
            🔄 Retry
          </button>
        )}
        {!streaming && status === "idle" && cameraError && (
          <button style={btn("#2196f3")} onClick={startCamera}>
            🔄 Try Camera Again
          </button>
        )}
        <button
          style={btn("#444")}
          onClick={() => {
            stopCamera();
            onCancel?.();
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
