from datetime import datetime, date
from typing import List, Optional
from sqlalchemy.orm import Session
from backend.app.models.models import (
    Subject, ClassSession, Assignment, Exam, AttendanceRecord, Note, Setting
)
from backend.app.schemas.schemas import (
    DashboardOverview, AssignmentOut, ExamOut, NoteOut, ClassSessionOut,
    SubjectAttendanceStats, NextClassInfo
)
from backend.app.services.attendance_service import get_overall_attendance_summary
from backend.app.services.timetable_service import get_next_upcoming_class

def get_student_name(db: Session) -> str:
    setting = db.query(Setting).filter(Setting.key == "student_name").first()
    return setting.value if setting and setting.value else "Alex Morgan"

def get_dashboard_data(db: Session) -> DashboardOverview:
    now = datetime.now()
    today_str = now.strftime("%Y-%m-%d")
    current_weekday = now.weekday()

    # Subjects count
    total_subjects = db.query(Subject).count()

    # Assignments aggregation
    assignments = db.query(Assignment).join(Subject).all()
    pending_count = 0
    overdue_count = 0
    completed_count = 0
    upcoming_deadlines_list = []

    for a in assignments:
        is_completed = (a.status == "completed")
        due_date_str = a.due_date[:10]
        is_overdue = (not is_completed) and (due_date_str < today_str)

        if is_completed:
            completed_count += 1
        else:
            pending_count += 1
            if is_overdue:
                overdue_count += 1

            upcoming_deadlines_list.append(
                AssignmentOut(
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
            )

    # Sort upcoming deadlines by due_date ascending
    upcoming_deadlines_list.sort(key=lambda x: x.due_date)
    upcoming_deadlines_top = upcoming_deadlines_list[:6]

    # Exams aggregation
    all_exams = db.query(Exam).join(Subject).order_by(Exam.exam_date.asc(), Exam.start_time.asc()).all()
    upcoming_exams_list = []
    upcoming_count = 0

    for e in all_exams:
        exam_d = datetime.strptime(e.exam_date, "%Y-%m-%d").date()
        days_diff = (exam_d - now.date()).days
        is_past = days_diff < 0
        is_imminent = (0 <= days_diff <= 3)

        if not is_past:
            upcoming_count += 1

        upcoming_exams_list.append(
            ExamOut(
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
        )

    # Only include upcoming (not past) in the top upcoming list
    top_upcoming_exams = [ex for ex in upcoming_exams_list if not ex.is_past][:4]

    # Attendance summary
    att_summary = get_overall_attendance_summary(db)

    # Next class
    next_class = get_next_upcoming_class(db, now)

    # Today's timetable sessions
    today_sessions_db = (
        db.query(ClassSession)
        .join(Subject)
        .filter(ClassSession.day_of_week == current_weekday)
        .order_by(ClassSession.start_time.asc())
        .all()
    )
    today_sessions = [
        ClassSessionOut(
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
        for s in today_sessions_db
    ]

    # Recent notes
    recent_notes_db = (
        db.query(Note)
        .outerjoin(Subject)
        .order_by(Note.updated_at.desc())
        .limit(4)
        .all()
    )
    recent_notes = [
        NoteOut(
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
        for n in recent_notes_db
    ]

    return DashboardOverview(
        student_name=get_student_name(db),
        pending_assignments_count=pending_count,
        overdue_assignments_count=overdue_count,
        completed_assignments_count=completed_count,
        upcoming_exams_count=upcoming_count,
        total_subjects_count=total_subjects,
        overall_attendance_percentage=att_summary.overall_percentage,
        attendance_is_warning=att_summary.is_warning,
        warning_threshold=att_summary.warning_threshold,
        next_class=next_class,
        today_sessions=today_sessions,
        upcoming_deadlines=upcoming_deadlines_top,
        upcoming_exams=top_upcoming_exams,
        recent_notes=recent_notes,
        subject_attendance=att_summary.subjects,
    )
