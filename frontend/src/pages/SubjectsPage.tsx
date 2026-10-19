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
  ExternalLink,
} from 'lucide-react';
import { Subject, Assignment, ClassSession, Note } from '../types';
import { EmptyState } from '../components/EmptyState';
import { ConfirmModal } from '../components/ConfirmModal';

interface SubjectsPageProps {
  subjects: Subject[];
  loading: boolean;
  onCreateSubject: (data: Partial<Subject>) => Promise<void>;
  onUpdateSubject: (id: number, data: Partial<Subject>) => Promise<void>;
  onDeleteSubject: (id: number) => Promise<void>;
  onNavigate: (page: string) => void;
}

const PRESET_COLORS = [
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#3B82F6', // Blue
  '#06B6D4', // Cyan
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#F43F5E', // Rose
  '#EC4899', // Pink
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
    color: '#6366F1',
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
      color: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
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
      color: s.color || '#6366F1',
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Academic Courses & Subjects
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage your enrolled courses, syllabus details, faculty contacts, and credit allocations.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-semibold text-white bg-brand-indigo hover:bg-indigo-500 rounded-xl transition-all shadow-glow-indigo self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Subject</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter courses by name, code, or professor..."
          className="w-full pl-10 pr-4 py-2 text-sm bg-campus-900 border border-campus-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-brand-indigo transition-all"
        />
      </div>

      {/* Subjects Grid */}
      {loading && subjects.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-campus-850 rounded-2xl"></div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No courses found"
          description={
            search ? `No subjects match "${search}". Try adjusting your query.` : "You haven't added any subjects yet. Create your first subject to start tracking coursework."
          }
          actionText={search ? undefined : 'Add First Subject'}
          onAction={search ? undefined : openCreateModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((subject) => (
            <div
              key={subject.id}
              className="glass-card rounded-2xl p-5 flex flex-col justify-between group relative overflow-hidden"
            >
              {/* Top Accent Strip */}
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: subject.color }}
              ></div>

              <div>
                <div className="flex items-start justify-between">
                  <span
                    className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider shadow-sm"
                    style={{
                      backgroundColor: `${subject.color}20`,
                      color: subject.color,
                      borderColor: `${subject.color}40`,
                      borderWidth: '1px',
                    }}
                  >
                    {subject.code}
                  </span>

                  <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditModal(subject)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-campus-800 transition-colors"
                      title="Edit Course"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteSubjectTarget(subject)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-campus-800 transition-colors"
                      title="Delete Course"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-white mt-3 group-hover:text-brand-indigo transition-colors">
                  {subject.name}
                </h3>

                {subject.description && (
                  <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                    {subject.description}
                  </p>
                )}

                <div className="mt-4 pt-3 border-t border-campus-700/60 space-y-2 text-xs text-slate-300">
                  <div className="flex items-center space-x-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{subject.instructor || 'Instructor not specified'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                    <span>{subject.credits} Credit Units</span>
                  </div>
                </div>
              </div>

              {/* Quick links footer */}
              <div className="mt-5 pt-3 border-t border-campus-700/60 flex items-center justify-between text-xs text-slate-400">
                <button
                  onClick={() => onNavigate('timetable')}
                  className="hover:text-brand-indigo flex items-center space-x-1 transition-colors"
                >
                  <Calendar className="w-3 h-3" />
                  <span>Schedule</span>
                </button>
                <button
                  onClick={() => onNavigate('assignments')}
                  className="hover:text-brand-indigo flex items-center space-x-1 transition-colors"
                >
                  <CheckSquare className="w-3 h-3" />
                  <span>Tasks</span>
                </button>
                <button
                  onClick={() => onNavigate('notes')}
                  className="hover:text-brand-indigo flex items-center space-x-1 transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-campus-900 border border-campus-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between pb-4 border-b border-campus-700/60">
              <h3 className="text-lg font-bold text-white">
                {editingSubject ? 'Edit Subject' : 'Add New Subject'}
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

            <form onSubmit={handleFormSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Subject Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Distributed Operating Systems"
                  className="w-full px-3 py-2 text-sm bg-campus-850 border border-campus-700 rounded-xl text-white focus:outline-none focus:border-brand-indigo"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Course Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. CS305"
                    className="w-full px-3 py-2 text-sm bg-campus-850 border border-campus-700 rounded-xl text-white font-mono focus:outline-none focus:border-brand-indigo"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Credits (Units)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={formData.credits}
                    onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm bg-campus-850 border border-campus-700 rounded-xl text-white focus:outline-none focus:border-brand-indigo"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Instructor / Professor
                </label>
                <input
                  type="text"
                  value={formData.instructor}
                  onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                  placeholder="e.g. Dr. Leslie Lamport"
                  className="w-full px-3 py-2 text-sm bg-campus-850 border border-campus-700 rounded-xl text-white focus:outline-none focus:border-brand-indigo"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Color Tag
                </label>
                <div className="flex items-center space-x-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: c })}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        formData.color === c ? 'scale-110 border-white' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description / Syllabus
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Course topics, office hours, grading policy..."
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
                  {submitting ? 'Saving...' : editingSubject ? 'Save Changes' : 'Create Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteSubjectTarget}
        title="Delete Subject"
        message={`Are you sure you want to delete ${deleteSubjectTarget?.name} (${deleteSubjectTarget?.code})? This will also remove its associated timetable sessions, assignments, notes, and attendance records.`}
        confirmText="Delete Subject"
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
