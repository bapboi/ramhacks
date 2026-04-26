"""
medstore.py — SQLite-backed medication store.

Schema:
  meds (
    name TEXT PRIMARY KEY,
    dosage TEXT,
    frequency TEXT,
    instructions TEXT,       -- JSON blob
    frequency_hours INTEGER,
    last_taken TEXT,         -- ISO datetime or NULL
    next_due TEXT,           -- ISO datetime or NULL
    check_in_required INTEGER DEFAULT 0,
    missed_checkin INTEGER DEFAULT 0,  -- 1 = overdue by a full extra cycle
    recurring INTEGER DEFAULT 0,       -- 1 = saved permanently, 0 = temp/expires
    added_at TEXT            -- ISO datetime
  )

Temp meds (recurring=0) are automatically removed once next_due has passed
AND they have been taken at least once (last_taken is not NULL).
If they were never taken and next_due has passed, they are also removed.
"""

import sqlite3
import json
from datetime import datetime, timedelta
from pathlib import Path

DB_PATH = Path(__file__).parent.parent.parent / "medsup.db"


def _conn():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with _conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS meds (
                name TEXT PRIMARY KEY,
                dosage TEXT,
                frequency TEXT,
                instructions TEXT,
                frequency_hours INTEGER,
                last_taken TEXT,
                next_due TEXT,
                check_in_required INTEGER DEFAULT 0,
                missed_checkin INTEGER DEFAULT 0,
                recurring INTEGER DEFAULT 0,
                added_at TEXT
            )
        """)
        # Add missed_checkin column to existing DBs that predate this schema
        try:
            conn.execute("ALTER TABLE meds ADD COLUMN missed_checkin INTEGER DEFAULT 0")
        except Exception:
            pass  # Column already exists
        conn.commit()


init_db()


# ─── helpers ──────────────────────────────────────────────────────────────────


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


def _row_to_dict(row):
    d = dict(row)
    if d.get("instructions"):
        try:
            d["instructions"] = json.loads(d["instructions"])
        except Exception:
            d["instructions"] = {}
    d["check_in_required"] = bool(d.get("check_in_required", 0))
    d["missed_checkin"] = bool(d.get("missed_checkin", 0))
    d["recurring"] = bool(d.get("recurring", 0))
    return d


# ─── public API ───────────────────────────────────────────────────────────────


def upsert_med(med: dict):
    """Insert or replace a medication record."""
    with _conn() as conn:
        conn.execute(
            """
            INSERT INTO meds
                (name, dosage, frequency, instructions, frequency_hours,
                 last_taken, next_due, check_in_required, missed_checkin, recurring, added_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(name) DO UPDATE SET
                dosage=excluded.dosage,
                frequency=excluded.frequency,
                instructions=excluded.instructions,
                frequency_hours=excluded.frequency_hours,
                last_taken=excluded.last_taken,
                next_due=excluded.next_due,
                check_in_required=excluded.check_in_required,
                missed_checkin=excluded.missed_checkin,
                recurring=excluded.recurring
        """,
            (
                med["name"].lower(),
                med.get("dosage"),
                med.get("frequency"),
                json.dumps(med.get("instructions", {})),
                med.get("frequency_hours"),
                med.get("last_taken"),
                med.get("next_due"),
                1 if med.get("check_in_required") else 0,
                1 if med.get("missed_checkin") else 0,
                1 if med.get("recurring") else 0,
                med.get("added_at", datetime.utcnow().isoformat()),
            ),
        )
        conn.commit()


def get_med(name: str):
    with _conn() as conn:
        row = conn.execute(
            "SELECT * FROM meds WHERE name = ?", (name.lower(),)
        ).fetchone()
        return _row_to_dict(row) if row else None


def get_all_meds():
    with _conn() as conn:
        rows = conn.execute("SELECT * FROM meds ORDER BY added_at").fetchall()
        return [_row_to_dict(r) for r in rows]


def update_med_fields(name: str, **fields):
    if not fields:
        return
    set_clause = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [name.lower()]
    with _conn() as conn:
        conn.execute(f"UPDATE meds SET {set_clause} WHERE name = ?", values)
        conn.commit()


def delete_med(name: str):
    with _conn() as conn:
        conn.execute("DELETE FROM meds WHERE name = ?", (name.lower(),))
        conn.commit()


def set_recurring(name: str, recurring: bool):
    update_med_fields(name, recurring=1 if recurring else 0)


def update_flags():
    """
    For each tracked med:
    - check_in_required = True when next_due has passed
    - missed_checkin    = True when overdue by a full extra frequency cycle
                         (e.g. you were supposed to take it 8h ago and still haven't)
    - Delete expired one-time meds (recurring=0 and next_due has passed)
    """
    now = datetime.utcnow()
    all_meds = get_all_meds()

    for med in all_meds:
        key = med["name"]

        if not med["next_due"]:
            continue

        try:
            next_due_dt = datetime.fromisoformat(med["next_due"])
        except ValueError:
            continue

        overdue = now >= next_due_dt

        if overdue:
            if not med["recurring"]:
                # One-time med expired — remove it
                delete_med(key)
                continue

            # Recurring — flag as due
            hours = med.get("frequency_hours") or 24
            # Missed = overdue by more than one full cycle past next_due
            missed = (now - next_due_dt) >= timedelta(hours=hours)
            update_med_fields(
                key,
                check_in_required=1,
                missed_checkin=1 if missed else 0,
            )
        else:
            # Not overdue — clear any stale missed flag
            if med.get("missed_checkin"):
                update_med_fields(key, missed_checkin=0)
