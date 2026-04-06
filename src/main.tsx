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
const isCapacitor = window.location.protocol === 'capacitor:';

if ('serviceWorker' in navigator && !isCapacitor) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: 'none' })
      .catch(() => {
        // ignore
      });
  });
}
