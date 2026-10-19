import React, { useState } from 'react';
import {
  Clock,
  Plus,
  Search,
  Calendar,
  MapPin,
  Percent,
  FileText,
  AlertTriangle,
  Edit2,
  Trash2,
  X,
  Sparkles,
} from 'lucide-react';
import { Exam, Subject } from '../types';
import { EmptyState } from '../components/EmptyState';
import { ConfirmModal } from '../components/ConfirmModal';

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
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Examinations & Assessment Schedules
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Stay prepared for midterms, finals, practical labs, and oral defences with live countdowns.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-semibold text-white bg-brand-indigo hover:bg-indigo-500 rounded-xl transition-all shadow-glow-indigo self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Exam</span>
        </button>
      </div>

      {/* Tabs and Filters */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <div className="bg-campus-900 border border-campus-700 p-0.5 rounded-xl flex items-center text-xs">
            <button
              onClick={() => setTab('upcoming')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                tab === 'upcoming' ? 'bg-brand-indigo text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Upcoming ({exams.filter((e) => !e.is_past).length})
            </button>
            <button
              onClick={() => setTab('past')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                tab === 'past' ? 'bg-brand-indigo text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Past ({exams.filter((e) => e.is_past).length})
            </button>
          </div>

          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-campus-900 border border-campus-700 rounded-xl text-slate-200 focus:outline-none focus:border-brand-indigo"
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
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exams..."
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-campus-900 border border-campus-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-brand-indigo"
          />
        </div>
      </div>

      {/* Exam Cards */}
      {loading && exams.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-campus-850 rounded-2xl"></div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Clock}
          title={tab === 'upcoming' ? 'No upcoming examinations' : 'No past examinations'}
          description={
            tab === 'upcoming'
              ? 'You have no examinations on the calendar. Enjoy stress-free learning!'
              : 'Past exam records will appear here after their scheduled dates.'
          }
          actionText={tab === 'upcoming' && !search ? 'Schedule An Examination' : undefined}
          onAction={openCreateModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((exam) => {
            const isImminent = exam.is_imminent;

            return (
              <div
                key={exam.id}
                className={`glass-card p-5 rounded-2xl flex flex-col justify-between group transition-all relative overflow-hidden ${
                  isImminent
                    ? 'border-amber-500/40 bg-amber-950/10 shadow-glow-rose'
                    : exam.is_past
                    ? 'opacity-70'
                    : ''
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <span
                      className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider shadow-sm"
                      style={{
                        backgroundColor: `${exam.subject_color || '#6366F1'}20`,
                        color: exam.subject_color || '#6366F1',
                        borderColor: `${exam.subject_color || '#6366F1'}40`,
                        borderWidth: '1px',
                      }}
                    >
                      {exam.subject_code}
                    </span>

                    <div className="flex items-center space-x-1">
                      {!exam.is_past ? (
                        <span
                          className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full ${
                            exam.days_remaining <= 1
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                              : isImminent
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-brand-indigo/20 text-indigo-300 border border-brand-indigo/30'
                          }`}
                        >
                          {exam.days_remaining === 0
                            ? 'Today!'
                            : exam.days_remaining === 1
                            ? 'Tomorrow!'
                            : `In ${exam.days_remaining} days`}
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-campus-800 text-slate-400 border border-campus-700">
                          Completed
                        </span>
                      )}

                      <button
                        onClick={() => openEditModal(exam)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-campus-800 transition-colors ml-1"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(exam)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-campus-800 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-white mt-3">{exam.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{exam.subject_name}</p>

                  <div className="mt-4 pt-3 border-t border-campus-700/60 space-y-2 text-xs text-slate-300">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{exam.exam_date}</span>
                      <span>·</span>
                      <span className="font-mono">{exam.start_time}{exam.end_time ? ` - ${exam.end_time}` : ''}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{exam.location || 'Hall / Room TBA'}</span>
                    </div>

                    {exam.weight !== null && exam.weight !== undefined && exam.weight > 0 && (
                      <div className="flex items-center space-x-2 text-slate-400">
                        <Percent className="w-3.5 h-3.5" />
                        <span>Weight: {exam.weight}% of Final Grade</span>
                      </div>
                    )}
                  </div>

                  {exam.notes && (
                    <div className="mt-3 p-2.5 rounded-xl bg-campus-900/60 border border-campus-700/60 text-xs text-slate-400">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-campus-900 border border-campus-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between pb-4 border-b border-campus-700/60">
              <h3 className="text-lg font-bold text-white">
                {editingExam ? 'Edit Examination' : 'Schedule Examination'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Exam Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Midterm 1: Advanced Algorithms"
                  className="w-full px-3 py-2 text-sm bg-campus-850 border border-campus-700 rounded-xl text-white focus:outline-none focus:border-brand-indigo"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Subject *
                  </label>
                  <select
                    required
                    value={formData.subject_id}
                    onChange={(e) => setFormData({ ...formData, subject_id: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 text-sm bg-campus-850 border border-campus-700 rounded-xl text-white focus:outline-none focus:border-brand-indigo"
                  >
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.code} - {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Exam Date (YYYY-MM-DD) *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.exam_date}
                    onChange={(e) => setFormData({ ...formData, exam_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-campus-850 border border-campus-700 rounded-xl text-white focus:outline-none focus:border-brand-indigo"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-campus-850 border border-campus-700 rounded-xl text-white focus:outline-none focus:border-brand-indigo"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-campus-850 border border-campus-700 rounded-xl text-white focus:outline-none focus:border-brand-indigo"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Location / Room
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Auditorium Hall B"
                    className="w-full px-3 py-2 text-sm bg-campus-850 border border-campus-700 rounded-xl text-white focus:outline-none focus:border-brand-indigo"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Weight (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm bg-campus-850 border border-campus-700 rounded-xl text-white focus:outline-none focus:border-brand-indigo"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Permitted Materials / Notes
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. One cheat sheet allowed, bring scientific calculator..."
                  className="w-full px-3 py-2 text-sm bg-campus-850 border border-campus-700 rounded-xl text-white focus:outline-none focus:border-brand-indigo"
                />
              </div>

              <div className="pt-3 border-t border-campus-700/60 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-campus-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-semibold text-white bg-brand-indigo hover:bg-indigo-500 rounded-xl shadow-glow-indigo transition-all disabled:opacity-50"
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
