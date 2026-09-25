// Web Audio API engine & music theory helpers for Mini Piano

export type TimbreType = 'acoustic' | 'pure';

export interface ActiveNoteInfo {
  midi: number;
  freq: number;
  anglo: string;
  latin: string;
  octave: number;
}

export const NOTE_NAMES_ANGLO = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const NOTE_NAMES_LATIN = ['Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];

export const TONALITIES = [
  { root: 0, anglo: 'C', latin: 'Do' },
  { root: 1, anglo: 'C# / Db', latin: 'Do# / Réb' },
  { root: 2, anglo: 'D', latin: 'Ré' },
  { root: 3, anglo: 'Eb', latin: 'Mib' },
  { root: 4, anglo: 'E', latin: 'Mi' },
  { root: 5, anglo: 'F', latin: 'Fa' },
  { root: 6, anglo: 'F# / Gb', latin: 'Fa# / Solb' },
  { root: 7, anglo: 'G', latin: 'Sol' },
  { root: 8, anglo: 'Ab', latin: 'Lab' },
  { root: 9, anglo: 'A', latin: 'La' },
  { root: 10, anglo: 'Bb', latin: 'Sib' },
  { root: 11, anglo: 'B', latin: 'Si' },
];

export const SCALES = [
  { id: 'major', name: 'Gamme Majeure', intervals: [0, 2, 4, 5, 7, 9, 11], desc: 'Ionien (1, 2, 3, 4, 5, 6, 7)' },
  { id: 'minor_nat', name: 'Gamme Mineure Nat.', intervals: [0, 2, 3, 5, 7, 8, 10], desc: 'Éolien (1, 2, b3, 4, 5, b6, b7)' },
  { id: 'minor_harm', name: 'Mineure Harmonique', intervals: [0, 2, 3, 5, 7, 8, 11], desc: '1, 2, b3, 4, 5, b6, 7' },
  { id: 'penta_maj', name: 'Pentatonique Maj.', intervals: [0, 2, 4, 7, 9], desc: '1, 2, 3, 5, 6' },
  { id: 'penta_min', name: 'Pentatonique Min.', intervals: [0, 3, 5, 7, 10], desc: '1, b3, 4, 5, b7' },
  { id: 'blues', name: 'Gamme Blues', intervals: [0, 3, 5, 6, 7, 10], desc: '1, b3, 4, b5, 5, b7' },
  { id: 'chord_maj', name: 'Accord Majeur (Triade)', intervals: [0, 4, 7], desc: '1 - 3 - 5' },
  { id: 'chord_min', name: 'Accord Mineur (Triade)', intervals: [0, 3, 7], desc: '1 - b3 - 5' },
  { id: 'chord_7', name: 'Accord 7ème dominante', intervals: [0, 4, 7, 10], desc: '1 - 3 - 5 - b7' },
  { id: 'chord_maj7', name: 'Accord Maj 7', intervals: [0, 4, 7, 11], desc: '1 - 3 - 5 - 7' },
  { id: 'chord_m7', name: 'Accord Mineur 7', intervals: [0, 3, 7, 10], desc: '1 - b3 - 5 - b7' },
  { id: 'chord_sus4', name: 'Accord Sus4', intervals: [0, 5, 7], desc: '1 - 4 - 5' },
];

// Key signature accidentals dictionary
export const KEY_SIGNATURES: Record<string, string> = {
  '0-major': 'Aucune altération (Do majeur / La mineur)',
  '7-major': '1 dièse (Fa#) — Sol majeur / Mi mineur',
  '2-major': '2 dièses (Fa#, Do#) — Ré majeur / Si mineur',
  '9-major': '3 dièses (Fa#, Do#, Sol#) — La majeur / Fa# mineur',
  '4-major': '4 dièses (Fa#, Do#, Sol#, Ré#) — Mi majeur / Do# mineur',
  '11-major': '5 dièses (Fa#, Do#, Sol#, Ré#, La#) — Si majeur / Sol# mineur',
  '6-major': '6 dièses (Fa#, Do#, Sol#, Ré#, La#, Mi#) — Fa# majeur',
  '5-major': '1 bémol (Sib) — Fa majeur / Ré mineur',
  '10-major': '2 bémols (Sib, Mib) — Sib majeur / Sol mineur',
  '3-major': '3 bémols (Sib, Mib, Lab) — Mib majeur / Do mineur',
  '8-major': '4 bémols (Sib, Mib, Lab, Réb) — Lab majeur / Fa mineur',
  '1-major': '5 bémols (Sib, Mib, Lab, Réb, Solb) — Réb majeur / Sib mineur',
};

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function midiToNoteInfo(midi: number): ActiveNoteInfo {
  const pitchClass = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const freq = Math.round(midiToFreq(midi) * 10) / 10;
  return {
    midi,
    freq,
    anglo: `${NOTE_NAMES_ANGLO[pitchClass]}${octave}`,
    latin: `${NOTE_NAMES_LATIN[pitchClass]} ${octave}`,
    octave,
  };
}

export function detectChord(midiList: number[]): string | null {
  if (midiList.length === 0) return null;
  if (midiList.length === 1) {
    const info = midiToNoteInfo(midiList[0]);
    return `${info.anglo} (${info.latin}) • ${info.freq} Hz`;
  }

  // Normalize pitch classes
  const pitchClasses = Array.from(new Set(midiList.map(m => ((m % 12) + 12) % 12))).sort((a, b) => a - b);
  
  if (pitchClasses.length === 2) {
    const diff = (pitchClasses[1] - pitchClasses[0]) % 12;
    const intervalNames: Record<number, string> = {
      1: 'Seconde mineure (demi-ton)',
      2: 'Seconde majeure (1 ton)',
      3: 'Tierce mineure',
      4: 'Tierce majeure',
      5: 'Quarte juste',
      6: 'Triton (quinte diminuée)',
      7: 'Quinte juste (Powerchord 5)',
      8: 'Sixte mineure',
      9: 'Sixte majeure',
      10: 'Septième mineure',
      11: 'Septième majeure',
    };
    const rootName = NOTE_NAMES_LATIN[pitchClasses[0]];
    const secondName = NOTE_NAMES_LATIN[pitchClasses[1]];
    return `${intervalNames[diff] || 'Intervalle'} (${rootName} - ${secondName})`;
  }

  // Look for chords from each root note candidate
  for (let r = 0; r < pitchClasses.length; r++) {
    const root = pitchClasses[r];
    const intervals = pitchClasses.map(p => (p - root + 12) % 12).sort((a, b) => a - b);
    const pattern = intervals.join(',');

    const rootAnglo = NOTE_NAMES_ANGLO[root];
    const rootLatin = NOTE_NAMES_LATIN[root];

    if (pattern === '0,4,7') return `${rootLatin} Majeur (${rootAnglo})`;
    if (pattern === '0,3,7') return `${rootLatin} Mineur (${rootAnglo}m)`;
    if (pattern === '0,4,7,10') return `${rootLatin} 7ème (${rootAnglo}7)`;
    if (pattern === '0,4,7,11') return `${rootLatin} Majeur 7 (${rootAnglo}maj7)`;
    if (pattern === '0,3,7,10') return `${rootLatin} Mineur 7 (${rootAnglo}m7)`;
    if (pattern === '0,5,7') return `${rootLatin} Sus4 (${rootAnglo}sus4)`;
    if (pattern === '0,2,7') return `${rootLatin} Sus2 (${rootAnglo}sus2)`;
    if (pattern === '0,3,6') return `${rootLatin} Diminué (${rootAnglo}dim)`;
    if (pattern === '0,4,8') return `${rootLatin} Augmenté (${rootAnglo}aug)`;
    if (pattern === '0,4,7,9') return `${rootLatin} 6ème (${rootAnglo}6)`;
  }

  // Default notes display
  const noteNames = pitchClasses.map(p => NOTE_NAMES_LATIN[p]).join(' - ');
  return `Notes : ${noteNames}`;
}

interface NoteAudioNodes {
  oscs: OscillatorNode[];
  gain: GainNode;
  filter?: BiquadFilterNode;
}

class PianoAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNotes: Map<number, NoteAudioNodes> = new Map();
  private volume: number = 0.75;
  private isMuted: boolean = false;
  private timbre: TimbreType = 'acoustic';

  private initContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.ctx && this.masterGain && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.02);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : this.volume, this.ctx.currentTime, 0.02);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setTimbre(timbre: TimbreType) {
    this.timbre = timbre;
  }

  public getTimbre(): TimbreType {
    return this.timbre;
  }

  public startNote(midi: number, velocity: number = 0.8) {
    // If note is already playing, stop previous instance
    this.stopNote(midi, true);

    const ctx = this.initContext();
    const now = ctx.currentTime;
    const freq = midiToFreq(midi);

    const noteGain = ctx.createGain();
    const oscs: OscillatorNode[] = [];
    let filter: BiquadFilterNode | undefined;

    if (this.timbre === 'acoustic') {
      // Acoustic piano synthesis: triangle fundamental + soft sine octave + warmth filter
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      filter = ctx.createBiquadFilter();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, now);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2, now); // 2nd harmonic for piano brightness

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(Math.min(7000, freq * 5), now);
      filter.frequency.exponentialRampToValueAtTime(Math.max(150, freq * 1.2), now + 2.0);

      // Envelope: instant soft attack, gentle decay
      const peak = 0.28 * velocity;
      noteGain.gain.setValueAtTime(0.0001, now);
      noteGain.gain.linearRampToValueAtTime(peak, now + 0.008);
      noteGain.gain.exponentialRampToValueAtTime(peak * 0.55, now + 0.3);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 4.5); // long natural sustain

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(noteGain);

      osc1.start(now);
      osc2.start(now);
      oscs.push(osc1, osc2);
    } else {
      // Pure sine (Tone generator / Tuning fork - Diapason pur)
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const peak = 0.32 * velocity;
      noteGain.gain.setValueAtTime(0.0001, now);
      noteGain.gain.linearRampToValueAtTime(peak, now + 0.015);
      noteGain.gain.setValueAtTime(peak, now + 0.02);

      osc.connect(noteGain);
      osc.start(now);
      oscs.push(osc);
    }

    if (this.masterGain) {
      noteGain.connect(this.masterGain);
    }

    this.activeNotes.set(midi, { oscs, gain: noteGain, filter });
  }

  public stopNote(midi: number, instant: boolean = false, sustain: boolean = false) {
    const node = this.activeNotes.get(midi);
    if (!node || !this.ctx) return;

    const now = this.ctx.currentTime;
    const releaseTime = sustain ? 1.6 : (instant ? 0.02 : 0.22);

    try {
      node.gain.gain.cancelScheduledValues(now);
      node.gain.gain.setValueAtTime(node.gain.gain.value, now);
      node.gain.gain.exponentialRampToValueAtTime(0.0001, now + releaseTime);

      setTimeout(() => {
        try {
          node.oscs.forEach(o => {
            try { o.stop(); o.disconnect(); } catch (e) {}
          });
          node.gain.disconnect();
          if (node.filter) node.filter.disconnect();
        } catch (e) {}
      }, (releaseTime + 0.05) * 1000);
    } catch (e) {}

    this.activeNotes.delete(midi);
  }

  public stopAll() {
    this.activeNotes.forEach((_, midi) => this.stopNote(midi, true));
    this.activeNotes.clear();
  }

  // Play a single note with automatic release (e.g. for preview)
  public playNoteOnce(midi: number, duration: number = 0.8) {
    this.startNote(midi);
    setTimeout(() => {
      this.stopNote(midi, false);
    }, duration * 1000);
  }

  // Play an arpeggio preview of notes
  public playSequence(midis: number[], intervalMs: number = 180, holdMs: number = 600) {
    midis.forEach((midi, index) => {
      setTimeout(() => {
        this.startNote(midi, 0.85);
        setTimeout(() => {
          this.stopNote(midi, false);
        }, holdMs);
      }, index * intervalMs);
    });
  }

  // Play a chord simultaneously
  public playChord(midis: number[], duration: number = 1.6) {
    midis.forEach((midi, idx) => {
      setTimeout(() => {
        this.startNote(midi, 0.8);
      }, idx * 15);
    });
    setTimeout(() => {
      midis.forEach(midi => this.stopNote(midi, false));
    }, duration * 1000);
  }
}

export const pianoAudio = new PianoAudioEngine();
