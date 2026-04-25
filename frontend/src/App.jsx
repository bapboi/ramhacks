import { useState, useEffect } from "react";
import UploadBox from "./components/UploadBox";
import MedList from "./components/MedList";
import { addMed, getMeds } from "./api";

function App() {
  const [meds, setMeds] = useState([]);

  const loadMeds = async () => {
    const data = await getMeds();
    setMeds(data);
  };

  useEffect(() => {
    loadMeds();
  }, []);

  const handleResult = async (parsed) => {
    await addMed(parsed);
    loadMeds();
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>💊 MedsUP!</h1>

      <UploadBox onResult={handleResult} />

      <MedList meds={meds} />
    </div>
  );
}

export default App;
