import React, { useState } from 'react';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Circle,
  X,
  ArrowUpDown,
} from 'lucide-react';
import { Assignment, Subject, Priority, AssignmentStatus } from '../types';
import { EmptyState } from '../components/EmptyState';
import { ConfirmModal } from '../components/ConfirmModal';

interface AssignmentsPageProps {
  assignments: Assignment[];
  subjects: Subject[];
  loading: boolean;
  onCreateAssignment: (data: Partial<Assignment>) => Promise<void>;
  onUpdateAssignment: (id: number, data: Partial<Assignment>) => Promise<void>;
  onDeleteAssignment: (id: number) => Promise<void>;
}

export const AssignmentsPage: React.FC<AssignmentsPageProps> = ({
  assignments,
  subjects,
  loading,
  onCreateAssignment,
  onUpdateAssignment,
  onDeleteAssignment,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'due_date' | 'priority' | 'created_at'>('due_date');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Assignment | null>(null);

  const [formData, setFormData] = useState({
    subject_id: subjects[0]?.id || 0,
    title: '',
    description: '',
    due_date: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
    priority: 'medium' as Priority,
    status: 'todo' as AssignmentStatus,
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const openCreateModal = () => {
    setEditingAssignment(null);
    setFormData({
      subject_id: subjects[0]?.id || 0,
      title: '',
      description: '',
      due_date: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
      priority: 'medium',
      status: 'todo',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (a: Assignment) => {
    setEditingAssignment(a);
    setFormData({
      subject_id: a.subject_id,
      title: a.title,
      description: a.description || '',
      due_date: a.due_date.slice(0, 10),
      priority: a.priority,
      status: a.status,
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
      if (editingAssignment) {
        await onUpdateAssignment(editingAssignment.id, formData);
      } else {
        await onCreateAssignment(formData);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (a: Assignment) => {
    let nextStatus: AssignmentStatus = 'in_progress';
    if (a.status === 'todo') nextStatus = 'in_progress';
    else if (a.status === 'in_progress') nextStatus = 'completed';
    else nextStatus = 'todo';

    await onUpdateAssignment(a.id, { status: nextStatus });
  };

  // Filter & Sort
  const filtered = assignments.filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (subjectFilter !== 'all' && a.subject_id !== parseInt(subjectFilter)) return false;
    if (priorityFilter !== 'all' && a.priority !== priorityFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = a.title.toLowerCase().includes(q);
      const matchDesc = a.description?.toLowerCase().includes(q);
      const matchSubj = a.subject_code?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchSubj) return false;
    }
    return true;
  });

  const priorityWeight: Record<Priority, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
  filtered.sort((a, b) => {
    if (sortBy === 'due_date') {
      return a.due_date.localeCompare(b.due_date);
    } else if (sortBy === 'priority') {
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    } else {
      return b.created_at.localeCompare(a.created_at);
    }
  });

  const overdueCount = assignments.filter((a) => a.is_overdue).length;

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Assignments & Project Deadlines
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Organize homework, problem sets, lab reports, and capstone submissions.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-semibold text-white bg-brand-indigo hover:bg-indigo-500 rounded-xl transition-all shadow-glow-indigo self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Assignment</span>
        </button>
      </div>

      {/* Overdue Warning Alert Bar */}
      {overdueCount > 0 && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs sm:text-sm text-rose-300">
          <div className="flex items-center space-x-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-semibold">
              Attention: You have {overdueCount} assignment{overdueCount > 1 ? 's' : ''} past due!
            </span>
          </div>
          <button
            onClick={() => {
              setStatusFilter('todo');
            }}
            className="text-xs underline font-semibold hover:text-white"
          >
            Show Pending Work
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assignments..."
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-campus-900 border border-campus-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-brand-indigo"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="bg-campus-900 border border-campus-700 p-0.5 rounded-xl flex items-center text-xs">
            {['all', 'todo', 'in_progress', 'completed'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg capitalize font-medium transition-all ${
                  statusFilter === st ? 'bg-brand-indigo text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Subject Filter */}
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-campus-900 border border-campus-700 rounded-xl text-slate-200 focus:outline-none focus:border-brand-indigo"
          >
            <option value="all">All Courses</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.code}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-campus-900 border border-campus-700 rounded-xl text-slate-200 focus:outline-none focus:border-brand-indigo"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Sort */}
          <div className="flex items-center space-x-1 text-xs text-slate-400 pl-1">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-slate-300 focus:outline-none font-medium"
            >
              <option value="due_date" className="bg-campus-900">Due Date</option>
              <option value="priority" className="bg-campus-900">Priority</option>
              <option value="created_at" className="bg-campus-900">Created</option>
            </select>
          </div>
        </div>
      </div>

      {/* Assignment Items List */}
      {loading && assignments.length === 0 ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-campus-850 rounded-2xl"></div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No assignments found"
          description={
            search || statusFilter !== 'all' || subjectFilter !== 'all'
              ? 'No assignments match your current filter parameters.'
              : 'You have no active assignments recorded. Create your first assignment to get started!'
          }
          actionText={statusFilter === 'all' && !search ? 'Create First Assignment' : undefined}
          onAction={openCreateModal}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const isCompleted = item.status === 'completed';

            let prioBadge = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
            if (item.priority === 'urgent') prioBadge = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
            if (item.priority === 'high') prioBadge = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
            if (item.priority === 'medium') prioBadge = 'bg-blue-500/15 text-blue-300 border-blue-500/30';

            return (
              <div
                key={item.id}
                className={`glass-card p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                  item.is_overdue
                    ? 'border-rose-500/40 bg-rose-950/10'
                    : isCompleted
                    ? 'opacity-70'
                    : ''
                }`}
              >
                <div className="flex items-start space-x-3.5 min-w-0">
                  {/* Status Toggle Button */}
                  <button
                    onClick={() => handleToggleStatus(item)}
                    className="mt-0.5 text-slate-400 hover:text-brand-indigo transition-colors shrink-0"
                    title={`Status: ${item.status}. Click to cycle.`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : item.status === 'in_progress' ? (
                      <div className="w-5 h-5 rounded-full border-2 border-brand-indigo flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-brand-indigo"></div>
                      </div>
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span
                        className="font-mono text-xs font-bold px-2 py-0.5 rounded-md"
                        style={{
                          backgroundColor: `${item.subject_color || '#6366F1'}20`,
                          color: item.subject_color || '#6366F1',
                        }}
                      >
                        {item.subject_code}
                      </span>
                      <h4 className={`text-sm font-bold text-white truncate ${isCompleted ? 'line-through text-slate-400' : ''}`}>
                        {item.title}
                      </h4>
                    </div>

                    {item.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                        {item.description}
                      </p>
                    )}

                    <div className="flex items-center space-x-3 mt-2 text-xs text-slate-400">
                      <span className={`flex items-center space-x-1 ${item.is_overdue ? 'text-rose-400 font-semibold' : ''}`}>
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Due {item.due_date.slice(0, 10)}</span>
                      </span>
                      <span>·</span>
                      <span className="capitalize">{item.status.replace('_', ' ')}</span>
                      {item.completed_at && (
                        <>
                          <span>·</span>
                          <span className="text-emerald-400">Done</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                  {item.is_overdue && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Overdue
                    </span>
                  )}
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider ${prioBadge}`}>
                    {item.priority}
                  </span>

                  <button
                    onClick={() => openEditModal(item)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-campus-800 transition-colors"
                    title="Edit Assignment"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(item)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-campus-800 transition-colors"
                    title="Delete Assignment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
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
                {editingAssignment ? 'Edit Assignment' : 'New Assignment'}
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
                  Assignment Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Lab 4: Kernel Memory Allocator"
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
                    Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-campus-850 border border-campus-700 rounded-xl text-white focus:outline-none focus:border-brand-indigo"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as Priority })}
                    className="w-full px-3 py-2 text-sm bg-campus-850 border border-campus-700 rounded-xl text-white focus:outline-none focus:border-brand-indigo"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as AssignmentStatus })}
                    className="w-full px-3 py-2 text-sm bg-campus-850 border border-campus-700 rounded-xl text-white focus:outline-none focus:border-brand-indigo"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description / Instructions
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Submission portal link, rubric details, team members..."
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
                  {submitting ? 'Saving...' : editingAssignment ? 'Save Changes' : 'Create Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Assignment"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmText="Delete Assignment"
        onConfirm={async () => {
          if (deleteTarget) {
            await onDeleteAssignment(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
