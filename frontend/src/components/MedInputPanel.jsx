import { useRef, useState, useEffect } from "react";

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

  // 📸 OPEN CAMERA
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

  // 🔥 ATTACH STREAM AFTER RENDER (THIS IS THE FIX)
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
    <div style={{ padding: 16 }}>
      <h2>Scan Medication</h2>

      <button onClick={openCamera}>📸 Scan with Camera</button>

      <button onClick={() => fileInputRef.current.click()}>📁 Upload</button>

      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadFile(file);
        }}
      />

      {/* 📸 CAMERA VIEW */}
      {cameraOpen && (
        <div style={{ marginTop: 10 }}>
          <video
            ref={videoRef}
            style={{
              width: "100%",
              borderRadius: 8,
              background: "black",
            }}
            playsInline
            muted
          />

          <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
            <button onClick={capture}>📷 Capture</button>
            <button onClick={stopCamera}>❌ Close</button>
          </div>

          <canvas ref={canvasRef} style={{ display: "none" }} />
        </div>
      )}
    </div>
  );
}
