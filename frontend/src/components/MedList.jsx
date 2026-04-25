export default function MedList({ meds }) {
  return (
    <div style={{ marginTop: 20 }}>
      <h2>Medications</h2>

      {(!meds || meds.length === 0) && <p>No medications found</p>}

      {Array.isArray(meds) &&
        meds.map((med, index) => (
          <div
            key={index}
            style={{
              border: "1px solid #ddd",
              padding: 12,
              marginBottom: 10,
              borderRadius: 8,
            }}
          >
            {/* BASIC INFO */}
            <h3>{med?.name?.toUpperCase() || "UNKNOWN"}</h3>

            <p>
              <strong>Dosage:</strong> {med?.dosage || "N/A"}
            </p>
            <p>
              <strong>Frequency:</strong> {med?.frequency || "N/A"}
            </p>

            {/* 🧠 FULL INSTRUCTIONS BLOCK */}
            {med?.instructions && (
              <div
                style={{
                  marginTop: 10,
                  paddingTop: 10,
                  borderTop: "1px solid #eee",
                }}
              >
                <p>
                  <strong>Food:</strong>{" "}
                  {med.instructions.food_recommendation || "unknown"}
                </p>

                {med.instructions.timing_guidance && (
                  <p>
                    <strong>Timing:</strong> {med.instructions.timing_guidance}
                  </p>
                )}

                {med.instructions.max_daily_dose && (
                  <p>
                    <strong>Max Daily Dose:</strong>{" "}
                    {med.instructions.max_daily_dose}
                  </p>
                )}

                {/* Notes (your key missing piece) */}
                {med.instructions.notes && (
                  <p>
                    <strong>Notes:</strong> {med.instructions.notes}
                  </p>
                )}

                {/* Optional arrays */}
                {Array.isArray(med.instructions.usage_rules) &&
                  med.instructions.usage_rules.length > 0 && (
                    <>
                      <p>
                        <strong>Usage Rules:</strong>
                      </p>
                      <ul>
                        {med.instructions.usage_rules.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </>
                  )}

                {Array.isArray(med.instructions.safety_warnings) &&
                  med.instructions.safety_warnings.length > 0 && (
                    <>
                      <p>
                        <strong>Warnings:</strong>
                      </p>
                      <ul>
                        {med.instructions.safety_warnings.map((w, i) => (
                          <li key={i} style={{ color: "red" }}>
                            {w}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
              </div>
            )}
          </div>
        ))}
    </div>
  );
}
