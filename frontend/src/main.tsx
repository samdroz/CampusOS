import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { api, setApiBaseUrl } from './api/client';

export const FRONTEND_BUILD_ID = '2026.10.19-BUILD-V4-ONBOARDING-FIX';

if (typeof window !== 'undefined') {
  (window as any).__CAMPUSOS_BUILD_ID__ = FRONTEND_BUILD_ID;
}

// Discover backend URL before initial mount when running in Tauri desktop environment
async function bootstrap() {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const url = await invoke<string>('get_backend_url');
      if (url) {
        console.log('[CampusOS Desktop] Backend endpoint connected:', url);
        setApiBaseUrl(url);
      }
    } catch (err) {
      console.warn('[CampusOS Desktop] Backend endpoint discovery warning:', err);
    }
  }

  // Diagnostic startup log (after backend URL is discovered and configured)
  if (typeof window !== 'undefined') {
    try {
      api.debug.log('FRONTEND_MOUNT', 'CampusOS frontend mounted in browser', {
        build_id: FRONTEND_BUILD_ID,
        url: window.location.href,
        origin: window.location.origin,
        session_started: sessionStorage.getItem('campusos_session_started'),
        theme_saved: localStorage.getItem('campusos_theme'),
        user_agent: navigator.userAgent,
      });
    } catch {}
  }

  const container = document.getElementById('root');
  if (container) {
    createRoot(container).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  }
}

bootstrap();
