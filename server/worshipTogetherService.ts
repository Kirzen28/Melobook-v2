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
    .replace(/&nbsp;/g, ' ');
}

/**
 * Searches Worship Together directly via their Cludo Search Engine
 */
export async function searchWorshipTogether(query: string, limit = 25): Promise<ExternalSongItem[]> {
  try {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    const customerId = 10000995;
    const engineId = 10001572;
    const siteKey = Buffer.from(`${customerId}:${engineId}:SearchKey`).toString('base64');
    const apiUrl = `https://api-us1.cludo.com/api/v3/${customerId}/${engineId}/search`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(apiUrl, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `SiteKey ${siteKey}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      body: JSON.stringify({
        query: cleanQuery,
        perPage: limit
      })
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`Worship Together API returned HTTP ${res.status}`);
      return [];
    }

    const data = await res.json();
    const docs = data?.TypedDocuments || [];
    if (!Array.isArray(docs)) return [];

    const results: ExternalSongItem[] = [];
    const seenUrls = new Set<string>();

    for (const doc of docs) {
      const fields = doc.Fields || {};
      const url = fields.Url?.Value || '';
      
      // Keep only song resources
      const isSong = fields.Category?.Value === 'Songs' || url.includes('/songs/');
      if (!isSong || !url || seenUrls.has(url)) continue;
      seenUrls.add(url);

      const title = decodeHtml(fields.Title?.Value || '').trim();
      if (!title) continue;

      const artist = decodeHtml(
        fields.WorshipLeader?.Value || 
        fields.Writer?.Value || 
        'Worship Together'
      ).trim();

      const keyVal = fields.OriginalKey?.Value || (fields.RecommendedKey?.Values?.[0] || 'C');
      
      // Parse tempo
      let tempoVal = 80;
      const rawTempo = (fields.Tempo?.Value || '').toLowerCase();
      if (rawTempo.includes('fast')) tempoVal = 125;
      else if (rawTempo.includes('medium')) tempoVal = 95;
      else if (rawTempo.includes('slow')) tempoVal = 72;
      else if (parseInt(rawTempo, 10)) tempoVal = parseInt(rawTempo, 10);

      // Themes / tags
      const rawThemes = fields.Theme?.Values || [];
      const tags = ['Worship', ...rawThemes.map((t: string) => decodeHtml(t).trim())].slice(0, 4);

      // Extract brief lyric snippet from Description
      let snippet = '';
      if (fields.Description?.Value) {
        snippet = decodeHtml(fields.Description.Value)
          .replace(/\s+/g, ' ')
          .replace(/^(Intro|Verse 1|Couplet 1),?\s*/i, '')
          .slice(0, 110)
          .trim();
      }

      results.push({
        id: `wt-${Math.random().toString(36).substring(2, 9)}`,
        title,
        artist,
        source: 'WorshipTogether',
        key: keyVal,
        tempo: tempoVal,
        timeSignature: '4/4',
        tags,
        snippet: snippet || 'Chant et partition officielle Worship Together',
        contentChordPro: '', // loaded on demand
        tabUrl: url,
        pageTitle: url
      });
    }

    return results;
  } catch (err: any) {
    console.warn('Erreur searchWorshipTogether:', err?.message || err);
    return [];
  }
}

/**
 * Fetches the chords & lyrics directly from a Worship Together song page
 */
export async function getWorshipTogetherSongDetail(songUrl: string): Promise<Partial<ExternalSongItem> | null> {
  try {
    if (!songUrl || !songUrl.startsWith('http')) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(songUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    clearTimeout(timeout);

    if (!res.ok) return null;

    const html = await res.text();

    // Extract title & artist from meta tags or headings
    const titleMatch = html.match(/<meta property=["']og:title["'] content=["']([^"']*)["']/i) ||
                       html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const title = titleMatch ? decodeHtml(titleMatch[1].replace(/<[^>]+>/g, '').trim()) : 'Chant';

    const artistMatch = html.match(/class=["']song-artist["'][^>]*>([\s\S]*?)<\//i) ||
                        html.match(/by\s+<a[^>]*>([^<]+)<\/a>/i);
    const artist = artistMatch ? decodeHtml(artistMatch[1].replace(/<[^>]+>/g, '').trim()) : 'Worship Together';

    // Extract key if present
    const keyMatch = html.match(/Key:\s*<strong>([A-G][b#]?[m]?)<\/strong>/i) ||
                     html.match(/class=["']original-key["'][^>]*>([A-G][b#]?[m]?)</i);
    const key = keyMatch ? keyMatch[1].trim() : 'C';

    // Parse the chord-pro structure on the Worship Together page
    const lineMatches = html.match(/<div class=["']chord-pro-line["']>[\s\S]*?<\/div>\s*<\/div>/g) || [];
    const outputLines: string[] = [];

    outputLines.push(`{title: ${title}}`);
    outputLines.push(`{artist: ${artist}}`);
    outputLines.push(`{key: ${key}}`);
    outputLines.push(`{source: WorshipTogether}`);
    outputLines.push('');

    for (const lineBlock of lineMatches) {
      const segRegex = /<div class=["']chord-pro-segment["']>[\s\S]*?<div class=["']chord-pro-note["']>([\s\S]*?)<\/div>[\s\S]*?<div class=["']chord-pro-lyric["']>([\s\S]*?)<\/div>/g;
      let lineText = '';
      let match;
      let hasChords = false;

      while ((match = segRegex.exec(lineBlock)) !== null) {
        const chord = decodeHtml(match[1]).trim();
        const lyric = decodeHtml(match[2]);

        if (chord && chord !== '&nbsp;') {
          lineText += `[${chord}]`;
          hasChords = true;
        }
        lineText += lyric;
      }

      const trimmedLine = lineText.trim();
      if (!trimmedLine) {
        outputLines.push('');
        continue;
      }

      // Check if it's a section title like Verse 1, Chorus, etc.
      const isSection = /^(Intro|Verse\s*\d*|Chorus\s*\d*|Pre-Chorus\s*\d*|Bridge\s*\d*|Outro|Tag|Ending)$/i.test(trimmedLine);
      if (isSection) {
        outputLines.push(`\n{comment: ${trimmedLine}}`);
      } else {
        outputLines.push(trimmedLine);
      }
    }

    const contentChordPro = outputLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();

    return {
      title,
      artist,
      key,
      contentChordPro
    };
  } catch (err: any) {
    console.warn('Erreur getWorshipTogetherSongDetail:', err?.message || err);
    return null;
  }
}
