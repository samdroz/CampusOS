import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Edit2,
  Trash2,
  User,
  GraduationCap,
  Calendar,
  CheckSquare,
  FileText,
  X,
} from 'lucide-react';
import { Subject } from '../types';
import { EmptyState } from '../components/EmptyState';
import { ConfirmModal } from '../components/ConfirmModal';
import { AcademicLoader } from '../components/AcademicLoader';

interface SubjectsPageProps {
  subjects: Subject[];
  loading: boolean;
  onCreateSubject: (data: Partial<Subject>) => Promise<void>;
  onUpdateSubject: (id: number, data: Partial<Subject>) => Promise<void>;
  onDeleteSubject: (id: number) => Promise<void>;
  onNavigate: (page: string) => void;
}

const PRESET_COLORS = [
  '#4F46E5', // Indigo
  '#6366F1', // Violet Indigo
  '#2563EB', // Blue
  '#0891B2', // Cyan
  '#059669', // Emerald
  '#D97706', // Amber
  '#DC2626', // Rose
];

export const SubjectsPage: React.FC<SubjectsPageProps> = ({
  subjects,
  loading,
  onCreateSubject,
  onUpdateSubject,
  onDeleteSubject,
  onNavigate,
}) => {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [deleteSubjectTarget, setDeleteSubjectTarget] = useState<Subject | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    color: '#4F46E5',
    instructor: '',
    credits: 3,
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const openCreateModal = () => {
    setEditingSubject(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      color: PRESET_COLORS[0],
      instructor: '',
      credits: 3,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (s: Subject) => {
    setEditingSubject(s);
    setFormData({
      name: s.name,
      code: s.code,
      description: s.description || '',
      color: s.color || '#4F46E5',
      instructor: s.instructor || '',
      credits: s.credits || 3,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Subject name is required');
      return;
    }
    if (!formData.code.trim()) {
      setFormError('Subject code is required (e.g. CS101)');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      if (editingSubject) {
        await onUpdateSubject(editingSubject.id, formData);
      } else {
        await onCreateSubject(formData);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = subjects.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      (s.instructor && s.instructor.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-txt-primary tracking-tight">
            Academic Courses & Subjects
          </h2>
          <p className="text-xs sm:text-sm text-txt-secondary mt-0.5">
            Manage enrolled courses, faculty instructors, credits, and syllabus details.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-accent hover:bg-accent-hover rounded-lg transition-colors self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Course</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-xs">
        <Search className="w-4 h-4 text-txt-muted absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter courses..."
          className="w-full pl-9 pr-3 py-1.5 text-xs app-input rounded-lg placeholder-txt-muted"
        />
      </div>

      {/* Subjects Grid */}
      {loading && subjects.length === 0 ? (
        <AcademicLoader module="subjects" message="Cataloging courses and instructors..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No courses found"
          description={
            search ? `No courses match "${search}". Try adjusting your query.` : "You haven't added any courses yet. Add your first course to organize timetable, tasks, and attendance."
          }
          actionText={search ? undefined : 'Add First Course'}
          onAction={search ? undefined : openCreateModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((subject) => (
            <div
              key={subject.id}
              className="app-card rounded-xl p-4 flex flex-col justify-between group hover:border-border-default"
            >
              <div>
                <div className="flex items-start justify-between">
                  <span
                    className="font-mono text-xs font-bold px-2 py-0.5 rounded border"
                    style={{
                      backgroundColor: `${subject.color || '#4F46E5'}15`,
                      color: subject.color || '#4F46E5',
                      borderColor: `${subject.color || '#4F46E5'}30`,
                    }}
                  >
                    {subject.code}
                  </span>

                  <div className="flex items-center space-x-1 opacity-70 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditModal(subject)}
                      className="p-1 text-txt-muted hover:text-txt-primary rounded hover:bg-surface-elevated transition-colors"
                      title="Edit Course"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteSubjectTarget(subject)}
                      className="p-1 text-txt-muted hover:text-semantic-danger rounded hover:bg-surface-elevated transition-colors"
                      title="Delete Course"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-txt-primary mt-2.5">
                  {subject.name}
                </h3>

                {subject.description && (
                  <p className="text-xs text-txt-secondary mt-1 line-clamp-2 leading-relaxed">
                    {subject.description}
                  </p>
                )}

                <div className="mt-3 pt-2.5 border-t border-border-subtle space-y-1.5 text-xs text-txt-secondary">
                  <div className="flex items-center space-x-2">
                    <User className="w-3.5 h-3.5 text-txt-muted" />
                    <span>{subject.instructor || 'Faculty TBA'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <GraduationCap className="w-3.5 h-3.5 text-txt-muted" />
                    <span>{subject.credits} Credit Units</span>
                  </div>
                </div>
              </div>

              {/* Navigation Footer */}
              <div className="mt-4 pt-2.5 border-t border-border-subtle flex items-center justify-between text-xs text-txt-muted">
                <button
                  onClick={() => onNavigate('timetable')}
                  className="hover:text-txt-primary flex items-center space-x-1 transition-colors"
                >
                  <Calendar className="w-3 h-3" />
                  <span>Schedule</span>
                </button>
                <button
                  onClick={() => onNavigate('assignments')}
                  className="hover:text-txt-primary flex items-center space-x-1 transition-colors"
                >
                  <CheckSquare className="w-3 h-3" />
                  <span>Tasks</span>
                </button>
                <button
                  onClick={() => onNavigate('notes')}
                  className="hover:text-txt-primary flex items-center space-x-1 transition-colors"
                >
                  <FileText className="w-3 h-3" />
                  <span>Notes</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-surface border border-border-default rounded-xl max-w-lg w-full p-5 shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <h3 className="text-sm font-bold text-txt-primary">
                {editingSubject ? 'Edit Course' : 'Add Course'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-txt-muted hover:text-txt-primary p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-2.5 rounded-lg bg-semantic-danger-subtle text-xs text-semantic-danger">
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="mt-3 space-y-3">
              <div>
                <label className="block text-xs font-medium text-txt-secondary mb-1">
                  Course Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Distributed Operating Systems"
                  className="w-full px-3 py-1.5 text-xs app-input rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-txt-secondary mb-1">
                    Course Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. CS305"
                    className="w-full px-3 py-1.5 text-xs app-input rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-txt-secondary mb-1">
                    Credits
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={formData.credits}
                    onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 text-xs app-input rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-txt-secondary mb-1">
                  Instructor
                </label>
                <input
                  type="text"
                  value={formData.instructor}
                  onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                  placeholder="e.g. Dr. Leslie Lamport"
                  className="w-full px-3 py-1.5 text-xs app-input rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-txt-secondary mb-1">
                  Accent Color
                </label>
                <div className="flex items-center space-x-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: c })}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        formData.color === c ? 'scale-110 border-txt-primary' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-txt-secondary mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Syllabus, grading scheme..."
                  className="w-full px-3 py-1.5 text-xs app-input rounded-lg"
                />
              </div>

              <div className="pt-2 border-t border-border-subtle flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-txt-primary bg-surface-elevated rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-accent hover:bg-accent-hover rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingSubject ? 'Save Changes' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteSubjectTarget}
        title="Delete Course"
        message={`Are you sure you want to delete ${deleteSubjectTarget?.name} (${deleteSubjectTarget?.code})? This will also remove its associated timetable sessions, assignments, notes, and attendance records.`}
        confirmText="Delete Course"
        onConfirm={async () => {
          if (deleteSubjectTarget) {
            await onDeleteSubject(deleteSubjectTarget.id);
            setDeleteSubjectTarget(null);
          }
        }}
        onCancel={() => setDeleteSubjectTarget(null)}
      />
    </div>
  );
};
