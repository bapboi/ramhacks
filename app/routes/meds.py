from fastapi import APIRouter

router = APIRouter()

med_list = []


@router.post("/meds")
def add_med(med: dict):
    med_list.append(med)
    return {"message": "added", "data": med}


@router.get("/meds")
def get_meds():
    return med_list
