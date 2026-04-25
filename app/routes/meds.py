from fastapi import APIRouter

router = APIRouter()

med_list = []


@router.post("/meds")
def add_med(med: dict):
    med_list.append(med)
    return med


@router.get("/meds")
def get_meds():
    warnings = []

    names = [m["name"].lower() for m in med_list]

    # minimal deterministic safety rules (DO NOT overbuild)
    if "ibuprofen" in names and "aspirin" in names:
        warnings.append("⚠️ Ibuprofen + Aspirin increases bleeding risk")

    return {"meds": med_list, "warnings": warnings}
