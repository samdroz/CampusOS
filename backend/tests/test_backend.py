import pytest
from datetime import datetime, timedelta
from backend.app.models.models import Subject, Assignment, ClassSession, AttendanceRecord, Note, Setting
from backend.tests.conftest import TestingSessionLocal, test_engine

def test_01_health_check(client):
    """1. Application health endpoint returns 200 with service information"""
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "CampusOS" in data["service"]

def test_02_subject_create_and_get(client):
    """2. Subject creation and retrieval"""
    payload = {
        "name": "General Physics",
        "code": "PHYS101",
        "description": "Mechanics and thermodynamics",
        "color": "#10B981",
        "instructor": "Dr. Richard Feynman",
        "credits": 4,
    }
    res = client.post("/api/subjects", json=payload)
    assert res.status_code == 201
    created = res.json()
    assert created["id"] > 0
    assert created["code"] == "PHYS101"

    # Retrieve
    get_res = client.get(f"/api/subjects/{created['id']}")
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "General Physics"

def test_03_subject_update_and_delete(client):
    """3. Subject update and deletion"""
    create_res = client.post("/api/subjects", json={
        "name": "Temporary Subject",
        "code": "TEMP101",
        "color": "#6366F1",
    })
    subj_id = create_res.json()["id"]

    # Update
    update_res = client.put(f"/api/subjects/{subj_id}", json={
        "name": "Updated Subject Title",
        "credits": 5,
    })
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Updated Subject Title"
    assert update_res.json()["credits"] == 5

    # Delete
    del_res = client.delete(f"/api/subjects/{subj_id}")
    assert del_res.status_code == 204

    # Verify 404
    check_res = client.get(f"/api/subjects/{subj_id}")
    assert check_res.status_code == 404

def test_04_invalid_subject_input(client):
    """4. Invalid subject input validation (empty name, negative credits, duplicate code)"""
    # Empty name
    res = client.post("/api/subjects", json={"name": "   ", "code": "VALID1"})
    assert res.status_code == 422

    # Negative credits
    res = client.post("/api/subjects", json={"name": "Valid Name", "code": "VALID2", "credits": -1})
    assert res.status_code == 422

    # Duplicate subject code -> 409 Conflict
    client.post("/api/subjects", json={"name": "First Subject", "code": "DUP101"})
    dup_res = client.post("/api/subjects", json={"name": "Second Subject", "code": "DUP101"})
    assert dup_res.status_code == 409

def test_05_assignment_crud(client):
    """5. Assignment CRUD operations"""
    # Ensure subject
    subj = client.post("/api/subjects", json={"name": "Algorithms", "code": "ALGO101"}).json()

    # Create
    create_res = client.post("/api/assignments", json={
        "subject_id": subj["id"],
        "title": "Problem Set 1",
        "description": "Dynamic Programming",
        "due_date": "2026-11-15",
        "priority": "high",
        "status": "todo",
    })
    assert create_res.status_code == 201
    assign_id = create_res.json()["id"]

    # Read
    get_res = client.get(f"/api/assignments/{assign_id}")
    assert get_res.status_code == 200
    assert get_res.json()["title"] == "Problem Set 1"

    # Update
    update_res = client.put(f"/api/assignments/{assign_id}", json={"status": "completed"})
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "completed"
    assert update_res.json()["completed_at"] is not None

    # Delete
    del_res = client.delete(f"/api/assignments/{assign_id}")
    assert del_res.status_code == 204

def test_06_assignment_filtering_and_sorting(client):
    """6. Assignment filtering and sorting"""
    subj = client.post("/api/subjects", json={"name": "Calculus", "code": "CALC201"}).json()
    client.post("/api/assignments", json={
        "subject_id": subj["id"],
        "title": "A_Task",
        "due_date": "2026-10-01",
        "priority": "low",
        "status": "todo",
    })
    client.post("/api/assignments", json={
        "subject_id": subj["id"],
        "title": "B_Task",
        "due_date": "2026-10-10",
        "priority": "urgent",
        "status": "completed",
    })

    # Filter by status
    res = client.get(f"/api/assignments?subject_id={subj['id']}&status=todo")
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["title"] == "A_Task"

    # Filter by priority
    res_prio = client.get(f"/api/assignments?subject_id={subj['id']}&priority=urgent")
    assert res_prio.status_code == 200
    assert len(res_prio.json()) == 1
    assert res_prio.json()[0]["title"] == "B_Task"

def test_07_overdue_assignment_calculations(client):
    """7. Overdue assignment calculations"""
    subj = client.post("/api/subjects", json={"name": "History", "code": "HIST101"}).json()
    past_date = (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d")

    # Incomplete past assignment -> should be overdue
    overdue_task = client.post("/api/assignments", json={
        "subject_id": subj["id"],
        "title": "Late Paper",
        "due_date": past_date,
        "status": "todo",
    }).json()
    assert overdue_task["is_overdue"] is True

    # Completed past assignment -> should NOT be overdue
    client.put(f"/api/assignments/{overdue_task['id']}", json={"status": "completed"})
    updated_task = client.get(f"/api/assignments/{overdue_task['id']}").json()
    assert updated_task["is_overdue"] is False

def test_08_examination_date_validation(client):
    """8. Examination date and time validation"""
    subj = client.post("/api/subjects", json={"name": "Chemistry", "code": "CHEM101"}).json()

    # Malformed date format
    bad_date = client.post("/api/exams", json={
        "subject_id": subj["id"],
        "title": "Midterm",
        "exam_date": "10-20-2026",  # Not YYYY-MM-DD
        "start_time": "10:00",
    })
    assert bad_date.status_code == 422

    # Malformed time format
    bad_time = client.post("/api/exams", json={
        "subject_id": subj["id"],
        "title": "Midterm",
        "exam_date": "2026-11-20",
        "start_time": "25:00",  # Invalid hour
    })
    assert bad_time.status_code == 422

    # Valid exam
    good = client.post("/api/exams", json={
        "subject_id": subj["id"],
        "title": "Valid Chemistry Midterm",
        "exam_date": "2026-11-20",
        "start_time": "14:00",
        "weight": 35.0,
    })
    assert good.status_code == 201

def test_09_attendance_percentage_calculations(client):
    """9. Attendance percentage calculations"""
    subj = client.post("/api/subjects", json={"name": "Biology", "code": "BIO101"}).json()

    # 3 present, 1 absent -> 75.0%
    client.post("/api/attendance", json={"subject_id": subj["id"], "date": "2026-10-01", "status": "present", "session_name": "S1"})
    client.post("/api/attendance", json={"subject_id": subj["id"], "date": "2026-10-02", "status": "present", "session_name": "S1"})
    client.post("/api/attendance", json={"subject_id": subj["id"], "date": "2026-10-03", "status": "present", "session_name": "S1"})
    client.post("/api/attendance", json={"subject_id": subj["id"], "date": "2026-10-04", "status": "absent", "session_name": "S1"})

    summary = client.get("/api/attendance/summary").json()
    bio_stat = next(s for s in summary["subjects"] if s["subject_id"] == subj["id"])
    assert bio_stat["attended"] == 3
    assert bio_stat["absent"] == 1
    assert bio_stat["total_eligible"] == 4
    assert bio_stat["percentage"] == 75.0

def test_10_empty_attendance_behavior(client):
    """10. Empty attendance behavior must NOT report 100% when no records exist"""
    subj = client.post("/api/subjects", json={"name": "Astronomy", "code": "ASTRO101"}).json()
    summary = client.get("/api/attendance/summary").json()
    astro_stat = next(s for s in summary["subjects"] if s["subject_id"] == subj["id"])
    assert astro_stat["total_eligible"] == 0
    assert astro_stat["percentage"] is None  # Never falsely 100%!

def test_11_duplicate_attendance_prevention(client):
    """11. Duplicate attendance prevention for same subject, date, and session"""
    subj = client.post("/api/subjects", json={"name": "Robotics", "code": "ROBO101"}).json()
    first = client.post("/api/attendance", json={
        "subject_id": subj["id"],
        "date": "2026-10-10",
        "status": "present",
        "session_name": "Lecture 1",
    })
    assert first.status_code == 201

    duplicate = client.post("/api/attendance", json={
        "subject_id": subj["id"],
        "date": "2026-10-10",
        "status": "absent",
        "session_name": "Lecture 1",
    })
    assert duplicate.status_code == 409

def test_12_timetable_overlap_detection(client):
    """12. Timetable overlap detection returns 409 Conflict"""
    subj = client.post("/api/subjects", json={"name": "Database Systems", "code": "DBS101"}).json()

    # Create 09:00 - 10:30 on Monday (day_of_week=0)
    sess1 = client.post("/api/sessions", json={
        "subject_id": subj["id"],
        "day_of_week": 0,
        "start_time": "09:00",
        "end_time": "10:30",
        "session_type": "Lecture",
    })
    assert sess1.status_code == 201

    # Attempt overlap: 10:00 - 11:30 on Monday -> should fail with 409
    sess2 = client.post("/api/sessions", json={
        "subject_id": subj["id"],
        "day_of_week": 0,
        "start_time": "10:00",
        "end_time": "11:30",
        "session_type": "Lab",
    })
    assert sess2.status_code == 409
    assert "Time conflict" in sess2.json()["detail"]

    # Non-overlapping: 11:00 - 12:30 on Monday -> should succeed
    sess3 = client.post("/api/sessions", json={
        "subject_id": subj["id"],
        "day_of_week": 0,
        "start_time": "11:00",
        "end_time": "12:30",
        "session_type": "Lab",
    })
    assert sess3.status_code == 201

def test_13_notes_creation_and_search(client):
    """13. Notes creation and search across title, content, and tags"""
    subj = client.post("/api/subjects", json={"name": "Compilers", "code": "COMP401"}).json()

    client.post("/api/notes", json={
        "subject_id": subj["id"],
        "title": "Lexical Analysis and DFA",
        "content": "A deterministic finite automaton processes input tokens.",
        "tags": "Parsers, DFA",
        "is_pinned": True,
    })

    # Search title
    res_title = client.get("/api/notes?search=Lexical")
    assert res_title.status_code == 200
    assert len(res_title.json()) >= 1

    # Search content
    res_content = client.get("/api/notes?search=automaton")
    assert res_content.status_code == 200
    assert len(res_content.json()) >= 1

    # Search tag
    res_tag = client.get("/api/notes?tag=DFA")
    assert res_tag.status_code == 200
    assert len(res_tag.json()) >= 1

def test_14_settings_persistence(client):
    """14. Settings persistence"""
    update_res = client.post("/api/settings", json={
        "student_name": "Jordan Lee",
        "attendance_threshold": "80.0",
        "theme": "dark",
    })
    assert update_res.status_code == 200
    assert update_res.json()["student_name"] == "Jordan Lee"
    assert update_res.json()["attendance_threshold"] == "80.0"

    get_res = client.get("/api/settings")
    assert get_res.status_code == 200
    assert get_res.json()["student_name"] == "Jordan Lee"

def test_15_dashboard_aggregation(client):
    """15. Dashboard aggregation derives from real records"""
    res = client.get("/api/dashboard")
    assert res.status_code == 200
    data = res.json()
    assert "pending_assignments_count" in data
    assert "total_subjects_count" in data
    assert data["student_name"] == "Jordan Lee"

def test_16_data_export(client):
    """16. Data export outputs complete JSON structure"""
    res = client.get("/api/export")
    assert res.status_code == 200
    data = res.json()
    assert "subjects" in data
    assert "assignments" in data
    assert "class_sessions" in data
    assert "attendance" in data
    assert "notes" in data
    assert "settings" in data

def test_17_invalid_data_import(client):
    """17. Invalid data import rejection"""
    # Missing required subjects key
    res = client.post("/api/import", json={"invalid": "payload"})
    assert res.status_code == 400

def test_18_cascade_delete_and_constraints(client):
    """18. Database constraints and related-record cascade deletion"""
    subj = client.post("/api/subjects", json={"name": "Cascade Test", "code": "CASC101"}).json()
    s_id = subj["id"]

    # Add child assignment and session
    client.post("/api/assignments", json={"subject_id": s_id, "title": "Child Task", "due_date": "2026-12-01"})
    client.post("/api/sessions", json={"subject_id": s_id, "day_of_week": 1, "start_time": "08:00", "end_time": "09:00"})

    # Verify children exist
    assert len(client.get(f"/api/assignments?subject_id={s_id}").json()) == 1
    assert len(client.get(f"/api/sessions?subject_id={s_id}").json()) == 1

    # Delete parent subject
    del_res = client.delete(f"/api/subjects/{s_id}")
    assert del_res.status_code == 204

    # Verify children were cascade-deleted and not orphaned!
    assert len(client.get(f"/api/assignments?subject_id={s_id}").json()) == 0
    assert len(client.get(f"/api/sessions?subject_id={s_id}").json()) == 0

def test_19_appropriate_http_error_codes(client):
    """19. Appropriate HTTP error codes (400, 404, 409, 422)"""
    # 404
    assert client.get("/api/subjects/999999").status_code == 404
    assert client.get("/api/assignments/999999").status_code == 404

    # 400
    bad_time_res = client.post("/api/sessions", json={
        "subject_id": 1,
        "day_of_week": 2,
        "start_time": "14:00",
        "end_time": "12:00",  # End before start
    })
    assert bad_time_res.status_code in [400, 422]

    # 409 Conflict
    subj = client.post("/api/subjects", json={"name": "ConflictTest", "code": "CONF101"}).json()
    conflict_res = client.post("/api/subjects", json={"name": "Another", "code": "CONF101"})
    assert conflict_res.status_code == 409

def test_20_restart_persistence():
    """20. Restart persistence: data persists on SQLite storage after connection reset"""
    # Open fresh session to the test SQLite database
    db = TestingSessionLocal()
    new_subj = Subject(name="Persistent Subject", code="PERSIST101", color="#3B82F6", credits=3)
    db.add(new_subj)
    db.commit()
    created_id = new_subj.id
    db.close()

    # Re-open completely fresh session to simulate application restart
    db_reopened = TestingSessionLocal()
    retrieved = db_reopened.query(Subject).filter(Subject.id == created_id).first()
    assert retrieved is not None
    assert retrieved.code == "PERSIST101"
    db_reopened.close()

def test_21_student_profile_crud_and_validation(client):
    """21. Student profile creation, editing, and name validation"""
    # Get initial profile
    res = client.get("/api/profile")
    assert res.status_code == 200
    data = res.json()
    assert "onboarding_completed" in data

    # Update profile
    update_res = client.put("/api/profile", json={
        "full_name": "Jordan Lee",
        "preferred_name": "Jordan",
        "roll_number": "2024CS101",
        "institution": "Institute of Technology",
        "degree": "B.Tech",
        "department": "Computer Science",
        "attendance_target": 80.0,
    })
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["full_name"] == "Jordan Lee"
    assert updated["preferred_name"] == "Jordan"
    assert updated["attendance_target"] == 80.0

    # Validation: empty name should fail
    bad_res = client.put("/api/profile", json={"full_name": "   "})
    assert bad_res.status_code in [400, 422]


    # Validation: invalid attendance target
    bad_att = client.put("/api/profile", json={"attendance_target": 150.0})
    assert bad_att.status_code in [400, 422]

def test_22_first_launch_onboarding_completion(client):
    """22. First-launch onboarding full payload execution and persistence"""
    payload = {
        "profile": {
            "full_name": "Samantha Reed",
            "preferred_name": "Sam",
            "roll_number": "22EC055",
            "institution": "National University",
            "degree": "B.E.",
            "department": "Electronics",
            "attendance_target": 78.0,
            "onboarding_completed": True,
        },
        "subjects": [
            {
                "name": "Embedded Systems",
                "code": "EC401",
                "credits": 4,
                "instructor": "Dr. Kumar",
                "color": "#8B5CF6",
            }
        ],
        "exams": [
            {
                "subject_code": "EC401",
                "title": "Midterm Exam",
                "exam_date": "2026-11-15",
                "start_time": "10:00",
            }
        ],
        "assignments": [
            {
                "subject_code": "EC401",
                "title": "Microcontroller Lab 1",
                "due_date": "2026-10-30",
                "priority": "high",
            }
        ],
        "sessions": [],
    }

    res = client.post("/api/profile/onboarding", json=payload)
    assert res.status_code == 200
    assert res.json()["status"] == "success"

    # Verify profile reflects onboarding
    prof = client.get("/api/profile").json()
    assert prof["full_name"] == "Samantha Reed"
    assert prof["onboarding_completed"] is True

    # Verify subject was created
    subj = client.get("/api/subjects").json()
    codes = [s["code"] for s in subj]
    assert "EC401" in codes

    # Verify exam was created
    exams = client.get("/api/exams").json()
    titles = [e["title"] for e in exams]
    assert "Midterm Exam" in titles

def test_23_onboarding_skip_behavior(client):
    """23. Skip onboarding creates an active default profile without errors"""
    res = client.post("/api/profile/skip-onboarding")
    assert res.status_code == 200
    assert res.json()["onboarding_completed"] is True

    prof = client.get("/api/profile").json()
    assert prof["onboarding_completed"] is True

def test_24_deliberate_data_reset(client):
    """24. Data reset requires deliberate confirmation and wipes data cleanly"""
    # Attempt reset without confirmation -> must be rejected
    rejected = client.post("/api/profile/reset", json={"confirm": False})
    assert rejected.status_code == 400

    # Confirmed reset
    confirmed = client.post("/api/profile/reset", json={"confirm": True})
    assert confirmed.status_code == 200
    assert confirmed.json()["status"] == "success"

    # Verify subjects count is 0
    subjects = client.get("/api/subjects").json()
    assert len(subjects) == 0

    # Verify onboarding_completed is reset to False
    prof = client.get("/api/profile").json()
    assert prof["onboarding_completed"] is False

def test_25_profile_export_and_restore(client):
    """25. Backup export and import includes student profile correctly"""
    # Setup profile & a subject
    client.put("/api/profile", json={
        "full_name": "Export Test Student",
        "institution": "Global Tech College",
    })
    client.post("/api/subjects", json={"name": "Cloud Architecture", "code": "CLD101"})

    # Export
    export_res = client.get("/api/export")
    assert export_res.status_code == 200
    export_data = export_res.json()
    assert "profile" in export_data
    assert export_data["profile"]["full_name"] == "Export Test Student"

    # Wipe & import
    client.post("/api/profile/reset", json={"confirm": True})
    import_res = client.post("/api/import", json=export_data)
    assert import_res.status_code == 200

    # Verify restored profile
    restored_prof = client.get("/api/profile").json()
    assert restored_prof["full_name"] == "Export Test Student"
    assert restored_prof["institution"] == "Global Tech College"

def test_26_desktop_config_path_resolution(monkeypatch):
    """26. Database path resolution honors per-user AppData directory in desktop mode"""
    from backend.app.core.config import get_app_data_dir, get_default_database_url

    # In dev mode
    monkeypatch.delenv("CAMPUSOS_DESKTOP", raising=False)
    monkeypatch.delenv("DATABASE_URL", raising=False)
    dev_url = get_default_database_url()
    assert "campusos.db" in dev_url

    # In desktop mode
    monkeypatch.setenv("CAMPUSOS_DESKTOP", "1")
    app_data = get_app_data_dir()
    assert app_data.exists()
    desktop_url = get_default_database_url()
    assert "sqlite:///" in desktop_url

def test_27_backend_desktop_handshake_port_selection():
    """27. Backend desktop entrypoint port negotiation function returns open port"""
    from backend.desktop_entry import find_available_port
    port = find_available_port()
    assert port > 0
    assert isinstance(port, int)

def test_28_genuinely_fresh_database_state(client):
    """28. Fresh database has no completed onboarding and no dummy names or courses"""
    # Clean reset to simulate genuine first-time installation
    client.post("/api/profile/reset", json={"confirm": True})

    # Profile check
    prof_res = client.get("/api/profile")
    assert prof_res.status_code == 200
    prof = prof_res.json()
    assert prof["onboarding_completed"] is False
    assert prof["full_name"] == ""
    assert prof["preferred_name"] == ""

    # Ensure no subjects exist
    subj = client.get("/api/subjects").json()
    assert len(subj) == 0

    # Ensure dashboard student_name is empty
    dash = client.get("/api/dashboard").json()
    assert dash["student_name"] == ""

def test_29_incomplete_profile_validation_and_state(client):
    """29. Incomplete profile cannot be finalized without full name and keeps onboarding active"""
    client.post("/api/profile/reset", json={"confirm": True})

    # Submitting onboarding without full name must fail
    invalid_payload = {
        "profile": {
            "full_name": "   ",
            "institution": "MIT",
            "onboarding_completed": True,
        },
        "subjects": [],
        "exams": [],
        "assignments": [],
        "sessions": [],
    }
    res = client.post("/api/profile/onboarding", json=invalid_payload)
    assert res.status_code in [400, 422]

    # Verify state remains uncompleted
    prof = client.get("/api/profile").json()
    assert prof["onboarding_completed"] is False

def test_30_completed_profile_and_reopening_persistence(client):
    """30. Complete profile with personal & academic details and verify persistence after restart"""
    client.post("/api/profile/reset", json={"confirm": True})

    complete_payload = {
        "profile": {
            "full_name": "Eleanor Vance",
            "preferred_name": "Nell",
            "roll_number": "2024CS042",
            "register_number": "REG-99120",
            "email": "nell@hillhouse.edu",
            "institution": "Institute of Architecture",
            "degree": "B.Arch",
            "department": "Structural Design",
            "admission_year": "2023",
            "academic_year": "2024–2025",
            "semester": "Semester 4",
            "university": "State Technical University",
            "attendance_target": 82.0,
            "onboarding_completed": True,
        },
        "subjects": [
            {
                "name": "Architectural History",
                "code": "ARCH201",
                "credits": 4,
                "instructor": "Dr. Montague",
                "color": "#4F46E5",
            }
        ],
        "exams": [
            {
                "subject_code": "ARCH201",
                "title": "Midterm Examination",
                "exam_date": "2026-11-20",
                "start_time": "09:30",
            }
        ],
        "assignments": [
            {
                "subject_code": "ARCH201",
                "title": "Design Portfolio Milestone 1",
                "due_date": "2026-11-05",
                "priority": "high",
            }
        ],
        "sessions": [],
    }

    onboard_res = client.post("/api/profile/onboarding", json=complete_payload)
    assert onboard_res.status_code == 200
    assert onboard_res.json()["status"] == "success"

    # Simulate application restart: query directly with clean session
    from backend.tests.conftest import TestingSessionLocal
    db = TestingSessionLocal()
    from backend.app.models.models import StudentProfile, Subject as SubjModel, Exam as ExamModel, Assignment as AssignModel
    persisted_prof = db.query(StudentProfile).first()
    assert persisted_prof is not None
    assert persisted_prof.onboarding_completed is True
    assert persisted_prof.full_name == "Eleanor Vance"
    assert persisted_prof.preferred_name == "Nell"
    assert persisted_prof.admission_year == "2023"
    assert persisted_prof.attendance_target == 82.0

    # Verify courses and deadlines persisted
    persisted_subj = db.query(SubjModel).filter(SubjModel.code == "ARCH201").first()
    assert persisted_subj is not None
    assert persisted_subj.name == "Architectural History"

    persisted_exam = db.query(ExamModel).filter(ExamModel.title == "Midterm Examination").first()
    assert persisted_exam is not None

    persisted_assign = db.query(AssignModel).filter(AssignModel.title == "Design Portfolio Milestone 1").first()
    assert persisted_assign is not None
    db.close()

def test_31_skipped_onboarding_and_persistence(client):
    """31. Explicitly skipping onboarding records completion, allows setting profile later, and retains state after restart"""
    client.post("/api/profile/reset", json={"confirm": True})

    # Skip onboarding
    skip_res = client.post("/api/profile/skip-onboarding")
    assert skip_res.status_code == 200
    assert skip_res.json()["onboarding_completed"] is True

    # Verify profile is marked completed, no fake student name or fake courses
    prof = client.get("/api/profile").json()
    assert prof["onboarding_completed"] is True
    subjects = client.get("/api/subjects").json()
    assert len(subjects) == 0

    # Simulate subsequent launch: profile is still completed so onboarding won't reappear
    from backend.tests.conftest import TestingSessionLocal
    db = TestingSessionLocal()
    from backend.app.models.models import StudentProfile
    reopened_prof = db.query(StudentProfile).first()
    assert reopened_prof is not None
    assert reopened_prof.onboarding_completed is True
    db.close()

    # User later configures profile in Settings
    settings_update = client.put("/api/profile", json={
        "full_name": "Later Student",
        "institution": "Online Academy",
    })
    assert settings_update.status_code == 200
    assert settings_update.json()["full_name"] == "Later Student"

def test_32_health_endpoint_contract_and_service_info(client):
    """32. Health check endpoint satisfies contract required by Tauri and C# launcher"""
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert "status" in data and data["status"] == "healthy"
    assert "service" in data and "CampusOS" in data["service"]
    assert "version" in data and len(data["version"]) > 0

def test_33_dynamic_version_resolution_from_environment(monkeypatch):
    """33. Health check version dynamically honors CAMPUSOS_VERSION environment variable"""
    from backend.app.core.config import get_app_version
    monkeypatch.setenv("CAMPUSOS_VERSION", "v1.0.1")
    assert get_app_version() == "1.0.1"

    monkeypatch.setenv("CAMPUSOS_VERSION", "2.3.4-beta.1")
    assert get_app_version() == "2.3.4-beta.1"

def test_34_embedded_package_version_resolution(monkeypatch):
    """34. Packaged backend resolves version from embedded backend.app.version without environment variables"""
    import backend.app.version as ver_mod
    from backend.app.core.config import get_app_version

    # Ensure environment variables are unset as in a packaged desktop launch
    monkeypatch.delenv("CAMPUSOS_VERSION", raising=False)
    monkeypatch.delenv("GITHUB_REF_NAME", raising=False)

    monkeypatch.setattr(ver_mod, "__version__", "1.0.5-release")
    assert get_app_version() == "1.0.5-release"

def test_35_csrf_seed_rejected_for_cross_origin_requests(client):
    """35. CSRF: Cross-origin POST /api/seed is strictly rejected with 403 and does not wipe data"""
    # Create baseline record that must NOT be wiped
    client.post("/api/subjects", json={"name": "Protected Subject", "code": "PROT101"})

    # 1. Attacker domain with Origin header
    res1 = client.post(
        "/api/seed",
        headers={"Origin": "https://malicious-website.com"},
        json={"confirm": True},
    )
    assert res1.status_code == 403
    assert "Cross-origin request rejected" in res1.json()["detail"]

    # 2. Null origin (e.g. sandboxed iframe or privacy mode)
    res2 = client.post(
        "/api/seed",
        headers={"Origin": "null"},
        json={"confirm": True},
    )
    assert res2.status_code == 403
    assert "Cross-origin request rejected" in res2.json()["detail"]

    # 3. Attacker subdomain spoofing loopback
    res3 = client.post(
        "/api/seed",
        headers={"Origin": "http://127.0.0.1.attacker.com"},
        json={"confirm": True},
    )
    assert res3.status_code == 403
    assert "Cross-origin request rejected" in res3.json()["detail"]

    # 4. Attacker referer without Origin header
    res4 = client.post(
        "/api/seed",
        headers={"Origin": "", "Referer": "https://malicious-website.com/exploit.html"},
        json={"confirm": True},
    )
    assert res4.status_code == 403
    assert "Cross-origin request rejected" in res4.json()["detail"]

    # Verify existing database was not wiped
    subs = client.get("/api/subjects").json()
    assert any(s["code"] == "PROT101" for s in subs)

def test_36_csrf_seed_rejected_without_custom_header():
    """36. CSRF: Requests missing origin/referer or X-CampusOS-Request are rejected with 403"""
    from fastapi.testclient import TestClient
    from backend.app.main import app

    with TestClient(app) as raw_client:
        # 1. Missing both Origin and Referer (fail-closed)
        res_no_orig = raw_client.post(
            "/api/seed",
            headers={"X-CampusOS-Request": "1"},
            json={"confirm": True},
        )
        assert res_no_orig.status_code == 403
        assert "Missing required origin verification headers" in res_no_orig.json()["detail"]

        # 2. Loopback origin present but missing custom header (e.g. basic HTML form)
        res_no_hdr = raw_client.post(
            "/api/seed",
            headers={"Origin": "http://127.0.0.1:18420"},
            json={"confirm": True},
        )
        assert res_no_hdr.status_code == 403
        assert "Missing or invalid security header" in res_no_hdr.json()["detail"]

def test_37_csrf_seed_requires_confirmation_payload(client):
    """37. CSRF: POST /api/seed requires deliberate confirmation body {"confirm": true}"""
    # Missing body
    res_empty = client.post(
        "/api/seed",
        headers={"Origin": "http://127.0.0.1:18420"},
        json={},
    )
    assert res_empty.status_code == 400
    assert "deliberate confirmation" in res_empty.json()["detail"]

    # False confirm
    res_false = client.post(
        "/api/seed",
        headers={"Origin": "http://127.0.0.1:18420"},
        json={"confirm": False},
    )
    assert res_false.status_code == 400
    assert "deliberate confirmation" in res_false.json()["detail"]

def test_38_csrf_seed_succeeds_for_legitimate_request(client):
    """38. Legitimate CampusOS client request with loopback origin, custom header, and confirmation seeds successfully"""
    res = client.post(
        "/api/seed",
        headers={
            "Origin": "http://127.0.0.1:18420",
            "X-CampusOS-Request": "1",
        },
        json={"confirm": True},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["counts"]["subjects"] > 0

    # Verify seeded demo subjects are populated
    subjects = client.get("/api/subjects").json()
    codes = {s["code"] for s in subjects}
    assert "CS301" in codes
    assert "MATH220" in codes

def test_39_csrf_protection_in_desktop_mode():
    """39. Verified actual desktop mode (CAMPUSOS_DESKTOP=1 in fresh process) initializes settings and enforces CSRF and CORS"""
    import os
    import subprocess
    import tempfile
    import sys
    from pathlib import Path

    repo_root = Path(__file__).resolve().parent.parent.parent

    with tempfile.TemporaryDirectory() as tmpdir:
        env = os.environ.copy()
        # Remove any inherited database override that could redirect to real database
        env.pop("DATABASE_URL", None)
        # Record real APPDATA to explicitly prove no overlap
        real_appdata = env.get("APPDATA", "")
        env["REAL_APPDATA"] = real_appdata
        # Force desktop mode and isolated data directory
        env["CAMPUSOS_DESKTOP"] = "1"
        env["CAMPUSOS_DESKTOP_PORT"] = "18420"
        env["CAMPUSOS_DATA_DIR"] = tmpdir
        env["APPDATA"] = tmpdir
        env["LOCALAPPDATA"] = tmpdir
        env["USERPROFILE"] = tmpdir
        env["PYTHONPATH"] = str(repo_root)

        child_code = """
import os
import sys
from pathlib import Path
from backend.app.core.config import settings, get_app_data_dir

# 1. Verify desktop mode configuration took effect on initial import
assert settings.DOCS_ENABLED is False, 'Docs/OpenAPI must be disabled in desktop mode'
assert settings.DESKTOP_PORT == 18420, f'Expected desktop port 18420, got: {settings.DESKTOP_PORT}'

# 2. Strict physical path verification of temporary database
tmp_dir_path = Path(os.environ["CAMPUSOS_DATA_DIR"]).resolve()
app_data_dir = get_app_data_dir().resolve()
assert app_data_dir == tmp_dir_path or tmp_dir_path in app_data_dir.parents, (
    f"Data directory {app_data_dir} is NOT inside temporary directory {tmp_dir_path}"
)

db_url = settings.DATABASE_URL
assert db_url.startswith("sqlite:///"), f"Expected SQLite URL, got: {db_url}"
raw_db_path = db_url.replace("sqlite:///", "")
resolved_db_path = Path(raw_db_path).resolve()

# Confirm resolved SQLite database is physically located inside the temporary directory
assert tmp_dir_path in resolved_db_path.parents, (
    f"Database path {resolved_db_path} is NOT inside temporary directory {tmp_dir_path}"
)
assert resolved_db_path.name == "campusos.db"

# Confirm resolved database does NOT overlap with the real user APPDATA directory
real_appdata = os.environ.get("REAL_APPDATA")
if real_appdata:
    real_appdata_path = Path(real_appdata).resolve()
    assert real_appdata_path not in resolved_db_path.parents, (
        f"FATAL: Database path {resolved_db_path} overlaps with real APPDATA {real_appdata_path}"
    )

print(f"CONFIRMED_ISOLATED_DB:{resolved_db_path}")

from backend.app.main import app
from fastapi.testclient import TestClient

with TestClient(app) as client:
    # 1. Cross-origin request rejected with 403
    r_cross = client.post(
        '/api/seed',
        headers={'Origin': 'https://attacker.com', 'X-CampusOS-Request': '1'},
        json={'confirm': True},
    )
    assert r_cross.status_code == 403, f'Expected 403, got {r_cross.status_code}'

    # 2. Request without Origin or Referer rejected with 403 (fail-closed)
    r_no_orig = client.post(
        '/api/seed',
        headers={'X-CampusOS-Request': '1'},
        json={'confirm': True},
    )
    assert r_no_orig.status_code == 403, f'Expected 403, got {r_no_orig.status_code}'

    # 3. Request without custom header rejected with 403
    r_no_hdr = client.post(
        '/api/seed',
        headers={'Origin': 'http://127.0.0.1:18420'},
        json={'confirm': True},
    )
    assert r_no_hdr.status_code == 403, f'Expected 403, got {r_no_hdr.status_code}'

    # 4. CORS preflight for external attacker site blocked
    r_preflight_bad = client.options(
        '/api/seed',
        headers={
            'Origin': 'https://attacker.com',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'x-campusos-request',
        },
    )
    assert 'access-control-allow-origin' not in r_preflight_bad.headers
    assert r_preflight_bad.status_code == 400

    # 5. Unrelated localhost port (e.g. 3000) rejected by CORS preflight
    r_preflight_port = client.options(
        '/api/seed',
        headers={
            'Origin': 'http://localhost:3000',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'x-campusos-request',
        },
    )
    assert 'access-control-allow-origin' not in r_preflight_port.headers
    assert r_preflight_port.status_code == 400

    # 6. Unrelated localhost port (e.g. 3000) rejected with 403 on direct POST
    r_port_bad = client.post(
        '/api/seed',
        headers={'Origin': 'http://localhost:3000', 'X-CampusOS-Request': '1'},
        json={'confirm': True},
    )
    assert r_port_bad.status_code == 403, f'Expected 403 for unrelated localhost port, got {r_port_bad.status_code}'

    # 7. Unrelated localhost port in Referer rejected with 403
    r_ref_bad = client.post(
        '/api/seed',
        headers={'Referer': 'http://localhost:3000/app', 'X-CampusOS-Request': '1'},
        json={'confirm': True},
    )
    assert r_ref_bad.status_code == 403, f'Expected 403 for unrelated localhost referer, got {r_ref_bad.status_code}'

    # 8. Unrelated loopback port (127.0.0.1:9999) rejected with 403
    r_loop_bad = client.post(
        '/api/seed',
        headers={'Origin': 'http://127.0.0.1:9999', 'X-CampusOS-Request': '1'},
        json={'confirm': True},
    )
    assert r_loop_bad.status_code == 403, f'Expected 403 for unrelated loopback port, got {r_loop_bad.status_code}'

    # 9. Legitimate desktop loopback client on assigned port (18420) succeeds
    r_legit = client.post(
        '/api/seed',
        headers={'Origin': 'http://127.0.0.1:18420', 'X-CampusOS-Request': '1'},
        json={'confirm': True},
    )
    assert r_legit.status_code == 200, f'Expected 200, got {r_legit.status_code}: {r_legit.text}'
    assert r_legit.json()['status'] == 'success'

    # 10. CORS preflight for legitimate desktop loopback allowed
    r_preflight_good = client.options(
        '/api/seed',
        headers={
            'Origin': 'http://127.0.0.1:18420',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'x-campusos-request',
        },
    )
    assert r_preflight_good.status_code == 200
    assert r_preflight_good.headers.get('access-control-allow-origin') == 'http://127.0.0.1:18420'

    # 11. Legitimate desktop localhost on assigned port (http://localhost:18420) preflight allowed
    r_localhost_good = client.options(
        '/api/seed',
        headers={
            'Origin': 'http://localhost:18420',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'x-campusos-request',
        },
    )
    assert r_localhost_good.status_code == 200
    assert r_localhost_good.headers.get('access-control-allow-origin') == 'http://localhost:18420'

    # 12. Legitimate Tauri origin allowed
    r_tauri_good = client.options(
        '/api/seed',
        headers={
            'Origin': 'tauri://localhost',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'x-campusos-request',
        },
    )
    assert r_tauri_good.status_code == 200
    assert r_tauri_good.headers.get('access-control-allow-origin') == 'tauri://localhost'

# Confirm the physical database file was indeed created inside tmpdir and contains data
assert resolved_db_path.exists(), f"Database file was not created at {resolved_db_path}"
assert resolved_db_path.stat().st_size > 0, f"Database file at {resolved_db_path} is empty"

print(f"CONFIRMED_DB_FILE_WRITTEN:{resolved_db_path.stat().st_size}_BYTES")
print('DESKTOP_VERIFIED_SUCCESSFULLY')
"""
        proc = subprocess.run(
            [sys.executable, "-c", child_code],
            env=env,
            capture_output=True,
            text=True,
        )
        assert proc.returncode == 0, f"Desktop mode subprocess failed:\nSTDOUT:\n{proc.stdout}\nSTDERR:\n{proc.stderr}"
        assert "DESKTOP_VERIFIED_SUCCESSFULLY" in proc.stdout
        assert "CONFIRMED_ISOLATED_DB:" in proc.stdout
        print(f"\n{proc.stdout.strip()}")

def test_41_dynamic_desktop_port_isolation():
    """41. Verified desktop mode dynamically binds to assigned port (e.g. 18425) and rejects previous/unrelated ports"""
    import os
    import subprocess
    import tempfile
    import sys
    from pathlib import Path

    repo_root = Path(__file__).resolve().parent.parent.parent

    with tempfile.TemporaryDirectory() as tmpdir:
        env = os.environ.copy()
        env.pop("DATABASE_URL", None)
        real_appdata = env.get("APPDATA", "")
        env["REAL_APPDATA"] = real_appdata
        env["CAMPUSOS_DESKTOP"] = "1"
        env["CAMPUSOS_DESKTOP_PORT"] = "18425"
        env["CAMPUSOS_DATA_DIR"] = tmpdir
        env["APPDATA"] = tmpdir
        env["LOCALAPPDATA"] = tmpdir
        env["USERPROFILE"] = tmpdir
        env["PYTHONPATH"] = str(repo_root)

        child_code = """
import os
import sys
from pathlib import Path
from backend.app.core.config import settings, get_app_data_dir

assert settings.DESKTOP_PORT == 18425, f'Expected desktop port 18425, got: {settings.DESKTOP_PORT}'

# Verify isolated database
tmp_dir_path = Path(os.environ["CAMPUSOS_DATA_DIR"]).resolve()
resolved_db_path = Path(settings.DATABASE_URL.replace("sqlite:///", "")).resolve()
assert tmp_dir_path in resolved_db_path.parents

real_appdata = os.environ.get("REAL_APPDATA")
if real_appdata:
    assert Path(real_appdata).resolve() not in resolved_db_path.parents

from backend.app.main import app
from fastapi.testclient import TestClient

with TestClient(app) as client:
    # 1. Legitimate assigned port (18425) succeeds on preflight
    r_good_preflight = client.options(
        '/api/seed',
        headers={
            'Origin': 'http://127.0.0.1:18425',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'x-campusos-request',
        },
    )
    assert r_good_preflight.status_code == 200
    assert r_good_preflight.headers.get('access-control-allow-origin') == 'http://127.0.0.1:18425'

    # 2. Legitimate assigned port (18425) succeeds on POST
    r_good_post = client.post(
        '/api/seed',
        headers={'Origin': 'http://127.0.0.1:18425', 'X-CampusOS-Request': '1'},
        json={'confirm': True},
    )
    assert r_good_post.status_code == 200

    # 3. Old default port (18420) is rejected because server is assigned to 18425
    r_old_preflight = client.options(
        '/api/seed',
        headers={
            'Origin': 'http://127.0.0.1:18420',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'x-campusos-request',
        },
    )
    assert r_old_preflight.status_code == 400
    assert 'access-control-allow-origin' not in r_old_preflight.headers

    r_old_post = client.post(
        '/api/seed',
        headers={'Origin': 'http://127.0.0.1:18420', 'X-CampusOS-Request': '1'},
        json={'confirm': True},
    )
    assert r_old_post.status_code == 403

    # 4. Unrelated localhost:3000 is rejected
    r_bad_post = client.post(
        '/api/seed',
        headers={'Origin': 'http://localhost:3000', 'X-CampusOS-Request': '1'},
        json={'confirm': True},
    )
    assert r_bad_post.status_code == 403

print('DYNAMIC_PORT_ISOLATION_VERIFIED_SUCCESSFULLY')
"""
        proc = subprocess.run(
            [sys.executable, "-c", child_code],
            env=env,
            capture_output=True,
            text=True,
        )
        assert proc.returncode == 0, f"Dynamic port subprocess failed:\nSTDOUT:\n{proc.stdout}\nSTDERR:\n{proc.stderr}"
        assert "DYNAMIC_PORT_ISOLATION_VERIFIED_SUCCESSFULLY" in proc.stdout
        print(f"\n{proc.stdout.strip()}")

def test_40_destructive_endpoints_csrf_protection(client):
    """40. Destructive import and reset endpoints enforce identical CSRF origin and header validation"""
    from fastapi.testclient import TestClient
    from backend.app.main import app

    # 1. /api/import with cross-origin
    imp_cross = client.post(
        "/api/import",
        headers={"Origin": "https://attacker.com"},
        json={"subjects": []},
    )
    assert imp_cross.status_code == 403

    # 2. /api/import without custom header
    with TestClient(app) as raw_client:
        imp_no_hdr = raw_client.post(
            "/api/import",
            headers={"Origin": "http://127.0.0.1:18420"},
            json={"subjects": []},
        )
        assert imp_no_hdr.status_code == 403
        assert "Missing or invalid security header" in imp_no_hdr.json()["detail"]

    # 3. /api/import without origin or referer (fail-closed)
    with TestClient(app) as raw_client:
        imp_no_orig = raw_client.post(
            "/api/import",
            headers={"X-CampusOS-Request": "1"},
            json={"subjects": []},
        )
        assert imp_no_orig.status_code == 403
        assert "Missing required origin verification headers" in imp_no_orig.json()["detail"]

    # 4. /api/profile/reset with cross-origin
    rst_cross = client.post(
        "/api/profile/reset",
        headers={"Origin": "https://attacker.com"},
        json={"confirm": True},
    )
    assert rst_cross.status_code == 403

    # 5. /api/profile/reset without custom header
    with TestClient(app) as raw_client:
        rst_no_hdr = raw_client.post(
            "/api/profile/reset",
            headers={"Origin": "http://127.0.0.1:18420"},
            json={"confirm": True},
        )
        assert rst_no_hdr.status_code == 403
        assert "Missing or invalid security header" in rst_no_hdr.json()["detail"]

    # 6. /api/profile/reset without origin or referer (fail-closed)
    with TestClient(app) as raw_client:
        rst_no_orig = raw_client.post(
            "/api/profile/reset",
            headers={"X-CampusOS-Request": "1"},
            json={"confirm": True},
        )
        assert rst_no_orig.status_code == 403
        assert "Missing required origin verification headers" in rst_no_orig.json()["detail"]
