import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, GraduationCap } from 'lucide-react';
import { api } from '../api/client';

interface StartupSplashProps {
  isDataReady: boolean;
  onFinished: () => void;
  loadError?: string | null;
  onRetry?: () => void;
}

export const StartupSplash: React.FC<StartupSplashProps> = ({
  isDataReady,
  onFinished,
  loadError,
  onRetry,
}) => {
  const [phase, setPhase] = useState<number>(0);
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState<boolean>(false);

  // Progressive messages during initialization
  const messages = [
    'Preparing your workspace...',
    'Organizing your semester...',
    'Aligning academic records...',
    'Workspace ready.',
  ];

  // Timing: Cycle messages smoothly every 500ms
  // Diagnostic mount log
  useEffect(() => {
    api.debug.log('STARTUP_SPLASH_MOUNT', 'Startup splash mounted', { isDataReady, loadError });
  }, []);

  // Timing: Cycle messages smoothly every 500ms
  useEffect(() => {
    const timer1 = setTimeout(() => setPhase(1), 500);
    const timer2 = setTimeout(() => setPhase(2), 1100);
    const timer3 = setTimeout(() => {
      setPhase(3);
      setMinTimeElapsed(true);
      api.debug.log('STARTUP_SPLASH_MIN_TIME_ELAPSED', '1.6s minimum splash animation elapsed');
    }, 1600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  // 1. When min animation time (1.6s) has elapsed AND actual data is ready, trigger fade-out
  useEffect(() => {
    if (minTimeElapsed && isDataReady && !loadError && !isClosing) {
      api.debug.log('STARTUP_SPLASH_BEGIN_FADE_OUT', 'Triggering 350ms fade-out transition', {
        minTimeElapsed,
        isDataReady,
      });
      setIsClosing(true);
    }
  }, [minTimeElapsed, isDataReady, loadError, isClosing]);

  // 2. Separate timer effect: after 350ms CSS fade-out finishes, invoke onFinished
  useEffect(() => {
    if (isClosing) {
      const closeTimer = setTimeout(() => {
        api.debug.log('STARTUP_SPLASH_COMPLETE', 'Invoking onFinished to unmount splash screen');
        onFinished();
      }, 350);
      return () => clearTimeout(closeTimer);
    }
  }, [isClosing, onFinished]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="CampusOS Startup"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-app text-txt-primary select-none transition-all duration-300 ease-out ${
        isClosing ? 'opacity-0 scale-[0.99] pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Background ambient radial glow */}
      <div className="absolute inset-0 bg-radial-gradient from-accent/5 via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center max-w-sm w-full px-6 text-center">
        {/* Brand Logo & Wordmark */}
        <div className="flex items-center space-x-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-accent text-white flex items-center justify-center shadow-sm">
            <GraduationCap className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-txt-primary">CampusOS</span>
        </div>

        {/* Academic Animation: Shuffling Notebooks */}
        <div className="w-32 h-28 relative flex items-center justify-center mb-8">
          {/* Bottom Notebook (Slate/Muted) */}
          <div
            className={`absolute w-24 h-18 rounded-lg bg-surface border border-border-default shadow-sm transition-all duration-500 ease-out ${
              phase >= 1 ? 'translate-y-2 -rotate-3 scale-95' : 'translate-y-0 rotate-0'
            }`}
          >
            <div className="w-3 h-full bg-border-subtle rounded-l-lg border-r border-border-default" />
          </div>

          {/* Middle Notebook (Elevated surface with accent ribbon) */}
          <div
            className={`absolute w-24 h-18 rounded-lg bg-surface-elevated border border-border-default shadow-sm transition-all duration-500 ease-out ${
              phase >= 2 ? 'translate-y-1 rotate-2 scale-98' : 'translate-y-0 rotate-0'
            }`}
          >
            <div className="w-3 h-full bg-accent/30 rounded-l-lg border-r border-border-default" />
            <div className="absolute top-0 right-4 w-2 h-5 bg-accent/60 rounded-b-sm" />
          </div>

          {/* Top Primary Notebook with animated shuffle and page flutter */}
          <div className="absolute w-24 h-18 rounded-lg bg-surface border border-accent/40 shadow-md flex overflow-hidden animate-notebook-shuffle">
            {/* Spine */}
            <div className="w-4 h-full bg-accent flex flex-col justify-between py-1.5 px-0.5 shrink-0">
              <div className="w-full h-0.5 bg-white/40 rounded-full" />
              <div className="w-full h-0.5 bg-white/40 rounded-full" />
            </div>

            {/* Ruled Cover with subtle pages & bookmark */}
            <div className="flex-1 p-2 flex flex-col justify-between relative bg-surface">
              <div className="space-y-1">
                <div className="h-1 bg-accent/40 rounded w-2/3" />
                <div className="h-0.5 bg-border-subtle rounded w-4/5" />
                <div className="h-0.5 bg-border-subtle rounded w-1/2" />
              </div>

              {/* Page edge simulation */}
              <div className="flex items-center justify-between pt-1 border-t border-border-subtle">
                <div className="flex space-x-0.5">
                  <div className="w-1 h-2 bg-border-default rounded-t-xs" />
                  <div className="w-1 h-2 bg-border-subtle rounded-t-xs" />
                </div>
                <div className="w-2.5 h-1 bg-accent/30 rounded" />
              </div>

              {/* Flutter corner */}
              <div className="absolute right-0 top-0 w-3 h-3 bg-surface-elevated border-b border-l border-border-default rounded-bl animate-page-flutter" />
            </div>
          </div>
        </div>

        {/* Dynamic Status Text & Progress */}
        {loadError ? (
          <div className="space-y-3 animate-fadeIn">
            <div className="flex items-center justify-center space-x-1.5 text-xs text-semantic-danger font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{loadError}</span>
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-semibold text-white bg-accent hover:bg-accent-hover rounded-xl shadow-sm transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Connection</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-medium text-txt-secondary h-5 transition-opacity duration-200">
              {messages[phase]}
            </p>

            {/* Subtle progress track */}
            <div className="w-48 h-1 bg-surface-elevated rounded-full overflow-hidden border border-border-subtle mx-auto">
              <div
                className="h-full bg-accent transition-all duration-500 ease-out"
                style={{ width: `${Math.min(((phase + 1) / messages.length) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
