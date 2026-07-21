import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { registerServiceWorker } from './utils/registerServiceWorker';

// Register the service worker for push notifications (issue #119).
// Fire-and-forget — registering is idempotent and the helper resolves to
// `null` on unsupported environments/older browsers.
void registerServiceWorker();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
