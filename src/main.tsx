import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ToastProvider } from './components/shared/Toast.tsx';
import './index.css';
// Optional skins / cursor layers — loaded after Tailwind so they can override it
import './styles/mybac.css';
import './styles/planner-cursor.css';

// Apply the single supported appearance before React mounts to prevent a light-mode flash.
document.documentElement.classList.add('dark');
document.documentElement.dataset.uiStyle = 'mybac';
document.documentElement.style.colorScheme = 'dark';

// The website uses the service worker for PWA/offline behavior. Tauri bundles its
// frontend in a native WebView and doesn't need the website-origin service worker.
if (
  !('__TAURI_INTERNALS__' in window) &&
  'serviceWorker' in navigator &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1'
) {
  const swUrl = window.location.pathname.startsWith('/baccalaureate-study')
    ? '/baccalaureate-study/sw.js'
    : '/sw.js';
  const swScope = window.location.pathname.startsWith('/baccalaureate-study')
    ? '/baccalaureate-study/'
    : '/';
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(swUrl, { scope: swScope }).catch(() => undefined);
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
);
