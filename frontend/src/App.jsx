import { useEffect, useState, useRef } from "react";
import UploadBox from "./components/UploadBox";
import MedList from "./components/MedList";
import { getMeds } from "./api";

function App() {
  const [meds, setMeds] = useState([]);
  const [warnings, setWarnings] = useState([]);

  const loaded = useRef(false);

  const loadMeds = async () => {
    try {
      const data = await getMeds();

      const normalized = Array.isArray(data)
        ? data
        : Array.isArray(data?.meds)
          ? data.meds
          : [];

      setMeds(normalized);
      setWarnings(data?.warnings || []);
    } catch (err) {
      console.error(err);
    }
  };

  // ✅ ONLY RUN ONCE
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    loadMeds();
  }, []);

  // ✅ ONLY TRIGGERED BY UPLOAD
  const handleUploadComplete = async () => {
    await loadMeds();
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>medsup</h1>

      <UploadBox onUploaded={handleUploadComplete} />

      <MedList meds={meds} warnings={warnings} />
    </div>
  );
}

export default App;
