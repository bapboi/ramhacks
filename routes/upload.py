from fastapi import APIRouter, UploadFile, File
from app.services.ai_parser import parse_medication

router = APIRouter()


@router.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    contents = await file.read()

    # TEMP: fake OCR for now
    text = "Amoxicillin 500mg take twice daily"

    parsed = parse_medication(text)

    return {"parsed": parsed}
