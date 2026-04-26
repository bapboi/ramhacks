from fastapi import APIRouter
from datetime import datetime

from app.state.medstore import med_store, compute_next_due

router = APIRouter()


@router.post("/checkin/{name}")
def check_in(name: str):
    med = med_store.get(name.lower())

    if not med:
        return {"error": "not found"}

    med["last_taken"] = datetime.utcnow()
    med["next_due"] = compute_next_due(med["frequency_hours"])
    med["check_in_required"] = False

    return {"success": True, "med": med}
