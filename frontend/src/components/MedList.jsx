function MedList({ meds, onCheckIn, onToggleRecurring, isDue }) {
  if (!meds || meds.length === 0) {
    return <p>No medications yet.</p>;
  }

  return (
    <div>
      {meds.map((med, index) => (
        <div
          key={index}
          style={{
            border: "1px solid gray",
            padding: 10,
            marginBottom: 10,
          }}
        >
          <h3>{med.name}</h3>
          <p>{med.dosage}</p>
          <p>{med.frequency}</p>

          {med.instructions?.notes && <p>{med.instructions.notes}</p>}

          {/* Check-in */}
          <button onClick={() => onCheckIn(index)}>Check In</button>

          {/* Recurring toggle */}
          <button onClick={() => onToggleRecurring(index)}>
            {med.recurring ? "Disable Recurring" : "Make Recurring"}
          </button>

          {/* Interval */}
          {med.recurring && med.intervalHours && (
            <p>Every {med.intervalHours} hours</p>
          )}

          {/* Due indicator */}
          {isDue && isDue(med) && <p style={{ color: "red" }}>⚠️ Due Now</p>}

          {/* Last taken */}
          {med.lastTaken && (
            <p>Last taken: {new Date(med.lastTaken).toLocaleString()}</p>
          )}
        </div>
      ))}
    </div>
  );
}

export default MedList;
