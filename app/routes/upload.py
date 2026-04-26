"""
upload.py — scan a medication bottle image with Gemini, then let the
caller decide whether to save it as recurring or temporary.

POST /upload
  - Scans image, returns parsed med info + duplicate/already_taken flags
  - Does NOT save to DB yet

POST /upload/save
  - Body: { parsed: {...}, recurring: bool }
  - Query: override=true  — bypass interaction warnings
  - Query: override_dup=true — bypass duplicate warning (re-add anyway)
  - Saves to DB with the chosen mode
"""

from fastapi import APIRouter, UploadFile, File, Query
from pydantic import BaseModel
import requests
import json
import base64
import re
from datetime import datetime
from app.state.medstore import get_all_meds, get_med
from app.config import config
from app.state.medstore import (
    upsert_med,
    frequency_to_hours,
    compute_next_due,
)

router = APIRouter()
GEMINI_API_KEY = config["Gemini"]["ApiKey"]

GEMINI_MODEL = config.get("Gemini", {}).get("Model", "gemini-2.5-flash-lite")
GEMINI_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
)


# ─── Gemini OCR ───────────────────────────────────────────────────────────────


def call_gemini(image_base64: str, mime_type: str):
    payload = {
        "contents": [
            {
                "parts": [
                    {"inline_data": {"mime_type": mime_type, "data": image_base64}},
                    {
                        "text": """You are a medical OCR system.

Extract medication details from this image.

Return STRICT JSON ONLY — no markdown, no backticks, no extra text:

{
  "name": "",
  "dosage": "",
  "frequency": "",
  "instructions": {
    "food_recommendation": "take_with_food | no_food | unknown",
    "notes": ""
  }
}

Rules:
- Read text directly from the bottle/box
- If multiple meds appear, pick the main one
- Be accurate, not safe-default "unknown"
- Return ONLY the JSON object, nothing else
"""
                    },
                ]
            }
        ]
    }

    try:
        response = requests.post(GEMINI_URL, json=payload, timeout=20)
        data = response.json()
        print("GEMINI RAW RESPONSE:", json.dumps(data, indent=2))

        if "error" in data:
            raise Exception(
                f"Gemini API error: {data['error'].get('message', data['error'])}"
            )

        candidate = data.get("candidates", [])[0]
        raw_text = candidate["content"]["parts"][0].get("text", "")
        print("GEMINI RAW TEXT:", raw_text)

        clean = re.sub(r"```(?:json)?|```", "", raw_text).strip()
        match = re.search(r"\{.*\}", clean, re.DOTALL)
        if match:
            return json.loads(match.group(0))

        raise Exception("No valid JSON found in Gemini output")

    except Exception as e:
        print("GEMINI ERROR:", e)
        return {
            "name": "unknown",
            "dosage": "unknown",
            "frequency": "unknown",
            "instructions": {"food_recommendation": "unknown", "notes": str(e)},
        }


# ─── Routes ───────────────────────────────────────────────────────────────────


@router.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    """
    Scan the image and return parsed data. Does not save to DB.

    Response includes:
      - parsed: the Gemini OCR result
      - duplicate: True if this med is already in the DB
      - existing_med: the current DB record if duplicate=True
      - already_taken: True if duplicate and last_taken is recent (within the dose window)
    """
    try:
        contents = await file.read()
        b64 = base64.b64encode(contents).decode("utf-8")
        mime = file.content_type or "image/jpeg"
        parsed = call_gemini(b64, mime)

        name = parsed.get("name", "unknown").lower()
        duplicate = False
        already_taken = False
        existing_med = None

        if name and name != "unknown":
            existing = get_med(name)
            if existing:
                duplicate = True
                existing_med = existing

                # "Already taken" = has last_taken AND it falls within the current dose window
                # i.e. last_taken is more recent than (now - frequency_hours)
                if existing.get("last_taken") and existing.get("frequency_hours"):
                    try:
                        from datetime import timedelta

                        last = datetime.fromisoformat(existing["last_taken"])
                        window_start = datetime.utcnow() - timedelta(
                            hours=existing["frequency_hours"]
                        )
                        already_taken = last >= window_start
                    except Exception:
                        pass
                elif existing.get("last_taken") and not existing.get("frequency_hours"):
                    # As-needed med that was taken at some point — flag it
                    already_taken = True

        return {
            "success": True,
            "parsed": parsed,
            "duplicate": duplicate,
            "already_taken": already_taken,
            "existing_med": existing_med,
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


class SaveRequest(BaseModel):
    parsed: dict
    recurring: bool = False


@router.post("/upload/save")
def save_med(
    body: SaveRequest,
    override: bool = Query(default=False),
    override_dup: bool = Query(default=False),
):
    """
    Save a scanned medication to the DB.
    recurring=True   -> persisted indefinitely, flagged when due
    recurring=False  -> temp: tracked until next_due passes, then auto-deleted
    override=True    -> skip interaction blocking (user acknowledged warning)
    override_dup=True -> allow re-adding a duplicate (resets its schedule)
    """
    parsed = body.parsed
    name = parsed.get("name", "unknown").lower()
    hours = frequency_to_hours(parsed.get("frequency"))

    # Duplicate check — bail unless the user explicitly said "add anyway"
    if not override_dup:
        existing = get_med(name)
        if existing:
            return {
                "success": False,
                "duplicate": True,
                "existing_med": existing,
                "message": f"{name} is already in your medication list.",
            }

    # Interaction check
    if not override:
        from app.state.interactions import check_interactions

        current_meds = get_all_meds()
        active = [m["name"] for m in current_meds if m["name"].lower() != name]
        interaction = check_interactions(name, active)
        if not interaction.get("safe", True):
            return {"success": False, "interaction_warning": interaction}
    else:
        interaction = {
            "safe": True,
            "interactions": [],
            "summary": "Override acknowledged by user.",
        }

    med = {
        "name": name,
        "dosage": parsed.get("dosage"),
        "frequency": parsed.get("frequency"),
        "instructions": parsed.get("instructions", {}),
        "frequency_hours": hours,
        "last_taken": None,
        "next_due": compute_next_due(hours),
        "check_in_required": False,
        "missed_checkin": False,
        "recurring": body.recurring,
        "added_at": datetime.utcnow().isoformat(),
    }

    upsert_med(med)
    return {"success": True, "med": med, "interaction": interaction}
