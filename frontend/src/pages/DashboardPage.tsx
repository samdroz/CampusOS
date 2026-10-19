import React from 'react';
import {
  Calendar,
  Clock,
  CheckSquare,
  UserCheck,
  BookOpen,
  FileText,
  ChevronRight,
  CheckCircle2,
  Circle,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { DashboardOverview, Assignment } from '../types';
import { AcademicLoader } from '../components/AcademicLoader';

interface DashboardPageProps {
  data: DashboardOverview | null;
  loading: boolean;
  onNavigate: (page: string) => void;
  onQuickAction: (actionType: 'assignment' | 'note' | 'attendance' | 'subject') => void;
  onToggleAssignmentComplete: (assignment: Assignment) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  data,
  loading,
  onNavigate,
  onQuickAction,
  onToggleAssignmentComplete,
}) => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  if (loading && !data) {
    return (
      <div className="p-4 sm:p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[50vh]">
        <AcademicLoader module="dashboard" size="lg" message="Organizing your semester workspace..." />
      </div>
    );
  }

  const attendancePct = data?.overall_attendance_percentage;
  const isAttendanceWarning = data?.attendance_is_warning;

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Compact Welcome Header */}
      <div className="app-panel rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-txt-primary tracking-tight">
            {data?.student_name ? `Welcome back, ${data.student_name}` : 'Welcome to CampusOS'}
          </h2>
          <p className="text-xs text-txt-secondary mt-0.5">
            {currentDate} · {data?.pending_assignments_count || 0} active assignments · {data?.upcoming_exams_count || 0} exams scheduled
          </p>
        </div>

        {/* Minimal Quick Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onQuickAction('assignment')}
            className="px-3 py-1.5 text-xs font-medium text-white bg-accent hover:bg-accent-hover rounded-lg transition-colors flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Assignment</span>
          </button>
          <button
            onClick={() => onQuickAction('attendance')}
            className="px-3 py-1.5 text-xs font-medium text-txt-primary bg-surface-elevated hover:bg-surface-hover border border-border-subtle rounded-lg transition-colors"
          >
            Attendance
          </button>
          <button
            onClick={() => onQuickAction('note')}
            className="px-3 py-1.5 text-xs font-medium text-txt-primary bg-surface-elevated hover:bg-surface-hover border border-border-subtle rounded-lg transition-colors"
          >
            Note
          </button>
        </div>
      </div>

      {/* 4 Consistent, Restrained Summary Cards (No rainbow decoration) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Attendance Metric */}
        <div
          onClick={() => onNavigate('attendance')}
          className="app-card p-4 rounded-xl cursor-pointer hover:border-border-default group"
        >
          <div className="flex items-center justify-between text-xs text-txt-muted">
            <span className="font-medium">Attendance</span>
            <UserCheck className="w-4 h-4 text-txt-muted group-hover:text-txt-primary transition-colors" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-txt-primary font-mono">
              {attendancePct !== null && attendancePct !== undefined ? `${attendancePct}%` : 'N/A'}
            </span>
            {isAttendanceWarning && (
              <span className="text-[10px] font-semibold text-semantic-danger flex items-center space-x-0.5">
                <AlertCircle className="w-3 h-3" />
                <span>&lt;{data?.warning_threshold}%</span>
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-txt-muted">Overall compliance</p>
        </div>

        {/* Pending Work Metric */}
        <div
          onClick={() => onNavigate('assignments')}
          className="app-card p-4 rounded-xl cursor-pointer hover:border-border-default group"
        >
          <div className="flex items-center justify-between text-xs text-txt-muted">
            <span className="font-medium">Pending Tasks</span>
            <CheckSquare className="w-4 h-4 text-txt-muted group-hover:text-txt-primary transition-colors" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-txt-primary font-mono">
              {data?.pending_assignments_count || 0}
            </span>
            {(data?.overdue_assignments_count || 0) > 0 && (
              <span className="text-[10px] font-semibold text-semantic-danger">
                {data?.overdue_assignments_count} overdue
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-txt-muted">
            {data?.completed_assignments_count || 0} completed
          </p>
        </div>

        {/* Upcoming Examinations */}
        <div
          onClick={() => onNavigate('exams')}
          className="app-card p-4 rounded-xl cursor-pointer hover:border-border-default group"
        >
          <div className="flex items-center justify-between text-xs text-txt-muted">
            <span className="font-medium">Examinations</span>
            <Clock className="w-4 h-4 text-txt-muted group-hover:text-txt-primary transition-colors" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-txt-primary font-mono">
              {data?.upcoming_exams_count || 0}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-txt-muted">
            {data?.upcoming_exams && data.upcoming_exams.length > 0
              ? `Next in ${data.upcoming_exams[0].days_remaining}d`
              : 'None scheduled'}
          </p>
        </div>

        {/* Active Courses */}
        <div
          onClick={() => onNavigate('subjects')}
          className="app-card p-4 rounded-xl cursor-pointer hover:border-border-default group"
        >
          <div className="flex items-center justify-between text-xs text-txt-muted">
            <span className="font-medium">Courses</span>
            <BookOpen className="w-4 h-4 text-txt-muted group-hover:text-txt-primary transition-colors" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-txt-primary font-mono">
              {data?.total_subjects_count || 0}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-txt-muted">Enrolled subjects</p>
        </div>
      </div>

      {/* Main Grid: Prominent Next Class & Upcoming Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column (2 cols): Next Class & Deadlines */}
        <div className="lg:col-span-2 space-y-5">
          {/* Next Class Hero Card */}
          {data?.next_class ? (
            <div className="app-panel rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-l-2 border-l-accent">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-accent uppercase tracking-wider">
                    {data.next_class.is_today ? "Today's Next Class" : 'Next Class Session'}
                  </span>
                  <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-surface-elevated text-txt-secondary border border-border-subtle">
                    {data.next_class.session_type}
                  </span>
                </div>
                <h3 className="text-base font-bold text-txt-primary mt-1">
                  {data.next_class.subject_name}
                </h3>
                <p className="text-xs text-txt-secondary mt-0.5">
                  <span className="font-mono font-medium text-txt-primary">
                    {data.next_class.start_time} - {data.next_class.end_time}
                  </span>
                  {data.next_class.room && ` · Room ${data.next_class.room}`}
                  {data.next_class.instructor && ` · ${data.next_class.instructor}`}
                </p>
              </div>

              <button
                onClick={() => onNavigate('timetable')}
                className="px-3 py-1.5 text-xs font-medium text-txt-primary bg-surface-elevated hover:bg-surface-hover border border-border-subtle rounded-lg transition-colors self-start sm:self-auto shrink-0"
              >
                View Timetable
              </button>
            </div>
          ) : (
            <div className="app-panel rounded-xl p-4 text-center text-xs text-txt-muted">
              No classes scheduled for today.{' '}
              <button
                onClick={() => onNavigate('timetable')}
                className="text-accent hover:underline font-medium ml-1"
              >
                View full schedule
              </button>
            </div>
          )}

          {/* Upcoming Deadlines */}
          <div className="app-panel rounded-xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <h3 className="text-sm font-semibold text-txt-primary">Upcoming Deadlines</h3>
              <button
                onClick={() => onNavigate('assignments')}
                className="text-xs text-accent hover:underline font-medium flex items-center space-x-1"
              >
                <span>View all ({data?.pending_assignments_count || 0})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {(!data?.upcoming_deadlines || data.upcoming_deadlines.length === 0) ? (
              <p className="text-xs text-txt-muted py-6 text-center">
                All assignments completed. Great job staying ahead!
              </p>
            ) : (
              <div className="divide-y divide-border-subtle">
                {data.upcoming_deadlines.map((item) => {
                  let priorityLabel = item.priority;
                  let priorityClass = 'text-txt-muted';
                  if (item.priority === 'urgent') priorityClass = 'text-semantic-danger font-semibold';
                  else if (item.priority === 'high') priorityClass = 'text-semantic-warning font-semibold';

                  return (
                    <div
                      key={item.id}
                      className="py-2.5 flex items-center justify-between hover:bg-surface-elevated/40 px-2 rounded-lg transition-colors group"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <button
                          onClick={() => onToggleAssignmentComplete(item)}
                          className="text-txt-muted hover:text-accent transition-colors shrink-0"
                          title="Mark completed"
                        >
                          <Circle className="w-4 h-4" />
                        </button>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-txt-primary truncate">
                            {item.title}
                          </p>
                          <p className="text-xs text-txt-secondary flex items-center space-x-1.5 mt-0.5">
                            <span className="font-mono text-[11px] font-semibold text-txt-primary">
                              {item.subject_code}
                            </span>
                            <span>·</span>
                            <span className={item.is_overdue ? 'text-semantic-danger font-medium' : ''}>
                              Due {item.due_date.slice(0, 10)}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0 ml-3">
                        {item.is_overdue && (
                          <span className="text-[10px] font-medium text-semantic-danger px-1.5 py-0.2 rounded bg-semantic-danger-subtle">
                            Overdue
                          </span>
                        )}
                        <span className={`text-[10px] uppercase tracking-wider font-mono ${priorityClass}`}>
                          {priorityLabel}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 col): Exams & Today's Schedule */}
        <div className="space-y-5">
          {/* Upcoming Exams Countdown */}
          <div className="app-panel rounded-xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <h3 className="text-sm font-semibold text-txt-primary">Exam Countdown</h3>
              <button
                onClick={() => onNavigate('exams')}
                className="text-xs text-accent hover:underline font-medium"
              >
                All Exams
              </button>
            </div>

            {(!data?.upcoming_exams || data.upcoming_exams.length === 0) ? (
              <p className="text-xs text-txt-muted py-4 text-center">No upcoming examinations.</p>
            ) : (
              <div className="space-y-2">
                {data.upcoming_exams.map((e) => (
                  <div
                    key={e.id}
                    className="p-2.5 rounded-lg border border-border-subtle bg-surface text-xs space-y-1 hover:border-border-default transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-txt-primary truncate mr-2">{e.title}</span>
                      <span className={`font-mono text-[11px] font-bold shrink-0 ${
                        e.days_remaining <= 1 ? 'text-semantic-danger' : e.is_imminent ? 'text-semantic-warning' : 'text-accent'
                      }`}>
                        {e.days_remaining === 0 ? 'Today' : e.days_remaining === 1 ? 'Tomorrow' : `${e.days_remaining}d`}
                      </span>
                    </div>
                    <p className="text-txt-muted text-[11px]">
                      {e.subject_code} · {e.exam_date} at {e.start_time}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's Schedule */}
          <div className="app-panel rounded-xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <h3 className="text-sm font-semibold text-txt-primary">Today's Sessions</h3>
              <button
                onClick={() => onNavigate('timetable')}
                className="text-xs text-accent hover:underline font-medium"
              >
                Timetable
              </button>
            </div>

            {(!data?.today_sessions || data.today_sessions.length === 0) ? (
              <p className="text-xs text-txt-muted py-4 text-center">No classes today.</p>
            ) : (
              <div className="space-y-2">
                {data.today_sessions.map((s) => (
                  <div
                    key={s.id}
                    className="p-2.5 rounded-lg border border-border-subtle bg-surface text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-txt-primary">{s.subject_name}</span>
                      <span className="font-mono text-[11px] text-txt-secondary">
                        {s.start_time} - {s.end_time}
                      </span>
                    </div>
                    <p className="text-txt-muted text-[11px]">
                      {s.subject_code} {s.room ? `· Room ${s.room}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Secondary Analytics: Lower Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
        {/* Course Attendance Overview */}
        <div className="app-panel rounded-xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
            <h3 className="text-sm font-semibold text-txt-primary">Attendance by Course</h3>
            <button
              onClick={() => onNavigate('attendance')}
              className="text-xs text-accent hover:underline font-medium"
            >
              Details
            </button>
          </div>

          {(!data?.subject_attendance || data.subject_attendance.length === 0) ? (
            <p className="text-xs text-txt-muted py-4 text-center">No attendance logged yet.</p>
          ) : (
            <div className="space-y-2.5">
              {data.subject_attendance.map((s) => (
                <div key={s.subject_id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-txt-secondary">{s.subject_name} ({s.subject_code})</span>
                    <span className={`font-mono font-semibold ${s.is_warning ? 'text-semantic-danger' : 'text-txt-primary'}`}>
                      {s.percentage !== null ? `${s.percentage}%` : 'N/A'}
                    </span>
                  </div>
                  <div className="w-full bg-surface-elevated rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full ${s.is_warning ? 'bg-semantic-danger' : 'bg-accent'}`}
                      style={{ width: `${s.percentage || 0}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Notes */}
        <div className="app-panel rounded-xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
            <h3 className="text-sm font-semibold text-txt-primary">Recent Notes</h3>
            <button
              onClick={() => onNavigate('notes')}
              className="text-xs text-accent hover:underline font-medium"
            >
              All Notes
            </button>
          </div>

          {(!data?.recent_notes || data.recent_notes.length === 0) ? (
            <p className="text-xs text-txt-muted py-4 text-center">No notes written yet.</p>
          ) : (
            <div className="space-y-2">
              {data.recent_notes.map((n) => (
                <div
                  key={n.id}
                  onClick={() => onNavigate('notes')}
                  className="p-2.5 rounded-lg border border-border-subtle bg-surface text-xs hover:border-border-default cursor-pointer transition-colors"
                >
                  <p className="font-medium text-txt-primary truncate">{n.title}</p>
                  <p className="text-[11px] text-txt-muted mt-0.5">
                    {n.subject_code || 'General'} {n.tags ? `· ${n.tags}` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
