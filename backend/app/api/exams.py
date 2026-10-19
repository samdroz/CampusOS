from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
from backend.app.core.database import get_db
from backend.app.models.models import Exam, Subject
from backend.app.schemas.schemas import ExamCreate, ExamUpdate, ExamOut

router = APIRouter(prefix="/exams", tags=["Examinations"])

def exam_to_out(e: Exam, today_date) -> ExamOut:
    try:
        exam_d = datetime.strptime(e.exam_date, "%Y-%m-%d").date()
        days_diff = (exam_d - today_date).days
    except ValueError:
        days_diff = 0

    is_past = days_diff < 0
    is_imminent = (0 <= days_diff <= 3)

    return ExamOut(
        id=e.id,
        subject_id=e.subject_id,
        title=e.title,
        exam_date=e.exam_date,
        start_time=e.start_time,
        end_time=e.end_time,
        location=e.location,
        weight=e.weight,
        notes=e.notes,
        created_at=e.created_at,
        subject_name=e.subject.name if e.subject else None,
        subject_code=e.subject.code if e.subject else None,
        subject_color=e.subject.color if e.subject else "#6366F1",
        days_remaining=days_diff,
        is_imminent=is_imminent,
        is_past=is_past,
    )

@router.get("", response_model=List[ExamOut])
def get_exams(
    subject_id: Optional[int] = None,
    is_past: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    today_date = datetime.now().date()
    query = db.query(Exam).join(Subject)

    if subject_id:
        query = query.filter(Exam.subject_id == subject_id)

    exams = query.order_by(Exam.exam_date.asc(), Exam.start_time.asc()).all()
    results = [exam_to_out(e, today_date) for e in exams]

    if is_past is not None:
        results = [e for e in results if e.is_past == is_past]

    return results

@router.post("", response_model=ExamOut, status_code=status.HTTP_201_CREATED)
def create_exam(data: ExamCreate, db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == data.subject_id).first()
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")

    exam = Exam(
        subject_id=data.subject_id,
        title=data.title.strip(),
        exam_date=data.exam_date,
        start_time=data.start_time,
        end_time=data.end_time,
        location=data.location,
        weight=data.weight,
        notes=data.notes,
    )
    db.add(exam)
    db.commit()
    db.refresh(exam)
    return exam_to_out(exam, datetime.now().date())

@router.get("/{exam_id}", response_model=ExamOut)
def get_exam(exam_id: int, db: Session = Depends(get_db)):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")
    return exam_to_out(exam, datetime.now().date())

@router.put("/{exam_id}", response_model=ExamOut)
def update_exam(exam_id: int, data: ExamUpdate, db: Session = Depends(get_db)):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")

    if data.subject_id is not None:
        subject = db.query(Subject).filter(Subject.id == data.subject_id).first()
        if not subject:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
        exam.subject_id = data.subject_id

    if data.title is not None:
        exam.title = data.title.strip()
    if data.exam_date is not None:
        exam.exam_date = data.exam_date
    if data.start_time is not None:
        exam.start_time = data.start_time
    if data.end_time is not None:
        exam.end_time = data.end_time
    if data.location is not None:
        exam.location = data.location
    if data.weight is not None:
        exam.weight = data.weight
    if data.notes is not None:
        exam.notes = data.notes

    db.commit()
    db.refresh(exam)
    return exam_to_out(exam, datetime.now().date())

@router.delete("/{exam_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_exam(exam_id: int, db: Session = Depends(get_db)):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")
    db.delete(exam)
    db.commit()
    return None
