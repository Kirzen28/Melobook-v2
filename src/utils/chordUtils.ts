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
  type: 'verse' | 'chorus' | 'bridge' | 'intro' | 'outro' | 'instrumental' | 'tag' | 'general';
  lines: ParsedLine[];
}

export interface ParsedSongData {
  title: string;
  artist: string;
  key: string;
  tempo: number;
  timeSignature: string;
  capo: number;
  sections: ParsedSection[];
  rawChordPro: string;
}

// Convert ChordPro string into structured sections for visual stage presentation
export function parseChordPro(chordProText: string): ParsedSongData {
  let title = 'Sans Titre';
  let artist = '';
  let key = 'C';
  let tempo = 120;
  let timeSignature = '4/4';
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
      } else if (tag === 'tempo' || tag === 'bpm') {
        tempo = parseInt(value, 10) || 120;
      } else if (tag === 'time' || tag === 'timesignature') {
        timeSignature = value;
      } else if (tag === 'capo') {
        capo = parseInt(value, 10) || 0;
      } else if (tag === 'start_of_chorus' || tag === 'soc') {
        if (currentSection.lines.length > 0) {
          sections.push(currentSection);
        }
        currentSection = {
          title: value || 'Refrain',
          type: 'chorus',
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
        currentSection = {
          title: value || 'Pont',
          type: 'bridge',
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
        currentSection = {
          title: value || 'Couplet',
          type: 'verse',
          lines: []
        };
      } else if (tag === 'end_of_verse' || tag === 'eov') {
        if (currentSection.lines.length > 0) {
          sections.push(currentSection);
        }
        currentSection = { type: 'general', lines: [] };
      } else if (tag === 'comment' || tag === 'c') {
        // Section header comment detection (e.g. {c: Couplet 1}, {c: Refrain}, {c: Pont})
        const lowerVal = value.toLowerCase();
        let secType: ParsedSection['type'] = 'general';
        if (lowerVal.includes('refrain') || lowerVal.includes('chorus')) secType = 'chorus';
        else if (lowerVal.includes('couplet') || lowerVal.includes('verse')) secType = 'verse';
        else if (lowerVal.includes('pont') || lowerVal.includes('bridge')) secType = 'bridge';
        else if (lowerVal.includes('intro')) secType = 'intro';
        else if (lowerVal.includes('outro') || lowerVal.includes('fin')) secType = 'outro';
        else if (lowerVal.includes('interlude') || lowerVal.includes('instru')) secType = 'instrumental';
        else if (lowerVal.includes('tag')) secType = 'tag';

        if (currentSection.lines.length > 0) {
          sections.push(currentSection);
        }
        currentSection = {
          title: value,
          type: secType,
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
    tempo,
    timeSignature,
    capo,
    sections,
    rawChordPro: chordProText
  };
}

// Web Audio API Metronome Synth
class MetronomeEngine {
  private audioCtx: AudioContext | null = null;
  private isPlaying = false;
  private bpm = 120;
  private nextBeatTime = 0;
  private currentBeat = 0;
  private beatsPerMeasure = 4;
  private timerId: number | null = null;
  private onBeatCallback: ((beat: number) => void) | null = null;

  constructor() {
    // Lazy AudioContext
  }

  private initCtx() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public start(bpm: number, beatsPerMeasure = 4, onBeat?: (beat: number) => void) {
    this.initCtx();
    this.bpm = Math.max(30, Math.min(300, bpm));
    this.beatsPerMeasure = beatsPerMeasure;
    this.onBeatCallback = onBeat || null;
    this.isPlaying = true;
    this.currentBeat = 0;
    this.nextBeatTime = this.audioCtx!.currentTime + 0.05;

    this.scheduleLoop();
  }

  public setBpm(bpm: number) {
    this.bpm = Math.max(30, Math.min(300, bpm));
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
      this.playClick(this.nextBeatTime, this.currentBeat === 0);
      if (this.onBeatCallback) {
        // Dispatch UI update
        const beatNum = this.currentBeat;
        setTimeout(() => {
          if (this.isPlaying && this.onBeatCallback) {
            this.onBeatCallback(beatNum);
          }
        }, Math.max(0, (this.nextBeatTime - this.audioCtx!.currentTime) * 1000));
      }

      // Increment beat
      const secondsPerBeat = 60.0 / this.bpm;
      this.nextBeatTime += secondsPerBeat;
      this.currentBeat = (this.currentBeat + 1) % this.beatsPerMeasure;
    }

    this.timerId = window.setTimeout(this.scheduleLoop, 25);
  };

  private playClick(time: number, isAccent: boolean) {
    if (!this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = isAccent ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(isAccent ? 1000 : 700, time);

    gain.gain.setValueAtTime(1, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start(time);
    osc.stop(time + 0.05);
  }
}

export const metronome = new MetronomeEngine();
