from fastapi import Cookie, HTTPException

from app.db import get_db
from app.util import now_utc


def get_current_user(session: str | None = Cookie(default=None)) -> dict:
    if not session:
        raise HTTPException(status_code=401, detail="Not signed in")
    db = get_db()
    found = db.sessions.find_one({"_id": session})
    if not found or found["expires_at"] <= now_utc():
        if found:
            db.sessions.delete_one({"_id": session})
        raise HTTPException(status_code=401, detail="Not signed in")
    user = db.users.find_one({"_id": found["user_id"]})
    if not user:
        raise HTTPException(status_code=401, detail="Not signed in")
    return user
