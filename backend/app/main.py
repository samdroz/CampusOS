from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from backend.app.core.config import settings
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

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    Base.metadata.create_all(bind=engine)
    
    # Auto-seed on first startup if completely empty
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
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins in local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

@app.get("/")
def root():
    return {
        "app": "CampusOS API",
        "status": "online",
        "docs": "/docs",
        "health": "/api/health",
    }
