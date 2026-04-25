export default function MedList({ meds }) {
  return (
    <div>
      <h2>Medications</h2>

      {meds.length === 0 && <p>No medications yet</p>}

      {meds.map((m, i) => (
        <div
          key={i}
          style={{ border: "1px solid #ccc", margin: 8, padding: 10 }}
        >
          <b>{m.name}</b>
          <p>{m.dosage}</p>
          <p>{m.frequency}</p>
        </div>
      ))}
    </div>
  );
}
