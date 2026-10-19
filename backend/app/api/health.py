from fastapi import APIRouter
from datetime import datetime

router = APIRouter(tags=["Health"])

@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "CampusOS API",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
    }
