import React, { useState } from 'react';
import {
  UserCheck,
  Plus,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  MinusCircle,
  Trash2,
  Edit2,
  X,
} from 'lucide-react';
import { AttendanceRecord, OverallAttendanceSummary, Subject, AttendanceStatus } from '../types';
import { EmptyState } from '../components/EmptyState';
import { ConfirmModal } from '../components/ConfirmModal';
import { AcademicLoader } from '../components/AcademicLoader';

interface AttendancePageProps {
  summary: OverallAttendanceSummary | null;
  records: AttendanceRecord[];
  subjects: Subject[];
  loading: boolean;
  onRecordAttendance: (data: Partial<AttendanceRecord>) => Promise<void>;
  onUpdateAttendance: (id: number, data: Partial<AttendanceRecord>) => Promise<void>;
  onDeleteAttendance: (id: number) => Promise<void>;
}

export const AttendancePage: React.FC<AttendancePageProps> = ({
  summary,
  records,
  subjects,
  loading,
  onRecordAttendance,
  onUpdateAttendance,
  onDeleteAttendance,
}) => {
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AttendanceRecord | null>(null);

  const [formData, setFormData] = useState({
    subject_id: subjects[0]?.id || 0,
    date: new Date().toISOString().slice(0, 10),
    status: 'present' as AttendanceStatus,
    session_name: 'Regular Class',
    notes: '',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const openCreateModal = () => {
    setEditingRecord(null);
    setFormData({
      subject_id: subjects[0]?.id || 0,
      date: new Date().toISOString().slice(0, 10),
      status: 'present',
      session_name: 'Regular Class',
      notes: '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (r: AttendanceRecord) => {
    setEditingRecord(r);
    setFormData({
      subject_id: r.subject_id,
      date: r.date,
      status: r.status,
      session_name: r.session_name,
      notes: r.notes || '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject_id) {
      setFormError('Subject is required');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      if (editingRecord) {
        await onUpdateAttendance(editingRecord.id, formData);
      } else {
        await onRecordAttendance(formData);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter records
  const filteredRecords = records.filter((r) => {
    if (subjectFilter !== 'all' && r.subject_id !== parseInt(subjectFilter)) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (dateFrom && r.date < dateFrom) return false;
    if (dateTo && r.date > dateTo) return false;
    return true;
  });

  const overallPct = summary?.overall_percentage;
  const isOverallWarning = summary?.is_warning;
  const warningThreshold = summary?.warning_threshold || 75;

  if (loading && !summary && records.length === 0) {
    return (
      <div className="p-4 sm:p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[50vh]">
        <AcademicLoader module="attendance" size="lg" message="Calculating attendance compliance..." />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-txt-primary tracking-tight">
            Attendance
          </h2>
          <p className="text-xs sm:text-sm text-txt-secondary mt-1">
            Track class participation, minimum compliance, and absence logs.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white bg-accent hover:bg-accent-hover rounded-xl transition-all shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Record Attendance</span>
        </button>
      </div>

      {/* Threshold Warning Banner */}
      {isOverallWarning && (
        <div className="p-3.5 rounded-xl bg-semantic-danger/10 border border-semantic-danger/25 flex items-center justify-between text-xs sm:text-sm text-semantic-danger">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="font-medium">
              Overall attendance is {overallPct}%, which is below the {warningThreshold}% threshold.
            </span>
          </div>
          <span className="text-[11px] font-mono font-semibold bg-semantic-danger/15 px-2 py-0.5 rounded">
            ATTENTION REQUIRED
          </span>
        </div>
      )}

      {/* Overall Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Overall Percentage Card */}
        <div className="sm:col-span-2 lg:col-span-1 app-card p-4 rounded-2xl flex flex-col justify-between">
          <div>
            <span className="text-xs font-medium text-txt-secondary uppercase tracking-wider">Overall Rate</span>
            <div className="mt-1 flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-txt-primary">
                {overallPct !== null && overallPct !== undefined ? `${overallPct}%` : 'N/A'}
              </span>
            </div>
            <p className="text-[11px] text-txt-muted mt-0.5">
              {overallPct === null ? 'No sessions logged' : `${summary?.total_attended} of ${summary?.total_eligible} eligible`}
            </p>
          </div>
          <div className="mt-2.5 w-full bg-surface-elevated rounded-full h-1.5 overflow-hidden border border-border-subtle">
            <div
              className={`h-full transition-all duration-500 ${isOverallWarning ? 'bg-semantic-danger' : 'bg-semantic-success'}`}
              style={{ width: `${Math.min(overallPct || 0, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Attended */}
        <div className="app-card p-4 rounded-2xl flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-surface-elevated border border-border-subtle text-semantic-success">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-txt-secondary font-medium">Attended</p>
            <p className="text-lg font-bold text-txt-primary">{summary?.total_attended || 0}</p>
            <p className="text-[10px] text-txt-muted">Present</p>
          </div>
        </div>

        {/* Absent */}
        <div className="app-card p-4 rounded-2xl flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-surface-elevated border border-border-subtle text-semantic-danger">
            <XCircle className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-txt-secondary font-medium">Missed</p>
            <p className="text-lg font-bold text-txt-primary">{summary?.total_absent || 0}</p>
            <p className="text-[10px] text-txt-muted">Unexcused</p>
          </div>
        </div>

        {/* Excused */}
        <div className="app-card p-4 rounded-2xl flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-surface-elevated border border-border-subtle text-txt-secondary">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-txt-secondary font-medium">Excused</p>
            <p className="text-lg font-bold text-txt-primary">{summary?.total_excused || 0}</p>
            <p className="text-[10px] text-txt-muted">Authorized</p>
          </div>
        </div>

        {/* Cancelled */}
        <div className="app-card p-4 rounded-2xl flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-surface-elevated border border-border-subtle text-txt-muted">
            <MinusCircle className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-txt-secondary font-medium">Cancelled</p>
            <p className="text-lg font-bold text-txt-primary">{summary?.total_cancelled || 0}</p>
            <p className="text-[10px] text-txt-muted">Excluded</p>
          </div>
        </div>
      </div>

      {/* Per-Subject Attendance Breakdown Cards */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-txt-secondary">
          Course Participation Breakdown
        </h3>
        {(!summary?.subjects || summary.subjects.length === 0) ? (
          <div className="app-panel p-6 rounded-2xl text-center text-xs text-txt-muted">
            No subjects configured yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {summary.subjects.map((s) => (
              <div
                key={s.subject_id}
                className={`app-card p-4 rounded-2xl space-y-2.5 ${
                  s.is_warning ? 'border-semantic-danger/35' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span
                      className="font-mono text-xs font-semibold px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: `${s.subject_color || '#4F46E5'}15`,
                        color: s.subject_color || '#4F46E5',
                      }}
                    >
                      {s.subject_code}
                    </span>
                    <h4 className="text-sm font-semibold text-txt-primary mt-1 truncate">{s.subject_name}</h4>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-base font-bold font-mono ${
                        s.is_warning ? 'text-semantic-danger' : 'text-semantic-success'
                      }`}
                    >
                      {s.percentage !== null ? `${s.percentage}%` : 'N/A'}
                    </span>
                    {s.is_warning && (
                      <p className="text-[10px] font-semibold text-semantic-danger">&lt; {warningThreshold}%</p>
                    )}
                  </div>
                </div>

                <div className="w-full bg-surface-elevated rounded-full h-1.5 overflow-hidden border border-border-subtle">
                  <div
                    className={`h-full ${s.is_warning ? 'bg-semantic-danger' : 'bg-accent'}`}
                    style={{ width: `${s.percentage || 0}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-txt-secondary pt-0.5">
                  <span>
                    Attended: <strong className="text-txt-primary font-semibold">{s.attended}</strong> / {s.total_eligible}
                  </span>
                  <span>
                    Absent: <strong className={s.absent > 0 ? 'text-semantic-danger font-semibold' : 'text-txt-secondary'}>{s.absent}</strong>
                  </span>
                  {s.excused > 0 && <span>Excused: {s.excused}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History Log & Filters */}
      <div className="app-panel rounded-2xl p-4 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-subtle">
          <h3 className="text-sm font-semibold text-txt-primary flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-accent" />
            <span>Attendance History Logs ({filteredRecords.length})</span>
          </h3>

          {/* Filter controls */}
          <div className="flex flex-wrap items-center gap-2">
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

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-surface-elevated border border-border-default rounded-xl text-txt-secondary focus:outline-none focus:border-accent capitalize"
            >
              <option value="all">All Statuses</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="excused">Excused</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="From"
              className="px-2 py-1 text-xs bg-surface-elevated border border-border-default rounded-xl text-txt-secondary focus:outline-none focus:border-accent"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="To"
              className="px-2 py-1 text-xs bg-surface-elevated border border-border-default rounded-xl text-txt-secondary focus:outline-none focus:border-accent"
            />
            {(subjectFilter !== 'all' || statusFilter !== 'all' || dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setSubjectFilter('all');
                  setStatusFilter('all');
                  setDateFrom('');
                  setDateTo('');
                }}
                className="text-xs text-txt-muted hover:text-txt-primary underline px-1"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Table of Records */}
        {filteredRecords.length === 0 ? (
          <EmptyState
            icon={UserCheck}
            title="No attendance records found"
            description="No logs match your filter criteria or no attendance has been recorded yet."
            actionText="Record First Session"
            onAction={openCreateModal}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] font-medium uppercase tracking-wider text-txt-muted border-b border-border-subtle">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Course</th>
                  <th className="py-2.5 px-3">Session</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Notes</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredRecords.map((r) => {
                  let badge = 'bg-semantic-success/10 text-semantic-success border-semantic-success/20';
                  if (r.status === 'absent') badge = 'bg-semantic-danger/10 text-semantic-danger border-semantic-danger/20';
                  else if (r.status === 'excused') badge = 'bg-surface-elevated text-txt-secondary border-border-subtle';
                  else if (r.status === 'cancelled') badge = 'bg-surface-elevated text-txt-muted border-border-subtle';

                  return (
                    <tr key={r.id} className="hover:bg-surface-elevated/60 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium text-txt-secondary">{r.date}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className="font-mono font-semibold px-1.5 py-0.5 rounded text-[10px]"
                          style={{
                            backgroundColor: `${r.subject_color || '#4F46E5'}15`,
                            color: r.subject_color || '#4F46E5',
                          }}
                        >
                          {r.subject_code}
                        </span>
                        <span className="ml-2 font-medium text-txt-primary">{r.subject_name}</span>
                      </td>
                      <td className="py-2.5 px-3 text-txt-secondary">{r.session_name}</td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-medium uppercase tracking-wider ${badge}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-txt-muted italic max-w-xs truncate">{r.notes || '—'}</td>
                      <td className="py-2.5 px-3 text-right space-x-1">
                        <button
                          onClick={() => openEditModal(r)}
                          className="p-1 text-txt-muted hover:text-txt-primary rounded hover:bg-surface-elevated transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(r)}
                          className="p-1 text-txt-muted hover:text-semantic-danger rounded hover:bg-surface-elevated transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface border border-border-default rounded-2xl max-w-md w-full p-6 shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
              <h3 className="text-base font-semibold text-txt-primary">
                {editingRecord ? 'Edit Attendance Record' : 'Record Class Attendance'}
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
                  Subject *
                </label>
                <select
                  required
                  value={formData.subject_id}
                  disabled={!!editingRecord}
                  onChange={(e) => setFormData({ ...formData, subject_id: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-surface-elevated border border-border-default rounded-xl text-txt-primary focus:outline-none focus:border-accent disabled:opacity-50"
                >
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.code} - {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-txt-secondary mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    disabled={!!editingRecord}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-surface-elevated border border-border-default rounded-xl text-txt-primary focus:outline-none focus:border-accent disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-txt-secondary mb-1">
                    Status *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as AttendanceStatus })}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-surface-elevated border border-border-default rounded-xl text-txt-primary focus:outline-none focus:border-accent capitalize"
                  >
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="excused">Excused</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-txt-secondary mb-1">
                  Session Name
                </label>
                <input
                  type="text"
                  value={formData.session_name}
                  onChange={(e) => setFormData({ ...formData, session_name: e.target.value })}
                  placeholder="e.g. Morning Lecture, Lab Session 4"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-surface-elevated border border-border-default rounded-xl text-txt-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-txt-secondary mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Medical slip submitted, quiz given..."
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
                  {submitting ? 'Saving...' : editingRecord ? 'Save Changes' : 'Record Attendance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Attendance Record"
        message={`Are you sure you want to delete the attendance log for ${deleteTarget?.subject_name} on ${deleteTarget?.date}?`}
        confirmText="Delete Record"
        onConfirm={async () => {
          if (deleteTarget) {
            await onDeleteAttendance(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
