import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Offline cache for static assets only. Registration failure must never break the game.
if ('serviceWorker' in navigator) {
  try {
    registerSW({ immediate: true });
  } catch (err) {
    console.warn('Service worker registration failed', err);
  }
}
