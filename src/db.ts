// Simple IndexedDB layer (no external deps)

const DB_NAME = 'wow-productivity-db';
const DB_VERSION = 1;
const TX_STORE = 'transactions';
const META_STORE = 'meta';

export type Tx = { id?: number; ts: number; amount: number };

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(TX_STORE)) {
        db.createObjectStore(TX_STORE, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'key' });
      }
    };

    req.onsuccess = async () => {
      const db = req.result;
      // Ensure balance meta exists
      const tx = db.transaction(META_STORE, 'readwrite');
      const meta = tx.objectStore(META_STORE);
      const getReq = meta.get('balance');
      getReq.onsuccess = () => {
        if (!getReq.result) {
          meta.put({ key: 'balance', value: 0 });
        }
      };
      tx.oncomplete = () => resolve(db);
      tx.onerror = () => reject(tx.error);
    };

    req.onerror = () => reject(req.error);
  });
}

export async function getBalance(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, 'readonly');
    const store = tx.objectStore(META_STORE);
    const req = store.get('balance');
    req.onsuccess = () => resolve(req.result?.value ?? 0);
    req.onerror = () => reject(req.error);
  });
}

export async function addAmount(amount: number): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([TX_STORE, META_STORE], 'readwrite');
    const txStore = tx.objectStore(TX_STORE);
    const metaStore = tx.objectStore(META_STORE);

    const now = Date.now();
    txStore.add({ ts: now, amount });

    const getBal = metaStore.get('balance');
    getBal.onsuccess = () => {
      const current = (getBal.result?.value ?? 0) as number;
      const next = current + amount;
      metaStore.put({ key: 'balance', value: next });
    };

    tx.oncomplete = async () => {
      // read back final balance
      const tx2 = db.transaction(META_STORE, 'readonly');
      const store2 = tx2.objectStore(META_STORE);
      const r = store2.get('balance');
      r.onsuccess = () => resolve(r.result?.value ?? 0);
      r.onerror = () => reject(r.error);
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllTransactions(): Promise<Tx[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TX_STORE, 'readonly');
    const store = tx.objectStore(TX_STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as Tx[]);
    req.onerror = () => reject(req.error);
  });
}

export async function resetAll(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([TX_STORE, META_STORE], 'readwrite');
    tx.objectStore(TX_STORE).clear();
    tx.objectStore(META_STORE).put({ key: 'balance', value: 0 });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}