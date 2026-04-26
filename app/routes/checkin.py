from fastapi import APIRouter, UploadFile, File
from datetime import datetime
import requests
import json
import base64
import re

from app.state.medstore import med_store, compute_next_due
from app.config import config

router = APIRouter()

GEMINI_API_KEY = config["Gemini"]["ApiKey"]


def verify_med_in_photo(image_base64: str, mime_type: str, expected_name: str) -> dict:
    """
    Ask Gemini whether the photo shows the expected medication bottle.
    Returns {"match": bool, "detected": str, "confidence": str}
    """
    url = (
        f"https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash"
        f":generateContent?key={GEMINI_API_KEY}"
    )

    payload = {
        "contents": [
            {
                "parts": [
                    {"inline_data": {"mime_type": mime_type, "data": image_base64}},
                    {
                        "text": f"""You are a medication verification system.

The user claims they are holding: "{expected_name}"

Look at the image and determine whether it shows that medication.

Return STRICT JSON ONLY:

{{
  "match": true or false,
  "detected": "<name you actually see on the bottle/package, or 'unclear'>",
  "confidence": "high | medium | low"
}}

Rules:
- match is true only if the detected medication name matches or is clearly the same drug as "{expected_name}"
- Be lenient with brand vs generic names (e.g. Tylenol = acetaminophen)
- If you cannot read the label, set match to false and detected to "unclear"
"""
                    },
                ]
            }
        ]
    }

    try:
        response = requests.post(url, json=payload, timeout=20)
        data = response.json()

        candidate = data.get("candidates", [])[0]
        raw_text = candidate["content"]["parts"][0].get("text", "")

        match = re.search(r"\{.*\}", raw_text, re.DOTALL)
        if match:
            return json.loads(match.group(0))

        return {"match": False, "detected": "parse_error", "confidence": "low"}

    except Exception as e:
        return {"match": False, "detected": f"error: {e}", "confidence": "low"}


@router.post("/checkin/{name}")
def check_in(name: str):
    """Simple timestamp-only check-in (no photo required)."""
    med = med_store.get(name.lower())

    if not med:
        return {"error": "not found"}

    med["last_taken"] = datetime.utcnow().isoformat()
    med["next_due"] = (
        compute_next_due(med["frequency_hours"]).isoformat()
        if med["frequency_hours"]
        else None
    )
    med["check_in_required"] = False

    return {"success": True, "med": med}


@router.post("/checkin/{name}/verify")
async def check_in_with_photo(name: str, file: UploadFile = File(...)):
    """
    Photo check-in: verifies the photo matches the medication before marking taken.
    """
    med = med_store.get(name.lower())

    if not med:
        return {"success": False, "error": "Medication not found"}

    contents = await file.read()
    image_b64 = base64.b64encode(contents).decode("utf-8")

    result = verify_med_in_photo(image_b64, file.content_type, med["name"])

    if not result.get("match"):
        return {
            "success": False,
            "verified": False,
            "detected": result.get("detected", "unknown"),
            "confidence": result.get("confidence", "low"),
            "message": f"Photo does not appear to show {med['name']}. Detected: {result.get('detected', 'unclear')}",
        }

    med["last_taken"] = datetime.utcnow().isoformat()
    med["next_due"] = (
        compute_next_due(med["frequency_hours"]).isoformat()
        if med["frequency_hours"]
        else None
    )
    med["check_in_required"] = False

    return {
        "success": True,
        "verified": True,
        "detected": result.get("detected"),
        "confidence": result.get("confidence"),
        "med": med,
    }
