import React, { useState } from 'react';
import {
  CheckSquare,
  Plus,
  Search,
  Edit2,
  Trash2,
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
import { AcademicLoader } from '../components/AcademicLoader';

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
          <h2 className="text-xl sm:text-2xl font-bold text-txt-primary tracking-tight">
            Assignments
          </h2>
          <p className="text-xs sm:text-sm text-txt-secondary mt-1">
            Organize coursework, problem sets, projects, and deadlines.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white bg-accent hover:bg-accent-hover rounded-xl transition-all shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Assignment</span>
        </button>
      </div>

      {/* Overdue Warning Alert Bar - Noticeable but restrained */}
      {overdueCount > 0 && (
        <div className="p-3.5 rounded-xl bg-semantic-danger/10 border border-semantic-danger/25 flex items-center justify-between text-xs sm:text-sm text-semantic-danger">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="font-medium">
              You have {overdueCount} overdue assignment{overdueCount > 1 ? 's' : ''}.
            </span>
          </div>
          <button
            onClick={() => setStatusFilter('todo')}
            className="text-xs underline font-semibold hover:opacity-80"
          >
            Show Pending
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="app-panel rounded-2xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-txt-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assignments..."
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-surface-elevated border border-border-default rounded-xl text-txt-primary placeholder-txt-muted focus:outline-none focus:border-accent"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="bg-surface-elevated border border-border-subtle p-0.5 rounded-xl flex items-center text-xs">
            {['all', 'todo', 'in_progress', 'completed'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg capitalize font-medium transition-all ${
                  statusFilter === st
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-txt-secondary hover:text-txt-primary'
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
            className="px-2.5 py-1.5 text-xs bg-surface-elevated border border-border-default rounded-xl text-txt-secondary focus:outline-none focus:border-accent"
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
            className="px-2.5 py-1.5 text-xs bg-surface-elevated border border-border-default rounded-xl text-txt-secondary focus:outline-none focus:border-accent"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Sort */}
          <div className="flex items-center space-x-1 text-xs text-txt-muted pl-1">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-txt-secondary focus:outline-none font-medium"
            >
              <option value="due_date" className="bg-surface text-txt-primary">Due Date</option>
              <option value="priority" className="bg-surface text-txt-primary">Priority</option>
              <option value="created_at" className="bg-surface text-txt-primary">Created</option>
            </select>
          </div>
        </div>
      </div>

      {/* Assignment Items List */}
      {loading && assignments.length === 0 ? (
        <AcademicLoader module="assignments" message="Checking pending assignments & due dates..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No assignments found"
          description={
            search || statusFilter !== 'all' || subjectFilter !== 'all'
              ? 'No assignments match your current filter parameters.'
              : 'You have no active assignments recorded.'
          }
          actionText={statusFilter === 'all' && !search ? 'Create First Assignment' : undefined}
          onAction={openCreateModal}
        />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((item) => {
            const isCompleted = item.status === 'completed';

            let prioBadge = 'bg-surface-elevated text-txt-muted border-border-subtle';
            if (item.priority === 'urgent') prioBadge = 'bg-semantic-danger/10 text-semantic-danger border-semantic-danger/20';
            else if (item.priority === 'high') prioBadge = 'bg-semantic-warning/10 text-semantic-warning border-semantic-warning/20';
            else if (item.priority === 'medium') prioBadge = 'bg-accent/10 text-accent border-accent/20';

            return (
              <div
                key={item.id}
                className={`app-card p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                  item.is_overdue
                    ? 'border-semantic-danger/35'
                    : isCompleted
                    ? 'opacity-65'
                    : ''
                }`}
              >
                <div className="flex items-start space-x-3 min-w-0">
                  {/* Status Toggle Button */}
                  <button
                    onClick={() => handleToggleStatus(item)}
                    className="mt-0.5 text-txt-muted hover:text-accent transition-colors shrink-0"
                    title={`Status: ${item.status}. Click to cycle.`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-semantic-success" />
                    ) : item.status === 'in_progress' ? (
                      <div className="w-5 h-5 rounded-full border-2 border-accent flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-accent"></div>
                      </div>
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span
                        className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md"
                        style={{
                          backgroundColor: `${item.subject_color || '#4F46E5'}15`,
                          color: item.subject_color || '#4F46E5',
                        }}
                      >
                        {item.subject_code}
                      </span>
                      <h4 className={`text-sm font-semibold text-txt-primary truncate ${isCompleted ? 'line-through text-txt-muted' : ''}`}>
                        {item.title}
                      </h4>
                    </div>

                    {item.description && (
                      <p className="text-xs text-txt-secondary mt-0.5 line-clamp-1">
                        {item.description}
                      </p>
                    )}

                    <div className="flex items-center space-x-3 mt-1.5 text-xs text-txt-secondary">
                      <span className={`flex items-center space-x-1 ${item.is_overdue ? 'text-semantic-danger font-medium' : ''}`}>
                        <Calendar className="w-3.5 h-3.5 text-txt-muted" />
                        <span>Due {item.due_date.slice(0, 10)}</span>
                      </span>
                      <span>·</span>
                      <span className="capitalize">{item.status.replace('_', ' ')}</span>
                      {item.completed_at && (
                        <>
                          <span>·</span>
                          <span className="text-semantic-success">Completed</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                  {item.is_overdue && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-semantic-danger/10 text-semantic-danger border border-semantic-danger/20">
                      Overdue
                    </span>
                  )}
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border uppercase tracking-wider ${prioBadge}`}>
                    {item.priority}
                  </span>

                  <button
                    onClick={() => openEditModal(item)}
                    className="p-1.5 text-txt-muted hover:text-txt-primary rounded-lg hover:bg-surface-elevated transition-colors"
                    title="Edit Assignment"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(item)}
                    className="p-1.5 text-txt-muted hover:text-semantic-danger rounded-lg hover:bg-surface-elevated transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface border border-border-default rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
              <h3 className="text-base font-semibold text-txt-primary">
                {editingAssignment ? 'Edit Assignment' : 'New Assignment'}
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
                  Assignment Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Lab 4: Kernel Memory Allocator"
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
                    Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-surface-elevated border border-border-default rounded-xl text-txt-primary focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-txt-secondary mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as Priority })}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-surface-elevated border border-border-default rounded-xl text-txt-primary focus:outline-none focus:border-accent"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-txt-secondary mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as AssignmentStatus })}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-surface-elevated border border-border-default rounded-xl text-txt-primary focus:outline-none focus:border-accent"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-txt-secondary mb-1">
                  Description / Instructions
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Submission portal link, rubric details, team members..."
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
