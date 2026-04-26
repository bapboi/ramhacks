import { useEffect, useState, useRef } from "react";
import UploadBox from "./components/UploadBox";
import MedList from "./components/MedList";
import { getMeds } from "./api";

function App() {
  const [meds, setMeds] = useState([]);
  const [warnings, setWarnings] = useState([]);

  // prevents double-fetch (React StrictMode issue)
  const loaded = useRef(false);

  const loadMeds = async () => {
    try {
      const data = await getMeds();

      setMeds(data?.meds || []);
      setWarnings(data?.warnings || []);
    } catch (err) {
      console.error("Failed to load meds:", err);
      setMeds([]);
      setWarnings([]);
    }
  };

  useEffect(() => {
    if (loaded.current) return;

    loaded.current = true;
    loadMeds();
  }, []);

  // called AFTER successful upload
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
