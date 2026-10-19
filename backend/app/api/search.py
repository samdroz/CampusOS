from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
from backend.app.core.database import get_db
from backend.app.models.models import Subject, Assignment, Exam, Note
from backend.app.schemas.schemas import SearchResult, SearchItem

router = APIRouter(prefix="/search", tags=["Global Search"])

@router.get("", response_model=SearchResult)
def search_entities(
    q: str = Query("", min_length=1),
    db: Session = Depends(get_db)
):
    query_str = q.strip()
    if not query_str:
        return SearchResult(query=q, results=[])

    pat = f"%{query_str}%"
    results: List[SearchItem] = []

    # 1. Subjects
    subjects = (
        db.query(Subject)
        .filter(
            (Subject.name.ilike(pat)) | (Subject.code.ilike(pat)) | (Subject.instructor.ilike(pat))
        )
        .limit(6)
        .all()
    )
    for s in subjects:
        results.append(
            SearchItem(
                entity_type="subject",
                id=s.id,
                title=s.name,
                subtitle=f"{s.code} · {s.instructor or 'No instructor'}",
                badge="Subject",
                color=s.color,
                url="/subjects",
            )
        )

    # 2. Assignments
    assignments = (
        db.query(Assignment)
        .join(Subject)
        .filter(
            (Assignment.title.ilike(pat)) | (Assignment.description.ilike(pat))
        )
        .limit(8)
        .all()
    )
    for a in assignments:
        results.append(
            SearchItem(
                entity_type="assignment",
                id=a.id,
                title=a.title,
                subtitle=f"{a.subject.code if a.subject else ''} · Due {a.due_date[:10]} · {a.status.replace('_', ' ').title()}",
                badge="Assignment",
                color=a.subject.color if a.subject else "#6366F1",
                url="/assignments",
            )
        )

    # 3. Exams
    exams = (
        db.query(Exam)
        .join(Subject)
        .filter(
            (Exam.title.ilike(pat)) | (Exam.location.ilike(pat)) | (Exam.notes.ilike(pat))
        )
        .limit(6)
        .all()
    )
    for e in exams:
        results.append(
            SearchItem(
                entity_type="exam",
                id=e.id,
                title=e.title,
                subtitle=f"{e.subject.code if e.subject else ''} · {e.exam_date} at {e.start_time}",
                badge="Exam",
                color=e.subject.color if e.subject else "#EF4444",
                url="/exams",
            )
        )

    # 4. Notes
    notes = (
        db.query(Note)
        .outerjoin(Subject)
        .filter(
            (Note.title.ilike(pat)) | (Note.content.ilike(pat)) | (Note.tags.ilike(pat))
        )
        .limit(6)
        .all()
    )
    for n in notes:
        results.append(
            SearchItem(
                entity_type="note",
                id=n.id,
                title=n.title,
                subtitle=f"{n.subject.code if n.subject else 'General'} · {n.tags or 'Note'}",
                badge="Note",
                color=n.subject.color if n.subject else "#8B5CF6",
                url="/notes",
            )
        )

    return SearchResult(query=query_str, results=results)
