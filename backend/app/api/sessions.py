from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.core.database import get_db
from backend.app.models.models import ClassSession, Subject
from backend.app.schemas.schemas import ClassSessionCreate, ClassSessionUpdate, ClassSessionOut
from backend.app.services.timetable_service import check_session_overlap

router = APIRouter(prefix="/sessions", tags=["Timetable Sessions"])

def session_to_out(s: ClassSession) -> ClassSessionOut:
    return ClassSessionOut(
        id=s.id,
        subject_id=s.subject_id,
        day_of_week=s.day_of_week,
        start_time=s.start_time,
        end_time=s.end_time,
        room=s.room,
        instructor=s.instructor or (s.subject.instructor if s.subject else None),
        session_type=s.session_type,
        subject_name=s.subject.name if s.subject else None,
        subject_code=s.subject.code if s.subject else None,
        subject_color=s.subject.color if s.subject else "#6366F1",
    )

@router.get("", response_model=List[ClassSessionOut])
def get_sessions(
    day_of_week: Optional[int] = Query(None, ge=0, le=6),
    subject_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(ClassSession).join(Subject)
    if day_of_week is not None:
        query = query.filter(ClassSession.day_of_week == day_of_week)
    if subject_id is not None:
        query = query.filter(ClassSession.subject_id == subject_id)

    sessions = query.order_by(ClassSession.day_of_week.asc(), ClassSession.start_time.asc()).all()
    return [session_to_out(s) for s in sessions]

@router.post("", response_model=ClassSessionOut, status_code=status.HTTP_201_CREATED)
def create_session(data: ClassSessionCreate, db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == data.subject_id).first()
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")

    # Overlap detection
    overlap = check_session_overlap(
        db,
        day_of_week=data.day_of_week,
        start_time=data.start_time,
        end_time=data.end_time,
    )
    if overlap:
        overlap_subj_name = overlap.subject.name if overlap.subject else "another class"
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Time conflict! Overlaps with {overlap_subj_name} ({overlap.start_time} - {overlap.end_time}) on this day.",
        )

    session = ClassSession(
        subject_id=data.subject_id,
        day_of_week=data.day_of_week,
        start_time=data.start_time,
        end_time=data.end_time,
        room=data.room,
        instructor=data.instructor or subject.instructor,
        session_type=data.session_type,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session_to_out(session)

@router.get("/{session_id}", response_model=ClassSessionOut)
def get_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(ClassSession).filter(ClassSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class session not found")
    return session_to_out(session)

@router.put("/{session_id}", response_model=ClassSessionOut)
def update_session(session_id: int, data: ClassSessionUpdate, db: Session = Depends(get_db)):
    session = db.query(ClassSession).filter(ClassSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class session not found")

    new_day = data.day_of_week if data.day_of_week is not None else session.day_of_week
    new_start = data.start_time if data.start_time is not None else session.start_time
    new_end = data.end_time if data.end_time is not None else session.end_time

    if new_start >= new_end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End time must be strictly after start time",
        )

    # Check overlap excluding this session
    overlap = check_session_overlap(
        db,
        day_of_week=new_day,
        start_time=new_start,
        end_time=new_end,
        exclude_session_id=session_id,
    )
    if overlap:
        overlap_subj_name = overlap.subject.name if overlap.subject else "another class"
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Time conflict! Overlaps with {overlap_subj_name} ({overlap.start_time} - {overlap.end_time}) on this day.",
        )

    if data.subject_id is not None:
        subject = db.query(Subject).filter(Subject.id == data.subject_id).first()
        if not subject:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
        session.subject_id = data.subject_id

    session.day_of_week = new_day
    session.start_time = new_start
    session.end_time = new_end
    if data.room is not None:
        session.room = data.room
    if data.instructor is not None:
        session.instructor = data.instructor
    if data.session_type is not None:
        session.session_type = data.session_type

    db.commit()
    db.refresh(session)
    return session_to_out(session)

@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(ClassSession).filter(ClassSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class session not found")
    db.delete(session)
    db.commit()
    return None
