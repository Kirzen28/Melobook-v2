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
export const APP_CACHE_VERSION = '20261124-01';
const CACHE_VERSION_KEY = 'melobook_app_cache_version';

function isOfflineDataCacheName(name: string): boolean {
  return name === DATA_CACHE_NAME || name.startsWith('melobook-data-');
}

export function isDevEnvironmentHost(): boolean {
  if (typeof window === 'undefined') return false;
  const isDev = Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV);
  return (
    isDev ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('ais-dev-') ||
    window.location.port === '3000'
  );
}

/**
 * Vérifie et force une purge sélective du cache applicatif en cas de nouvelle version,
 * tout en préservant intégralement les chants et setlists hors-ligne.
 */
export function runHardCacheCheck(): void {
  if (typeof window === 'undefined') return;

  try {
    const storedVersion = localStorage.getItem(CACHE_VERSION_KEY);
    if (storedVersion !== APP_CACHE_VERSION) {
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => {
            if (!isOfflineDataCacheName(name)) {
              caches.delete(name);
            }
          });
        });
      }

      if ('serviceWorker' in navigator) {
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'PURGE_APP_CACHES' });
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
 * Vide uniquement les caches de l'application (HTML/JS/CSS et Service Worker),
 * conserve tous les chants hors-ligne (IndexedDB + melobook-data-*), puis recharge la page.
 */
export async function refreshAppCachePreservingOfflineData(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => !isOfflineDataCacheName(key))
          .map((key) => caches.delete(key))
      );
    }

    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const waitingWorker = registrations.find((reg) => reg.waiting)?.waiting;

      if (waitingWorker) {
        await new Promise<void>((resolve) => {
          const timeoutId = window.setTimeout(resolve, 450);
          const onControllerChange = () => {
            window.clearTimeout(timeoutId);
            navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
            resolve();
          };
          navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
          waitingWorker.postMessage({ type: 'SKIP_WAITING' });
        });
      } else {
        // Si la mise à jour vient du manifeste de build avant l'installation SW, désenregistrer pour repartir sur un SW neuf
        await Promise.all(registrations.map((reg) => reg.unregister().catch(() => false)));
      }
    }

    localStorage.setItem(CACHE_VERSION_KEY, APP_CACHE_VERSION);
  } catch (e) {
    console.warn('Erreur lors du rafraîchissement du cache applicatif:', e);
  }

  window.location.reload();
}

/**
 * Compatibilité : alias conservé pour toute purge forcée complète.
 */
export async function forceHardCacheRefresh(): Promise<void> {
  await refreshAppCachePreservingOfflineData();
}

/**
 * Vérifie si une nouvelle version publiée est disponible (Service Worker en attente ou buildId serveur différent).
 */
export async function checkForAppUpdate(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;

  try {
    if ('serviceWorker' in navigator && !isDevEnvironmentHost()) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        if (reg.waiting) return true;
        await reg.update().catch(() => {});
        if (reg.waiting) return true;
      }
    }
  } catch {
    // Ignore SW errors and continue to build version check
  }

  try {
    const currentBuildId = typeof __APP_BUILD_ID__ === 'string' ? __APP_BUILD_ID__ : '';
    if (!currentBuildId) return false;

    const res = await fetch(`/version.json?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) return false;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return false;

    const data = (await res.json()) as { buildId?: unknown };
    if (typeof data?.buildId === 'string' && data.buildId.length > 0 && data.buildId !== currentBuildId) {
      return true;
    }
  } catch {
    // Offline or transient network error
  }

  return false;
}

export function registerServiceWorker(onSuccess?: () => void, onUpdate?: () => void): () => void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return () => {};
  }

  runHardCacheCheck();

  if (isDevEnvironmentHost()) {
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
    return () => {};
  }

  let activeRegistration: ServiceWorkerRegistration | null = null;
  let updateTimerId: number | null = null;

  const checkRegUpdate = () => {
    if (activeRegistration) {
      if (activeRegistration.waiting && onUpdate) {
        onUpdate();
      }
      activeRegistration.update().catch(() => {});
    }
  };

  const handleLoad = () => {
    navigator.serviceWorker
      .register(`/sw.js?v=${APP_CACHE_VERSION}`, { updateViaCache: 'none' })
      .then((registration) => {
        activeRegistration = registration;
        registration.update().catch(() => {});

        if (registration.waiting && onUpdate) {
          onUpdate();
        }

        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
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
  };

  const handleVisibility = () => {
    if (!document.hidden) {
      checkRegUpdate();
    }
  };

  if (document.readyState === 'complete') {
    handleLoad();
  } else {
    window.addEventListener('load', handleLoad);
  }

  document.addEventListener('visibilitychange', handleVisibility);
  updateTimerId = window.setInterval(checkRegUpdate, 180_000);

  return () => {
    window.removeEventListener('load', handleLoad);
    document.removeEventListener('visibilitychange', handleVisibility);
    if (updateTimerId !== null) {
      window.clearInterval(updateTimerId);
    }
  };
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
