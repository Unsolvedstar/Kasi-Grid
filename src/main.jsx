import React, { lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import './styles.css'
import App from './App.jsx'
import { I18nProvider } from './i18n.jsx'

// /admin is the moderation page. It is not linked from the app and needs the server's ADMIN_TOKEN.
const Admin = lazy(() => import('./views/Admin.jsx'))
const isAdmin = window.location.pathname.startsWith('/admin')

createRoot(document.getElementById('root')).render(
  isAdmin ? (
    <Suspense fallback={null}><Admin /></Suspense>
  ) : (
    <I18nProvider>
      <App />
    </I18nProvider>
  ),
)

// Offline support. Only in production builds so it never interferes with hot reload.
if (!isAdmin && 'serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}
