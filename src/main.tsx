import * as Sentry from '@sentry/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { SpeedInsights } from '@vercel/speed-insights/react';
import { registerSW } from 'virtual:pwa-register'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,  // React Query handles wake-up natively
      refetchOnReconnect: true,
      retry: 2,
      staleTime: 1000 * 60,        // 1 minute – prevents burst on focus
      gcTime: 1000 * 60 * 5,       // 5 minutes – keep cache warm in memory
    }
  }
});

// ===== SENTRY – inicializar ANTES del render del árbol React =====
Sentry.init({
  dsn: 'https://06e6f6945977d5ae3cc1db5feb3f8183@o4511057407246336.ingest.us.sentry.io/4511057423368192',
  // Captura el 100% de las transacciones de rendimiento
  tracesSampleRate: 1.0,
  // Captura el 100% de sesiones donde ocurre un error
  replaysOnErrorSampleRate: 1.0,
  // Integración Session Replay (solo cuando hay error)
  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  // No enviar errores en desarrollo local
  enabled: import.meta.env.PROD,
});

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

// ===== Fallback UI cuando un componente falla =====
function CriticalErrorFallback() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#fef2f2',
      fontFamily: 'Inter, system-ui, sans-serif',
      padding: '2rem',
      textAlign: 'center',
    }}>
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1.5rem' }}>
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#991b1b', marginBottom: '0.75rem' }}>
        Error crítico detectado en el sistema
      </h1>
      <p style={{ fontSize: '1rem', color: '#6b7280', maxWidth: '480px', marginBottom: '0.5rem' }}>
        El equipo de HCE ha sido notificado automáticamente.
      </p>
      <p style={{ fontSize: '0.875rem', color: '#9ca3af', maxWidth: '480px', marginBottom: '2rem' }}>
        Puede intentar recargar la página. Si el problema persiste, contacte a soporte técnico.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          padding: '0.75rem 2rem',
          background: '#dc2626',
          color: 'white',
          border: 'none',
          borderRadius: '0.5rem',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(220,38,38,0.3)',
        }}
      >
        🔄 Recargar aplicación
      </button>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<CriticalErrorFallback />} showDialog={false}>
      <QueryClientProvider client={queryClient}>
        <App />
        <SpeedInsights />
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
