import { useRef, useState, useEffect } from "react";

export default function CameraUpload({ onUploaded }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [streaming, setStreaming] = useState(false);

  // start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // rear camera
        audio: false,
      });

      videoRef.current.srcObject = stream;
      streamRef.current = stream;
      setStreaming(true);
    } catch (err) {
      console.error("Camera error:", err);
    }
  };

  // stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    setStreaming(false);
  };

  // capture image
  const capture = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      const file = new File([blob], "capture.jpg", {
        type: "image/jpeg",
      });

      const formData = new FormData();
      formData.append("file", file);

      try {
        await fetch("http://127.0.0.1/upload", {
          method: "POST",
          body: formData,
        });

        onUploaded?.();
      } catch (err) {
        console.error("Upload failed:", err);
      }
    }, "image/jpeg");

    stopCamera();
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <div style={{ marginBottom: 20 }}>
      <h2>Camera Scan</h2>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{
          width: "100%",
          maxWidth: 400,
          border: "1px solid #ccc",
        }}
      />

      <canvas ref={canvasRef} style={{ display: "none" }} />

      {!streaming ? (
        <button onClick={startCamera}>Open Camera</button>
      ) : (
        <>
          <button onClick={capture}>Capture & Upload</button>
          <button onClick={stopCamera}>Stop</button>
        </>
      )}
    </div>
  );
}
