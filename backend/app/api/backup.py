from fastapi import APIRouter, Depends, HTTPException, status, Body, Request
from sqlalchemy.orm import Session
from typing import Dict, Any
from backend.app.core.database import get_db
from backend.app.core.security import verify_csrf_protection
from backend.app.services.backup_service import export_all_data, import_all_data, seed_demo_data

router = APIRouter(tags=["Data Management"])

@router.get("/export")
def export_data(db: Session = Depends(get_db)):
    return export_all_data(db)

@router.post("/import")
def import_data(
    request: Request,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
):
    verify_csrf_protection(request)
    try:
        counts = import_all_data(db, payload, wipe_existing=True)
        return {
            "status": "success",
            "message": "Data imported successfully.",
            "imported_counts": counts,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Import failed: {str(e)}",
        )

@router.post("/seed")
def seed_data(
    request: Request,
    payload: Dict[str, Any] = Body(default={}),
    db: Session = Depends(get_db),
):
    verify_csrf_protection(request)
    if not payload.get("confirm", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Seeding demo data requires deliberate confirmation. Provide {'confirm': true}.",
        )

    try:
        counts = seed_demo_data(db)
        return {
            "status": "success",
            "message": "Demo data seeded successfully.",
            "counts": counts,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Seeding failed: {str(e)}",
        )
