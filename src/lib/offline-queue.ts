// Minimal IndexedDB queue for offline checklist + photo submissions.
// Properties are often in basements, dense buildings, or dead zones —
// this is not an edge case, it's the normal case for this app.

const DB_NAME = 'cleanworks-offline';
const DB_VERSION = 1;
const STORE = 'pending-actions';

export interface PendingAction {
  id: string;               // crypto.randomUUID()
  type: 'checklist-toggle' | 'photo-upload' | 'job-note';
  jobId: string;
  payload: Record<string, unknown>;
  createdAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function queueAction(action: Omit<PendingAction, 'id' | 'createdAt'>) {
  const db = await openDb();
  const full: PendingAction = { ...action, id: crypto.randomUUID(), createdAt: Date.now() };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(full);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return full;
}

export async function getPendingActions(): Promise<PendingAction[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as PendingAction[]);
    req.onerror = () => reject(req.error);
  });
}

export async function clearAction(id: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Call this on 'online' events and on app load. Each action type knows how
// to replay itself against Supabase once connectivity returns.
export async function flushQueue(
  handlers: Record<PendingAction['type'], (action: PendingAction) => Promise<void>>
) {
  const pending = await getPendingActions();
  for (const action of pending) {
    try {
      await handlers[action.type](action);
      await clearAction(action.id);
    } catch (e) {
      // Leave it queued — will retry on the next flush
      console.error('Failed to sync action, will retry later:', action, e);
    }
  }
}
