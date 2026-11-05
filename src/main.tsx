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

// Global guard for lazy-chunk loading errors (e.g. after a new deployment replaces hashed chunks)
// Reloads at most ONCE per tab session per build ID. If already reloaded, dispatches a custom event
// so the UI presents the update/refresh banner instead of looping or leaving the user on a blank screen.
window.addEventListener('vite:preloadError', (event) => {
  const currentBuild = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev';
  const reloadKey = `mybac:preload-reload:${currentBuild}`;
  const alreadyReloaded = sessionStorage.getItem(reloadKey);

  if (!alreadyReloaded) {
    sessionStorage.setItem(reloadKey, 'true');
    window.location.reload();
  } else {
    console.error('Lazy chunk preload failed after initial reload:', event);
    window.dispatchEvent(new CustomEvent('mybac:chunk-preload-failed', { detail: event }));
  }
});

// Environment detection
const isDesktop = Boolean(window.electronAPI?.isElectron);

if (isDesktop) {
  // Purge any lingering service workers and browser caches in the Electron profile
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        reg.unregister().catch(() => {});
      }
    }).catch(() => {});
  }
  if ('caches' in window) {
    caches.keys().then((keys) => {
      for (const key of keys) {
        caches.delete(key).catch(() => {});
      }
    }).catch(() => {});
  }
} else if ('serviceWorker' in navigator) {
  // Allow service worker registration in production builds (import.meta.env.PROD),
  // enabling testing on localhost via `vite preview` while keeping it disabled on dev server.
  if (import.meta.env.PROD) {
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
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
);
