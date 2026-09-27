import { Song, Setlist } from '../types';

const DB_NAME = 'melobook_offline_db';
const DB_VERSION = 1;

const STORES = {
  SONGS: 'songs',
  SETLISTS: 'setlists',
  OFFLINE_QUEUE: 'offline_queue',
  META: 'meta'
} as const;

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Initialise et retourne une instance ouverte de la base de données IndexedDB Melobook.
 */
export function openIndexedDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.reject(new Error('IndexedDB non supporté sur ce navigateur'));
  }

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 1. Store pour les chants
        if (!db.objectStoreNames.contains(STORES.SONGS)) {
          const songStore = db.createObjectStore(STORES.SONGS, { keyPath: 'id' });
          songStore.createIndex('title', 'title', { unique: false });
          songStore.createIndex('artist', 'artist', { unique: false });
          songStore.createIndex('groupId', 'groupId', { unique: false });
          songStore.createIndex('key', 'key', { unique: false });
          songStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // 2. Store pour les setlists
        if (!db.objectStoreNames.contains(STORES.SETLISTS)) {
          const setlistStore = db.createObjectStore(STORES.SETLISTS, { keyPath: 'id' });
          setlistStore.createIndex('name', 'name', { unique: false });
          setlistStore.createIndex('groupId', 'groupId', { unique: false });
        }

        // 3. Store pour la file d'attente hors-ligne (modifications locales à synchroniser)
        if (!db.objectStoreNames.contains(STORES.OFFLINE_QUEUE)) {
          const queueStore = db.createObjectStore(STORES.OFFLINE_QUEUE, { keyPath: 'id' });
          queueStore.createIndex('timestamp', 'timestamp', { unique: false });
          queueStore.createIndex('entityType', 'entityType', { unique: false });
        }

        // 4. Store pour les métadonnées (dernière synchro, flags)
        if (!db.objectStoreNames.contains(STORES.META)) {
          db.createObjectStore(STORES.META, { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Gestion de la fermeture ou du changement de version inopiné
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };

        resolve(db);
      };

      request.onerror = (event) => {
        dbPromise = null;
        reject((event.target as IDBOpenDBRequest).error);
      };

      request.onblocked = () => {
        console.warn('Ouverture IndexedDB bloquée par une autre connexion ouverte.');
      };
    } catch (err) {
      dbPromise = null;
      reject(err);
    }
  });

  return dbPromise;
}

/**
 * Enregistre un chant dans IndexedDB pour consultation hors-ligne immédiate.
 */
export async function saveSongToIndexedDB(song: Song): Promise<void> {
  if (!song || !song.id) return;
  const db = await openIndexedDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.SONGS, STORES.META], 'readwrite');
    const songStore = transaction.objectStore(STORES.SONGS);
    const metaStore = transaction.objectStore(STORES.META);

    songStore.put(song);
    metaStore.put({ key: 'last_cache_update', timestamp: new Date().toISOString() });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

/**
 * Enregistre une collection complète de chants en lot (transaction atomique haute performance).
 */
export async function saveSongsToIndexedDB(songs: Song[]): Promise<void> {
  if (!Array.isArray(songs) || songs.length === 0) return;
  const db = await openIndexedDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.SONGS, STORES.META], 'readwrite');
    const songStore = transaction.objectStore(STORES.SONGS);
    const metaStore = transaction.objectStore(STORES.META);

    for (const song of songs) {
      if (song && song.id) {
        songStore.put(song);
      }
    }

    metaStore.put({
      key: 'last_cache_update',
      timestamp: new Date().toISOString(),
      songCount: songs.length
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

/**
 * Récupère un chant spécifique depuis IndexedDB.
 */
export async function getSongFromIndexedDB(id: string): Promise<Song | null> {
  if (!id) return null;
  const db = await openIndexedDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.SONGS], 'readonly');
    const store = transaction.objectStore(STORES.SONGS);
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result || null);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Récupère tous les chants stockés dans IndexedDB.
 * Filtre optionnellement par identifiant de groupe.
 */
export async function getAllSongsFromIndexedDB(groupId?: string): Promise<Song[]> {
  const db = await openIndexedDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.SONGS], 'readonly');
    const store = transaction.objectStore(STORES.SONGS);
    const request = store.getAll();

    request.onsuccess = () => {
      const results: Song[] = request.result || [];
      if (groupId) {
        resolve(results.filter((s) => (s.groupId || 'default-group') === groupId));
      } else {
        resolve(results);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Supprime un chant d'IndexedDB.
 */
export async function deleteSongFromIndexedDB(id: string): Promise<void> {
  if (!id) return;
  const db = await openIndexedDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.SONGS], 'readwrite');
    const store = transaction.objectStore(STORES.SONGS);
    store.delete(id);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Enregistre une setlist dans IndexedDB.
 */
export async function saveSetlistToIndexedDB(setlist: Setlist): Promise<void> {
  if (!setlist || !setlist.id) return;
  const db = await openIndexedDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.SETLISTS], 'readwrite');
    const store = transaction.objectStore(STORES.SETLISTS);
    store.put(setlist);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Enregistre plusieurs setlists en lot dans IndexedDB.
 */
export async function saveSetlistsToIndexedDB(setlists: Setlist[]): Promise<void> {
  if (!Array.isArray(setlists) || setlists.length === 0) return;
  const db = await openIndexedDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.SETLISTS], 'readwrite');
    const store = transaction.objectStore(STORES.SETLISTS);

    for (const setlist of setlists) {
      if (setlist && setlist.id) {
        store.put(setlist);
      }
    }

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Récupère une setlist par son identifiant depuis IndexedDB.
 */
export async function getSetlistFromIndexedDB(id: string): Promise<Setlist | null> {
  if (!id) return null;
  const db = await openIndexedDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.SETLISTS], 'readonly');
    const store = transaction.objectStore(STORES.SETLISTS);
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result || null);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Récupère toutes les setlists depuis IndexedDB.
 */
export async function getAllSetlistsFromIndexedDB(groupId?: string): Promise<Setlist[]> {
  const db = await openIndexedDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.SETLISTS], 'readonly');
    const store = transaction.objectStore(STORES.SETLISTS);
    const request = store.getAll();

    request.onsuccess = () => {
      const results: Setlist[] = request.result || [];
      if (groupId) {
        resolve(results.filter((st) => (st.groupId || 'default-group') === groupId));
      } else {
        resolve(results);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Supprime une setlist d'IndexedDB.
 */
export async function deleteSetlistFromIndexedDB(id: string): Promise<void> {
  if (!id) return;
  const db = await openIndexedDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.SETLISTS], 'readwrite');
    const store = transaction.objectStore(STORES.SETLISTS);
    store.delete(id);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Statistiques d'utilisation du cache IndexedDB et de l'espace de stockage alloué au navigateur.
 */
export async function getOfflineStorageStats(): Promise<{
  songCount: number;
  setlistCount: number;
  lastCachedAt: string | null;
  usageBytes: number;
  quotaBytes: number;
  isSupported: boolean;
}> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return {
      songCount: 0,
      setlistCount: 0,
      lastCachedAt: null,
      usageBytes: 0,
      quotaBytes: 0,
      isSupported: false
    };
  }

  try {
    const db = await openIndexedDB();

    const [songsCount, setlistsCount, metaData] = await Promise.all([
      new Promise<number>((res) => {
        const tx = db.transaction([STORES.SONGS], 'readonly');
        const req = tx.objectStore(STORES.SONGS).count();
        req.onsuccess = () => res(req.result);
        req.onerror = () => res(0);
      }),
      new Promise<number>((res) => {
        const tx = db.transaction([STORES.SETLISTS], 'readonly');
        const req = tx.objectStore(STORES.SETLISTS).count();
        req.onsuccess = () => res(req.result);
        req.onerror = () => res(0);
      }),
      new Promise<{ timestamp?: string } | null>((res) => {
        const tx = db.transaction([STORES.META], 'readonly');
        const req = tx.objectStore(STORES.META).get('last_cache_update');
        req.onsuccess = () => res(req.result || null);
        req.onerror = () => res(null);
      })
    ]);

    let usageBytes = 0;
    let quotaBytes = 0;

    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        usageBytes = estimate.usage || 0;
        quotaBytes = estimate.quota || 0;
      } catch {
        // Ignorer si estimation non autorisée
      }
    }

    return {
      songCount: songsCount,
      setlistCount: setlistsCount,
      lastCachedAt: metaData?.timestamp || null,
      usageBytes,
      quotaBytes,
      isSupported: true
    };
  } catch (err) {
    return {
      songCount: 0,
      setlistCount: 0,
      lastCachedAt: null,
      usageBytes: 0,
      quotaBytes: 0,
      isSupported: false
    };
  }
}

/**
 * Vide intégralement le cache IndexedDB de l'application.
 */
export async function clearIndexedDB(): Promise<void> {
  const db = await openIndexedDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      [STORES.SONGS, STORES.SETLISTS, STORES.OFFLINE_QUEUE, STORES.META],
      'readwrite'
    );

    transaction.objectStore(STORES.SONGS).clear();
    transaction.objectStore(STORES.SETLISTS).clear();
    transaction.objectStore(STORES.OFFLINE_QUEUE).clear();
    transaction.objectStore(STORES.META).clear();

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}
