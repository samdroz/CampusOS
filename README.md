# CampusOS — Local-First Student Life Management Platform

**CampusOS** is a free, open-source, local-first academic operating system designed for college and university students. It consolidates enrolled courses, timetables, assignment deadlines, exam countdowns, attendance compliance, and lecture notes into a single high-performance desktop workspace.

Unlike traditional cloud-based student portals, CampusOS runs entirely on your own computer. All academic records, schedules, and notes remain stored locally in an offline SQLite database—no mandatory cloud accounts, subscriptions, or external telemetry required.

---

## 🌟 Key Features

- **Centralized Academic Dashboard:** Real-time visibility into today's class schedule, urgent assignment deadlines, upcoming exam dates, and cumulative attendance compliance.
- **Course & Subject Catalog:** Manage enrolled courses with custom color coding, course codes, credit allocations, and instructor contact details.
- **Interactive Timetable:** Day and weekly calendar views featuring conflict and overlap detection to prevent double-booking lecture sessions.
- **Assignment & Deadline Tracker:** Track deliverables across courses with priority indicators (low, medium, high), completion statuses, and automatic overdue calculations.
- **Exam Countdown & Weightage Tracker:** Stay prepared with days-remaining countdowns, imminent examination alerts (within 3 days), and assessment weightages.
- **Attendance Analytics & Compliance:** Record sessions as *Attended*, *Missed*, *Cancelled*, or *Excused*. Automatically calculates your compliance against an institutional attendance threshold (e.g., 75%) and calculates how many classes you can afford to miss or need to attend to stay compliant.
- **Markdown Lecture Notes:** Focused lecture notes editor with live split-screen preview, tag organization, and instant search.
- **Command Palette (`Ctrl+K`):** Raycast-style keyboard launcher to quickly search courses, assignments, exams, and notes from anywhere in the app.
- **First-Launch Setup Wizard:** An interactive 4-step onboarding flow that configures your student profile, degree details, enrolled subjects, and attendance goals on first run.
- **Local Data Management:** Export full JSON snapshots of your academic history, restore verified backups with transactional validation, or reset data with explicit double-confirmation.
- **Polished Theme Support:** Modern Dark and Light themes with fluid academic navigation transitions and accessible contrast.

---

## 🖼️ Screenshots

> **Note:** Official interface screenshots will be attached to the GitHub Releases page upon publication of the v1.0.0 release.
>
> *(To preview the UI during development, see the developer setup instructions below or build the application locally.)*

---

## 💻 Technology Stack

CampusOS is engineered as a modern, local-first desktop application combining a reactive frontend with a robust embedded backend sidecar:

| Layer | Technologies |
| :--- | :--- |
| **Frontend Application** | React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons |
| **Backend API Engine** | FastAPI, Python 3.11, Pydantic v2, Uvicorn |
| **Database & Persistence** | SQLite, SQLAlchemy ORM |
| **Desktop Packaging** | PyInstaller (standalone backend executable), C# / .NET (native Windows launcher) |
| **Installer & Distribution** | NSIS (Nullsoft Scriptable Install System), Tauri 2 configuration |
| **Automated Testing** | pytest, pytest-asyncio (backend), Vitest, Testing Library (frontend) |

---

## 📦 Installation (Windows)

CampusOS is distributed as a standalone Windows desktop application. End users **do not need** to install Python, Node.js, or any external database.

### Step-by-Step Instructions:

1. Navigate to the **Releases** section on this GitHub repository.
2. Under the **v1.0.0** release assets, locate and download the installer executable:
   ```
   CampusOS_1.0.0_Setup.exe
   ```
3. Double-click `CampusOS_1.0.0_Setup.exe` to run the installation wizard.
   - *Note:* If Windows Defender SmartScreen displays a warning ("Windows protected your PC"), click **More info** followed by **Run anyway**. This is standard for newly released, unsigned open-source installers.
4. Follow the setup prompts to choose your destination directory (defaults to `%LOCALAPPDATA%\Programs\CampusOS`).
5. Once installation finishes, launch **CampusOS** from your Desktop shortcut or Start Menu.

---

## 🎓 First-Launch Setup & Usage

When you open CampusOS for the first time, the **CampusOS Setup Wizard** guides you through initial configuration:

1. **Welcome Screen:** Overview of the application and confirmation of local-first privacy. Click **Start Setup** to begin, or **Skip for Now** to explore the empty dashboard immediately.
2. **Personal Profile (Step 1):** Enter your Full Name (used to personalize greetings) and optional identifiers such as Roll Number, Register Number, or Student Email.
3. **Academic Profile (Step 2):** Enter your University or Institution name, Degree (e.g., B.Tech, B.S., M.S.), Department/Major, Admission Year, Current Academic Year, and Current Semester.
4. **Academic Setup (Step 3):**
   - Adjust your minimum **Attendance Target** slider (defaults to 75%).
   - Quickly enroll your current subjects (name, course code, credits, instructor).
   - Optionally add your first upcoming assignment deadline and examination date.
5. **Review & Finish (Step 4):** Review your profile summary and click **Finish Setup**. Your profile and subjects are saved into the local database, and you are welcomed into your active dashboard.

You can modify any of these details or add new subjects at any time from the **Subjects** and **Settings** pages.

---

## 🔒 Data Storage & Privacy

CampusOS adheres to a local-first privacy model:

1. **Local Database Location:** All profile details, courses, timetable entries, assignments, exams, attendance logs, and notes are stored strictly on your local machine:
   - **Installed Windows Application:**  
     `%APPDATA%\CampusOS\campusos.db`  
     *(typically `C:\Users\<YourUsername>\AppData\Roaming\CampusOS\campusos.db`)*
   - **Local Development Environment:**  
     `./campusos.db` *(within the repository root)*
2. **Strictly Local Network Interface:** The embedded backend sidecar binds exclusively to loopback (`127.0.0.1`) on a dynamically negotiated ephemeral port. It does not accept connections from external networks.
3. **Zero External Tracking:** The application transmits zero telemetry, analytical data, or student records to cloud servers.
4. **Data Backup & Portability:**
   - Go to **Settings** > **Data Management** to generate an atomic JSON backup file (`campusos_backup_*.json`) containing all your academic records.
   - You can restore this backup on another computer or after an OS reinstall. The import process validates schemas transactionally before committing changes.
5. **Security Notice:** Data stored in the SQLite database is unencrypted at rest on your hard drive. Standard computer security practices (such as account passwords and full-disk encryption like Windows BitLocker) are recommended to safeguard your files.

---

## 🖥️ System Requirements

- **Operating System:** Windows 10 (64-bit) or Windows 11 (64-bit).
- **RAM:** 2 GB minimum (4 GB recommended).
- **Disk Space:** Approximately 100 MB for installation and application data.
- **Webview Engine:** Microsoft Edge WebView2 / Edge browser (standard on all modern Windows 10 and 11 installations).
- **External Dependencies:** None required for the packaged installer.

---

## 🛠️ Developer Setup & Local Development

If you wish to contribute to CampusOS or run it directly from source code, follow these instructions:

### Prerequisites
- **Python:** 3.11 or higher
- **Node.js:** 20.x or higher (`npm` 10+)
- **Git**

### 1. Clone the Repository
```powershell
git clone https://github.com/samdroz/CampusOS.git
cd CampusOS
```

### 2. Configure Backend Environment
```powershell
# Create and activate Python virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install backend dependencies
pip install -r backend/requirements.txt
```

### 3. Configure Frontend Environment
```powershell
cd frontend
npm install
cd ..
```

### 4. Running the Development Servers
Open two terminal windows:

**Terminal 1 — Backend API (FastAPI):**
```powershell
.\.venv\Scripts\Activate.ps1
$env:PYTHONPATH="."
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
Interactive API documentation will be available at `http://127.0.0.1:8000/docs`.

**Terminal 2 — Frontend Dev Server (Vite):**
```powershell
cd frontend
npm run dev
```
Open `http://localhost:5173` in your browser.

### 5. Running the Local Desktop App Directly
To run the local desktop environment without opening browser tabs manually:
```powershell
.\launch_desktop.ps1
```
*(Or use `launch_desktop.bat` from Command Prompt).*

---

## 🏗️ Building the Windows Desktop Installer

To produce the standalone Windows installer locally:

### Build Prerequisites:
- Python 3.11 with `pyinstaller` installed in your virtual environment.
- Node.js 20+ and npm.
- Microsoft .NET Framework (includes `csc.exe` for the launcher).
- NSIS 3.x (`makensis.exe`) installed on your system.

### Build Command:
```powershell
powershell -ExecutionPolicy Bypass -File .\build_desktop.ps1
```

### Build Outputs (in `dist/`):
- `dist\CampusOS_1.0.0_Setup.exe` — The full NSIS standalone installer.
- `dist\CampusOS.exe` — The native Windows launcher executable.
- `dist\campusos-backend.exe` — Standalone backend sidecar executable with embedded static frontend.

---

## 🧪 Automated Testing

CampusOS includes comprehensive automated test suites for both frontend and backend.

### Running Backend Tests
From the project root:
```powershell
$env:PYTHONPATH="."
.\.venv\Scripts\python.exe -m pytest backend/tests/ -v
```
*Executes 31 automated tests verifying:*
- Health check endpoints and dynamic port negotiation.
- Subject, session, timetable, assignment, exam, attendance, and notes CRUD.
- Schedule overlap detection and attendance percentage calculations.
- First-launch student profile creation, onboarding completion, and skip flows.
- Database persistence across restarts and transactional JSON backup/restore.

### Running Frontend Tests
From the `frontend/` directory:
```powershell
cd frontend
npm run test
```
*Executes 30 automated tests in Vitest verifying:*
- Onboarding modal rendering and multi-step wizard navigation.
- Subject creation, exam input, and attendance slider validations.
- Theme switching, command palette hotkey (`Ctrl+K`), and keyboard accessibility.
- Empty states, toast notifications, and confirm dialog behavior.

---

## 📁 Project Structure

```
CAMPUSOS/
├── .github/
│   └── workflows/
│       └── release.yml          # GitHub Actions CI/CD release workflow
├── backend/
│   ├── app/
│   │   ├── api/                 # FastAPI route handlers (subjects, profile, etc.)
│   │   ├── core/                # Database config & AppData path resolution
│   │   ├── models/              # SQLAlchemy database models
│   │   ├── schemas/             # Pydantic validation schemas
│   │   ├── services/            # Business logic (attendance, timetable, backup)
│   │   └── main.py              # Application entrypoint & static mounting
│   ├── tests/
│   │   └── test_backend.py      # Automated pytest suite (31 tests)
│   ├── desktop_entry.py         # PyInstaller desktop sidecar launcher
│   └── requirements.txt         # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── api/                 # Type-safe API client
│   │   ├── components/          # Reusable UI components & modals
│   │   ├── pages/               # Feature pages (Dashboard, Timetable, etc.)
│   │   ├── tests/               # Vitest frontend test suite (30 tests)
│   │   ├── types/               # TypeScript domain interfaces
│   │   ├── App.tsx              # Root application container & navigation
│   │   └── main.tsx             # React DOM mounting
│   ├── src-tauri/               # Tauri 2 configuration and icons
│   ├── package.json             # Frontend dependencies & build scripts
│   └── vite.config.ts           # Vite bundler configuration
├── installer/
│   └── CampusOS.nsi             # NSIS installer definition script
├── launcher/
│   └── Program.cs               # C# .NET native Windows desktop launcher
├── build_desktop.ps1            # Standalone desktop build script (PowerShell)
├── build_desktop.bat            # Standalone desktop build script (Batch)
├── launch_desktop.ps1           # Desktop launch script (PowerShell)
├── launch_desktop.bat           # Desktop launch script (Batch)
├── LICENSE                      # MIT License
└── README.md                    # Public documentation
```

---

## 🔧 Troubleshooting

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **SmartScreen warning during install** | Installer is freshly built and not code-signed. | Click **More info** and select **Run anyway**. The source code is 100% public and open-source. |
| **Port conflict on startup** | Port 18420 is in use by another local application. | CampusOS automatically tests and binds to the next available ephemeral port on `127.0.0.1`. No user action needed. |
| **Startup handshake timeout** | Backend sidecar was delayed starting or blocked by security software. | Inspect `%APPDATA%\CampusOS\logs\backend.log` and `%APPDATA%\CampusOS\logs\onboarding-debug.log` for error details. Ensure `campusos-backend.exe` is permitted to run locally. |
| **Accidental data loss or corruption** | Hard drive failure or accidental file modification. | Use **Settings > Data Management > Export Data Backup** regularly to store JSON snapshots. Backups can be restored at any time. |
| **Restoring default state** | You want a completely clean slate. | Open **Settings**, scroll to **Data Management**, and select **Reset Local Data** (requires typing `RESET` to confirm). |

---

## 📄 License & Contributions

CampusOS is open-source software licensed under the **MIT License**. See the [LICENSE](LICENSE) file for complete details.

Contributions, bug reports, and feature requests are welcome! If you encounter an issue or have an idea for improving student academic life, please open an issue or pull request on GitHub.

---

## ⚖️ Disclaimer

CampusOS is an independent, open-source student productivity application. It is not affiliated with, endorsed by, or sponsored by any university, college, educational institution, or commercial software provider. All academic data entered into the application remains solely the property and responsibility of the user.
