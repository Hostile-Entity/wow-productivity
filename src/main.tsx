import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { GameProvider } from './state/GameStore';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <GameProvider>
      <App />
    </GameProvider>
  </React.StrictMode>,
);

// Simple SW registration
if (
  'serviceWorker' in navigator &&
  window.location.protocol !== 'capacitor:'
) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // ignore
    });
  });
}
