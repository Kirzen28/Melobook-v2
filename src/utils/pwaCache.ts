import { Song, Setlist } from '../types';
import { 
  saveSongToIndexedDB, 
  saveSongsToIndexedDB, 
  getSongFromIndexedDB, 
  getAllSongsFromIndexedDB,
  saveSetlistToIndexedDB,
  saveSetlistsToIndexedDB,
  getSetlistFromIndexedDB,
  getAllSetlistsFromIndexedDB,
  getOfflineStorageStats,
  clearIndexedDB
} from './indexedDB';

const DATA_CACHE_NAME = 'melobook-data-v5';
export const APP_CACHE_VERSION = '20261008-02';
const CACHE_VERSION_KEY = 'melobook_app_cache_version';

/**
 * Vérifie et force une purge sévère du cache en cas de nouvelle version de l'application.
 * Cela résout définitivement les contenus figés sur Chrome, Brave et Edge.
 */
export function runHardCacheCheck(): void {
  if (typeof window === 'undefined') return;

  try {
    const storedVersion = localStorage.getItem(CACHE_VERSION_KEY);
    if (storedVersion !== APP_CACHE_VERSION) {
      // 1. Purger les anciens caches statiques et d'exécution dans CacheStorage
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => {
            // Supprimer tous les caches précédents sauf les données v5
            if (name !== DATA_CACHE_NAME && !name.includes('v5')) {
              caches.delete(name);
            }
          });
        });
      }

      // 2. Envoyer un ordre de purge immédiate au Service Worker en place et forcer update
      if ('serviceWorker' in navigator) {
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'PURGE_ALL_CACHES' });
          navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
        }
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((r) => r.update().catch(() => {}));
        });
      }

      localStorage.setItem(CACHE_VERSION_KEY, APP_CACHE_VERSION);
    }
  } catch (err) {
    console.warn('Vérification version cache PWA note:', err);
  }
}

/**
 * Force une purge complète manuelle de tous les caches et désenregistre les Service Workers,
 * puis recharge la page.
 */
export async function forceHardCacheRefresh(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    }
    localStorage.removeItem(CACHE_VERSION_KEY);
  } catch (e) {
    console.warn('Erreur lors du nettoyage forcé du cache:', e);
  }
  window.location.reload();
}

export function registerServiceWorker(onSuccess?: () => void, onUpdate?: () => void): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  // Vérifier et forcer la purge du cache si la version a changé
  runHardCacheCheck();

  // En environnement de développement (Vite dev server) ou preview dev, désactiver et purger le Service Worker
  // pour éviter tout gel du cache des modules JS et toujours afficher la dernière version
  const isDev = Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV);
  const isDevHost = typeof window !== 'undefined' && (
    isDev ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('ais-dev-') ||
    window.location.port === '3000'
  );

  if (isDevHost) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
    if ('caches' in window) {
      caches.keys().then((keys) => {
        for (const key of keys) {
          if (key.startsWith('melobook-static') || key.startsWith('melobook-runtime')) {
            caches.delete(key);
          }
        }
      });
    }
    return;
  }

  window.addEventListener('load', () => {
    // updateViaCache: 'none' force Chrome à toujours vérifier le Service Worker sur le réseau
    navigator.serviceWorker
      .register(`/sw.js?v=${APP_CACHE_VERSION}`, { updateViaCache: 'none' })
      .then((registration) => {
        // Déclencher une recherche de mise à jour immédiate
        registration.update();

        // Si un nouveau worker attend déjà, le forcer à s'activer sans attendre la fermeture des onglets
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          if (onUpdate) onUpdate();
        }

        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  installingWorker.postMessage({ type: 'SKIP_WAITING' });
                  if (onUpdate) onUpdate();
                } else {
                  if (onSuccess) onSuccess();
                }
              }
            });
          }
        });
      })
      .catch((err) => {
        console.warn('Enregistrement Service Worker note:', err);
      });

    // Quand le nouveau Service Worker prend la main, rafraîchir en douceur une seule fois
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}

async function writeJsonToCache(urlPath: string, data: any): Promise<boolean> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return false;
  }
  try {
    const cache = await window.caches.open(DATA_CACHE_NAME);
    const response = new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Melobook-Offline': 'true',
        'X-Cache-Time': new Date().toISOString()
      }
    });
    await cache.put(new Request(urlPath), response);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Met en cache un chant dans IndexedDB, dans le CacheStorage du navigateur,
 * et notifie le Service Worker actif.
 */
export async function cacheSongInWorker(song: Song | null): Promise<void> {
  if (!song || !song.id) return;

  // 1. Sauvegarde robuste dans IndexedDB
  try {
    await saveSongToIndexedDB(song);
  } catch (e) {
    console.warn('Sauvegarde IndexedDB chant note:', e);
  }

  // 2. Sauvegarde dans CacheStorage
  await writeJsonToCache(`/offline-data/songs/${song.id}`, song);

  try {
    const cache = await window.caches.open(DATA_CACHE_NAME);
    const existing = await cache.match('/offline-data/songs');
    let list: Song[] = [];
    if (existing) {
      list = await existing.json();
    }
    const filtered = list.filter((s) => s.id !== song.id);
    filtered.push(song);
    await writeJsonToCache('/offline-data/songs', filtered);
  } catch (err) {
    // Continue silencieusement
  }

  // 3. Message au Service Worker
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_SONG',
      song
    });
  }
}

/**
 * Met en cache une setlist et ses chants associés dans IndexedDB et CacheStorage.
 */
export async function cacheSetlistInWorker(setlist: Setlist | null, songs: Song[] = []): Promise<void> {
  if (!setlist || !setlist.id) return;

  // 1. Sauvegarde dans IndexedDB
  try {
    await saveSetlistToIndexedDB(setlist);
  } catch (e) {
    console.warn('Sauvegarde IndexedDB setlist note:', e);
  }

  // 2. Sauvegarde dans CacheStorage
  await writeJsonToCache(`/offline-data/setlists/${setlist.id}`, setlist);

  try {
    const cache = await window.caches.open(DATA_CACHE_NAME);
    const existing = await cache.match('/offline-data/setlists');
    let list: Setlist[] = [];
    if (existing) {
      list = await existing.json();
    }
    const filtered = list.filter((st) => st.id !== setlist.id);
    filtered.push(setlist);
    await writeJsonToCache('/offline-data/setlists', filtered);
  } catch (err) {
    // Continue silencieusement
  }

  if (Array.isArray(songs) && songs.length > 0) {
    for (const song of songs) {
      if (song && song.id) {
        await cacheSongInWorker(song);
      }
    }
  }

  // 3. Notification Service Worker
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_SETLIST',
      setlist,
      songs
    });
  }
}

/**
 * Sauvegarde globale de l'intégralité du répertoire et des setlists
 * dans IndexedDB et le cache offline du Service Worker.
 */
export async function cacheAllDataInWorker(songs: Song[], setlists: Setlist[]): Promise<void> {
  // 1. Sauvegarde par lot dans IndexedDB (ultra-rapide et capacitif)
  try {
    if (Array.isArray(songs) && songs.length > 0) {
      await saveSongsToIndexedDB(songs);
    }
    if (Array.isArray(setlists) && setlists.length > 0) {
      await saveSetlistsToIndexedDB(setlists);
    }
  } catch (e) {
    console.warn('Sauvegarde IndexedDB globale note:', e);
  }

  // 2. Sauvegarde dans CacheStorage
  if (Array.isArray(songs) && songs.length > 0) {
    await writeJsonToCache('/offline-data/songs', songs);
    for (const s of songs) {
      if (s && s.id) {
        await writeJsonToCache(`/offline-data/songs/${s.id}`, s);
      }
    }
  }

  if (Array.isArray(setlists) && setlists.length > 0) {
    await writeJsonToCache('/offline-data/setlists', setlists);
    for (const st of setlists) {
      if (st && st.id) {
        await writeJsonToCache(`/offline-data/setlists/${st.id}`, st);
      }
    }
  }

  // 3. Message au Service Worker
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_ALL_DATA',
      songs,
      setlists
    });
  }
}

/**
 * Récupère un chant depuis le stockage local (IndexedDB en priorité, puis CacheStorage).
 */
export async function getCachedSong(songId: string): Promise<Song | null> {
  if (!songId) return null;

  // 1. Tenter la lecture depuis IndexedDB
  try {
    const idbSong = await getSongFromIndexedDB(songId);
    if (idbSong) return idbSong;
  } catch (e) {
    // Fallback silencieux vers CacheStorage
  }

  // 2. Tenter depuis CacheStorage
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cache = await window.caches.open(DATA_CACHE_NAME);
      const response = await cache.match(`/offline-data/songs/${songId}`);
      if (response) {
        return await response.json();
      }
    } catch (err) {
      // Ignorer
    }
  }

  return null;
}

/**
 * Récupère une setlist depuis le stockage local.
 */
export async function getCachedSetlist(setlistId: string): Promise<Setlist | null> {
  if (!setlistId) return null;

  try {
    const idbSetlist = await getSetlistFromIndexedDB(setlistId);
    if (idbSetlist) return idbSetlist;
  } catch (e) {
    // Fallback
  }

  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cache = await window.caches.open(DATA_CACHE_NAME);
      const response = await cache.match(`/offline-data/setlists/${setlistId}`);
      if (response) {
        return await response.json();
      }
    } catch (err) {
      // Ignorer
    }
  }

  return null;
}

/**
 * Récupère tous les chants mis en cache hors-ligne (depuis IndexedDB).
 */
export async function getAllCachedSongs(groupId?: string): Promise<Song[]> {
  try {
    const songs = await getAllSongsFromIndexedDB(groupId);
    if (songs && songs.length > 0) return songs;
  } catch (e) {
    // Fallback CacheStorage
  }

  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cache = await window.caches.open(DATA_CACHE_NAME);
      const response = await cache.match('/offline-data/songs');
      if (response) {
        const list: Song[] = await response.json();
        return groupId ? list.filter(s => (s.groupId || 'default-group') === groupId) : list;
      }
    } catch {
      // Ignorer
    }
  }

  return [];
}

/**
 * Récupère toutes les setlists mises en cache hors-ligne.
 */
export async function getAllCachedSetlists(groupId?: string): Promise<Setlist[]> {
  try {
    const setlists = await getAllSetlistsFromIndexedDB(groupId);
    if (setlists && setlists.length > 0) return setlists;
  } catch (e) {
    // Fallback
  }

  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cache = await window.caches.open(DATA_CACHE_NAME);
      const response = await cache.match('/offline-data/setlists');
      if (response) {
        const list: Setlist[] = await response.json();
        return groupId ? list.filter(st => (st.groupId || 'default-group') === groupId) : list;
      }
    } catch {
      // Ignorer
    }
  }

  return [];
}

/**
 * Supprime entièrement le cache hors-ligne (IndexedDB + CacheStorage).
 */
export async function clearAllLocalCaches(): Promise<void> {
  try {
    await clearIndexedDB();
  } catch (e) {
    console.warn('Erreur purge IndexedDB:', e);
  }

  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      await window.caches.delete(DATA_CACHE_NAME);
    } catch (e) {
      console.warn('Erreur purge CacheStorage:', e);
    }
  }
}

export { getOfflineStorageStats };
