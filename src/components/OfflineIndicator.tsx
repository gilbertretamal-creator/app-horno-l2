import { useEffect, useState } from 'react';
import { getOfflineInspections } from '../utils/offlineStore';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  const updateStatus = () => {
    setIsOnline(navigator.onLine);
    setPendingCount(getOfflineInspections().length);
  };

  useEffect(() => {
    // Initial check
    updateStatus();

    // Listen to network changes
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    // Custom event to force an update from other components when they save offline
    const handleLocalSave = () => {
      setPendingCount(getOfflineInspections().length);
    };
    window.addEventListener('offline-save', handleLocalSave);
    window.addEventListener('offline-sync-complete', handleLocalSave);

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
      window.removeEventListener('offline-save', handleLocalSave);
      window.removeEventListener('offline-sync-complete', handleLocalSave);
    };
  }, []);

  if (isOnline && pendingCount === 0) {
    return null; // Don't show anything if everything is normal and synced
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {!isOnline && (
        <div className="bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium animate-pulse">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
          </svg>
          Sin conexión a Internet
        </div>
      )}
      
      {pendingCount > 0 && (
        <div className="bg-orange-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          {pendingCount} {pendingCount === 1 ? 'inspección pendiente' : 'inspecciones pendientes'} de sincronizar
        </div>
      )}
    </div>
  );
}
