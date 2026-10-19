import React, { useState } from 'react';
import {
  Settings,
  User,
  ShieldAlert,
  Calendar,
  Download,
  Upload,
  Database,
  Moon,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { SettingsMap } from '../types';
import { api } from '../api/client';
import { useToast } from '../components/Toast';

interface SettingsPageProps {
  settings: SettingsMap;
  onUpdateSettings: (newSettings: Partial<SettingsMap>) => Promise<void>;
  onResetDemoData: () => Promise<void>;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onUpdateSettings,
  onResetDemoData,
}) => {
  const { success, error } = useToast();
  const [formData, setFormData] = useState({
    student_name: settings.student_name || 'Alex Morgan',
    student_id: settings.student_id || 'STU-8829',
    major: settings.major || 'Computer Science & Engineering',
    attendance_threshold: settings.attendance_threshold || '75.0',
    week_start: settings.week_start || 'monday',
    theme: settings.theme || 'dark',
  });
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onUpdateSettings(formData);
      success('Settings updated', 'Preferences saved to persistent database');
    } catch (err: any) {
      error('Failed to update settings', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      const data = await api.backup.export();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `campusos_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      success('Backup exported', 'Full campus database saved to JSON file');
    } catch (err: any) {
      error('Export failed', err.message);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const res = await api.backup.import(parsed);
      success('Data restored', `${res.message}`);
      window.location.reload();
    } catch (err: any) {
      error('Import rejected', err.message || 'Invalid JSON format');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleSeed = async () => {
    if (!confirm('This will load fresh demo subjects, timetable sessions, and coursework. Continue?')) {
      return;
    }
    setSeeding(true);
    try {
      await onResetDemoData();
      success('Demo data restored', 'Academic dataset loaded successfully');
    } catch (err: any) {
      error('Seeding failed', err.message);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
          System & Profile Settings
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Configure personal credentials, compliance thresholds, calendar layouts, and backup archives.
        </p>
      </div>

      {/* Student Profile Card */}
      <div className="glass-panel rounded-2xl p-6 space-y-5">
        <div className="flex items-center space-x-3 pb-3 border-b border-campus-700/60">
          <div className="p-2 rounded-xl bg-brand-indigo/15 text-brand-indigo">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Student Profile</h3>
            <p className="text-xs text-slate-400">Personal academic identity displayed across CampusOS</p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Full Student Name
              </label>
              <input
                type="text"
                required
                value={formData.student_name}
                onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-campus-850 border border-campus-700 rounded-xl text-white focus:outline-none focus:border-brand-indigo"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Student ID / Roll No.
              </label>
              <input
                type="text"
                value={formData.student_id}
                onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-campus-850 border border-campus-700 rounded-xl text-white font-mono focus:outline-none focus:border-brand-indigo"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Major / Degree Program
            </label>
            <input
              type="text"
              value={formData.major}
              onChange={(e) => setFormData({ ...formData, major: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-campus-850 border border-campus-700 rounded-xl text-white focus:outline-none focus:border-brand-indigo"
            />
          </div>

          {/* Academic Preferences */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Attendance Warning Threshold (%)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                step="1"
                value={formData.attendance_threshold}
                onChange={(e) => setFormData({ ...formData, attendance_threshold: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-campus-850 border border-campus-700 rounded-xl text-white focus:outline-none focus:border-brand-indigo font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Triggers visual warning badges when subject attendance drops below this value. Default: 75%
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Week Starts On
              </label>
              <select
                value={formData.week_start}
                onChange={(e) => setFormData({ ...formData, week_start: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-campus-850 border border-campus-700 rounded-xl text-white focus:outline-none focus:border-brand-indigo"
              >
                <option value="monday">Monday (ISO Standard)</option>
                <option value="sunday">Sunday</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold text-white bg-brand-indigo hover:bg-indigo-500 rounded-xl shadow-glow-indigo transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Data Management & Backup Archive */}
      <div className="glass-panel rounded-2xl p-6 space-y-5">
        <div className="flex items-center space-x-3 pb-3 border-b border-campus-700/60">
          <div className="p-2 rounded-xl bg-brand-cyan/15 text-brand-cyan">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Data Management & Local Persistence</h3>
            <p className="text-xs text-slate-400">
              CampusOS stores all records locally in SQLite (`campusos.db`). Export or restore anytime.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Export */}
          <div className="p-4 rounded-xl bg-campus-850 border border-campus-700 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center space-x-2 text-brand-cyan font-bold text-xs uppercase tracking-wider">
                <Download className="w-4 h-4" />
                <span>Export JSON</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Download a complete portable JSON archive containing all subjects, timetable, notes, and attendance.
              </p>
            </div>
            <button
              onClick={handleExportData}
              className="w-full py-2 text-xs font-semibold text-white bg-campus-800 hover:bg-campus-750 border border-campus-700 rounded-xl transition-all"
            >
              Download Backup
            </button>
          </div>

          {/* Import */}
          <div className="p-4 rounded-xl bg-campus-850 border border-campus-700 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center space-x-2 text-brand-indigo font-bold text-xs uppercase tracking-wider">
                <Upload className="w-4 h-4" />
                <span>Import JSON</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Upload a verified CampusOS JSON backup file to restore records transactionally.
              </p>
            </div>
            <label className="w-full py-2 text-xs font-semibold text-center text-white bg-campus-800 hover:bg-campus-750 border border-campus-700 rounded-xl transition-all cursor-pointer">
              <span>{importing ? 'Restoring...' : 'Upload & Restore'}</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleImportFile}
                disabled={importing}
                className="hidden"
              />
            </label>
          </div>

          {/* Demo Data Reset */}
          <div className="p-4 rounded-xl bg-campus-850 border border-campus-700 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center space-x-2 text-brand-amber font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Demo Dataset</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Populate complete realistic courses, timetable, overdue tasks, exams, and attendance histories.
              </p>
            </div>
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="w-full py-2 text-xs font-semibold text-white bg-brand-indigo/30 hover:bg-brand-indigo/50 border border-brand-indigo/50 rounded-xl transition-all disabled:opacity-50"
            >
              {seeding ? 'Seeding...' : 'Load Demo Data'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
