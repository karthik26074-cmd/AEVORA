import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Global API interceptor:
// When running in production on Firebase Hosting (*.web.app or *.firebaseapp.com),
// route all /api calls to the deployed cloud backend on Render.
const RENDER_BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'https://aevora-l23m.onrender.com').replace(/\/$/, '');
if (
  typeof window !== 'undefined' &&
  (window.location.hostname.includes('web.app') || window.location.hostname.includes('firebaseapp.com'))
) {
  const originalFetch = window.fetch;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string' && input.startsWith('/api')) {
      input = `${RENDER_BACKEND_URL}${input}`;
    } else if (input instanceof URL && input.pathname.startsWith('/api')) {
      input = new URL(`${RENDER_BACKEND_URL}${input.pathname}${input.search}`);
    } else if (typeof Request !== 'undefined' && input instanceof Request && input.url.startsWith('/api')) {
      input = new Request(`${RENDER_BACKEND_URL}${input.url}`, input);
    }
    return originalFetch(input, init);
  };
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
