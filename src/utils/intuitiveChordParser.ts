import { VisualLine, VisualItem, generateId } from './visualEditorUtils';

// Regular expressions for detecting Anglo-Saxon and Latin chords
export const ANGLO_CHORD_REGEX = /^[A-Ga-g][#b♯♭]?(?:maj|min|m|M|sus|add|dim|aug|[0-9]|\+|\-)*(?:\/[A-Ga-g][#b♯♭]?)?$/;

// Latin chords: Do, Re, Ré, Mi, Fa, Sol, La, Si (with accents, extensions, flats, sharps, slash notes)
export const LATIN_CHORD_REGEX = /^(?:Do|Dó|Re|Ré|Mi|Fa|Fá|Sol|La|Lá|Si)[#b♯♭]?(?:maj|min|mineur|menor|m|M|sus|add|dim|aug|[0-9]|\+|\-)*(?:\/(?:Do|Dó|Re|Ré|Mi|Fa|Fá|Sol|La|Lá|Si|[A-Ga-g])[#b♯♭]?)?$/i;

/**
 * Returns true if a given token represents a musical chord in Latin or Anglo-Saxon notation.
 */
export function isChordToken(token: string): boolean {
  if (!token) return false;
  const clean = token.trim().replace(/[\[\]\(\),;]/g, '');
  if (!clean) return false;

  // Standalone common lowercase words that might clash with notes in lyrics (e.g. "la" in French/Spanish)
  const lower = clean.toLowerCase();
  if (lower === 'la' || lower === 'si' || lower === 'a' || lower === 'do') {
    // If exact single-letter lowercase "a" or lowercase "la", in lyrics it's almost always a word.
    // If capitalized "La" or "Si" or "Do", it's treated as a potential chord when in a chord-dense line.
    if (token.length === 1 && token === 'a') return false;
  }

  return ANGLO_CHORD_REGEX.test(clean) || LATIN_CHORD_REGEX.test(clean);
}

export type LineClassificationType =
  | 'empty'
  | 'chord_line'
  | 'lyrics_line'
  | 'chordpro_line'
  | 'comment'
  | 'comment_italic'
  | 'comment_box'
  | 'hash_comment';

export interface LineClassification {
  type: LineClassificationType;
  chords?: { chord: string; index: number }[];
  commentText?: string;
  isLatin?: boolean;
}

/**
 * Analyzes a raw line of text to determine its type
 */
export function classifyLine(rawLine: string): LineClassification {
  // Empty line or space-only line
  if (!rawLine || rawLine.trim() === '' || rawLine === ' ') {
    return { type: 'empty' };
  }

  const trimmed = rawLine.trim();

  if (trimmed.startsWith('#')) {
    return { type: 'hash_comment', commentText: trimmed.slice(1).trim() };
  }

  const directiveMatch = trimmed.match(/^\{([a-zA-Z_]+)\s*:\s*([\s\S]*?)\}$/);
  if (directiveMatch) {
    const tag = directiveMatch[1].toLowerCase();
    const val = directiveMatch[2].trim();
    if (tag === 'c' || tag === 'comment') {
      return { type: 'comment', commentText: val };
    }
    if (tag === 'ci' || tag === 'comment_italic') {
      return { type: 'comment_italic', commentText: val };
    }
    if (tag === 'cb' || tag === 'comment_box') {
      return { type: 'comment_box', commentText: val };
    }
  }

  // ChordPro bracketed chords or inline [*annotations]: e.g. [G]Voici or [*Crescendo]
  if (/\[(?:[A-Ga-gDoReMiFaSolLaSi#b♯♭\*])[^\]]*\]/.test(rawLine)) {
    return { type: 'chordpro_line' };
  }

  // Tokenize line with start indices
  const tokens: { text: string; index: number }[] = [];
  const regex = /\S+/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(rawLine)) !== null) {
    tokens.push({
      text: match[0],
      index: match.index
    });
  }

  if (tokens.length === 0) {
    return { type: 'empty' };
  }

  const chordTokens = tokens.filter(t => isChordToken(t.text));
  const ratio = chordTokens.length / tokens.length;

  // If at least 65% of words on this line are valid chords (or all words are chords)
  if (ratio >= 0.65 && chordTokens.length > 0) {
    const latinChords = chordTokens.filter(c => LATIN_CHORD_REGEX.test(c.text.replace(/[\[\]]/g, '')));
    const isLatin = latinChords.length >= chordTokens.length / 2;

    return {
      type: 'chord_line',
      chords: chordTokens.map(c => ({ chord: c.text, index: c.index })),
      isLatin
    };
  }

  return { type: 'lyrics_line' };
}

/**
 * Converts intuitive multi-line text (chords above lyrics, ChordPro bracketed chords, comments, annotations)
 * into structured VisualLine[].
 */
export function convertIntuitiveTextToVisualLines(text: string): VisualLine[] {
  const lines = text.split('\n');
  const result: VisualLine[] = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const info = classifyLine(raw);

    // 1. Empty line or space
    if (info.type === 'empty') {
      result.push({
        id: generateId('line_emp'),
        type: 'empty',
        items: []
      });
      i++;
      continue;
    }

    // 1b. Comment / annotation directives & hash comments
    if (
      info.type === 'comment' ||
      info.type === 'comment_italic' ||
      info.type === 'comment_box' ||
      info.type === 'hash_comment'
    ) {
      result.push({
        id: generateId('line_cmt'),
        type: info.type,
        items: [],
        comment: info.commentText || ''
      });
      i++;
      continue;
    }

    // 2. ChordPro bracketed line: [G]Voici [C]les paroles [*forte]
    if (info.type === 'chordpro_line') {
      const items: VisualItem[] = [];
      const chordRegex = /\[(.*?)\]([^\[]*)/g;
      let match: RegExpExecArray | null;

      const firstBracket = raw.indexOf('[');
      if (firstBracket > 0) {
        items.push({
          id: generateId('it'),
          chord: '',
          lyrics: raw.slice(0, firstBracket)
        });
      } else if (firstBracket === -1) {
        items.push({
          id: generateId('it'),
          chord: '',
          lyrics: raw
        });
      }

      while ((match = chordRegex.exec(raw)) !== null) {
        const inside = match[1].trim();
        const trailingLyrics = match[2];
        if (inside.startsWith('*')) {
          const noteText = inside.slice(1).trim();
          if (noteText) {
            items.push({
              id: generateId('it'),
              chord: '',
              lyrics: '',
              annotation: noteText
            });
          }
          if (trailingLyrics) {
            items.push({
              id: generateId('it'),
              chord: '',
              lyrics: trailingLyrics
            });
          }
        } else {
          items.push({
            id: generateId('it'),
            chord: inside,
            lyrics: trailingLyrics
          });
        }
      }

      if (items.length === 0) {
        items.push({ id: generateId('it'), chord: '', lyrics: '' });
      }

      result.push({
        id: generateId('line_cp'),
        type: 'lyrics',
        items
      });
      i++;
      continue;
    }

    // 3. Chord line
    if (info.type === 'chord_line') {
      const nextLine = lines[i + 1];
      const nextInfo = nextLine !== undefined ? classifyLine(nextLine) : null;

      // If next line is a lyrics line, pair chords above lyrics!
      if (nextInfo && nextInfo.type === 'lyrics_line') {
        const lyricsText = nextLine;
        const chords = info.chords || [];
        const items: VisualItem[] = [];
        let lastIdx = 0;

        for (let cIdx = 0; cIdx < chords.length; cIdx++) {
          const c = chords[cIdx];
          const nextC = chords[cIdx + 1];
          const start = Math.min(c.index, lyricsText.length);

          if (cIdx === 0 && start > 0) {
            items.push({
              id: generateId('it'),
              chord: '',
              lyrics: lyricsText.slice(0, start)
            });
            lastIdx = start;
          }

          const end = nextC ? Math.min(nextC.index, lyricsText.length) : lyricsText.length;
          items.push({
            id: generateId('it'),
            chord: c.chord,
            lyrics: lyricsText.slice(start, end)
          });
          lastIdx = end;
        }

        if (lastIdx < lyricsText.length) {
          items.push({
            id: generateId('it'),
            chord: '',
            lyrics: lyricsText.slice(lastIdx)
          });
        }

        if (items.length === 0) {
          items.push({ id: generateId('it'), chord: '', lyrics: lyricsText });
        }

        result.push({
          id: generateId('line_pair'),
          type: 'lyrics',
          items
        });

        i += 2; // Consumed both chord line and lyrics line
        continue;
      } else {
        // Standalone chord line (e.g. Intro, Outro, Instrumental)
        const items: VisualItem[] = (info.chords || []).map(c => ({
          id: generateId('it'),
          chord: c.chord,
          lyrics: ''
        }));

        result.push({
          id: generateId('line_chords'),
          type: 'lyrics',
          items: items.length > 0 ? items : [{ id: generateId('it'), chord: '', lyrics: '' }]
        });

        i++;
        continue;
      }
    }

    // 4. Pure lyrics line (no chords above it)
    result.push({
      id: generateId('line_lyr'),
      type: 'lyrics',
      items: [{
        id: generateId('it'),
        chord: '',
        lyrics: raw
      }]
    });
    i++;
  }

  return result.length > 0 ? result : [
    {
      id: generateId('line_def'),
      type: 'lyrics',
      items: [{ id: generateId('it'), chord: '', lyrics: '' }]
    }
  ];
}

/**
 * Converts VisualLine[] into intuitive text with chords aligned above lyrics (or inline ChordPro when annotations exist).
 */
export function convertVisualLinesToIntuitiveText(lines: VisualLine[]): string {
  if (!lines || lines.length === 0) return '';

  const output: string[] = [];

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];

    if (line.type === 'empty') {
      output.push(' ');
      continue;
    }
    if (line.type === 'comment') {
      output.push(`{c: ${line.comment || ''}}`);
      continue;
    }
    if (line.type === 'comment_italic') {
      output.push(`{ci: ${line.comment || ''}}`);
      continue;
    }
    if (line.type === 'comment_box') {
      output.push(`{cb: ${line.comment || ''}}`);
      continue;
    }
    if (line.type === 'hash_comment') {
      output.push(`# ${line.comment || ''}`);
      continue;
    }
    if (line.type === 'grid_row') {
      output.push(line.gridRaw || '');
      continue;
    }
    if (line.type === 'tab_row') {
      output.push(line.tabText ?? '');
      continue;
    }

    const items = line.items || [];
    const hasAnyChords = items.some(it => Boolean(it.chord && it.chord.trim()));
    const hasAnyAnnotations = items.some(it => Boolean(it.annotation && it.annotation.trim()));
    const allEmptyLyrics = items.every(it => !it.lyrics || it.lyrics.trim() === '');

    if (hasAnyAnnotations) {
      // Preserve exact positions with inline ChordPro syntax
      const inline = items
        .map(it => {
          const ann = it.annotation && it.annotation.trim() ? `[*${it.annotation.trim()}]` : '';
          const ch = it.chord && it.chord.trim() ? `[${it.chord.trim()}]` : '';
          return `${ann}${ch}${it.lyrics || ''}`;
        })
        .join('');
      output.push(inline);
      continue;
    }

    if (!hasAnyChords) {
      const text = items.map(it => it.lyrics || '').join('');
      output.push(text);
      continue;
    }

    if (allEmptyLyrics) {
      const chordLine = items
        .map(it => (it.chord || '').trim())
        .filter(Boolean)
        .join('   ');
      output.push(chordLine);
      continue;
    }

    // Line with chords and lyrics: reconstruct 2 lines (chordLine above lyricsLine)
    let chordLine = '';
    let lyricsLine = '';

    for (const it of items) {
      const chord = (it.chord || '').trim();
      const lyrics = it.lyrics || '';

      const currentLyricsLen = lyricsLine.length;

      if (chord) {
        if (chordLine.length < currentLyricsLen) {
          chordLine += ' '.repeat(currentLyricsLen - chordLine.length);
        } else if (chordLine.length > currentLyricsLen) {
          lyricsLine += ' '.repeat(chordLine.length - currentLyricsLen);
        }
        chordLine += chord;
      }

      lyricsLine += lyrics;
    }

    output.push(chordLine.trimEnd());
    output.push(lyricsLine.trimEnd());
  }

  return output.join('\n');
}

/**
 * Returns statistics and unique chords detected in text.
 */
export function extractTextChordStats(text: string): {
  uniqueChords: string[];
  totalChordLines: number;
  totalLyricsLines: number;
  totalEmptyLines: number;
  isPredominantlyLatin: boolean;
} {
  const lines = text.split('\n');
  const uniqueChords = new Set<string>();
  let totalChordLines = 0;
  let totalLyricsLines = 0;
  let totalEmptyLines = 0;
  let latinCount = 0;
  let angloCount = 0;

  for (const l of lines) {
    const info = classifyLine(l);
    if (info.type === 'empty') {
      totalEmptyLines++;
    } else if (
      info.type === 'comment' ||
      info.type === 'comment_italic' ||
      info.type === 'comment_box' ||
      info.type === 'hash_comment'
    ) {
      continue;
    } else if (info.type === 'chord_line') {
      totalChordLines++;
      if (info.isLatin) latinCount++;
      else angloCount++;

      (info.chords || []).forEach(c => uniqueChords.add(c.chord));
    } else if (info.type === 'chordpro_line') {
      totalLyricsLines++;
      const matches = l.match(/\[(.*?)\]/g);
      if (matches) {
        matches.forEach(m => {
          const clean = m.replace(/[\[\]]/g, '').trim();
          if (clean && !clean.startsWith('*')) uniqueChords.add(clean);
        });
      }
    } else {
      totalLyricsLines++;
    }
  }

  return {
    uniqueChords: Array.from(uniqueChords),
    totalChordLines,
    totalLyricsLines,
    totalEmptyLines,
    isPredominantlyLatin: latinCount > angloCount
  };
}
