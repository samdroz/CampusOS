from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Float, DateTime, ForeignKey, UniqueConstraint
)
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    code = Column(String(30), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    color = Column(String(20), default="#6366F1", nullable=False)
    instructor = Column(String(120), nullable=True)
    credits = Column(Integer, default=3, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships with cascade delete
    sessions = relationship("ClassSession", back_populates="subject", cascade="all, delete-orphan", passive_deletes=True)
    assignments = relationship("Assignment", back_populates="subject", cascade="all, delete-orphan", passive_deletes=True)
    exams = relationship("Exam", back_populates="subject", cascade="all, delete-orphan", passive_deletes=True)
    attendance_records = relationship("AttendanceRecord", back_populates="subject", cascade="all, delete-orphan", passive_deletes=True)
    notes = relationship("Note", back_populates="subject", cascade="all, delete-orphan", passive_deletes=True)


class ClassSession(Base):
    __tablename__ = "class_sessions"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    day_of_week = Column(Integer, nullable=False)  # 0=Monday, ..., 6=Sunday
    start_time = Column(String(10), nullable=False)  # "09:00"
    end_time = Column(String(10), nullable=False)    # "10:30"
    room = Column(String(50), nullable=True)
    instructor = Column(String(120), nullable=True)
    session_type = Column(String(50), default="Lecture", nullable=False)

    subject = relationship("Subject", back_populates="sessions")


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(String(30), nullable=False, index=True)  # YYYY-MM-DD or YYYY-MM-DDTHH:MM
    priority = Column(String(20), default="medium", nullable=False)  # urgent, high, medium, low
    status = Column(String(20), default="todo", nullable=False, index=True)  # todo, in_progress, completed
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    subject = relationship("Subject", back_populates="assignments")


class Exam(Base):
    __tablename__ = "exams"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    exam_date = Column(String(20), nullable=False, index=True)  # YYYY-MM-DD
    start_time = Column(String(10), nullable=False)            # "14:00"
    end_time = Column(String(10), nullable=True)               # "16:00"
    location = Column(String(100), nullable=True)
    weight = Column(Float, nullable=True)                      # e.g. 30.0 for 30%
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    subject = relationship("Subject", back_populates="exams")


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(String(20), nullable=False, index=True)  # YYYY-MM-DD
    status = Column(String(20), default="present", nullable=False)  # present, absent, excused, cancelled
    session_name = Column(String(80), default="Regular Class", nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("subject_id", "date", "session_name", name="uq_subject_date_session"),
    )

    subject = relationship("Subject", back_populates="attendance_records")


class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    tags = Column(String(255), nullable=True)  # Comma separated
    is_pinned = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    subject = relationship("Subject", back_populates="notes")


class Setting(Base):
    __tablename__ = "settings"

    key = Column(String(50), primary_key=True)
    value = Column(Text, nullable=False)


class StudentProfile(Base):
    __tablename__ = "student_profile"

    id = Column(Integer, primary_key=True, default=1)
    # Personal profile
    full_name = Column(String(120), nullable=False)
    preferred_name = Column(String(120), nullable=True)
    roll_number = Column(String(50), nullable=True)
    register_number = Column(String(50), nullable=True)
    email = Column(String(120), nullable=True)

    # Academic profile
    institution = Column(String(200), nullable=True)
    degree = Column(String(100), nullable=True)
    department = Column(String(150), nullable=True)
    admission_year = Column(String(20), nullable=True)
    academic_year = Column(String(20), nullable=True)
    semester = Column(String(20), nullable=True)
    university = Column(String(200), nullable=True)

    # Academic Setup / Preferences
    attendance_target = Column(Float, default=75.0, nullable=False)
    onboarding_completed = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
