export interface ExternalSongItem {
  id: string;
  title: string;
  artist: string;
  source: string;
  key: string;
  tempo: number;
  timeSignature: string;
  tags: string[];
  snippet: string;
  contentChordPro: string;
  tabUrl?: string;
  pageTitle?: string;
}

function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&eacute;/g, 'é')
    .replace(/&egrave;/g, 'è')
    .replace(/&ecirc;/g, 'ê')
    .replace(/&agrave;/g, 'à')
    .replace(/&icirc;/g, 'î')
    .replace(/&ocirc;/g, 'ô')
    .replace(/&ucirc;/g, 'û')
    .replace(/&ccedil;/g, 'ç')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
}

/**
 * Searches Ultimate Guitar directly via its web repository store
 */
export async function searchUltimateGuitar(query: string, limit = 25): Promise<ExternalSongItem[]> {
  try {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    const url = `https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(cleanQuery)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`Ultimate Guitar search returned HTTP ${res.status}`);
      return [];
    }

    const html = await res.text();
    const storeMatch = html.match(/class=["']js-store["'][^>]*data-content=["']([^"']*)["']/);
    if (!storeMatch || !storeMatch[1]) {
      return [];
    }

    const decoded = decodeHtmlEntities(storeMatch[1]);
    let parsed: any = null;
    try {
      parsed = JSON.parse(decoded);
    } catch {
      return [];
    }

    const rawResults = parsed?.store?.page?.data?.results || [];
    if (!Array.isArray(rawResults)) return [];

    // Filter to valid guitar/chords items
    const validItems = rawResults.filter((r: any) => 
      r && 
      r.song_name && 
      r.tab_url && 
      (r.type === 'Chords' || r.type === 'Pro' || r.type === 'Tabs' || !r.type)
    );

    // Sort: prioritize Chords and higher ratings
    validItems.sort((a: any, b: any) => {
      if (a.type === 'Chords' && b.type !== 'Chords') return -1;
      if (b.type === 'Chords' && a.type !== 'Chords') return 1;
      return (b.votes || 0) - (a.votes || 0);
    });

    const results: ExternalSongItem[] = [];
    const seenTitles = new Set<string>();

    for (const item of validItems.slice(0, limit)) {
      const title = decodeHtmlEntities(item.song_name || '').trim();
      const artist = decodeHtmlEntities(item.artist_name || 'Artiste').trim();
      const dedupeKey = `${title.toLowerCase()}_${artist.toLowerCase()}_${item.version || 1}`;

      if (seenTitles.has(dedupeKey)) continue;
      seenTitles.add(dedupeKey);

      const ratingText = item.rating ? `Note : ${Number(item.rating).toFixed(1)} / 5 • ${item.votes || 0} avis` : 'Partition Guitare';
      const keyVal = item.tonality_name || '';
      const versionTag = item.version ? `v${item.version}` : '';

      results.push({
        id: `ug-${item.id || Math.random().toString(36).substring(2, 9)}`,
        title,
        artist,
        source: 'Ultimate Guitar',
        key: keyVal,
        tempo: item.bpm || 0,
        timeSignature: '4/4',
        tags: ['Guitare', item.type || 'Chords', versionTag].filter(Boolean),
        snippet: ratingText,
        contentChordPro: '', // loaded on demand
        tabUrl: item.tab_url,
        pageTitle: item.tab_url
      });
    }

    return results;
  } catch (err: any) {
    console.warn('Erreur searchUltimateGuitar:', err?.message || err);
    return [];
  }
}

/**
 * Fetches full chords for an Ultimate Guitar tab and formats to standard ChordPro
 */
export async function getUltimateGuitarSongDetail(tabUrl: string): Promise<Partial<ExternalSongItem> | null> {
  try {
    if (!tabUrl || !tabUrl.startsWith('http')) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(tabUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    clearTimeout(timeout);

    if (!res.ok) return null;

    const html = await res.text();
    const storeMatch = html.match(/class=["']js-store["'][^>]*data-content=["']([^"']*)["']/);
    if (!storeMatch || !storeMatch[1]) return null;

    const decoded = decodeHtmlEntities(storeMatch[1]);
    const parsed = JSON.parse(decoded);

    const pageData = parsed?.store?.page?.data;
    const tabView = pageData?.tab_view;
    const rawContent = tabView?.wiki_tab?.content || '';

    if (!rawContent) return null;

    const title = decodeHtmlEntities(pageData?.tab?.song_name || '').trim();
    const artist = decodeHtmlEntities(pageData?.tab?.artist_name || '').trim();
    const tonality = tabView?.meta?.tonality || pageData?.tab?.tonality_name || 'C';
    const tempo = tabView?.meta?.tempo || 0;

    // Convert Ultimate Guitar markup into ChordPro
    let chordPro = rawContent
      // Replace [ch]Chord[/ch] with [Chord]
      .replace(/\[ch\](.*?)\[\/ch\]/gi, '[$1]')
      // Strip tab formatting tags
      .replace(/\[\/?tab\]/gi, '')
      .replace(/\[\/?t\]/gi, '');

    // Format section headers like [Verse 1], [Chorus]
    chordPro = chordPro.replace(/^\[(Intro|Couplet|Verse|Refrain|Chorus|Pont|Bridge|Outro|Pre-Chorus|Tag)[^\]]*\]/gim, (match) => {
      const sectionName = match.replace(/[\[\]]/g, '');
      return `\n{comment: ${sectionName}}`;
    });

    const metadataHeader = [
      title ? `{title: ${title}}` : '',
      artist ? `{artist: ${artist}}` : '',
      tonality ? `{key: ${tonality}}` : '',
      tempo > 0 ? `{tempo: ${tempo}}` : '',
      `{source: Ultimate Guitar}`
    ].filter(Boolean).join('\n');

    const finalChordPro = `${metadataHeader}\n\n${chordPro.trim()}`;

    return {
      title,
      artist,
      key: tonality,
      tempo: Number(tempo) || 0,
      contentChordPro: finalChordPro
    };
  } catch (err: any) {
    console.warn('Erreur getUltimateGuitarSongDetail:', err?.message || err);
    return null;
  }
}
