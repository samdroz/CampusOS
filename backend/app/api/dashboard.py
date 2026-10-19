from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.schemas.schemas import DashboardOverview
from backend.app.services.dashboard_service import get_dashboard_data

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("", response_model=DashboardOverview)
def get_dashboard(db: Session = Depends(get_db)):
    return get_dashboard_data(db)
