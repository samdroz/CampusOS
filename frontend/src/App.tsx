import React, { useState, useEffect, useCallback } from 'react';
import { ToastProvider, useToast } from './components/Toast';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { CommandPalette } from './components/CommandPalette';

import { DashboardPage } from './pages/DashboardPage';
import { SubjectsPage } from './pages/SubjectsPage';
import { TimetablePage } from './pages/TimetablePage';
import { AssignmentsPage } from './pages/AssignmentsPage';
import { ExamsPage } from './pages/ExamsPage';
import { AttendancePage } from './pages/AttendancePage';
import { NotesPage } from './pages/NotesPage';
import { SettingsPage } from './pages/SettingsPage';

import { api } from './api/client';
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
} from './types';

const defaultSettings: SettingsMap = {
  student_name: 'Alex Morgan',
  student_id: 'STU-8829',
  major: 'Computer Science & Engineering',
  attendance_threshold: '75.0',
  week_start: 'monday',
  theme: 'dark',
};

const MainApp: React.FC = () => {
  const { success, error, info } = useToast();

  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isDemoLoading, setIsDemoLoading] = useState<boolean>(false);

  // Core Data States
  const [dashboardData, setDashboardData] = useState<DashboardOverview | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<OverallAttendanceSummary | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [settings, setSettings] = useState<SettingsMap>(defaultSettings);

  const [loading, setLoading] = useState<boolean>(true);

  // Fetch all core data
  const refreshAllData = useCallback(async () => {
    try {
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
      ] = await Promise.all([
        api.dashboard.get().catch(() => null),
        api.subjects.list().catch(() => []),
        api.sessions.list().catch(() => []),
        api.assignments.list().catch(() => []),
        api.exams.list().catch(() => []),
        api.attendance.list().catch(() => []),
        api.attendance.summary().catch(() => null),
        api.notes.list().catch(() => []),
        api.settings.get().catch(() => defaultSettings),
      ]);

      if (dash) setDashboardData(dash);
      setSubjects(subjList);
      setSessions(sessList);
      setAssignments(assignList);
      setExams(examList);
      setAttendanceRecords(attList);
      if (attSumm) setAttendanceSummary(attSumm);
      setNotes(noteList);
      if (settMap) setSettings(settMap);
    } catch (err: any) {
      console.error('Data refresh error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // Quick action from Header or Dashboard
  const handleQuickAction = (actionType: 'assignment' | 'note' | 'attendance' | 'subject') => {
    if (actionType === 'assignment') setCurrentPage('assignments');
    else if (actionType === 'note') setCurrentPage('notes');
    else if (actionType === 'attendance') setCurrentPage('attendance');
    else if (actionType === 'subject') setCurrentPage('subjects');
  };

  // Reset Demo Data
  const handleResetDemoData = async () => {
    setIsDemoLoading(true);
    try {
      await api.backup.seed();
      success('Demo Data Restored', 'Realistic coursework, schedule, and attendance loaded.');
      await refreshAllData();
    } catch (err: any) {
      error('Failed to seed demo data', err.message);
    } finally {
      setIsDemoLoading(false);
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
      success('Task Completed! 🎉', `"${assignment.title}" marked as done.`);
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
    <div className="flex h-screen bg-campus-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={(p) => setCurrentPage(p)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        pendingAssignmentsCount={dashboardData?.pending_assignments_count || 0}
        attendanceIsWarning={dashboardData?.attendance_is_warning || false}
        studentName={settings.student_name}
        studentId={settings.student_id}
        isMobileOpen={isMobileNavOpen}
        onMobileClose={() => setIsMobileNavOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <Header
          pageTitle={currentPage}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenMobileMenu={() => setIsMobileNavOpen(true)}
          onQuickAction={handleQuickAction}
          onResetDemoData={handleResetDemoData}
          overdueAssignments={overdueAssignments}
          upcomingExams={exams}
          attendanceWarnings={attendanceWarnings}
          isDemoLoading={isDemoLoading}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-gradient-to-b from-campus-950 via-campus-900 to-campus-950">
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
              onUpdateSettings={handleUpdateSettings}
              onResetDemoData={handleResetDemoData}
            />
          )}
        </main>
      </div>

      {/* Global Command Palette (Cmd+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={(page) => setCurrentPage(page)}
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
