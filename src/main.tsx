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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
);
