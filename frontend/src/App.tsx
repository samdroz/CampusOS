import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { ToastProvider, useToast } from './components/Toast';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { CommandPalette } from './components/CommandPalette';
import { StartupSplash } from './components/StartupSplash';
import { PageTransition } from './components/PageTransition';
import { OnboardingModal } from './components/OnboardingModal';


import { DashboardPage } from './pages/DashboardPage';
import { SubjectsPage } from './pages/SubjectsPage';
import { TimetablePage } from './pages/TimetablePage';
import { AssignmentsPage } from './pages/AssignmentsPage';
import { ExamsPage } from './pages/ExamsPage';
import { AttendancePage } from './pages/AttendancePage';
import { NotesPage } from './pages/NotesPage';
import { SettingsPage } from './pages/SettingsPage';

import { api, setApiBaseUrl } from './api/client';
import {
  DashboardOverview,
  Subject,
  ClassSession,
  Assignment,
  Exam,
  AttendanceRecord,
  OverallAttendanceSummary,
  Note,
  SettingsMap,
  StudentProfile,
} from './types';

const defaultSettings: SettingsMap = {
  student_name: '',
  student_id: '',
  major: '',
  attendance_threshold: '75.0',
  week_start: 'monday',
  theme: 'dark',
};

const MainApp: React.FC = () => {
  const { success, error, info } = useToast();

  // Persistent Theme State
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('campusos_theme');
      return saved === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  const handleToggleTheme = useCallback((newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    try {
      localStorage.setItem('campusos_theme', newTheme);
      document.documentElement.classList.remove('dark', 'light');
      document.documentElement.classList.add(newTheme);
    } catch (e) {
      console.error(e);
    }
    api.settings.update({ theme: newTheme }).catch(() => {});
  }, []);

  // Ensure DOM has theme class on mount
  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
  }, [theme]);

  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);

  // Core Data States
  const [dashboardData, setDashboardData] = useState<DashboardOverview | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<OverallAttendanceSummary | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [settings, setSettings] = useState<SettingsMap>(defaultSettings);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);

  // Check if first-launch animation was already shown in this browser session
  const [showFirstLaunchSplash, setShowFirstLaunchSplash] = useState<boolean>(() => {
    try {
      const alreadyStarted = sessionStorage.getItem('campusos_session_started');
      const shouldShow = !alreadyStarted;
      api.debug.log('APP_SPLASH_INIT_STATE', 'Checking sessionStorage for session startup', {
        alreadyStarted,
        shouldShowSplash: shouldShow,
      });
      return shouldShow;
    } catch {
      return false;
    }
  });

  const handleSplashFinished = useCallback(() => {
    try {
      sessionStorage.setItem('campusos_session_started', 'true');
    } catch {}
    api.debug.log('SPLASH_SCREEN_FINISHED', 'handleSplashFinished called, setting showFirstLaunchSplash=false', {
      showOnboarding,
    });
    setShowFirstLaunchSplash(false);
  }, [showOnboarding]);

  // In-flight readiness check reference to avoid duplicate concurrent polling loops
  const readinessPromiseRef = useRef<Promise<boolean> | null>(null);

  const defaultTotalDeadlineMs = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test' ? 100 : 10000;
  const defaultDelayMs = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test' ? 20 : 400;

  // Poll backend readiness before attempting initial data fetch, strictly bounded by an overall deadline (~10 seconds in production)
  const waitForBackendReadiness = useCallback(async (totalDeadlineMs = defaultTotalDeadlineMs, delayMs = defaultDelayMs): Promise<boolean> => {
    if (readinessPromiseRef.current) {
      return readinessPromiseRef.current;
    }

    const checkPromise = (async () => {
      // If in Tauri desktop and backend URL not initialized yet, query it
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ && !(window as any).__CAMPUSOS_BACKEND_URL__) {
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          const url = await invoke<string>('get_backend_url');
          if (url) {
            api.debug.log('TAURI_BACKEND_DISCOVERED', 'Discovered backend URL via Tauri IPC', { url });
            setApiBaseUrl(url);
          }
        } catch (err: any) {
          api.debug.log('TAURI_BACKEND_DISCOVERY_ERR', err?.message || String(err));
        }
      }

      const startTime = Date.now();
      const deadline = startTime + totalDeadlineMs;

      while (Date.now() < deadline) {
        const remainingTime = deadline - Date.now();
        if (remainingTime <= 0) break;

        // Cap per-request timeout to min(1500ms, remainingTime) so requests never overrun deadline
        const requestTimeout = Math.min(1500, remainingTime);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), requestTimeout);

        try {
          const health = await api.health({ signal: controller.signal });
          if (health && health.status === 'healthy') {
            return true;
          }
        } catch {
          // Handshake attempt failed or timed out, will retry if deadline has not elapsed
        } finally {
          clearTimeout(timeoutId);
        }

        const timeAfterRequest = deadline - Date.now();
        if (timeAfterRequest <= 0) break;

        // Bounded delay between retries
        const sleepTime = Math.min(delayMs, timeAfterRequest);
        await new Promise((res) => setTimeout(res, sleepTime));
      }

      return false;
    })();

    readinessPromiseRef.current = checkPromise;
    try {
      return await checkPromise;
    } finally {
      readinessPromiseRef.current = null;
    }
  }, []);

  // Fetch all core data
  const refreshAllData = useCallback(async () => {
    setLoadError(null);
    api.debug.log('REFRESH_ALL_DATA_START', 'Initiating refreshAllData call', {
      current_showOnboarding: showOnboarding,
      current_loading: loading,
    });

    const isReady = await waitForBackendReadiness();
    if (!isReady) {
      api.debug.log('BACKEND_NOT_READY', 'Backend health check handshake failed after retries');
      setLoadError('Failed to connect to CampusOS backend services. Please verify that the application backend is running.');
      setShowOnboarding(false);
      setLoading(false);
      return;
    }

    let profileFetchFailed = false;

    try {
      api.debug.log('PROFILE_REQUEST_SENT', 'Dispatching GET /api/profile and parallel requests');
      const [
        dash,
        subjList,
        sessList,
        assignList,
        examList,
        attList,
        attSumm,
        noteList,
        settMap,
        prof,
      ] = await Promise.all([
        api.dashboard.get().catch((e) => {
          api.debug.log('API_DASHBOARD_ERROR', e?.message || 'Dashboard fetch failed');
          return null;
        }),
        api.subjects.list().catch(() => []),
        api.sessions.list().catch(() => []),
        api.assignments.list().catch(() => []),
        api.exams.list().catch(() => []),
        api.attendance.list().catch(() => []),
        api.attendance.summary().catch(() => null),
        api.notes.list().catch(() => []),
        api.settings.get().catch(() => defaultSettings),
        api.profile.get().catch((e) => {
          api.debug.log('API_PROFILE_ERROR', e?.message || 'Profile fetch failed');
          profileFetchFailed = true;
          return null;
        }),
      ]);

      if (dash) setDashboardData(dash);
      setSubjects(subjList);
      setSessions(sessList);
      setAssignments(assignList);
      setExams(examList);
      setAttendanceRecords(attList);
      if (attSumm) setAttendanceSummary(attSumm);
      setNotes(noteList);
      if (settMap) {
        setSettings(settMap);
        // Sync theme from database if not set in localStorage
        const savedLocal = localStorage.getItem('campusos_theme');
        if (!savedLocal && (settMap.theme === 'light' || settMap.theme === 'dark')) {
          handleToggleTheme(settMap.theme as 'dark' | 'light');
        }
      }

      if (!profileFetchFailed && prof) {
        setProfile(prof);
        const needsOnboarding = !prof.onboarding_completed;
        api.debug.log('PROFILE_RESPONSE_PROCESSED', 'Profile payload received from backend', {
          full_name: prof.full_name,
          onboarding_completed: prof.onboarding_completed,
          needsOnboarding,
          prev_showOnboarding: showOnboarding,
        });
        setShowOnboarding(needsOnboarding);
      } else {
        // Do not treat backend failure as first-launch onboarding
        api.debug.log('PROFILE_UNAVAILABLE', 'Profile fetch failed or was null; withholding onboarding', {
          profileFetchFailed,
        });
        setShowOnboarding(false);
        if (profileFetchFailed) {
          setLoadError('Could not load student profile from backend.');
        }
      }
    } catch (err: any) {
      console.error('Data refresh error:', err);
      api.debug.log('REFRESH_ALL_DATA_EXCEPTION', 'Exception caught during refreshAllData', {
        error: err?.message || String(err),
      });
      setLoadError(err.message || 'Failed to connect to CampusOS services');
    } finally {
      setLoading(false);
    }
  }, [handleToggleTheme, waitForBackendReadiness]);


  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // Quick action from Header or Dashboard
  const handleQuickAction = (actionType: 'assignment' | 'note' | 'attendance' | 'subject' | 'session' | 'exam') => {
    if (actionType === 'assignment') setCurrentPage('assignments');
    else if (actionType === 'note') setCurrentPage('notes');
    else if (actionType === 'session') setCurrentPage('timetable');
    else if (actionType === 'exam') setCurrentPage('exams');
    else if (actionType === 'attendance') setCurrentPage('attendance');
    else if (actionType === 'subject') setCurrentPage('subjects');
  };

  // Reset Demo Data
  const handleResetDemoData = async () => {
    try {
      await api.backup.seed();
      success('Demo Data Restored', 'Realistic coursework, schedule, and attendance loaded.');
      await refreshAllData();
    } catch (err: any) {
      error('Failed to seed demo data', err.message);
    }
  };

  // Mutations: Subjects
  const handleCreateSubject = async (data: Partial<Subject>) => {
    await api.subjects.create(data);
    success('Subject created', `Course ${data.code} added successfully`);
    await refreshAllData();
  };

  const handleUpdateSubject = async (id: number, data: Partial<Subject>) => {
    await api.subjects.update(id, data);
    success('Subject updated', 'Course details saved');
    await refreshAllData();
  };

  const handleDeleteSubject = async (id: number) => {
    await api.subjects.delete(id);
    success('Subject deleted', 'Course and associated records removed');
    await refreshAllData();
  };

  // Mutations: Sessions
  const handleCreateSession = async (data: Partial<ClassSession>) => {
    await api.sessions.create(data);
    success('Session scheduled', 'Timetable slot created');
    await refreshAllData();
  };

  const handleUpdateSession = async (id: number, data: Partial<ClassSession>) => {
    await api.sessions.update(id, data);
    success('Session updated', 'Timetable slot modified');
    await refreshAllData();
  };

  const handleDeleteSession = async (id: number) => {
    await api.sessions.delete(id);
    success('Session deleted', 'Timetable slot removed');
    await refreshAllData();
  };

  // Mutations: Assignments
  const handleCreateAssignment = async (data: Partial<Assignment>) => {
    await api.assignments.create(data);
    success('Assignment created', `"${data.title}" added to task list`);
    await refreshAllData();
  };

  const handleUpdateAssignment = async (id: number, data: Partial<Assignment>) => {
    await api.assignments.update(id, data);
    success('Assignment updated', 'Changes saved');
    await refreshAllData();
  };

  const handleDeleteAssignment = async (id: number) => {
    await api.assignments.delete(id);
    success('Assignment removed', 'Task deleted');
    await refreshAllData();
  };

  const handleToggleAssignmentComplete = async (assignment: Assignment) => {
    const nextStatus = assignment.status === 'completed' ? 'todo' : 'completed';
    await api.assignments.update(assignment.id, { status: nextStatus });
    if (nextStatus === 'completed') {
      success('Task Completed', `"${assignment.title}" marked as done.`);
    } else {
      info('Task Reopened', `"${assignment.title}" moved to To Do.`);
    }
    await refreshAllData();
  };

  // Mutations: Exams
  const handleCreateExam = async (data: Partial<Exam>) => {
    await api.exams.create(data);
    success('Exam scheduled', `"${data.title}" on ${data.exam_date}`);
    await refreshAllData();
  };

  const handleUpdateExam = async (id: number, data: Partial<Exam>) => {
    await api.exams.update(id, data);
    success('Exam updated', 'Schedule modified');
    await refreshAllData();
  };

  const handleDeleteExam = async (id: number) => {
    await api.exams.delete(id);
    success('Exam deleted', 'Schedule record removed');
    await refreshAllData();
  };

  // Mutations: Attendance
  const handleRecordAttendance = async (data: Partial<AttendanceRecord>) => {
    await api.attendance.record(data);
    success('Attendance recorded', `Marked as ${data.status} for ${data.date}`);
    await refreshAllData();
  };

  const handleUpdateAttendance = async (id: number, data: Partial<AttendanceRecord>) => {
    await api.attendance.update(id, data);
    success('Attendance updated', 'Record modified');
    await refreshAllData();
  };

  const handleDeleteAttendance = async (id: number) => {
    await api.attendance.delete(id);
    success('Record removed', 'Attendance entry deleted');
    await refreshAllData();
  };

  // Mutations: Notes
  const handleCreateNote = async (data: Partial<Note>) => {
    await api.notes.create(data);
    success('Note created', `"${data.title}" saved`);
    await refreshAllData();
  };

  const handleUpdateNote = async (id: number, data: Partial<Note>) => {
    await api.notes.update(id, data);
    success('Note updated', 'Markdown saved');
    await refreshAllData();
  };

  const handleDeleteNote = async (id: number) => {
    await api.notes.delete(id);
    success('Note deleted', 'Item removed');
    await refreshAllData();
  };

  // Mutations: Settings
  const handleUpdateSettings = async (newSettings: Partial<SettingsMap>) => {
    const updated = await api.settings.update(newSettings);
    setSettings(updated);
    await refreshAllData();
  };

  // Notifications summary
  const overdueAssignments = assignments.filter((a) => a.is_overdue);
  const attendanceWarnings = attendanceSummary?.subjects.filter((s) => s.is_warning) || [];

  return (
    <div className="flex h-screen bg-app text-txt-primary overflow-hidden font-sans transition-colors duration-150">
      {/* Sidebar Navigation */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={(p) => setCurrentPage(p)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        pendingAssignmentsCount={dashboardData?.pending_assignments_count || 0}
        attendanceIsWarning={dashboardData?.attendance_is_warning || false}
        studentName={profile?.preferred_name?.trim() || profile?.full_name?.trim() || settings.student_name || ''}
        studentId={profile?.roll_number?.trim() || profile?.register_number?.trim() || settings.student_id || ''}
        isMobileOpen={isMobileNavOpen}
        onMobileClose={() => setIsMobileNavOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-app">
        {/* Top Header */}
        <Header
          pageTitle={currentPage}
          currentTheme={theme}
          onToggleTheme={handleToggleTheme}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenMobileMenu={() => setIsMobileNavOpen(true)}
          onQuickAction={handleQuickAction}
          overdueAssignments={overdueAssignments}
          upcomingExams={exams}
          attendanceWarnings={attendanceWarnings}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-app">
          {/* Visible Error Banner when splash is inactive */}
          {loadError && !showFirstLaunchSplash && (
            <div
              role="alert"
              aria-live="assertive"
              className="mx-6 mt-4 p-4 rounded-xl bg-semantic-danger/10 border border-semantic-danger/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-semantic-danger animate-fadeIn"
            >
              <div className="flex items-center space-x-2.5">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Backend Connection Issue</p>
                  <p className="text-xs text-txt-secondary">{loadError}</p>
                </div>
              </div>
              <button
                onClick={() => refreshAllData()}
                disabled={loading}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-semantic-danger hover:bg-semantic-danger/90 rounded-lg transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>{loading ? 'Retrying...' : 'Retry Connection'}</span>
              </button>
            </div>
          )}

          <PageTransition pageKey={currentPage}>
            {currentPage === 'dashboard' && (
              <DashboardPage
                data={dashboardData}
                loading={loading}
                onNavigate={(p) => setCurrentPage(p)}
                onQuickAction={handleQuickAction}
                onToggleAssignmentComplete={handleToggleAssignmentComplete}
              />
            )}

            {currentPage === 'subjects' && (
              <SubjectsPage
                subjects={subjects}
                loading={loading}
                onCreateSubject={handleCreateSubject}
                onUpdateSubject={handleUpdateSubject}
                onDeleteSubject={handleDeleteSubject}
                onNavigate={(p) => setCurrentPage(p)}
              />
            )}

            {currentPage === 'timetable' && (
              <TimetablePage
                sessions={sessions}
                subjects={subjects}
                loading={loading}
                onCreateSession={handleCreateSession}
                onUpdateSession={handleUpdateSession}
                onDeleteSession={handleDeleteSession}
              />
            )}

            {currentPage === 'assignments' && (
              <AssignmentsPage
                assignments={assignments}
                subjects={subjects}
                loading={loading}
                onCreateAssignment={handleCreateAssignment}
                onUpdateAssignment={handleUpdateAssignment}
                onDeleteAssignment={handleDeleteAssignment}
              />
            )}

            {currentPage === 'exams' && (
              <ExamsPage
                exams={exams}
                subjects={subjects}
                loading={loading}
                onCreateExam={handleCreateExam}
                onUpdateExam={handleUpdateExam}
                onDeleteExam={handleDeleteExam}
              />
            )}

            {currentPage === 'attendance' && (
              <AttendancePage
                summary={attendanceSummary}
                records={attendanceRecords}
                subjects={subjects}
                loading={loading}
                onRecordAttendance={handleRecordAttendance}
                onUpdateAttendance={handleUpdateAttendance}
                onDeleteAttendance={handleDeleteAttendance}
              />
            )}

            {currentPage === 'notes' && (
              <NotesPage
                notes={notes}
                subjects={subjects}
                loading={loading}
                onCreateNote={handleCreateNote}
                onUpdateNote={handleUpdateNote}
                onDeleteNote={handleDeleteNote}
              />
            )}

            {currentPage === 'settings' && (
              <SettingsPage
                settings={settings}
                currentTheme={theme}
                onToggleTheme={handleToggleTheme}
                onUpdateSettings={handleUpdateSettings}
                onResetDemoData={handleResetDemoData}
                onLaunchOnboarding={() => setShowOnboarding(true)}
              />
            )}
          </PageTransition>
        </main>
      </div>

      {/* Global Command Palette (Cmd+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={(page) => setCurrentPage(page)}
      />

      {/* Dedicated First-Launch Shuffling Notebooks Startup Experience */}
      {showFirstLaunchSplash && (
        <StartupSplash
          isDataReady={!loading}
          onFinished={handleSplashFinished}
          loadError={loadError}
          onRetry={refreshAllData}
        />
      )}

      {/* First-Launch Multi-Step Onboarding Modal */}
      <OnboardingModal
        isOpen={showOnboarding && !showFirstLaunchSplash}
        onComplete={(name) => {
          api.debug.log('ONBOARDING_MODAL_ON_COMPLETE', 'Onboarding completed by student', { name });
          setShowOnboarding(false);
          success('Welcome to CampusOS!', `Welcome, ${name}. Your local academic workspace is ready.`);
          refreshAllData();
        }}
        onSkip={() => {
          api.debug.log('ONBOARDING_MODAL_ON_SKIP', 'Onboarding skipped by student');
          setShowOnboarding(false);
          info('Setup Skipped', 'You can finish configuring your profile and subjects anytime in Settings.');
          refreshAllData();
        }}
      />
    </div>
  );
};


export default function App() {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
}
