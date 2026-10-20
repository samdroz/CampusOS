import {
  Subject,
  ClassSession,
  Assignment,
  Exam,
  AttendanceRecord,
  OverallAttendanceSummary,
  Note,
  SettingsMap,
  DashboardOverview,
  SearchResult,
  StudentProfile,
  OnboardingPayload,
} from '../types';

let currentBaseUrl = typeof window !== 'undefined' && window.location?.origin && !window.location.origin.startsWith('file:') && window.location.origin !== 'null'
  ? `${window.location.origin.replace(/\/$/, '')}/api`
  : '/api';

export function setApiBaseUrl(url: string) {
  currentBaseUrl = url.replace(/\/$/, '') + '/api';
  if (typeof window !== 'undefined') {
    (window as any).__CAMPUSOS_BACKEND_URL__ = url;
  }
}

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined' && (window as any).__CAMPUSOS_BACKEND_URL__) {
    const raw = (window as any).__CAMPUSOS_BACKEND_URL__;
    return raw.endsWith('/api') ? raw : `${raw.replace(/\/$/, '')}/api`;
  }
  return currentBaseUrl;
}

class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const base = getApiBaseUrl();
  const url = `${base}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return {} as T;
  }

  const contentType = response.headers.get('content-type');
  let data: any = null;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    let errorMessage = response.statusText || 'Request failed';
    if (data && typeof data === 'object') {
      if (typeof data.detail === 'string') {
        errorMessage = data.detail;
      } else if (Array.isArray(data.detail)) {
        errorMessage = data.detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
      }
    }
    throw new ApiError(response.status, errorMessage, data);
  }

  return data as T;
}

export const api = {
  // Health
  health: (options?: RequestInit) =>
    request<{ status: string; service: string; version?: string }>('/health', options),

  // Dashboard
  dashboard: {
    get: () => request<DashboardOverview>('/dashboard'),
  },

  // Subjects
  subjects: {
    list: () => request<Subject[]>('/subjects'),
    get: (id: number) => request<Subject>(`/subjects/${id}`),
    create: (data: Partial<Subject>) =>
      request<Subject>('/subjects', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Partial<Subject>) =>
      request<Subject>(`/subjects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request<void>(`/subjects/${id}`, {
        method: 'DELETE',
      }),
  },

  // Timetable Class Sessions
  sessions: {
    list: (params?: { day_of_week?: number; subject_id?: number }) => {
      const sp = new URLSearchParams();
      if (params?.day_of_week !== undefined) sp.append('day_of_week', params.day_of_week.toString());
      if (params?.subject_id !== undefined) sp.append('subject_id', params.subject_id.toString());
      const query = sp.toString() ? `?${sp.toString()}` : '';
      return request<ClassSession[]>(`/sessions${query}`);
    },
    get: (id: number) => request<ClassSession>(`/sessions/${id}`),
    create: (data: Partial<ClassSession>) =>
      request<ClassSession>('/sessions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Partial<ClassSession>) =>
      request<ClassSession>(`/sessions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request<void>(`/sessions/${id}`, {
        method: 'DELETE',
      }),
  },

  // Assignments
  assignments: {
    list: (params?: {
      status?: string;
      subject_id?: number;
      priority?: string;
      search?: string;
      sort_by?: string;
      sort_order?: string;
    }) => {
      const sp = new URLSearchParams();
      if (params?.status) sp.append('status', params.status);
      if (params?.subject_id) sp.append('subject_id', params.subject_id.toString());
      if (params?.priority) sp.append('priority', params.priority);
      if (params?.search) sp.append('search', params.search);
      if (params?.sort_by) sp.append('sort_by', params.sort_by);
      if (params?.sort_order) sp.append('sort_order', params.sort_order);
      const query = sp.toString() ? `?${sp.toString()}` : '';
      return request<Assignment[]>(`/assignments${query}`);
    },
    get: (id: number) => request<Assignment>(`/assignments/${id}`),
    create: (data: Partial<Assignment>) =>
      request<Assignment>('/assignments', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Partial<Assignment>) =>
      request<Assignment>(`/assignments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request<void>(`/assignments/${id}`, {
        method: 'DELETE',
      }),
  },

  // Examinations
  exams: {
    list: (params?: { subject_id?: number; is_past?: boolean }) => {
      const sp = new URLSearchParams();
      if (params?.subject_id) sp.append('subject_id', params.subject_id.toString());
      if (params?.is_past !== undefined) sp.append('is_past', params.is_past.toString());
      const query = sp.toString() ? `?${sp.toString()}` : '';
      return request<Exam[]>(`/exams${query}`);
    },
    get: (id: number) => request<Exam>(`/exams/${id}`),
    create: (data: Partial<Exam>) =>
      request<Exam>('/exams', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Partial<Exam>) =>
      request<Exam>(`/exams/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request<void>(`/exams/${id}`, {
        method: 'DELETE',
      }),
  },

  // Attendance
  attendance: {
    list: (params?: { subject_id?: number; status?: string; date_from?: string; date_to?: string }) => {
      const sp = new URLSearchParams();
      if (params?.subject_id) sp.append('subject_id', params.subject_id.toString());
      if (params?.status) sp.append('status', params.status);
      if (params?.date_from) sp.append('date_from', params.date_from);
      if (params?.date_to) sp.append('date_to', params.date_to);
      const query = sp.toString() ? `?${sp.toString()}` : '';
      return request<AttendanceRecord[]>(`/attendance${query}`);
    },
    summary: () => request<OverallAttendanceSummary>('/attendance/summary'),
    record: (data: Partial<AttendanceRecord>) =>
      request<AttendanceRecord>('/attendance', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Partial<AttendanceRecord>) =>
      request<AttendanceRecord>(`/attendance/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request<void>(`/attendance/${id}`, {
        method: 'DELETE',
      }),
  },

  // Notes
  notes: {
    list: (params?: { subject_id?: number; tag?: string; search?: string }) => {
      const sp = new URLSearchParams();
      if (params?.subject_id) sp.append('subject_id', params.subject_id.toString());
      if (params?.tag) sp.append('tag', params.tag);
      if (params?.search) sp.append('search', params.search);
      const query = sp.toString() ? `?${sp.toString()}` : '';
      return request<Note[]>(`/notes${query}`);
    },
    get: (id: number) => request<Note>(`/notes/${id}`),
    create: (data: Partial<Note>) =>
      request<Note>('/notes', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Partial<Note>) =>
      request<Note>(`/notes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request<void>(`/notes/${id}`, {
        method: 'DELETE',
      }),
  },

  // Settings
  settings: {
    get: () => request<SettingsMap>('/settings'),
    update: (data: Partial<SettingsMap>) =>
      request<SettingsMap>('/settings', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Student Profile & Onboarding
  profile: {
    get: () => request<StudentProfile>('/profile'),
    update: (data: Partial<StudentProfile>) =>
      request<StudentProfile>('/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    completeOnboarding: (payload: OnboardingPayload) =>
      request<{ status: string; message: string; profile: any }>('/profile/onboarding', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    skipOnboarding: () =>
      request<{ status: string; message: string; onboarding_completed: boolean }>('/profile/skip-onboarding', {
        method: 'POST',
      }),
    resetData: (confirm: boolean) =>
      request<{ status: string; message: string }>('/profile/reset', {
        method: 'POST',
        body: JSON.stringify({ confirm }),
      }),
  },

  // Search
  search: (q: string) => request<SearchResult>(`/search?q=${encodeURIComponent(q)}`),

  // Backup & Demo
  backup: {
    export: () => request<any>('/export'),
    import: (data: any) =>
      request<{ status: string; message: string; imported_counts: any }>('/import', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    seed: () =>
      request<{ status: string; message: string; counts: any }>('/seed', {
        method: 'POST',
      }),
  },

  // Diagnostic Onboarding Logging
  debug: {
    log: (stage: string, message: string = '', details: any = null) => {
      try {
        console.log(`[CampusOS-Debug] [${stage}] ${message}`, details || '');
      } catch {}
      return request<{ status: string }>('/debug/log', {
        method: 'POST',
        body: JSON.stringify({ stage, message, details }),
      }).catch((e) => {
        console.warn('[CampusOS-Debug] Failed to report debug log:', e);
      });
    },
  },
};

export { ApiError };
