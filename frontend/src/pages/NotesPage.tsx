import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Search,
  Pin,
  Trash2,
  Edit3,
  Eye,
  Tag,
  BookOpen,
  Calendar,
  X,
  Code,
  Copy,
  Check,
} from 'lucide-react';
import { Note, Subject } from '../types';
import { EmptyState } from '../components/EmptyState';
import { ConfirmModal } from '../components/ConfirmModal';

interface NotesPageProps {
  notes: Note[];
  subjects: Subject[];
  loading: boolean;
  onCreateNote: (data: Partial<Note>) => Promise<void>;
  onUpdateNote: (id: number, data: Partial<Note>) => Promise<void>;
  onDeleteNote: (id: number) => Promise<void>;
}

// Simple and safe Markdown renderer to avoid unsafe HTML/scripts
function renderSafeMarkdown(markdown: string) {
  // Strip dangerous tags first
  const sanitized = markdown
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '');

  const lines = sanitized.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  lines.forEach((line, index) => {
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${index}`}
            className="p-3 my-2 rounded-xl bg-campus-950 border border-campus-700 font-mono text-xs text-brand-cyan overflow-x-auto"
          >
            <code>{codeBuffer.join('\n')}</code>
          </pre>
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      return;
    }

    // Headers
    if (line.startsWith('# ')) {
      elements.push(<h1 key={index} className="text-xl font-black text-white mt-4 mb-2">{line.slice(2)}</h1>);
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={index} className="text-lg font-bold text-white mt-3 mb-1.5">{line.slice(3)}</h2>);
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={index} className="text-base font-semibold text-brand-indigo mt-2.5 mb-1">{line.slice(4)}</h3>);
    } else if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={index} className="border-l-4 border-brand-indigo pl-3 my-2 text-slate-300 italic text-xs bg-campus-850/60 py-1 rounded-r-lg">
          {line.slice(2)}
        </blockquote>
      );
    } else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      elements.push(
        <li key={index} className="ml-4 list-disc text-xs text-slate-300 my-0.5">
          {line.trim().slice(2)}
        </li>
      );
    } else if (line.trim()) {
      elements.push(<p key={index} className="text-xs text-slate-300 my-1 leading-relaxed">{line}</p>);
    } else {
      elements.push(<div key={index} className="h-2" />);
    }
  });

  if (inCodeBlock && codeBuffer.length > 0) {
    elements.push(
      <pre
        key="code-unclosed"
        className="p-3 my-2 rounded-xl bg-campus-950 border border-campus-700 font-mono text-xs text-brand-cyan overflow-x-auto"
      >
        <code>{codeBuffer.join('\n')}</code>
      </pre>
    );
  }

  return elements;
}

export const NotesPage: React.FC<NotesPageProps> = ({
  notes,
  subjects,
  loading,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
}) => {
  const [selectedNote, setSelectedNote] = useState<Note | null>(notes[0] || null);
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'preview' | 'edit'>('preview');

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);
  const [copied, setCopied] = useState(false);

  // Form State for editing or creating
  const [formSubjectId, setFormSubjectId] = useState<number>(subjects[0]?.id || 0);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formPinned, setFormPinned] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit in-place state for the selected note
  const [editTitle, setEditTitle] = useState(selectedNote?.title || '');
  const [editContent, setEditContent] = useState(selectedNote?.content || '');
  const [editTags, setEditTags] = useState(selectedNote?.tags || '');
  const [editSubjectId, setEditSubjectId] = useState(selectedNote?.subject_id || 0);
  const [editPinned, setEditPinned] = useState(selectedNote?.is_pinned || false);
  const [savingEdit, setSavingEdit] = useState(false);

  // When selected note changes, update in-place edit state
  React.useEffect(() => {
    if (selectedNote) {
      setEditTitle(selectedNote.title);
      setEditContent(selectedNote.content);
      setEditTags(selectedNote.tags || '');
      setEditSubjectId(selectedNote.subject_id || 0);
      setEditPinned(selectedNote.is_pinned);
    }
  }, [selectedNote?.id]);

  // Keep first note selected if current becomes null
  React.useEffect(() => {
    if (!selectedNote && notes.length > 0) {
      setSelectedNote(notes[0]);
    }
  }, [notes, selectedNote]);

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Note title is required');
      return;
    }
    if (!formContent.trim()) {
      setFormError('Note content cannot be empty');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      await onCreateNote({
        subject_id: formSubjectId || null,
        title: formTitle.trim(),
        content: formContent,
        tags: formTags.trim() || null,
        is_pinned: formPinned,
      });
      setIsNewModalOpen(false);
      setFormTitle('');
      setFormContent('');
      setFormTags('');
      setFormPinned(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create note');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveInPlace = async () => {
    if (!selectedNote) return;
    if (!editTitle.trim()) return;

    setSavingEdit(true);
    try {
      await onUpdateNote(selectedNote.id, {
        subject_id: editSubjectId || null,
        title: editTitle.trim(),
        content: editContent,
        tags: editTags.trim() || null,
        is_pinned: editPinned,
      });
      setActiveTab('preview');
    } catch (err: any) {
      alert(err.message || 'Failed to update note');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCopyNote = () => {
    if (!selectedNote) return;
    navigator.clipboard.writeText(selectedNote.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filtered = notes.filter((n) => {
    if (subjectFilter !== 'all' && n.subject_id !== parseInt(subjectFilter)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = n.title.toLowerCase().includes(q);
      const matchContent = n.content.toLowerCase().includes(q);
      const matchTags = n.tags?.toLowerCase().includes(q);
      if (!matchTitle && !matchContent && !matchTags) return false;
    }
    return true;
  });

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Lecture Notes & Study Guides
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Write rich Markdown lecture summaries, code snippets, formula derivations, and tag concepts.
          </p>
        </div>
        <button
          onClick={() => {
            setFormError('');
            setIsNewModalOpen(true);
          }}
          className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-semibold text-white bg-brand-indigo hover:bg-indigo-500 rounded-xl transition-all shadow-glow-indigo self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Note</span>
        </button>
      </div>

      {/* Main Split Layout: Notes List & Note Viewer/Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[580px]">
        {/* Left Column: Notes List (4 cols) */}
        <div className="lg:col-span-4 space-y-3 flex flex-col">
          {/* Search & Subject Filter */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notes & tags..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-campus-900 border border-campus-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-brand-indigo"
              />
            </div>

            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-campus-900 border border-campus-700 rounded-xl text-slate-300 focus:outline-none focus:border-brand-indigo"
            >
              <option value="all">All Courses</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.code} - {sub.name}
                </option>
              ))}
            </select>
          </div>

          {/* Notes Scrollable List */}
          <div className="flex-1 overflow-y-auto space-y-2 max-h-[620px] pr-1">
            {loading && notes.length === 0 ? (
              <div className="space-y-2 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-campus-850 rounded-xl"></div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-campus-900/60 rounded-xl border border-campus-700/60">
                No matching notes found.
              </div>
            ) : (
              filtered.map((note) => {
                const isSelected = selectedNote?.id === note.id;

                return (
                  <div
                    key={note.id}
                    onClick={() => {
                      setSelectedNote(note);
                      setActiveTab('preview');
                    }}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-campus-850 border-brand-indigo/60 shadow-glow-indigo'
                        : 'bg-campus-900/70 border-campus-700/60 hover:bg-campus-850/60 hover:border-campus-600'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span className="font-semibold text-xs text-white line-clamp-1 flex items-center space-x-1.5">
                        {note.is_pinned && <Pin className="w-3 h-3 text-brand-amber fill-brand-amber shrink-0" />}
                        <span className="truncate">{note.title}</span>
                      </span>
                      {note.subject_code && (
                        <span
                          className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded shrink-0 ml-1"
                          style={{
                            backgroundColor: `${note.subject_color || '#6366F1'}20`,
                            color: note.subject_color || '#6366F1',
                          }}
                        >
                          {note.subject_code}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {note.content.replace(/#|\*|`|>|\[|\]/g, '')}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{note.tags || 'Note'}</span>
                      <span>{new Date(note.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Note Viewer & Editor (8 cols) */}
        <div className="lg:col-span-8 glass-panel rounded-2xl flex flex-col overflow-hidden">
          {selectedNote ? (
            <>
              {/* Note Header / Controls */}
              <div className="p-4 border-b border-campus-700/60 flex items-center justify-between bg-campus-850/60 flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <span
                    className="font-mono text-xs font-bold px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: `${selectedNote.subject_color || '#6366F1'}20`,
                      color: selectedNote.subject_color || '#6366F1',
                    }}
                  >
                    {selectedNote.subject_code || 'General'}
                  </span>
                  <span className="text-xs text-slate-400">
                    Updated {new Date(selectedNote.updated_at).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Mode switcher: Preview vs Edit */}
                  <div className="bg-campus-900 border border-campus-700 p-0.5 rounded-xl flex items-center text-xs">
                    <button
                      onClick={() => setActiveTab('preview')}
                      className={`px-2.5 py-1 rounded-lg flex items-center space-x-1 font-semibold transition-all ${
                        activeTab === 'preview' ? 'bg-brand-indigo text-white shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('edit')}
                      className={`px-2.5 py-1 rounded-lg flex items-center space-x-1 font-semibold transition-all ${
                        activeTab === 'edit' ? 'bg-brand-indigo text-white shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  </div>

                  <button
                    onClick={handleCopyNote}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-campus-800 transition-colors"
                    title="Copy Markdown"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => setDeleteTarget(selectedNote)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-campus-800 transition-colors"
                    title="Delete Note"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Note Body */}
              <div className="flex-1 p-6 overflow-y-auto">
                {activeTab === 'preview' ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-3 border-b border-campus-700/60">
                      <h2 className="text-xl font-black text-white">{selectedNote.title}</h2>
                      {selectedNote.is_pinned && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center space-x-1">
                          <Pin className="w-3 h-3 fill-amber-300" />
                          <span>Pinned</span>
                        </span>
                      )}
                    </div>

                    {selectedNote.tags && (
                      <div className="flex items-center space-x-2 text-xs text-brand-indigo font-medium">
                        <Tag className="w-3.5 h-3.5" />
                        <span>{selectedNote.tags}</span>
                      </div>
                    )}

                    <div className="pt-2 text-slate-200">
                      {renderSafeMarkdown(selectedNote.content)}
                    </div>
                  </div>
                ) : (
                  /* In-Place Markdown Editor */
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Title</label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-campus-900 border border-campus-700 rounded-xl text-white font-bold focus:outline-none focus:border-brand-indigo"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Course Association</label>
                        <select
                          value={editSubjectId}
                          onChange={(e) => setEditSubjectId(parseInt(e.target.value))}
                          className="w-full px-3 py-1.5 text-xs bg-campus-900 border border-campus-700 rounded-xl text-white focus:outline-none focus:border-brand-indigo"
                        >
                          <option value="0">General Note (No Course)</option>
                          {subjects.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.code} - {s.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Tags (comma separated)</label>
                        <input
                          type="text"
                          value={editTags}
                          onChange={(e) => setEditTags(e.target.value)}
                          placeholder="e.g. Algorithms, Trees, Quiz"
                          className="w-full px-3 py-1.5 text-xs bg-campus-900 border border-campus-700 rounded-xl text-white focus:outline-none focus:border-brand-indigo"
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="editPinned"
                        checked={editPinned}
                        onChange={(e) => setEditPinned(e.target.checked)}
                        className="rounded border-campus-700 bg-campus-900 text-brand-indigo focus:ring-0"
                      />
                      <label htmlFor="editPinned" className="text-xs text-slate-300">
                        Pin note to top of library
                      </label>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">
                        Markdown Content
                      </label>
                      <textarea
                        rows={14}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        placeholder="# Heading&#10;&#10;Write Markdown here..."
                        className="w-full p-3 text-xs sm:text-sm font-mono bg-campus-950 border border-campus-700 rounded-xl text-slate-200 focus:outline-none focus:border-brand-indigo leading-relaxed"
                      />
                    </div>

                    <div className="flex justify-end space-x-2 pt-2">
                      <button
                        onClick={() => setActiveTab('preview')}
                        className="px-3.5 py-1.5 text-xs font-medium text-slate-300 bg-campus-800 rounded-xl"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveInPlace}
                        disabled={savingEdit}
                        className="px-4 py-1.5 text-xs font-semibold text-white bg-brand-indigo hover:bg-indigo-500 rounded-xl shadow-glow-indigo transition-all disabled:opacity-50"
                      >
                        {savingEdit ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <EmptyState
                icon={FileText}
                title="No note selected"
                description="Select a note from the left sidebar to read or edit its contents, or create a brand new one."
                actionText="Create New Note"
                onAction={() => setIsNewModalOpen(true)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create New Note */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-campus-900 border border-campus-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between pb-4 border-b border-campus-700/60">
              <h3 className="text-lg font-bold text-white">Create New Lecture Note</h3>
              <button
                onClick={() => setIsNewModalOpen(false)}
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

            <form onSubmit={handleCreateNew} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Note Title *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Asymptotic Notation & Amortized Analysis"
                  className="w-full px-3 py-2 text-sm bg-campus-850 border border-campus-700 rounded-xl text-white focus:outline-none focus:border-brand-indigo"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Subject Association
                  </label>
                  <select
                    value={formSubjectId}
                    onChange={(e) => setFormSubjectId(parseInt(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-campus-850 border border-campus-700 rounded-xl text-white focus:outline-none focus:border-brand-indigo"
                  >
                    <option value="0">General Note (No Subject)</option>
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.code} - {sub.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    placeholder="e.g. Algorithms, Big-O, Math"
                    className="w-full px-3 py-2 text-sm bg-campus-850 border border-campus-700 rounded-xl text-white focus:outline-none focus:border-brand-indigo"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="pinNoteCheck"
                  checked={formPinned}
                  onChange={(e) => setFormPinned(e.target.checked)}
                  className="rounded border-campus-700 bg-campus-850 text-brand-indigo focus:ring-0"
                />
                <label htmlFor="pinNoteCheck" className="text-xs text-slate-300">
                  Pin this note to the top of your list
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Markdown Content *
                </label>
                <textarea
                  rows={8}
                  required
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="# Lecture Summary&#10;&#10;Key Takeaways:&#10;- Point 1&#10;- Point 2"
                  className="w-full p-3 text-xs sm:text-sm font-mono bg-campus-950 border border-campus-700 rounded-xl text-white focus:outline-none focus:border-brand-indigo"
                />
              </div>

              <div className="pt-3 border-t border-campus-700/60 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-campus-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-semibold text-white bg-brand-indigo hover:bg-indigo-500 rounded-xl shadow-glow-indigo transition-all disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Note"
        message={`Are you sure you want to delete "${deleteTarget?.title}"?`}
        confirmText="Delete Note"
        onConfirm={async () => {
          if (deleteTarget) {
            await onDeleteNote(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
