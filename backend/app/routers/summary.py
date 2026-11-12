from collections import defaultdict
from datetime import timedelta

from fastapi import APIRouter, Depends

from app.db import get_db
from app.deps import get_current_user
from app.util import (
    IST,
    category_names,
    effective_seconds,
    iso,
    ist_day_key,
    now_utc,
    public_activity,
    today_bounds,
    week_bounds,
)

router = APIRouter(prefix="/api/summary", tags=["summary"])

WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def _load(db, user_id, start, end) -> list[dict]:
    return list(
        db.activities.find(
            {"user_id": user_id, "start_time": {"$gte": start, "$lt": end}}
        ).sort("start_time", 1)
    )


def _category_rows(activities: list[dict], names: dict, moment) -> list[dict]:
    totals: dict = defaultdict(int)
    for activity in activities:
        totals[activity["category_id"]] += effective_seconds(activity, moment)
    rows = [
        {
            "category_id": str(category_id),
            "category_name": names.get(category_id, "Unknown"),
            "seconds": seconds,
        }
        for category_id, seconds in totals.items()
        if seconds > 0
    ]
    rows.sort(key=lambda row: (-row["seconds"], row["category_name"]))
    return rows


def _running(activities: list[dict], names: dict) -> dict | None:
    for activity in activities:
        if activity.get("status") == "running":
            return {
                "start_time": iso(activity["start_time"]),
                "category_id": str(activity["category_id"]),
                "category_name": names.get(activity["category_id"], "Unknown"),
                "day": ist_day_key(activity["start_time"]),
            }
    return None


@router.get("/daily")
def daily_summary(user: dict = Depends(get_current_user)):
    db = get_db()
    moment = now_utc()
    start, end, day = today_bounds(moment)
    activities = _load(db, user["_id"], start, end)
    names = category_names(db, user["_id"], [item["category_id"] for item in activities])
    rows = _category_rows(activities, names, moment)
    return {
        "date": day,
        "total_seconds": sum(row["seconds"] for row in rows),
        "activity_count": len(activities),
        "by_category": rows,
        "activities": [public_activity(item, names) for item in activities],
        "running": _running(activities, names),
        "generated_at": iso(moment),
    }


@router.get("/weekly")
def weekly_summary(user: dict = Depends(get_current_user)):
    db = get_db()
    moment = now_utc()
    start, end = week_bounds(moment)
    activities = _load(db, user["_id"], start, end)
    names = category_names(db, user["_id"], [item["category_id"] for item in activities])
    rows = _category_rows(activities, names, moment)
    day_totals = defaultdict(int)
    for activity in activities:
        day_totals[ist_day_key(activity["start_time"])] += effective_seconds(activity, moment)

    days = []
    local_start = start.astimezone(IST)
    for offset in range(7):
        day = local_start + timedelta(days=offset)
        key = day.strftime("%Y-%m-%d")
        days.append(
            {
                "date": key,
                "label": f"{WEEKDAY_LABELS[offset]} {day.day}",
                "seconds": day_totals.get(key, 0),
            }
        )
    return {
        "week_start": days[0]["date"],
        "week_end": days[-1]["date"],
        "total_seconds": sum(row["seconds"] for row in rows),
        "by_category": rows,
        "days": days,
        "running": _running(activities, names),
        "generated_at": iso(moment),
    }
