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
  studentName = '',
  studentId = '',
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
      badge: pendingAssignmentsCount > 0 ? `${pendingAssignmentsCount}` : null,
      badgeWarning: false,
    },
    { id: 'exams', label: 'Examinations', icon: Clock },
    {
      id: 'attendance',
      label: 'Attendance',
      icon: UserCheck,
      badge: attendanceIsWarning ? 'Alert' : null,
      badgeWarning: true,
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
    <div className="flex flex-col h-full bg-surface border-r border-border-subtle select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-border-subtle">
        <div
          onClick={() => handleNavClick('dashboard')}
          className="flex items-center space-x-2.5 cursor-pointer group"
        >
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-accent text-white shrink-0">
            <GraduationCap className="w-4 h-4" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-txt-primary">
                Campus<span className="text-accent">OS</span>
              </span>
            </div>
          )}
        </div>

        {/* Desktop Collapse Button */}
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex items-center justify-center w-6 h-6 rounded-md text-txt-muted hover:text-txt-primary hover:bg-surface-elevated transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center rounded-lg text-xs font-medium transition-colors ${
                isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2'
              } ${
                isActive
                  ? 'bg-accent-subtle text-accent font-semibold'
                  : 'text-txt-secondary hover:text-txt-primary hover:bg-surface-elevated'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!isCollapsed && (
                <div className="flex items-center justify-between w-full ml-2.5">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                        item.badgeWarning
                          ? 'text-semantic-danger font-semibold bg-semantic-danger-subtle'
                          : 'text-txt-muted bg-surface-elevated'
                      }`}
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
      <div className="p-2.5 border-t border-border-subtle">
        <div
          onClick={() => handleNavClick('settings')}
          className={`flex items-center rounded-lg p-1.5 cursor-pointer hover:bg-surface-elevated transition-colors ${
            isCollapsed ? 'justify-center' : 'space-x-2.5'
          }`}
        >
          <div className="w-7 h-7 rounded-full bg-surface-elevated border border-border-subtle flex items-center justify-center font-semibold text-xs text-txt-primary shrink-0">
            {(studentName?.trim() || 'Student').charAt(0).toUpperCase()}
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium text-txt-primary truncate">
                {studentName?.trim() || 'Student'}
              </span>
              <span className="text-[10px] text-txt-muted truncate">
                {studentId?.trim() || 'Local Workspace'}
              </span>
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
        className={`hidden md:block transition-all duration-150 shrink-0 ${
          isCollapsed ? 'w-16' : 'w-56'
        }`}
      >
        <div className={`fixed top-0 bottom-0 left-0 z-30 transition-all duration-150 ${
          isCollapsed ? 'w-16' : 'w-56'
        }`}>
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-xs animate-fadeIn"
          onClick={onMobileClose}
        >
          <div
            className="w-64 max-w-[80vw] h-full animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
