import React from 'react';
import {
  Calendar,
  Clock,
  CheckSquare,
  UserCheck,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  FileText,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  CalendarDays,
} from 'lucide-react';
import { DashboardOverview, Assignment, ClassSession, Exam, Note, SubjectAttendanceStats } from '../types';

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
    year: 'numeric',
  });

  if (loading && !data) {
    return (
      <div className="p-6 sm:p-8 space-y-6 animate-pulse">
        <div className="h-20 bg-campus-850 rounded-2xl w-full"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-campus-850 rounded-2xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 bg-campus-850 rounded-2xl"></div>
          <div className="h-72 bg-campus-850 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  const attendancePct = data?.overall_attendance_percentage;
  const isAttendanceWarning = data?.attendance_is_warning;

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-campus-900 via-campus-850 to-campus-900 border border-campus-700/80 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-brand-indigo/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-brand-indigo mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>CampusOS Command Center</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {data?.student_name || 'Alex'}
            </h2>
            <p className="text-sm text-slate-400 mt-1 flex items-center space-x-2">
              <CalendarDays className="w-4 h-4 text-slate-500" />
              <span>{currentDate}</span>
              <span>·</span>
              <span className="text-slate-300">
                {data?.pending_assignments_count || 0} active assignments,{' '}
                {data?.upcoming_exams_count || 0} exams scheduled
              </span>
            </p>
          </div>

          {/* Quick Action buttons on banner */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onQuickAction('assignment')}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-brand-indigo hover:bg-indigo-500 rounded-xl transition-all shadow-glow-indigo"
            >
              + Assignment
            </button>
            <button
              onClick={() => onQuickAction('attendance')}
              className="px-3.5 py-2 text-xs font-semibold text-slate-200 hover:text-white bg-campus-800 hover:bg-campus-750 border border-campus-700 rounded-xl transition-all"
            >
              + Attendance
            </button>
            <button
              onClick={() => onQuickAction('note')}
              className="px-3.5 py-2 text-xs font-semibold text-slate-200 hover:text-white bg-campus-800 hover:bg-campus-750 border border-campus-700 rounded-xl transition-all"
            >
              + Note
            </button>
          </div>
        </div>
      </div>

      {/* 4 Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance Card */}
        <div
          onClick={() => onNavigate('attendance')}
          className="glass-card p-5 rounded-2xl cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Attendance</span>
            <div className={`p-2 rounded-xl ${isAttendanceWarning ? 'bg-rose-500/15 text-rose-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-white">
              {attendancePct !== null && attendancePct !== undefined ? `${attendancePct}%` : 'No Records'}
            </span>
            {isAttendanceWarning && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                &lt; {data?.warning_threshold}% Alert
              </span>
            )}
          </div>
          <div className="mt-3 w-full bg-campus-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${isAttendanceWarning ? 'bg-rose-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(attendancePct || 0, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Pending Assignments */}
        <div
          onClick={() => onNavigate('assignments')}
          className="glass-card p-5 rounded-2xl cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Work</span>
            <div className="p-2 rounded-xl bg-brand-indigo/15 text-brand-indigo">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-white">{data?.pending_assignments_count || 0}</span>
            <span className="text-xs text-slate-400">tasks</span>
            {(data?.overdue_assignments_count || 0) > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {data?.overdue_assignments_count} Overdue
              </span>
            )}
          </div>
          <p className="mt-3 text-xs text-slate-400 flex items-center justify-between">
            <span>Completed: {data?.completed_assignments_count || 0}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
          </p>
        </div>

        {/* Upcoming Exams */}
        <div
          onClick={() => onNavigate('exams')}
          className="glass-card p-5 rounded-2xl cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Examinations</span>
            <div className="p-2 rounded-xl bg-brand-amber/15 text-brand-amber">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-white">{data?.upcoming_exams_count || 0}</span>
            <span className="text-xs text-slate-400">upcoming</span>
          </div>
          <p className="mt-3 text-xs text-slate-400 flex items-center justify-between">
            <span>
              {data?.upcoming_exams && data.upcoming_exams.length > 0
                ? `Next: in ${data.upcoming_exams[0].days_remaining}d`
                : 'None scheduled'}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
          </p>
        </div>

        {/* Enrolled Subjects */}
        <div
          onClick={() => onNavigate('subjects')}
          className="glass-card p-5 rounded-2xl cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Courses</span>
            <div className="p-2 rounded-xl bg-brand-violet/15 text-brand-violet">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-white">{data?.total_subjects_count || 0}</span>
            <span className="text-xs text-slate-400">enrolled</span>
          </div>
          <p className="mt-3 text-xs text-slate-400 flex items-center justify-between">
            <span>View course catalog</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
          </p>
        </div>
      </div>

      {/* Main Grid: 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Schedule & Deadlines */}
        <div className="lg:col-span-2 space-y-6">
          {/* Next Class Hero Card */}
          {data?.next_class ? (
            <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-brand-indigo flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0 mt-0.5"
                  style={{ backgroundColor: data.next_class.subject_color }}
                >
                  {data.next_class.subject_code.slice(0, 4)}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-brand-indigo">
                      {data.next_class.is_today ? "Today's Next Class" : 'Upcoming Next Session'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-campus-800 text-slate-300 border border-campus-700">
                      {data.next_class.session_type}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-white mt-0.5">
                    {data.next_class.subject_name}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    {data.next_class.start_time} - {data.next_class.end_time} · Room {data.next_class.room || 'TBA'} · {data.next_class.instructor || 'Instructor'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('timetable')}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-campus-800 hover:bg-campus-750 border border-campus-700 rounded-xl transition-all shrink-0 self-start sm:self-auto"
              >
                View Timetable
              </button>
            </div>
          ) : (
            <div className="glass-panel p-5 rounded-2xl text-center text-xs text-slate-400">
              No classes scheduled for today or upcoming week.{' '}
              <button onClick={() => onNavigate('timetable')} className="text-brand-indigo hover:underline font-semibold ml-1">
                Add class sessions
              </button>
            </div>
          )}

          {/* Upcoming Deadlines */}
          <div className="glass-panel rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckSquare className="w-4 h-4 text-brand-indigo" />
                <h3 className="text-base font-bold text-white">Upcoming Deadlines</h3>
              </div>
              <button
                onClick={() => onNavigate('assignments')}
                className="text-xs text-brand-indigo hover:text-indigo-400 font-medium flex items-center space-x-1"
              >
                <span>View all ({data?.pending_assignments_count || 0})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {(!data?.upcoming_deadlines || data.upcoming_deadlines.length === 0) ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No upcoming assignments due. Great job staying on top of coursework!
              </div>
            ) : (
              <div className="divide-y divide-campus-800/80">
                {data.upcoming_deadlines.map((item) => {
                  let prioColor = 'text-slate-400 bg-slate-500/10 border-slate-500/20';
                  if (item.priority === 'urgent') prioColor = 'text-rose-400 bg-rose-500/15 border-rose-500/30';
                  if (item.priority === 'high') prioColor = 'text-amber-400 bg-amber-500/15 border-amber-500/30';
                  if (item.priority === 'medium') prioColor = 'text-blue-400 bg-blue-500/15 border-blue-500/30';

                  return (
                    <div
                      key={item.id}
                      className="py-3 flex items-center justify-between group hover:bg-campus-800/30 px-2 rounded-xl transition-all"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <button
                          onClick={() => onToggleAssignmentComplete(item)}
                          className="w-5 h-5 rounded-md border border-campus-600 hover:border-brand-indigo flex items-center justify-center text-transparent hover:text-brand-indigo/60 transition-colors shrink-0"
                          title="Mark as completed"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{item.title}</p>
                          <p className="text-xs text-slate-400 flex items-center space-x-2 mt-0.5">
                            <span
                              className="font-medium"
                              style={{ color: item.subject_color || '#6366F1' }}
                            >
                              {item.subject_code}
                            </span>
                            <span>·</span>
                            <span className={item.is_overdue ? 'text-rose-400 font-semibold' : 'text-slate-400'}>
                              Due {item.due_date.slice(0, 10)}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0 ml-3">
                        {item.is_overdue && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            Overdue
                          </span>
                        )}
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider ${prioColor}`}>
                          {item.priority}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Today's Schedule Timeline */}
          <div className="glass-panel rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-brand-cyan" />
                <h3 className="text-base font-bold text-white">Today's Class Schedule</h3>
              </div>
              <button
                onClick={() => onNavigate('timetable')}
                className="text-xs text-brand-indigo hover:text-indigo-400 font-medium flex items-center space-x-1"
              >
                <span>Full timetable</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {(!data?.today_sessions || data.today_sessions.length === 0) ? (
              <div className="text-center py-6 text-xs text-slate-400">
                No classes on the schedule for today. Enjoy your study time!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.today_sessions.map((s) => (
                  <div
                    key={s.id}
                    className="p-3.5 rounded-xl bg-campus-850/80 border border-campus-700/70 hover:border-campus-600 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span
                          className="text-xs font-bold"
                          style={{ color: s.subject_color || '#6366F1' }}
                        >
                          {s.subject_code}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-campus-800 text-slate-300 border border-campus-700">
                          {s.session_type}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-white mt-1">{s.subject_name}</h4>
                    </div>
                    <div className="mt-3 pt-2 border-t border-campus-700/50 flex items-center justify-between text-xs text-slate-400">
                      <span>{s.start_time} - {s.end_time}</span>
                      <span>Room {s.room || 'TBA'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Exams, Attendance breakdown, Recent Notes */}
        <div className="space-y-6">
          {/* Upcoming Examinations Countdown */}
          <div className="glass-panel rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-brand-amber" />
                <h3 className="text-sm font-bold text-white">Exam Countdown</h3>
              </div>
              <button
                onClick={() => onNavigate('exams')}
                className="text-xs text-brand-indigo hover:text-indigo-400 font-medium"
              >
                All
              </button>
            </div>

            {(!data?.upcoming_exams || data.upcoming_exams.length === 0) ? (
              <p className="text-xs text-slate-400 py-3 text-center">No exams scheduled.</p>
            ) : (
              <div className="space-y-2.5">
                {data.upcoming_exams.map((e) => (
                  <div
                    key={e.id}
                    className={`p-3 rounded-xl border text-xs transition-all ${
                      e.is_imminent
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-campus-850/80 border-campus-700/70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white truncate mr-2">{e.title}</span>
                      <span
                        className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          e.days_remaining <= 1
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-brand-indigo/20 text-indigo-300'
                        }`}
                      >
                        {e.days_remaining === 0
                          ? 'Today'
                          : e.days_remaining === 1
                          ? 'Tomorrow'
                          : `${e.days_remaining}d`}
                      </span>
                    </div>
                    <p className="text-slate-400 mt-1">
                      {e.subject_code} · {e.exam_date} at {e.start_time} · {e.location || 'Campus Hall'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Attendance Breakdown per Subject */}
          <div className="glass-panel rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-brand-emerald" />
                <h3 className="text-sm font-bold text-white">Subject Attendance</h3>
              </div>
              <button
                onClick={() => onNavigate('attendance')}
                className="text-xs text-brand-indigo hover:text-indigo-400 font-medium"
              >
                Manage
              </button>
            </div>

            {(!data?.subject_attendance || data.subject_attendance.length === 0) ? (
              <p className="text-xs text-slate-400 py-3 text-center">No attendance recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {data.subject_attendance.map((s) => (
                  <div key={s.subject_id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200 truncate mr-2">{s.subject_code}</span>
                      <span className={`font-mono font-bold ${s.is_warning ? 'text-rose-400' : 'text-slate-300'}`}>
                        {s.percentage !== null ? `${s.percentage}%` : 'N/A'}
                      </span>
                    </div>
                    <div className="w-full bg-campus-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full ${s.is_warning ? 'bg-rose-500' : 'bg-brand-indigo'}`}
                        style={{ width: `${s.percentage || 0}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Lecture Notes */}
          <div className="glass-panel rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-brand-violet" />
                <h3 className="text-sm font-bold text-white">Recent Notes</h3>
              </div>
              <button
                onClick={() => onNavigate('notes')}
                className="text-xs text-brand-indigo hover:text-indigo-400 font-medium"
              >
                All Notes
              </button>
            </div>

            {(!data?.recent_notes || data.recent_notes.length === 0) ? (
              <p className="text-xs text-slate-400 py-3 text-center">No notes written yet.</p>
            ) : (
              <div className="space-y-2">
                {data.recent_notes.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => onNavigate('notes')}
                    className="p-3 rounded-xl bg-campus-850/80 border border-campus-700/70 hover:border-campus-600 transition-all cursor-pointer group"
                  >
                    <p className="text-xs font-semibold text-white group-hover:text-brand-indigo transition-colors truncate">
                      {n.title}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {n.subject_code || 'General'} · {n.tags || 'Quick Note'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
