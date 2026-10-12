// Web Audio Engine for Ambient Tonic Continuous Pads
// Generates continuous warm drone harmony on 1st, 5th, and octave intervals
// Compatible with both major and minor songs

export type PadPresetId = 'classic_warm' | 'ambient_shimmer' | 'deep_organ' | 'celestial_strings' | 'soft_sine';

export interface PadPreset {
  id: PadPresetId;
  name: string;
  category: string;
  description: string;
}

export const PAD_PRESETS: PadPreset[] = [
  { id: 'classic_warm', name: 'Classic Warm', category: 'Analog', description: 'Synthé analogique chaud avec filtre passe-bas doux' },
  { id: 'ambient_shimmer', name: 'Ambient Shimmer', category: 'Aérien', description: 'Nappe cristalline aérienne avec harmoniques étincelantes' },
  { id: 'deep_organ', name: 'Deep Organ', category: 'Orgue', description: 'Nappe orgue feutrée avec basse profonde et rondeur' },
  { id: 'celestial_strings', name: 'Celestial Strings', category: 'Cordes', description: 'Ensemble de cordes lentes et atmosphériques' },
  { id: 'soft_sine', name: 'Soft Sine', category: 'Épuré', description: 'Ondes pures intimistes sans agressivité' },
];

export const CHROMATIC_NOTES = [
  { label: 'C', alt: 'Do', semitone: 0 },
  { label: 'Db', alt: 'C#', semitone: 1 },
  { label: 'D', alt: 'Ré', semitone: 2 },
  { label: 'Eb', alt: 'D#', semitone: 3 },
  { label: 'E', alt: 'Mi', semitone: 4 },
  { label: 'F', alt: 'Fa', semitone: 5 },
  { label: 'Gb', alt: 'F#', semitone: 6 },
  { label: 'G', alt: 'Sol', semitone: 7 },
  { label: 'Ab', alt: 'G#', semitone: 8 },
  { label: 'A', alt: 'La', semitone: 9 },
  { label: 'Bb', alt: 'A#', semitone: 10 },
  { label: 'B', alt: 'Si', semitone: 11 },
];

// Helper to convert key name (e.g. "G", "Ab", "C#m", "Em") to semitone index (0 to 11)
export function parseKeyToSemitone(keyName: string | undefined | null): number {
  if (!keyName) return 0;
  // Clean key: strip 'm', 'maj', etc.
  const clean = keyName.trim().replace(/^(.*?)(\/.*)?$/, '$1'); // take root before slash
  const match = clean.match(/^[A-Ga-g][#b]?/);
  if (!match) return 0;
  const root = match[0].toUpperCase();

  const map: Record<string, number> = {
    'C': 0, 'B#': 0,
    'C#': 1, 'DB': 1,
    'D': 2,
    'D#': 3, 'EB': 3,
    'E': 4, 'FB': 4,
    'F': 5, 'E#': 5,
    'F#': 6, 'GB': 6,
    'G': 7,
    'G#': 8, 'AB': 8,
    'A': 9,
    'A#': 10, 'BB': 10,
    'B': 11, 'CB': 11,
  };

  return map[root] !== undefined ? map[root] : 0;
}

class PadAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private currentVoiceGains: GainNode[] = [];
  private currentOscillators: OscillatorNode[] = [];
  private isRunning: boolean = false;
  private currentSemitone: number = 0;
  private currentPreset: PadPresetId = 'classic_warm';
  private currentVolume: number = 0.75;
  private isMuted: boolean = false;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.currentVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  public getCurrentSemitone(): number {
    return this.currentSemitone;
  }

  public getCurrentPreset(): PadPresetId {
    return this.currentPreset;
  }

  public getCurrentVolume(): number {
    return this.currentVolume;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(val: number) {
    this.currentVolume = Math.max(0, Math.min(1, val));
    if (this.ctx && this.masterGain) {
      const target = this.isMuted ? 0 : this.currentVolume;
      this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    this.setVolume(this.currentVolume);
    return this.isMuted;
  }

  public start(semitone: number, preset: PadPresetId = 'classic_warm') {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    this.currentSemitone = semitone;
    this.currentPreset = preset;
    this.isRunning = true;

    // Crossfade: fade out any previous nodes smoothly
    this.fadePreviousVoices();

    // Spawn new voice layer
    this.spawnVoice(semitone, preset);
  }

  public changeNote(semitone: number) {
    if (!this.isRunning) {
      this.start(semitone, this.currentPreset);
      return;
    }
    if (semitone === this.currentSemitone) return;

    this.initContext();
    this.currentSemitone = semitone;

    // Smooth worship crossfade (1.2s)
    this.fadePreviousVoices();
    this.spawnVoice(semitone, this.currentPreset);
  }

  public changePreset(preset: PadPresetId) {
    this.currentPreset = preset;
    if (this.isRunning) {
      this.fadePreviousVoices();
      this.spawnVoice(this.currentSemitone, preset);
    }
  }

  public stop() {
    this.isRunning = false;
    this.fadePreviousVoices(0.6);
  }

  private fadePreviousVoices(duration: number = 1.2) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    // Ramp down all active voice gains
    this.currentVoiceGains.forEach(g => {
      try {
        g.gain.cancelScheduledValues(now);
        g.gain.setValueAtTime(g.gain.value, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      } catch {
        // Fallback linear
        g.gain.linearRampToValueAtTime(0, now + duration);
      }
    });

    const oldOscs = [...this.currentOscillators];
    setTimeout(() => {
      oldOscs.forEach(osc => {
        try {
          osc.stop();
          osc.disconnect();
        } catch {}
      });
    }, duration * 1000 + 100);

    this.currentVoiceGains = [];
    this.currentOscillators = [];
  }

  private spawnVoice(semitone: number, preset: PadPresetId) {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Voice sub-master gain node with smooth attack
    const voiceGain = ctx.createGain();
    voiceGain.gain.setValueAtTime(0.0001, now);
    voiceGain.gain.exponentialRampToValueAtTime(1.0, now + 1.2);
    voiceGain.connect(this.masterGain);
    this.currentVoiceGains.push(voiceGain);

    // Root frequency (C2 = 65.41 Hz base)
    const baseFreq = 65.406 * Math.pow(2, semitone / 12); // Octave 2
    const fifthFreq = baseFreq * 1.498307; // Perfect 5th

    // Filter setup depending on preset
    const filter = ctx.createBiquadFilter();
    filter.connect(voiceGain);

    switch (preset) {
      case 'ambient_shimmer':
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1100, now);
        filter.Q.setValueAtTime(2.2, now);
        this.addLayer(baseFreq, 'sine', [0, 5], 0.28, filter);
        this.addLayer(baseFreq * 2, 'triangle', [-4, 4], 0.22, filter);
        this.addLayer(fifthFreq * 2, 'sine', [-3, 3], 0.20, filter);
        this.addLayer(baseFreq * 4, 'sine', [-6, 6], 0.12, filter); // Shimmer octave
        break;

      case 'deep_organ':
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(380, now);
        filter.Q.setValueAtTime(1.2, now);
        this.addLayer(baseFreq * 0.5, 'sine', [0], 0.35, filter); // Sub-bass
        this.addLayer(baseFreq, 'triangle', [-2, 2], 0.30, filter);
        this.addLayer(fifthFreq, 'sine', [0], 0.25, filter);
        this.addLayer(baseFreq * 2, 'square', [-3, 3], 0.08, filter);
        break;

      case 'celestial_strings':
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(750, now);
        filter.Q.setValueAtTime(1.8, now);
        this.addLayer(baseFreq, 'sawtooth', [-8, 8], 0.15, filter);
        this.addLayer(baseFreq * 2, 'sawtooth', [-11, 11], 0.12, filter);
        this.addLayer(fifthFreq, 'triangle', [-4, 4], 0.18, filter);
        this.addLayer(baseFreq * 3, 'sine', [0], 0.10, filter);
        break;

      case 'soft_sine':
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, now);
        filter.Q.setValueAtTime(0.5, now);
        this.addLayer(baseFreq, 'sine', [0], 0.35, filter);
        this.addLayer(baseFreq * 2, 'sine', [-2, 2], 0.25, filter);
        this.addLayer(fifthFreq, 'sine', [0], 0.25, filter);
        break;

      case 'classic_warm':
      default:
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(520, now);
        filter.Q.setValueAtTime(1.5, now);
        this.addLayer(baseFreq, 'sawtooth', [-6, 6], 0.16, filter);
        this.addLayer(baseFreq * 2, 'triangle', [-4, 4], 0.20, filter);
        this.addLayer(fifthFreq, 'sawtooth', [-5, 5], 0.14, filter);
        this.addLayer(baseFreq * 4, 'sine', [0], 0.08, filter);
        break;
    }
  }

  private addLayer(freq: number, type: OscillatorType, detunes: number[], gainMultiplier: number, destination: AudioNode) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    detunes.forEach(detune => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      osc.detune.setValueAtTime(detune, now);

      gain.gain.setValueAtTime(gainMultiplier / detunes.length, now);

      osc.connect(gain);
      gain.connect(destination);
      osc.start(now);

      this.currentOscillators.push(osc);
    });
  }
}

export const padAudio = new PadAudioEngine();
