export interface Subject {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  color: string;
  instructor?: string | null;
  credits: number;
  created_at: string;
  updated_at: string;
}

export interface ClassSession {
  id: number;
  subject_id: number;
  day_of_week: number; // 0=Mon, 6=Sun
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  room?: string | null;
  instructor?: string | null;
  session_type: string;
  subject_name?: string | null;
  subject_code?: string | null;
  subject_color?: string | null;
}

export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type AssignmentStatus = 'todo' | 'in_progress' | 'completed';

export interface Assignment {
  id: number;
  subject_id: number;
  title: string;
  description?: string | null;
  due_date: string;
  priority: Priority;
  status: AssignmentStatus;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  subject_name?: string | null;
  subject_code?: string | null;
  subject_color?: string | null;
  is_overdue: boolean;
}

export interface Exam {
  id: number;
  subject_id: number;
  title: string;
  exam_date: string;
  start_time: string;
  end_time?: string | null;
  location?: string | null;
  weight?: number | null;
  notes?: string | null;
  created_at: string;
  subject_name?: string | null;
  subject_code?: string | null;
  subject_color?: string | null;
  days_remaining: number;
  is_imminent: boolean;
  is_past: boolean;
}

export type AttendanceStatus = 'present' | 'absent' | 'excused' | 'cancelled';

export interface AttendanceRecord {
  id: number;
  subject_id: number;
  date: string;
  status: AttendanceStatus;
  session_name: string;
  notes?: string | null;
  created_at: string;
  subject_name?: string | null;
  subject_code?: string | null;
  subject_color?: string | null;
}

export interface SubjectAttendanceStats {
  subject_id: number;
  subject_name: string;
  subject_code: string;
  subject_color: string;
  attended: number;
  absent: number;
  excused: number;
  cancelled: number;
  total_eligible: number;
  percentage: number | null;
  is_warning: boolean;
}

export interface OverallAttendanceSummary {
  total_attended: number;
  total_absent: number;
  total_excused: number;
  total_cancelled: number;
  total_eligible: number;
  overall_percentage: number | null;
  is_warning: boolean;
  warning_threshold: number;
  subjects: SubjectAttendanceStats[];
}

export interface Note {
  id: number;
  subject_id?: number | null;
  title: string;
  content: string;
  tags?: string | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  subject_name?: string | null;
  subject_code?: string | null;
  subject_color?: string | null;
}

export interface SettingsMap {
  student_name: string;
  student_id?: string;
  major?: string;
  attendance_threshold: string;
  week_start: string;
  theme: string;
  enable_notifications?: string;
}

export interface NextClassInfo {
  id: number;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  subject_color: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room?: string | null;
  instructor?: string | null;
  session_type: string;
  is_today: boolean;
}

export interface DashboardOverview {
  student_name: string;
  pending_assignments_count: number;
  overdue_assignments_count: number;
  completed_assignments_count: number;
  upcoming_exams_count: number;
  total_subjects_count: number;
  overall_attendance_percentage: number | null;
  attendance_is_warning: boolean;
  warning_threshold: number;
  next_class?: NextClassInfo | null;
  today_sessions: ClassSession[];
  upcoming_deadlines: Assignment[];
  upcoming_exams: Exam[];
  recent_notes: Note[];
  subject_attendance: SubjectAttendanceStats[];
}

export interface SearchItem {
  entity_type: 'subject' | 'assignment' | 'exam' | 'note';
  id: number;
  title: string;
  subtitle?: string | null;
  badge?: string | null;
  color?: string | null;
  url: string;
}

export interface SearchResult {
  query: string;
  results: SearchItem[];
}
