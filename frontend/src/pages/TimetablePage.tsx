import React, { useState } from 'react';
import {
  Calendar,
  Plus,
  Trash2,
  Edit2,
  MapPin,
  User,
  AlertTriangle,
  X,
} from 'lucide-react';
import { ClassSession, Subject } from '../types';
import { EmptyState } from '../components/EmptyState';
import { ConfirmModal } from '../components/ConfirmModal';
import { AcademicLoader } from '../components/AcademicLoader';

interface TimetablePageProps {
  sessions: ClassSession[];
  subjects: Subject[];
  loading: boolean;
  onCreateSession: (data: Partial<ClassSession>) => Promise<void>;
  onUpdateSession: (id: number, data: Partial<ClassSession>) => Promise<void>;
  onDeleteSession: (id: number) => Promise<void>;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const TimetablePage: React.FC<TimetablePageProps> = ({
  sessions,
  subjects,
  loading,
  onCreateSession,
  onUpdateSession,
  onDeleteSession,
}) => {
  const currentDayIndex = (new Date().getDay() + 6) % 7; // Convert Sun=0..Sat=6 to Mon=0..Sun=6
  const [selectedDay, setSelectedDay] = useState<number>(currentDayIndex);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<ClassSession | null>(null);
  const [deleteSessionTarget, setDeleteSessionTarget] = useState<ClassSession | null>(null);

  const [formData, setFormData] = useState({
    subject_id: subjects[0]?.id || 0,
    day_of_week: selectedDay,
    start_time: '09:00',
    end_time: '10:30',
    room: '',
    instructor: '',
    session_type: 'Lecture',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const openCreateModal = (day?: number) => {
    setEditingSession(null);
    setFormData({
      subject_id: subjects[0]?.id || 0,
      day_of_week: day !== undefined ? day : selectedDay,
      start_time: '09:00',
      end_time: '10:30',
      room: '',
      instructor: '',
      session_type: 'Lecture',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (s: ClassSession) => {
    setEditingSession(s);
    setFormData({
      subject_id: s.subject_id,
      day_of_week: s.day_of_week,
      start_time: s.start_time,
      end_time: s.end_time,
      room: s.room || '',
      instructor: s.instructor || '',
      session_type: s.session_type || 'Lecture',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject_id) {
      setFormError('Please select a subject');
      return;
    }
    if (formData.start_time >= formData.end_time) {
      setFormError('End time must be strictly after start time');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      if (editingSession) {
        await onUpdateSession(editingSession.id, formData);
      } else {
        await onCreateSession(formData);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save timetable session');
    } finally {
      setSubmitting(false);
    }
  };

  // Group sessions by day
  const sessionsByDay: Record<number, ClassSession[]> = {};
  for (let d = 0; d < 7; d++) {
    sessionsByDay[d] = sessions
      .filter((s) => s.day_of_week === d)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-txt-primary tracking-tight">
            Timetable
          </h2>
          <p className="text-xs sm:text-sm text-txt-secondary mt-1">
            Track weekly class schedules, rooms, and instructor sessions.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {/* View Toggle */}
          <div className="bg-surface border border-border-subtle p-1 rounded-xl flex items-center">
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                viewMode === 'day'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-txt-secondary hover:text-txt-primary'
              }`}
            >
              Day View
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                viewMode === 'week'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-txt-secondary hover:text-txt-primary'
              }`}
            >
              Week Grid
            </button>
          </div>

          <button
            onClick={() => openCreateModal()}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white bg-accent hover:bg-accent-hover rounded-xl transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Session</span>
          </button>
        </div>
      </div>

      {/* Weekday Selector Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
        {DAYS.map((dayName, idx) => {
          const isSelected = selectedDay === idx;
          const isToday = currentDayIndex === idx;
          const count = sessionsByDay[idx]?.length || 0;

          return (
            <button
              key={dayName}
              onClick={() => setSelectedDay(idx)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all border ${
                isSelected
                  ? 'bg-surface-elevated text-accent border-accent/40 shadow-sm font-semibold'
                  : 'bg-surface text-txt-secondary border-border-subtle hover:text-txt-primary hover:bg-surface-elevated'
              }`}
            >
              <span>{dayName}</span>
              {isToday && (
                <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
              )}
              {count > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-elevated text-txt-secondary border border-border-subtle">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* View Content */}
      {loading && sessions.length === 0 ? (
        <div className="py-8">
          <AcademicLoader module="timetable" message="Aligning weekly class schedule..." />
        </div>
      ) : viewMode === 'day' ? (
        /* Single Day Detailed View */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-txt-primary flex items-center space-x-2">
              <span>{DAYS[selectedDay]} Schedule</span>
              {currentDayIndex === selectedDay && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                  Today
                </span>
              )}
            </h3>
            <button
              onClick={() => openCreateModal(selectedDay)}
              className="text-xs text-accent hover:text-accent-hover font-medium flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add session on {DAYS[selectedDay]}</span>
            </button>
          </div>

          {sessionsByDay[selectedDay]?.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title={`No classes on ${DAYS[selectedDay]}`}
              description="You have no lectures or practical sessions scheduled for this day."
              actionText={`Schedule Class on ${DAYS[selectedDay]}`}
              onAction={() => openCreateModal(selectedDay)}
            />
          ) : (
            <div className="space-y-3">
              {sessionsByDay[selectedDay].map((session) => (
                <div
                  key={session.id}
                  className="app-card p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="flex items-start space-x-4">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0 mt-0.5 shadow-sm"
                      style={{ backgroundColor: session.subject_color || '#4F46E5' }}
                    >
                      {session.subject_code?.slice(0, 4) || 'SUBJ'}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono font-medium text-txt-secondary">
                          {session.start_time} - {session.end_time}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-elevated text-txt-secondary border border-border-subtle">
                          {session.session_type}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-txt-primary mt-1">
                        {session.subject_name}
                      </h4>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-txt-secondary">
                        <span className="flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5 text-txt-muted" />
                          <span>Room {session.room || 'TBA'}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <User className="w-3.5 h-3.5 text-txt-muted" />
                          <span>{session.instructor || 'Instructor'}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 self-end sm:self-center">
                    <button
                      onClick={() => openEditModal(session)}
                      className="p-1.5 text-txt-muted hover:text-txt-primary rounded-lg hover:bg-surface-elevated transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteSessionTarget(session)}
                      className="p-1.5 text-txt-muted hover:text-semantic-danger rounded-lg hover:bg-surface-elevated transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Weekly Matrix Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
          {DAYS.map((dayName, dayIdx) => {
            const daySessions = sessionsByDay[dayIdx] || [];
            const isToday = currentDayIndex === dayIdx;

            return (
              <div
                key={dayName}
                className={`app-panel rounded-2xl p-3 flex flex-col min-h-[300px] transition-all ${
                  isToday ? 'border-accent/50 ring-1 ring-accent/30' : ''
                }`}
              >
                <div className="flex items-center justify-between pb-2.5 border-b border-border-subtle mb-2">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-semibold text-txt-primary">{dayName.slice(0, 3)}</span>
                    {isToday && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-accent/15 text-accent font-semibold">
                        TODAY
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => openCreateModal(dayIdx)}
                    className="p-1 rounded text-txt-muted hover:text-txt-primary hover:bg-surface-elevated transition-colors"
                    title={`Add session to ${dayName}`}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto">
                  {daySessions.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center p-3 text-[11px] text-txt-muted">
                      No classes
                    </div>
                  ) : (
                    daySessions.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => openEditModal(s)}
                        className="p-2.5 rounded-xl border border-border-subtle bg-surface-elevated hover:border-accent/40 transition-all cursor-pointer group text-left"
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono font-medium text-txt-secondary mb-1">
                          <span>{s.start_time}</span>
                          <span
                            className="font-semibold px-1.5 py-0.2 rounded"
                            style={{ backgroundColor: `${s.subject_color || '#4F46E5'}18`, color: s.subject_color || '#4F46E5' }}
                          >
                            {s.subject_code}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-txt-primary truncate leading-snug">
                          {s.subject_name}
                        </p>
                        <p className="text-[10px] text-txt-muted truncate mt-0.5">
                          {s.room ? `Rm ${s.room}` : s.session_type}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface border border-border-default rounded-2xl max-w-md w-full p-6 shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
              <h3 className="text-base font-semibold text-txt-primary">
                {editingSession ? 'Edit Timetable Session' : 'Add Class Session'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-txt-muted hover:text-txt-primary p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-xl bg-semantic-danger/10 border border-semantic-danger/20 text-xs text-semantic-danger flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-txt-secondary mb-1">
                  Subject *
                </label>
                <select
                  required
                  value={formData.subject_id}
                  onChange={(e) => setFormData({ ...formData, subject_id: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-surface-elevated border border-border-default rounded-xl text-txt-primary focus:outline-none focus:border-accent"
                >
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.code} - {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-txt-secondary mb-1">
                  Day of Week *
                </label>
                <select
                  value={formData.day_of_week}
                  onChange={(e) => setFormData({ ...formData, day_of_week: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-surface-elevated border border-border-default rounded-xl text-txt-primary focus:outline-none focus:border-accent"
                >
                  {DAYS.map((name, idx) => (
                    <option key={name} value={idx}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-txt-secondary mb-1">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-surface-elevated border border-border-default rounded-xl text-txt-primary focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-txt-secondary mb-1">
                    End Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-surface-elevated border border-border-default rounded-xl text-txt-primary focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-txt-secondary mb-1">
                    Room / Location
                  </label>
                  <input
                    type="text"
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    placeholder="e.g. Lab 401"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-surface-elevated border border-border-default rounded-xl text-txt-primary focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-txt-secondary mb-1">
                    Session Type
                  </label>
                  <select
                    value={formData.session_type}
                    onChange={(e) => setFormData({ ...formData, session_type: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-surface-elevated border border-border-default rounded-xl text-txt-primary focus:outline-none focus:border-accent"
                  >
                    <option value="Lecture">Lecture</option>
                    <option value="Lab">Lab</option>
                    <option value="Tutorial">Tutorial</option>
                    <option value="Seminar">Seminar</option>
                    <option value="Studio">Studio</option>
                    <option value="Workshop">Workshop</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-txt-secondary mb-1">
                  Instructor (Optional)
                </label>
                <input
                  type="text"
                  value={formData.instructor}
                  onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                  placeholder="Defaults to subject instructor if blank"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-surface-elevated border border-border-default rounded-xl text-txt-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div className="pt-3 border-t border-border-subtle flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-txt-secondary hover:text-txt-primary bg-surface-elevated border border-border-subtle rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-accent hover:bg-accent-hover rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingSession ? 'Save Changes' : 'Add Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteSessionTarget}
        title="Delete Class Session"
        message={`Are you sure you want to remove the ${deleteSessionTarget?.session_type} session for ${deleteSessionTarget?.subject_name} (${deleteSessionTarget?.start_time} - ${deleteSessionTarget?.end_time})?`}
        confirmText="Delete Session"
        onConfirm={async () => {
          if (deleteSessionTarget) {
            await onDeleteSession(deleteSessionTarget.id);
            setDeleteSessionTarget(null);
          }
        }}
        onCancel={() => setDeleteSessionTarget(null)}
      />
    </div>
  );
};
