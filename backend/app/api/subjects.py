from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.core.database import get_db
from backend.app.models.models import Subject
from backend.app.schemas.schemas import SubjectCreate, SubjectUpdate, SubjectOut, SubjectAttendanceStats
from backend.app.services.attendance_service import calculate_subject_attendance, get_warning_threshold

router = APIRouter(prefix="/subjects", tags=["Subjects"])

@router.get("", response_model=List[SubjectOut])
def get_subjects(db: Session = Depends(get_db)):
    return db.query(Subject).order_by(Subject.name.asc()).all()

@router.post("", response_model=SubjectOut, status_code=status.HTTP_201_CREATED)
def create_subject(data: SubjectCreate, db: Session = Depends(get_db)):
    code_upper = data.code.strip().upper()
    existing = db.query(Subject).filter(Subject.code == code_upper).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Subject code '{code_upper}' already exists.",
        )
    subject = Subject(
        name=data.name.strip(),
        code=code_upper,
        description=data.description,
        color=data.color,
        instructor=data.instructor,
        credits=data.credits,
    )
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject

@router.get("/{subject_id}", response_model=SubjectOut)
def get_subject(subject_id: int, db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    return subject

@router.put("/{subject_id}", response_model=SubjectOut)
def update_subject(subject_id: int, data: SubjectUpdate, db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")

    if data.code is not None:
        code_upper = data.code.strip().upper()
        existing = db.query(Subject).filter(Subject.code == code_upper, Subject.id != subject_id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Subject code '{code_upper}' already belongs to another subject.",
            )
        subject.code = code_upper

    if data.name is not None:
        subject.name = data.name.strip()
    if data.description is not None:
        subject.description = data.description
    if data.color is not None:
        subject.color = data.color
    if data.instructor is not None:
        subject.instructor = data.instructor
    if data.credits is not None:
        subject.credits = data.credits

    db.commit()
    db.refresh(subject)
    return subject

@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subject(subject_id: int, db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    
    # Cascade deletes sessions, assignments, exams, attendance records, notes
    db.delete(subject)
    db.commit()
    return None
