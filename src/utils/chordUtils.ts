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

  const preferFlats = chordString.includes('b') || chordString.startsWith('F') || chordString.startsWith('Bb') || chordString.startsWith('Eb');
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

  let hasKeyDirective = false;
  const lines = chordProText.split('\n');
  const transposedLines = lines.map(line => {
    const trimmed = line.trim();

    // Check for {key: X} or {k: X}
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const directive = trimmed.slice(1, -1).trim();
      const colonIndex = directive.indexOf(':');
      if (colonIndex !== -1) {
        const tag = directive.slice(0, colonIndex).trim().toLowerCase();
        const value = directive.slice(colonIndex + 1).trim();
        if (tag === 'key' || tag === 'k') {
          hasKeyDirective = true;
          const finalKey = explicitTargetKey || (semitones !== 0 ? transposeChord(value, semitones, notation) : value);
          return `{${tag}: ${finalKey}}`;
        }
      }
      return line;
    }

    if (semitones === 0) return line;

    // Transpose chords in brackets [Chord]
    return line.replace(/\[(.*?)\]/g, (_, chordContent) => {
      const trimmedChord = chordContent.trim();
      if (!trimmedChord) return '[]';
      const transposed = transposeChord(trimmedChord, semitones, notation);
      return `[${transposed}]`;
    });
  });

  // If no {key: ...} existed but we have an explicitTargetKey, insert it
  if (!hasKeyDirective && explicitTargetKey) {
    let insertIndex = -1;
    for (let i = 0; i < transposedLines.length; i++) {
      const t = transposedLines[i].trim().toLowerCase();
      if (t.startsWith('{title:') || t.startsWith('{t:') || t.startsWith('{artist:') || t.startsWith('{a:')) {
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

export interface ParsedItem {
  chord: string;
  lyrics: string;
}

export interface ParsedLine {
  type: 'lyrics' | 'comment' | 'empty' | 'section';
  sectionType?: string; // verse, chorus, bridge, tag, intro, outro
  items: ParsedItem[];
  comment?: string;
}

export interface ParsedSection {
  title?: string;
  type: 'verse' | 'chorus' | 'bridge' | 'pre_chorus' | 'intro' | 'outro' | 'solo' | 'interlude' | 'instrumental' | 'tag' | 'finale' | 'general' | string;
  vocals?: string[];
  vocal?: string;
  repeat?: number;
  lines: ParsedLine[];
}

export interface ParsedSongData {
  title: string;
  artist: string;
  key: string;
  hasExplicitKey?: boolean;
  tempo: number;
  timeSignature: string;
  duration?: string;
  capo: number;
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

// Update vocal arrangements and repetition count for a given section inside raw ChordPro text
export function updateSectionMetaInChordPro(
  chordProText: string, 
  targetSectionIndex: number, 
  options: { newVocals?: string[]; newRepeat?: number; newTitle?: string }
): string {
  const rawLines = chordProText.split('\n');
  let currentSectionIdx = -1;
  let sectionHeaderLineIdx = -1;

  for (let i = 0; i < rawLines.length; i++) {
    const trimmed = rawLines[i].trim();
    
    // Check if line starts a section
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const directive = trimmed.slice(1, -1).trim();
      const colonIndex = directive.indexOf(':');
      const tag = (colonIndex !== -1 ? directive.slice(0, colonIndex) : directive).trim().toLowerCase();

      if (['comment', 'c', 'start_of_chorus', 'soc', 'start_of_verse', 'sov', 'start_of_bridge', 'sob'].includes(tag)) {
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
    const val = colonIndex !== -1 ? directive.slice(colonIndex + 1).trim() : '';

    const currentMeta = extractVocalTag(val);
    const finalTitle = options.newTitle !== undefined ? options.newTitle : currentMeta.cleanTitle;
    const finalVocals = options.newVocals !== undefined ? options.newVocals : currentMeta.vocals;
    const finalRepeat = options.newRepeat !== undefined ? options.newRepeat : currentMeta.repeat;

    const newTitle = finalTitle || (tag.toLowerCase().includes('chorus') || tag.toLowerCase() === 'soc' ? 'Refrain' : tag.toLowerCase().includes('verse') || tag.toLowerCase() === 'sov' ? 'Couplet' : tag.toLowerCase().includes('bridge') || tag.toLowerCase() === 'sob' ? 'Pont' : 'Section');

    const metaTags: string[] = [];
    if (finalRepeat > 1) {
      metaTags.push(`x${finalRepeat}`);
    }
    finalVocals.forEach(v => {
      if (v && v.trim()) metaTags.push(v.trim());
    });

    let newLine = '';
    if (metaTags.length > 0) {
      newLine = `{${tag}: ${newTitle} [${metaTags.join(', ')}]}`;
    } else {
      newLine = `{${tag}: ${newTitle}}`;
    }

    rawLines[sectionHeaderLineIdx] = newLine;
    return rawLines.join('\n');
  }

  // If section was general without header at section 0
  if (targetSectionIndex === 0 && rawLines.length > 0) {
    const metaTags: string[] = [];
    if (options.newRepeat && options.newRepeat > 1) metaTags.push(`x${options.newRepeat}`);
    if (options.newVocals) {
      options.newVocals.forEach(v => { if (v && v.trim()) metaTags.push(v.trim()); });
    }

    if (metaTags.length > 0 || options.newTitle) {
      let insertIdx = 0;
      for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i].trim();
        if (line.startsWith('{title:') || line.startsWith('{artist:') || line.startsWith('{key:') || line.startsWith('{tempo:') || line.startsWith('{capo:') || line.startsWith('{time:')) {
          insertIdx = i + 1;
        } else if (line !== '') {
          break;
        }
      }
      const title = options.newTitle || 'Section';
      const metaStr = metaTags.length > 0 ? ` [${metaTags.join(', ')}]` : '';
      rawLines.splice(insertIdx, 0, `{c: ${title}${metaStr}}`);
      return rawLines.join('\n');
    }
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

// Convert ChordPro string into structured sections for visual stage presentation
export function parseChordPro(chordProText: string): ParsedSongData {
  let title = 'Sans Titre';
  let artist = '';
  let key = 'C';
  let hasExplicitKey = false;
  let tempo = 120;
  let timeSignature = '4/4';
  let duration = '';
  let capo = 0;

  const sections: ParsedSection[] = [];
  let currentSection: ParsedSection = {
    type: 'general',
    lines: []
  };

  const rawLines = chordProText.split('\n');

  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i].trim();

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

      if (tag === 'title' || tag === 't') {
        title = value;
      } else if (tag === 'artist' || tag === 'a' || tag === 'subtitle' || tag === 'st') {
        artist = value;
      } else if (tag === 'key' || tag === 'k') {
        key = value;
        hasExplicitKey = true;
      } else if (tag === 'tempo' || tag === 'bpm') {
        tempo = parseInt(value, 10) || 120;
      } else if (tag === 'time' || tag === 'timesignature') {
        timeSignature = value;
      } else if (tag === 'duration' || tag === 'd' || tag === 'duree' || tag === 'durée' || tag === 'time_duration') {
        duration = value;
      } else if (tag === 'capo') {
        capo = parseInt(value, 10) || 0;
      } else if (tag === 'vocal' || tag === 'voix' || tag === 'arrangement' || tag === 'arrangement_vocal' || tag === 'vocal_arrangement') {
        // Direct vocal arrangement tag for current section
        const rawVocals = value.split(',').map(s => s.trim()).filter(Boolean);
        currentSection.vocals = Array.from(new Set([...(currentSection.vocals || []), ...rawVocals]));
        currentSection.vocal = currentSection.vocals.join(', ');
      } else if (tag === 'repeat' || tag === 'repetition' || tag === 'rep' || tag === 'fois') {
        const parsedRep = parseInt(value, 10);
        if (parsedRep > 0) currentSection.repeat = parsedRep;
      } else if (tag === 'start_of_chorus' || tag === 'soc') {
        if (currentSection.lines.length > 0) {
          sections.push(currentSection);
        }
        const { cleanTitle, vocals, vocal, repeat } = extractVocalTag(value || 'Refrain');
        currentSection = {
          title: cleanTitle || 'Refrain',
          type: 'chorus',
          vocals,
          vocal,
          repeat,
          lines: []
        };
      } else if (tag === 'end_of_chorus' || tag === 'eoc') {
        if (currentSection.lines.length > 0) {
          sections.push(currentSection);
        }
        currentSection = { type: 'general', lines: [] };
      } else if (tag === 'start_of_bridge' || tag === 'sob') {
        if (currentSection.lines.length > 0) {
          sections.push(currentSection);
        }
        const { cleanTitle, vocals, vocal, repeat } = extractVocalTag(value || 'Pont');
        currentSection = {
          title: cleanTitle || 'Pont',
          type: 'bridge',
          vocals,
          vocal,
          repeat,
          lines: []
        };
      } else if (tag === 'end_of_bridge' || tag === 'eob') {
        if (currentSection.lines.length > 0) {
          sections.push(currentSection);
        }
        currentSection = { type: 'general', lines: [] };
      } else if (tag === 'start_of_verse' || tag === 'sov') {
        if (currentSection.lines.length > 0) {
          sections.push(currentSection);
        }
        const { cleanTitle, vocals, vocal, repeat } = extractVocalTag(value || 'Couplet');
        currentSection = {
          title: cleanTitle || 'Couplet',
          type: 'verse',
          vocals,
          vocal,
          repeat,
          lines: []
        };
      } else if (tag === 'end_of_verse' || tag === 'eov') {
        if (currentSection.lines.length > 0) {
          sections.push(currentSection);
        }
        currentSection = { type: 'general', lines: [] };
      } else if (tag === 'comment' || tag === 'c') {
        // Section header comment detection (e.g. {c: Couplet 1}, {c: Verse 1}, {c: V1}, {c: Refrain}, {c: C1}, {c: Pont})
        const { cleanTitle, vocals, vocal, repeat } = extractVocalTag(value);
        const lowerVal = cleanTitle.trim().toLowerCase();
        let secType: ParsedSection['type'] = 'general';

        if (/^(?:pre[- ]?chorus|pr[ée][- ]?refrain|pc\d*|pr\d*)$/i.test(lowerVal) || lowerVal.includes('pré') || lowerVal.includes('pre') || lowerVal.includes('prerefrain') || lowerVal.includes('pre-chorus') || lowerVal.includes('prechorus')) {
          secType = 'pre_chorus';
        } else if (/^(?:c\d+|r\d+|chorus|refrain)$/i.test(lowerVal) || lowerVal.includes('refrain') || lowerVal.includes('chorus')) {
          secType = 'chorus';
        } else if (/^(?:v\d+|verse|couplet|strophe)$/i.test(lowerVal) || lowerVal.includes('couplet') || lowerVal.includes('verse') || lowerVal.includes('strophe')) {
          secType = 'verse';
        } else if (/^(?:b\d+|p\d+|bridge|pont)$/i.test(lowerVal) || lowerVal.includes('pont') || lowerVal.includes('bridge')) {
          secType = 'bridge';
        } else if (/^(?:in|intro\d*)$/i.test(lowerVal) || lowerVal.includes('intro')) {
          secType = 'intro';
        } else if (/^(?:outro\d*|out|fin\d*|finale\d*)$/i.test(lowerVal) || lowerVal.includes('finale') || lowerVal.includes('outro') || lowerVal.includes('fin')) {
          secType = 'outro';
        } else if (/^(?:s\d+|solo\d*)$/i.test(lowerVal) || lowerVal.includes('solo')) {
          secType = 'solo';
        } else if (/^(?:int\d*|interlude\d*)$/i.test(lowerVal) || lowerVal.includes('interlude')) {
          secType = 'interlude';
        } else if (/^(?:inst\d*|instrumental\d*|instru\d*)$/i.test(lowerVal) || lowerVal.includes('instru') || lowerVal.includes('instrumental')) {
          secType = 'instrumental';
        } else if (/^(?:tag\d*|coda\d*|t\d*)$/i.test(lowerVal) || lowerVal.includes('tag') || lowerVal.includes('coda')) {
          secType = 'tag';
        } else if (cleanTitle && cleanTitle.trim()) {
          secType = cleanTitle.trim();
        }

        if (currentSection.lines.length > 0) {
          sections.push(currentSection);
        }
        currentSection = {
          title: cleanTitle,
          type: secType,
          vocals,
          vocal,
          repeat,
          lines: []
        };
      }
      continue;
    }

    if (rawLine === '') {
      // Empty line
      if (currentSection.lines.length > 0) {
        currentSection.lines.push({
          type: 'empty',
          items: []
        });
      }
      continue;
    }

    // Parse [Chord]Lyrics line
    const items: ParsedItem[] = [];
    const chordRegex = /\[(.*?)\]([^\[]*)/g;
    let match;
    let hasChords = false;

    // Check if line starts with lyrics before first chord
    const firstBracket = rawLine.indexOf('[');
    if (firstBracket > 0) {
      items.push({
        chord: '',
        lyrics: rawLine.slice(0, firstBracket)
      });
    } else if (firstBracket === -1) {
      // Plain text line with no chords
      items.push({
        chord: '',
        lyrics: rawLine
      });
    }

    while ((match = chordRegex.exec(rawLine)) !== null) {
      hasChords = true;
      items.push({
        chord: match[1].trim(),
        lyrics: match[2]
      });
    }

    currentSection.lines.push({
      type: 'lyrics',
      items
    });
  }

  if (currentSection.lines.length > 0) {
    sections.push(currentSection);
  }

  return {
    title,
    artist,
    key,
    hasExplicitKey,
    tempo,
    timeSignature,
    duration: duration ? formatDurationToMMSS(duration) : undefined,
    capo,
    sections,
    rawChordPro: chordProText
  };
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
        if (l.type === 'empty') return false;
        return l.items && l.items.some(it => (it.lyrics && it.lyrics.trim().length > 0) || (it.chord && it.chord.trim().length > 0));
      });

      if (validLines.length > 0) {
        for (const line of validLines) {
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

  constructor() {
    // Lazy AudioContext
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
  }

  private scheduleLoop = () => {
    if (!this.isPlaying || !this.audioCtx) return;

    while (this.nextBeatTime < this.audioCtx.currentTime + 0.1) {
      const isAccent = this.accents.includes(this.currentBeat);
      if (!this.isMuted) {
        this.playClick(this.nextBeatTime, isAccent);
      }

      if (this.onBeatCallback) {
        // Dispatch UI update on exact scheduled time
        const beatNum = this.currentBeat;
        const total = this.beatsPerMeasure;
        const delayMs = Math.max(0, (this.nextBeatTime - this.audioCtx.currentTime) * 1000);
        setTimeout(() => {
          if (this.isPlaying && this.onBeatCallback) {
            this.onBeatCallback(beatNum, isAccent, total);
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
