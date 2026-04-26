const BASE_URL = "http://127.0.0.1:8000";

export async function uploadMedication(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error("Upload failed");
  return await res.json();
}

export async function getMeds() {
  const res = await fetch(`${BASE_URL}/meds`);
  return await res.json();
}

/** Simple check-in (no photo) */
export async function checkIn(name) {
  const res = await fetch(`${BASE_URL}/checkin/${encodeURIComponent(name)}`, {
    method: "POST",
  });
  return await res.json();
}

/**
 * Photo check-in — sends the captured image to Gemini for verification
 * before marking the medication as taken.
 */
export async function checkInWithPhoto(name, file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(
    `${BASE_URL}/checkin/${encodeURIComponent(name)}/verify`,
    {
      method: "POST",
      body: formData,
    },
  );
  return await res.json();
}
