import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  ShieldCheck,
  User,
  BookOpen,
  Calendar,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Sparkles,
  Layers,
  FileText,
} from 'lucide-react';
import {
  StudentProfile,
  OnboardingSubjectInput,
  OnboardingExamInput,
  OnboardingAssignmentInput,
  OnboardingScheduleInput,
  OnboardingPayload,
} from '../types';
import { api } from '../api/client';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (studentName: string) => void;
  onSkip: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onComplete,
  onSkip,
}) => {
  const [step, setStep] = useState<number>(0);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [profile, setProfile] = useState<StudentProfile>({
    full_name: '',
    preferred_name: '',
    roll_number: '',
    register_number: '',
    email: '',
    institution: '',
    degree: '',
    department: '',
    admission_year: '',
    academic_year: '',
    semester: '',
    university: '',
    attendance_target: 75.0,
    onboarding_completed: false,
  });

  // Subjects - start empty, student configures their own
  const [subjects, setSubjects] = useState<OnboardingSubjectInput[]>([]);
  const [newSubName, setNewSubName] = useState('');
  const [newSubCode, setNewSubCode] = useState('');
  const [newSubCredits, setNewSubCredits] = useState('3');
  const [newSubInstructor, setNewSubInstructor] = useState('');

  // Initial Assessment / Exam
  const [examTitle, setExamTitle] = useState('');
  const [examSubjectCode, setExamSubjectCode] = useState('');
  const [examDate, setExamDate] = useState('');
  const [examTime, setExamTime] = useState('10:00');

  // Initial Assignment
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignmentSubjectCode, setAssignmentSubjectCode] = useState('');
  const [assignmentDueDate, setAssignmentDueDate] = useState('');

  // Diagnostic visibility logging
  useEffect(() => {
    if (isOpen) {
      api.debug.log('ONBOARDING_MODAL_RENDERED', 'OnboardingModal is actively rendered and visible in DOM', {
        step,
        isOpen,
      });
    }
  }, [isOpen, step]);

  if (!isOpen) return null;

  const handleAddSubject = () => {
    if (!newSubName.trim() || !newSubCode.trim()) return;
    const colors = ['#6366F1', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#3B82F6'];
    const chosenColor = colors[subjects.length % colors.length];
    setSubjects([
      ...subjects,
      {
        name: newSubName.trim(),
        code: newSubCode.trim().toUpperCase(),
        credits: parseInt(newSubCredits) || 3,
        instructor: newSubInstructor.trim() || undefined,
        color: chosenColor,
      },
    ]);
    setNewSubName('');
    setNewSubCode('');
    setNewSubCredits('3');
    setNewSubInstructor('');
  };

  const handleRemoveSubject = (index: number) => {
    setSubjects(subjects.filter((_, i) => i !== index));
  };

  const handleSkip = async () => {
    try {
      setSaving(true);
      api.debug.log('ONBOARDING_MODAL_SKIP_REQUEST', 'Sending skip-onboarding request to backend');
      await api.profile.skipOnboarding();
      onSkip();
    } catch (e: any) {
      console.error('Failed to skip onboarding:', e);
      api.debug.log('ONBOARDING_MODAL_SKIP_ERROR', e?.message || 'Failed to skip onboarding');
      onSkip();
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = async () => {
    try {
      setSaving(true);
      setError(null);

      api.debug.log('ONBOARDING_MODAL_FINISH_REQUEST', 'Submitting completed onboarding payload', {
        student_name: profile.full_name,
        subjects_count: subjects.length,
      });

      const examsPayload: OnboardingExamInput[] = [];
      if (examTitle.trim() && examDate.trim() && examSubjectCode.trim()) {
        examsPayload.push({
          title: examTitle.trim(),
          subject_code: examSubjectCode.trim().toUpperCase(),
          exam_date: examDate,
          start_time: examTime || '10:00',
        });
      }

      const assignmentsPayload: OnboardingAssignmentInput[] = [];
      if (assignmentTitle.trim() && assignmentDueDate.trim() && assignmentSubjectCode.trim()) {
        assignmentsPayload.push({
          title: assignmentTitle.trim(),
          subject_code: assignmentSubjectCode.trim().toUpperCase(),
          due_date: assignmentDueDate,
          priority: 'medium',
        });
      }

      const payload: OnboardingPayload = {
        profile: {
          ...profile,
          full_name: profile.full_name.trim() || 'Student',
          onboarding_completed: true,
        },
        subjects,
        exams: examsPayload,
        assignments: assignmentsPayload,
        sessions: [],
      };

      await api.profile.completeOnboarding(payload);
      const studentName = profile.preferred_name?.trim() || profile.full_name.trim() || 'Student';
      onComplete(studentName);
    } catch (err: any) {
      api.debug.log('ONBOARDING_MODAL_FINISH_ERROR', err?.message || 'Failed to submit onboarding');
      setError(err.message || 'Failed to complete setup. Please verify your details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to CampusOS"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
    >
      <div className="w-full max-w-2xl bg-white dark:bg-[#111726] border border-border-default rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Progress Header */}
        <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between bg-surface-elevated">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-sm shadow-sm">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-txt-primary">
                CampusOS Setup
              </h2>
              <p className="text-xs text-txt-secondary">
                {step === 0 && 'Welcome to CampusOS'}
                {step === 1 && 'Step 1 of 4: Personal Profile'}
                {step === 2 && 'Step 2 of 4: Academic Profile'}
                {step === 3 && 'Step 3 of 4: Academic Setup'}
                {step === 4 && 'Step 4 of 4: Review & Finish'}
              </p>
            </div>
          </div>

          {step > 0 && (
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`w-6 h-1.5 rounded-full transition-all duration-300 ${
                    step >= i ? 'bg-accent' : 'bg-border-subtle'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-white dark:bg-[#111726]">
          {error && (
            <div className="mb-4 p-3 bg-semantic-danger/10 border border-semantic-danger/30 rounded-xl text-xs text-semantic-danger">
              {error}
            </div>
          )}

          {/* STEP 0: Welcome Screen */}
          {step === 0 && (
            <div className="text-center py-4 space-y-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-accent-subtle border border-accent/20 flex items-center justify-center text-accent shadow-sm">
                <Sparkles className="w-8 h-8" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-txt-primary tracking-tight">
                  Welcome to CampusOS
                </h1>
                <p className="mt-2 text-sm text-txt-secondary max-w-md mx-auto leading-relaxed">
                  Your academic life, organized in one place. Your data stays on your device.
                </p>
              </div>

              {/* Privacy Banner */}
              <div className="p-4 rounded-xl bg-surface-elevated border border-border-subtle text-left flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-semantic-success shrink-0 mt-0.5" />
                <div className="text-xs text-txt-secondary leading-relaxed">
                  <span className="font-semibold text-txt-primary block mb-0.5">
                    Offline & Strictly Local Privacy
                  </span>
                  CampusOS stores all personal records, subjects, timetable, and notes directly on your computer in an offline SQLite database. No external cloud databases, no tracking, and no internet required for normal use.
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    api.debug.log('ONBOARDING_START_CLICKED', 'Student clicked Start Setup');
                    setStep(1);
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  Start Setup <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={saving}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-border-default text-txt-primary hover:bg-surface-elevated text-sm font-medium transition-colors"
                >
                  Skip for Now
                </button>
              </div>
            </div>
          )}

          {/* STEP 1: Personal Profile */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-5 h-5 text-accent" />
                <h3 className="text-base font-semibold text-txt-primary">
                  Personal Profile
                </h3>
              </div>
              <p className="text-xs text-txt-secondary">
                Only your name is required. Sensitive information like passwords, addresses, or phone numbers are never collected.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-txt-secondary mb-1">
                    Full Name <span className="text-semantic-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    placeholder="Enter your full name"
                    className="w-full px-3.5 py-2 rounded-xl border border-border-default bg-input text-txt-primary text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-txt-secondary mb-1">
                    Preferred Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={profile.preferred_name || ''}
                    onChange={(e) => setProfile({ ...profile, preferred_name: e.target.value })}
                    placeholder="Nickname or preferred name"
                    className="w-full px-3.5 py-2 rounded-xl border border-border-default bg-input text-txt-primary text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-txt-secondary mb-1">
                    Student Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={profile.email || ''}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    placeholder="student@institution.edu"
                    className="w-full px-3.5 py-2 rounded-xl border border-border-default bg-input text-txt-primary text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-txt-secondary mb-1">
                    Roll Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={profile.roll_number || ''}
                    onChange={(e) => setProfile({ ...profile, roll_number: e.target.value })}
                    placeholder="e.g. 21CS042"
                    className="w-full px-3.5 py-2 rounded-xl border border-border-default bg-input text-txt-primary text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-txt-secondary mb-1">
                    Register Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={profile.register_number || ''}
                    onChange={(e) => setProfile({ ...profile, register_number: e.target.value })}
                    placeholder="e.g. 910021104042"
                    className="w-full px-3.5 py-2 rounded-xl border border-border-default bg-input text-txt-primary text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Academic Profile */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap className="w-5 h-5 text-accent" />
                <h3 className="text-base font-semibold text-txt-primary">
                  Academic Profile
                </h3>
              </div>
              <p className="text-xs text-txt-secondary">
                Enter your institution and degree manually. There are no restrictive hardcoded lists.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-txt-secondary mb-1">
                    College or Institution Name
                  </label>
                  <input
                    type="text"
                    value={profile.institution || ''}
                    onChange={(e) => setProfile({ ...profile, institution: e.target.value })}
                    placeholder="e.g. National Institute of Technology"
                    className="w-full px-3.5 py-2 rounded-xl border border-border-default bg-input text-txt-primary text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-txt-secondary mb-1">
                    Degree or Programme
                  </label>
                  <input
                    type="text"
                    value={profile.degree || ''}
                    onChange={(e) => setProfile({ ...profile, degree: e.target.value })}
                    placeholder="e.g. B.Tech / B.E. / B.Sc"
                    className="w-full px-3.5 py-2 rounded-xl border border-border-default bg-input text-txt-primary text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-txt-secondary mb-1">
                    Department or Branch
                  </label>
                  <input
                    type="text"
                    value={profile.department || ''}
                    onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                    placeholder="e.g. Computer Science & Engineering"
                    className="w-full px-3.5 py-2 rounded-xl border border-border-default bg-input text-txt-primary text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-txt-secondary mb-1">
                    Current Semester
                  </label>
                  <input
                    type="text"
                    value={profile.semester || ''}
                    onChange={(e) => setProfile({ ...profile, semester: e.target.value })}
                    placeholder="e.g. Semester 5"
                    className="w-full px-3.5 py-2 rounded-xl border border-border-default bg-input text-txt-primary text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-txt-secondary mb-1">
                    Admission Year (Optional)
                  </label>
                  <input
                    type="text"
                    value={profile.admission_year || ''}
                    onChange={(e) => setProfile({ ...profile, admission_year: e.target.value })}
                    placeholder="e.g. 2023"
                    className="w-full px-3.5 py-2 rounded-xl border border-border-default bg-input text-txt-primary text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-txt-secondary mb-1">
                    Academic Year
                  </label>
                  <input
                    type="text"
                    value={profile.academic_year || ''}
                    onChange={(e) => setProfile({ ...profile, academic_year: e.target.value })}
                    placeholder="e.g. 2024–2025"
                    className="w-full px-3.5 py-2 rounded-xl border border-border-default bg-input text-txt-primary text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-txt-secondary mb-1">
                    University / Affiliated Body (Optional)
                  </label>
                  <input
                    type="text"
                    value={profile.university || ''}
                    onChange={(e) => setProfile({ ...profile, university: e.target.value })}
                    placeholder="e.g. Anna University / APJ Abdul Kalam Technological University"
                    className="w-full px-3.5 py-2 rounded-xl border border-border-default bg-input text-txt-primary text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Academic Setup */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-accent" />
                <h3 className="text-base font-semibold text-txt-primary">
                  Academic Setup
                </h3>
              </div>
              <p className="text-xs text-txt-secondary">
                Add initial subjects or an upcoming assessment now. You can always configure or modify all of this inside the application later.
              </p>

              {/* Attendance Target */}
              <div className="p-4 rounded-xl bg-surface-elevated border border-border-subtle">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-txt-primary">
                    Minimum Attendance Target
                  </label>
                  <span className="text-xs font-bold text-accent">
                    {profile.attendance_target}%
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="1"
                  value={profile.attendance_target}
                  onChange={(e) =>
                    setProfile({ ...profile, attendance_target: parseFloat(e.target.value) })
                  }
                  className="w-full accent-accent"
                />
              </div>

              {/* Subjects List */}
              <div>
                <label className="block text-xs font-semibold text-txt-primary mb-2">
                  Enrolled Subjects ({subjects.length})
                </label>
                <div className="space-y-2 mb-3 max-h-36 overflow-y-auto pr-1">
                  {subjects.map((sub, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-border-subtle bg-surface text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: sub.color }}
                        />
                        <span className="font-semibold text-txt-primary">
                          {sub.code}
                        </span>
                        <span className="text-txt-secondary truncate max-w-xs">
                          {sub.name}
                        </span>
                        <span className="text-txt-muted">({sub.credits} cr)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubject(idx)}
                        className="text-txt-muted hover:text-semantic-danger transition-colors p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add subject quick form */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    value={newSubName}
                    onChange={(e) => setNewSubName(e.target.value)}
                    placeholder="Subject Name"
                    className="sm:col-span-2 px-3 py-1.5 rounded-lg border border-border-default bg-input text-xs text-txt-primary"
                  />
                  <input
                    type="text"
                    value={newSubCode}
                    onChange={(e) => setNewSubCode(e.target.value)}
                    placeholder="Code (e.g. CS303)"
                    className="px-3 py-1.5 rounded-lg border border-border-default bg-input text-xs text-txt-primary uppercase"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubject}
                    className="px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white font-medium text-xs flex items-center justify-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
              </div>

              {/* Optional Upcoming Assessment */}
              <div className="pt-2 border-t border-border-subtle">
                <label className="block text-xs font-semibold text-txt-primary mb-1">
                  Add Upcoming Assessment / Exam (Optional)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={examTitle}
                    onChange={(e) => setExamTitle(e.target.value)}
                    placeholder="Exam Title (e.g. Midterm 1)"
                    className="px-3 py-1.5 rounded-lg border border-border-default bg-input text-xs text-txt-primary"
                  />
                  <select
                    value={examSubjectCode}
                    onChange={(e) => setExamSubjectCode(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-border-default bg-input text-xs text-txt-primary"
                  >
                    <option value="">Select Subject</option>
                    {subjects.map((s, idx) => (
                      <option key={idx} value={s.code}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-border-default bg-input text-xs text-txt-primary"
                  />
                </div>
              </div>

              {/* Optional Upcoming Assignment Deadline */}
              <div className="pt-2 border-t border-border-subtle">
                <label className="block text-xs font-semibold text-txt-primary mb-1">
                  Add Upcoming Assignment Deadline (Optional)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={assignmentTitle}
                    onChange={(e) => setAssignmentTitle(e.target.value)}
                    placeholder="Assignment Title (e.g. Lab Report 1)"
                    className="px-3 py-1.5 rounded-lg border border-border-default bg-input text-xs text-txt-primary"
                  />
                  <select
                    value={assignmentSubjectCode}
                    onChange={(e) => setAssignmentSubjectCode(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-border-default bg-input text-xs text-txt-primary"
                  >
                    <option value="">Select Subject</option>
                    {subjects.map((s, idx) => (
                      <option key={idx} value={s.code}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={assignmentDueDate}
                    onChange={(e) => setAssignmentDueDate(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-border-default bg-input text-xs text-txt-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Review and Finish */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-semantic-success" />
                <h3 className="text-base font-semibold text-txt-primary">
                  Review & Confirm Setup
                </h3>
              </div>
              <p className="text-xs text-txt-secondary">
                Here is a summary of your local profile. You can edit any details at any time in Settings.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Personal Card */}
                <div className="p-3.5 rounded-xl border border-border-subtle bg-surface-elevated space-y-1.5">
                  <span className="font-semibold text-txt-primary block border-b border-border-subtle pb-1">
                    Student Details
                  </span>
                  <div>
                    <span className="text-txt-secondary">Name: </span>
                    <span className="font-medium text-txt-primary">
                      {profile.full_name || 'Student'}
                    </span>
                  </div>
                  {profile.preferred_name && (
                    <div>
                      <span className="text-txt-secondary">Preferred: </span>
                      <span className="font-medium text-txt-primary">
                        {profile.preferred_name}
                      </span>
                    </div>
                  )}
                  {profile.roll_number && (
                    <div>
                      <span className="text-txt-secondary">Roll No: </span>
                      <span className="font-medium text-txt-primary font-mono">
                        {profile.roll_number}
                      </span>
                    </div>
                  )}
                </div>

                {/* Academic Card */}
                <div className="p-3.5 rounded-xl border border-border-subtle bg-surface-elevated space-y-1.5">
                  <span className="font-semibold text-txt-primary block border-b border-border-subtle pb-1">
                    Academic Details
                  </span>
                  <div>
                    <span className="text-txt-secondary">Institution: </span>
                    <span className="font-medium text-txt-primary">
                      {profile.institution || 'Configured in app'}
                    </span>
                  </div>
                  <div>
                    <span className="text-txt-secondary">Programme: </span>
                    <span className="font-medium text-txt-primary">
                      {profile.degree} {profile.department ? `· ${profile.department}` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-txt-secondary">Target: </span>
                    <span className="font-medium text-accent">
                      {profile.attendance_target}% Attendance
                    </span>
                  </div>
                </div>
              </div>

              {/* Subjects Summary */}
              <div className="p-3.5 rounded-xl border border-border-subtle bg-surface-elevated text-xs">
                <span className="font-semibold text-txt-primary block mb-2">
                  Enrolled Subjects ({subjects.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {subjects.map((s, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-surface border border-border-default text-txt-primary font-medium"
                    >
                      {s.code}: {s.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        {step > 0 && (
          <div className="px-6 py-4 border-t border-border-subtle flex items-center justify-between bg-surface-elevated">
            <button
              type="button"
              onClick={() => {
                api.debug.log('ONBOARDING_BACK_CLICKED', `Going back from step ${step} to ${step - 1}`);
                setStep(step - 1);
              }}
              disabled={saving}
              className="px-4 py-2 rounded-xl border border-border-default text-txt-primary hover:bg-surface text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1 && !profile.full_name.trim()) {
                    setError('Full name is required to complete profile setup.');
                    return;
                  }
                  setError(null);
                  api.debug.log('ONBOARDING_CONTINUE_CLICKED', `Continuing from step ${step} to ${step + 1}`);
                  setStep(step + 1);
                }}
                className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white font-medium text-xs flex items-center gap-1.5 shadow-sm transition-colors"
              >
                Continue <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                disabled={saving}
                className="px-6 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white font-medium text-xs flex items-center gap-2 shadow-sm transition-colors"
              >
                {saving ? (
                  'Saving...'
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Launch CampusOS
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
