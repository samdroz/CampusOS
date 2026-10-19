import React from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';

export type ModuleType =
  | 'dashboard'
  | 'subjects'
  | 'timetable'
  | 'assignments'
  | 'exams'
  | 'attendance'
  | 'notes'
  | 'settings';

interface AcademicLoaderProps {
  module: ModuleType;
  message?: string;
  error?: string | null;
  onRetry?: () => void;
  size?: 'sm' | 'md' | 'lg' | 'fullscreen';
  className?: string;
}

const defaultMessages: Record<ModuleType, string> = {
  dashboard: 'Organizing workspace...',
  subjects: 'Cataloging courses & credits...',
  timetable: 'Aligning weekly schedules...',
  assignments: 'Checking upcoming deadlines...',
  exams: 'Retrieving examination calendar...',
  attendance: 'Calculating attendance records...',
  notes: 'Opening study guides & notes...',
  settings: 'Loading system preferences...',
};

export const AcademicLoader: React.FC<AcademicLoaderProps> = ({
  module,
  message,
  error,
  onRetry,
  size = 'md',
  className = '',
}) => {
  const displayMessage = message || defaultMessages[module] || 'Loading...';

  // Error state
  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 text-center rounded-2xl bg-surface border border-border-subtle ${className}`}>
        <div className="w-12 h-12 rounded-xl bg-semantic-danger/10 text-semantic-danger border border-semantic-danger/20 flex items-center justify-center mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-txt-primary mb-1">Failed to load {module} data</h4>
        <p className="text-xs text-txt-secondary max-w-sm mb-4">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-accent hover:bg-accent-hover rounded-xl transition-all shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        )}
      </div>
    );
  }

  const containerSizes = {
    sm: 'p-4 min-h-[140px]',
    md: 'p-6 min-h-[220px]',
    lg: 'p-10 min-h-[340px]',
    fullscreen: 'fixed inset-0 z-50 bg-app/95 backdrop-blur-sm flex items-center justify-center',
  }[size];

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={displayMessage}
      className={`flex flex-col items-center justify-center text-center select-none ${containerSizes} ${className}`}
    >
      <div className="relative mb-4 flex items-center justify-center" aria-hidden="true">
        <ContextualModuleAnimation module={module} />
      </div>

      <p className="text-xs font-medium text-txt-secondary tracking-normal flex items-center space-x-2">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
        <span>{displayMessage}</span>
      </p>
    </div>
  );
};

/* -------------------------------------------------------------------------
 * 1. Dashboard: Small stack of notebooks settling into place
 * ------------------------------------------------------------------------- */
const DashboardNotebookShuffle: React.FC = () => {
  return (
    <div className="w-16 h-16 relative flex items-center justify-center">
      {/* Bottom notebook */}
      <div className="absolute w-12 h-10 rounded-md bg-surface-elevated border border-border-default shadow-sm transition-all duration-300 translate-y-1.5 -rotate-3" />
      {/* Middle notebook */}
      <div className="absolute w-12 h-10 rounded-md bg-surface border border-border-default shadow-sm transition-all duration-300 -translate-y-0.5 rotate-2" />
      {/* Top primary notebook with indigo spine */}
      <div className="absolute w-12 h-10 rounded-md bg-surface border border-accent/40 shadow-sm flex overflow-hidden animate-academic-shuffle">
        <div className="w-2.5 h-full bg-accent/80 shrink-0" />
        <div className="flex-1 p-1 space-y-1 bg-surface">
          <div className="h-1 bg-accent/30 rounded w-3/4" />
          <div className="h-1 bg-border-subtle rounded w-1/2" />
          <div className="h-1 bg-border-subtle rounded w-2/3" />
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------
 * 2. Subjects: Textbooks sliding neatly into a stack with indigo accent
 * ------------------------------------------------------------------------- */
const SubjectsBooksStack: React.FC = () => {
  return (
    <div className="w-16 h-16 relative flex items-center justify-center">
      <div className="w-14 h-12 flex flex-col justify-end space-y-1">
        {/* Book 1 (bottom) */}
        <div className="h-2.5 w-full bg-surface-elevated border border-border-default rounded flex items-center px-1 animate-academic-slide-1">
          <div className="w-1 h-1.5 bg-accent/40 rounded-sm" />
        </div>
        {/* Book 2 (middle) */}
        <div className="h-2.5 w-11/12 bg-surface border border-border-default rounded flex items-center px-1 animate-academic-slide-2">
          <div className="w-1 h-1.5 bg-txt-muted/40 rounded-sm" />
        </div>
        {/* Book 3 (top) with accent ribbon */}
        <div className="h-3 w-full bg-surface border border-accent/50 rounded flex items-center justify-between px-1.5 animate-academic-slide-3 shadow-sm">
          <div className="w-1.5 h-1.5 bg-accent rounded-sm" />
          <div className="w-3 h-0.5 bg-accent/30 rounded" />
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------
 * 3. Timetable: Timetable blocks snapping into a weekly geometric grid
 * ------------------------------------------------------------------------- */
const TimetableGridSnap: React.FC = () => {
  return (
    <div className="w-16 h-16 relative flex items-center justify-center">
      <div className="w-12 h-12 rounded-lg bg-surface border border-border-default p-1 grid grid-cols-3 grid-rows-3 gap-1 shadow-sm">
        <div className="bg-surface-elevated rounded-sm" />
        <div className="bg-accent/70 rounded-sm animate-academic-snap-1" />
        <div className="bg-surface-elevated rounded-sm" />
        <div className="bg-accent/40 rounded-sm animate-academic-snap-2" />
        <div className="bg-surface-elevated rounded-sm" />
        <div className="bg-accent/80 rounded-sm animate-academic-snap-3" />
        <div className="bg-surface-elevated rounded-sm" />
        <div className="bg-border-subtle rounded-sm" />
        <div className="bg-accent/50 rounded-sm animate-academic-snap-4" />
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------
 * 4. Assignments: Notebook page with checkbox being marked
 * ------------------------------------------------------------------------- */
const AssignmentsCheckboxMark: React.FC = () => {
  return (
    <div className="w-16 h-16 relative flex items-center justify-center">
      <div className="w-12 h-14 rounded-lg bg-surface border border-border-default p-2 flex flex-col justify-between shadow-sm">
        {/* Task line 1 */}
        <div className="flex items-center space-x-1.5">
          <div className="w-3.5 h-3.5 rounded border border-accent/60 bg-accent/10 flex items-center justify-center shrink-0">
            <svg
              className="w-2.5 h-2.5 text-accent animate-academic-check"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="h-1.5 bg-border-default rounded w-full" />
        </div>
        {/* Task line 2 */}
        <div className="flex items-center space-x-1.5 opacity-60">
          <div className="w-3 h-3 rounded border border-border-default shrink-0" />
          <div className="h-1 bg-border-subtle rounded w-3/4" />
        </div>
        {/* Task line 3 */}
        <div className="flex items-center space-x-1.5 opacity-40">
          <div className="w-3 h-3 rounded border border-border-default shrink-0" />
          <div className="h-1 bg-border-subtle rounded w-1/2" />
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------
 * 5. Examinations: Exam question paper sliding with clean checkmark / pencil
 * ------------------------------------------------------------------------- */
const ExamsDeskPaper: React.FC = () => {
  return (
    <div className="w-16 h-16 relative flex items-center justify-center">
      {/* Desk surface line */}
      <div className="absolute bottom-2.5 w-14 h-0.5 bg-border-subtle rounded-full" />
      {/* Exam paper sliding onto desk */}
      <div className="w-11 h-13 rounded bg-surface border border-border-default p-1.5 shadow-sm animate-academic-paper flex flex-col justify-between">
        <div className="flex items-center justify-between pb-1 border-b border-border-subtle">
          <div className="w-4 h-1 bg-accent/70 rounded" />
          <div className="w-2 h-1 bg-border-subtle rounded" />
        </div>
        <div className="space-y-1">
          <div className="w-full h-0.5 bg-border-subtle rounded" />
          <div className="w-3/4 h-0.5 bg-border-subtle rounded" />
          <div className="w-5/6 h-0.5 bg-border-subtle rounded" />
        </div>
        <div className="flex justify-end pt-0.5">
          <div className="w-2.5 h-2.5 rounded-full bg-accent/15 border border-accent/40 flex items-center justify-center">
            <svg
              className="w-1.5 h-1.5 text-accent"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------
 * 6. Attendance: Register sheet appearing with subtle green verification
 * ------------------------------------------------------------------------- */
const AttendanceRegisterCheck: React.FC = () => {
  return (
    <div className="w-16 h-16 relative flex items-center justify-center">
      <div className="w-13 h-13 rounded-lg bg-surface border border-border-default p-1.5 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between pb-1 border-b border-border-subtle">
          <div className="w-5 h-1 bg-border-default rounded" />
          <div className="w-2 h-1 bg-semantic-success/60 rounded" />
        </div>
        {/* Attendance rows */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="w-6 h-1 bg-border-subtle rounded" />
            <div className="w-1.5 h-1.5 rounded-full bg-semantic-success animate-pulse" />
          </div>
          <div className="flex items-center justify-between">
            <div className="w-5 h-1 bg-border-subtle rounded" />
            <div className="w-1.5 h-1.5 rounded-full bg-semantic-success animate-pulse delay-75" />
          </div>
          <div className="flex items-center justify-between">
            <div className="w-7 h-1 bg-border-subtle rounded" />
            <div className="w-1.5 h-1.5 rounded-full bg-semantic-success animate-pulse delay-150" />
          </div>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------
 * 7. Notes: Notebook pages flipping / paper with subtle ruled lines
 * ------------------------------------------------------------------------- */
const NotesPageFlip: React.FC = () => {
  return (
    <div className="w-16 h-16 relative flex items-center justify-center perspective-[300px]">
      <div className="w-12 h-13 rounded-lg bg-surface border border-border-default p-2 shadow-sm relative overflow-hidden">
        {/* Spiral binder holes */}
        <div className="absolute left-1 top-2 bottom-2 flex flex-col justify-between">
          <div className="w-1 h-1 rounded-full bg-border-default" />
          <div className="w-1 h-1 rounded-full bg-border-default" />
          <div className="w-1 h-1 rounded-full bg-border-default" />
          <div className="w-1 h-1 rounded-full bg-border-default" />
        </div>
        {/* Ruled lines */}
        <div className="ml-2 space-y-1.5 pt-0.5">
          <div className="h-1 bg-accent/40 rounded w-4/5" />
          <div className="h-0.5 bg-border-subtle rounded w-full" />
          <div className="h-0.5 bg-border-subtle rounded w-3/4" />
          <div className="h-0.5 bg-border-subtle rounded w-5/6" />
        </div>
        {/* Page curl effect */}
        <div className="absolute right-0 bottom-0 w-3 h-3 bg-surface-elevated border-t border-l border-border-default rounded-tl" />
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------
 * 8. Settings: Small gear rotating smoothly
 * ------------------------------------------------------------------------- */
const SettingsGearRotate: React.FC = () => {
  return (
    <div className="w-16 h-16 relative flex items-center justify-center">
      <div className="w-12 h-12 rounded-xl bg-surface border border-border-default shadow-sm flex items-center justify-center">
        <svg
          className="w-7 h-7 text-accent animate-academic-gear"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------
 * Public Contextual Academic Animation Resolver
 * ------------------------------------------------------------------------- */
export const ContextualModuleAnimation: React.FC<{ module: ModuleType }> = ({ module }) => {
  switch (module) {
    case 'dashboard':
      return <DashboardNotebookShuffle />;
    case 'subjects':
      return <SubjectsBooksStack />;
    case 'timetable':
      return <TimetableGridSnap />;
    case 'assignments':
      return <AssignmentsCheckboxMark />;
    case 'exams':
      return <ExamsDeskPaper />;
    case 'attendance':
      return <AttendanceRegisterCheck />;
    case 'notes':
      return <NotesPageFlip />;
    case 'settings':
      return <SettingsGearRotate />;
    default:
      return <DashboardNotebookShuffle />;
  }
};
