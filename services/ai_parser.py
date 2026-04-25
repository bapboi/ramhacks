from google import genai
from app.config import config
import json

client = genai.Client(api_key=config["Gemini"]["ApiKey"])


def parse_medication(text):
    prompt = f"""
    Extract medication info as JSON:
    - name
    - dosage
    - frequency

    Text:
    {text}
    """

    response = client.models.generate_content(model="gemini-1.5-flash", contents=prompt)

    try:
        return json.loads(response.text)
    except:
        return {"name": "Unknown", "dosage": "Unknown", "frequency": "Unknown"}
