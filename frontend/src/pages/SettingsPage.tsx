import React, { useState, useEffect } from 'react';
import {
  User,
  Sun,
  Moon,
  Download,
  Upload,
  Database,
  Calendar,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  GraduationCap,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { SettingsMap, StudentProfile } from '../types';
import { api } from '../api/client';
import { useToast } from '../components/Toast';
import { ConfirmModal } from '../components/ConfirmModal';

interface SettingsPageProps {
  settings: SettingsMap;
  currentTheme: 'dark' | 'light';
  onToggleTheme: (theme: 'dark' | 'light') => void;
  onUpdateSettings: (newSettings: Partial<SettingsMap>) => Promise<void>;
  onResetDemoData: () => Promise<void>;
  onLaunchOnboarding?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  currentTheme,
  onToggleTheme,
  onUpdateSettings,
  onResetDemoData,
  onLaunchOnboarding,
}) => {
  const { success, error, info } = useToast();

  // Full Student Profile State
  const [profile, setProfile] = useState<StudentProfile>({
    full_name: settings.student_name || '',
    preferred_name: '',
    roll_number: settings.student_id || '',
    register_number: '',
    email: '',
    institution: '',
    degree: settings.major || '',
    department: '',
    admission_year: '',
    academic_year: '',
    semester: '',
    university: '',
    attendance_target: parseFloat(settings.attendance_threshold) || 75.0,
    onboarding_completed: false,
  });

  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  // Fetch full student profile from backend
  useEffect(() => {
    api.profile
      .get()
      .then((p) => {
        if (p) {
          setProfile({
            ...p,
            full_name: p.full_name || settings.student_name || '',
            roll_number: p.roll_number || settings.student_id || '',
            degree: p.degree || settings.major || '',
            attendance_target: p.attendance_target || parseFloat(settings.attendance_threshold) || 75.0,
          });
        }
      })
      .catch((err) => {
        console.warn('Could not load detailed profile:', err);
      });
  }, [settings]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (!profile.full_name.trim()) {
        throw new Error('Full name cannot be empty');
      }
      await api.profile.update(profile);
      await onUpdateSettings({
        student_name: profile.preferred_name?.trim() || profile.full_name.trim(),
        student_id: profile.roll_number || profile.register_number || '',
        major: profile.department || profile.degree || '',
        attendance_threshold: String(profile.attendance_target),
      });
      success('Profile updated', 'Your student credentials and academic profile have been saved.');
    } catch (err: any) {
      error('Failed to update profile', err.message);
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
      success('Backup exported', 'Full campus database safely saved to local JSON archive.');
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
      if (!parsed.subjects && !parsed.settings) {
        throw new Error('Invalid backup file. Missing required CampusOS data structure.');
      }
      const res = await api.backup.import(parsed);
      success('Data restored', `${res.message}`);
      window.location.reload();
    } catch (err: any) {
      error('Import rejected', err.message || 'Invalid JSON format or corrupted archive');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleConfirmResetDemo = async () => {
    setShowSeedModal(false);
    setSeeding(true);
    try {
      await onResetDemoData();
      success('Demo data restored', 'Realistic coursework and demo dataset loaded.');
    } catch (err: any) {
      error('Seeding failed', err.message);
    } finally {
      setSeeding(false);
    }
  };

  const handleConfirmResetAllData = async () => {
    setShowResetModal(false);
    setResetting(true);
    try {
      await api.profile.resetData(true);
      success('All Data Reset', 'Local database has been wiped clean.');
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (err: any) {
      error('Reset failed', err.message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-txt-primary tracking-tight">
            Settings & Preferences
          </h2>
          <p className="text-xs sm:text-sm text-txt-secondary mt-1">
            Manage your personal credentials, degree details, local privacy, and database persistence.
          </p>
        </div>

        {onLaunchOnboarding && (
          <button
            type="button"
            onClick={onLaunchOnboarding}
            className="px-3.5 py-2 rounded-xl border border-accent/40 bg-accent-subtle hover:bg-accent/20 text-accent text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" /> Revisit Setup Wizard
          </button>
        )}
      </div>

      {/* Local-First Privacy Notice */}
      <div className="app-panel rounded-xl p-5 border-l-4 border-emerald-500 bg-emerald-500/5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-txt-primary">
              Offline-First & Local Data Privacy
            </h3>
            <p className="text-xs text-txt-secondary leading-relaxed">
              CampusOS runs entirely on your computer. All personal profile information, enrolled subjects, timetable slots, assignments, attendance logs, and notes are saved directly inside your operating system’s per-user data directory in an offline SQLite database.
            </p>
            <p className="text-[11px] text-txt-muted">
              Database location: <span className="font-mono text-txt-secondary">%APPDATA%\CampusOS\campusos.db</span> (Zero cloud telemetry, zero external servers).
            </p>
          </div>
        </div>
      </div>

      {/* Appearance / Theme Selector */}
      <div className="app-panel rounded-xl p-5 space-y-4">
        <div className="pb-3 border-b border-border-subtle">
          <h3 className="text-sm font-semibold text-txt-primary">Appearance</h3>
          <p className="text-xs text-txt-secondary mt-0.5">
            Select interface theme. Changes persist across application restarts.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
          <button
            type="button"
            onClick={() => onToggleTheme('dark')}
            className={`p-3.5 rounded-xl text-left border flex items-center justify-between transition-all ${
              currentTheme === 'dark'
                ? 'border-accent bg-accent-subtle shadow-sm'
                : 'border-border-subtle bg-surface hover:bg-surface-elevated'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-200">
                <Moon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-txt-primary">Dark</p>
                <p className="text-xs text-txt-muted">Charcoal surface (Default)</p>
              </div>
            </div>
            {currentTheme === 'dark' && <span className="w-2 h-2 rounded-full bg-accent"></span>}
          </button>

          <button
            type="button"
            onClick={() => onToggleTheme('light')}
            className={`p-3.5 rounded-xl text-left border flex items-center justify-between transition-all ${
              currentTheme === 'light'
                ? 'border-accent bg-accent-subtle shadow-sm'
                : 'border-border-subtle bg-surface hover:bg-surface-elevated'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-800">
                <Sun className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-txt-primary">Light</p>
                <p className="text-xs text-txt-muted">Clean high-contrast surface</p>
              </div>
            </div>
            {currentTheme === 'light' && <span className="w-2 h-2 rounded-full bg-accent"></span>}
          </button>
        </div>
      </div>

      {/* Student Profile & Academic Settings */}
      <div className="app-panel rounded-xl p-5 space-y-4">
        <div className="flex items-center space-x-2.5 pb-3 border-b border-border-subtle">
          <GraduationCap className="w-4 h-4 text-accent" />
          <div>
            <h3 className="text-sm font-semibold text-txt-primary">Student Profile</h3>
            <p className="text-xs text-txt-secondary">
              Personal identity and institutional details shown on your dashboard and reports
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          {/* Personal Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-txt-secondary mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                className="w-full px-3 py-2 text-sm app-input rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-txt-secondary mb-1">
                Preferred Name (Used in Greetings)
              </label>
              <input
                type="text"
                value={profile.preferred_name || ''}
                onChange={(e) => setProfile({ ...profile, preferred_name: e.target.value })}
                placeholder="Nickname or preferred name"
                className="w-full px-3 py-2 text-sm app-input rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-txt-secondary mb-1">
                Student Email
              </label>
              <input
                type="email"
                value={profile.email || ''}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                placeholder="student@institution.edu"
                className="w-full px-3 py-2 text-sm app-input rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-txt-secondary mb-1">
                Roll Number
              </label>
              <input
                type="text"
                value={profile.roll_number || ''}
                onChange={(e) => setProfile({ ...profile, roll_number: e.target.value })}
                placeholder="e.g. 21CS042"
                className="w-full px-3 py-2 text-sm app-input rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-txt-secondary mb-1">
                Register Number
              </label>
              <input
                type="text"
                value={profile.register_number || ''}
                onChange={(e) => setProfile({ ...profile, register_number: e.target.value })}
                placeholder="e.g. 910021104042"
                className="w-full px-3 py-2 text-sm app-input rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-txt-secondary mb-1">
                College / Institution Name
              </label>
              <input
                type="text"
                value={profile.institution || ''}
                onChange={(e) => setProfile({ ...profile, institution: e.target.value })}
                placeholder="e.g. College of Engineering"
                className="w-full px-3 py-2 text-sm app-input rounded-lg"
              />
            </div>
          </div>

          {/* Academic Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border-subtle">
            <div>
              <label className="block text-xs font-medium text-txt-secondary mb-1">
                Degree / Programme
              </label>
              <input
                type="text"
                value={profile.degree || ''}
                onChange={(e) => setProfile({ ...profile, degree: e.target.value })}
                placeholder="e.g. B.Tech / B.E."
                className="w-full px-3 py-2 text-sm app-input rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-txt-secondary mb-1">
                Department / Branch
              </label>
              <input
                type="text"
                value={profile.department || ''}
                onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                placeholder="e.g. Computer Science"
                className="w-full px-3 py-2 text-sm app-input rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-txt-secondary mb-1">
                Current Semester
              </label>
              <input
                type="text"
                value={profile.semester || ''}
                onChange={(e) => setProfile({ ...profile, semester: e.target.value })}
                placeholder="e.g. Semester 5"
                className="w-full px-3 py-2 text-sm app-input rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-txt-secondary mb-1">
                Admission Year
              </label>
              <input
                type="text"
                value={profile.admission_year || ''}
                onChange={(e) => setProfile({ ...profile, admission_year: e.target.value })}
                placeholder="e.g. 2022"
                className="w-full px-3 py-2 text-sm app-input rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-txt-secondary mb-1">
                Academic Year
              </label>
              <input
                type="text"
                value={profile.academic_year || ''}
                onChange={(e) => setProfile({ ...profile, academic_year: e.target.value })}
                placeholder="e.g. 2024–2025"
                className="w-full px-3 py-2 text-sm app-input rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-txt-secondary mb-1">
                University / Affiliation
              </label>
              <input
                type="text"
                value={profile.university || ''}
                onChange={(e) => setProfile({ ...profile, university: e.target.value })}
                placeholder="e.g. State Technical University"
                className="w-full px-3 py-2 text-sm app-input rounded-lg"
              />
            </div>
          </div>

          {/* Academic Preferences */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border-subtle">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-txt-secondary">
                  Attendance Warning Threshold (%)
                </label>
                <span className="text-xs font-bold text-accent">
                  {profile.attendance_target}%
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="95"
                step="1"
                value={profile.attendance_target}
                onChange={(e) =>
                  setProfile({ ...profile, attendance_target: parseFloat(e.target.value) })
                }
                className="w-full accent-accent"
              />
              <span className="text-[11px] text-txt-muted mt-1 block">
                Subjects with attendance below this percentage display warning badges.
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-txt-secondary mb-1">
                Week Starts On
              </label>
              <select
                value={settings.week_start || 'monday'}
                onChange={(e) => onUpdateSettings({ week_start: e.target.value })}
                className="w-full px-3 py-2 text-sm app-input rounded-lg"
              >
                <option value="monday">Monday (ISO Standard)</option>
                <option value="sunday">Sunday</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-accent hover:bg-accent-hover rounded-lg transition-colors disabled:opacity-50 shadow-sm"
            >
              {saving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Data Management & Backup Archive */}
      <div className="app-panel rounded-xl p-5 space-y-4">
        <div className="flex items-center space-x-2.5 pb-3 border-b border-border-subtle">
          <Database className="w-4 h-4 text-txt-muted" />
          <div>
            <h3 className="text-sm font-semibold text-txt-primary">Data Management & Persistence</h3>
            <p className="text-xs text-txt-secondary">
              Export and restore portable JSON snapshots, or reset your local database
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Export */}
          <div className="p-3.5 rounded-lg border border-border-subtle bg-surface flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-txt-primary">
                <Download className="w-4 h-4 text-txt-muted" />
                <span>Export Backup</span>
              </div>
              <p className="text-xs text-txt-muted mt-1 leading-relaxed">
                Download a JSON archive of all profile records, subjects, timetable, and notes.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportData}
              className="w-full py-1.5 text-xs font-medium text-txt-primary bg-surface-elevated hover:bg-surface-hover border border-border-subtle rounded-lg transition-colors shadow-sm"
            >
              Export JSON
            </button>
          </div>

          {/* Import */}
          <div className="p-3.5 rounded-lg border border-border-subtle bg-surface flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-txt-primary">
                <Upload className="w-4 h-4 text-txt-muted" />
                <span>Restore Backup</span>
              </div>
              <p className="text-xs text-txt-muted mt-1 leading-relaxed">
                Upload a verified CampusOS backup JSON file to restore your coursework.
              </p>
            </div>
            <label className="w-full py-1.5 text-xs font-medium text-center text-txt-primary bg-surface-elevated hover:bg-surface-hover border border-border-subtle rounded-lg transition-colors cursor-pointer shadow-sm">
              <span>{importing ? 'Restoring...' : 'Upload File'}</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleImportFile}
                disabled={importing}
                className="hidden"
              />
            </label>
          </div>

          {/* Demo Dataset */}
          <div className="p-3.5 rounded-lg border border-border-subtle bg-surface flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-txt-primary">
                <RotateCcw className="w-4 h-4 text-txt-muted" />
                <span>Demo Dataset</span>
              </div>
              <p className="text-xs text-txt-muted mt-1 leading-relaxed">
                Populate realistic university courses, timetable slots, assignments, and exams for testing.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSeedModal(true)}
              disabled={seeding}
              className="w-full py-1.5 text-xs font-medium text-txt-secondary hover:text-txt-primary bg-surface-elevated hover:bg-surface-hover border border-border-subtle rounded-lg transition-colors"
            >
              {seeding ? 'Seeding...' : 'Load Demo Data'}
            </button>
          </div>

          {/* Reset All Local Data */}
          <div className="p-3.5 rounded-lg border border-red-500/20 bg-red-500/5 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
                <Trash2 className="w-4 h-4" />
                <span>Reset All Data</span>
              </div>
              <p className="text-xs text-txt-muted mt-1 leading-relaxed">
                Permanently wipes all local academic records and resets onboarding.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              disabled={resetting}
              className="w-full py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg transition-colors"
            >
              {resetting ? 'Resetting...' : 'Reset Local Data'}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Reset Demo */}
      <ConfirmModal
        isOpen={showSeedModal}
        title="Load Demo Dataset"
        message="This will populate your local database with sample engineering courses, timetable, exams, and attendance logs. Existing data will be overwritten."
        confirmText="Load Demo Data"
        isDanger={false}
        onConfirm={handleConfirmResetDemo}
        onCancel={() => setShowSeedModal(false)}
      />

      {/* Confirmation Modal for Reset All Data */}
      <ConfirmModal
        isOpen={showResetModal}
        title="Reset All Local Data"
        message="Are you sure you want to permanently erase all local subjects, timetable schedules, assignments, exams, attendance logs, and student profiles? This action cannot be undone."
        confirmText="Yes, Wipe All Data"
        isDanger={true}
        onConfirm={handleConfirmResetAllData}
        onCancel={() => setShowResetModal(false)}
      />
    </div>
  );
};
