import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
export default function MedInputPanel({ onUploaded }) {
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    await fetch("http://localhost:8000/upload", {
      method: "POST",
      body: formData,
    });

    onUploaded?.();
  };

  const openCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      setStream(mediaStream);
      setCameraOpen(true);
    } catch (err) {
      console.error("Camera error:", err);
    }
  };

  useEffect(() => {
    if (cameraOpen && videoRef.current && stream) {
      videoRef.current.srcObject = stream;

      videoRef.current
        .play()
        .catch((err) => console.error("Video play error:", err));
    }
  }, [cameraOpen, stream]);

  const stopCamera = () => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setCameraOpen(false);
  };

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], "capture.jpg", {
          type: "image/jpeg",
        });

        uploadFile(file);
      }
    }, "image/jpeg");

    stopCamera();
  };

  return (
    <motion.div
      className="card glow"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3 style={{ marginBottom: 10 }}>Upload / Add Medication</h3>

      <input
        type="file"
        style={{
          width: "100%",
          padding: "10px",
          background: "#000",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          color: "white",
        }}
      />

      <button className="btn btn-accent" style={{ marginTop: 10 }}>
        Analyze
      </button>
    </motion.div>
  );
}
