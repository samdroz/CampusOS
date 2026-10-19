import React, { useState } from 'react';
import {
  Clock,
  Plus,
  Search,
  Calendar,
  MapPin,
  Percent,
  Edit2,
  Trash2,
  X,
} from 'lucide-react';
import { Exam, Subject } from '../types';
import { EmptyState } from '../components/EmptyState';
import { ConfirmModal } from '../components/ConfirmModal';
import { AcademicLoader } from '../components/AcademicLoader';

interface ExamsPageProps {
  exams: Exam[];
  subjects: Subject[];
  loading: boolean;
  onCreateExam: (data: Partial<Exam>) => Promise<void>;
  onUpdateExam: (id: number, data: Partial<Exam>) => Promise<void>;
  onDeleteExam: (id: number) => Promise<void>;
}

export const ExamsPage: React.FC<ExamsPageProps> = ({
  exams,
  subjects,
  loading,
  onCreateExam,
  onUpdateExam,
  onDeleteExam,
}) => {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Exam | null>(null);

  const [formData, setFormData] = useState({
    subject_id: subjects[0]?.id || 0,
    title: '',
    exam_date: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10),
    start_time: '14:00',
    end_time: '16:00',
    location: '',
    weight: 30,
    notes: '',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const openCreateModal = () => {
    setEditingExam(null);
    setFormData({
      subject_id: subjects[0]?.id || 0,
      title: '',
      exam_date: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10),
      start_time: '14:00',
      end_time: '16:00',
      location: '',
      weight: 30,
      notes: '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (e: Exam) => {
    setEditingExam(e);
    setFormData({
      subject_id: e.subject_id,
      title: e.title,
      exam_date: e.exam_date,
      start_time: e.start_time,
      end_time: e.end_time || '',
      location: e.location || '',
      weight: e.weight || 0,
      notes: e.notes || '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setFormError('Title is required');
      return;
    }
    if (!formData.subject_id) {
      setFormError('Subject is required');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      if (editingExam) {
        await onUpdateExam(editingExam.id, formData);
      } else {
        await onCreateExam(formData);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save exam record');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = exams.filter((e) => {
    if (tab === 'upcoming' && e.is_past) return false;
    if (tab === 'past' && !e.is_past) return false;
    if (subjectFilter !== 'all' && e.subject_id !== parseInt(subjectFilter)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!e.title.toLowerCase().includes(q) && !e.subject_code?.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-txt-primary tracking-tight">
            Examinations
          </h2>
          <p className="text-xs sm:text-sm text-txt-secondary mt-1">
            Track midterms, finals, practical labs, and assessment countdowns.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white bg-accent hover:bg-accent-hover rounded-xl transition-all shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Exam</span>
        </button>
      </div>

      {/* Tabs and Filters */}
      <div className="app-panel rounded-2xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <div className="bg-surface-elevated border border-border-subtle p-0.5 rounded-xl flex items-center text-xs">
            <button
              onClick={() => setTab('upcoming')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                tab === 'upcoming'
                  ? 'bg-accent text-white shadow-sm font-semibold'
                  : 'text-txt-secondary hover:text-txt-primary'
              }`}
            >
              Upcoming ({exams.filter((e) => !e.is_past).length})
            </button>
            <button
              onClick={() => setTab('past')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                tab === 'past'
                  ? 'bg-accent text-white shadow-sm font-semibold'
                  : 'text-txt-secondary hover:text-txt-primary'
              }`}
            >
              Past ({exams.filter((e) => e.is_past).length})
            </button>
          </div>

          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-surface-elevated border border-border-default rounded-xl text-txt-secondary focus:outline-none focus:border-accent"
          >
            <option value="all">All Courses</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.code}
              </option>
            ))}
          </select>
        </div>

        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-txt-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exams..."
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-surface-elevated border border-border-default rounded-xl text-txt-primary placeholder-txt-muted focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Exam Cards */}
      {loading && exams.length === 0 ? (
        <AcademicLoader module="exams" message="Retrieving upcoming examination schedule..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Clock}
          title={tab === 'upcoming' ? 'No upcoming examinations' : 'No past examinations'}
          description={
            tab === 'upcoming'
              ? 'You have no examinations scheduled on the calendar.'
              : 'Past exam records will appear here after their scheduled dates.'
          }
          actionText={tab === 'upcoming' && !search ? 'Schedule An Examination' : undefined}
          onAction={openCreateModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((exam) => {
            const isImminent = exam.is_imminent;

            return (
              <div
                key={exam.id}
                className={`app-card p-4 rounded-2xl flex flex-col justify-between group transition-all relative overflow-hidden ${
                  isImminent
                    ? 'border-semantic-warning/40'
                    : exam.is_past
                    ? 'opacity-65'
                    : ''
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <span
                      className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md"
                      style={{
                        backgroundColor: `${exam.subject_color || '#4F46E5'}15`,
                        color: exam.subject_color || '#4F46E5',
                      }}
                    >
                      {exam.subject_code}
                    </span>

                    <div className="flex items-center space-x-1">
                      {!exam.is_past ? (
                        <span
                          className={`font-mono text-xs font-medium px-2 py-0.5 rounded-full ${
                            exam.days_remaining <= 1
                              ? 'bg-semantic-danger/10 text-semantic-danger border border-semantic-danger/25'
                              : isImminent
                              ? 'bg-semantic-warning/10 text-semantic-warning border border-semantic-warning/25'
                              : 'bg-surface-elevated text-txt-secondary border border-border-subtle'
                          }`}
                        >
                          {exam.days_remaining === 0
                            ? 'Today!'
                            : exam.days_remaining === 1
                            ? 'Tomorrow!'
                            : `In ${exam.days_remaining}d`}
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface-elevated text-txt-muted border border-border-subtle">
                          Completed
                        </span>
                      )}

                      <button
                        onClick={() => openEditModal(exam)}
                        className="p-1.5 text-txt-muted hover:text-txt-primary rounded-lg hover:bg-surface-elevated transition-colors ml-1"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(exam)}
                        className="p-1.5 text-txt-muted hover:text-semantic-danger rounded-lg hover:bg-surface-elevated transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-sm font-semibold text-txt-primary mt-2.5">{exam.title}</h3>
                  <p className="text-xs text-txt-secondary mt-0.5">{exam.subject_name}</p>

                  <div className="mt-3 pt-3 border-t border-border-subtle space-y-1.5 text-xs text-txt-secondary">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-3.5 h-3.5 text-txt-muted" />
                      <span>{exam.exam_date}</span>
                      <span>·</span>
                      <span className="font-mono">{exam.start_time}{exam.end_time ? ` - ${exam.end_time}` : ''}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <MapPin className="w-3.5 h-3.5 text-txt-muted" />
                      <span>{exam.location || 'Hall / Room TBA'}</span>
                    </div>

                    {exam.weight !== null && exam.weight !== undefined && exam.weight > 0 && (
                      <div className="flex items-center space-x-2 text-txt-muted">
                        <Percent className="w-3.5 h-3.5" />
                        <span>Weight: {exam.weight}% of Grade</span>
                      </div>
                    )}
                  </div>

                  {exam.notes && (
                    <div className="mt-2.5 p-2 rounded-xl bg-surface-elevated border border-border-subtle text-xs text-txt-secondary">
                      <p className="italic">{exam.notes}</p>
                    </div>
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
          <div className="bg-surface border border-border-default rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
              <h3 className="text-base font-semibold text-txt-primary">
                {editingExam ? 'Edit Examination' : 'Schedule Examination'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-txt-muted hover:text-txt-primary p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-xl bg-semantic-danger/10 border border-semantic-danger/20 text-xs text-semantic-danger">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-txt-secondary mb-1">
                  Exam Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Midterm 1: Advanced Algorithms"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-surface-elevated border border-border-default rounded-xl text-txt-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    Exam Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.exam_date}
                    onChange={(e) => setFormData({ ...formData, exam_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-surface-elevated border border-border-default rounded-xl text-txt-primary focus:outline-none focus:border-accent"
                  />
                </div>
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
                    End Time
                  </label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-surface-elevated border border-border-default rounded-xl text-txt-primary focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-txt-secondary mb-1">
                    Location / Room
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Auditorium Hall B"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-surface-elevated border border-border-default rounded-xl text-txt-primary focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-txt-secondary mb-1">
                    Weight (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-surface-elevated border border-border-default rounded-xl text-txt-primary focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-txt-secondary mb-1">
                  Permitted Materials / Notes
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. One cheat sheet allowed, bring scientific calculator..."
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
                  {submitting ? 'Saving...' : editingExam ? 'Save Changes' : 'Schedule Exam'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Examination"
        message={`Are you sure you want to remove the exam "${deleteTarget?.title}"?`}
        confirmText="Delete Exam"
        onConfirm={async () => {
          if (deleteTarget) {
            await onDeleteExam(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
