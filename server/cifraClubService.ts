import { decodeHtmlEntities, decodeTextBuffer } from '../src/utils/htmlEntities';
import { cleanImportedChordPro, mergeTaggedChordsAboveLyrics } from '../src/utils/chordUtils';
import type { ExternalSongItem } from './laCuerdaService';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const decodeHtml = (str: string) => decodeHtmlEntities(str, 2);

/**
 * Searches Cifra Club directly via its public Solr search endpoint
 */
export async function searchCifraClub(query: string, limit = 25): Promise<ExternalSongItem[]> {
  try {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const searchUrl = `https://solr.sscdn.co/cc/search/?q=${encodeURIComponent(cleanQuery)}`;
    const res = await fetch(searchUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT }
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`Cifra Club search returned HTTP ${res.status}`);
      return [];
    }

    const rawText = decodeTextBuffer(await res.arrayBuffer(), res.headers.get('content-type'));
    const jsonText = rawText.trim().replace(/^suggest_callback\(/, '').replace(/\);?\s*$/, '');
    const parsed = JSON.parse(jsonText);
    const docs: any[] = Array.isArray(parsed?.response?.docs) ? parsed.response.docs : [];

    const results: ExternalSongItem[] = [];
    const seen = new Set<string>();

    for (const doc of docs) {
      if (doc?.t !== '2' || !doc.dns || !doc.url || !doc.txt) continue;

      const keyPath = `${doc.dns}/${doc.url}`;
      if (seen.has(keyPath)) continue;
      seen.add(keyPath);

      const title = decodeHtml(String(doc.txt)).trim();
      const artist = decodeHtml(String(doc.art || 'Artiste Cifra Club')).trim();
      const album = doc.alname ? decodeHtml(String(doc.alname)).trim() : '';
      const rawLyrics = doc.letra ? decodeHtml(String(doc.letra)).replace(/\s+/g, ' ').trim() : '';
      const snippet = rawLyrics
        ? (rawLyrics.length > 110 ? `${rawLyrics.slice(0, 107)}...` : rawLyrics)
        : 'Partition et accords sur CifraClub.com';
      const detailUrl = `https://www.cifraclub.com/${doc.dns}/${doc.url}/imprimir.html`;

      results.push({
        id: `cc-${doc.id || keyPath}`,
        title,
        artist,
        source: 'Cifra Club',
        key: '',
        tempo: 0,
        timeSignature: '4/4',
        tags: ['Cifras', 'Guitare', album].filter(Boolean),
        snippet,
        contentChordPro: '',
        tabUrl: detailUrl,
        pageTitle: detailUrl
      });

      if (results.length >= limit) break;
    }

    return results;
  } catch (err: any) {
    console.warn('Erreur searchCifraClub:', err?.message || err);
    return [];
  }
}

function normalizeCifraClubPrintUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    if (!/(^|\.)cifraclub\.com(\.br)?$/i.test(parsed.hostname)) {
      return null;
    }
    let cleanPath = parsed.pathname.replace(/\/imprimir(\.html)?\/?$/i, '');
    if (!cleanPath.endsWith('/')) cleanPath += '/';
    return `https://${parsed.hostname}${cleanPath}imprimir.html`;
  } catch {
    return null;
  }
}

/**
 * Fetches full chords for a Cifra Club song and formats into standard ChordPro
 */
export async function getCifraClubSongDetail(songUrl: string): Promise<Partial<ExternalSongItem> | null> {
  try {
    const primaryUrl = normalizeCifraClubPrintUrl(songUrl);
    if (!primaryUrl) return null;

    const candidateUrls = [primaryUrl];
    if (primaryUrl.includes('www.cifraclub.com/')) {
      candidateUrls.push(primaryUrl.replace('www.cifraclub.com/', 'www.cifraclub.com.br/'));
    }

    let html = '';
    for (const url of candidateUrls) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const res = await fetch(url, {
          signal: controller.signal,
          headers: { 'User-Agent': USER_AGENT }
        });
        if (res.ok) {
          html = decodeTextBuffer(await res.arrayBuffer(), res.headers.get('content-type'));
          if (/<pre[^>]*>/i.test(html)) break;
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    if (!html) return null;

    const preMatch = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
    if (!preMatch || !preMatch[1]) return null;

    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const h2Match = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
    const title = h1Match ? decodeHtml(h1Match[1].replace(/<[^>]+>/g, '')).trim() : 'Chant';
    const artist = h2Match ? decodeHtml(h2Match[1].replace(/<[^>]+>/g, '')).trim() : 'Artiste';

    const bodyStart = html.indexOf('<body');
    const preIndex = html.indexOf('<pre');
    const headerSlice = html.slice(bodyStart >= 0 ? bodyStart : 0, preIndex >= 0 ? preIndex : html.length);
    const headerText = decodeHtml(headerSlice.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');

    const keyMatch = headerText.match(/(?:Key|Tom|Tonalidad|Tonalidade)\s*:\s*([A-G][b#]?(?:m|min|maj|dim|aug)?)/i);
    const key = keyMatch ? keyMatch[1].trim() : 'C';

    const bpmMatch = headerText.match(/\b(\d{2,3})\s*bpm\b/i);
    const tempo = bpmMatch ? parseInt(bpmMatch[1], 10) : 0;

    // Convert <b>Chord</b> to <A>Chord</A> so mergeTaggedChordsAboveLyrics aligns chords above lyrics
    const taggedPre = preMatch[1]
      .replace(/<b\b[^>]*>([\s\S]*?)<\/b>/gi, '<A>$1</A>')
      .replace(/<(?!\/?A\b)[^>]+>/gi, '');

    let chordPro = mergeTaggedChordsAboveLyrics(taggedPre, 'lacuerda');

    // Convert Cifra Club [Section] markers into ChordPro {comment: ...}
    chordPro = chordPro
      .split('\n')
      .map((line) => {
        const decodedLine = decodeHtml(line);
        const sectionOnly = decodedLine.match(/^\[([A-Za-zÀ-ÿ0-9\s\-–—/]{2,40})\]$/);
        if (sectionOnly) {
          return `{comment: ${sectionOnly[1].trim()}}`;
        }
        const sectionPrefix = decodedLine.match(/^\[(Intro|Solo|Outro|Final|Pre-?Chorus|Chorus|Refr[aã]o|Estribillo|Pont|Ponte|Puente|Bridge|Primera Parte|First Part|Parte \d+|Primeira Parte|Segunda Parte|Terceira Parte)\]\s+(.+)$/i);
        if (sectionPrefix) {
          return `{comment: ${sectionPrefix[1].trim()}}\n${sectionPrefix[2]}`;
        }
        return decodedLine;
      })
      .join('\n');

    const metadataHeader = [
      title ? `{title: ${title}}` : '',
      artist ? `{artist: ${artist}}` : '',
      key ? `{key: ${key}}` : '',
      tempo > 0 ? `{tempo: ${tempo}}` : '',
      `{source: Cifra Club}`
    ].filter(Boolean).join('\n');

    const contentChordPro = cleanImportedChordPro(`${metadataHeader}\n${chordPro}`);

    return {
      title,
      artist,
      key,
      tempo,
      contentChordPro
    };
  } catch (err: any) {
    console.warn('Erreur getCifraClubSongDetail:', err?.message || err);
    return null;
  }
}
