const BASE_URL = "";

// ─── Upload / save ────────────────────────────────────────────────────────────

/** Scan a medication image — returns { success, parsed } but does NOT save */
export async function scanMedication(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Scan failed");
  return res.json();
}

/** Save a scanned med to the DB with a chosen mode */
export async function saveMed(
  parsed,
  recurring,
  override = false,
  overrideDup = false,
) {
  const res = await fetch(
    `${BASE_URL}/upload/save?override=${override}&override_dup=${overrideDup}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parsed, recurring }),
    },
  );
  return res.json();
}

// ─── Meds list ────────────────────────────────────────────────────────────────

export async function getMeds() {
  const res = await fetch(`${BASE_URL}/meds`);
  return res.json();
}

export async function toggleRecurring(name, recurring) {
  const res = await fetch(
    `${BASE_URL}/meds/${encodeURIComponent(name)}/recurring?recurring=${recurring}`,
    { method: "PATCH" },
  );
  return res.json();
}

export async function deleteMed(name) {
  const res = await fetch(`${BASE_URL}/meds/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
  return res.json();
}

// ─── Check-in ─────────────────────────────────────────────────────────────────

export async function checkIn(name) {
  const res = await fetch(`${BASE_URL}/checkin/${encodeURIComponent(name)}`, {
    method: "POST",
  });
  return res.json();
}

export async function checkInWithPhoto(name, file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(
    `${BASE_URL}/checkin/${encodeURIComponent(name)}/verify`,
    { method: "POST", body: formData },
  );
  return res.json();
}

// ─── Interactions ─────────────────────────────────────────────────────────────

export async function checkInteractions(newMedName) {
  const res = await fetch(`${BASE_URL}/interactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ new_med: newMedName }),
  });
  return res.json();
}
