import secrets
from datetime import timedelta

from fastapi import APIRouter, Cookie, Depends, HTTPException
from pymongo.errors import BulkWriteError, DuplicateKeyError
from fastapi.responses import JSONResponse
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from app.config import settings
from app.db import get_db
from app.deps import get_current_user
from app.schemas import GoogleLogin
from app.util import now_utc, public_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

DEFAULT_CATEGORIES = [
    "Office Work",
    "Learning",
    "Personal Work",
    "Health",
    "Family",
    "Entertainment",
    "Other",
]


def seed_categories(db, user_id) -> None:
    if db.categories.count_documents({"user_id": user_id}, limit=1):
        return
    moment = now_utc()
    docs = []
    for index, name in enumerate(DEFAULT_CATEGORIES):
        docs.append(
            {
                "user_id": user_id,
                "name": name,
                "name_key": name.casefold(),
                "created_at": moment + timedelta(milliseconds=index),
            }
        )
    try:
        db.categories.insert_many(docs, ordered=False)
    except (DuplicateKeyError, BulkWriteError):
        return


@router.post("/google")
def login_with_google(body: GoogleLogin):
    try:
        info = id_token.verify_oauth2_token(
            body.credential,
            google_requests.Request(),
            settings.google_client_id,
        )
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google sign-in") from None

    if info.get("email_verified") not in (True, "true"):
        raise HTTPException(status_code=401, detail="Google email is not verified")

    email = (info.get("email") or "").strip().lower()
    subject = info.get("sub")
    if not email or not subject:
        raise HTTPException(status_code=401, detail="Google account did not include an email")

    db = get_db()
    moment = now_utc()
    db.users.update_one(
        {"google_sub": subject},
        {
            "$set": {
                "email": email,
                "name": info.get("name") or email,
                "picture": info.get("picture"),
                "last_login_at": moment,
            },
            "$setOnInsert": {"created_at": moment},
        },
        upsert=True,
    )
    user = db.users.find_one({"google_sub": subject})
    seed_categories(db, user["_id"])

    token = secrets.token_urlsafe(32)
    db.sessions.insert_one(
        {
            "_id": token,
            "user_id": user["_id"],
            "created_at": moment,
            "expires_at": moment + timedelta(days=settings.session_days),
        }
    )
    response = JSONResponse(public_user(user))
    response.set_cookie(
        key="session",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=settings.session_days * 24 * 60 * 60,
        path="/",
    )
    return response


@router.get("/me")
def me(user: dict = Depends(get_current_user)):
    return public_user(user)


@router.post("/logout")
def logout(session: str | None = Cookie(default=None)):
    if session:
        get_db().sessions.delete_one({"_id": session})
    response = JSONResponse({"ok": True})
    response.delete_cookie("session", path="/", samesite="lax")
    return response
