from fastapi import APIRouter, Depends, HTTPException
from pymongo.errors import DuplicateKeyError

from app.db import get_db
from app.deps import get_current_user
from app.schemas import CategoryBody
from app.util import now_utc, parse_id, public_category

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("")
def list_categories(user: dict = Depends(get_current_user)):
    db = get_db()
    items = db.categories.find({"user_id": user["_id"]}).sort("created_at", 1)
    return [public_category(item) for item in items]


@router.post("", status_code=201)
def create_category(body: CategoryBody, user: dict = Depends(get_current_user)):
    db = get_db()
    document = {
        "user_id": user["_id"],
        "name": body.name,
        "name_key": body.name.casefold(),
        "created_at": now_utc(),
    }
    try:
        db.categories.insert_one(document)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="You already have that category") from None
    return public_category(document)


@router.patch("/{category_id}")
def rename_category(category_id: str, body: CategoryBody, user: dict = Depends(get_current_user)):
    db = get_db()
    oid = parse_id(category_id)
    existing = db.categories.find_one({"_id": oid, "user_id": user["_id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")
    try:
        db.categories.update_one(
            {"_id": oid, "user_id": user["_id"]},
            {"$set": {"name": body.name, "name_key": body.name.casefold()}},
        )
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="You already have that category") from None
    existing["name"] = body.name
    return public_category(existing)
