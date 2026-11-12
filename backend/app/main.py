from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from pymongo.errors import PyMongoError
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.db import close_client, ensure_indexes, get_client, get_db
from app.routers import activities, auth, categories, summary


@asynccontextmanager
async def lifespan(_app: FastAPI):
    client = get_client()
    client.admin.command("ping")
    ensure_indexes(get_db())
    yield
    close_client()


app = FastAPI(title="Daily Tracker", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth.router)
app.include_router(categories.router)
app.include_router(activities.router)
app.include_router(summary.router)


@app.exception_handler(RequestValidationError)
async def validation_error(_request: Request, exc: RequestValidationError):
    parts = []
    for error in exc.errors():
        loc = [str(item) for item in error.get("loc", []) if item != "body"]
        message = error.get("msg", "Invalid value")
        parts.append(f"{'.'.join(loc)}: {message}" if loc else message)
    return JSONResponse(status_code=422, content={"detail": "; ".join(parts) or "Invalid request"})


@app.exception_handler(PyMongoError)
async def mongo_error(_request: Request, _exc: PyMongoError):
    return JSONResponse(status_code=503, content={"detail": "Database is unavailable"})


@app.get("/api/health")
def health():
    get_client().admin.command("ping")
    return {"ok": True}
