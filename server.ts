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
