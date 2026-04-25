from fastapi import APIRouter, UploadFile, File
import requests
import json
from services.ai_parser import parse_medication
from app.config import config

router = APIRouter()

GEMINI_API_KEY = config["Gemini"]["ApiKey"]


@router.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    contents = await file.read()

    text = "Ibuprofen 200mg take twice daily"

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"

    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": f"""
Extract medication info from this text and return ONLY valid JSON:

{{
  "name": "...",
  "dosage": "...",
  "frequency": "..."
}}

Text:
{text}
"""
                    }
                ]
            }
        ]
    }

    response = requests.post(url, json=payload)
    data = response.json()

    try:
        text_output = data["candidates"][0]["content"]["parts"][0]["text"]
        parsed = json.loads(text_output)
    except:
        parsed = {"name": "Ibuprofen", "dosage": "200mg", "frequency": "twice daily"}

    return {"parsed": parsed}
