from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.core.database import get_db
from backend.app.models.models import AttendanceRecord, Subject
from backend.app.schemas.schemas import (
    AttendanceRecordCreate, AttendanceRecordUpdate, AttendanceRecordOut,
    OverallAttendanceSummary, SubjectAttendanceStats
)
from backend.app.services.attendance_service import (
    get_overall_attendance_summary, calculate_subject_attendance, get_warning_threshold
)

router = APIRouter(prefix="/attendance", tags=["Attendance"])

def att_to_out(r: AttendanceRecord) -> AttendanceRecordOut:
    return AttendanceRecordOut(
        id=r.id,
        subject_id=r.subject_id,
        date=r.date,
        status=r.status,
        session_name=r.session_name,
        notes=r.notes,
        created_at=r.created_at,
        subject_name=r.subject.name if r.subject else None,
        subject_code=r.subject.code if r.subject else None,
        subject_color=r.subject.color if r.subject else "#6366F1",
    )

@router.get("", response_model=List[AttendanceRecordOut])
def get_attendance(
    subject_id: Optional[int] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(AttendanceRecord).join(Subject)

    if subject_id:
        query = query.filter(AttendanceRecord.subject_id == subject_id)
    if status_filter:
        query = query.filter(AttendanceRecord.status == status_filter)
    if date_from:
        query = query.filter(AttendanceRecord.date >= date_from)
    if date_to:
        query = query.filter(AttendanceRecord.date <= date_to)

    records = query.order_by(AttendanceRecord.date.desc(), AttendanceRecord.id.desc()).all()
    return [att_to_out(r) for r in records]

@router.get("/summary", response_model=OverallAttendanceSummary)
def get_summary(db: Session = Depends(get_db)):
    return get_overall_attendance_summary(db)

@router.post("", response_model=AttendanceRecordOut, status_code=status.HTTP_201_CREATED)
def record_attendance(data: AttendanceRecordCreate, db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == data.subject_id).first()
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")

    session_name_clean = data.session_name.strip() if data.session_name else "Regular Class"

    # Duplicate check for same subject, date, and session_name
    existing = db.query(AttendanceRecord).filter(
        AttendanceRecord.subject_id == data.subject_id,
        AttendanceRecord.date == data.date,
        AttendanceRecord.session_name == session_name_clean,
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Attendance already recorded for {subject.name} on {data.date} ({session_name_clean}).",
        )

    record = AttendanceRecord(
        subject_id=data.subject_id,
        date=data.date,
        status=data.status,
        session_name=session_name_clean,
        notes=data.notes,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return att_to_out(record)

@router.get("/{record_id}", response_model=AttendanceRecordOut)
def get_attendance_record(record_id: int, db: Session = Depends(get_db)):
    record = db.query(AttendanceRecord).filter(AttendanceRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found")
    return att_to_out(record)

@router.put("/{record_id}", response_model=AttendanceRecordOut)
def update_attendance_record(record_id: int, data: AttendanceRecordUpdate, db: Session = Depends(get_db)):
    record = db.query(AttendanceRecord).filter(AttendanceRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found")

    if data.status is not None:
        record.status = data.status
    if data.session_name is not None:
        session_name_clean = data.session_name.strip()
        # Verify duplicate with new name
        existing = db.query(AttendanceRecord).filter(
            AttendanceRecord.subject_id == record.subject_id,
            AttendanceRecord.date == record.date,
            AttendanceRecord.session_name == session_name_clean,
            AttendanceRecord.id != record_id,
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Another record already exists for this subject, date, and session name.",
            )
        record.session_name = session_name_clean

    if data.notes is not None:
        record.notes = data.notes

    db.commit()
    db.refresh(record)
    return att_to_out(record)

@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_attendance_record(record_id: int, db: Session = Depends(get_db)):
    record = db.query(AttendanceRecord).filter(AttendanceRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found")
    db.delete(record)
    db.commit()
    return None
