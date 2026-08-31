import { ParsedSection, ParsedLine, ParsedItem, parseChordPro, extractVocalTag } from './chordUtils';

export interface VisualItem {
  id: string;
  chord: string;
  lyrics: string;
}

export interface VisualLine {
  id: string;
  type: 'lyrics' | 'empty';
  items: VisualItem[];
}

export interface VisualSection {
  id: string;
  type: 'verse' | 'chorus' | 'bridge' | 'intro' | 'outro' | 'instrumental' | 'tag' | 'general';
  title: string;
  vocals: string[];
  lines: VisualLine[];
}

// Generate unique ID
export function generateId(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).substr(2, 9)}_${Date.now().toString(36)}`;
}

/**
 * Convert raw ChordPro string into structured VisualSection array
 */
export function chordProToVisualSections(chordProText: string): VisualSection[] {
  const parsed = parseChordPro(chordProText);
  
  if (!parsed.sections || parsed.sections.length === 0) {
    return [
      {
        id: generateId('sec'),
        type: 'verse',
        title: 'Couplet 1',
        vocals: [],
        lines: [
          {
            id: generateId('line'),
            type: 'lyrics',
            items: [{ id: generateId('item'), chord: 'G', lyrics: 'Votre première ligne de chant' }]
          }
        ]
      }
    ];
  }

  return parsed.sections.map((sec, secIdx) => {
    const lines: VisualLine[] = sec.lines.map((line, lIdx) => {
      if (line.type === 'empty') {
        return {
          id: generateId(`line_${secIdx}_${lIdx}`),
          type: 'empty',
          items: []
        };
      }

      const items: VisualItem[] = line.items.map((it, itIdx) => ({
        id: generateId(`it_${secIdx}_${lIdx}_${itIdx}`),
        chord: it.chord || '',
        lyrics: it.lyrics || ''
      }));

      // Ensure at least one item if empty lyrics line
      if (items.length === 0) {
        items.push({
          id: generateId(`it_${secIdx}_${lIdx}_0`),
          chord: '',
          lyrics: ''
        });
      }

      return {
        id: generateId(`line_${secIdx}_${lIdx}`),
        type: 'lyrics',
        items
      };
    });

    // Default title if missing
    let sectionTitle = sec.title || '';
    if (!sectionTitle) {
      if (sec.type === 'chorus') sectionTitle = 'Refrain';
      else if (sec.type === 'bridge') sectionTitle = 'Pont';
      else if (sec.type === 'intro') sectionTitle = 'Intro';
      else if (sec.type === 'outro') sectionTitle = 'Outro';
      else if (sec.type === 'instrumental') sectionTitle = 'Instrumental';
      else if (sec.type === 'verse') sectionTitle = `Couplet ${secIdx + 1}`;
      else sectionTitle = 'Section';
    }

    return {
      id: generateId(`sec_${secIdx}`),
      type: sec.type || 'general',
      title: sectionTitle,
      vocals: sec.vocals || (sec.vocal ? [sec.vocal] : []),
      lines
    };
  });
}

/**
 * Convert VisualSection array and metadata back into standard ChordPro text
 */
export function visualSectionsToChordPro(
  sections: VisualSection[],
  metadata?: {
    title?: string;
    artist?: string;
    key?: string;
    tempo?: number;
    timeSignature?: string;
    duration?: string;
    capo?: number;
  }
): string {
  const lines: string[] = [];

  // Metadata headers
  if (metadata?.title) lines.push(`{title: ${metadata.title}}`);
  if (metadata?.artist) lines.push(`{artist: ${metadata.artist}}`);
  if (metadata?.key) lines.push(`{key: ${metadata.key}}`);
  if (metadata?.tempo) lines.push(`{tempo: ${metadata.tempo}}`);
  if (metadata?.timeSignature) lines.push(`{time: ${metadata.timeSignature}}`);
  if (metadata?.duration) lines.push(`{duration: ${metadata.duration}}`);
  if (metadata?.capo && metadata.capo > 0) lines.push(`{capo: ${metadata.capo}}`);

  if (lines.length > 0) {
    lines.push('');
  }

  sections.forEach((sec, sIdx) => {
    // Section Header
    const vocalsStr = sec.vocals && sec.vocals.length > 0 ? ` [${sec.vocals.join(', ')}]` : '';
    const headerTitle = `${sec.title || 'Section'}${vocalsStr}`;

    if (sec.type === 'chorus') {
      lines.push(`{soc: ${headerTitle}}`);
    } else if (sec.type === 'bridge') {
      lines.push(`{sob: ${headerTitle}}`);
    } else if (sec.type === 'verse') {
      lines.push(`{sov: ${headerTitle}}`);
    } else {
      lines.push(`{c: ${headerTitle}}`);
    }

    // Lines in section
    sec.lines.forEach((line) => {
      if (line.type === 'empty') {
        lines.push('');
        return;
      }

      let lineStr = '';
      line.items.forEach((it) => {
        if (it.chord && it.chord.trim()) {
          lineStr += `[${it.chord.trim()}]`;
        }
        lineStr += it.lyrics || '';
      });

      lines.push(lineStr);
    });

    if (sec.type === 'chorus') {
      lines.push('{eoc}');
    } else if (sec.type === 'bridge') {
      lines.push('{eob}');
    } else if (sec.type === 'verse') {
      lines.push('{eov}');
    }

    if (sIdx < sections.length - 1) {
      lines.push('');
    }
  });

  return lines.join('\n');
}

/**
 * Extract all unique chords currently used in the visual sections
 */
export function extractAllChordsFromSections(sections: VisualSection[]): string[] {
  const set = new Set<string>();
  sections.forEach(sec => {
    sec.lines.forEach(line => {
      if (line.type !== 'empty') {
        line.items.forEach(it => {
          if (it.chord && it.chord.trim()) {
            set.add(it.chord.trim());
          }
        });
      }
    });
  });
  return Array.from(set);
}

/**
 * Insert a chord at a specific character offset in a line's text
 */
export function insertChordInLine(line: VisualLine, charOffset: number, newChord: string): VisualLine {
  if (line.type === 'empty') {
    return {
      ...line,
      type: 'lyrics',
      items: [{ id: generateId('it'), chord: newChord, lyrics: '' }]
    };
  }

  let accumulatedLength = 0;
  const newItems: VisualItem[] = [];
  let chordInserted = false;

  for (let i = 0; i < line.items.length; i++) {
    const item = line.items[i];
    const lyrics = item.lyrics || '';
    const itemLen = lyrics.length;

    if (!chordInserted && charOffset <= accumulatedLength + itemLen) {
      const splitIndex = Math.max(0, Math.min(itemLen, charOffset - accumulatedLength));
      
      if (splitIndex === 0) {
        if (!item.chord) {
          // Replace empty chord with new chord
          newItems.push({
            ...item,
            chord: newChord
          });
        } else {
          // Prepend new chord item with empty lyrics
          newItems.push({
            id: generateId('it'),
            chord: newChord,
            lyrics: ''
          });
          newItems.push(item);
        }
      } else if (splitIndex === itemLen) {
        newItems.push(item);
        newItems.push({
          id: generateId('it'),
          chord: newChord,
          lyrics: ''
        });
      } else {
        // Split item in two
        const beforeText = lyrics.slice(0, splitIndex);
        const afterText = lyrics.slice(splitIndex);

        newItems.push({
          id: item.id,
          chord: item.chord,
          lyrics: beforeText
        });

        newItems.push({
          id: generateId('it'),
          chord: newChord,
          lyrics: afterText
        });
      }
      chordInserted = true;
    } else {
      newItems.push(item);
    }

    accumulatedLength += itemLen;
  }

  if (!chordInserted) {
    newItems.push({
      id: generateId('it'),
      chord: newChord,
      lyrics: ''
    });
  }

  return {
    ...line,
    items: newItems
  };
}

/**
 * Merge adjacent items in a line if both have empty chords
 */
export function cleanUpLineItems(items: VisualItem[]): VisualItem[] {
  const result: VisualItem[] = [];
  for (const it of items) {
    if (result.length > 0 && !result[result.length - 1].chord && !it.chord) {
      result[result.length - 1].lyrics += it.lyrics;
    } else {
      result.push({ ...it });
    }
  }
  return result.length > 0 ? result : [{ id: generateId('it'), chord: '', lyrics: '' }];
}

/**
 * Section type presets
 */
export const SECTION_TYPES_CONFIG: Record<VisualSection['type'], {
  label: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  borderAccent: string;
}> = {
  verse: {
    label: 'Couplet',
    badgeBg: 'bg-blue-600/20',
    badgeBorder: 'border-blue-500/40',
    badgeText: 'text-blue-300',
    borderAccent: 'border-l-blue-500'
  },
  chorus: {
    label: 'Refrain',
    badgeBg: 'bg-amber-600/20',
    badgeBorder: 'border-amber-500/40',
    badgeText: 'text-amber-300',
    borderAccent: 'border-l-amber-500'
  },
  bridge: {
    label: 'Pont',
    badgeBg: 'bg-purple-600/20',
    badgeBorder: 'border-purple-500/40',
    badgeText: 'text-purple-300',
    borderAccent: 'border-l-purple-500'
  },
  intro: {
    label: 'Intro',
    badgeBg: 'bg-cyan-600/20',
    badgeBorder: 'border-cyan-500/40',
    badgeText: 'text-cyan-300',
    borderAccent: 'border-l-cyan-500'
  },
  outro: {
    label: 'Outro',
    badgeBg: 'bg-rose-600/20',
    badgeBorder: 'border-rose-500/40',
    badgeText: 'text-rose-300',
    borderAccent: 'border-l-rose-500'
  },
  instrumental: {
    label: 'Instrumental',
    badgeBg: 'bg-emerald-600/20',
    badgeBorder: 'border-emerald-500/40',
    badgeText: 'text-emerald-300',
    borderAccent: 'border-l-emerald-500'
  },
  tag: {
    label: 'Tag',
    badgeBg: 'bg-pink-600/20',
    badgeBorder: 'border-pink-500/40',
    badgeText: 'text-pink-300',
    borderAccent: 'border-l-pink-500'
  },
  general: {
    label: 'Section',
    badgeBg: 'bg-gray-600/20',
    badgeBorder: 'border-gray-500/40',
    badgeText: 'text-gray-300',
    borderAccent: 'border-l-gray-500'
  }
};

export const COMMON_VOCAL_PRESETS = [
  'Unisson',
  'Lead',
  '2e voix',
  '3e voix',
  'Chœur',
  'Harmonie',
  'Soprano',
  'Alto',
  'Ténor',
  'Basse',
  'Tous'
];
