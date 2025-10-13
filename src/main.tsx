import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n'
import { setupNativePushListeners } from './utils/setupNativePushListeners'

// Setup native push notification listeners
setupNativePushListeners();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
