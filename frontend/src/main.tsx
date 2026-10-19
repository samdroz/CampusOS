import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { api, setApiBaseUrl } from './api/client';

export const FRONTEND_BUILD_ID = '2026.10.19-BUILD-V4-ONBOARDING-FIX';

if (typeof window !== 'undefined') {
  (window as any).__CAMPUSOS_BUILD_ID__ = FRONTEND_BUILD_ID;

  // Initial diagnostic startup log
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

// If running in desktop mode with Tauri, query backend sidecar URL
if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
  import('@tauri-apps/api/core')
    .then(({ invoke }) => invoke<string>('get_backend_url'))
    .then((url) => {
      if (url) {
        console.log('[CampusOS Desktop] Backend endpoint connected:', url);
        setApiBaseUrl(url);
      }
    })
    .catch((err) => {
      console.warn('[CampusOS Desktop] Backend endpoint discovery warning:', err);
    });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
