import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { searchShirSongs, getShirSongDetail } from './server/shirService';
import { searchUltimateGuitar, getUltimateGuitarSongDetail } from './server/ultimateGuitarService';
import { searchWorshipTogether, getWorshipTogetherSongDetail } from './server/worshipTogetherService';
import { searchLaCuerda, getLaCuerdaSongDetail } from './server/laCuerdaService';

dotenv.config();

let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', serverTime: new Date().toISOString() });
  });

  // Presentation State Sync (Brave & cross-window resilient)
  let latestPresentationState: any = null;

  app.get('/api/presentation-state', (_req, res) => {
    res.json({ ok: true, state: latestPresentationState });
  });

  app.post('/api/presentation-state', (req, res) => {
    if (req.body && req.body.state) {
      latestPresentationState = { ...req.body.state, updatedAt: Date.now() };
    }
    res.json({ ok: true, state: latestPresentationState });
  });

  // Bible proxy & high-speed in-memory cache
  const bibleChapterCache = new Map<string, any[]>();

  app.get('/api/bible/chapter', async (req, res) => {
    try {
      const rawTranslation = (req.query.translation as string) || 'FRLSG';
      const aliasMap: Record<string, string> = {
        'RVR1960': 'RV1960',
        'LSG': 'FRLSG',
        'Darby': 'FRDBY',
        'BLA': 'LBLA',
        'FROST': 'OST',
        'Ostervald': 'OST'
      };
      const translation = aliasMap[rawTranslation] || rawTranslation;
      const bookId = Number(req.query.bookId);
      const chapter = Number(req.query.chapter);

      if (!bookId || !chapter) {
        return res.status(400).json({ error: 'bookId et chapter requis' });
      }

      const cacheKey = `${translation}_${bookId}_${chapter}`;
      if (bibleChapterCache.has(cacheKey)) {
        return res.json({ ok: true, verses: bibleChapterCache.get(cacheKey) });
      }

      const externalUrl = `https://bolls.life/get-chapter/${encodeURIComponent(translation)}/${bookId}/${chapter}/`;
      const response = await fetch(externalUrl);
      if (!response.ok) {
        return res.status(response.status).json({ error: 'Erreur externe Bible' });
      }

      const data = await response.json();
      const verses = Array.isArray(data)
        ? data.map((item: any) => ({
            verseNumber: item.verse,
            text: (item.text || '').replace(/<[^>]+>/g, '').trim()
          }))
        : [];

      bibleChapterCache.set(cacheKey, verses);
      return res.json({ ok: true, verses });
    } catch (err: any) {
      console.error('Erreur /api/bible/chapter:', err);
      return res.status(500).json({ error: err.message || 'Erreur serveur Bible' });
    }
  });

  // Fetch full song details and chords on-demand from external site

  app.post('/api/external-song-detail', async (req, res) => {
    try {
      const { pageTitle, tabUrl, source } = req.body;
      const target = tabUrl || pageTitle;
      if (!target) {
        return res.status(400).json({ error: 'Titre ou lien de partition requis' });
      }

      if (source === 'Shir.fr') {
        const detail = await getShirSongDetail(pageTitle || target);
        if (detail) return res.json({ ok: true, song: detail });
      } else if (source === 'Ultimate Guitar') {
        const detail = await getUltimateGuitarSongDetail(target);
        if (detail) return res.json({ ok: true, song: detail });
      } else if (source === 'WorshipTogether' || source === 'Worship Together') {
        const detail = await getWorshipTogetherSongDetail(target);
        if (detail) return res.json({ ok: true, song: detail });
      } else if (source === 'LaCuerda' || source === 'LaCuerda.net') {
        const detail = await getLaCuerdaSongDetail(target);
        if (detail) return res.json({ ok: true, song: detail });
      } else {
        // Fallback by URL signature or try Shirley / others
        if (target.includes('ultimate-guitar.com')) {
          const detail = await getUltimateGuitarSongDetail(target);
          if (detail) return res.json({ ok: true, song: detail });
        } else if (target.includes('worshiptogether.com')) {
          const detail = await getWorshipTogetherSongDetail(target);
          if (detail) return res.json({ ok: true, song: detail });
        } else if (target.includes('lacuerda.net')) {
          const detail = await getLaCuerdaSongDetail(target);
          if (detail) return res.json({ ok: true, song: detail });
        } else {
          const detail = await getShirSongDetail(target);
          if (detail) return res.json({ ok: true, song: detail });
        }
      }

      return res.status(404).json({ error: 'Chant non trouvé sur le répertoire distant' });
    } catch (err: any) {
      console.error('Erreur API external-song-detail:', err);
      return res.status(500).json({ error: err.message || 'Erreur lors du chargement des détails du chant' });
    }
  });

  // Search external songs directly in real site directories
  app.post('/api/external-search', async (req, res) => {
    try {
      const { query, source } = req.body;
      if (!query || typeof query !== 'string' || !query.trim()) {
        return res.status(400).json({ error: 'Le terme de recherche est requis' });
      }

      const q = query.trim();

      // 1. Direct search on individual site if selected
      if (source === 'Shir.fr') {
        const shirResults = await searchShirSongs(q, 40);
        return res.json({ results: shirResults, total: shirResults.length, source: 'Shir.fr' });
      }

      if (source === 'Ultimate Guitar') {
        const ugResults = await searchUltimateGuitar(q, 35);
        return res.json({ results: ugResults, total: ugResults.length, source: 'Ultimate Guitar' });
      }

      if (source === 'WorshipTogether' || source === 'Worship Together') {
        const wtResults = await searchWorshipTogether(q, 35);
        return res.json({ results: wtResults, total: wtResults.length, source: 'WorshipTogether' });
      }

      if (source === 'LaCuerda' || source === 'LaCuerda.net') {
        const lcResults = await searchLaCuerda(q, 35);
        return res.json({ results: lcResults, total: lcResults.length, source: 'LaCuerda' });
      }

      // 2. Direct search across all sites in parallel if source === 'all' or not specified
      if (!source || source === 'all') {
        const [shirRes, ugRes, wtRes, lcRes] = await Promise.allSettled([
          searchShirSongs(q, 20),
          searchUltimateGuitar(q, 20),
          searchWorshipTogether(q, 20),
          searchLaCuerda(q, 15)
        ]);

        const merged: any[] = [];
        if (shirRes.status === 'fulfilled') merged.push(...shirRes.value);
        if (ugRes.status === 'fulfilled') merged.push(...ugRes.value);
        if (wtRes.status === 'fulfilled') merged.push(...wtRes.value);
        if (lcRes.status === 'fulfilled') merged.push(...lcRes.value);

        if (merged.length > 0) {
          return res.json({ results: merged, total: merged.length, source: 'all' });
        }
      }

      // 3. Fallback to AI musicological search for other custom sources if configured
      const ai = getAIClient();
      if (!ai) {
        return res.json({ results: [] });
      }

      const prompt = `Tu es un expert en partitions chrétiennes au format ChordPro pour le répertoire évangélique et francophone.
L'utilisateur recherche des chants pour : "${q}". Source : ${source || 'Toutes les sources'}.
Renvoie UNIQUEMENT les vrais chants existants de cet artiste ou avec ce titre au format JSON strict :
[
  {
    "id": "ext-ai-1",
    "title": "Titre officiel",
    "artist": "Artiste ou groupe",
    "source": "${source || 'Shir.fr'}",
    "key": "G",
    "tempo": 72,
    "timeSignature": "4/4",
    "tags": ["Louange", "Adoration"],
    "snippet": "Extrait des paroles réelles",
    "contentChordPro": "{title: Titre}\\n{artist: Artiste}\\n{key: G}\\n{tempo: 72}\\n\\n[G]Paroles avec accords..."
  }
]
Ne JAMAIS inventer de faux titres. Réponds uniquement avec un tableau JSON valide.`;

      const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
      let rawText = '';

      for (const modelName of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              temperature: 0.1,
              responseMimeType: 'application/json'
            }
          });
          rawText = response.text || '[]';
          if (rawText) break;
        } catch {
          // Try next model if quota or busy
        }
      }

      let results: any[] = [];
      try {
        results = JSON.parse(rawText);
      } catch {
        const match = rawText.match(/\[[\s\S]*\]/);
        if (match) {
          try { results = JSON.parse(match[0]); } catch {}
        }
      }

      if (!Array.isArray(results) && typeof results === 'object' && results !== null) {
        results = (results as any).results || (results as any).songs || [];
      }

      return res.json({ results: Array.isArray(results) ? results : [] });
    } catch (error: any) {
      console.error('Erreur API external-search:', error);
      return res.status(500).json({ error: error.message || 'Erreur lors de la recherche en ligne' });
    }
  });

  // Recherche en ligne Pixabay & Unsplash (exclusivement en format horizontal 16:9)
  app.post('/api/media/search', async (req, res) => {
    try {
      const { query, mediaType = 'image', source = 'all', pixabayApiKey } = req.body;
      const q = (query || '').trim();
      if (!q) {
        return res.status(400).json({ error: 'Terme de recherche requis' });
      }

      const results: any[] = [];

      // 1. Si une clé API Pixabay est fournie, interroger l'API officielle Pixabay (orientation=horizontal)
      if ((source === 'all' || source === 'pixabay') && pixabayApiKey) {
        try {
          if (mediaType === 'video') {
            const pbUrl = `https://pixabay.com/api/videos/?key=${encodeURIComponent(pixabayApiKey)}&q=${encodeURIComponent(q)}&orientation=horizontal&per_page=20`;
            const pbRes = await fetch(pbUrl);
            if (pbRes.ok) {
              const pbData = await pbRes.json();
              if (Array.isArray(pbData.hits)) {
                for (const hit of pbData.hits) {
                  const videoFile = hit.videos?.large?.url || hit.videos?.medium?.url || hit.videos?.small?.url;
                  if (videoFile) {
                    results.push({
                      id: `pb-vid-${hit.id}`,
                      type: 'video',
                      source: 'pixabay',
                      title: hit.tags ? hit.tags.split(',')[0].trim() : `Vidéo Pixabay ${hit.id}`,
                      category: 'Pixabay Vidéo',
                      url: videoFile,
                      thumbnail: hit.userImageURL || `https://i.vimeocdn.com/video/${hit.picture_id}_640x360.jpg`,
                      author: hit.user || 'Pixabay'
                    });
                  }
                }
              }
            }
          } else {
            const pbUrl = `https://pixabay.com/api/?key=${encodeURIComponent(pixabayApiKey)}&q=${encodeURIComponent(q)}&image_type=photo&orientation=horizontal&per_page=24`;
            const pbRes = await fetch(pbUrl);
            if (pbRes.ok) {
              const pbData = await pbRes.json();
              if (Array.isArray(pbData.hits)) {
                for (const hit of pbData.hits) {
                  results.push({
                    id: `pb-img-${hit.id}`,
                    type: 'image',
                    source: 'pixabay',
                    title: hit.tags ? hit.tags.split(',')[0].trim() : `Image Pixabay ${hit.id}`,
                    category: 'Pixabay Photo',
                    url: hit.largeImageURL || hit.webformatURL,
                    thumbnail: hit.webformatURL || hit.previewURL,
                    author: hit.user || 'Pixabay'
                  });
                }
              }
            }
          }
        } catch (pbErr) {
          console.warn('Pixabay direct API error:', pbErr);
        }
      }

      // 2. Recherche en ligne IA multi-sources (Unsplash & Pixabay) strictement en format horizontal 16:9
      const ai = getAIClient();
      if (ai) {
        try {
          const prompt = mediaType === 'video'
            ? `Tu es un moteur de recherche de médias libres de droits en ligne pour des projections d'église et de culte.
Recherche des vidéos d'arrière-plan réelles en FORMAT HORIZONTAL STRICT (16:9 / paysage, résolution 1920x1080) sur le thème: "${q}".
Source demandée: ${source === 'all' ? 'Pixabay et Pexels' : source}.
Toutes les vidéos DOIVENT être au format horizontal paysage (widescreen 16:9).
Renvoie UNIQUEMENT un tableau JSON valide de 6 à 10 vidéos au format MP4 direct avec miniatures:
[
  {
    "id": "vid-1",
    "type": "video",
    "source": "pixabay",
    "title": "Titre descriptif en français",
    "category": "Catégorie",
    "url": "https://videos.pexels.com/...-hd_1920_1080_...mp4 ou mixkit/pixabay mp4",
    "thumbnail": "https://images.unsplash.com/... ou miniature jpg",
    "author": "Nom auteur / photographe"
  }
]`
            : `Tu es un moteur de recherche d'images haute résolution en ligne pour des projections d'église et de culte.
Recherche des photos réelles en FORMAT HORIZONTAL STRICT (16:9 / paysage panoramique, w=1920&h=1080&fit=crop) sur le thème: "${q}".
Sources demandées: ${source === 'all' ? 'Unsplash et Pixabay' : source}.
Toutes les URLs d'images Unsplash DOIVENT inclure "?w=1920&h=1080&fit=crop" pour garantir le format horizontal 16:9.
Renvoie UNIQUEMENT un tableau JSON valide de 6 à 12 images:
[
  {
    "id": "img-1",
    "type": "image",
    "source": "unsplash",
    "title": "Titre descriptif en français",
    "category": "Catégorie",
    "url": "https://images.unsplash.com/photo-...?w=1920&h=1080&fit=crop&q=85",
    "thumbnail": "https://images.unsplash.com/photo-...?w=480&h=270&fit=crop&q=80",
    "author": "Nom du photographe"
  }
]`;

          const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
          let aiText = '';
          for (const modelName of candidateModels) {
            try {
              const resp = await ai.models.generateContent({
                model: modelName,
                contents: prompt,
                config: {
                  temperature: 0.2,
                  responseMimeType: 'application/json'
                }
              });
              aiText = resp.text || '';
              if (aiText) break;
            } catch {
              // Fallback to next model
            }
          }

          if (aiText) {
            let parsed: any[] = [];
            try {
              parsed = JSON.parse(aiText);
            } catch {
              const match = aiText.match(/\[[\s\S]*\]/);
              if (match) parsed = JSON.parse(match[0]);
            }
            if (Array.isArray(parsed)) {
              for (const item of parsed) {
                // S'assurer que le format est strictement horizontal 16:9
                if (item.url && item.url.includes('images.unsplash.com') && !item.url.includes('fit=crop')) {
                  item.url = `${item.url}${item.url.includes('?') ? '&' : '?'}w=1920&h=1080&fit=crop`;
                }
                if (item.thumbnail && item.thumbnail.includes('images.unsplash.com') && !item.thumbnail.includes('fit=crop')) {
                  item.thumbnail = `${item.thumbnail}${item.thumbnail.includes('?') ? '&' : '?'}w=480&h=270&fit=crop`;
                }
                results.push(item);
              }
            }
          }
        } catch (aiErr) {
          console.error('Erreur IA media search:', aiErr);
        }
      }

      return res.json({ ok: true, results, query: q, total: results.length });
    } catch (err: any) {
      console.error('Erreur /api/media/search:', err);
      return res.status(500).json({ error: err.message || 'Erreur recherche média' });
    }
  });

  // Désactiver la mise en cache HTTP agressive des navigateurs (Chrome / Brave) sur les pages et modules
  app.use((req, res, next) => {
    if (req.path === '/' || req.path.endsWith('.html') || req.path.startsWith('/@') || req.path.startsWith('/src/')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    next();
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur Melobook démarré sur http://localhost:${PORT}`);
  });
}

startServer();
