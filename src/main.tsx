// Guard against libraries trying to overwrite window.fetch if it's read-only
try {
  const originalFetch = window.fetch;
  Object.defineProperty(window, 'fetch', {
    get: () => originalFetch,
    set: () => { /* Prevent overwriting */ },
    configurable: false
  });
} catch (e) {
  // Ignore if already non-configurable
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
