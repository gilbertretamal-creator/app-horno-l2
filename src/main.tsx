import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { SpeedInsights } from '@vercel/speed-insights/react';
import { registerSW } from 'virtual:pwa-register'

// Logica básica para registrar el Service Worker y actualizar automáticamente
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('Nueva versión disponible. ¿Desea recargar para actualizar?')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.log('App lista para uso offline')
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <SpeedInsights />
  </StrictMode>,
)
