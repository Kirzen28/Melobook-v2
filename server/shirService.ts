import http from 'http';
import https from 'https';

export interface ShirSearchResult {
  id: string;
  title: string;
  artist: string;
  source: 'Shir.fr';
  key: string;
  tempo: number;
  timeSignature: string;
  tags: string[];
  snippet: string;
  contentChordPro: string;
  url: string;
  pageTitle: string;
}

function fetchHttp(url: string, timeoutMs = 6000): Promise<string> {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    const options: any = {
      timeout: timeoutMs,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Melobook/1.0; +https://songbook.pro)',
        'Accept': 'application/json, text/html, */*'
      }
    };
    if (isHttps) {
      options.rejectUnauthorized = false;
    }

    const req = client.get(url, options, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchHttp(res.headers.location, timeoutMs).then(resolve).catch(reject);
      }
      if (res.statusCode && res.statusCode >= 400) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout de connexion'));
    });
    req.on('error', reject);
  });
}

/**
 * Parses Shir.fr HTML representation of a song into clean ChordPro format
 */
export function parseShirSongHtml(html: string, pageTitle: string) {
  let title = pageTitle;
  let artist = 'Inconnu';

  // Extract author and title from pageTitle: "Titre — Artiste 1 – Artiste 2"
  const emDashIdx = pageTitle.indexOf('—');
  if (emDashIdx !== -1) {
    title = pageTitle.substring(0, emDashIdx).trim();
    artist = pageTitle.substring(emDashIdx + 1).replace(/[–-]/g, ', ').replace(/\s+/g, ' ').trim();
  } else if (pageTitle.includes(' - ')) {
    const parts = pageTitle.split(' - ');
    title = parts[0].trim();
    artist = parts.slice(1).join(', ').trim();
  } else {
    const subMatch = html.match(/<p class="songsubtitle"><b>(.*?)<\/b><\/p>/i);
    if (subMatch) {
      artist = subMatch[1].replace(/<[^>]+>/g, '').replace(/[–-]/g, ', ').replace(/\s+/g, ' ').trim();
    }
  }

  // Extract key
  const keyMatch = html.match(/<span class="songcommentbox">([^<]+)<\/span>/i);
  let key = keyMatch ? keyMatch[1].trim() : 'C';
  // Standardize key format (e.g. C, D, Em, G)
  key = key.replace(/[^A-Ga-g#b\/\s]/g, '').trim() || 'C';

  // Extract tempo
  let tempo = 100;
  const tempoMatch = html.match(/(\d{2,3})\s*(?:bpm|noir|noires)/i);
  if (tempoMatch) {
    tempo = parseInt(tempoMatch[1], 10);
  }

  // Extract tags / categories
  const tags: string[] = ['Louange'];
  const catMatches = [...html.matchAll(/title="Catégorie:([^"]+)"/gi)];
  catMatches.forEach(m => {
    const catName = m[1].replace(/_/g, ' ').trim();
    if (catName && !catName.startsWith('DNL') && !catName.startsWith('Chant') && catName.length < 25) {
      if (!tags.includes(catName)) tags.push(catName);
    }
  });
  if (tags.length === 1) tags.push('Adoration');

  // Convert songline tables and chorus blocks to ChordPro
  const chordProLines: string[] = [
    `{title: ${title}}`,
    `{artist: ${artist}}`,
    `{key: ${key}}`,
    `{tempo: ${tempo}}`,
    `{time: 4/4}`,
    ''
  ];

  let snippet = '';

  const blocks = [...html.matchAll(/<div class="songchorus">|<\/div>|<div class="songcomment">([\s\S]*?)<\/div>|<table[^>]*class="songline"[^>]*>([\s\S]*?)<\/table>/gi)];

  let inChorus = false;

  for (const b of blocks) {
    const raw = b[0];
    if (raw.includes('class="songchorus"')) {
      inChorus = true;
      chordProLines.push('{c: Refrain}');
    } else if (raw === '</div>' && inChorus) {
      inChorus = false;
      chordProLines.push('');
    } else if (b[1]) {
      const comm = b[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&#160;/g, ' ').trim();
      if (comm && !comm.startsWith('©') && !comm.startsWith('shir.fr') && !/^[A-G][#b]?m?$/.test(comm) && comm.length < 50) {
        chordProLines.push(`{c: ${comm}}`);
      }
    } else if (b[2]) {
      const table = b[2];
      const chordsMatch = table.match(/<tr class="songlyricchord">([\s\S]*?)<\/tr>/i);
      const lyricsMatch = table.match(/<tr class="songlyricline">([\s\S]*?)<\/tr>/i);

      if (chordsMatch && lyricsMatch) {
        const chordTds = [...chordsMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(td => td[1].replace(/<[^>]+>/g, '').trim());
        const lyricTds = [...lyricsMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(td => td[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&#160;/g, ' '));

        let merged = '';
        const len = Math.max(chordTds.length, lyricTds.length);
        for (let i = 0; i < len; i++) {
          const c = chordTds[i] || '';
          const l = lyricTds[i] || '';
          if (c) {
            merged += `[${c}]${l}`;
          } else {
            merged += l;
          }
        }
        const trimmed = merged.trim();
        if (trimmed) {
          chordProLines.push(trimmed);
          if (!snippet) {
            const pureLyric = trimmed.replace(/\[[^\]]+\]/g, '').trim();
            if (pureLyric.length > 8) {
              snippet = pureLyric.substring(0, 100);
            }
          }
        }
      }
    }
  }

  return {
    title,
    artist,
    key,
    tempo,
    tags,
    snippet,
    contentChordPro: chordProLines.join('\n')
  };
}

/**
 * Fetch and parse a single song details from Shir.fr
 */
export async function getShirSongDetail(pageTitle: string): Promise<any> {
  try {
    const parseUrl = `http://shir.fr/w/api.php?action=parse&page=${encodeURIComponent(pageTitle)}&format=json`;
    const raw = await fetchHttp(parseUrl);
    const data = JSON.parse(raw);
    if (!data?.parse?.text?.['*']) {
      return null;
    }
    const html = data.parse.text['*'];
    return parseShirSongHtml(html, pageTitle);
  } catch (err) {
    console.warn(`Impossible de parser le chant Shir.fr "${pageTitle}":`, err);
    return null;
  }
}

/**
 * Search Shir.fr using their live MediaWiki API
 */
export async function searchShirSongs(query: string, limit = 40): Promise<ShirSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // MediaWiki search query
  const searchUrl = `http://shir.fr/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(trimmed)}&srlimit=${limit}&format=json`;

  try {
    const raw = await fetchHttp(searchUrl);
    const data = JSON.parse(raw);
    const items = data?.query?.search || [];

    if (!Array.isArray(items) || items.length === 0) {
      return [];
    }

    // Process all search results
    const results: ShirSearchResult[] = items.map((it: any, idx: number) => {
      const pageTitle = it.title as string;
      let title = pageTitle;
      let artist = 'Shir.fr';

      const emDashIdx = pageTitle.indexOf('—');
      if (emDashIdx !== -1) {
        title = pageTitle.substring(0, emDashIdx).trim();
        artist = pageTitle.substring(emDashIdx + 1).replace(/[–-]/g, ', ').replace(/\s+/g, ' ').trim();
      }

      const cleanSnippet = (it.snippet || '').replace(/<[^>]+>/g, '').trim();

      return {
        id: `shir-${it.pageid || idx}-${encodeURIComponent(title).slice(0, 20)}`,
        title,
        artist,
        source: 'Shir.fr',
        key: 'C',
        tempo: 100,
        timeSignature: '4/4',
        tags: ['Louange', 'Adoration'],
        snippet: cleanSnippet || `Chant de louange issu du répertoire Shir.fr`,
        contentChordPro: '',
        url: `http://shir.fr/wiki/${encodeURIComponent(pageTitle)}`,
        pageTitle
      };
    });

    // Concurrently fetch full ChordPro details for the top 6 results to make preview instant
    const topCount = Math.min(results.length, 6);
    const detailPromises = results.slice(0, topCount).map(async (resItem) => {
      const detail = await getShirSongDetail(resItem.pageTitle);
      if (detail) {
        resItem.title = detail.title || resItem.title;
        resItem.artist = detail.artist || resItem.artist;
        resItem.key = detail.key || resItem.key;
        resItem.tempo = detail.tempo || resItem.tempo;
        resItem.tags = detail.tags || resItem.tags;
        if (detail.snippet) resItem.snippet = detail.snippet;
        resItem.contentChordPro = detail.contentChordPro;
      }
    });

    await Promise.allSettled(detailPromises);

    return results;
  } catch (error) {
    console.error('Erreur lors de la recherche sur Shir.fr:', error);
    return [];
  }
}
