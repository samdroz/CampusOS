from fastapi import APIRouter, Depends, HTTPException, status, Body, Request
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from datetime import datetime
from backend.app.core.database import get_db
from backend.app.core.security import verify_csrf_protection
from backend.app.models.models import (
    StudentProfile, Setting, Subject, ClassSession, Assignment, Exam, AttendanceRecord, Note
)
from backend.app.schemas.schemas import (
    StudentProfileOut, StudentProfileCreate, StudentProfileUpdate, OnboardingPayload
)

router = APIRouter(prefix="/profile", tags=["Student Profile"])

def get_or_create_profile(db: Session) -> StudentProfile:
    profile = db.query(StudentProfile).first()
    if not profile:
        profile = StudentProfile(
            full_name="",
            preferred_name="",
            roll_number="",
            register_number="",
            email="",
            institution="",
            degree="",
            department="",
            admission_year="",
            academic_year="",
            semester="",
            university="",
            attendance_target=75.0,
            onboarding_completed=False,
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile

def sync_settings_from_profile(db: Session, profile: StudentProfile):
    display_name = profile.preferred_name.strip() if profile.preferred_name and profile.preferred_name.strip() else profile.full_name.strip()
    if display_name:
        st = db.query(Setting).filter(Setting.key == "student_name").first()
        if st:
            st.value = display_name
        else:
            db.add(Setting(key="student_name", value=display_name))

    stu_id = profile.roll_number or profile.register_number or ""
    if stu_id:
        st = db.query(Setting).filter(Setting.key == "student_id").first()
        if st:
            st.value = stu_id
        else:
            db.add(Setting(key="student_id", value=stu_id))

    major = profile.department or profile.degree or ""
    if major:
        st = db.query(Setting).filter(Setting.key == "major").first()
        if st:
            st.value = major
        else:
            db.add(Setting(key="major", value=major))

    if profile.attendance_target:
        st = db.query(Setting).filter(Setting.key == "attendance_threshold").first()
        if st:
            st.value = str(profile.attendance_target)
        else:
            db.add(Setting(key="attendance_threshold", value=str(profile.attendance_target)))

    st = db.query(Setting).filter(Setting.key == "onboarding_completed").first()
    val = "true" if profile.onboarding_completed else "false"
    if st:
        st.value = val
    else:
        db.add(Setting(key="onboarding_completed", value=val))

    db.commit()

@router.get("", response_model=StudentProfileOut)
def get_profile(db: Session = Depends(get_db)):
    profile = get_or_create_profile(db)

    # Lazy import to avoid circular dependency
    try:
        from backend.app.main import write_onboarding_debug_log
        write_onboarding_debug_log(
            "BACKEND_GET_PROFILE",
            "Serving GET /api/profile",
            {
                "profile_id": profile.id,
                "full_name_blank": not bool(profile.full_name and profile.full_name.strip()),
                "onboarding_completed": bool(profile.onboarding_completed),
                "preferred_name_set": bool(profile.preferred_name and profile.preferred_name.strip()),
            }
        )
    except Exception:
        pass

    return profile

@router.put("", response_model=StudentProfileOut)
def update_profile(updates: StudentProfileUpdate, db: Session = Depends(get_db)):
    profile = get_or_create_profile(db)
    update_data = updates.model_dump(exclude_unset=True)

    if "full_name" in update_data and update_data["full_name"] is not None:
        clean_name = update_data["full_name"].strip()
        if not clean_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Full name cannot be blank."
            )
        profile.full_name = clean_name

    for field, value in update_data.items():
        if field != "full_name":
            setattr(profile, field, value)

    profile.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(profile)

    sync_settings_from_profile(db, profile)
    return profile

@router.post("/onboarding", response_model=Dict[str, Any])
def complete_onboarding(payload: OnboardingPayload, db: Session = Depends(get_db)):
    try:
        profile_data = payload.profile
        profile = get_or_create_profile(db)

        profile.full_name = profile_data.full_name.strip()
        profile.preferred_name = profile_data.preferred_name
        profile.roll_number = profile_data.roll_number
        profile.register_number = profile_data.register_number
        profile.email = profile_data.email
        profile.institution = profile_data.institution
        profile.degree = profile_data.degree
        profile.department = profile_data.department
        profile.admission_year = profile_data.admission_year
        profile.academic_year = profile_data.academic_year
        profile.semester = profile_data.semester
        profile.university = profile_data.university
        profile.attendance_target = profile_data.attendance_target
        profile.onboarding_completed = True
        profile.updated_at = datetime.utcnow()

        # Create initial subjects if provided
        code_to_subject_id: Dict[str, int] = {}
        for s in payload.subjects:
            existing = db.query(Subject).filter(Subject.code == s.code).first()
            if not existing:
                sub = Subject(
                    name=s.name,
                    code=s.code,
                    credits=s.credits,
                    instructor=s.instructor,
                    color=s.color,
                )
                db.add(sub)
                db.flush()
                code_to_subject_id[s.code] = sub.id
            else:
                code_to_subject_id[s.code] = existing.id

        # Create initial exams
        for e in payload.exams:
            sub_id = code_to_subject_id.get(e.subject_code)
            if sub_id:
                exam = Exam(
                    subject_id=sub_id,
                    title=e.title,
                    exam_date=e.exam_date,
                    start_time=e.start_time,
                    end_time=e.end_time,
                    location=e.location,
                )
                db.add(exam)

        # Create initial assignments
        for a in payload.assignments:
            sub_id = code_to_subject_id.get(a.subject_code)
            if sub_id:
                assignment = Assignment(
                    subject_id=sub_id,
                    title=a.title,
                    due_date=a.due_date,
                    priority=a.priority,
                    status="todo",
                )
                db.add(assignment)

        # Create initial class schedules
        for ses in payload.sessions:
            sub_id = code_to_subject_id.get(ses.subject_code)
            if sub_id:
                session_obj = ClassSession(
                    subject_id=sub_id,
                    day_of_week=ses.day_of_week,
                    start_time=ses.start_time,
                    end_time=ses.end_time,
                    room=ses.room,
                    session_type=ses.session_type,
                )
                db.add(session_obj)

        db.commit()
        db.refresh(profile)
        sync_settings_from_profile(db, profile)

        try:
            from backend.app.main import write_onboarding_debug_log
            write_onboarding_debug_log(
                "BACKEND_COMPLETE_ONBOARDING",
                "Profile onboarding completed successfully",
                {
                    "profile_id": profile.id,
                    "student_name": profile.preferred_name or profile.full_name,
                    "subjects_count": len(payload.subjects),
                    "onboarding_completed": profile.onboarding_completed,
                }
            )
        except Exception:
            pass

        return {
            "status": "success",
            "message": "Onboarding completed successfully.",
            "profile": {
                "full_name": profile.full_name,
                "preferred_name": profile.preferred_name,
                "onboarding_completed": profile.onboarding_completed,
            }
        }
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to complete onboarding: {str(exc)}"
        )

@router.post("/skip-onboarding", response_model=Dict[str, Any])
def skip_onboarding(db: Session = Depends(get_db)):
    profile = get_or_create_profile(db)
    profile.onboarding_completed = True
    profile.updated_at = datetime.utcnow()
    db.commit()
    sync_settings_from_profile(db, profile)

    try:
        from backend.app.main import write_onboarding_debug_log
        write_onboarding_debug_log(
            "BACKEND_SKIP_ONBOARDING",
            "Student chose to skip onboarding",
            {"profile_id": profile.id, "onboarding_completed": True}
        )
    except Exception:
        pass

    return {
        "status": "success",
        "message": "Onboarding skipped. You can complete your profile anytime from Settings.",
        "onboarding_completed": True,
    }

@router.post("/reset", response_model=Dict[str, Any])
def reset_local_data(
    request: Request,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
):
    verify_csrf_protection(request)
    if not payload.get("confirm", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resetting data requires deliberate confirmation. Provide {'confirm': true}."
        )

    try:
        # Wipe academic data in cascade order
        db.query(AttendanceRecord).delete()
        db.query(Assignment).delete()
        db.query(Exam).delete()
        db.query(ClassSession).delete()
        db.query(Note).delete()
        db.query(Subject).delete()

        # Reset profile
        profile = db.query(StudentProfile).first()
        if profile:
            profile.full_name = ""
            profile.preferred_name = ""
            profile.roll_number = ""
            profile.register_number = ""
            profile.email = ""
            profile.institution = ""
            profile.degree = ""
            profile.department = ""
            profile.admission_year = ""
            profile.academic_year = ""
            profile.semester = ""
            profile.university = ""
            profile.attendance_target = 75.0
            profile.onboarding_completed = False
            profile.updated_at = datetime.utcnow()

        # Reset settings
        db.query(Setting).delete()
        db.commit()

        return {
            "status": "success",
            "message": "All local academic data and profiles have been successfully reset."
        }
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Reset failed: {str(exc)}"
        )
