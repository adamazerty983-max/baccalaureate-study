import { ClerkProvider } from '@clerk/react';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ToastProvider } from './components/Toast.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider afterSignOutUrl="/">
      <ToastProvider>
        <App />
      </ToastProvider>
    </ClerkProvider>
  </StrictMode>,
);