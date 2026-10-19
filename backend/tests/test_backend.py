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
