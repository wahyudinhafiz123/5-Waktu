import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register Service Worker for offline PWA support and background prayer reminders
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
        
        // Request Periodic Background Sync if available
        if ('periodicSync' in (registration as any)) {
          (registration as any).periodicSync.register('prayer-reminder', {
            minInterval: 1 * 60 * 1000, // min 1 minute
          }).catch((err: any) => {
            console.log('Periodic sync registration failed (expected if permissions not granted yet):', err);
          });
        }
      })
      .catch((err) => {
        console.error('ServiceWorker registration failed: ', err);
      });
  });
}

