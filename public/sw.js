const CACHE_STATIC_NAME = 'melobook-static-v3';
const CACHE_RUNTIME_NAME = 'melobook-runtime-v3';
const CACHE_DATA_NAME = 'melobook-data-v3';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg'
];

// Installation du Service Worker : mise en cache sécurisée des assets critiques
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC_NAME).then(async (cache) => {
      // Met en cache chaque ressource de manière tolérante aux pannes
      const promises = STATIC_ASSETS.map((asset) =>
        cache.add(asset).catch((err) => {
          console.warn('[SW] Pré-cache avertissement pour :', asset, err);
        })
      );
      await Promise.all(promises);
    }).then(() => self.skipWaiting())
  );
});

// Activation du Service Worker : nettoyage des anciens caches obsolètes
self.addEventListener('activate', (event) => {
  const allowedCaches = [CACHE_STATIC_NAME, CACHE_RUNTIME_NAME, CACHE_DATA_NAME];
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => !allowedCaches.includes(key))
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Écriture utilitaire d'une ressource JSON dans le cache de données
async function storeItemInCache(cacheName, urlPath, data) {
  try {
    const cache = await caches.open(cacheName);
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
  } catch (error) {
    return false;
  }
}

// Traitement de la mise en cache d'un chant individuel
async function handleCacheSongMessage(song) {
  if (!song || !song.id) return;
  await storeItemInCache(CACHE_DATA_NAME, `/offline-data/songs/${song.id}`, song);

  try {
    const cache = await caches.open(CACHE_DATA_NAME);
    const existingListResponse = await cache.match('/offline-data/songs');
    let songsList = [];
    if (existingListResponse) {
      songsList = await existingListResponse.json();
    }
    const filtered = songsList.filter((s) => s.id !== song.id);
    filtered.push(song);
    await storeItemInCache(CACHE_DATA_NAME, '/offline-data/songs', filtered);
  } catch (e) {
    // Continue silencieusement
  }
}

// Traitement de la mise en cache d'une setlist et de ses partitions
async function handleCacheSetlistMessage(setlist, songs) {
  if (!setlist || !setlist.id) return;
  await storeItemInCache(CACHE_DATA_NAME, `/offline-data/setlists/${setlist.id}`, setlist);

  try {
    const cache = await caches.open(CACHE_DATA_NAME);
    const existingListResponse = await cache.match('/offline-data/setlists');
    let setlistList = [];
    if (existingListResponse) {
      setlistList = await existingListResponse.json();
    }
    const filtered = setlistList.filter((st) => st.id !== setlist.id);
    filtered.push(setlist);
    await storeItemInCache(CACHE_DATA_NAME, '/offline-data/setlists', filtered);
  } catch (e) {
    // Continue silencieusement
  }

  if (Array.isArray(songs) && songs.length > 0) {
    for (const song of songs) {
      await handleCacheSongMessage(song);
    }
  }
}

// Traitement de la mise en cache globale (tous les chants et setlists)
async function handleCacheAllDataMessage(songs, setlists) {
  if (Array.isArray(songs) && songs.length > 0) {
    await storeItemInCache(CACHE_DATA_NAME, '/offline-data/songs', songs);
    for (const song of songs) {
      if (song && song.id) {
        await storeItemInCache(CACHE_DATA_NAME, `/offline-data/songs/${song.id}`, song);
      }
    }
  }
  if (Array.isArray(setlists) && setlists.length > 0) {
    await storeItemInCache(CACHE_DATA_NAME, '/offline-data/setlists', setlists);
    for (const setlist of setlists) {
      if (setlist && setlist.id) {
        await storeItemInCache(CACHE_DATA_NAME, `/offline-data/setlists/${setlist.id}`, setlist);
      }
    }
  }
}

// Écoute des messages venant du thread principal React
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (event.data.type === 'CACHE_SONG') {
    event.waitUntil(
      handleCacheSongMessage(event.data.song).then(() => {
        if (event.source && event.source.postMessage) {
          event.source.postMessage({
            type: 'SONG_CACHED_SUCCESS',
            songId: event.data.song?.id
          });
        }
      })
    );
    return;
  }

  if (event.data.type === 'CACHE_SETLIST') {
    event.waitUntil(
      handleCacheSetlistMessage(event.data.setlist, event.data.songs).then(() => {
        if (event.source && event.source.postMessage) {
          event.source.postMessage({
            type: 'SETLIST_CACHED_SUCCESS',
            setlistId: event.data.setlist?.id
          });
        }
      })
    );
    return;
  }

  if (event.data.type === 'CACHE_ALL_DATA') {
    event.waitUntil(
      handleCacheAllDataMessage(event.data.songs, event.data.setlists).then(() => {
        if (event.source && event.source.postMessage) {
          event.source.postMessage({
            type: 'ALL_DATA_CACHED_SUCCESS',
            songsCount: event.data.songs?.length || 0,
            setlistsCount: event.data.setlists?.length || 0
          });
        }
      })
    );
  }
});

// Interception des requêtes réseau pour fonctionnement hors-ligne robuste
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Ignorer les requêtes d'authentification et de flux Firestore distants
  if (
    url.origin.includes('firestore') ||
    url.origin.includes('identitytoolkit') ||
    url.origin.includes('securetoken')
  ) {
    return;
  }

  // 1. Requêtes de données hors-ligne spécifiques (/offline-data/*)
  if (url.pathname.startsWith('/offline-data/')) {
    event.respondWith(
      caches.open(CACHE_DATA_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          return new Response(JSON.stringify({ error: 'Élément non trouvé dans le cache hors-ligne' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        });
      })
    );
    return;
  }

  // 2. Polices Google Fonts (CacheFirst avec mise en cache runtime)
  if (url.origin.includes('fonts.googleapis.com') || url.origin.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.open(CACHE_RUNTIME_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => cachedResponse);

          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // 3. Navigation HTML de l'application (NetworkFirst avec fallback offline index.html)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_STATIC_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_STATIC_NAME);
          const cachedNavigate = await cache.match(event.request);
          if (cachedNavigate) return cachedNavigate;
          const fallback = await cache.match('/index.html');
          if (fallback) return fallback;
          return cache.match('/');
        })
    );
    return;
  }

  // 4. Assets statiques (JS, CSS, SVGs, images, fonts)
  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.ico');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_RUNTIME_NAME).then((cache) => cache.put(event.request, clone));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 5. Fallback par défaut : Cache puis réseau
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return (
        cachedResponse ||
        fetch(event.request)
          .then((networkResponse) => {
            if (
              networkResponse &&
              networkResponse.status === 200 &&
              networkResponse.type === 'basic'
            ) {
              const clone = networkResponse.clone();
              caches.open(CACHE_RUNTIME_NAME).then((cache) => cache.put(event.request, clone));
            }
            return networkResponse;
          })
          .catch(() => {
            if (event.request.destination === 'image') {
              return caches.match('/icon.svg');
            }
          })
      );
    })
  );
});
