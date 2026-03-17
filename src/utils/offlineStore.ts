import { supabase } from '../lib/supabaseClient';

// Use a simplified type since we don't have full Database types generated
type InspeccionInsert = Record<string, any>;

const OFFLINE_QUEUE_KEY = 'offline_inspections_queue';

// Guaranteed array retrieval
export function getOfflineInspections(): InspeccionInsert[] {
  try {
    const data = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('Error parsing offline queue:', err);
    return [];
  }
}

// Add an inspection to the end of the queue
export function addOfflineInspection(inspeccion: InspeccionInsert): void {
  const queue = getOfflineInspections();
  queue.push(inspeccion);
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

// Clears the queue, optionally filtering out items (if we only want to clear specific ones in a future update)
export function clearOfflineQueue(): void {
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
}

// Sync the entire queue to Supabase
export async function syncOfflineInspections(): Promise<{ success: number; failed: number }> {
  const queue = getOfflineInspections();
  if (queue.length === 0) return { success: 0, failed: 0 };

  console.log(`Intentando sincronizar ${queue.length} inspecciones pendientes...`);
  
  let successCount = 0;
  let failedCount = 0;
  const remainingQueue: InspeccionInsert[] = [];

  for (const item of queue) {
    try {
      const { error } = await supabase.from('Inspecciones').insert([item]);
      if (error) {
        console.error('Error sincronizando registro offline:', error);
        failedCount++;
        remainingQueue.push(item); // Keep it in the queue for the next sync attempt
      } else {
        successCount++;
      }
    } catch (e) {
      console.error('Excepción sincronizando registro:', e);
      failedCount++;
      remainingQueue.push(item);
    }
  }

  // Update the queue with only the failed items, if any
  if (remainingQueue.length > 0) {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remainingQueue));
  } else {
    clearOfflineQueue();
  }

  return { success: successCount, failed: failedCount };
}
