import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Search,
  Plus,
  Bell,
  Database,
  Calendar,
  CheckSquare,
  Clock,
  UserCheck,
  FileText,
  AlertTriangle,
  BookOpen,
} from 'lucide-react';
import { Assignment, Exam, SubjectAttendanceStats } from '../types';

interface HeaderProps {
  pageTitle: string;
  onOpenCommandPalette: () => void;
  onOpenMobileMenu: () => void;
  onQuickAction: (actionType: 'assignment' | 'note' | 'attendance' | 'subject') => void;
  onResetDemoData: () => void;
  overdueAssignments?: Assignment[];
  upcomingExams?: Exam[];
  attendanceWarnings?: SubjectAttendanceStats[];
  isDemoLoading?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  pageTitle,
  onOpenCommandPalette,
  onOpenMobileMenu,
  onQuickAction,
  onResetDemoData,
  overdueAssignments = [],
  upcomingExams = [],
  attendanceWarnings = [],
  isDemoLoading = false,
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
    <header className="sticky top-0 z-20 h-16 bg-campus-950/80 backdrop-blur-xl border-b border-campus-700/60 px-4 sm:px-8 flex items-center justify-between">
      {/* Left: Mobile Menu Toggle & Title */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-campus-850 transition-colors"
          aria-label="Open mobile menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white capitalize">
          {pageTitle}
        </h1>
      </div>

      {/* Center: Command Palette Trigger */}
      <div className="hidden sm:flex flex-1 max-w-md mx-6">
        <button
          onClick={onOpenCommandPalette}
          className="w-full flex items-center justify-between px-3.5 py-1.5 text-xs text-slate-400 bg-campus-850/80 hover:bg-campus-800/80 border border-campus-700/70 hover:border-campus-600 rounded-xl transition-all shadow-inner group"
        >
          <div className="flex items-center space-x-2">
            <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-indigo transition-colors" />
            <span>Search or jump to...</span>
          </div>
          <kbd className="flex items-center space-x-0.5 px-1.5 py-0.5 text-[10px] font-mono bg-campus-800 text-slate-300 border border-campus-700 rounded">
            <span>Ctrl</span>
            <span>K</span>
          </kbd>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Mobile Search Icon Button */}
        <button
          onClick={onOpenCommandPalette}
          className="sm:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-campus-850 transition-colors"
          title="Search"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Demo Data Re-seed Button */}
        <button
          onClick={onResetDemoData}
          disabled={isDemoLoading}
          className="hidden lg:inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-campus-850 hover:bg-campus-800 border border-campus-700 rounded-xl transition-all"
          title="Reset and reload realistic academic demo data"
        >
          <Database className={`w-3.5 h-3.5 text-brand-cyan ${isDemoLoading ? 'animate-spin' : ''}`} />
          <span>{isDemoLoading ? 'Seeding...' : 'Reset Demo'}</span>
        </button>

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen((v) => !v)}
            className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-campus-850 border border-transparent hover:border-campus-700/60 transition-all"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {totalNotifications > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-campus-900 border border-campus-700 shadow-2xl p-4 animate-scaleIn z-50">
              <div className="flex items-center justify-between pb-3 border-b border-campus-700/60">
                <div className="flex items-center space-x-2">
                  <Bell className="w-4 h-4 text-brand-indigo" />
                  <span className="text-sm font-semibold text-white">Notifications</span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">
                  {totalNotifications} active alert{totalNotifications === 1 ? '' : 's'}
                </span>
              </div>

              <div className="max-h-72 overflow-y-auto mt-2 space-y-2">
                {totalNotifications === 0 ? (
                  <p className="text-center py-6 text-xs text-slate-400">All caught up! No pending alerts.</p>
                ) : (
                  <>
                    {/* Overdue Alerts */}
                    {overdueAssignments.map((a) => (
                      <div
                        key={`notif-a-${a.id}`}
                        className="flex items-start space-x-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs"
                      >
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-rose-200">Overdue: {a.title}</p>
                          <p className="text-[11px] text-rose-300/80">Due date was {a.due_date.slice(0, 10)}</p>
                        </div>
                      </div>
                    ))}

                    {/* Imminent Exam Alerts */}
                    {upcomingExams
                      .filter((e) => e.is_imminent)
                      .map((e) => (
                        <div
                          key={`notif-e-${e.id}`}
                          className="flex items-start space-x-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs"
                        >
                          <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-amber-200">Upcoming Exam: {e.title}</p>
                            <p className="text-[11px] text-amber-300/80">
                              {e.days_remaining === 0
                                ? 'Today!'
                                : e.days_remaining === 1
                                ? 'Tomorrow!'
                                : `In ${e.days_remaining} days`}
                            </p>
                          </div>
                        </div>
                      ))}

                    {/* Attendance Warnings */}
                    {attendanceWarnings.map((att) => (
                      <div
                        key={`notif-att-${att.subject_id}`}
                        className="flex items-start space-x-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs"
                      >
                        <UserCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-amber-200">
                            Low Attendance: {att.subject_code} ({att.percentage}%)
                          </p>
                          <p className="text-[11px] text-amber-300/80">Below academic threshold</p>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick Action "+ New" Button */}
        <div className="relative" ref={quickRef}>
          <button
            onClick={() => setIsQuickOpen((v) => !v)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand-indigo hover:bg-indigo-500 rounded-xl transition-all shadow-glow-indigo"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New</span>
          </button>

          {isQuickOpen && (
            <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-campus-900 border border-campus-700 shadow-2xl p-1.5 animate-scaleIn z-50">
              <button
                onClick={() => {
                  setIsQuickOpen(false);
                  onQuickAction('assignment');
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-medium text-slate-200 hover:text-white hover:bg-campus-800 rounded-xl transition-colors text-left"
              >
                <CheckSquare className="w-4 h-4 text-brand-indigo" />
                <span>New Assignment</span>
              </button>
              <button
                onClick={() => {
                  setIsQuickOpen(false);
                  onQuickAction('note');
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-medium text-slate-200 hover:text-white hover:bg-campus-800 rounded-xl transition-colors text-left"
              >
                <FileText className="w-4 h-4 text-brand-violet" />
                <span>New Note</span>
              </button>
              <button
                onClick={() => {
                  setIsQuickOpen(false);
                  onQuickAction('attendance');
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-medium text-slate-200 hover:text-white hover:bg-campus-800 rounded-xl transition-colors text-left"
              >
                <UserCheck className="w-4 h-4 text-brand-emerald" />
                <span>Mark Attendance</span>
              </button>
              <button
                onClick={() => {
                  setIsQuickOpen(false);
                  onQuickAction('subject');
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-medium text-slate-200 hover:text-white hover:bg-campus-800 rounded-xl transition-colors text-left"
              >
                <BookOpen className="w-4 h-4 text-brand-amber" />
                <span>Add Subject</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
