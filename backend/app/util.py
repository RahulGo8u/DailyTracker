from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from bson import ObjectId
from fastapi import HTTPException

IST = ZoneInfo("Asia/Kolkata")


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def iso(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def ist_day_key(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(IST).strftime("%Y-%m-%d")


def today_bounds(moment: datetime | None = None) -> tuple[datetime, datetime, str]:
    moment = moment or now_utc()
    local = moment.astimezone(IST)
    start_local = local.replace(hour=0, minute=0, second=0, microsecond=0)
    end_local = start_local + timedelta(days=1)
    return start_local.astimezone(timezone.utc), end_local.astimezone(timezone.utc), start_local.strftime("%Y-%m-%d")


def week_bounds(moment: datetime | None = None) -> tuple[datetime, datetime]:
    moment = moment or now_utc()
    local = moment.astimezone(IST)
    start_local = local.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=local.weekday())
    end_local = start_local + timedelta(days=7)
    return start_local.astimezone(timezone.utc), end_local.astimezone(timezone.utc)


def parse_id(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(status_code=400, detail="Invalid id")
    return ObjectId(value)


def require_category(db, user_id: ObjectId, category_id: str) -> dict:
    oid = parse_id(category_id)
    category = db.categories.find_one({"_id": oid, "user_id": user_id})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


def category_names(db, user_id: ObjectId, category_ids: list[ObjectId]) -> dict[ObjectId, str]:
    if not category_ids:
        return {}
    found = db.categories.find({"_id": {"$in": category_ids}, "user_id": user_id})
    return {item["_id"]: item["name"] for item in found}


def public_user(user: dict) -> dict:
    return {
        "id": str(user["_id"]),
        "email": user.get("email") or "",
        "name": user.get("name") or user.get("email") or "Signed in",
        "picture": user.get("picture"),
    }


def public_category(category: dict) -> dict:
    return {"id": str(category["_id"]), "name": category["name"]}


def public_activity(activity: dict, names: dict[ObjectId, str]) -> dict:
    category_id = activity["category_id"]
    return {
        "id": str(activity["_id"]),
        "category_id": str(category_id),
        "category_name": names.get(category_id, "Unknown"),
        "name": activity["name"],
        "start_time": iso(activity.get("start_time")),
        "end_time": iso(activity.get("end_time")),
        "duration_seconds": activity.get("duration_seconds"),
        "status": activity.get("status"),
        "created_at": iso(activity.get("created_at")),
    }


def effective_seconds(activity: dict, moment: datetime) -> int:
    if activity.get("status") == "running" or activity.get("end_time") is None:
        start = activity["start_time"]
        return max(0, int((moment - start).total_seconds()))
    stored = activity.get("duration_seconds")
    if stored is not None:
        return max(0, int(stored))
    return max(0, int((activity["end_time"] - activity["start_time"]).total_seconds()))
