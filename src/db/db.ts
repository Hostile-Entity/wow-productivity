import { openDB, deleteDB, type IDBPDatabase, type DBSchema } from 'idb';
import type { Activity, LogEntry } from '../types';

interface GameDB extends DBSchema {
  activities: {
    key: string;
    value: Activity;
    indexes: { byCategory: string };
  };

  logEntries: {
    key: string;
    value: LogEntry;
    indexes: { byTimestamp: string };
  };
}

const DB_NAME = 'wow-productivity';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<GameDB>> | null = null;

function isSchemaError(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof Error && err.message === 'SCHEMA_MISMATCH') return true;
  if (err instanceof DOMException && err.name === 'NotFoundError') return true;
  return false;
}

function validateSchema(db: IDBPDatabase<GameDB>): boolean {
  // Check stores
  if (
    !db.objectStoreNames.contains('activities') ||
    !db.objectStoreNames.contains('logEntries')
  ) {
    return false;
  }

  // Check indexes (will throw if missing / wrong)
  try {
    const tx1 = db.transaction('activities', 'readonly');
    tx1.store.index('byCategory');
    // avoid unhandled promise rejection noise
    tx1.done.catch(() => {});

    const tx2 = db.transaction('logEntries', 'readonly');
    tx2.store.index('byTimestamp');
    tx2.done.catch(() => {});
  } catch {
    return false;
  }

  return true;
}

async function openOrInitDB(): Promise<IDBPDatabase<GameDB>> {
  const db = await openDB<GameDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('activities')) {
        const act = db.createObjectStore('activities', { keyPath: 'id' });
        act.createIndex('byCategory', 'category');
      }

      if (!db.objectStoreNames.contains('logEntries')) {
        const log = db.createObjectStore('logEntries', { keyPath: 'id' });
        log.createIndex('byTimestamp', 'timestamp');
      }
    },
  });

  if (!validateSchema(db)) {
    throw new Error('SCHEMA_MISMATCH');
  }

  return db;
}

async function initDBWithFallback(): Promise<IDBPDatabase<GameDB>> {
  try {
    return await openOrInitDB();
  } catch (err) {
    if (!isSchemaError(err) || typeof window === 'undefined') {
      throw err;
    }

    const reset = window.confirm(
      'Your local Wow Productivity data is using an old or incompatible format.\n\n' +
        'Do you want to reset it? This will delete all locally stored activities and logs.',
    );

    if (!reset) {
      throw err;
    }

    try {
      await deleteDB(DB_NAME);
    } catch (e) {
      console.error('Failed to delete old DB', e);
      throw err;
    }

    return openOrInitDB();
  }
}

// Public API

export function getDB() {
  if (!dbPromise) {
    dbPromise = initDBWithFallback();
  }
  return dbPromise;
}

export async function getAllActivities(): Promise<Activity[]> {
  const db = await getDB();
  return db.getAll('activities');
}

export async function putActivity(a: Activity) {
  const db = await getDB();
  await db.put('activities', a);
}

export async function deleteActivity(id: string) {
  const db = await getDB();
  await db.delete('activities', id);
}

export async function getAllLog(): Promise<LogEntry[]> {
  const db = await getDB();
  return db.getAllFromIndex('logEntries', 'byTimestamp');
}

export async function putLogEntry(e: LogEntry) {
  const db = await getDB();
  await db.put('logEntries', e);
}

export async function deleteLogEntry(id: string) {
  const db = await getDB();
  await db.delete('logEntries', id);
}

export async function clearAll() {
  const db = await getDB();
  await db.clear('activities');
  await db.clear('logEntries');
}
