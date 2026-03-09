import React from 'react'
import ReactDOM from 'react-dom/client'
import KenKen from './KenKen.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <KenKen />
  </React.StrictMode>
)

// Register service worker for offline/PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
