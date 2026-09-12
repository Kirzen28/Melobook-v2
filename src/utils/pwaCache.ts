import { Song, Setlist } from '../types';

const DATA_CACHE_NAME = 'melobook-data-v2';

export function registerServiceWorker(onSuccess?: () => void, onUpdate?: () => void): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
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
      .catch(() => {
        // Enregistrement echoue sans bloquer l application
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

export async function cacheSongInWorker(song: Song | null): Promise<void> {
  if (!song || !song.id) return;

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

  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_SONG',
      song
    });
  }
}

export async function cacheSetlistInWorker(setlist: Setlist | null, songs: Song[] = []): Promise<void> {
  if (!setlist || !setlist.id) return;

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

  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_SETLIST',
      setlist,
      songs
    });
  }
}

export async function cacheAllDataInWorker(songs: Song[], setlists: Setlist[]): Promise<void> {
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

  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_ALL_DATA',
      songs,
      setlists
    });
  }
}

export async function getCachedSong(songId: string): Promise<Song | null> {
  if (typeof window === 'undefined' || !('caches' in window)) return null;
  try {
    const cache = await window.caches.open(DATA_CACHE_NAME);
    const response = await cache.match(`/offline-data/songs/${songId}`);
    if (response) {
      return await response.json();
    }
    return null;
  } catch (err) {
    return null;
  }
}

export async function getCachedSetlist(setlistId: string): Promise<Setlist | null> {
  if (typeof window === 'undefined' || !('caches' in window)) return null;
  try {
    const cache = await window.caches.open(DATA_CACHE_NAME);
    const response = await cache.match(`/offline-data/setlists/${setlistId}`);
    if (response) {
      return await response.json();
    }
    return null;
  } catch (err) {
    return null;
  }
}
