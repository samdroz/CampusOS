import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Search,
  Plus,
  Bell,
  Sun,
  Moon,
  CheckSquare,
  Clock,
  UserCheck,
  FileText,
  Calendar,
  BookOpen,
} from 'lucide-react';
import { Assignment, Exam, SubjectAttendanceStats } from '../types';
import { ContextualModuleAnimation, ModuleType } from './AcademicLoader';

interface HeaderProps {
  pageTitle: string;
  currentTheme: 'dark' | 'light';
  onToggleTheme: (theme: 'dark' | 'light') => void;
  onOpenCommandPalette: () => void;
  onOpenMobileMenu: () => void;
  onQuickAction: (actionType: 'assignment' | 'note' | 'attendance' | 'subject' | 'session' | 'exam') => void;
  overdueAssignments?: Assignment[];
  upcomingExams?: Exam[];
  attendanceWarnings?: SubjectAttendanceStats[];
}

export const Header: React.FC<HeaderProps> = ({
  pageTitle,
  currentTheme,
  onToggleTheme,
  onOpenCommandPalette,
  onOpenMobileMenu,
  onQuickAction,
  overdueAssignments = [],
  upcomingExams = [],
  attendanceWarnings = [],
}) => {
  const [isQuickOpen, setIsQuickOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const quickRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (quickRef.current && !quickRef.current.contains(e.target as Node)) {
        setIsQuickOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalNotifications =
    overdueAssignments.length +
    upcomingExams.filter((e) => e.is_imminent).length +
    attendanceWarnings.length;

  return (
    <header className="sticky top-0 z-20 h-14 bg-surface border-b border-border-subtle px-4 sm:px-6 flex items-center justify-between transition-colors">
      {/* Left: Mobile Menu Toggle, Contextual Academic Animation & Title */}
      <div className="flex items-center space-x-2.5">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-1.5 rounded-lg text-txt-secondary hover:text-txt-primary hover:bg-surface-elevated transition-colors"
          aria-label="Open mobile menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Small compact non-blocking inline academic animation indicator */}
        <div
          className="w-7 h-7 rounded-lg bg-surface-elevated border border-border-subtle flex items-center justify-center shrink-0 overflow-hidden shadow-xs"
          title={`CampusOS ${pageTitle}`}
          aria-hidden="true"
        >
          <div className="scale-[0.45] origin-center shrink-0 pointer-events-none select-none flex items-center justify-center">
            <ContextualModuleAnimation module={pageTitle as ModuleType} />
          </div>
        </div>

        <h1 className="text-sm font-semibold tracking-tight text-txt-primary capitalize">
          {pageTitle}
        </h1>
      </div>

      {/* Center: Command Palette Trigger */}
      <div className="hidden sm:flex flex-1 max-w-xs mx-4">
        <button
          onClick={onOpenCommandPalette}
          className="w-full flex items-center justify-between px-3 py-1 text-xs text-txt-muted bg-surface-elevated hover:text-txt-secondary hover:bg-surface-hover border border-border-subtle rounded-lg transition-colors group"
        >
          <div className="flex items-center space-x-2">
            <Search className="w-3.5 h-3.5" />
            <span>Search CampusOS...</span>
          </div>
          <kbd className="px-1.5 py-0.2 text-[10px] font-mono text-txt-muted bg-surface border border-border-subtle rounded">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-1.5 sm:space-x-2">
        {/* Mobile Search Icon Button */}
        <button
          onClick={onOpenCommandPalette}
          className="sm:hidden p-1.5 rounded-lg text-txt-secondary hover:text-txt-primary hover:bg-surface-elevated transition-colors"
          title="Search"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Theme Quick Toggle */}
        <button
          onClick={() => onToggleTheme(currentTheme === 'dark' ? 'light' : 'dark')}
          className="p-1.5 rounded-lg text-txt-muted hover:text-txt-primary hover:bg-surface-elevated transition-colors"
          title={`Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} mode`}
          aria-label="Toggle theme"
        >
          {currentTheme === 'dark' ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen((v) => !v)}
            className="relative p-1.5 rounded-lg text-txt-muted hover:text-txt-primary hover:bg-surface-elevated transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {totalNotifications > 0 && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-semantic-danger"></span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-xl bg-surface border border-border-default shadow-xl p-3 animate-scaleIn z-50">
              <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
                <span className="text-xs font-semibold text-txt-primary">Notifications</span>
                <span className="text-[11px] text-txt-muted">
                  {totalNotifications} active alert{totalNotifications === 1 ? '' : 's'}
                </span>
              </div>

              <div className="max-h-60 overflow-y-auto mt-2 space-y-1.5">
                {totalNotifications === 0 ? (
                  <p className="text-center py-4 text-xs text-txt-muted">All caught up! No active alerts.</p>
                ) : (
                  <>
                    {/* Overdue Alerts */}
                    {overdueAssignments.map((a) => (
                      <div
                        key={`notif-a-${a.id}`}
                        className="p-2 rounded-lg bg-surface-elevated border border-border-subtle text-xs"
                      >
                        <p className="font-semibold text-semantic-danger">Overdue: {a.title}</p>
                        <p className="text-[11px] text-txt-muted mt-0.5">Due date was {a.due_date.slice(0, 10)}</p>
                      </div>
                    ))}

                    {/* Imminent Exam Alerts */}
                    {upcomingExams
                      .filter((e) => e.is_imminent)
                      .map((e) => (
                        <div
                          key={`notif-e-${e.id}`}
                          className="p-2 rounded-lg bg-surface-elevated border border-border-subtle text-xs"
                        >
                          <p className="font-semibold text-txt-primary">Exam: {e.title}</p>
                          <p className="text-[11px] text-txt-muted mt-0.5">
                            {e.days_remaining === 0
                              ? 'Today!'
                              : e.days_remaining === 1
                              ? 'Tomorrow!'
                              : `In ${e.days_remaining} days`}
                          </p>
                        </div>
                      ))}

                    {/* Attendance Warnings */}
                    {attendanceWarnings.map((att) => (
                      <div
                        key={`notif-att-${att.subject_id}`}
                        className="p-2 rounded-lg bg-surface-elevated border border-border-subtle text-xs"
                      >
                        <p className="font-semibold text-semantic-warning">
                          Low Attendance: {att.subject_code} ({att.percentage}%)
                        </p>
                        <p className="text-[11px] text-txt-muted mt-0.5">Below required academic threshold</p>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Primary "+ New" Action Dropdown */}
        <div className="relative" ref={quickRef}>
          <button
            onClick={() => setIsQuickOpen((v) => !v)}
            className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-white bg-accent hover:bg-accent-hover rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>

          {isQuickOpen && (
            <div className="absolute right-0 mt-1.5 w-48 rounded-xl bg-surface border border-border-default shadow-xl p-1 animate-scaleIn z-50">
              <button
                onClick={() => {
                  setIsQuickOpen(false);
                  onQuickAction('assignment');
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs font-medium text-txt-primary hover:bg-surface-elevated rounded-lg transition-colors text-left"
              >
                <CheckSquare className="w-3.5 h-3.5 text-txt-muted" />
                <span>Assignment</span>
              </button>
              <button
                onClick={() => {
                  setIsQuickOpen(false);
                  onQuickAction('note');
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs font-medium text-txt-primary hover:bg-surface-elevated rounded-lg transition-colors text-left"
              >
                <FileText className="w-3.5 h-3.5 text-txt-muted" />
                <span>Note</span>
              </button>
              <button
                onClick={() => {
                  setIsQuickOpen(false);
                  onQuickAction('session');
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs font-medium text-txt-primary hover:bg-surface-elevated rounded-lg transition-colors text-left"
              >
                <Calendar className="w-3.5 h-3.5 text-txt-muted" />
                <span>Timetable Session</span>
              </button>
              <button
                onClick={() => {
                  setIsQuickOpen(false);
                  onQuickAction('exam');
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs font-medium text-txt-primary hover:bg-surface-elevated rounded-lg transition-colors text-left"
              >
                <Clock className="w-3.5 h-3.5 text-txt-muted" />
                <span>Examination</span>
              </button>
              <button
                onClick={() => {
                  setIsQuickOpen(false);
                  onQuickAction('attendance');
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs font-medium text-txt-primary hover:bg-surface-elevated rounded-lg transition-colors text-left"
              >
                <UserCheck className="w-3.5 h-3.5 text-txt-muted" />
                <span>Mark Attendance</span>
              </button>
              <button
                onClick={() => {
                  setIsQuickOpen(false);
                  onQuickAction('subject');
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs font-medium text-txt-primary hover:bg-surface-elevated rounded-lg transition-colors text-left border-t border-border-subtle mt-1 pt-1"
              >
                <BookOpen className="w-3.5 h-3.5 text-txt-muted" />
                <span>Add Course</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
