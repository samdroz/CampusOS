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
  Search,
  Filter,
  Trash2,
  Edit2,
  X,
  Percent,
} from 'lucide-react';
import { AttendanceRecord, OverallAttendanceSummary, Subject, AttendanceStatus } from '../types';
import { EmptyState } from '../components/EmptyState';
import { ConfirmModal } from '../components/ConfirmModal';

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

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Attendance & Attendance Compliance
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track class participation, view real percentages, and avoid dropping below the {warningThreshold}% threshold.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-semibold text-white bg-brand-indigo hover:bg-indigo-500 rounded-xl transition-all shadow-glow-indigo self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Record Attendance</span>
        </button>
      </div>

      {/* Threshold Warning Banner */}
      {isOverallWarning && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs sm:text-sm text-rose-300">
          <div className="flex items-center space-x-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-semibold">
              Warning: Your overall attendance is {overallPct}%, which is below the required {warningThreshold}% threshold!
            </span>
          </div>
          <span className="text-xs font-mono font-bold bg-rose-500/20 px-2 py-0.5 rounded text-rose-200">
            ACTION REQUIRED
          </span>
        </div>
      )}

      {/* Overall Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Overall Percentage Card */}
        <div className="sm:col-span-2 lg:col-span-1 glass-card p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall Rate</span>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-3xl font-black text-white">
                {overallPct !== null && overallPct !== undefined ? `${overallPct}%` : 'N/A'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {overallPct === null ? 'No sessions logged' : `${summary?.total_attended} of ${summary?.total_eligible} sessions`}
            </p>
          </div>
          <div className="mt-3 w-full bg-campus-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${isOverallWarning ? 'bg-rose-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(overallPct || 0, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Attended */}
        <div className="glass-card p-4 rounded-2xl flex items-center space-x-3.5">
          <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Attended</p>
            <p className="text-xl font-bold text-white">{summary?.total_attended || 0}</p>
            <p className="text-[10px] text-emerald-400 font-medium">Present</p>
          </div>
        </div>

        {/* Absent */}
        <div className="glass-card p-4 rounded-2xl flex items-center space-x-3.5">
          <div className="p-3 rounded-xl bg-rose-500/15 text-rose-400">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Missed</p>
            <p className="text-xl font-bold text-white">{summary?.total_absent || 0}</p>
            <p className="text-[10px] text-rose-400 font-medium">Unexcused</p>
          </div>
        </div>

        {/* Excused */}
        <div className="glass-card p-4 rounded-2xl flex items-center space-x-3.5">
          <div className="p-3 rounded-xl bg-blue-500/15 text-blue-400">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Excused</p>
            <p className="text-xl font-bold text-white">{summary?.total_excused || 0}</p>
            <p className="text-[10px] text-blue-400 font-medium">Approved leave</p>
          </div>
        </div>

        {/* Cancelled */}
        <div className="glass-card p-4 rounded-2xl flex items-center space-x-3.5">
          <div className="p-3 rounded-xl bg-slate-500/15 text-slate-400">
            <MinusCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Cancelled</p>
            <p className="text-xl font-bold text-white">{summary?.total_cancelled || 0}</p>
            <p className="text-[10px] text-slate-400 font-medium">Excluded</p>
          </div>
        </div>
      </div>

      {/* Per-Subject Attendance Breakdown Cards */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Course Participation Breakdown
        </h3>
        {(!summary?.subjects || summary.subjects.length === 0) ? (
          <div className="glass-panel p-6 rounded-2xl text-center text-xs text-slate-400">
            No subjects configured yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {summary.subjects.map((s) => (
              <div
                key={s.subject_id}
                className={`glass-card p-4 rounded-2xl space-y-3 ${
                  s.is_warning ? 'border-rose-500/30 bg-rose-950/10' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span
                      className="font-mono text-xs font-bold px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: `${s.subject_color || '#6366F1'}20`,
                        color: s.subject_color || '#6366F1',
                      }}
                    >
                      {s.subject_code}
                    </span>
                    <h4 className="text-sm font-bold text-white mt-1.5 truncate">{s.subject_name}</h4>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-lg font-black font-mono ${
                        s.is_warning ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {s.percentage !== null ? `${s.percentage}%` : 'N/A'}
                    </span>
                    {s.is_warning && (
                      <p className="text-[10px] font-bold text-rose-400">&lt; {warningThreshold}%</p>
                    )}
                  </div>
                </div>

                <div className="w-full bg-campus-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full ${s.is_warning ? 'bg-rose-500' : 'bg-brand-indigo'}`}
                    style={{ width: `${s.percentage || 0}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>
                    Present: <strong className="text-white">{s.attended}</strong> / {s.total_eligible}
                  </span>
                  <span>
                    Absent: <strong className="text-rose-400">{s.absent}</strong>
                  </span>
                  {s.excused > 0 && <span>Excused: {s.excused}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History Log & Filters */}
      <div className="glass-panel rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-campus-700/60">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-brand-indigo" />
            <span>Attendance History Logs ({filteredRecords.length})</span>
          </h3>

          {/* Filter controls */}
          <div className="flex flex-wrap items-center gap-2">
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

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-campus-900 border border-campus-700 rounded-xl text-slate-200 focus:outline-none focus:border-brand-indigo capitalize"
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
              className="px-2 py-1 text-xs bg-campus-900 border border-campus-700 rounded-xl text-slate-200 focus:outline-none"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="To"
              className="px-2 py-1 text-xs bg-campus-900 border border-campus-700 rounded-xl text-slate-200 focus:outline-none"
            />
            {(subjectFilter !== 'all' || statusFilter !== 'all' || dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setSubjectFilter('all');
                  setStatusFilter('all');
                  setDateFrom('');
                  setDateTo('');
                }}
                className="text-xs text-slate-400 hover:text-white underline px-1"
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
              <thead className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-campus-700/60">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Course</th>
                  <th className="py-2.5 px-3">Session</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Notes</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-campus-800/60">
                {filteredRecords.map((r) => {
                  let badge = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
                  if (r.status === 'absent') badge = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
                  if (r.status === 'excused') badge = 'bg-blue-500/15 text-blue-300 border-blue-500/30';
                  if (r.status === 'cancelled') badge = 'bg-slate-500/15 text-slate-400 border-slate-500/30';

                  return (
                    <tr key={r.id} className="hover:bg-campus-850/50 transition-colors">
                      <td className="py-3 px-3 font-mono font-medium text-slate-300">{r.date}</td>
                      <td className="py-3 px-3">
                        <span
                          className="font-mono font-bold px-2 py-0.5 rounded text-[10px]"
                          style={{
                            backgroundColor: `${r.subject_color || '#6366F1'}20`,
                            color: r.subject_color || '#6366F1',
                          }}
                        >
                          {r.subject_code}
                        </span>
                        <span className="ml-2 font-medium text-white">{r.subject_name}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-300">{r.session_name}</td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wider ${badge}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-400 italic max-w-xs truncate">{r.notes || '—'}</td>
                      <td className="py-3 px-3 text-right space-x-1">
                        <button
                          onClick={() => openEditModal(r)}
                          className="p-1 text-slate-400 hover:text-white rounded hover:bg-campus-800 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(r)}
                          className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-campus-800 transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-campus-900 border border-campus-700 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between pb-4 border-b border-campus-700/60">
              <h3 className="text-lg font-bold text-white">
                {editingRecord ? 'Edit Attendance Record' : 'Record Class Attendance'}
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
                  Subject *
                </label>
                <select
                  required
                  value={formData.subject_id}
                  disabled={!!editingRecord}
                  onChange={(e) => setFormData({ ...formData, subject_id: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 text-sm bg-campus-850 border border-campus-700 rounded-xl text-white focus:outline-none focus:border-brand-indigo disabled:opacity-60"
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
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    disabled={!!editingRecord}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-campus-850 border border-campus-700 rounded-xl text-white focus:outline-none focus:border-brand-indigo disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Status *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as AttendanceStatus })}
                    className="w-full px-3 py-2 text-sm bg-campus-850 border border-campus-700 rounded-xl text-white focus:outline-none focus:border-brand-indigo capitalize"
                  >
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="excused">Excused</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Session Name
                </label>
                <input
                  type="text"
                  value={formData.session_name}
                  onChange={(e) => setFormData({ ...formData, session_name: e.target.value })}
                  placeholder="e.g. Morning Lecture, Lab Session 4"
                  className="w-full px-3 py-2 text-sm bg-campus-850 border border-campus-700 rounded-xl text-white focus:outline-none focus:border-brand-indigo"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Medical slip submitted, quiz given..."
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
