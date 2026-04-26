from fastapi import APIRouter, UploadFile, File
import requests
import json
from app.config import config
import base64
import re
from app.state.medstore import (
    med_store,
    frequency_to_hours,
    compute_next_due,
)

router = APIRouter()

GEMINI_API_KEY = config["Gemini"]["ApiKey"]


@router.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    try:
        contents = await file.read()

        base64_image = base64.b64encode(contents).decode("utf-8")

        parsed = call_gemini(base64_image, file.content_type)

        name = parsed.get("name", "unknown").lower()
        hours = frequency_to_hours(parsed.get("frequency"))
        med_store[name] = {
            "name": parsed.get("name"),
            "dosage": parsed.get("dosage"),
            "frequency": parsed.get("frequency"),
            "instructions": parsed.get("instructions", {}),
            "frequency_hours": hours,
            "last_taken": None,
            "next_due": compute_next_due(hours),
            "check_in_required": False,
        }

        return {"success": True, "parsed": parsed}

    except Exception as e:
        return {"success": False, "error": str(e)}


def call_gemini(image_base64: str, mime_type: str):
    url = f"https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"

    payload = {
        "contents": [
            {
                "parts": [
                    {"inline_data": {"mime_type": mime_type, "data": image_base64}},
                    {
                        "text": """
You are a medical OCR system.

Extract medication details from this image.

Return STRICT JSON ONLY:

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
"""
                    },
                ]
            }
        ]
    }

    try:
        response = requests.post(url, json=payload, timeout=20)
        data = response.json()

        # -----------------------------
        # DEBUG (VERY IMPORTANT)
        # -----------------------------
        print("GEMINI RAW RESPONSE:", json.dumps(data, indent=2))

        candidate = data.get("candidates", [])[0]
        content = candidate.get("content", {})
        parts = content.get("parts", [])

        if not parts:
            raise Exception("No parts returned from Gemini")

        raw_text = parts[0].get("text", "")

        print("GEMINI RAW TEXT:", raw_text)

        # -----------------------------
        # SAFE JSON EXTRACTION
        # -----------------------------
        match = re.search(r"\{.*\}", raw_text, re.DOTALL)

        if match:
            return json.loads(match.group(0))

        raise Exception("No valid JSON found in Gemini output")

    except Exception as e:
        return {
            "name": "unknown",
            "dosage": "unknown",
            "frequency": "unknown",
            "instructions": {"food_recommendation": "unknown", "notes": str(e)},
        }
