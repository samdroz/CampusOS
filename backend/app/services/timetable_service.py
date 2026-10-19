from typing import Optional, List
from sqlalchemy.orm import Session
from datetime import datetime
from backend.app.models.models import ClassSession, Subject
from backend.app.schemas.schemas import NextClassInfo, ClassSessionOut

def check_session_overlap(
    db: Session,
    day_of_week: int,
    start_time: str,
    end_time: str,
    exclude_session_id: Optional[int] = None
) -> Optional[ClassSession]:
    """
    Returns an overlapping ClassSession if one exists, otherwise None.
    Condition for overlap: start_time < existing.end_time and existing.start_time < end_time
    """
    query = db.query(ClassSession).filter(
        ClassSession.day_of_week == day_of_week,
        ClassSession.start_time < end_time,
        ClassSession.end_time > start_time,
    )
    if exclude_session_id is not None:
        query = query.filter(ClassSession.id != exclude_session_id)
        
    return query.first()

def get_next_upcoming_class(db: Session, now: Optional[datetime] = None) -> Optional[NextClassInfo]:
    """
    Finds the next upcoming class relative to now (or current local time).
    Searches remaining classes today, then subsequent days of the week.
    """
    if now is None:
        now = datetime.now()
        
    current_weekday = now.weekday()  # 0=Monday, 6=Sunday
    current_time_str = now.strftime("%H:%M")

    # 1. Search later today
    today_later = (
        db.query(ClassSession)
        .join(Subject)
        .filter(ClassSession.day_of_week == current_weekday, ClassSession.start_time >= current_time_str)
        .order_by(ClassSession.start_time.asc())
        .first()
    )
    if today_later and today_later.subject:
        return NextClassInfo(
            id=today_later.id,
            subject_id=today_later.subject_id,
            subject_name=today_later.subject.name,
            subject_code=today_later.subject.code,
            subject_color=today_later.subject.color,
            day_of_week=today_later.day_of_week,
            start_time=today_later.start_time,
            end_time=today_later.end_time,
            room=today_later.room,
            instructor=today_later.instructor or today_later.subject.instructor,
            session_type=today_later.session_type,
            is_today=True,
        )

    # 2. Search subsequent days (1 to 6 days ahead)
    for offset in range(1, 7):
        target_day = (current_weekday + offset) % 7
        next_session = (
            db.query(ClassSession)
            .join(Subject)
            .filter(ClassSession.day_of_week == target_day)
            .order_by(ClassSession.start_time.asc())
            .first()
        )
        if next_session and next_session.subject:
            return NextClassInfo(
                id=next_session.id,
                subject_id=next_session.subject_id,
                subject_name=next_session.subject.name,
                subject_code=next_session.subject.code,
                subject_color=next_session.subject.color,
                day_of_week=next_session.day_of_week,
                start_time=next_session.start_time,
                end_time=next_session.end_time,
                room=next_session.room,
                instructor=next_session.instructor or next_session.subject.instructor,
                session_type=next_session.session_type,
                is_today=False,
            )

    return None
