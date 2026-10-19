from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from backend.app.core.database import get_db
from backend.app.models.models import Note, Subject
from backend.app.schemas.schemas import NoteCreate, NoteUpdate, NoteOut

router = APIRouter(prefix="/notes", tags=["Notes"])

def note_to_out(n: Note) -> NoteOut:
    return NoteOut(
        id=n.id,
        subject_id=n.subject_id,
        title=n.title,
        content=n.content,
        tags=n.tags,
        is_pinned=n.is_pinned,
        created_at=n.created_at,
        updated_at=n.updated_at,
        subject_name=n.subject.name if n.subject else None,
        subject_code=n.subject.code if n.subject else None,
        subject_color=n.subject.color if n.subject else None,
    )

@router.get("", response_model=List[NoteOut])
def get_notes(
    subject_id: Optional[int] = None,
    tag: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Note).outerjoin(Subject)

    if subject_id:
        query = query.filter(Note.subject_id == subject_id)
    if tag:
        tag_pat = f"%{tag.strip()}%"
        query = query.filter(Note.tags.ilike(tag_pat))
    if search:
        search_pat = f"%{search.strip()}%"
        query = query.filter(
            (Note.title.ilike(search_pat)) | (Note.content.ilike(search_pat))
        )

    notes = query.order_by(Note.is_pinned.desc(), Note.updated_at.desc()).all()
    return [note_to_out(n) for n in notes]

@router.post("", response_model=NoteOut, status_code=status.HTTP_201_CREATED)
def create_note(data: NoteCreate, db: Session = Depends(get_db)):
    if data.subject_id:
        subject = db.query(Subject).filter(Subject.id == data.subject_id).first()
        if not subject:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")

    note = Note(
        subject_id=data.subject_id,
        title=data.title.strip(),
        content=data.content,
        tags=data.tags,
        is_pinned=data.is_pinned,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note_to_out(note)

@router.get("/{note_id}", response_model=NoteOut)
def get_note(note_id: int, db: Session = Depends(get_db)):
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    return note_to_out(note)

@router.put("/{note_id}", response_model=NoteOut)
def update_note(note_id: int, data: NoteUpdate, db: Session = Depends(get_db)):
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    if data.subject_id is not None:
        if data.subject_id != 0:
            subject = db.query(Subject).filter(Subject.id == data.subject_id).first()
            if not subject:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
            note.subject_id = data.subject_id
        else:
            note.subject_id = None

    if data.title is not None:
        clean_title = data.title.strip()
        if not clean_title:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Title cannot be empty")
        note.title = clean_title

    if data.content is not None:
        note.content = data.content
    if data.tags is not None:
        note.tags = data.tags
    if data.is_pinned is not None:
        note.is_pinned = data.is_pinned

    note.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(note)
    return note_to_out(note)

@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(note_id: int, db: Session = Depends(get_db)):
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    db.delete(note)
    db.commit()
    return None
