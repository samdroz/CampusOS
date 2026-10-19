from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any
from backend.app.core.database import get_db
from backend.app.models.models import Setting

router = APIRouter(prefix="/settings", tags=["Settings"])

DEFAULT_SETTINGS = {
    "student_name": "",
    "student_id": "",
    "major": "",
    "attendance_threshold": "75.0",
    "week_start": "monday",
    "theme": "dark",
    "enable_notifications": "true",
}

@router.get("", response_model=Dict[str, Any])
def get_settings(db: Session = Depends(get_db)):
    db_settings = db.query(Setting).all()
    res = dict(DEFAULT_SETTINGS)
    for s in db_settings:
        res[s.key] = s.value
    return res

@router.post("", response_model=Dict[str, Any])
def update_settings(updates: Dict[str, Any], db: Session = Depends(get_db)):
    # Validate attendance threshold if present
    if "attendance_threshold" in updates:
        try:
            val = float(updates["attendance_threshold"])
            if val <= 0 or val > 100:
                raise ValueError()
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Attendance warning threshold must be a number between 1 and 100.",
            )

    for k, v in updates.items():
        st = db.query(Setting).filter(Setting.key == k).first()
        val_str = str(v)
        if st:
            st.value = val_str
        else:
            db.add(Setting(key=k, value=val_str))

    db.commit()

    db_settings = db.query(Setting).all()
    res = dict(DEFAULT_SETTINGS)
    for s in db_settings:
        res[s.key] = s.value
    return res
