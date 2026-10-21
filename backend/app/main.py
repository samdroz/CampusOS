from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
from typing import Dict, Any, Optional
from datetime import datetime
import json
import os
import sys
from pathlib import Path

from backend.app.core.config import settings, get_app_data_dir
from backend.app.core.database import Base, engine, SessionLocal
from backend.app.models.models import Subject, Setting
from backend.app.services.backup_service import seed_demo_data

from backend.app.api.health import router as health_router
from backend.app.api.subjects import router as subjects_router
from backend.app.api.sessions import router as sessions_router
from backend.app.api.assignments import router as assignments_router
from backend.app.api.exams import router as exams_router
from backend.app.api.attendance import router as attendance_router
from backend.app.api.notes import router as notes_router
from backend.app.api.settings import router as settings_router
from backend.app.api.dashboard import router as dashboard_router
from backend.app.api.search import router as search_router
from backend.app.api.backup import router as backup_router
from backend.app.api.profile import router as profile_router

BUILD_ID = "2026.10.19-BUILD-V4-ONBOARDING-FIX"

def write_onboarding_debug_log(stage: str, message: str = "", details: Any = None):
    """Appends structured diagnostic logs to %APPDATA%\\CampusOS\\logs\\onboarding-debug.log."""
    try:
        app_data = get_app_data_dir()
        log_dir = app_data / "logs"
        log_dir.mkdir(parents=True, exist_ok=True)
        log_file = log_dir / "onboarding-debug.log"

        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
        details_str = f" | {json.dumps(details, default=str)}" if details is not None else ""
        msg_str = f" - {message}" if message else ""
        entry = f"[{timestamp}] [{BUILD_ID}] [{stage}]{msg_str}{details_str}\n"

        with open(log_file, "a", encoding="utf-8") as f:
            f.write(entry)
            f.flush()
    except Exception as e:
        print(f"[CampusOS Diagnostic Log Error] {e}", file=sys.stderr)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    Base.metadata.create_all(bind=engine)

    is_frozen = getattr(sys, "frozen", False)
    is_desktop = is_frozen or os.environ.get("CAMPUSOS_DESKTOP") == "1"

    # Stage 1: Diagnostic backend startup log
    frontend_dir = resolve_frontend_dist()
    write_onboarding_debug_log(
        "BACKEND_LIFESPAN_STARTUP",
        "FastAPI lifespan initialization complete",
        {
            "build_id": BUILD_ID,
            "pid": os.getpid(),
            "sys_executable": sys.executable,
            "cwd": str(Path.cwd()),
            "is_frozen": is_frozen,
            "is_desktop": is_desktop,
            "sys_meipass": getattr(sys, "_MEIPASS", None),
            "database_url": settings.DATABASE_URL,
            "frontend_dist": str(frontend_dir) if frontend_dir else None,
            "db_exists": (get_app_data_dir() / "campusos.db").exists() if is_desktop else None,
        }
    )

    # Auto-seed only in explicit dev mode when requested, never on production desktop launch
    if not is_desktop and os.environ.get("CAMPUSOS_AUTO_SEED", "0") == "1":
        db = SessionLocal()
        try:
            subject_count = db.query(Subject).count()
            if subject_count == 0:
                print("[CampusOS] Clean database detected. Seeding realistic starter data...")
                seed_demo_data(db)
                print("[CampusOS] Starter data seeded successfully.")
        except Exception as e:
            print(f"[CampusOS] Warning during startup initialization: {e}")
        finally:
            db.close()

    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="CampusOS — High-Performance Academic Productivity Platform",
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs" if settings.DOCS_ENABLED else None,
    redoc_url="/redoc" if settings.DOCS_ENABLED else None,
    openapi_url="/openapi.json" if settings.DOCS_ENABLED else None,
)

from backend.app.core.security import CampusOSCORSMiddleware

# CORS configuration - dynamically enforced via CampusOS origin policy
app.add_middleware(
    CampusOSCORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Diagnostic Logging Endpoint
class DebugLogPayload(BaseModel):
    stage: str
    message: str = ""
    details: Optional[Dict[str, Any]] = None

@app.post("/api/debug/log")
def log_debug_event(payload: DebugLogPayload):
    write_onboarding_debug_log(payload.stage, payload.message, payload.details)
    return {"status": "logged", "build_id": BUILD_ID}

# Include API Routers under /api
api_prefix = settings.API_V1_STR
app.include_router(health_router, prefix=api_prefix)
app.include_router(subjects_router, prefix=api_prefix)
app.include_router(sessions_router, prefix=api_prefix)
app.include_router(assignments_router, prefix=api_prefix)
app.include_router(exams_router, prefix=api_prefix)
app.include_router(attendance_router, prefix=api_prefix)
app.include_router(notes_router, prefix=api_prefix)
app.include_router(settings_router, prefix=api_prefix)
app.include_router(dashboard_router, prefix=api_prefix)
app.include_router(search_router, prefix=api_prefix)
app.include_router(backup_router, prefix=api_prefix)
app.include_router(profile_router, prefix=api_prefix)

# Mount static frontend production build if available
from fastapi.staticfiles import StaticFiles

def resolve_frontend_dist() -> Path | None:
    cwd_dist = Path.cwd() / "frontend" / "dist"
    if cwd_dist.exists() and (cwd_dist / "index.html").exists():
        return cwd_dist

    source_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
    if source_dist.exists() and (source_dist / "index.html").exists():
        return source_dist

    exe_dist = Path(sys.executable).parent / "frontend" / "dist"
    if exe_dist.exists() and (exe_dist / "index.html").exists():
        return exe_dist

    if hasattr(sys, "_MEIPASS"):
        mei_dist = Path(sys._MEIPASS) / "frontend" / "dist"
        if mei_dist.exists() and (mei_dist / "index.html").exists():
            return mei_dist

    return None

frontend_dist = resolve_frontend_dist()
if frontend_dist:
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="static_frontend")
else:
    @app.get("/")
    def root():
        return {
            "app": "CampusOS API",
            "status": "online",
            "health": "/api/health",
            "build_id": BUILD_ID,
        }
