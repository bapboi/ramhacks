import { useState } from "react";
import { uploadMedication } from "../api";

export default function UploadBox({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;

    try {
      setLoading(true);

      // send file to backend
      const res = await uploadMedication(file);

      console.log("Upload response:", res);

      // IMPORTANT: trigger refresh in parent
      if (onUploaded) {
        await onUploaded();
      }
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <h2>Upload Medication</h2>

      <input type="file" onChange={(e) => setFile(e.target.files[0])} />

      <button
        onClick={handleUpload}
        disabled={loading}
        style={{ marginLeft: 10 }}
      >
        {loading ? "Processing..." : "Analyze"}
      </button>
    </div>
  );
}
