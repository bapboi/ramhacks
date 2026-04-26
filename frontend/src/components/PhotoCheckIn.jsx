import { useRef, useState, useEffect } from "react";
import { checkInWithPhoto } from "../api";

/**
 * PhotoCheckIn — opens the camera, captures a photo, and sends it to
 * the backend for Gemini verification before marking the med as taken.
 *
 * Props:
 *   medName       {string}   - the medication name to verify against
 *   onSuccess     {fn}       - called when check-in is confirmed
 *   onCancel      {fn}       - called when the user cancels
 */
export default function PhotoCheckIn({ medName, onSuccess, onCancel }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [streaming, setStreaming] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | verifying | success | failed
  const [message, setMessage] = useState("");

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      setStreaming(true);
    } catch (err) {
      setMessage("Could not access camera: " + err.message);
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setStreaming(false);
  };

  // Auto-start camera on mount
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const capture = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      const file = new File([blob], "checkin.jpg", { type: "image/jpeg" });
      stopCamera();
      setStatus("verifying");
      setMessage("Verifying your medication with AI…");

      try {
        const result = await checkInWithPhoto(medName, file);

        if (result.success && result.verified) {
          setStatus("success");
          setMessage(`✅ Confirmed! ${result.detected} — check-in recorded.`);
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

  const containerStyle = {
    background: "#1a1a2e",
    border: "2px solid #e94560",
    borderRadius: 12,
    padding: 16,
    color: "#eee",
    maxWidth: 420,
  };

  const btnStyle = (color = "#e94560") => ({
    background: color,
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "10px 18px",
    cursor: "pointer",
    fontWeight: 600,
    marginRight: 8,
    marginTop: 10,
  });

  return (
    <div style={containerStyle}>
      <h3 style={{ margin: "0 0 12px", color: "#e94560" }}>
        📸 Photo Check-In
      </h3>
      <p style={{ margin: "0 0 10px", fontSize: 13, color: "#aaa" }}>
        Hold up your <strong style={{ color: "#fff" }}>{medName}</strong> bottle
        and take a photo to confirm.
      </p>

      {/* Camera view */}
      {streaming && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: "100%", borderRadius: 8, background: "#000" }}
        />
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Status message */}
      {message && (
        <p
          style={{
            marginTop: 10,
            padding: "8px 12px",
            borderRadius: 6,
            background:
              status === "success"
                ? "#1a3a1a"
                : status === "failed"
                  ? "#3a1a1a"
                  : "#1a2a3a",
            color:
              status === "success"
                ? "#4caf50"
                : status === "failed"
                  ? "#f44336"
                  : "#64b5f6",
            fontSize: 13,
          }}
        >
          {status === "verifying" && <span style={{ marginRight: 6 }}>⏳</span>}
          {message}
        </p>
      )}

      {/* Action buttons */}
      <div>
        {streaming && (
          <button style={btnStyle()} onClick={capture}>
            📷 Capture
          </button>
        )}
        {status === "failed" && (
          <button style={btnStyle("#2196f3")} onClick={retry}>
            🔄 Try Again
          </button>
        )}
        <button
          style={btnStyle("#444")}
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
