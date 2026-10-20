from fastapi import APIRouter
from datetime import datetime
from backend.app.core.config import settings

router = APIRouter(tags=["Health"])

@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "CampusOS API",
        "timestamp": datetime.utcnow().isoformat(),
        "version": settings.APP_VERSION,
    }
