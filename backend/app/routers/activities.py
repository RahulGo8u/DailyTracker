from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Response
from pymongo.errors import DuplicateKeyError

from app.db import get_db
from app.deps import get_current_user
from app.schemas import StartActivity
from app.util import (
    category_names,
    now_utc,
    parse_id,
    public_activity,
    require_category,
    today_bounds,
)

router = APIRouter(prefix="/api/activities", tags=["activities"])


def _complete_running(db, user_id: ObjectId, moment) -> dict | None:
    running = db.activities.find_one({"user_id": user_id, "status": "running"})
    if not running:
        return None
    duration = max(0, int((moment - running["start_time"]).total_seconds()))
    result = db.activities.update_one(
        {"_id": running["_id"], "status": "running"},
        {
            "$set": {
                "end_time": moment,
                "duration_seconds": duration,
                "status": "completed",
            },
            "$unset": {"singleton": ""},
        },
    )
    if result.modified_count == 0:
        return None
    running["end_time"] = moment
    running["duration_seconds"] = duration
    running["status"] = "completed"
    running.pop("singleton", None)
    return running


def _with_names(db, user_id: ObjectId, activities: list[dict]) -> list[dict]:
    names = category_names(db, user_id, [item["category_id"] for item in activities])
    return [public_activity(item, names) for item in activities]


def _insert_running(db, user_id: ObjectId, category_id: ObjectId, name: str, moment) -> dict:
    document = {
        "user_id": user_id,
        "category_id": category_id,
        "name": name,
        "start_time": moment,
        "end_time": None,
        "duration_seconds": None,
        "status": "running",
        "created_at": moment,
        "singleton": "active",
    }
    try:
        db.activities.insert_one(document)
        return document
    except DuplicateKeyError:
        _complete_running(db, user_id, now_utc())
        document["start_time"] = now_utc()
        document["created_at"] = document["start_time"]
        document.pop("_id", None)
        try:
            db.activities.insert_one(document)
        except DuplicateKeyError:
            raise HTTPException(status_code=409, detail="An activity is already running") from None
        return document


@router.get("/current")
def current_activity(user: dict = Depends(get_current_user)):
    db = get_db()
    running = db.activities.find_one({"user_id": user["_id"], "status": "running"})
    if not running:
        return None
    return _with_names(db, user["_id"], [running])[0]


@router.post("/start", status_code=201)
def start_activity(body: StartActivity, user: dict = Depends(get_current_user)):
    db = get_db()
    category = require_category(db, user["_id"], body.category_id)
    moment = now_utc()
    _complete_running(db, user["_id"], moment)
    created = _insert_running(db, user["_id"], category["_id"], body.name, moment)
    return _with_names(db, user["_id"], [created])[0]


@router.post("/stop")
def stop_activity(user: dict = Depends(get_current_user)):
    db = get_db()
    stopped = _complete_running(db, user["_id"], now_utc())
    if not stopped:
        raise HTTPException(status_code=404, detail="No activity is running")
    return _with_names(db, user["_id"], [stopped])[0]


@router.get("")
def list_today(user: dict = Depends(get_current_user)):
    db = get_db()
    start, end, _day = today_bounds()
    items = list(
        db.activities.find(
            {"user_id": user["_id"], "start_time": {"$gte": start, "$lt": end}}
        ).sort("start_time", 1)
    )
    return _with_names(db, user["_id"], items)


@router.delete("/{activity_id}", status_code=204)
def delete_activity(activity_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    result = db.activities.delete_one({"_id": parse_id(activity_id), "user_id": user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Activity not found")
    return Response(status_code=204)
