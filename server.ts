import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

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

  // Search external songs via live web / AI
  app.post('/api/external-search', async (req, res) => {
    try {
      const { query, source } = req.body;
      if (!query || typeof query !== 'string' || !query.trim()) {
        return res.status(400).json({ error: 'Le terme de recherche est requis' });
      }

      const q = query.trim();
      const ai = getAIClient();

      if (!ai) {
        return res.json({ results: [] });
      }

      const prompt = `Tu es un expert musicologue et chef de louange spécialisé dans la transcription musicale au format ChordPro pour les répertoires francophones (Shir.fr, JEM, Cantiques), anglophones (WorshipTogether, CCLI, Ultimate Guitar, PraiseCharts) et hispanophones (LaCuerda).

L'utilisateur recherche des partitions d'accords pour : "${q}" (source souhaitée : ${source || 'Toutes les sources'}).

Renvoie une liste JSON de 1 à 4 chants correspondants les plus pertinents au format JSON strict suivant :
[
  {
    "id": "ext-ai-unique-id",
    "title": "Titre officiel du chant",
    "artist": "Auteur / Compositeur / Groupe original",
    "source": "Shir.fr",
    "key": "G",
    "tempo": 72,
    "timeSignature": "4/4",
    "tags": ["Louange", "Adoration"],
    "snippet": "Extrait des premières paroles...",
    "contentChordPro": "{title: ...}\\n{artist: ...}\\n{key: ...}\\n{tempo: ...}\\n\\n{c: Couplet 1}\\n[G]Voici les paroles avec accords bien placés..."
  }
]

RÈGLES CRUCIALES :
- Le champ "contentChordPro" doit contenir l'intégralité du chant avec les accords entre crochets [G], [Em], [C], [D] placés sur les paroles.
- Utilise les balises ChordPro standard : {title: ...}, {artist: ...}, {key: ...}, {tempo: ...}, {c: Couplet 1}, {c: Refrain}, {c: Pont}.
- Réponds UNIQUEMENT avec un JSON valide, sans balises markdown backticks.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          temperature: 0.2,
          responseMimeType: 'application/json'
        }
      });

      const rawText = response.text || '[]';
      let results = [];
      try {
        results = JSON.parse(rawText);
      } catch {
        const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
        results = JSON.parse(cleaned);
      }

      return res.json({ results });
    } catch (error: any) {
      console.error('Erreur API external-search:', error);
      return res.status(500).json({ error: error.message || 'Erreur lors de la recherche en ligne' });
    }
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
