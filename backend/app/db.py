from datetime import timezone

from pymongo import MongoClient
from pymongo.database import Database

from app.config import settings

_client: MongoClient | None = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(
            settings.mongodb_uri,
            tz_aware=True,
            tzinfo=timezone.utc,
            serverSelectionTimeoutMS=8000,
        )
    return _client


def get_db() -> Database:
    return get_client()[settings.mongodb_db_name]


def ensure_indexes(db: Database) -> None:
    db.users.create_index("google_sub", unique=True)
    db.sessions.create_index("expires_at", expireAfterSeconds=0)
    db.categories.create_index([("user_id", 1), ("name_key", 1)], unique=True)
    # One running timer per user. The field exists only while status is running.
    db.activities.create_index(
        [("user_id", 1), ("singleton", 1)],
        unique=True,
        partialFilterExpression={"singleton": "active"},
    )
    db.activities.create_index([("user_id", 1), ("start_time", 1)])


def close_client() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None
