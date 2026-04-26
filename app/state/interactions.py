"""
interactions.py — shared Gemini-powered drug interaction checker.

Imported by both app.routes.upload and app.routes.checkin to avoid
circular imports (routes must never import each other).
"""

import requests
import json
import re
from typing import List
from app.config import config

GEMINI_API_KEY = config["Gemini"]["ApiKey"]


GEMINI_MODEL = config.get("Gemini", {}).get("Model", "gemini-2.5-flash-lite")
GEMINI_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
)


def _gemini_post(payload: dict) -> str:
    resp = requests.post(GEMINI_URL, json=payload, timeout=25)
    data = resp.json()
    if "error" in data:
        raise Exception(
            f"Gemini API error: {data['error'].get('message', data['error'])}"
        )
    return data["candidates"][0]["content"]["parts"][0].get("text", "")


def check_interactions(new_med: str, active_meds: List[str]) -> dict:
    """
    Ask Gemini if new_med interacts with any of active_meds.

    Returns:
        {
          "safe": bool,
          "interactions": [{ "med": str, "severity": str, "description": str }],
          "summary": str
        }
    """
    if not active_meds:
        return {
            "safe": True,
            "interactions": [],
            "summary": "No active medications to check against.",
        }

    active_list = ", ".join(active_meds)
    try:
        raw = _gemini_post(
            {
                "contents": [
                    {
                        "parts": [
                            {
                                "text": f"""You are a clinical pharmacist performing a drug interaction safety check.

Resolve brand names to their generic ingredients before checking:
- Percocet = oxycodone + acetaminophen
- Norco, Vicodin = hydrocodone + acetaminophen
- Xanax = alprazolam (benzodiazepine)
- Klonopin = clonazepam (benzodiazepine)
- Ativan = lorazepam (benzodiazepine)
- OxyContin = oxycodone
- Tylenol, Panadol = acetaminophen

CRITICAL KNOWN DANGEROUS COMBINATIONS — always flag these as severe:
- Any opioid (oxycodone, hydrocodone, codeine, morphine, fentanyl, tramadol) + any benzodiazepine (alprazolam, clonazepam, lorazepam, diazepam) = SEVERE (combined CNS/respiratory depression, high overdose death risk, FDA black box warning)
- Any opioid + alcohol or other sedatives/CNS depressants = SEVERE
- Multiple acetaminophen-containing drugs simultaneously = SEVERE (liver toxicity)
- MAOIs + many antidepressants or opioids = SEVERE (serotonin syndrome risk)

New medication being added: {new_med}
Currently saved medications: {active_list}

Check every pair. Return STRICT JSON ONLY — no markdown, no backticks, no extra text:

{{
  "safe": true or false,
  "interactions": [
    {{
      "med": "<name of the conflicting saved medication>",
      "severity": "mild | moderate | severe",
      "description": "<one sentence: what the interaction is and why it is dangerous>"
    }}
  ],
  "summary": "<1-2 sentences: plain-English overall risk assessment>"
}}

Rules:
- Always resolve brand names to generics before checking
- "safe" MUST be false if ANY interaction is moderate or severe
- Do NOT omit known dangerous interactions — a false negative is far more dangerous than a false positive
- If truly no interactions exist, return safe: true with an empty interactions array
"""
                            }
                        ]
                    }
                ]
            }
        )
        clean = re.sub(r"```(?:json)?|```", "", raw).strip()
        m = re.search(r"\{.*\}", clean, re.DOTALL)
        if m:
            return json.loads(m.group(0))
    except Exception as e:
        print("check_interactions error:", e)

    # Fail closed — unknown = unsafe
    return {
        "safe": False,
        "interactions": [],
        "summary": "Interaction check could not be completed — treat as unsafe until verified.",
    }
