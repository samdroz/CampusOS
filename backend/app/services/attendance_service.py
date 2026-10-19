from typing import List, Optional, Dict
from sqlalchemy.orm import Session
from backend.app.models.models import AttendanceRecord, Subject, Setting
from backend.app.schemas.schemas import SubjectAttendanceStats, OverallAttendanceSummary
import json

def get_warning_threshold(db: Session) -> float:
    setting = db.query(Setting).filter(Setting.key == "attendance_threshold").first()
    if setting and setting.value:
        try:
            return float(setting.value)
        except ValueError:
            pass
    return 75.0

def calculate_subject_attendance(
    db: Session,
    subject: Subject,
    warning_threshold: float
) -> SubjectAttendanceStats:
    records = db.query(AttendanceRecord).filter(AttendanceRecord.subject_id == subject.id).all()
    
    attended = 0
    absent = 0
    excused = 0
    cancelled = 0

    for r in records:
        st = r.status.lower()
        if st == "present":
            attended += 1
        elif st == "absent":
            absent += 1
        elif st == "excused":
            excused += 1
        elif st == "cancelled":
            cancelled += 1

    # Standard academic rule:
    # Cancelled classes are excluded from denominator.
    # Excused absences do not penalize student, so excluded from denominator.
    # Total eligible = present + absent.
    total_eligible = attended + absent
    
    percentage: Optional[float] = None
    if total_eligible > 0:
        percentage = round((attended / total_eligible) * 100.0, 1)

    is_warning = False
    if percentage is not None and percentage < warning_threshold:
        is_warning = True

    return SubjectAttendanceStats(
        subject_id=subject.id,
        subject_name=subject.name,
        subject_code=subject.code,
        subject_color=subject.color,
        attended=attended,
        absent=absent,
        excused=excused,
        cancelled=cancelled,
        total_eligible=total_eligible,
        percentage=percentage,
        is_warning=is_warning,
    )

def get_overall_attendance_summary(db: Session) -> OverallAttendanceSummary:
    threshold = get_warning_threshold(db)
    subjects = db.query(Subject).order_by(Subject.name).all()

    total_attended = 0
    total_absent = 0
    total_excused = 0
    total_cancelled = 0
    subject_stats: List[SubjectAttendanceStats] = []

    for subj in subjects:
        stats = calculate_subject_attendance(db, subj, threshold)
        subject_stats.append(stats)
        total_attended += stats.attended
        total_absent += stats.absent
        total_excused += stats.excused
        total_cancelled += stats.cancelled

    total_eligible = total_attended + total_absent
    overall_percentage: Optional[float] = None
    if total_eligible > 0:
        overall_percentage = round((total_attended / total_eligible) * 100.0, 1)

    is_warning = False
    if overall_percentage is not None and overall_percentage < threshold:
        is_warning = True

    return OverallAttendanceSummary(
        total_attended=total_attended,
        total_absent=total_absent,
        total_excused=total_excused,
        total_cancelled=total_cancelled,
        total_eligible=total_eligible,
        overall_percentage=overall_percentage,
        is_warning=is_warning,
        warning_threshold=threshold,
        subjects=subject_stats,
    )
