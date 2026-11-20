import { ChordProParser, Song as ChordSheetSong, Paragraph, Line, ChordLyricsPair } from 'chordsheetjs';
import { NotationSystem } from '../types';

export const CHROMATIC_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const CHROMATIC_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export const LATIN_NOTES: Record<string, string> = {
  'C': 'Do',
  'C#': 'Do#',
  'Db': 'Réb',
  'D': 'Ré',
  'D#': 'Ré#',
  'Eb': 'Mib',
  'E': 'Mi',
  'F': 'Fa',
  'F#': 'Fa#',
  'Gb': 'Solb',
  'G': 'Sol',
  'G#': 'Sol#',
  'Ab': 'Lab',
  'A': 'La',
  'A#': 'La#',
  'Bb': 'Sib',
  'B': 'Si',
  'H': 'Si'
};

// Transpose a single note root (e.g. "C#" or "Bb")
export function transposeNote(note: string, semitones: number, preferFlats = false): string {
  if (semitones === 0) return note;

  // Normalize semitones to 0..11
  const shift = ((semitones % 12) + 12) % 12;

  let index = CHROMATIC_SHARP.indexOf(note);
  if (index === -1) {
    index = CHROMATIC_FLAT.indexOf(note);
  }
  if (index === -1) return note;

  const newIndex = (index + shift) % 12;
  return preferFlats ? CHROMATIC_FLAT[newIndex] : CHROMATIC_SHARP[newIndex];
}

// Transpose a full chord like "F#m7/C#", "Dsus4", "G/B", "Ab(add9)"
export function transposeChord(chordString: string, semitones: number, notation: NotationSystem = 'standard'): string {
  if (!chordString || !chordString.trim()) return '';

  // Handle slash chords like "G/B"
  if (chordString.includes('/')) {
    const parts = chordString.split('/');
    const main = transposeChord(parts[0], semitones, notation);
    const bass = transposeChord(parts[1], semitones, notation);
    return `${main}/${bass}`;
  }

  // Regex to match Root note (A-G with optional # or b) + extension
  const match = chordString.match(/^([A-Ga-g][#b]?)(.*)$/);
  if (!match) return chordString;

  const rawRoot = match[1].charAt(0).toUpperCase() + (match[1].length > 1 ? match[1].charAt(1) : '');
  const extension = match[2];

  const preferFlats = rawRoot.includes('b') || rawRoot === 'F';
  const transposedRoot = transposeNote(rawRoot, semitones, preferFlats);

  if (notation === 'latin') {
    const latinRoot = LATIN_NOTES[transposedRoot] || transposedRoot;
    return `${latinRoot}${extension}`;
  }

  return `${transposedRoot}${extension}`;
}

// Calculate semitone distance from oldKey to newKey (e.g. from "C" to "D" -> 2 semitones)
export function getSemitoneDifference(fromKey: string, toKey: string): number {
  if (!fromKey || !toKey) return 0;

  // Extract root notes
  const getRoot = (k: string) => {
    const m = k.match(/^([A-Ga-g][#b]?)/);
    return m ? m[1].charAt(0).toUpperCase() + (m[1].length > 1 ? m[1].charAt(1) : '') : 'C';
  };

  const fromRoot = getRoot(fromKey);
  const toRoot = getRoot(toKey);

  const getIdx = (r: string) => {
    let idx = CHROMATIC_SHARP.indexOf(r);
    if (idx === -1) idx = CHROMATIC_FLAT.indexOf(r);
    return idx !== -1 ? idx : 0;
  };

  const fromIdx = getIdx(fromRoot);
  const toIdx = getIdx(toRoot);

  let diff = (toIdx - fromIdx) % 12;
  if (diff < 0) diff += 12;
  return diff;
}

// Transpose all chords and key directive in raw ChordPro text
export function transposeChordProText(
  chordProText: string, 
  semitones: number, 
  notation: NotationSystem = 'standard',
  explicitTargetKey?: string
): string {
  if (!chordProText) return chordProText;
  if (semitones === 0 && !explicitTargetKey) return chordProText;

  let hasHeaderKeyDirective = false;
  let inTabBlock = false;
  let inGridBlock = false;
  const lines = chordProText.split('\n');
  const transposedLines = lines.map(line => {
    const trimmed = line.trim();

    if (trimmed.startsWith('#')) {
      return line;
    }

    // Check for directives {...}
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const directive = trimmed.slice(1, -1).trim();
      const colonIndex = directive.indexOf(':');
      const rawTag = (colonIndex !== -1 ? directive.slice(0, colonIndex) : directive).trim();
      const tag = rawTag.toLowerCase();
      const value = colonIndex !== -1 ? directive.slice(colonIndex + 1).trim() : '';

      if (tag === 'start_of_tab' || tag === 'sot') inTabBlock = true;
      else if (tag === 'end_of_tab' || tag === 'eot') inTabBlock = false;
      else if (tag === 'start_of_grid' || tag === 'sog') inGridBlock = true;
      else if (tag === 'end_of_grid' || tag === 'eog') inGridBlock = false;

      if (colonIndex !== -1 && (tag === 'key' || tag === 'k')) {
        if (!hasHeaderKeyDirective && explicitTargetKey) {
          hasHeaderKeyDirective = true;
          return `{${rawTag}: ${explicitTargetKey}}`;
        }
        hasHeaderKeyDirective = true;
        const finalKey = semitones !== 0 ? transposeChord(value, semitones, notation) : value;
        return `{${rawTag}: ${finalKey}}`;
      }
      return line;
    }

    if (semitones === 0 || inTabBlock) return line;

    if (inGridBlock) {
      // Transpose standalone chord tokens inside grid bars while preserving |:, :|, |, ., /, -, %
      return line.replace(/(^|[\s|:\[\]])([A-Ga-g][#b♯♭]?(?:maj|min|m|M|sus|add|dim|aug|[0-9]|\+|\-)*(?:\/[A-Ga-g][#b♯♭]?)?|(?:Do|Dó|Re|Ré|Mi|Fa|Fá|Sol|La|Lá|Si)[#b♯♭]?(?:maj|min|mineur|menor|m|M|sus|add|dim|aug|[0-9]|\+|\-)*(?:\/(?:Do|Dó|Re|Ré|Mi|Fa|Fá|Sol|La|Lá|Si|[A-Ga-g])[#b♯♭]?)?)(?=$|[\s|:\[\]])/g, (full, prefix, tok) => {
        return `${prefix}${transposeChord(tok, semitones, notation)}`;
      });
    }

    // Transpose chords in brackets [Chord], leaving inline annotations [*text] intact
    return line.replace(/\[(.*?)\]/g, (_, chordContent) => {
      const trimmedChord = chordContent.trim();
      if (!trimmedChord) return '[]';
      if (trimmedChord.startsWith('*')) return `[${trimmedChord}]`;
      const transposed = transposeChord(trimmedChord, semitones, notation);
      return `[${transposed}]`;
    });
  });

  // If no {key: ...} existed but we have an explicitTargetKey, insert it
  if (!hasHeaderKeyDirective && explicitTargetKey) {
    let insertIndex = -1;
    for (let i = 0; i < transposedLines.length; i++) {
      const t = transposedLines[i].trim().toLowerCase();
      if (t.startsWith('{title:') || t.startsWith('{t:') || t.startsWith('{artist:') || t.startsWith('{a:') || t.startsWith('{album:')) {
        insertIndex = i + 1;
      }
    }
    if (insertIndex !== -1) {
      transposedLines.splice(insertIndex, 0, `{key: ${explicitTargetKey}}`);
    } else {
      transposedLines.unshift(`{key: ${explicitTargetKey}}`);
    }
  }

  return transposedLines.join('\n');
}

export interface GridBar {
  repeatStart?: boolean;
  repeatEnd?: boolean;
  beats: string[];
}

export interface ParsedItem {
  chord: string;
  lyrics: string;
  annotation?: string;
}

export interface ParsedLine {
  type: 'lyrics' | 'comment' | 'comment_italic' | 'comment_box' | 'empty' | 'section' | 'grid_row' | 'tab_row';
  sectionType?: string; // verse, chorus, bridge, tag, intro, outro, grid, tab...
  items: ParsedItem[];
  comment?: string;
  gridBars?: GridBar[];
  gridRaw?: string;
  tabText?: string;
}

export interface ParsedSection {
  title?: string;
  type: 'verse' | 'chorus' | 'bridge' | 'pre_chorus' | 'intro' | 'outro' | 'solo' | 'interlude' | 'instrumental' | 'tag' | 'finale' | 'grid' | 'tab' | 'general' | string;
  blockKind?: 'lyrics' | 'grid' | 'tab' | 'chorus_recall';
  vocals?: string[];
  vocal?: string;
  repeat?: number;
  key?: string;
  tempo?: number;
  timeSignature?: string;
  transposeOffset?: number;
  isChorusRecall?: boolean;
  recallLabel?: string;
  lines: ParsedLine[];
}

export interface ParsedSongData {
  title: string;
  artist: string;
  album?: string;
  key: string;
  hasExplicitKey?: boolean;
  tempo: number;
  bpm?: number;
  timeSignature: string;
  duration?: string;
  capo: number;
  ccli?: string;
  copyright?: string;
  youtubeUrl?: string;
  audioUrl?: string;
  spotifyUrl?: string;
  sections: ParsedSection[];
  rawChordPro: string;
}

// Helper to get customized harmonic colors and styling for vocal arrangement badges
export function getVocalBadgeStyle(voc: string) {
  const lower = (voc || '').toLowerCase().trim();
  if (lower.includes('lead') || lower.includes('solo')) {
    return {
      bg: 'bg-amber-500/15 hover:bg-amber-500/25',
      border: 'border-amber-500/50 hover:border-amber-400',
      text: 'text-amber-300 hover:text-amber-200',
      icon: 'text-amber-400',
      badgeBg: '#78350f33',
      badgeBorder: '#f59e0b80',
      textColor: '#fcd34d'
    };
  }
  if (lower.includes('unisson') || lower.includes('unison')) {
    return {
      bg: 'bg-cyan-500/15 hover:bg-cyan-500/25',
      border: 'border-cyan-500/50 hover:border-cyan-400',
      text: 'text-cyan-300 hover:text-cyan-200',
      icon: 'text-cyan-400',
      badgeBg: '#08334433',
      badgeBorder: '#06b6d480',
      textColor: '#67e8f9'
    };
  }
  if (lower.includes('2')) {
    return {
      bg: 'bg-purple-500/15 hover:bg-purple-500/25',
      border: 'border-purple-500/50 hover:border-purple-400',
      text: 'text-purple-300 hover:text-purple-200',
      icon: 'text-purple-400',
      badgeBg: '#3b076433',
      badgeBorder: '#a855f780',
      textColor: '#d8b4fe'
    };
  }
  if (lower.includes('3')) {
    return {
      bg: 'bg-emerald-500/15 hover:bg-emerald-500/25',
      border: 'border-emerald-500/50 hover:border-emerald-400',
      text: 'text-emerald-300 hover:text-emerald-200',
      icon: 'text-emerald-400',
      badgeBg: '#022c2233',
      badgeBorder: '#10b98180',
      textColor: '#6ee7b7'
    };
  }
  if (lower.includes('soprano')) {
    return {
      bg: 'bg-pink-500/15 hover:bg-pink-500/25',
      border: 'border-pink-500/50 hover:border-pink-400',
      text: 'text-pink-300 hover:text-pink-200',
      icon: 'text-pink-400',
      badgeBg: '#50072433',
      badgeBorder: '#ec489980',
      textColor: '#f472b6'
    };
  }
  if (lower.includes('alto')) {
    return {
      bg: 'bg-orange-500/15 hover:bg-orange-500/25',
      border: 'border-orange-500/50 hover:border-orange-400',
      text: 'text-orange-300 hover:text-orange-200',
      icon: 'text-orange-400',
      badgeBg: '#43140733',
      badgeBorder: '#f9731680',
      textColor: '#fdba74'
    };
  }
  if (lower.includes('ténor') || lower.includes('tenor')) {
    return {
      bg: 'bg-sky-500/15 hover:bg-sky-500/25',
      border: 'border-sky-500/50 hover:border-sky-400',
      text: 'text-sky-300 hover:text-sky-200',
      icon: 'text-sky-400',
      badgeBg: '#082f4933',
      badgeBorder: '#0ea5e980',
      textColor: '#7dd3fc'
    };
  }
  if (lower.includes('basse') || lower.includes('bass')) {
    return {
      bg: 'bg-indigo-500/15 hover:bg-indigo-500/25',
      border: 'border-indigo-500/50 hover:border-indigo-400',
      text: 'text-indigo-300 hover:text-indigo-200',
      icon: 'text-indigo-400',
      badgeBg: '#1e1b4b33',
      badgeBorder: '#6366f180',
      textColor: '#a5b4fc'
    };
  }
  if (lower.includes('choeur') || lower.includes('chœur') || lower.includes('tous') || lower.includes('harmonie') || lower.includes('duo')) {
    return {
      bg: 'bg-violet-500/15 hover:bg-violet-500/25',
      border: 'border-violet-500/50 hover:border-violet-400',
      text: 'text-violet-300 hover:text-violet-200',
      icon: 'text-violet-400',
      badgeBg: '#2e106533',
      badgeBorder: '#8b5cf680',
      textColor: '#c4b5fd'
    };
  }
  return {
    bg: 'bg-teal-500/15 hover:bg-teal-500/25',
    border: 'border-teal-500/50 hover:border-teal-400',
    text: 'text-teal-300 hover:text-teal-200',
    icon: 'text-teal-400',
    badgeBg: '#042f2e33',
    badgeBorder: '#14b8a680',
    textColor: '#5eead4'
  };
}

export interface SectionMetaResult {
  cleanTitle: string;
  vocals: string[];
  vocal?: string;
  repeat: number;
}

// Helper to extract vocal arrangement and repetition tags from string
// e.g. "Refrain [x2, Unisson]", "Couplet 1 [x3]", "Refrain x2", "Pont [2x]"
export function extractVocalTag(input: string): SectionMetaResult {
  if (!input) return { cleanTitle: '', vocals: [], repeat: 1 };
  
  let clean = input.trim();
  let vocals: string[] = [];
  let repeat = 1;

  // 1. Check for brackets at end: e.g. "Refrain [x2, Unisson]" or "Couplet [x3]"
  const bracketMatch = clean.match(/^(.*?)\s*\[(.*?)\]\s*$/);
  if (bracketMatch) {
    clean = bracketMatch[1].trim();
    const bracketItems = bracketMatch[2].split(',').map(s => s.trim()).filter(Boolean);
    
    bracketItems.forEach(item => {
      const repMatch = item.match(/^x?\s*(\d+)\s*x?$/i);
      if (repMatch) {
        const parsedRep = parseInt(repMatch[1], 10);
        if (parsedRep > 0) repeat = parsedRep;
      } else {
        vocals.push(item);
      }
    });
  }

  // 2. Check for pipe: e.g. "Refrain | x2 | Unisson"
  if (clean.includes('|')) {
    const parts = clean.split('|').map(s => s.trim()).filter(Boolean);
    clean = parts[0];
    for (let i = 1; i < parts.length; i++) {
      const p = parts[i];
      const repMatch = p.match(/^x?\s*(\d+)\s*x?$/i);
      if (repMatch) {
        const parsedRep = parseInt(repMatch[1], 10);
        if (parsedRep > 0) repeat = parsedRep;
      } else {
        vocals.push(p);
      }
    }
  }

  // 3. Check for standalone x2, x3, 2x, 3x at end of title: e.g. "Couplet 1 x2", "Refrain 2x"
  const suffixRepMatch = clean.match(/^(.*?)\s+(?:x\s*(\d+)|(\d+)\s*x)\s*$/i);
  if (suffixRepMatch) {
    clean = suffixRepMatch[1].trim();
    const num = parseInt(suffixRepMatch[2] || suffixRepMatch[3], 10);
    if (num > 0) repeat = num;
  }

  return {
    cleanTitle: clean,
    vocals,
    vocal: vocals.length > 0 ? vocals.join(', ') : undefined,
    repeat: repeat || 1
  };
}

const START_SECTION_TAG_MAP: Record<string, { type: ParsedSection['type']; defaultTitle: string; blockKind?: ParsedSection['blockKind'] }> = {
  start_of_verse: { type: 'verse', defaultTitle: 'Couplet' },
  sov: { type: 'verse', defaultTitle: 'Couplet' },
  start_of_chorus: { type: 'chorus', defaultTitle: 'Refrain' },
  soc: { type: 'chorus', defaultTitle: 'Refrain' },
  start_of_bridge: { type: 'bridge', defaultTitle: 'Pont' },
  sob: { type: 'bridge', defaultTitle: 'Pont' },
  start_of_pre_chorus: { type: 'pre_chorus', defaultTitle: 'Pré refrain' },
  start_of_prechorus: { type: 'pre_chorus', defaultTitle: 'Pré refrain' },
  sopc: { type: 'pre_chorus', defaultTitle: 'Pré refrain' },
  start_of_intro: { type: 'intro', defaultTitle: 'Intro' },
  soi: { type: 'intro', defaultTitle: 'Intro' },
  start_of_outro: { type: 'outro', defaultTitle: 'Outro' },
  soo: { type: 'outro', defaultTitle: 'Outro' },
  start_of_solo: { type: 'solo', defaultTitle: 'Solo' },
  sos: { type: 'solo', defaultTitle: 'Solo' },
  start_of_interlude: { type: 'interlude', defaultTitle: 'Interlude' },
  start_of_instrumental: { type: 'instrumental', defaultTitle: 'Instrumental' },
  start_of_tag: { type: 'tag', defaultTitle: 'Tag' },
  sotag: { type: 'tag', defaultTitle: 'Tag' },
  start_of_finale: { type: 'finale', defaultTitle: 'Finale' },
  start_of_grid: { type: 'grid', defaultTitle: 'Grille', blockKind: 'grid' },
  sog: { type: 'grid', defaultTitle: 'Grille', blockKind: 'grid' },
  start_of_tab: { type: 'tab', defaultTitle: 'Tablature', blockKind: 'tab' },
  sot: { type: 'tab', defaultTitle: 'Tablature', blockKind: 'tab' },
  start_of_part: { type: 'general', defaultTitle: 'Section' },
  sop: { type: 'general', defaultTitle: 'Section' }
};

const END_SECTION_TAGS = new Set([
  'end_of_verse', 'eov',
  'end_of_chorus', 'eoc',
  'end_of_bridge', 'eob',
  'end_of_pre_chorus', 'end_of_prechorus', 'eopc',
  'end_of_intro', 'eoi',
  'end_of_outro', 'eoo',
  'end_of_solo', 'eos',
  'end_of_interlude',
  'end_of_instrumental',
  'end_of_tag', 'eotag',
  'end_of_finale',
  'end_of_grid', 'eog',
  'end_of_tab', 'eot',
  'end_of_part', 'eop'
]);

function isStartSectionTag(tag: string): boolean {
  return Boolean(START_SECTION_TAG_MAP[tag]) || tag.startsWith('start_of_');
}

function isEndSectionTag(tag: string): boolean {
  return END_SECTION_TAGS.has(tag) || tag.startsWith('end_of_');
}

export function detectSectionTypeFromTitle(title: string): { type: ParsedSection['type']; isKnown: boolean } {
  const lowerVal = (title || '').trim().toLowerCase();
  if (!lowerVal) return { type: 'general', isKnown: false };

  if (/^(?:pre[- ]?chorus|pr[ée][- ]?refrain|pc\d*|pr\d*)$/i.test(lowerVal) || lowerVal.includes('pré-refrain') || lowerVal.includes('pre-refrain') || lowerVal.includes('prerefrain') || lowerVal.includes('pre-chorus') || lowerVal.includes('prechorus') || lowerVal.includes('pré refrain')) {
    return { type: 'pre_chorus', isKnown: true };
  }
  if (/^(?:c\d+|r\d+|chorus|refrain)$/i.test(lowerVal) || lowerVal.includes('refrain') || lowerVal.includes('chorus')) {
    return { type: 'chorus', isKnown: true };
  }
  if (/^(?:v\d+|verse|couplet|strophe)$/i.test(lowerVal) || lowerVal.includes('couplet') || lowerVal.includes('verse') || lowerVal.includes('strophe')) {
    return { type: 'verse', isKnown: true };
  }
  if (/^(?:b\d+|p\d+|bridge|pont)$/i.test(lowerVal) || lowerVal.includes('pont') || lowerVal.includes('bridge')) {
    return { type: 'bridge', isKnown: true };
  }
  if (/^(?:in|intro\d*)$/i.test(lowerVal) || lowerVal.includes('intro')) {
    return { type: 'intro', isKnown: true };
  }
  if (/^(?:outro\d*|out|fin\d*|finale\d*)$/i.test(lowerVal) || lowerVal.includes('finale') || lowerVal.includes('outro') || lowerVal === 'fin') {
    return { type: 'outro', isKnown: true };
  }
  if (/^(?:s\d+|solo\d*)$/i.test(lowerVal) || lowerVal.includes('solo')) {
    return { type: 'solo', isKnown: true };
  }
  if (/^(?:int\d*|interlude\d*)$/i.test(lowerVal) || lowerVal.includes('interlude')) {
    return { type: 'interlude', isKnown: true };
  }
  if (/^(?:inst\d*|instrumental\d*|instru\d*)$/i.test(lowerVal) || lowerVal.includes('instru') || lowerVal.includes('instrumental')) {
    return { type: 'instrumental', isKnown: true };
  }
  if (/^(?:tag\d*|coda\d*|t\d*)$/i.test(lowerVal) || lowerVal.includes('tag') || lowerVal.includes('coda')) {
    return { type: 'tag', isKnown: true };
  }
  if (/^(?:grille|grid)\b/i.test(lowerVal)) {
    return { type: 'grid', isKnown: true };
  }
  if (/^(?:tab|tablature)\b/i.test(lowerVal)) {
    return { type: 'tab', isKnown: true };
  }
  return { type: title.trim(), isKnown: false };
}

/**
 * Parses ChordPro v6 attributes (e.g. label="Couplet 1" repeat="2") or legacy positional text
 */
export function parseChordProSectionValue(rawValue: string): {
  label: string;
  vocals: string[];
  vocal?: string;
  repeat?: number;
} {
  const trimmed = (rawValue || '').trim();
  if (!trimmed) return { label: '', vocals: [] };

  // Detect v6 key="val" or key='val' attributes
  const attrRegex = /([a-zA-Z_][a-zA-Z0-9_-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s]+))/g;
  let match: RegExpExecArray | null;
  let hasAttributes = false;
  let label = '';
  let repeat: number | undefined;
  const vocals: string[] = [];

  while ((match = attrRegex.exec(trimmed)) !== null) {
    hasAttributes = true;
    const key = match[1].toLowerCase();
    const val = (match[2] ?? match[3] ?? match[4] ?? '').trim();
    if (key === 'label' || key === 'title' || key === 'name') {
      label = val;
    } else if (key === 'repeat' || key === 'rep') {
      const n = parseInt(val, 10);
      if (!isNaN(n) && n > 0) repeat = n;
    } else if (key === 'vocal' || key === 'vocals' || key === 'voix') {
      val.split(',').map(v => v.trim()).filter(Boolean).forEach(v => vocals.push(v));
    }
  }

  if (hasAttributes) {
    const legacy = extractVocalTag(label);
    const mergedVocals = Array.from(new Set([...vocals, ...legacy.vocals]));
    return {
      label: legacy.cleanTitle || label,
      vocals: mergedVocals,
      vocal: mergedVocals.length > 0 ? mergedVocals.join(', ') : undefined,
      repeat: repeat || (legacy.repeat > 1 ? legacy.repeat : undefined)
    };
  }

  const legacy = extractVocalTag(trimmed);
  return {
    label: legacy.cleanTitle,
    vocals: legacy.vocals,
    vocal: legacy.vocal,
    repeat: legacy.repeat > 1 ? legacy.repeat : undefined
  };
}

export function isChordGridToken(token: string): boolean {
  if (!token) return false;
  const clean = token.trim().replace(/^\[|\]$/g, '');
  if (!clean) return false;
  if (/^[A-Ga-g][#b♯♭]?(?:maj|min|m|M|sus|add|dim|aug|[0-9]|\+|\-)*(?:\/[A-Ga-g][#b♯♭]?)?$/.test(clean)) {
    return true;
  }
  return /^(?:Do|Dó|Re|Ré|Mi|Fa|Fá|Sol|La|Lá|Si)[#b♯♭]?(?:maj|min|mineur|menor|m|M|sus|add|dim|aug|[0-9]|\+|\-)*(?:\/(?:Do|Dó|Re|Ré|Mi|Fa|Fá|Sol|La|Lá|Si|[A-Ga-g])[#b♯♭]?)?$/i.test(clean);
}

/**
 * Parse a ChordPro grid row like "|: C . G . | Am . F . :|" into structured GridBar[]
 */
export function parseGridLine(rawLine: string): GridBar[] {
  const tokens = rawLine
    .replace(/\|:/g, ' |: ')
    .replace(/:\|/g, ' :| ')
    .replace(/\|\|/g, ' || ')
    .replace(/(?<![:])\|(?![:|])/g, ' | ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const bars: GridBar[] = [];
  let currentBar: GridBar | null = null;

  const ensureBar = () => {
    if (!currentBar) {
      currentBar = { beats: [] };
    }
    return currentBar;
  };

  for (const tok of tokens) {
    if (tok === '|:') {
      if (currentBar && (currentBar.beats.length > 0 || currentBar.repeatStart || currentBar.repeatEnd)) {
        bars.push(currentBar);
      }
      currentBar = { repeatStart: true, beats: [] };
    } else if (tok === ':|') {
      const bar = ensureBar();
      bar.repeatEnd = true;
      bars.push(bar);
      currentBar = null;
    } else if (tok === '|' || tok === '||') {
      if (currentBar && (currentBar.beats.length > 0 || currentBar.repeatStart || currentBar.repeatEnd)) {
        bars.push(currentBar);
        currentBar = { beats: [] };
      } else if (!currentBar) {
        currentBar = { beats: [] };
      }
    } else {
      const bar = ensureBar();
      bar.beats.push(tok.replace(/^\[(.*)\]$/, '$1'));
    }
  }

  if (currentBar && (currentBar.beats.length > 0 || currentBar.repeatStart || currentBar.repeatEnd)) {
    bars.push(currentBar);
  }

  return bars;
}

function cloneParsedLines(lines: ParsedLine[]): ParsedLine[] {
  return lines.map(line => ({
    ...line,
    items: line.items.map(it => ({ ...it })),
    gridBars: line.gridBars ? line.gridBars.map(b => ({ ...b, beats: [...b.beats] })) : undefined
  }));
}

// Update vocal arrangements and repetition count for a given section inside raw ChordPro text
export function updateSectionMetaInChordPro(
  chordProText: string, 
  targetSectionIndex: number, 
  options: { newVocals?: string[]; newRepeat?: number; newTitle?: string }
): string {
  const rawLines = chordProText.split('\n');
  let currentSectionIdx = -1;
  let sectionHeaderLineIdx = -1;
  let inExplicitBlock = false;

  for (let i = 0; i < rawLines.length; i++) {
    const trimmed = rawLines[i].trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const directive = trimmed.slice(1, -1).trim();
      const colonIndex = directive.indexOf(':');
      const tag = (colonIndex !== -1 ? directive.slice(0, colonIndex) : directive).trim().toLowerCase();
      const val = colonIndex !== -1 ? directive.slice(colonIndex + 1).trim() : '';

      if (isStartSectionTag(tag) || tag === 'chorus') {
        inExplicitBlock = tag !== 'chorus';
        currentSectionIdx++;
        if (currentSectionIdx === targetSectionIndex) {
          sectionHeaderLineIdx = i;
          break;
        }
      } else if (isEndSectionTag(tag)) {
        inExplicitBlock = false;
      } else if ((tag === 'comment' || tag === 'c') && !inExplicitBlock && detectSectionTypeFromTitle(extractVocalTag(val).cleanTitle).isKnown) {
        currentSectionIdx++;
        if (currentSectionIdx === targetSectionIndex) {
          sectionHeaderLineIdx = i;
          break;
        }
      }
    }
  }

  // If section header was found
  if (sectionHeaderLineIdx !== -1) {
    const origLine = rawLines[sectionHeaderLineIdx].trim();
    const directive = origLine.slice(1, -1).trim();
    const colonIndex = directive.indexOf(':');
    const tag = (colonIndex !== -1 ? directive.slice(0, colonIndex) : directive).trim();
    const tagLower = tag.toLowerCase();
    const val = colonIndex !== -1 ? directive.slice(colonIndex + 1).trim() : '';

    const currentMeta = parseChordProSectionValue(val);
    const finalTitle = options.newTitle !== undefined ? options.newTitle : currentMeta.label;
    const finalVocals = options.newVocals !== undefined ? options.newVocals : currentMeta.vocals;
    const finalRepeat = options.newRepeat !== undefined ? options.newRepeat : (currentMeta.repeat || 1);

    const mappedStart = START_SECTION_TAG_MAP[tagLower];
    const resolvedTitle = finalTitle || mappedStart?.defaultTitle || 'Section';

    if (tagLower === 'comment' || tagLower === 'c') {
      const metaTags: string[] = [];
      if (finalRepeat > 1) metaTags.push(`x${finalRepeat}`);
      finalVocals.forEach(v => { if (v && v.trim()) metaTags.push(v.trim()); });
      const metaStr = metaTags.length > 0 ? ` [${metaTags.join(', ')}]` : '';
      rawLines[sectionHeaderLineIdx] = `{${tag}: ${resolvedTitle}${metaStr}}`;
      return rawLines.join('\n');
    }

    // Normalized ChordPro v6 header + dedicated {repeat:} and {vocal:} inside block
    rawLines[sectionHeaderLineIdx] = `{${tag}: label="${resolvedTitle.replace(/"/g, '\\"')}"}`;

    if (options.newVocals !== undefined || options.newRepeat !== undefined) {
      let j = sectionHeaderLineIdx + 1;
      while (j < rawLines.length) {
        const lineTrim = rawLines[j].trim();
        if (lineTrim.startsWith('{') && lineTrim.endsWith('}')) {
          const dir = lineTrim.slice(1, -1).trim();
          const colIdx = dir.indexOf(':');
          const t = (colIdx !== -1 ? dir.slice(0, colIdx) : dir).trim().toLowerCase();

          if (isStartSectionTag(t) || isEndSectionTag(t) || t === 'chorus') {
            break;
          }
          if (options.newVocals !== undefined && ['vocal', 'voix', 'arrangement', 'arrangement_vocal', 'vocal_arrangement'].includes(t)) {
            rawLines.splice(j, 1);
            continue;
          }
          if (options.newRepeat !== undefined && ['repeat', 'repetition', 'rep', 'fois'].includes(t)) {
            rawLines.splice(j, 1);
            continue;
          }
        }
        j++;
      }

      if (tagLower !== 'chorus') {
        const toInsert: string[] = [];
        if (finalRepeat > 1) toInsert.push(`{repeat: ${finalRepeat}}`);
        if (finalVocals.length > 0) toInsert.push(`{vocal: ${finalVocals.join(', ')}}`);
        if (toInsert.length > 0) {
          rawLines.splice(sectionHeaderLineIdx + 1, 0, ...toInsert);
        }
      }
    }

    return rawLines.join('\n');
  }

  // If section was general without header at section 0
  if (targetSectionIndex === 0 && rawLines.length > 0) {
    if (options.newVocals !== undefined) {
      let j = 0;
      while (j < rawLines.length) {
        const lineTrim = rawLines[j].trim();
        if (lineTrim.startsWith('{') && lineTrim.endsWith('}')) {
          const dir = lineTrim.slice(1, -1).trim();
          const colIdx = dir.indexOf(':');
          const t = (colIdx !== -1 ? dir.slice(0, colIdx) : dir).trim().toLowerCase();
          if (isStartSectionTag(t) || t === 'chorus') {
            break;
          }
          if (['vocal', 'voix', 'arrangement', 'arrangement_vocal', 'vocal_arrangement'].includes(t)) {
            rawLines.splice(j, 1);
            continue;
          }
        }
        j++;
      }
    }

    let insertIdx = 0;
    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i].trim().toLowerCase();
      if (line.startsWith('{title:') || line.startsWith('{artist:') || line.startsWith('{album:') || line.startsWith('{key:') || line.startsWith('{tempo:') || line.startsWith('{capo:') || line.startsWith('{time:')) {
        insertIdx = i + 1;
      } else if (line !== '') {
        break;
      }
    }
    const title = options.newTitle || 'Couplet';
    const toInsert: string[] = [`{start_of_verse: label="${title.replace(/"/g, '\\"')}"}`];
    if (options.newRepeat && options.newRepeat > 1) toInsert.push(`{repeat: ${options.newRepeat}}`);
    if (options.newVocals && options.newVocals.length > 0) {
      toInsert.push(`{vocal: ${options.newVocals.filter(Boolean).join(', ')}}`);
    }
    rawLines.splice(insertIdx, 0, ...toInsert);
    rawLines.push('{end_of_verse}');
    return rawLines.join('\n');
  }

  return chordProText;
}

// Update vocal arrangements for a given section inside raw ChordPro text
export function updateSectionVocalsInChordPro(chordProText: string, targetSectionIndex: number, newVocals: string[]): string {
  return updateSectionMetaInChordPro(chordProText, targetSectionIndex, { newVocals });
}

// Update repetition count for a given section inside raw ChordPro text
export function updateSectionRepeatInChordPro(chordProText: string, targetSectionIndex: number, newRepeat: number): string {
  return updateSectionMetaInChordPro(chordProText, targetSectionIndex, { newRepeat });
}

// Parse a lyrics line containing [Chord] and [*Annotation] tokens
export function parseChordProLineItems(rawLine: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  const tokenRegex = /\[(.*?)\]([^\[]*)/g;
  let match: RegExpExecArray | null;

  const firstBracket = rawLine.indexOf('[');
  if (firstBracket > 0) {
    items.push({
      chord: '',
      lyrics: rawLine.slice(0, firstBracket)
    });
  } else if (firstBracket === -1) {
    items.push({
      chord: '',
      lyrics: rawLine
    });
    return items;
  }

  while ((match = tokenRegex.exec(rawLine)) !== null) {
    const inside = match[1].trim();
    const trailingLyrics = match[2];
    if (inside.startsWith('*')) {
      const noteText = inside.slice(1).trim();
      if (noteText) {
        items.push({
          chord: '',
          lyrics: '',
          annotation: noteText
        });
      }
      if (trailingLyrics) {
        items.push({
          chord: '',
          lyrics: trailingLyrics
        });
      }
    } else {
      items.push({
        chord: inside,
        lyrics: trailingLyrics
      });
    }
  }

  return items;
}

// Convert ChordPro string into structured sections for visual stage presentation
export function parseChordPro(chordProText: string): ParsedSongData {
  let title = 'Sans Titre';
  let artist = '';
  let album = '';
  let key = 'C';
  let hasExplicitKey = false;
  let tempo = 120;
  let timeSignature = '4/4';
  let duration = '';
  let capo = 0;
  let ccli = '';
  let copyright = '';
  let youtubeUrl = '';
  let audioUrl = '';
  let spotifyUrl = '';

  const sections: ParsedSection[] = [];
  const definedChoruses: ParsedSection[] = [];
  let inExplicitBlock = false;
  let globalTransposeOffset = 0;
  let hasStartedBody = false;

  let currentSection: ParsedSection = {
    type: 'general',
    lines: []
  };

  const finalizeCurrentSection = () => {
    const hasScopedMeta =
      currentSection.lines.length > 0 ||
      Boolean(currentSection.title && inExplicitBlock) ||
      Boolean(currentSection.isChorusRecall);
    if (!hasScopedMeta) return;

    sections.push(currentSection);
    if (currentSection.type === 'chorus' && !currentSection.isChorusRecall && currentSection.lines.length > 0) {
      definedChoruses.push(currentSection);
    }
  };

  const startNewEmptySection = (): ParsedSection => ({
    type: 'general',
    transposeOffset: globalTransposeOffset !== 0 ? globalTransposeOffset : undefined,
    lines: []
  });

  const rawLines = (chordProText || '').split('\n');

  for (let i = 0; i < rawLines.length; i++) {
    const rawLinePreserved = rawLines[i];
    const rawLine = rawLinePreserved.trim();

    // Ignore ChordPro line comments (# ...) outside tablature blocks
    if (currentSection.blockKind !== 'tab' && rawLine.startsWith('#')) {
      continue;
    }

    // Check for directives
    if (rawLine.startsWith('{') && rawLine.endsWith('}')) {
      const directive = rawLine.slice(1, -1).trim();
      const colonIndex = directive.indexOf(':');

      let tag = directive;
      let value = '';
      if (colonIndex !== -1) {
        tag = directive.slice(0, colonIndex).trim().toLowerCase();
        value = directive.slice(colonIndex + 1).trim();
      } else {
        tag = directive.toLowerCase();
      }

      // Song header metadata
      if (tag === 'title' || tag === 't') {
        title = value;
      } else if (tag === 'artist' || tag === 'a' || tag === 'subtitle' || tag === 'st') {
        artist = value;
      } else if (tag === 'album' || tag === 'al') {
        album = value;
      } else if (tag === 'duration' || tag === 'd' || tag === 'duree' || tag === 'durée' || tag === 'time_duration') {
        duration = value;
      } else if (tag === 'capo') {
        capo = parseInt(value, 10) || 0;
      } else if (tag === 'ccli' || tag === 'cclisongno' || tag === 'ccli_song_id' || tag === 'ccli_no') {
        ccli = value;
      } else if (tag === 'copyright' || tag === 'cop' || tag === 'droits') {
        copyright = value;
      } else if (tag === 'youtube' || tag === 'yt' || tag === 'video' || tag === 'youtube_url') {
        youtubeUrl = value;
      } else if (tag === 'spotify' || tag === 'sp' || tag === 'spotify_url') {
        spotifyUrl = value;
      } else if (tag === 'audio' || tag === 'audio_url' || tag === 'sound' || tag === 'mp3' || tag === 'music_url') {
        audioUrl = value;
      } else if (tag === 'key' || tag === 'k') {
        if (!hasStartedBody && !inExplicitBlock && sections.length === 0 && currentSection.lines.length === 0) {
          key = value;
          hasExplicitKey = true;
        } else {
          // Scoped key change for current section
          currentSection.key = value;
        }
      } else if (tag === 'tempo' || tag === 'bpm') {
        const parsedTempo = parseInt(value, 10) || 120;
        if (!hasStartedBody && !inExplicitBlock && sections.length === 0 && currentSection.lines.length === 0) {
          tempo = parsedTempo;
        } else {
          currentSection.tempo = parsedTempo;
        }
      } else if (tag === 'time' || tag === 'timesignature') {
        if (!hasStartedBody && !inExplicitBlock && sections.length === 0 && currentSection.lines.length === 0) {
          timeSignature = value;
        } else {
          currentSection.timeSignature = value;
        }
      } else if (tag === 'transpose') {
        const parsedShift = parseInt(value, 10);
        if (!isNaN(parsedShift)) {
          if (inExplicitBlock) {
            currentSection.transposeOffset = parsedShift;
          } else {
            globalTransposeOffset = parsedShift;
            currentSection.transposeOffset = parsedShift !== 0 ? parsedShift : undefined;
          }
        }
      } else if (tag === 'vocal' || tag === 'voix' || tag === 'arrangement' || tag === 'arrangement_vocal' || tag === 'vocal_arrangement') {
        const rawVocals = value.split(',').map(s => s.trim()).filter(Boolean);
        currentSection.vocals = Array.from(new Set([...(currentSection.vocals || []), ...rawVocals]));
        currentSection.vocal = currentSection.vocals.join(', ');
      } else if (tag === 'repeat' || tag === 'repetition' || tag === 'rep' || tag === 'fois') {
        const parsedRep = parseInt(value, 10);
        if (parsedRep > 0) currentSection.repeat = parsedRep;
      } else if (tag === 'chorus') {
        // Short chorus recall {chorus} or {chorus: label="Refrain"}
        hasStartedBody = true;
        finalizeCurrentSection();
        inExplicitBlock = false;

        const attr = parseChordProSectionValue(value);
        const targetLabel = (attr.label || '').trim().toLowerCase();
        const matchedChorus = targetLabel
          ? ([...definedChoruses].reverse().find(c => (c.title || '').trim().toLowerCase() === targetLabel) || definedChoruses[definedChoruses.length - 1])
          : definedChoruses[definedChoruses.length - 1];

        const recalledLines = matchedChorus
          ? cloneParsedLines(matchedChorus.lines)
          : [{ type: 'comment_italic' as const, items: [], comment: 'Rappel du refrain' }];

        const recallSection: ParsedSection = {
          title: attr.label || matchedChorus?.title || 'Refrain',
          type: 'chorus',
          blockKind: 'chorus_recall',
          isChorusRecall: true,
          recallLabel: attr.label || matchedChorus?.title || 'Refrain',
          vocals: attr.vocals.length > 0 ? attr.vocals : matchedChorus?.vocals,
          vocal: attr.vocal || matchedChorus?.vocal,
          repeat: attr.repeat || matchedChorus?.repeat,
          transposeOffset: globalTransposeOffset !== 0 ? globalTransposeOffset : undefined,
          lines: recalledLines
        };

        sections.push(recallSection);
        currentSection = startNewEmptySection();
      } else if (isStartSectionTag(tag)) {
        hasStartedBody = true;
        finalizeCurrentSection();
        inExplicitBlock = true;

        const mapped = START_SECTION_TAG_MAP[tag];
        const attr = parseChordProSectionValue(value);
        let secType: ParsedSection['type'] = mapped?.type || tag.replace(/^start_of_/, '');
        let secTitle = attr.label || mapped?.defaultTitle || secType;
        const blockKind = mapped?.blockKind;

        // If {start_of_part: label="Pont"} detect standard color/type from label
        if (tag === 'start_of_part' || tag === 'sop') {
          const detected = detectSectionTypeFromTitle(secTitle);
          secType = detected.type;
        }

        currentSection = {
          title: secTitle,
          type: secType,
          blockKind,
          vocals: attr.vocals.length > 0 ? attr.vocals : undefined,
          vocal: attr.vocal,
          repeat: attr.repeat,
          transposeOffset: globalTransposeOffset !== 0 ? globalTransposeOffset : undefined,
          lines: []
        };
      } else if (isEndSectionTag(tag)) {
        finalizeCurrentSection();
        inExplicitBlock = false;
        currentSection = startNewEmptySection();
      } else if (tag === 'comment_italic' || tag === 'ci') {
        hasStartedBody = true;
        if (value) {
          currentSection.lines.push({
            type: 'comment_italic',
            items: [],
            comment: value
          });
        }
      } else if (tag === 'comment_box' || tag === 'cb') {
        hasStartedBody = true;
        if (value) {
          currentSection.lines.push({
            type: 'comment_box',
            items: [],
            comment: value
          });
        }
      } else if (tag === 'comment' || tag === 'c') {
        hasStartedBody = true;
        const attr = parseChordProSectionValue(value);
        const cleanTitle = attr.label || value;
        const detected = detectSectionTypeFromTitle(cleanTitle);

        // Inside an explicit {start_of_*} block, {c:} is ALWAYS an intra-section comment!
        // Outside an explicit block, if it looks like a legacy section header (Couplet 1, Refrain, etc.), open a section for backward compatibility.
        if (inExplicitBlock || !detected.isKnown) {
          if (value) {
            currentSection.lines.push({
              type: 'comment',
              items: [],
              comment: value
            });
          }
        } else {
          finalizeCurrentSection();
          currentSection = {
            title: cleanTitle,
            type: detected.type,
            vocals: attr.vocals.length > 0 ? attr.vocals : undefined,
            vocal: attr.vocal,
            repeat: attr.repeat,
            transposeOffset: globalTransposeOffset !== 0 ? globalTransposeOffset : undefined,
            lines: []
          };
        }
      }
      continue;
    }

    if (rawLine === '') {
      if (currentSection.lines.length > 0) {
        currentSection.lines.push({
          type: 'empty',
          items: []
        });
      }
      continue;
    }

    hasStartedBody = true;

    // Inside {start_of_tab} / {sot}
    if (currentSection.blockKind === 'tab') {
      currentSection.lines.push({
        type: 'tab_row',
        items: [],
        tabText: rawLinePreserved
      });
      continue;
    }

    // Inside {start_of_grid} / {sog}
    if (currentSection.blockKind === 'grid') {
      const gridBars = parseGridLine(rawLine);
      currentSection.lines.push({
        type: 'grid_row',
        items: [],
        gridBars,
        gridRaw: rawLine
      });
      continue;
    }

    // Parse [Chord]Lyrics and [*Annotation] tokens
    const items = parseChordProLineItems(rawLine);
    currentSection.lines.push({
      type: 'lyrics',
      items
    });
  }

  finalizeCurrentSection();

  return {
    title,
    artist,
    album: album ? album.trim() : undefined,
    key,
    hasExplicitKey,
    tempo,
    bpm: tempo,
    timeSignature,
    duration: duration ? formatDurationToMMSS(duration) : undefined,
    capo,
    ccli: ccli ? ccli.trim() : undefined,
    copyright: copyright ? copyright.trim() : undefined,
    youtubeUrl: youtubeUrl ? youtubeUrl.trim() : undefined,
    audioUrl: audioUrl ? audioUrl.trim() : undefined,
    spotifyUrl: spotifyUrl ? spotifyUrl.trim() : undefined,
    sections,
    rawChordPro: chordProText
  };
}

// Helpers for YouTube and external audio URLs
export function getYouTubeVideoId(url?: string): string | null {
  if (!url) return null;
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

export function getYouTubeEmbedUrl(url?: string): string | null {
  const id = getYouTubeVideoId(url);
  return id ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1` : null;
}

export function isDirectAudioUrl(url?: string): boolean {
  if (!url) return false;
  return /\.(mp3|wav|ogg|m4a|aac|flac)(\?.*)?$/i.test(url) || url.startsWith('blob:') || url.startsWith('data:audio');
}

export function getSpotifyEmbedUrl(url?: string): string | null {
  if (!url) return null;
  const clean = url.trim();
  if (clean.includes('open.spotify.com/embed/')) return clean;

  const match = clean.match(/open\.spotify\.com\/(track|album|playlist|artist|episode)\/([a-zA-Z0-9]+)/i);
  if (match) {
    return `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator&theme=0`;
  }

  const uriMatch = clean.match(/spotify:(track|album|playlist|artist|episode):([a-zA-Z0-9]+)/i);
  if (uriMatch) {
    return `https://open.spotify.com/embed/${uriMatch[1]}/${uriMatch[2]}?utm_source=generator&theme=0`;
  }

  return null;
}

// ==========================================
// DURATION HELPERS
// ==========================================

export interface AutoDurationResult {
  seconds: number;
  formatted: string;
  totalBars: number;
  bpm: number;
  beatsPerBar: number;
  explanation: string;
}

/**
 * Automatically calculate estimated duration of a song
 * based on tempo (BPM), time signature, and parsed ChordPro lyrics/chords/structure.
 */
export function calculateSongAutoDuration(
  contentChordPro?: string,
  tempo: number = 100,
  timeSignature: string = '4/4'
): AutoDurationResult {
  const rawText = contentChordPro || '';
  const parsed = parseChordPro(rawText);
  const bpm = Math.max(40, Math.min(260, tempo || parsed.tempo || 100));

  // Extract beats per bar (e.g., "4/4" -> 4, "3/4" -> 3, "6/8" -> 2 or 6)
  let beatsPerBar = 4;
  const sig = timeSignature || parsed.timeSignature || '4/4';
  const sigParts = sig.split('/');
  if (sigParts.length > 0) {
    const num = parseInt(sigParts[0], 10);
    if (!isNaN(num) && num > 0) {
      beatsPerBar = num;
    }
  }

  let totalBars = 0;

  if (parsed.sections && parsed.sections.length > 0) {
    for (const section of parsed.sections) {
      const titleLower = (section.title || '').toLowerCase();
      let sectionBars = 0;
      const validLines = section.lines.filter(l => {
        if (l.type === 'empty' || l.type === 'comment' || l.type === 'comment_italic' || l.type === 'comment_box') return false;
        if (l.type === 'grid_row') return Boolean(l.gridBars && l.gridBars.length > 0);
        if (l.type === 'tab_row') return Boolean(l.tabText && l.tabText.trim().length > 0);
        return l.items && l.items.some(it => (it.lyrics && it.lyrics.trim().length > 0) || (it.chord && it.chord.trim().length > 0));
      });

      if (validLines.length > 0) {
        for (const line of validLines) {
          if (line.type === 'grid_row' && line.gridBars) {
            sectionBars += line.gridBars.length;
            continue;
          }
          const chordCount = line.items ? line.items.filter(it => it.chord && it.chord.trim().length > 0).length : 0;
          if (chordCount >= 4) {
            sectionBars += 4;
          } else if (chordCount >= 2) {
            sectionBars += 2;
          } else {
            sectionBars += 2;
          }
        }
      } else {
        if (titleLower.includes('intro') || titleLower.includes('outro') || titleLower.includes('solo') || titleLower.includes('instrumental')) {
          sectionBars += 8;
        } else {
          sectionBars += 16;
        }
      }

      // Ensure minimum standard structure per section
      if (titleLower.includes('intro') || titleLower.includes('outro') || titleLower.includes('tag')) {
        sectionBars = Math.max(4, sectionBars);
      } else {
        sectionBars = Math.max(8, sectionBars);
      }

      totalBars += sectionBars;
    }
  } else {
    // Fallback: estimate from non-empty lines
    const lines = rawText.split('\n').filter(l => l.trim().length > 0 && !l.trim().startsWith('{'));
    totalBars = Math.max(16, lines.length * 2);
  }

  // Add 4 measures buffer (intro count-in & final ring-out)
  totalBars += 4;

  const totalBeats = totalBars * beatsPerBar;
  const rawSeconds = Math.round((totalBeats / bpm) * 60);
  const seconds = Math.max(45, Math.min(900, rawSeconds)); // clamp between 45s and 15min

  const formatted = formatSecondsToMinutes(seconds);
  const explanation = `${totalBars} mesures à ${bpm} BPM (${sig})`;

  return {
    seconds,
    formatted,
    totalBars,
    bpm,
    beatsPerBar,
    explanation
  };
}

/**
 * Format any duration string or number of seconds into strictly MM:SS format.
 * Examples:
 * - 270 -> "04:30"
 * - "4:30" -> "04:30"
 * - "04:30" -> "04:30"
 * - "25 min 30 s" -> "25:30"
 * - "5 min" -> "05:00"
 * - "1:15:20" -> "75:20"
 */
export function formatDurationToMMSS(duration?: string | number | { duration?: string; contentChordPro?: string } | null): string {
  const totalSecs = parseDurationToSeconds(duration);
  if (!totalSecs || totalSecs <= 0) return '00:00';
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Extract or resolve duration from song object or its ChordPro text formatted as MM:SS.
 */
export function getSongDuration(song?: { 
  duration?: string; 
  durationMode?: 'auto' | 'custom';
  contentChordPro?: string;
  tempo?: number;
  timeSignature?: string;
} | null): string {
  if (!song) return '';

  let raw = '';
  if (song.duration && song.duration.trim() && song.duration !== 'auto') {
    raw = song.duration.trim();
  } else if (song.contentChordPro) {
    const match = song.contentChordPro.match(/\{(?:duration|dur|d|duree|durée|time_duration)\s*:\s*([^}]+)\}/i);
    if (match && match[1] && match[1].trim() && match[1].trim().toLowerCase() !== 'auto') {
      raw = match[1].trim();
    }
  }

  if (!raw) {
    raw = '03:30';
  }

  return formatDurationToMMSS(raw);
}

/**
 * Check if a song uses automatic duration
 */
export function isSongDurationAuto(song?: { duration?: string; durationMode?: 'auto' | 'custom' } | null): boolean {
  return false;
}

/**
 * Parse any duration string into total seconds.
 * Supports:
 * - "04:30", "4:30", "04::30" -> 270
 * - "1:15:30" -> 4530
 * - "4m30s", "4 min 30 s", "4min 30", "4m" -> 270
 * - "270", "270s" -> 270
 * - Song object
 */
export function parseDurationToSeconds(duration?: string | number | { duration?: string; contentChordPro?: string } | null): number {
  if (duration === undefined || duration === null) return 0;
  if (typeof duration === 'number') return Math.max(0, Math.round(duration));

  let str = '';
  if (typeof duration === 'object') {
    if (duration.duration && duration.duration.trim() && duration.duration !== 'auto') {
      str = duration.duration.trim().toLowerCase();
    } else if (duration.contentChordPro) {
      const match = duration.contentChordPro.match(/\{(?:duration|dur|d|duree|durée|time_duration)\s*:\s*([^}]+)\}/i);
      if (match && match[1]) str = match[1].trim().toLowerCase();
    }
  } else {
    str = String(duration).trim().toLowerCase();
  }
  if (!str) return 0;

  // Format "hh:mm:ss" or "mm:ss" or "mm::ss"
  if (str.includes(':')) {
    const parts = str.split(/:+/).map(p => parseInt(p.trim(), 10) || 0);
    if (parts.length === 2) {
      // [minutes, seconds]
      return Math.max(0, parts[0] * 60 + parts[1]);
    } else if (parts.length === 3) {
      // [hours, minutes, seconds]
      return Math.max(0, parts[0] * 3600 + parts[1] * 60 + parts[2]);
    }
  }

  // Format "4 min 30 s", "4m30", "4 min", "4m"
  const minMatch = str.match(/(\d+)\s*(?:m|min|minute|minutes)/);
  const secMatch = str.match(/(\d+)\s*(?:s|sec|seconde|secondes)/);
  if (minMatch || secMatch) {
    const mins = minMatch ? parseInt(minMatch[1], 10) : 0;
    const secs = secMatch ? parseInt(secMatch[1], 10) : 0;
    return mins * 60 + secs;
  }

  // Fallback: pure number in seconds
  const pureNum = parseInt(str.replace(/[^\d]/g, ''), 10);
  if (!isNaN(pureNum)) {
    return pureNum;
  }

  return 0;
}

/**
 * Format seconds to standard MM:SS
 */
export function formatSecondsToMinutes(seconds: number): string {
  return formatDurationToMMSS(seconds);
}

/**
 * Format total setlist duration in standard MM:SS
 * e.g. 1530 -> "25:30", 300 -> "05:00"
 */
export function formatSetlistDuration(totalSeconds: number): string {
  return formatDurationToMMSS(totalSeconds);
}

export interface TimeSignatureInfo {
  beatsPerMeasure: number;
  accents: number[];
  label: string;
}

export function parseTimeSignatureToBeats(timeSignature: string): TimeSignatureInfo {
  const clean = (timeSignature || '4/4').trim();
  if (clean === '3/4') return { beatsPerMeasure: 3, accents: [0], label: '3/4' };
  if (clean === '2/4') return { beatsPerMeasure: 2, accents: [0], label: '2/4' };
  if (clean === '6/8') return { beatsPerMeasure: 6, accents: [0, 3], label: '6/8' };
  if (clean === '12/8') return { beatsPerMeasure: 12, accents: [0, 3, 6, 9], label: '12/8' };
  if (clean === '5/4') return { beatsPerMeasure: 5, accents: [0, 3], label: '5/4' };
  if (clean === '7/8') return { beatsPerMeasure: 7, accents: [0, 3, 5], label: '7/8' };
  if (clean === '9/8') return { beatsPerMeasure: 9, accents: [0, 3, 6], label: '9/8' };
  const num = parseInt(clean.split('/')[0], 10);
  return { 
    beatsPerMeasure: isNaN(num) || num <= 0 ? 4 : Math.min(16, num), 
    accents: [0], 
    label: clean || '4/4' 
  };
}

// Web Audio API Metronome Synth
class MetronomeEngine {
  private audioCtx: AudioContext | null = null;
  private isPlaying = false;
  private isMuted = false;
  private volume = 0.85;
  private bpm = 120;
  private nextBeatTime = 0;
  private currentBeat = 0;
  private beatsPerMeasure = 4;
  private accents: number[] = [0];
  private timerId: number | null = null;
  private onBeatCallback: ((beat: number, isAccent: boolean, totalBeats: number) => void) | null = null;
  private stateListeners: Set<(isPlaying: boolean) => void> = new Set();
  private beatListeners: Set<(beat: number, isAccent: boolean, totalBeats: number) => void> = new Set();

  constructor() {
    // Lazy AudioContext
  }

  public subscribeState(cb: (isPlaying: boolean) => void): () => void {
    this.stateListeners.add(cb);
    try { cb(this.isPlaying); } catch {}
    return () => {
      this.stateListeners.delete(cb);
    };
  }

  public subscribeBeat(cb: (beat: number, isAccent: boolean, totalBeats: number) => void): () => void {
    this.beatListeners.add(cb);
    return () => {
      this.beatListeners.delete(cb);
    };
  }

  private notifyState() {
    this.stateListeners.forEach((cb) => {
      try { cb(this.isPlaying); } catch {}
    });
  }

  private initCtx() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public start(
    bpm: number, 
    beatsPerMeasure = 4, 
    accents = [0], 
    onBeat?: (beat: number, isAccent: boolean, totalBeats: number) => void
  ) {
    this.initCtx();
    this.bpm = Math.max(30, Math.min(300, bpm));
    this.beatsPerMeasure = Math.max(1, beatsPerMeasure);
    this.accents = accents && accents.length > 0 ? accents : [0];
    this.onBeatCallback = onBeat || null;
    this.isPlaying = true;
    this.currentBeat = 0;
    this.nextBeatTime = this.audioCtx ? this.audioCtx.currentTime + 0.03 : 0;
    this.notifyState();

    this.scheduleLoop();
  }

  public setBpm(bpm: number) {
    this.bpm = Math.max(30, Math.min(300, bpm));
  }

  public setSignature(beatsPerMeasure: number, accents = [0]) {
    this.beatsPerMeasure = Math.max(1, beatsPerMeasure);
    this.accents = accents && accents.length > 0 ? accents : [0];
    if (this.currentBeat >= this.beatsPerMeasure) {
      this.currentBeat = 0;
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public stop() {
    this.isPlaying = false;
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.notifyState();
  }

  private scheduleLoop = () => {
    if (!this.isPlaying || !this.audioCtx) return;

    while (this.nextBeatTime < this.audioCtx.currentTime + 0.1) {
      const isAccent = this.accents.includes(this.currentBeat);
      if (!this.isMuted) {
        this.playClick(this.nextBeatTime, isAccent);
      }

      if (this.onBeatCallback || this.beatListeners.size > 0) {
        // Dispatch UI update on exact scheduled time
        const beatNum = this.currentBeat;
        const total = this.beatsPerMeasure;
        const delayMs = Math.max(0, (this.nextBeatTime - this.audioCtx.currentTime) * 1000);
        setTimeout(() => {
          if (this.isPlaying) {
            this.beatListeners.forEach((cb) => {
              try { cb(beatNum, isAccent, total); } catch {}
            });
            if (this.onBeatCallback) {
              this.onBeatCallback(beatNum, isAccent, total);
            }
          }
        }, delayMs);
      }

      // Increment beat
      const secondsPerBeat = 60.0 / this.bpm;
      this.nextBeatTime += secondsPerBeat;
      this.currentBeat = (this.currentBeat + 1) % this.beatsPerMeasure;
    }

    this.timerId = window.setTimeout(this.scheduleLoop, 25);
  };

  private playClick(time: number, isAccent: boolean) {
    if (!this.audioCtx || this.isMuted) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = isAccent ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(isAccent ? 1200 : 800, time);

      const peakGain = (isAccent ? 0.9 : 0.6) * this.volume;
      gain.gain.setValueAtTime(peakGain, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + (isAccent ? 0.05 : 0.035));

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(time);
      osc.stop(time + (isAccent ? 0.06 : 0.045));
    } catch {
      // AudioContext state exception
    }
  }
}

export const metronome = new MetronomeEngine();

export function stripParentheses(text: string): string {
  if (!text) return '';
  return text.replace(/\s*\([^)]*\)/g, '').trim();
}
