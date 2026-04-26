from fastapi import APIRouter
from app.state.medstore import get_all_meds, update_flags, set_recurring, delete_med

router = APIRouter()


@router.get("/meds")
def get_meds():
    update_flags()
    return {"meds": get_all_meds()}


@router.patch("/meds/{name}/recurring")
def toggle_recurring(name: str, recurring: bool):
    set_recurring(name, recurring)
    return {"success": True}


@router.delete("/meds/{name}")
def remove_med(name: str):
    delete_med(name)
    return {"success": True}
