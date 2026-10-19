from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
from backend.app.core.database import get_db
from backend.app.models.models import Assignment, Subject
from backend.app.schemas.schemas import AssignmentCreate, AssignmentUpdate, AssignmentOut

router = APIRouter(prefix="/assignments", tags=["Assignments"])

def assignment_to_out(a: Assignment, today_str: str) -> AssignmentOut:
    is_completed = (a.status == "completed")
    due_date_str = a.due_date[:10] if a.due_date else ""
    is_overdue = (not is_completed) and (due_date_str < today_str)

    return AssignmentOut(
        id=a.id,
        subject_id=a.subject_id,
        title=a.title,
        description=a.description,
        due_date=a.due_date,
        priority=a.priority,
        status=a.status,
        completed_at=a.completed_at,
        created_at=a.created_at,
        updated_at=a.updated_at,
        subject_name=a.subject.name if a.subject else None,
        subject_code=a.subject.code if a.subject else None,
        subject_color=a.subject.color if a.subject else "#6366F1",
        is_overdue=is_overdue,
    )

@router.get("", response_model=List[AssignmentOut])
def get_assignments(
    status_filter: Optional[str] = Query(None, alias="status"),
    subject_id: Optional[int] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = Query("due_date", pattern="^(due_date|created_at|priority)$"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db)
):
    today_str = datetime.now().strftime("%Y-%m-%d")
    query = db.query(Assignment).join(Subject)

    if status_filter:
        query = query.filter(Assignment.status == status_filter)
    if subject_id:
        query = query.filter(Assignment.subject_id == subject_id)
    if priority:
        query = query.filter(Assignment.priority == priority)
    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            (Assignment.title.ilike(search_pattern)) | (Assignment.description.ilike(search_pattern))
        )

    # Sorting
    if sort_by == "due_date":
        order_col = Assignment.due_date.desc() if sort_order == "desc" else Assignment.due_date.asc()
    elif sort_by == "created_at":
        order_col = Assignment.created_at.desc() if sort_order == "desc" else Assignment.created_at.asc()
    else:  # priority
        order_col = Assignment.priority.desc() if sort_order == "desc" else Assignment.priority.asc()

    assignments = query.order_by(order_col).all()
    return [assignment_to_out(a, today_str) for a in assignments]

@router.post("", response_model=AssignmentOut, status_code=status.HTTP_201_CREATED)
def create_assignment(data: AssignmentCreate, db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == data.subject_id).first()
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")

    completed_at = datetime.utcnow() if data.status == "completed" else None
    assignment = Assignment(
        subject_id=data.subject_id,
        title=data.title.strip(),
        description=data.description,
        due_date=data.due_date,
        priority=data.priority,
        status=data.status,
        completed_at=completed_at,
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    today_str = datetime.now().strftime("%Y-%m-%d")
    return assignment_to_out(assignment, today_str)

@router.get("/{assignment_id}", response_model=AssignmentOut)
def get_assignment(assignment_id: int, db: Session = Depends(get_db)):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    today_str = datetime.now().strftime("%Y-%m-%d")
    return assignment_to_out(assignment, today_str)

@router.put("/{assignment_id}", response_model=AssignmentOut)
def update_assignment(assignment_id: int, data: AssignmentUpdate, db: Session = Depends(get_db)):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")

    if data.subject_id is not None:
        subject = db.query(Subject).filter(Subject.id == data.subject_id).first()
        if not subject:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
        assignment.subject_id = data.subject_id

    if data.title is not None:
        assignment.title = data.title.strip()
    if data.description is not None:
        assignment.description = data.description
    if data.due_date is not None:
        assignment.due_date = data.due_date
    if data.priority is not None:
        assignment.priority = data.priority
    if data.status is not None:
        if data.status == "completed" and assignment.status != "completed":
            assignment.completed_at = datetime.utcnow()
        elif data.status != "completed":
            assignment.completed_at = None
        assignment.status = data.status

    db.commit()
    db.refresh(assignment)
    today_str = datetime.now().strftime("%Y-%m-%d")
    return assignment_to_out(assignment, today_str)

@router.delete("/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assignment(assignment_id: int, db: Session = Depends(get_db)):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    db.delete(assignment)
    db.commit()
    return None
