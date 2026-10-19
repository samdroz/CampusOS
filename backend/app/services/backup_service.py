from datetime import datetime, timedelta
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from backend.app.models.models import (
    Subject, ClassSession, Assignment, Exam, AttendanceRecord, Note, Setting
)

def export_all_data(db: Session) -> Dict[str, Any]:
    subjects = db.query(Subject).all()
    sessions = db.query(ClassSession).all()
    assignments = db.query(Assignment).all()
    exams = db.query(Exam).all()
    attendance = db.query(AttendanceRecord).all()
    notes = db.query(Note).all()
    settings = db.query(Setting).all()

    return {
        "version": "1.0",
        "exported_at": datetime.utcnow().isoformat(),
        "subjects": [
            {
                "id": s.id,
                "name": s.name,
                "code": s.code,
                "description": s.description,
                "color": s.color,
                "instructor": s.instructor,
                "credits": s.credits,
            }
            for s in subjects
        ],
        "class_sessions": [
            {
                "subject_code": s.subject.code if s.subject else None,
                "day_of_week": s.day_of_week,
                "start_time": s.start_time,
                "end_time": s.end_time,
                "room": s.room,
                "instructor": s.instructor,
                "session_type": s.session_type,
            }
            for s in sessions
        ],
        "assignments": [
            {
                "subject_code": a.subject.code if a.subject else None,
                "title": a.title,
                "description": a.description,
                "due_date": a.due_date,
                "priority": a.priority,
                "status": a.status,
            }
            for a in assignments
        ],
        "exams": [
            {
                "subject_code": e.subject.code if e.subject else None,
                "title": e.title,
                "exam_date": e.exam_date,
                "start_time": e.start_time,
                "end_time": e.end_time,
                "location": e.location,
                "weight": e.weight,
                "notes": e.notes,
            }
            for e in exams
        ],
        "attendance": [
            {
                "subject_code": att.subject.code if att.subject else None,
                "date": att.date,
                "status": att.status,
                "session_name": att.session_name,
                "notes": att.notes,
            }
            for att in attendance
        ],
        "notes": [
            {
                "subject_code": n.subject.code if n.subject else None,
                "title": n.title,
                "content": n.content,
                "tags": n.tags,
                "is_pinned": n.is_pinned,
            }
            for n in notes
        ],
        "settings": {s.key: s.value for s in settings},
    }

def import_all_data(db: Session, data: Dict[str, Any], wipe_existing: bool = True) -> Dict[str, int]:
    """
    Imports full JSON data transactionally.
    """
    if "subjects" not in data:
        raise ValueError("Invalid format: 'subjects' list is required in backup data")

    try:
        if wipe_existing:
            # Delete in cascade order
            db.query(AttendanceRecord).delete()
            db.query(Assignment).delete()
            db.query(Exam).delete()
            db.query(ClassSession).delete()
            db.query(Note).delete()
            db.query(Subject).delete()
            db.commit()

        code_to_subject_id: Dict[str, int] = {}
        counts = {
            "subjects": 0,
            "sessions": 0,
            "assignments": 0,
            "exams": 0,
            "attendance": 0,
            "notes": 0,
        }

        # 1. Subjects
        for s_data in data.get("subjects", []):
            code = s_data["code"].strip().upper()
            subject = Subject(
                name=s_data["name"],
                code=code,
                description=s_data.get("description"),
                color=s_data.get("color", "#6366F1"),
                instructor=s_data.get("instructor"),
                credits=s_data.get("credits", 3),
            )
            db.add(subject)
            db.flush()
            code_to_subject_id[code] = subject.id
            counts["subjects"] += 1

        # 2. Class Sessions
        for sess_data in data.get("class_sessions", []):
            subj_id = code_to_subject_id.get(sess_data.get("subject_code", "").upper())
            if subj_id:
                sess = ClassSession(
                    subject_id=subj_id,
                    day_of_week=sess_data["day_of_week"],
                    start_time=sess_data["start_time"],
                    end_time=sess_data["end_time"],
                    room=sess_data.get("room"),
                    instructor=sess_data.get("instructor"),
                    session_type=sess_data.get("session_type", "Lecture"),
                )
                db.add(sess)
                counts["sessions"] += 1

        # 3. Assignments
        for a_data in data.get("assignments", []):
            subj_id = code_to_subject_id.get(a_data.get("subject_code", "").upper())
            if subj_id:
                assignment = Assignment(
                    subject_id=subj_id,
                    title=a_data["title"],
                    description=a_data.get("description"),
                    due_date=a_data["due_date"],
                    priority=a_data.get("priority", "medium"),
                    status=a_data.get("status", "todo"),
                )
                db.add(assignment)
                counts["assignments"] += 1

        # 4. Exams
        for e_data in data.get("exams", []):
            subj_id = code_to_subject_id.get(e_data.get("subject_code", "").upper())
            if subj_id:
                exam = Exam(
                    subject_id=subj_id,
                    title=e_data["title"],
                    exam_date=e_data["exam_date"],
                    start_time=e_data["start_time"],
                    end_time=e_data.get("end_time"),
                    location=e_data.get("location"),
                    weight=e_data.get("weight"),
                    notes=e_data.get("notes"),
                )
                db.add(exam)
                counts["exams"] += 1

        # 5. Attendance
        for att_data in data.get("attendance", []):
            subj_id = code_to_subject_id.get(att_data.get("subject_code", "").upper())
            if subj_id:
                att = AttendanceRecord(
                    subject_id=subj_id,
                    date=att_data["date"],
                    status=att_data.get("status", "present"),
                    session_name=att_data.get("session_name", "Regular Class"),
                    notes=att_data.get("notes"),
                )
                db.add(att)
                counts["attendance"] += 1

        # 6. Notes
        for n_data in data.get("notes", []):
            subj_id = None
            if n_data.get("subject_code"):
                subj_id = code_to_subject_id.get(n_data["subject_code"].upper())
            note = Note(
                subject_id=subj_id,
                title=n_data["title"],
                content=n_data["content"],
                tags=n_data.get("tags"),
                is_pinned=n_data.get("is_pinned", False),
            )
            db.add(note)
            counts["notes"] += 1

        # 7. Settings
        for k, v in data.get("settings", {}).items():
            st = db.query(Setting).filter(Setting.key == k).first()
            if st:
                st.value = str(v)
            else:
                db.add(Setting(key=k, value=str(v)))

        db.commit()
        return counts
    except Exception as e:
        db.rollback()
        raise e

def seed_demo_data(db: Session) -> Dict[str, int]:
    """
    Populates realistic academic demo data for testing and demonstrations.
    """
    now = datetime.now()
    today = now.date()

    demo_data = {
        "subjects": [
            {
                "name": "Data Structures & Algorithms",
                "code": "CS301",
                "description": "Analysis of algorithms, balanced trees, graph traversal, and dynamic programming.",
                "color": "#6366F1",  # Indigo
                "instructor": "Dr. Sarah Chen",
                "credits": 4,
            },
            {
                "name": "Operating Systems",
                "code": "CS305",
                "description": "Kernel architecture, virtual memory, process concurrency, and file systems.",
                "color": "#3B82F6",  # Blue
                "instructor": "Prof. David Miller",
                "credits": 4,
            },
            {
                "name": "Linear Algebra & Applications",
                "code": "MATH220",
                "description": "Vector spaces, linear transformations, eigenvalues, SVD, and PCA.",
                "color": "#10B981",  # Emerald
                "instructor": "Dr. Elena Rostova",
                "credits": 3,
            },
            {
                "name": "Artificial Intelligence",
                "code": "CS340",
                "description": "Heuristic search, Markov decision processes, reinforcement learning, and neural nets.",
                "color": "#8B5CF6",  # Violet
                "instructor": "Prof. Alan Thorne",
                "credits": 3,
            },
            {
                "name": "UI/UX & Human-Computer Interaction",
                "code": "DES102",
                "description": "User research, cognitive ergonomics, design systems, and rapid prototyping.",
                "color": "#F59E0B",  # Amber
                "instructor": "Maya Lin",
                "credits": 3,
            },
        ],
        "class_sessions": [
            # Monday
            {"subject_code": "CS301", "day_of_week": 0, "start_time": "09:00", "end_time": "10:30", "room": "Turing Hall 301", "instructor": "Dr. Sarah Chen", "session_type": "Lecture"},
            {"subject_code": "MATH220", "day_of_week": 0, "start_time": "11:00", "end_time": "12:30", "room": "Euler 104", "instructor": "Dr. Elena Rostova", "session_type": "Lecture"},
            {"subject_code": "DES102", "day_of_week": 0, "start_time": "14:00", "end_time": "16:00", "room": "Design Studio B", "instructor": "Maya Lin", "session_type": "Studio"},
            # Tuesday
            {"subject_code": "CS305", "day_of_week": 1, "start_time": "10:00", "end_time": "11:30", "room": "Von Neumann 202", "instructor": "Prof. David Miller", "session_type": "Lecture"},
            {"subject_code": "CS340", "day_of_week": 1, "start_time": "13:30", "end_time": "15:00", "room": "Lovelace 405", "instructor": "Prof. Alan Thorne", "session_type": "Lecture"},
            # Wednesday
            {"subject_code": "CS301", "day_of_week": 2, "start_time": "09:00", "end_time": "10:30", "room": "Turing Hall 301", "instructor": "Dr. Sarah Chen", "session_type": "Lecture"},
            {"subject_code": "MATH220", "day_of_week": 2, "start_time": "11:00", "end_time": "12:30", "room": "Euler 104", "instructor": "Dr. Elena Rostova", "session_type": "Tutorial"},
            {"subject_code": "CS305", "day_of_week": 2, "start_time": "14:00", "end_time": "17:00", "room": "Systems Lab 3", "instructor": "Prof. David Miller", "session_type": "Lab"},
            # Thursday
            {"subject_code": "CS340", "day_of_week": 3, "start_time": "10:00", "end_time": "11:30", "room": "Lovelace 405", "instructor": "Prof. Alan Thorne", "session_type": "Lecture"},
            {"subject_code": "DES102", "day_of_week": 3, "start_time": "13:00", "end_time": "14:30", "room": "Design Studio B", "instructor": "Maya Lin", "session_type": "Critique"},
            # Friday
            {"subject_code": "CS301", "day_of_week": 4, "start_time": "10:00", "end_time": "12:00", "room": "Algorithms Lab 1", "instructor": "Dr. Sarah Chen", "session_type": "Lab"},
            {"subject_code": "CS305", "day_of_week": 4, "start_time": "13:30", "end_time": "15:00", "room": "Von Neumann 202", "instructor": "Prof. David Miller", "session_type": "Seminar"},
        ],
        "assignments": [
            {
                "subject_code": "CS301",
                "title": "Red-Black Tree Insertion & Rotation",
                "description": "Implement left/right rotations and fix violations on balanced binary trees in C++.",
                "due_date": (today + timedelta(days=2)).isoformat(),
                "priority": "urgent",
                "status": "in_progress",
            },
            {
                "subject_code": "CS305",
                "title": "Multithreaded Kernel Memory Allocator",
                "description": "Build a slab allocator with thread-local caches and lock-free freelists.",
                "due_date": (today + timedelta(days=5)).isoformat(),
                "priority": "high",
                "status": "todo",
            },
            {
                "subject_code": "MATH220",
                "title": "Singular Value Decomposition Problem Set",
                "description": "Compute SVD for image compression matrices and write low-rank approximations.",
                "due_date": (today - timedelta(days=1)).isoformat(),  # Overdue demo!
                "priority": "high",
                "status": "todo",
            },
            {
                "subject_code": "CS340",
                "title": "A* Pathfinding & MDP GridWorld Simulation",
                "description": "Compare Manhattan vs Euclidean heuristics on dynamic obstacle grid.",
                "due_date": (today + timedelta(days=9)).isoformat(),
                "priority": "medium",
                "status": "todo",
            },
            {
                "subject_code": "DES102",
                "title": "High-Fidelity CampusOS Design System",
                "description": "Deliver dark-mode color tokens, typography scales, and interactive states.",
                "due_date": (today - timedelta(days=3)).isoformat(),
                "priority": "medium",
                "status": "completed",
            },
            {
                "subject_code": "CS301",
                "title": "Dijkstra and Prim Minimum Spanning Trees",
                "description": "Graph benchmarks on sparse and dense adjacency matrices.",
                "due_date": (today - timedelta(days=7)).isoformat(),
                "priority": "low",
                "status": "completed",
            },
        ],
        "exams": [
            {
                "subject_code": "CS301",
                "title": "Midterm Examination: Advanced Algorithms",
                "exam_date": (today + timedelta(days=3)).isoformat(),
                "start_time": "14:00",
                "end_time": "16:30",
                "location": "Auditorium Hall A",
                "weight": 35.0,
                "notes": "Closed book. One double-sided A4 formula sheet permitted.",
            },
            {
                "subject_code": "MATH220",
                "title": "Midterm Exam: Linear Systems & Matrix Decompositions",
                "exam_date": (today + timedelta(days=8)).isoformat(),
                "start_time": "09:30",
                "end_time": "11:30",
                "location": "Euler Complex 201",
                "weight": 30.0,
                "notes": "Non-programmable calculators allowed.",
            },
            {
                "subject_code": "CS305",
                "title": "Final Laboratory Practical Exam",
                "exam_date": (today + timedelta(days=21)).isoformat(),
                "start_time": "13:00",
                "end_time": "17:00",
                "location": "Systems Lab 3",
                "weight": 40.0,
                "notes": "Practical debugging session on xv6 kernel panics.",
            },
        ],
        "attendance": [],
        "notes": [
            {
                "subject_code": "CS301",
                "title": "Red-Black Tree Invariants & Rotation Mechanics",
                "content": "# Red-Black Tree Notes\n\n### 5 Essential Properties:\n1. Every node is either **red** or **black**.\n2. The root is always **black**.\n3. Every leaf (`NIL`) is **black**.\n4. If a node is red, both children must be black (**no two consecutive reds**).\n5. For each node, all simple paths to descendant leaves contain the **same number of black nodes** (black-height).\n\n```python\ndef left_rotate(tree, x):\n    y = x.right\n    x.right = y.left\n    if y.left != tree.nil:\n        y.left.parent = x\n    y.parent = x.parent\n    # ... maintain tree pointers\n```\n\n> Maximum height of an RB-tree with $n$ internal nodes is $2 \\log_2(n + 1)$.",
                "tags": "Trees, Data Structures, Complexity",
                "is_pinned": True,
            },
            {
                "subject_code": "CS305",
                "title": "Virtual Memory Paging & TLB Hit Rate",
                "content": "# Virtual Memory & TLB\n\n- **Page Directory**: Multi-level page table reduces memory overhead for sparse address spaces.\n- **TLB (Translation Lookaside Buffer)**: Hardware cache for virtual-to-physical address mappings.\n\n### Formula for Effective Memory Access Time (EMAT):\n$$\\text{EMAT} = h \\times (t_m + t_{TLB}) + (1 - h) \\times (2 t_m + t_{TLB})$$\nwhere $h$ is hit ratio and $t_m$ is memory access latency.",
                "tags": "Memory, Kernel, Architecture",
                "is_pinned": True,
            },
            {
                "subject_code": "MATH220",
                "title": "Eigenvalues, Eigenvectors & Diagonalization",
                "content": "# Diagonalization Summary\n\nA matrix $A \\in \\mathbb{R}^{n \\times n}$ is diagonalizable if and only if it has $n$ linearly independent eigenvectors.\n\n$$A = P D P^{-1}$$\n\nWhere:\n- $D$ is the diagonal matrix of eigenvalues $\\lambda_i$.\n- $P$ is the matrix whose columns are the corresponding eigenvectors $v_i$.",
                "tags": "Algebra, Matrices, Proofs",
                "is_pinned": False,
            },
            {
                "subject_code": "DES102",
                "title": "Design Principles for High-Information SaaS",
                "content": "# Ergonomics in Dense Productivity Apps\n\n1. **Visual Hierarchy**: Primary data points should pop immediately without cognitive friction.\n2. **Contrast & Subtle Borders**: Soft slate lines (`#1E293B`) separate panels without loud borders.\n3. **Quick Keyboard Navigation**: Raycast-style command palette (`Cmd+K`) empowers power users.\n4. **Status Colors**: Consistent semantics (Emerald for Present/Done, Amber for Attention/Pending, Rose for Overdue/Warning).",
                "tags": "UI/UX, SaaS, Design",
                "is_pinned": False,
            },
        ],
        "settings": {
            "student_name": "Alex Morgan",
            "student_id": "STU-8829",
            "major": "Computer Science & Engineering",
            "attendance_threshold": "75.0",
            "week_start": "monday",
            "theme": "dark",
        },
    }

    # Generate realistic attendance records over the past 4 weeks
    # CS301: 9 present, 1 absent = 90%
    # CS305: 8 present, 0 absent = 100%
    # MATH220: 5 present, 3 absent = 62.5% (triggers warning threshold < 75%!)
    # CS340: 7 present, 1 absent, 1 excused = 87.5%
    # DES102: 6 present, 1 absent = 85.7%
    attendance_records = []
    
    # CS301 (9 Present, 1 Absent)
    for i in range(1, 10):
        d = (today - timedelta(days=i * 2 + 1)).isoformat()
        attendance_records.append({"subject_code": "CS301", "date": d, "status": "present", "session_name": f"Session {i}"})
    attendance_records.append({"subject_code": "CS301", "date": (today - timedelta(days=22)).isoformat(), "status": "absent", "session_name": "Session 10"})

    # CS305 (8 Present)
    for i in range(1, 9):
        d = (today - timedelta(days=i * 3)).isoformat()
        attendance_records.append({"subject_code": "CS305", "date": d, "status": "present", "session_name": f"OS Lab {i}"})

    # MATH220 (5 Present, 3 Absent -> 62.5%, below 75%)
    for i in range(1, 6):
        d = (today - timedelta(days=i * 4)).isoformat()
        attendance_records.append({"subject_code": "MATH220", "date": d, "status": "present", "session_name": f"Math Lecture {i}"})
    for i in range(1, 4):
        d = (today - timedelta(days=i * 4 + 2)).isoformat()
        attendance_records.append({"subject_code": "MATH220", "date": d, "status": "absent", "session_name": f"Math Problem Solving {i}"})

    # CS340 (7 Present, 1 Absent, 1 Excused)
    for i in range(1, 8):
        d = (today - timedelta(days=i * 3 + 1)).isoformat()
        attendance_records.append({"subject_code": "CS340", "date": d, "status": "present", "session_name": f"AI Lecture {i}"})
    attendance_records.append({"subject_code": "CS340", "date": (today - timedelta(days=25)).isoformat(), "status": "absent", "session_name": "AI Lecture 8"})
    attendance_records.append({"subject_code": "CS340", "date": (today - timedelta(days=28)).isoformat(), "status": "excused", "session_name": "AI Lecture 9", "notes": "Medical leave approved"})

    # DES102 (6 Present, 1 Absent)
    for i in range(1, 7):
        d = (today - timedelta(days=i * 4 + 1)).isoformat()
        attendance_records.append({"subject_code": "DES102", "date": d, "status": "present", "session_name": f"Design Studio {i}"})
    attendance_records.append({"subject_code": "DES102", "date": (today - timedelta(days=27)).isoformat(), "status": "absent", "session_name": "Design Critique"})

    demo_data["attendance"] = attendance_records

    return import_all_data(db, demo_data, wipe_existing=True)
