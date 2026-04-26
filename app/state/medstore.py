from datetime import datetime, timedelta

med_store = {}


def frequency_to_hours(freq: str):
    if not freq:
        return None

    freq = freq.lower()

    if "as needed" in freq:
        return None
    if "once" in freq:
        return 24
    if "twice" in freq:
        return 12
    if "three" in freq:
        return 8

    return 6


def compute_next_due(hours):
    if not hours:
        return None
    return (datetime.utcnow() + timedelta(hours=hours)).isoformat()


def update_flags():
    now = datetime.utcnow()

    for med in med_store.values():
        if med["next_due"]:
            next_due_dt = datetime.fromisoformat(med["next_due"])
            if now >= next_due_dt:
                med["check_in_required"] = True
