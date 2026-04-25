import { useState } from "react";
import { uploadMedication } from "../api";

export default function UploadBox({ onResult }) {
  const [file, setFile] = useState(null);

  const handleUpload = async () => {
    if (!file) return;

    const data = await uploadMedication(file);
    onResult(data.parsed);
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <h2>Upload Medication</h2>

      <input type="file" onChange={(e) => setFile(e.target.files[0])} />

      <button onClick={handleUpload}>Analyze</button>
    </div>
  );
}
