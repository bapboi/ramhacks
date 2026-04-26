"""
safety.py — thin shim kept for backward compatibility.

All real interaction logic lives in app.state.interactions.
"""

from app.state.interactions import check_interactions


def check_med_interactions(new_med_name: str, current_meds: list) -> dict:
    active = [
        m["name"] for m in current_meds if m["name"].lower() != new_med_name.lower()
    ]
    return check_interactions(new_med_name, active)
