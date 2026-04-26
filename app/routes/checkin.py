"""
checkin.py

POST /checkin/{name}          — simple check-in (no photo)
POST /checkin/{name}/verify   — photo check-in with Gemini verification
POST /interactions            — check if a new med conflicts with active meds
"""

from fastapi import APIRouter, UploadFile, File
from pydantic import BaseModel
from datetime import datetime
import requests
import json
import base64
import re
from typing import List

from app.state.medstore import (
    get_med,
    get_all_meds,
    update_med_fields,
    compute_next_due,
)
from app.config import config
from app.state.interactions import check_interactions, _gemini_post

router = APIRouter()
GEMINI_API_KEY = config["Gemini"]["ApiKey"]


# ─── helpers ──────────────────────────────────────────────────────────────────


def verify_med_in_photo(image_b64: str, mime_type: str, expected_name: str) -> dict:
    raw = _gemini_post(
        {
            "contents": [
                {
                    "parts": [
                        {"inline_data": {"mime_type": mime_type, "data": image_b64}},
                        {
                            "text": f"""You are a medication verification system.

The user claims they are holding: "{expected_name}"

Look at the image and determine whether it shows that medication.

Return STRICT JSON ONLY:

{{
  "match": true or false,
  "detected": "<name you see on the label, or 'unclear'>",
  "confidence": "high | medium | low"
}}

Rules:
- match is true only if the label matches "{expected_name}" (brand/generic equivalents are OK)
- If you cannot read the label clearly, set match to false and detected to "unclear"
"""
                        },
                    ]
                }
            ]
        }
    )
    try:
        m = re.search(r"\{.*\}", raw, re.DOTALL)
        return (
            json.loads(m.group(0))
            if m
            else {"match": False, "detected": "parse_error", "confidence": "low"}
        )
    except Exception:
        return {"match": False, "detected": "parse_error", "confidence": "low"}


# ─── Routes ───────────────────────────────────────────────────────────────────


@router.post("/checkin/{name}")
def check_in(name: str):
    """Simple check-in with no photo."""
    med = get_med(name)
    if not med:
        return {"error": "not found"}

    now = datetime.utcnow().isoformat()
    next_due = compute_next_due(med["frequency_hours"])

    update_med_fields(
        med["name"],
        last_taken=now,
        next_due=next_due,
        check_in_required=0,
    )
    return {"success": True}


@router.post("/checkin/{name}/verify")
async def check_in_with_photo(name: str, file: UploadFile = File(...)):
    """Photo check-in — Gemini verifies the bottle before marking taken."""
    med = get_med(name)
    if not med:
        return {"success": False, "error": "Medication not found"}

    contents = await file.read()
    result = verify_med_in_photo(
        base64.b64encode(contents).decode("utf-8"),
        file.content_type,
        med["name"],
    )

    if not result.get("match"):
        return {
            "success": False,
            "verified": False,
            "detected": result.get("detected", "unknown"),
            "confidence": result.get("confidence", "low"),
            "message": f"Photo does not appear to show {med['name']}. Detected: {result.get('detected', 'unclear')}",
        }

    now = datetime.utcnow().isoformat()
    next_due = compute_next_due(med["frequency_hours"])
    update_med_fields(
        med["name"],
        last_taken=now,
        next_due=next_due,
        check_in_required=0,
    )

    return {
        "success": True,
        "verified": True,
        "detected": result.get("detected"),
        "confidence": result.get("confidence"),
    }


class InteractionRequest(BaseModel):
    new_med: str


@router.post("/interactions")
def check_med_interactions(body: InteractionRequest):
    """
    Check if new_med interacts with any currently saved meds.
    All saved meds are considered active — not just ones that have been checked in.
    """
    all_meds = get_all_meds()
    active = [m["name"] for m in all_meds if m["name"].lower() != body.new_med.lower()]
    result = check_interactions(body.new_med, active)
    return result
