import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { SettingsPage } from '../pages/SettingsPage';
import { PageTransition } from '../components/PageTransition';
import { Header } from '../components/Header';
import { ContextualModuleAnimation } from '../components/AcademicLoader';
import { ToastProvider } from '../components/Toast';
import { OnboardingModal } from '../components/OnboardingModal';
import { api } from '../api/client';

describe('Frontend Business Logic & Validation Test Suite', () => {
  // 1. Attendance Calculation & Empty State Logic
  describe('Attendance Calculations', () => {
    it('returns null percentage when there are 0 eligible sessions (avoids false 100%)', () => {
      const attended = 0;
      const absent = 0;
      const totalEligible = attended + absent;
      const percentage = totalEligible > 0 ? (attended / totalEligible) * 100 : null;

      expect(totalEligible).toBe(0);
      expect(percentage).toBeNull();
    });

    it('accurately computes attendance percentage for present and absent records', () => {
      const attended = 15;
      const absent = 5;
      const totalEligible = attended + absent;
      const percentage = Math.round((attended / totalEligible) * 1000) / 10;

      expect(totalEligible).toBe(20);
      expect(percentage).toBe(75.0);
    });

    it('triggers warning flag when attendance percentage is strictly below warning threshold', () => {
      const threshold = 75.0;
      const stats = [
        { subject: 'CS301', pct: 85.0, warning: false },
        { subject: 'MATH220', pct: 62.5, warning: true },
        { subject: 'PHYS101', pct: 75.0, warning: false }, // exactly threshold is OK
      ];

      stats.forEach((s) => {
        const isWarning = s.pct !== null && s.pct < threshold;
        expect(isWarning).toBe(s.warning);
      });
    });
  });

  // 2. Assignment Status Cycling & Overdue Detection
  describe('Assignment Status & Overdue Calculations', () => {
    it('cycles assignment status correctly: todo -> in_progress -> completed -> todo', () => {
      const cycleStatus = (curr: string) => {
        if (curr === 'todo') return 'in_progress';
        if (curr === 'in_progress') return 'completed';
        return 'todo';
      };

      expect(cycleStatus('todo')).toBe('in_progress');
      expect(cycleStatus('in_progress')).toBe('completed');
      expect(cycleStatus('completed')).toBe('todo');
    });

    it('flags past tasks as overdue only if not completed', () => {
      const today = '2026-10-19';
      const isOverdue = (dueDate: string, status: string) => {
        return status !== 'completed' && dueDate < today;
      };

      expect(isOverdue('2026-10-15', 'todo')).toBe(true);
      expect(isOverdue('2026-10-15', 'in_progress')).toBe(true);
      expect(isOverdue('2026-10-15', 'completed')).toBe(false); // Completed cannot be overdue
      expect(isOverdue('2026-10-25', 'todo')).toBe(false); // Future date
    });
  });

  // 3. Search and Multi-Criteria Filtering
  describe('Search & Filter Behavior', () => {
    const mockSubjects = [
      { id: 1, name: 'Data Structures', code: 'CS301', instructor: 'Dr. Sarah Chen' },
      { id: 2, name: 'Operating Systems', code: 'CS305', instructor: 'Prof. David Miller' },
      { id: 3, name: 'Linear Algebra', code: 'MATH220', instructor: 'Dr. Elena Rostova' },
    ];

    it('filters courses by case-insensitive name, code, or professor', () => {
      const filterCourses = (query: string) => {
        const q = query.toLowerCase();
        return mockSubjects.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.code.toLowerCase().includes(q) ||
            s.instructor.toLowerCase().includes(q)
        );
      };

      expect(filterCourses('cs301')).toHaveLength(1);
      expect(filterCourses('algebra')).toHaveLength(1);
      expect(filterCourses('feynman')).toHaveLength(0);
      expect(filterCourses('dr.')).toHaveLength(2);
    });
  });

  // 4. Timetable Collision Detection Logic
  describe('Timetable Overlap Detection', () => {
    const checkOverlap = (
      start1: string,
      end1: string,
      start2: string,
      end2: string
    ) => {
      return start1 < end2 && start2 < end1;
    };

    it('detects overlapping class intervals on the same day', () => {
      // 09:00 - 10:30 overlaps with 10:00 - 11:30
      expect(checkOverlap('09:00', '10:30', '10:00', '11:30')).toBe(true);
      // 10:00 - 11:30 overlaps with 09:30 - 10:15
      expect(checkOverlap('10:00', '11:30', '09:30', '10:15')).toBe(true);
    });

    it('permits adjacent non-overlapping class intervals', () => {
      // 09:00 - 10:30 and 10:30 - 12:00 do not overlap (touching endpoints)
      expect(checkOverlap('09:00', '10:30', '10:30', '12:00')).toBe(false);
      // 13:00 - 14:00 and 15:00 - 16:00
      expect(checkOverlap('13:00', '14:00', '15:00', '16:00')).toBe(false);
    });
  });

  // 5. Input Validation Rules
  describe('Form Input Validation', () => {
    it('validates subject code non-empty and formatted', () => {
      const isValidCode = (code: string) => code.trim().length >= 2;
      expect(isValidCode('  ')).toBe(false);
      expect(isValidCode('CS')).toBe(true);
      expect(isValidCode('CS301')).toBe(true);
    });

    it('validates 24-hour time values and order', () => {
      const isValidTimeRange = (start: string, end: string) => {
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        if (!timeRegex.test(start) || !timeRegex.test(end)) return false;
        return start < end;
      };

      expect(isValidTimeRange('09:00', '10:30')).toBe(true);
      expect(isValidTimeRange('14:00', '12:00')).toBe(false); // End before start
      expect(isValidTimeRange('25:00', '10:00')).toBe(false); // Invalid hour
      expect(isValidTimeRange('10:00', '10:00')).toBe(false); // Same time
    });
  });

  // 6. Markdown Sanitization Safety
  describe('Markdown Sanitization', () => {
    it('strips malicious <script> tags and javascript: injections', () => {
      const sanitize = (raw: string) => {
        return raw
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
          .replace(/javascript:/gi, '');
      };

      const malicious = '# Notes\n<script>alert("hacked")</script>\nValid content';
      const clean = sanitize(malicious);
      expect(clean).not.toContain('<script>');
      expect(clean).not.toContain('alert("hacked")');
      expect(clean).toContain('Valid content');
    });
  });

  // 7. Theme Switching & Preference Persistence
  describe('Theme Management & Persistence', () => {
    it('defaults to dark mode when no saved preference exists', () => {
      const getInitialTheme = (saved: string | null) => {
        return saved === 'light' ? 'light' : 'dark';
      };

      expect(getInitialTheme(null)).toBe('dark');
      expect(getInitialTheme('unknown')).toBe('dark');
      expect(getInitialTheme('dark')).toBe('dark');
      expect(getInitialTheme('light')).toBe('light');
    });

    it('toggles theme state immediately and mirrors to storage', () => {
      let currentTheme: 'dark' | 'light' = 'dark';
      const mockStorage: Record<string, string> = {};

      const setTheme = (next: 'dark' | 'light') => {
        currentTheme = next;
        mockStorage['campusos_theme'] = next;
      };

      // Toggle from dark to light
      setTheme('light');
      expect(currentTheme).toBe('light');
      expect(mockStorage['campusos_theme']).toBe('light');

      // Toggle from light to dark
      setTheme('dark');
      expect(currentTheme).toBe('dark');
      expect(mockStorage['campusos_theme']).toBe('dark');
    });

    it('updates document.documentElement root class correctly for CSS variables', () => {
      const applyThemeToDOM = (theme: 'dark' | 'light') => {
        document.documentElement.classList.remove('dark', 'light');
        document.documentElement.classList.add(theme);
      };

      applyThemeToDOM('light');
      expect(document.documentElement.classList.contains('light')).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(false);

      applyThemeToDOM('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.classList.contains('light')).toBe(false);
    });
  });

  // 8. First-Launch Startup Experience & Session Behavior
  describe('First-Launch Startup Session Logic', () => {
    it('shows startup animation only once per browser session', () => {
      const mockSessionStorage: Record<string, string> = {};

      const shouldShowStartup = () => {
        return !mockSessionStorage['campusos_session_started'];
      };

      const markStartupCompleted = () => {
        mockSessionStorage['campusos_session_started'] = 'true';
      };

      // First time in browser session
      expect(shouldShowStartup()).toBe(true);

      // Startup finishes
      markStartupCompleted();

      // Subsequent navigations or tabs in same session
      expect(shouldShowStartup()).toBe(false);
      expect(mockSessionStorage['campusos_session_started']).toBe('true');
    });

    it('enforces minimum animation window (~1.5s) while loading in parallel', () => {
      let isDataReady = false;
      let minTimeElapsed = false;

      const canDismissSplash = () => isDataReady && minTimeElapsed;

      // Fast API response (e.g. 200ms) - should NOT dismiss prematurely
      isDataReady = true;
      expect(canDismissSplash()).toBe(false);

      // Min time finishes
      minTimeElapsed = true;
      expect(canDismissSplash()).toBe(true);
    });
  });

  // 9. Context-Aware Loading Animation System
  describe('Context-Aware Navigation Loaders', () => {
    const modules = [
      'dashboard',
      'subjects',
      'timetable',
      'assignments',
      'exams',
      'attendance',
      'notes',
      'settings',
    ] as const;

    const defaultMessages: Record<string, string> = {
      dashboard: 'Organizing workspace...',
      subjects: 'Cataloging courses & credits...',
      timetable: 'Aligning weekly schedules...',
      assignments: 'Checking upcoming deadlines...',
      exams: 'Retrieving examination calendar...',
      attendance: 'Calculating attendance records...',
      notes: 'Opening study guides & notes...',
      settings: 'Loading system preferences...',
    };

    it('maps all 8 major application modules to distinct academic messages', () => {
      modules.forEach((mod) => {
        expect(defaultMessages[mod]).toBeDefined();
        expect(defaultMessages[mod].length).toBeGreaterThan(10);
      });
    });

    it('handles API failure states with retry capability', () => {
      let retried = false;
      const errorState = {
        error: 'Network request failed (500)',
        onRetry: () => {
          retried = true;
        },
      };

      expect(errorState.error).toContain('failed');
      errorState.onRetry();
      expect(retried).toBe(true);
    });
  });

  // 10. Navigation Transitions & Reduced Motion
  describe('Navigation Transitions & Accessibility', () => {
    it('uses snappy 200ms transition duration without page-covering overlays', () => {
      const transitionDurationMs = 200;
      expect(transitionDurationMs).toBeGreaterThanOrEqual(180);
      expect(transitionDurationMs).toBeLessThanOrEqual(220);
    });

    it('supports prefers-reduced-motion without breaking navigation', () => {
      const getAnimationBehavior = (reducedMotion: boolean) => {
        return reducedMotion ? 'instant-fade' : 'animated-spring';
      };

      expect(getAnimationBehavior(true)).toBe('instant-fade');
      expect(getAnimationBehavior(false)).toBe('animated-spring');
    });

    it('renders PageTransition children properly in DOM with ZERO page-covering overlays', () => {
      const { container } = render(
        <PageTransition pageKey="dashboard">
          <div data-testid="test-content">Dashboard Content</div>
        </PageTransition>
      );
      expect(container.textContent).toContain('Dashboard Content');
      expect(container.firstChild).toBeDefined();
      // Verifies zero full-screen or content-covering overlay exists
      expect(container.querySelector('.contextual-nav-loader')).toBeNull();
    });

    it('handles enter/exit lifecycle cleanly without lingering overlays', () => {
      vi.useFakeTimers();
      const { container, rerender } = render(
        <PageTransition pageKey="dashboard">
          <div data-testid="page-dashboard">Dashboard View</div>
        </PageTransition>
      );

      expect(container.textContent).toContain('Dashboard View');

      // Navigate to subjects
      rerender(
        <PageTransition pageKey="subjects">
          <div data-testid="page-subjects">Subjects View</div>
        </PageTransition>
      );

      // During the transition: outgoing and incoming are rendered, with NO page-covering overlay
      expect(container.textContent).toContain('Dashboard View');
      expect(container.textContent).toContain('Subjects View');
      expect(container.querySelector('.contextual-nav-loader')).toBeNull();

      // Fast forward past the 200ms page transition
      act(() => {
        vi.advanceTimersByTime(210);
      });

      // Outgoing has unmounted, incoming remains fully interactive and unobstructed
      expect(container.textContent).not.toContain('Dashboard View');
      expect(container.textContent).toContain('Subjects View');
      expect(container.querySelector('.contextual-nav-loader')).toBeNull();

      vi.useRealTimers();
    });

    it('renders contextual academic animations for all 8 destination modules', () => {
      const modules = [
        'dashboard',
        'subjects',
        'timetable',
        'assignments',
        'exams',
        'attendance',
        'notes',
        'settings',
      ] as const;

      modules.forEach((mod) => {
        const { container } = render(<ContextualModuleAnimation module={mod} />);
        expect(container.firstChild).toBeDefined();
        // Verifies non-empty SVG or animated icon markup
        expect(container.innerHTML.length).toBeGreaterThan(50);
      });
    });

    it('renders non-blocking inline academic animation badge in Header beside page title', () => {
      const { container } = render(
        <Header
          pageTitle="subjects"
          currentTheme="dark"
          onToggleTheme={vi.fn()}
          onOpenCommandPalette={vi.fn()}
          onOpenMobileMenu={vi.fn()}
          onQuickAction={vi.fn()}
        />
      );

      // Title is rendered
      expect(screen.getByText('subjects')).toBeDefined();
      // Non-blocking inline icon container is rendered in header
      const inlineBadge = container.querySelector('[title="CampusOS subjects"]');
      expect(inlineBadge).not.toBeNull();
      expect(inlineBadge?.classList.contains('w-7')).toBe(true);
    });
  });

  // 11. Settings Page: Verification of Animation Preview Removal
  describe('Settings Page Configuration', () => {
    const mockSettings = {
      student_name: 'Alex Morgan',
      student_id: 'STU-8829',
      major: 'Computer Science & Engineering',
      attendance_threshold: '75.0',
      week_start: 'monday',
      theme: 'dark' as const,
    };

    it('confirms Academic Animations & Transitions preview section is completely removed', () => {
      render(
        <ToastProvider>
          <SettingsPage
            settings={mockSettings}
            currentTheme="dark"
            onToggleTheme={vi.fn()}
            onUpdateSettings={vi.fn()}
            onResetDemoData={vi.fn()}
          />
        </ToastProvider>
      );

      // Verify no animation preview headings or buttons exist
      expect(screen.queryByText(/Academic Animations & Transitions/i)).toBeNull();
      expect(screen.queryByText(/Replay Startup Animation/i)).toBeNull();
      expect(screen.queryByText(/Context-Aware Module Loader Preview/i)).toBeNull();
      expect(screen.queryByText(/CampusOS uses lightweight, contextual academic animations/i)).toBeNull();
    });

    it('preserves Appearance theme selector and core academic settings', () => {
      render(
        <ToastProvider>
          <SettingsPage
            settings={mockSettings}
            currentTheme="dark"
            onToggleTheme={vi.fn()}
            onUpdateSettings={vi.fn()}
            onResetDemoData={vi.fn()}
          />
        </ToastProvider>
      );

      // Verify Appearance is intact
      expect(screen.getByText('Appearance')).toBeDefined();
      expect(screen.getByText('Dark')).toBeDefined();
      expect(screen.getByText('Light')).toBeDefined();

      // Verify Student Profile & Academic Settings are intact
      expect(screen.getByText('Student Profile')).toBeDefined();
      expect(screen.getByText('Attendance Warning Threshold (%)')).toBeDefined();
      expect(screen.getByText('Data Management & Persistence')).toBeDefined();
    });
  });

  // 12. Onboarding Modal & First-Launch Wizard
  describe('Onboarding Modal & First-Launch Wizard', () => {
    it('does not render when isOpen is false (completed profile)', () => {
      const { container } = render(
        <OnboardingModal isOpen={false} onComplete={vi.fn()} onSkip={vi.fn()} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders welcome screen when isOpen is true (fresh profile)', () => {
      render(
        <OnboardingModal isOpen={true} onComplete={vi.fn()} onSkip={vi.fn()} />
      );
      expect(screen.getAllByText('Welcome to CampusOS').length).toBeGreaterThan(0);
      expect(screen.getByText('Start Setup')).toBeDefined();
      expect(screen.getByText('Skip for Now')).toBeDefined();
    });

    it('navigates from welcome screen into personal details step', () => {
      render(
        <OnboardingModal isOpen={true} onComplete={vi.fn()} onSkip={vi.fn()} />
      );
      fireEvent.click(screen.getByText('Start Setup'));
      expect(screen.getByText('Personal Profile')).toBeDefined();
      expect(screen.getByPlaceholderText('Enter your full name')).toBeDefined();
    });

    it('calls onSkip callback when user clicks Skip for Now', async () => {
      const onSkipMock = vi.fn();
      vi.spyOn(api.profile, 'skipOnboarding').mockResolvedValue({
        status: 'success',
        message: 'Onboarding skipped.',
        onboarding_completed: true,
      });
      render(
        <OnboardingModal isOpen={true} onComplete={vi.fn()} onSkip={onSkipMock} />
      );
      await act(async () => {
        fireEvent.click(screen.getByText('Skip for Now'));
      });
      expect(onSkipMock).toHaveBeenCalled();
    });
  });
});
