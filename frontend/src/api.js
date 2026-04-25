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

export async function addMed(med) {
  const res = await fetch(`${BASE_URL}/meds`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(med),
  });

  return await res.json();
}
