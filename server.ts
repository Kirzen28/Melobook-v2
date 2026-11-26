import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { searchShirSongs, getShirSongDetail } from './server/shirService';
import { searchUltimateGuitar, getUltimateGuitarSongDetail } from './server/ultimateGuitarService';
import { searchWorshipTogether, getWorshipTogetherSongDetail } from './server/worshipTogetherService';
import { searchLaCuerda, getLaCuerdaSongDetail } from './server/laCuerdaService';
import { searchCifraClub, getCifraClubSongDetail } from './server/cifraClubService';
import { decodeHtmlEntities } from './src/utils/htmlEntities';
import { getYouTubeVideoId, formatDurationToMMSS } from './src/utils/chordUtils';

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

  // Serve FFmpeg WASM core files locally
  app.use('/api/ffmpeg-core', express.static(path.resolve('./node_modules/@ffmpeg/core/dist/esm'), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.wasm')) {
        res.setHeader('Content-Type', 'application/wasm');
      }
    }
  }));

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

  // Temporary in-memory media store for local files projected across windows/screens
  const presentationMediaStore = new Map<string, { buffer: Buffer; mimeType: string }>();
  const MAX_PRESENTATION_MEDIA_ITEMS = 8;

  app.post(
    '/api/presentation-media',
    express.raw({ type: '*/*', limit: '50mb' }),
    (req, res) => {
      const body = req.body;
      if (!Buffer.isBuffer(body) || body.length === 0) {
        return res.status(400).json({ error: 'Fichier média vide ou invalide' });
      }
      const rawMime = String(req.headers['content-type'] || 'application/octet-stream').split(';')[0].trim().toLowerCase();
      const allowedPrefix = rawMime.startsWith('image/') || rawMime.startsWith('video/') || rawMime.startsWith('audio/');
      const mimeType = allowedPrefix ? rawMime : 'application/octet-stream';

      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      if (presentationMediaStore.size >= MAX_PRESENTATION_MEDIA_ITEMS) {
        const oldestKey = presentationMediaStore.keys().next().value;
        if (oldestKey) presentationMediaStore.delete(oldestKey);
      }
      presentationMediaStore.set(id, { buffer: body, mimeType });
      return res.json({ ok: true, id, url: `/api/presentation-media/${id}` });
    }
  );

  app.get('/api/presentation-media/:id', (req, res) => {
    const entry = presentationMediaStore.get(req.params.id);
    if (!entry) {
      return res.status(404).send('Média introuvable ou expiré');
    }
    const { buffer, mimeType } = entry;
    const total = buffer.length;
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'");

    const range = req.headers.range;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (match) {
        const start = match[1] ? parseInt(match[1], 10) : 0;
        const end = match[2] ? Math.min(parseInt(match[2], 10), total - 1) : total - 1;
        if (start <= end && start < total) {
          res.status(206);
          res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
          res.setHeader('Content-Length', String(end - start + 1));
          return res.send(buffer.subarray(start, end + 1));
        }
      }
    }

    res.setHeader('Content-Length', String(total));
    return res.send(buffer);
  });

  function cleanBibleVerseText(raw: string): string {
    if (!raw) return '';
    return decodeHtmlEntities(raw, 2)
      .replace(/<[sS][^>]*>[\s\S]*?<\/[sS]>/gi, '')
      .replace(/<[fF][^>]*>[\s\S]*?<\/[fF]>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/(\p{L}+)\d{1,5}\b/gu, '$1')
      .replace(/\[\d{1,5}\]|\(\d{1,5}\)/g, '')
      .replace(/\s+/g, ' ')
      .replace(/\s+([,.;:?!])/g, '$1')
      .trim();
  }

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
            text: cleanBibleVerseText(item.text)
          }))
        : [];

      bibleChapterCache.set(cacheKey, verses);
      return res.json({ ok: true, verses });
    } catch (err: any) {
      console.error('Erreur /api/bible/chapter:', err);
      return res.status(500).json({ error: err.message || 'Erreur serveur Bible' });
    }
  });

  // Fetch YouTube video duration from watch page metadata (in-memory cached)
  const youtubeDurationCache = new Map<string, number>();

  function parseIso8601DurationSeconds(iso: string): number {
    const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
    if (!match) return 0;
    const hours = parseInt(match[1] || '0', 10);
    const mins = parseInt(match[2] || '0', 10);
    const secs = parseInt(match[3] || '0', 10);
    return hours * 3600 + mins * 60 + secs;
  }

  app.get('/api/youtube-duration', async (req, res) => {
    try {
      const rawUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
      const rawVideoId = typeof req.query.videoId === 'string' ? req.query.videoId.trim() : '';
      const videoId = rawVideoId && /^[a-zA-Z0-9_-]{11}$/.test(rawVideoId)
        ? rawVideoId
        : getYouTubeVideoId(rawUrl);

      if (!videoId) {
        return res.status(400).json({ ok: false, error: 'Lien ou ID YouTube invalide' });
      }

      if (youtubeDurationCache.has(videoId)) {
        const cachedSecs = youtubeDurationCache.get(videoId)!;
        return res.json({
          ok: true,
          videoId,
          seconds: cachedSecs,
          formatted: formatDurationToMMSS(cachedSecs)
        });
      }

      const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
      const response = await fetch(watchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8'
        },
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        return res.status(502).json({ ok: false, error: 'Impossible de joindre YouTube' });
      }

      const html = await response.text();
      let seconds = 0;

      const lengthMatch = html.match(/"lengthSeconds"\s*:\s*"(\d+)"/);
      if (lengthMatch) {
        seconds = parseInt(lengthMatch[1], 10);
      }
      if (!seconds || seconds <= 0) {
        const isoMatch = html.match(/itemprop=["']duration["']\s+content=["'](PT[^"']+)["']/i);
        if (isoMatch) {
          seconds = parseIso8601DurationSeconds(isoMatch[1]);
        }
      }
      if (!seconds || seconds <= 0) {
        const approxMatch = html.match(/"approxDurationMs"\s*:\s*"(\d+)"/);
        if (approxMatch) {
          seconds = Math.round(parseInt(approxMatch[1], 10) / 1000);
        }
      }

      if (!seconds || !Number.isFinite(seconds) || seconds <= 0) {
        return res.status(404).json({ ok: false, error: 'Durée YouTube indisponible' });
      }

      youtubeDurationCache.set(videoId, seconds);
      return res.json({
        ok: true,
        videoId,
        seconds,
        formatted: formatDurationToMMSS(seconds)
      });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err?.message || 'Erreur récupération durée YouTube' });
    }
  });

  const youtubeTitleCache = new Map<string, string>();

  app.get('/api/youtube-title', async (req, res) => {
    try {
      const rawUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
      const rawVideoId = typeof req.query.videoId === 'string' ? req.query.videoId.trim() : '';
      const videoId = rawVideoId && /^[a-zA-Z0-9_-]{11}$/.test(rawVideoId)
        ? rawVideoId
        : getYouTubeVideoId(rawUrl);

      if (!videoId) {
        return res.status(400).json({ ok: false, error: 'Lien ou ID YouTube invalide' });
      }

      if (youtubeTitleCache.has(videoId)) {
        return res.json({ ok: true, videoId, title: youtubeTitleCache.get(videoId) });
      }

      const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
      let title = '';

      try {
        const oembedRes = await fetch(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`,
          { signal: AbortSignal.timeout(4000) }
        );
        if (oembedRes.ok) {
          const data: any = await oembedRes.json();
          if (typeof data?.title === 'string' && data.title.trim()) {
            title = data.title.trim();
          }
        }
      } catch {}

      if (!title) {
        const pageRes = await fetch(watchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
          },
          signal: AbortSignal.timeout(5000)
        });
        if (pageRes.ok) {
          const html = await pageRes.text();
          const ogMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
          const titleTagMatch = html.match(/<title>([^<]+)<\/title>/i);
          const rawTitle = ogMatch?.[1] || titleTagMatch?.[1]?.replace(/\s*-\s*YouTube\s*$/i, '') || '';
          title = decodeHtmlEntities(rawTitle, 2).trim();
        }
      }

      if (!title) {
        return res.status(404).json({ ok: false, error: 'Titre YouTube indisponible' });
      }

      youtubeTitleCache.set(videoId, title);
      return res.json({ ok: true, videoId, title });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err?.message || 'Erreur récupération titre YouTube' });
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
      } else if (source === 'Cifra Club' || source === 'CifraClub') {
        const detail = await getCifraClubSongDetail(target);
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
        } else if (target.includes('cifraclub.com')) {
          const detail = await getCifraClubSongDetail(target);
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

      if (source === 'Cifra Club' || source === 'CifraClub') {
        const ccResults = await searchCifraClub(q, 35);
        return res.json({ results: ccResults, total: ccResults.length, source: 'Cifra Club' });
      }

      // 2. Direct search across all sites in parallel if source === 'all' or not specified
      if (!source || source === 'all') {
        const [shirRes, ugRes, wtRes, lcRes, ccRes] = await Promise.allSettled([
          searchShirSongs(q, 20),
          searchUltimateGuitar(q, 20),
          searchWorshipTogether(q, 20),
          searchLaCuerda(q, 15),
          searchCifraClub(q, 15)
        ]);

        const merged: any[] = [];
        if (shirRes.status === 'fulfilled') merged.push(...shirRes.value);
        if (ugRes.status === 'fulfilled') merged.push(...ugRes.value);
        if (wtRes.status === 'fulfilled') merged.push(...wtRes.value);
        if (lcRes.status === 'fulfilled') merged.push(...lcRes.value);
        if (ccRes.status === 'fulfilled') merged.push(...ccRes.value);

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

  // Traduction automatique de paroles de chants pour le mode projection (tokens gratuits Gemini)
  app.post('/api/translate-lyrics', async (req, res) => {
    try {
      const { title, sourceLanguage, targetLanguage, blocks } = req.body || {};

      if (!targetLanguage || typeof targetLanguage !== 'string' || !targetLanguage.trim()) {
        return res.status(400).json({ error: 'La langue cible est requise.' });
      }
      if (!Array.isArray(blocks) || blocks.length === 0) {
        return res.status(400).json({ error: 'Aucune parole à traduire.' });
      }

      const ai = getAIClient();
      if (!ai) {
        return res.status(500).json({ error: 'Clé API Gemini non configurée sur le serveur.' });
      }

      const sanitizedBlocks = blocks.map((b: any, idx: number) => ({
        index: idx,
        sectionTitle: String(b?.sectionTitle || 'Paroles'),
        lines: Array.isArray(b?.lines) ? b.lines.map((l: any) => String(l ?? '')) : []
      }));

      const prompt = `Traduis ce chant en ${targetLanguage.trim()}${sourceLanguage ? ` (langue source : ${sourceLanguage})` : ''}.
Titre original : ${String(title || 'Sans titre')}

Règles strictes :
1. Conserve le sens spirituel, poétique et chantable des paroles.
2. Pour chaque bloc (index 0 à ${sanitizedBlocks.length - 1}), renvoie EXACTEMENT le même nombre de lignes dans "lines" que dans le bloc d'entrée, dans le même ordre, pour que les sous-titres restent synchronisés ligne par ligne.
3. Ne mets aucun accord entre crochets [C] dans les paroles traduites.
4. Traduis aussi le titre dans "translatedTitle" et les noms de section (ex: Couplet 1 -> Verse 1, Refrain -> Chorus) dans la langue cible.

Blocs à traduire :
${JSON.stringify(sanitizedBlocks)}`;

      const candidateModels = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
      let rawText = '';
      let lastErr: any = null;

      for (const modelName of candidateModels) {
        try {
          const config: any = {
            systemInstruction:
              'Tu es un traducteur spécialisé en chants chrétiens, louange et cantiques. Tu réponds uniquement en JSON conforme au schéma demandé, en respectant exactement le nombre de blocs et le nombre de lignes par bloc.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                translatedTitle: {
                  type: Type.STRING,
                  description: 'Titre du chant traduit dans la langue cible.'
                },
                blocks: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      index: { type: Type.INTEGER },
                      sectionTitle: { type: Type.STRING },
                      lines: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                      }
                    },
                    required: ['sectionTitle', 'lines']
                  }
                }
              },
              required: ['translatedTitle', 'blocks']
            }
          };

          if (modelName === 'gemini-4-hydrogen') {
            config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
          }

          const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config
          });
          rawText = response.text || '';
          if (rawText) break;
        } catch (err: any) {
          lastErr = err;
          // Retry with next free-tier model on transient/quota errors
        }
      }

      if (!rawText) {
        const status = lastErr?.status || 500;
        const msg = lastErr?.message || 'Échec de la traduction IA Gemini.';
        return res.status(status >= 400 && status < 600 ? status : 500).json({ error: msg });
      }

      let parsed: any;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        const match = rawText.match(/\{[\s\S]*\}/);
        if (!match) {
          return res.status(502).json({ error: 'Réponse JSON invalide du modèle de traduction.' });
        }
        parsed = JSON.parse(match[0]);
      }

      const translatedBlocks = sanitizedBlocks.map((orig: any, idx: number) => {
        const candidate =
          (Array.isArray(parsed?.blocks)
            ? parsed.blocks.find((b: any) => b?.index === idx) || parsed.blocks[idx]
            : null) || {};
        const rawLines: string[] = Array.isArray(candidate.lines)
          ? candidate.lines.map((l: any) => String(l ?? '').trim())
          : [];
        const alignedLines = orig.lines.map((_: string, lineIdx: number) => rawLines[lineIdx] ?? '');
        return {
          sectionTitle: String(candidate.sectionTitle || orig.sectionTitle),
          originalLines: orig.lines,
          translatedLines: alignedLines
        };
      });

      return res.json({
        ok: true,
        translatedTitle: String(parsed?.translatedTitle || title || ''),
        blocks: translatedBlocks
      });
    } catch (err: any) {
      console.error('Erreur /api/translate-lyrics:', err);
      const status = err?.status && err.status >= 400 && err.status < 600 ? err.status : 500;
      return res.status(status).json({ error: err?.message || 'Erreur serveur lors de la traduction.' });
    }
  });

  // Alignement logique par IA entre un chant principal et un chant lié (structures différentes, mêmes paroles)
  app.post('/api/align-linked-lyrics', async (req, res) => {
    try {
      const {
        primaryTitle,
        primaryLanguage,
        primaryBlocks,
        secondaryTitle,
        secondaryLanguage,
        secondaryBlocks
      } = req.body || {};

      if (!Array.isArray(primaryBlocks) || primaryBlocks.length === 0) {
        return res.status(400).json({ error: 'Les blocs du chant principal sont requis.' });
      }
      if (!Array.isArray(secondaryBlocks) || secondaryBlocks.length === 0) {
        return res.status(400).json({ error: 'Les blocs du chant lié sont requis.' });
      }

      const ai = getAIClient();
      if (!ai) {
        return res.status(500).json({ error: 'Clé API Gemini non configurée sur le serveur.' });
      }

      const sanitizedPrimary = primaryBlocks.map((b: any, idx: number) => ({
        index: idx,
        sectionTitle: String(b?.sectionTitle || 'Paroles'),
        lines: Array.isArray(b?.lines) ? b.lines.map((l: any) => String(l ?? '')) : []
      }));

      const sanitizedSecondary = secondaryBlocks.map((b: any, idx: number) => ({
        index: idx,
        sectionTitle: String(b?.sectionTitle || 'Paroles'),
        lines: Array.isArray(b?.lines) ? b.lines.map((l: any) => String(l ?? '')) : []
      }));

      const prompt = `Tu es un expert en chants chrétiens multilingues et en synchronisation de paroles pour la projection bilingue.
Nous avons deux versions liées d'un même chant qui ont les mêmes paroles/sens mais une structure différente (sections dans un ordre différent, couplets fusionnés ou séparés, refrains répétés ou omis, découpage de lignes différent).

Chant principal (${String(primaryLanguage || 'Langue principale')}) : "${String(primaryTitle || 'Sans titre')}"
Chant lié (${String(secondaryLanguage || 'Langue secondaire')}) : "${String(secondaryTitle || 'Version liée')}"

Ta mission : pour CHAQUE bloc (index 0 à ${sanitizedPrimary.length - 1}) et CHAQUE ligne du chant principal, associe par logique et par sens les paroles correspondantes provenant du chant lié "${String(secondaryTitle || 'Version liée')}".

Règles strictes :
1. PRIORITÉ ABSOLUE aux paroles existantes du chant lié : réutilise exactement les phrases et le vocabulaire du chant lié dès que le sens correspond (même si la section ou l'ordre est différent).
2. Si le chant principal répète un refrain, un pont ou une section qui n'apparaît qu'une fois dans le chant lié, réutilise les paroles correspondantes du chant lié pour chaque occurrence.
3. Si une phrase du chant lié couvre 2 lignes du chant principal, divise-la naturellement en 2 lignes équilibrées. Inversement, si 2 courtes lignes du chant lié correspondent à 1 ligne du chant principal, combine-les proprement.
4. Pour chaque bloc (index 0 à ${sanitizedPrimary.length - 1}), le tableau "lines" retourné DOIT contenir EXACTEMENT le même nombre de lignes que primaryBlocks[index].lines, dans le même ordre exact (alignement 1-à-1).
5. Uniquement si une ligne du chant principal est totalement absente du chant lié, traduis-la fidèlement en ${String(secondaryLanguage || 'la langue du chant lié')} pour éviter un blanc.
6. Ne mets aucun accord entre crochets [C] dans les paroles.
7. Indique dans "sectionTitle" le nom de section dans la langue du chant lié (ex: Couplet 1, Refrain, Pont).

Chant principal (cible de structure) :
${JSON.stringify(sanitizedPrimary)}

Chant lié (source des paroles à réaligner) :
${JSON.stringify(sanitizedSecondary)}`;

      const candidateModels = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
      let rawText = '';
      let lastErr: any = null;

      for (const modelName of candidateModels) {
        try {
          const config: any = {
            systemInstruction:
              'Tu es un spécialiste de l’alignement bilingue de chants chrétiens. Tu réponds uniquement en JSON conforme au schéma demandé, en conservant exactement le nombre de blocs et le nombre exact de lignes par bloc du chant principal.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                blocks: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      index: { type: Type.INTEGER },
                      sectionTitle: { type: Type.STRING },
                      lines: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                      }
                    },
                    required: ['index', 'sectionTitle', 'lines']
                  }
                }
              },
              required: ['blocks']
            }
          };

          if (modelName === 'gemini-4-hydrogen') {
            config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
          }

          const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config
          });
          rawText = response.text || '';
          if (rawText) break;
        } catch (err: any) {
          lastErr = err;
        }
      }

      if (!rawText) {
        const status = lastErr?.status || 500;
        const msg = lastErr?.message || 'Échec de l’alignement IA Gemini.';
        return res.status(status >= 400 && status < 600 ? status : 500).json({ error: msg });
      }

      let parsed: any;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        const match = rawText.match(/\{[\s\S]*\}/);
        if (!match) {
          return res.status(502).json({ error: 'Réponse JSON invalide du modèle d’alignement.' });
        }
        parsed = JSON.parse(match[0]);
      }

      const alignedBlocks = sanitizedPrimary.map((orig: any, idx: number) => {
        const candidate =
          (Array.isArray(parsed?.blocks)
            ? parsed.blocks.find((b: any) => b?.index === idx) || parsed.blocks[idx]
            : null) || {};
        const rawLines: string[] = Array.isArray(candidate.lines)
          ? candidate.lines.map((l: any) => String(l ?? '').trim())
          : [];
        const alignedLines = orig.lines.map((_: string, lineIdx: number) => rawLines[lineIdx] ?? '');
        return {
          sectionTitle: String(candidate.sectionTitle || orig.sectionTitle),
          originalLines: orig.lines,
          translatedLines: alignedLines
        };
      });

      return res.json({
        ok: true,
        blocks: alignedBlocks
      });
    } catch (err: any) {
      console.error('Erreur /api/align-linked-lyrics:', err);
      const status = err?.status && err.status >= 400 && err.status < 600 ? err.status : 500;
      return res.status(status).json({ error: err?.message || 'Erreur serveur lors de l’alignement.' });
    }
  });

  // Désactiver la mise en cache HTTP agressive des navigateurs (Chrome / Brave) sur les pages, le SW et le manifeste de version
  app.use((req, res, next) => {
    if (
      req.path === '/' ||
      req.path === '/sw.js' ||
      req.path === '/version.json' ||
      req.path.endsWith('.html') ||
      req.path.startsWith('/@') ||
      req.path.startsWith('/src/')
    ) {
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
    const noStoreFiles = new Set(['index.html', 'sw.js', 'version.json', 'manifest.json']);
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (noStoreFiles.has(path.basename(filePath))) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      }
    }));
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur Melobook démarré sur http://localhost:${PORT}`);
  });
}

startServer();
