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

function decodeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&eacute;/g, 'é')
    .replace(/&egrave;/g, 'è')
    .replace(/&aacute;/g, 'á')
    .replace(/&iacute;/g, 'í')
    .replace(/&oacute;/g, 'ó')
    .replace(/&uacute;/g, 'ú')
    .replace(/&ntilde;/g, 'ñ');
}

/**
 * Searches LaCuerda.net directly for Spanish worship and songs
 */
export async function searchLaCuerda(query: string, limit = 25): Promise<ExternalSongItem[]> {
  try {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    // Try song search first (canc=1), then artist search (canc=0)
    const searchUrl = `https://acordes.lacuerda.net/busca.php?canc=1&exp=${encodeURIComponent(cleanQuery)}`;
    const res = await fetch(searchUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
        'Accept-Language': 'es-ES,es;q=0.9,fr;q=0.8,en;q=0.7'
      }
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`LaCuerda returned HTTP ${res.status}`);
      return [];
    }

    const html = await res.text();
    const artistMatches = [...html.matchAll(/<a[^>]+href=["']\/([a-zA-Z0-9_-]+)\/["'][^>]*>([\s\S]*?)<\/a>/gi)];

    const candidateArtists: { slug: string; name: string }[] = [];
    const seenArtists = new Set<string>();

    for (const match of artistMatches) {
      const slug = match[1];
      const name = decodeHtml(match[2].replace(/<[^>]+>/g, '')).trim();

      if (!slug || slug === 'tabs' || seenArtists.has(slug)) continue;
      seenArtists.add(slug);
      candidateArtists.push({ slug, name });
    }

    // If no artist found via canc=1, try canc=0
    if (candidateArtists.length === 0) {
      const fallbackUrl = `https://acordes.lacuerda.net/busca.php?canc=0&exp=${encodeURIComponent(cleanQuery)}`;
      const fbRes = await fetch(fallbackUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)'
        }
      });
      if (fbRes.ok) {
        const fbHtml = await fbRes.text();
        const fbMatches = [...fbHtml.matchAll(/<a[^>]+href=["']\/([a-zA-Z0-9_-]+)\/["'][^>]*>([\s\S]*?)<\/a>/gi)];
        for (const match of fbMatches) {
          const slug = match[1];
          const name = decodeHtml(match[2].replace(/<[^>]+>/g, '')).trim();
          if (!slug || slug === 'tabs' || seenArtists.has(slug)) continue;
          seenArtists.add(slug);
          candidateArtists.push({ slug, name });
        }
      }
    }

    if (candidateArtists.length === 0) return [];

    // Query top artists (up to 4 artists) to find matching song links
    const results: ExternalSongItem[] = [];
    const seenSongUrls = new Set<string>();
    const normalizedQuery = cleanQuery.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    for (const artist of candidateArtists.slice(0, 4)) {
      try {
        const artistPageUrl = `https://acordes.lacuerda.net/${artist.slug}/`;
        const artistRes = await fetch(artistPageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (!artistRes.ok) continue;

        const artistHtml = await artistRes.text();
        const songLinks = [...artistHtml.matchAll(/<a[^>]+href=["']([a-zA-Z0-9_-]+)["'][^>]*>([\s\S]*?)<\/a>/gi)];

        for (const sMatch of songLinks) {
          const songSlug = sMatch[1];
          let songTitle = decodeHtml(sMatch[2].replace(/<[^>]+>/g, '')).trim();
          songTitle = songTitle.replace(/\s*acordes\s*$/i, '').trim();

          // Skip non-song internal links
          if (!songSlug || songSlug.startsWith('http') || songSlug.includes('javascript')) continue;

          const normalizedTitle = songTitle.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const normalizedSlug = songSlug.toLowerCase().replace(/_/g, ' ');

          // Match query if specific song, or take artist's top songs
          const isMatch = normalizedTitle.includes(normalizedQuery) ||
                          normalizedSlug.includes(normalizedQuery) ||
                          normalizedQuery.includes(artist.slug.replace(/_/g, ' '));

          if (!isMatch && candidateArtists.length > 1) continue;

          const songUrl = `https://acordes.lacuerda.net/${artist.slug}/${songSlug}`;
          if (seenSongUrls.has(songUrl)) continue;
          seenSongUrls.add(songUrl);

          results.push({
            id: `lc-${artist.slug}-${songSlug}`,
            title: songTitle || songSlug.replace(/_/g, ' '),
            artist: artist.name || 'Artiste LaCuerda',
            source: 'LaCuerda',
            key: 'C',
            tempo: 80,
            timeSignature: '4/4',
            tags: ['Espagnol', 'Alabanza', 'Guitare'],
            snippet: `Partition guitare et accords espagnols sur LaCuerda.net`,
            contentChordPro: '', // loaded on demand
            tabUrl: songUrl,
            pageTitle: songUrl
          });

          if (results.length >= limit) break;
        }

        if (results.length >= limit) break;
      } catch (e) {
        console.warn(`Error fetching artist ${artist.slug}:`, e);
      }
    }

    return results;
  } catch (err: any) {
    console.warn('Erreur searchLaCuerda:', err?.message || err);
    return [];
  }
}

/**
 * Fetches the song tab from LaCuerda and formats into ChordPro
 */
export async function getLaCuerdaSongDetail(songUrl: string): Promise<Partial<ExternalSongItem> | null> {
  try {
    if (!songUrl || !songUrl.startsWith('http')) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(songUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)'
      }
    });

    clearTimeout(timeout);

    if (!res.ok) return null;

    const html = await res.text();
    const preMatch = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
    if (!preMatch || !preMatch[1]) return null;

    // Extract title & artist from HTML
    const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
                       html.match(/<title>([\s\S]*?)<\/title>/i);
    let title = 'Chant';
    let artist = 'Artiste';

    if (titleMatch) {
      const cleanH1 = decodeHtml(titleMatch[1].replace(/<[^>]+>/g, '')).trim();
      const parts = cleanH1.split(/,\s*acordes\s+de\s+|,\s*tabs\s+de\s+|:\s*|\s*-\s*/i);
      if (parts.length >= 2) {
        title = parts[0].trim();
        artist = parts[1].replace(/acordes|tabs/gi, '').trim();
      } else {
        title = cleanH1;
      }
    }

    const rawTab = preMatch[1];

    // Detect tonality if mentioned like "Tono: C" or "Tono: Sol"
    const tonoMatch = rawTab.match(/Tono:\s*([A-G][b#]?[m]?|Do|Ré|Mi|Fa|Sol|La|Si)/i);
    let key = 'C';
    if (tonoMatch) {
      key = tonoMatch[1].trim();
      if (key === 'Do') key = 'C';
      if (key === 'Ré') key = 'D';
      if (key === 'Mi') key = 'E';
      if (key === 'Fa') key = 'F';
      if (key === 'Sol') key = 'G';
      if (key === 'La') key = 'A';
      if (key === 'Si') key = 'B';
    }

    // Convert <A>Chord</A> into [Chord]
    let formattedText = rawTab
      .replace(/<A>([^<]+)<\/A>/gi, '[$1]')
      .replace(/<[^>]+>/g, '');

    // Format section lines
    formattedText = formattedText.replace(/^(Intro|Coro|Verso|Estrofa|Puente|Final|Pre-coro|Outro|Solo):?/gim, '\n{comment: $1}');

    const lines = formattedText.split('\n');
    const cleanedLines = lines.map(line => decodeHtml(line)).join('\n');

    const metadataHeader = [
      `{title: ${title}}`,
      `{artist: ${artist}}`,
      `{key: ${key}}`,
      `{source: LaCuerda}`
    ].join('\n');

    const contentChordPro = `${metadataHeader}\n\n${cleanedLines.trim()}`;

    return {
      title,
      artist,
      key,
      contentChordPro
    };
  } catch (err: any) {
    console.warn('Erreur getLaCuerdaSongDetail:', err?.message || err);
    return null;
  }
}
