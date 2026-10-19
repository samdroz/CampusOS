from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator, ConfigDict
import re

# Time and Date validation regex
TIME_REGEX = re.compile(r"^([01]\d|2[0-3]):([0-5]\d)$")
DATE_REGEX = re.compile(r"^\d{4}-\d{2}-\d{2}$")
HEX_COLOR_REGEX = re.compile(r"^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$")


# ===================== SUBJECT SCHEMAS =====================
class SubjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    code: str = Field(..., min_length=1, max_length=30)
    description: Optional[str] = None
    color: str = Field(default="#6366F1")
    instructor: Optional[str] = None
    credits: int = Field(default=3, ge=0, le=30)

    @field_validator("code")
    @classmethod
    def validate_code(cls, v: str) -> str:
        clean = v.strip().upper()
        if not clean:
            raise ValueError("Subject code cannot be empty")
        return clean

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        clean = v.strip()
        if not clean:
            raise ValueError("Subject name cannot be empty")
        return clean

    @field_validator("color")
    @classmethod
    def validate_color(cls, v: str) -> str:
        v = v.strip()
        if not HEX_COLOR_REGEX.match(v):
            return "#6366F1"  # Default fallback if invalid hex
        return v


class SubjectCreate(SubjectBase):
    pass


class SubjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    code: Optional[str] = Field(None, min_length=1, max_length=30)
    description: Optional[str] = None
    color: Optional[str] = None
    instructor: Optional[str] = None
    credits: Optional[int] = Field(None, ge=0, le=30)

    @field_validator("code")
    @classmethod
    def validate_code(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            clean = v.strip().upper()
            if not clean:
                raise ValueError("Subject code cannot be empty")
            return clean
        return v

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            clean = v.strip()
            if not clean:
                raise ValueError("Subject name cannot be empty")
            return clean
        return v


class SubjectOut(SubjectBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ===================== CLASS SESSION (TIMETABLE) SCHEMAS =====================
class ClassSessionBase(BaseModel):
    subject_id: int
    day_of_week: int = Field(..., ge=0, le=6, description="0=Monday, 6=Sunday")
    start_time: str = Field(..., description="HH:MM format, e.g. 09:00")
    end_time: str = Field(..., description="HH:MM format, e.g. 10:30")
    room: Optional[str] = None
    instructor: Optional[str] = None
    session_type: str = Field(default="Lecture")

    @field_validator("start_time", "end_time")
    @classmethod
    def validate_time_format(cls, v: str) -> str:
        v = v.strip()
        if not TIME_REGEX.match(v):
            raise ValueError("Time must be in 24-hour HH:MM format (e.g. 09:30 or 14:00)")
        return v


class ClassSessionCreate(ClassSessionBase):
    @field_validator("end_time")
    @classmethod
    def validate_end_after_start(cls, v: str, info) -> str:
        start = info.data.get("start_time")
        if start and v <= start:
            raise ValueError("End time must be strictly after start time")
        return v


class ClassSessionUpdate(BaseModel):
    subject_id: Optional[int] = None
    day_of_week: Optional[int] = Field(None, ge=0, le=6)
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    room: Optional[str] = None
    instructor: Optional[str] = None
    session_type: Optional[str] = None

    @field_validator("start_time", "end_time")
    @classmethod
    def validate_time_format(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not TIME_REGEX.match(v):
                raise ValueError("Time must be in 24-hour HH:MM format")
            return v
        return v


class ClassSessionOut(ClassSessionBase):
    id: int
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    subject_color: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ===================== ASSIGNMENT SCHEMAS =====================
class AssignmentBase(BaseModel):
    subject_id: int
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    due_date: str = Field(..., description="ISO Date or DateTime string")
    priority: str = Field(default="medium", pattern="^(low|medium|high|urgent)$")
    status: str = Field(default="todo", pattern="^(todo|in_progress|completed)$")

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        clean = v.strip()
        if not clean:
            raise ValueError("Assignment title cannot be empty")
        return clean


class AssignmentCreate(AssignmentBase):
    pass


class AssignmentUpdate(BaseModel):
    subject_id: Optional[int] = None
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    due_date: Optional[str] = None
    priority: Optional[str] = Field(None, pattern="^(low|medium|high|urgent)$")
    status: Optional[str] = Field(None, pattern="^(todo|in_progress|completed)$")


class AssignmentOut(AssignmentBase):
    id: int
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    subject_color: Optional[str] = None
    is_overdue: bool = False

    model_config = ConfigDict(from_attributes=True)


# ===================== EXAM SCHEMAS =====================
class ExamBase(BaseModel):
    subject_id: int
    title: str = Field(..., min_length=1, max_length=200)
    exam_date: str = Field(..., description="YYYY-MM-DD")
    start_time: str = Field(..., description="HH:MM format")
    end_time: Optional[str] = None
    location: Optional[str] = None
    weight: Optional[float] = Field(None, ge=0, le=100)
    notes: Optional[str] = None

    @field_validator("exam_date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        v = v.strip()
        if not DATE_REGEX.match(v):
            raise ValueError("Exam date must be in YYYY-MM-DD format")
        return v

    @field_validator("start_time")
    @classmethod
    def validate_start_time(cls, v: str) -> str:
        v = v.strip()
        if not TIME_REGEX.match(v):
            raise ValueError("Start time must be in HH:MM format")
        return v

    @field_validator("end_time")
    @classmethod
    def validate_end_time(cls, v: Optional[str]) -> Optional[str]:
        if v:
            v = v.strip()
            if not TIME_REGEX.match(v):
                raise ValueError("End time must be in HH:MM format")
            return v
        return v


class ExamCreate(ExamBase):
    pass


class ExamUpdate(BaseModel):
    subject_id: Optional[int] = None
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    exam_date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    location: Optional[str] = None
    weight: Optional[float] = Field(None, ge=0, le=100)
    notes: Optional[str] = None

    @field_validator("exam_date")
    @classmethod
    def validate_date(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not DATE_REGEX.match(v):
                raise ValueError("Exam date must be in YYYY-MM-DD format")
            return v
        return v


class ExamOut(ExamBase):
    id: int
    created_at: datetime
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    subject_color: Optional[str] = None
    days_remaining: int = 0
    is_imminent: bool = False  # e.g. within 3 days
    is_past: bool = False

    model_config = ConfigDict(from_attributes=True)


# ===================== ATTENDANCE SCHEMAS =====================
class AttendanceRecordBase(BaseModel):
    subject_id: int
    date: str = Field(..., description="YYYY-MM-DD")
    status: str = Field(default="present", pattern="^(present|absent|excused|cancelled)$")
    session_name: str = Field(default="Regular Class", max_length=80)
    notes: Optional[str] = None

    @field_validator("date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        v = v.strip()
        if not DATE_REGEX.match(v):
            raise ValueError("Attendance date must be in YYYY-MM-DD format")
        return v


class AttendanceRecordCreate(AttendanceRecordBase):
    pass


class AttendanceRecordUpdate(BaseModel):
    status: Optional[str] = Field(None, pattern="^(present|absent|excused|cancelled)$")
    session_name: Optional[str] = Field(None, max_length=80)
    notes: Optional[str] = None


class AttendanceRecordOut(AttendanceRecordBase):
    id: int
    created_at: datetime
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    subject_color: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class SubjectAttendanceStats(BaseModel):
    subject_id: int
    subject_name: str
    subject_code: str
    subject_color: str
    attended: int
    absent: int
    excused: int
    cancelled: int
    total_eligible: int  # attended + absent (cancelled excluded, excused can be counted or excluded)
    percentage: Optional[float] = None  # None if total_eligible == 0
    is_warning: bool = False  # percentage < threshold


class OverallAttendanceSummary(BaseModel):
    total_attended: int
    total_absent: int
    total_excused: int
    total_cancelled: int
    total_eligible: int
    overall_percentage: Optional[float] = None
    is_warning: bool = False
    warning_threshold: float = 75.0
    subjects: List[SubjectAttendanceStats]


# ===================== NOTE SCHEMAS =====================
class NoteBase(BaseModel):
    subject_id: Optional[int] = None
    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=1)
    tags: Optional[str] = None
    is_pinned: bool = False

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        clean = v.strip()
        if not clean:
            raise ValueError("Note title cannot be empty")
        return clean


class NoteCreate(NoteBase):
    pass


class NoteUpdate(BaseModel):
    subject_id: Optional[int] = None
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    content: Optional[str] = None
    tags: Optional[str] = None
    is_pinned: Optional[bool] = None


class NoteOut(NoteBase):
    id: int
    created_at: datetime
    updated_at: datetime
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    subject_color: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ===================== SETTINGS SCHEMAS =====================
class SettingsMap(BaseModel):
    student_name: str = "Alex Morgan"
    student_id: Optional[str] = "STU-8829"
    major: Optional[str] = "Computer Science"
    attendance_threshold: float = 75.0
    week_start: str = "monday"  # monday | sunday
    theme: str = "dark"
    enable_notifications: bool = True


# ===================== DASHBOARD & SEARCH SCHEMAS =====================
class NextClassInfo(BaseModel):
    id: int
    subject_id: int
    subject_name: str
    subject_code: str
    subject_color: str
    day_of_week: int
    start_time: str
    end_time: str
    room: Optional[str] = None
    instructor: Optional[str] = None
    session_type: str = "Lecture"
    is_today: bool = False


class DashboardOverview(BaseModel):
    student_name: str
    pending_assignments_count: int
    overdue_assignments_count: int
    completed_assignments_count: int
    upcoming_exams_count: int
    total_subjects_count: int
    overall_attendance_percentage: Optional[float] = None
    attendance_is_warning: bool = False
    warning_threshold: float = 75.0
    next_class: Optional[NextClassInfo] = None
    today_sessions: List[ClassSessionOut] = []
    upcoming_deadlines: List[AssignmentOut] = []
    upcoming_exams: List[ExamOut] = []
    recent_notes: List[NoteOut] = []
    subject_attendance: List[SubjectAttendanceStats] = []


class SearchItem(BaseModel):
    entity_type: str  # subject, assignment, exam, note
    id: int
    title: str
    subtitle: Optional[str] = None
    badge: Optional[str] = None
    color: Optional[str] = None
    url: str


class SearchResult(BaseModel):
    query: str
    results: List[SearchItem]
