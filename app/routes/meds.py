from fastapi import APIRouter
from app.state.medstore import med_store, update_flags

router = APIRouter()


@router.get("/meds")
def get_meds():
    update_flags()

    return {"meds": list(med_store.values())}
