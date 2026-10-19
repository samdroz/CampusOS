# CampusOS — Academic Life Management Platform

![CampusOS Banner](https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80)

**CampusOS** is a commercial-grade, local-first academic operating system designed for university students. Inspired by the speed, information density, and craft of applications like Linear, Raycast, and Notion, CampusOS streamlines course management, timetables, assignment tracking, examination schedules, attendance compliance, and lecture notes into a unified dark-mode workspace.

---

## 🌟 Key Features

### 1. Unified Academic Command Center (Dashboard)
- **Real-Time Data Aggregation:** Dynamically derives pending assignments, overdue counts, upcoming exams, today's schedule, and overall attendance from the SQLite database.
- **Hero Next-Class Tracker:** Highlights the immediate next lecture or lab session today or upcoming in the week.
- **Urgent Deadlines:** Displays top upcoming coursework with urgency color tokens (`urgent`, `high`, `medium`, `low`) and overdue alert badges.
- **Exam Countdown:** Shows remaining days until exams (`Today!`, `Tomorrow!`, `In 3 days`) with imminent warnings.
- **One-Click Quick Actions:** Rapid shortcuts to create assignments, record attendance, write notes, or add subjects.

### 2. Course Catalog & Subjects
- **Full CRUD Support:** Manage course titles, codes (`CS301`, `MATH220`), descriptions, faculty contacts, and credit allocations.
- **Color Customization:** 8 curated color tokens for visual distinction across all schedules and views.
- **Integrity & Cascading:** Prevents duplicate subject codes (HTTP 409 Conflict) and cleanly cascades deletions to child records (assignments, timetable sessions, exams, attendance logs, notes).

### 3. Weekly Interactive Timetable
- **Dual View Modes:** Seamlessly switch between detailed **Day View** and full **Week Grid**.
- **Collision & Overlap Detection:** Automatic conflict detection prevents overlapping sessions on the same weekday, returning human-readable collision alerts.
- **Current Day Highlighting:** Automatically detects and highlights today's schedule in real-time.
- **Timezone Assumptions:** Stores times consistently in standard 24-hour `HH:MM` format.

### 4. Assignments & Deliverables Tracker
- **Status Lifecycle:** `To Do` ➔ `In Progress` ➔ `Completed` with single-click status cycling.
- **Overdue Computation:** Automatically identifies incomplete assignments past their due dates.
- **Multi-Criteria Filtering & Sorting:** Filter by status, course, and priority; sort by due date, priority weight, or creation time.
- **Full-Text Search:** Instant client-side search across titles, descriptions, and course codes.

### 5. Examination Countdown & Schedule
- **Imminent Highlighting:** Automatically pulses and highlights assessments occurring within 3 days.
- **Weight Allocations:** Records assessment weight percentages towards final course grades.
- **Past vs Upcoming Separation:** Dedicated tabs keep upcoming exams prioritized while preserving past records.

### 6. Attendance Compliance & Analytics
- **Standardized Academic Policy:**
  - `Attended` = Present sessions.
  - `Missed` = Absent sessions.
  - `Eligible Sessions` = Present + Absent.
  - `Excused` and `Cancelled` sessions are tracked but do not unfairly penalize student attendance.
  - **Zero-Data Safety:** Never reports a misleading 100% attendance when no sessions exist; displays an appropriate empty state.
- **Configurable Warning Threshold:** Defaults to 75.0% and visually alerts students across the dashboard, sidebar, and attendance view when falling below threshold.
- **Duplicate Protection:** Rejects duplicate entries for the same subject, date, and session name.
- **Historical Log:** Full searchable and filterable history table with date range filters.

### 7. Markdown Lecture Notes
- **Split Workspace:** Browse notes by tags or courses on the left; read or edit in place on the right.
- **Safe Markdown Rendering:** Custom renderer supports headings, blockquotes, lists, and formatted code blocks while strictly sanitizing unsafe HTML and script tags.
- **Pinning & Tagging:** Pin critical study guides to the top of your library.

### 8. Raycast-Speed Command Palette (`Ctrl+K` / `Cmd+K`)
- **Instant Search:** Debounced global search querying subjects, assignments, exams, and notes in real-time.
- **Keyboard Navigation:** Navigate with `↑` / `↓` arrows and press `Enter` to route directly to the target record.

### 9. Profile Settings & Data Backup
- **Persistent Preferences:** Student name, ID, major, week-start preference (Monday vs Sunday), and warning thresholds persist in the backend database.
- **Portable JSON Export:** One-click download of the complete database in structured JSON.
- **Transactional JSON Import:** Restores database backups inside a safe transaction with rollback protection.
- **Instant Demo Dataset:** Integrated demo seeder pre-populates realistic college coursework, timetable, assignments, exams, and attendance history.

---

## 🛠️ Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | React 19, TypeScript, Vite | Ultra-fast HMR, strict type safety, zero build overhead. |
| **Styling** | Tailwind CSS v3, Vanilla CSS | Tailored dark-mode palette (`#06090F`, `#0B0F17`, `#161F30`), subtle borders, glowing focus states. |
| **Icons** | Lucide React | Clean, modern, lightweight SVG icons. |
| **Backend** | FastAPI, Uvicorn (Python 3.11) | High-performance asynchronous API framework with automatic OpenAPI documentation. |
| **Database** | SQLite + SQLAlchemy 2.0 | Zero-configuration local database with enforced foreign keys (`PRAGMA foreign_keys=ON`) and cascade deletions. |
| **Validation** | Pydantic v2 | Strict schema validation, datetime parsing, and descriptive HTTP 400/409/422 errors. |
| **Testing** | pytest, httpx, vitest | Comprehensive 20-scenario backend suite and 11-scenario frontend suite. |

---

## 📁 Project Architecture

```
CAMPUSOS/
├── backend/
│   ├── app/
│   │   ├── api/             # FastAPI routers (subjects, sessions, assignments, exams, attendance, notes, settings, dashboard, search, backup)
│   │   ├── core/            # Configuration and SQLite SQLAlchemy database engine
│   │   ├── models/          # SQLAlchemy ORM models with cascade relationships
│   │   ├── schemas/         # Pydantic v2 validation schemas
│   │   ├── services/        # Domain logic (attendance calculator, collision detection, dashboard aggregation, backup)
│   │   └── main.py          # Application entrypoint & CORS middleware
│   └── tests/
│       ├── conftest.py      # Isolated SQLite test fixtures
│       └── test_backend.py  # 20 automated test cases
├── frontend/
│   ├── src/
│   │   ├── api/             # Type-safe API client
│   │   ├── components/      # Sidebar, Header, CommandPalette, Toast, ConfirmModal, EmptyState
│   │   ├── pages/           # Dashboard, Subjects, Timetable, Assignments, Exams, Attendance, Notes, Settings
│   │   ├── types/           # TypeScript domain definitions
│   │   ├── tests/           # Vitest frontend unit tests
│   │   ├── App.tsx          # Root orchestrator and state management
│   │   ├── main.tsx         # React root
│   │   └── index.css        # Tailwind directives and custom dark glassmorphism styles
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── .env.example
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js:** v18 or higher (v24.x recommended)
- **Python:** v3.11 or higher
- **PowerShell / Bash**

### Installation

1. **Clone or open the workspace:**
   ```powershell
   cd "C:\Users\samdh\OneDrive\Desktop\vs code\CAMPUSOS"
   ```

2. **Initialize Python Environment:**
   ```powershell
   & "C:\Program Files\Python311\python.exe" -m venv .venv
   .\.venv\Scripts\pip.exe install fastapi uvicorn sqlalchemy pydantic pydantic-settings pytest httpx python-multipart
   ```

3. **Install Frontend Dependencies:**
   ```powershell
   cd frontend
   npm install
   cd ..
   ```

---

## 💻 Running Locally

### 1. Start the Backend API (Port 8000)
```powershell
$env:PYTHONPATH="."
.\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
*The backend automatically initializes tables and populates starter demo data on first launch if the database is clean.*

Verify backend health:
- Health check: `http://127.0.0.1:8000/api/health`
- Interactive Swagger docs: `http://127.0.0.1:8000/docs`

### 2. Start the Frontend Dev Server (Port 5173)
In a separate terminal:
```powershell
cd frontend
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 🧪 Automated Testing

### Backend Tests (pytest)
Runs 20 automated tests verifying health, CRUD flows, constraints, cascade deletions, attendance formulas, overlap detection, search, and persistence:
```powershell
$env:PYTHONPATH="."
.\.venv\Scripts\python.exe -m pytest backend/tests/test_backend.py -v
```
**Result:** `20 passed, 0 failed in 1.33s`

### Frontend Tests (Vitest)
Runs 11 unit tests verifying calculations, status toggles, search filtering, timetable interval overlap detection, input validation, and markdown sanitization:
```powershell
cd frontend
npx vitest run
```
**Result:** `11 passed, 0 failed in 889ms`

### Production Build Validation
```powershell
cd frontend
npm run build
```
**Result:** `✓ built in 810ms` (Zero TypeScript or bundling errors).

---

## 📊 Attendance Calculation & Assumptions

1. **Formula:**
   $$\text{Attendance Rate} = \left(\frac{\text{Attended (Present)}}{\text{Attended (Present)} + \text{Missed (Absent)}}\right) \times 100$$
2. **Cancelled Classes:** Excluded from the denominator because no session took place.
3. **Excused Absences:** Logged as approved medical/institutional leave; does not penalize the student's standing.
4. **Empty State Rule:** If a course has 0 logged sessions, attendance is `null` / `N/A`. It will **never** falsely report 100%.
5. **Warning Threshold:** If a subject's rate drops below the student's configured threshold (default `75.0%`), warning badges and notifications trigger immediately.

---

## 🔒 Security & Local-First Notes

- **SQL Injection Prevention:** All database operations utilize SQLAlchemy's parameterized queries.
- **XSS & Markdown Sanitization:** Markdown rendering strips unsafe `<script>`, `<iframe>`, and `javascript:` tags.
- **Single-User Scope:** CampusOS is designed as a high-performance local academic dashboard for an individual student. It is not currently configured for multi-tenant public cloud deployment without authentication.

---

## 📄 License
MIT License. Built for students who demand excellence.
