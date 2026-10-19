import React from 'react';
import {
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  Calendar,
  CheckSquare,
  Clock,
  UserCheck,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  pendingAssignmentsCount?: number;
  attendanceIsWarning?: boolean;
  studentName?: string;
  studentId?: string;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
  pendingAssignmentsCount = 0,
  attendanceIsWarning = false,
  studentName = 'Alex Morgan',
  studentId = 'STU-8829',
  isMobileOpen = false,
  onMobileClose,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'subjects', label: 'Subjects', icon: BookOpen },
    { id: 'timetable', label: 'Timetable', icon: Calendar },
    {
      id: 'assignments',
      label: 'Assignments',
      icon: CheckSquare,
      badge: pendingAssignmentsCount > 0 ? pendingAssignmentsCount : null,
      badgeColor: 'bg-brand-indigo/30 text-indigo-300 border-brand-indigo/40',
    },
    { id: 'exams', label: 'Examinations', icon: Clock },
    {
      id: 'attendance',
      label: 'Attendance',
      icon: UserCheck,
      badge: attendanceIsWarning ? 'Alert' : null,
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse',
    },
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (pageId: string) => {
    onNavigate(pageId);
    if (onMobileClose) {
      onMobileClose();
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-campus-900 border-r border-campus-700/60 select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-campus-700/60">
        <div
          onClick={() => handleNavClick('dashboard')}
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-indigo to-brand-violet text-white shadow-glow-indigo">
            <GraduationCap className="w-5 h-5 transition-transform group-hover:scale-110" />
            <Sparkles className="w-2.5 h-2.5 absolute -top-0.5 -right-0.5 text-amber-300 animate-pulse" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight text-white flex items-center">
                Campus<span className="text-brand-indigo">OS</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">
                Academic Cloud
              </span>
            </div>
          )}
        </div>

        {/* Desktop Collapse Button */}
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-campus-800 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center rounded-xl transition-all font-medium text-sm ${
                isCollapsed ? 'justify-center px-0 py-2.5' : 'px-3.5 py-2.5'
              } ${
                isActive
                  ? 'bg-gradient-to-r from-brand-indigo/25 to-brand-violet/15 text-white border border-brand-indigo/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-campus-800/60'
              }`}
            >
              <Icon
                className={`w-5 h-5 shrink-0 transition-colors ${
                  isActive ? 'text-brand-indigo' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              />
              {!isCollapsed && (
                <div className="flex items-center justify-between w-full ml-3">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* User Profile Card at Bottom */}
      <div className="p-3 border-t border-campus-700/60">
        <div
          onClick={() => handleNavClick('settings')}
          className={`flex items-center rounded-xl p-2 cursor-pointer transition-all hover:bg-campus-800/80 ${
            isCollapsed ? 'justify-center' : 'space-x-3'
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-brand-indigo flex items-center justify-center font-bold text-xs text-white shadow-sm shrink-0">
            {studentName.charAt(0)}
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-white truncate">{studentName}</span>
              <span className="text-[10px] text-slate-400 truncate">{studentId}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:block transition-all duration-200 shrink-0 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className={`fixed top-0 bottom-0 left-0 z-30 transition-all duration-200 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}>
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm animate-fadeIn"
          onClick={onMobileClose}
        >
          <div
            className="w-72 max-w-[80vw] h-full animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
