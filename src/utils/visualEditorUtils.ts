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

export type VisualSectionType =
  | 'verse'
  | 'chorus'
  | 'bridge'
  | 'pre_chorus'
  | 'intro'
  | 'outro'
  | 'solo'
  | 'interlude'
  | 'instrumental'
  | 'tag'
  | 'finale'
  | 'general'
  | (string & {});

export interface VisualSection {
  id: string;
  type: VisualSectionType;
  title: string;
  simplifiedTitle?: string;
  isRepeated?: boolean;
  vocals: string[];
  repeat?: number;
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
        repeat: 1,
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

  const rawSections: VisualSection[] = parsed.sections.map((sec, secIdx) => {
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
      else if (sec.type === 'pre_chorus') sectionTitle = 'Pré refrain';
      else if (sec.type === 'intro') sectionTitle = 'Intro';
      else if (sec.type === 'outro') sectionTitle = 'Outro';
      else if (sec.type === 'solo') sectionTitle = 'Solo';
      else if (sec.type === 'interlude') sectionTitle = 'Interlude';
      else if (sec.type === 'instrumental') sectionTitle = 'Instrumental';
      else if (sec.type === 'tag') sectionTitle = 'Tag';
      else if (sec.type === 'finale') sectionTitle = 'Finale';
      else if (sec.type === 'verse') sectionTitle = `Couplet ${secIdx + 1}`;
      else sectionTitle = SECTION_TYPES_CONFIG[sec.type]?.label || sec.type || 'Section';
    }

    return {
      id: generateId(`sec_${secIdx}`),
      type: sec.type || 'general',
      title: sectionTitle,
      vocals: sec.vocals || (sec.vocal ? [sec.vocal] : []),
      repeat: sec.repeat || 1,
      lines
    };
  });

  return recomputeSectionTitles(rawSections);
}

/**
 * Automatically compute section titles based on their type and appearance order.
 * If there are multiple sections of the same type in the song, they are sequentially numbered:
 * e.g. "Couplet 1", "Couplet 2", "Refrain 1", "Refrain 2".
 * If there is only one section of that type in the song, it gets the clean base label:
 * e.g. "Intro", "Pont", "Refrain", "Outro", "Couplet".
 */
export function recomputeSectionTitles(sections: VisualSection[]): VisualSection[] {
  const counts: Record<string, number> = {};
  sections.forEach((sec) => {
    const typeKey = (sec.type || 'general').trim().toLowerCase();
    counts[typeKey] = (counts[typeKey] || 0) + 1;
  });

  const runningIndex: Record<string, number> = {};

  return sections.map((sec) => {
    const typeKey = (sec.type || 'general').trim().toLowerCase();
    runningIndex[typeKey] = (runningIndex[typeKey] || 0) + 1;
    const totalForType = counts[typeKey] || 1;
    const currentIndex = runningIndex[typeKey];

    const config = getSectionTypeConfig(sec.type);
    const baseLabel = config.label || sec.type || 'Section';

    const autoTitle = totalForType > 1 ? `${baseLabel} ${currentIndex}` : baseLabel;

    return {
      ...sec,
      title: autoTitle
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
    const tags: string[] = [];
    if (sec.repeat && sec.repeat > 1) {
      tags.push(`x${sec.repeat}`);
    }
    if (sec.vocals && sec.vocals.length > 0) {
      sec.vocals.forEach(v => { if (v && v.trim()) tags.push(v.trim()); });
    }

    const tagsStr = tags.length > 0 ? ` [${tags.join(', ')}]` : '';
    const headerTitle = `${sec.title || 'Section'}${tagsStr}`;

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
 * Section type presets configuration
 */
export interface SectionTypeConfig {
  label: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  borderAccent: string;
}

export const SECTION_TYPES_CONFIG: Record<string, SectionTypeConfig> = {
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
  pre_chorus: {
    label: 'Pré refrain',
    badgeBg: 'bg-pink-600/20',
    badgeBorder: 'border-pink-500/40',
    badgeText: 'text-pink-300',
    borderAccent: 'border-l-pink-500'
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
  solo: {
    label: 'Solo',
    badgeBg: 'bg-orange-600/20',
    badgeBorder: 'border-orange-500/40',
    badgeText: 'text-orange-300',
    borderAccent: 'border-l-orange-500'
  },
  interlude: {
    label: 'Interlude',
    badgeBg: 'bg-indigo-600/20',
    badgeBorder: 'border-indigo-500/40',
    badgeText: 'text-indigo-300',
    borderAccent: 'border-l-indigo-500'
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
    badgeBg: 'bg-fuchsia-600/20',
    badgeBorder: 'border-fuchsia-500/40',
    badgeText: 'text-fuchsia-300',
    borderAccent: 'border-l-fuchsia-500'
  },
  finale: {
    label: 'Finale',
    badgeBg: 'bg-red-600/20',
    badgeBorder: 'border-red-500/40',
    badgeText: 'text-red-300',
    borderAccent: 'border-l-red-500'
  },
  general: {
    label: 'Autre',
    badgeBg: 'bg-gray-600/20',
    badgeBorder: 'border-gray-500/40',
    badgeText: 'text-gray-300',
    borderAccent: 'border-l-gray-500'
  }
};

export const STANDARD_SECTION_TYPES = [
  { key: 'verse', label: 'Couplet' },
  { key: 'chorus', label: 'Refrain' },
  { key: 'pre_chorus', label: 'Pré refrain' },
  { key: 'bridge', label: 'Pont' },
  { key: 'intro', label: 'Intro' },
  { key: 'outro', label: 'Outro' },
  { key: 'solo', label: 'Solo' },
  { key: 'interlude', label: 'Interlude' },
  { key: 'instrumental', label: 'Instrumental' },
  { key: 'tag', label: 'Tag' },
  { key: 'finale', label: 'Finale' },
  { key: 'general', label: 'Autre' },
] as const;

export const CUSTOM_SECTION_TYPES_KEY = 'songbook_custom_section_types';

export function getCustomSectionTypes(): string[] {
  try {
    const raw = localStorage.getItem(CUSTOM_SECTION_TYPES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    }
  } catch (e) {
    console.error('Failed to load custom section types', e);
  }
  return [];
}

export function saveCustomSectionType(name: string): string[] {
  const trimmed = name.trim();
  if (!trimmed) return getCustomSectionTypes();
  const current = getCustomSectionTypes();
  if (!current.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
    const updated = [...current, trimmed];
    try {
      localStorage.setItem(CUSTOM_SECTION_TYPES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save custom section type', e);
    }
    return updated;
  }
  return current;
}

export function deleteCustomSectionType(name: string): string[] {
  const current = getCustomSectionTypes();
  const updated = current.filter(t => t.toLowerCase() !== name.toLowerCase());
  try {
    localStorage.setItem(CUSTOM_SECTION_TYPES_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to delete custom section type', e);
  }
  return updated;
}

export function getSectionTypeConfig(type: string, customLabel?: string): SectionTypeConfig {
  if (SECTION_TYPES_CONFIG[type]) {
    return SECTION_TYPES_CONFIG[type];
  }
  const lowerType = (type || '').toLowerCase();
  for (const [key, conf] of Object.entries(SECTION_TYPES_CONFIG)) {
    if (key.toLowerCase() === lowerType || conf.label.toLowerCase() === lowerType) {
      return conf;
    }
  }

  return {
    label: customLabel || type || 'Autre',
    badgeBg: 'bg-teal-600/20',
    badgeBorder: 'border-teal-500/40',
    badgeText: 'text-teal-300',
    borderAccent: 'border-l-teal-500'
  };
}

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
