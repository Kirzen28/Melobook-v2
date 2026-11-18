// Web Audio Engine for Ambient Tonic Continuous Pads
// Supports both synthesized ambient harmonic drones and imported audio MP3 pads with automatic pitch-shifting
// Compatible with both major and minor songs, 1.5s smooth worship crossfade

import { CustomPad } from '../types';
import { getAudioArrayBufferFromIndexedDB, saveAudioBlobToIndexedDB } from './indexedDB';

export type PadPresetId = 'foundations_rewakens' | 'classic_warm' | 'ambient_shimmer' | 'deep_organ' | 'celestial_strings' | 'soft_sine';

export interface PadPreset {
  id: PadPresetId;
  name: string;
  category: string;
  description: string;
  audioUrl?: string;
  rootSemitone?: number;
  rootKey?: string;
}

export const PAD_PRESETS: PadPreset[] = [
  { 
    id: 'foundations_rewakens', 
    name: 'Foundations - Rewakens', 
    category: 'Atmosphérique', 
    description: 'Nappe continue worship en boucle infinie (Référence La / A)',
    audioUrl: '/assets/audio/pads/foundations_rewakens_A.mp3',
    rootSemitone: 9,
    rootKey: 'A'
  },
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
  private currentSources: AudioBufferSourceNode[] = [];
  private isRunning: boolean = false;
  private currentSemitone: number = 0;
  private currentPreset: PadPresetId = 'foundations_rewakens';
  private activeMode: 'synth' | 'custom' = 'synth';
  private activeCustomPad: CustomPad | null = null;
  private currentVolume: number = 0.75;
  private isMuted: boolean = false;
  private isLooping: boolean = true;
  private crossfadeDuration: number = (() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('melobook_pad_crossfade_duration') : null;
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= 0.2 && val <= 8.0) return val;
      }
    } catch {}
    return 1.8;
  })();
  private octaveShift: number = 0; // -1, 0, +1
  private bufferCache: Map<string, AudioBuffer> = new Map();
  private loadingPromises: Map<string, Promise<AudioBuffer | null>> = new Map();
  private listeners: Set<() => void> = new Set();

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(fn => {
      try { fn(); } catch (e) { console.error(e); }
    });
  }

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

  public getActiveMode(): 'synth' | 'custom' {
    return this.activeMode;
  }

  public getActiveCustomPad(): CustomPad | null {
    return this.activeCustomPad;
  }

  public getCurrentVolume(): number {
    return this.currentVolume;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getIsLooping(): boolean {
    return this.isLooping;
  }

  public setIsLooping(loop: boolean) {
    this.isLooping = loop;
    this.currentSources.forEach(s => {
      try { s.loop = loop; } catch (e) {}
    });
    this.notify();
  }

  public getCrossfadeDuration(): number {
    return this.crossfadeDuration;
  }

  public setCrossfadeDuration(sec: number) {
    this.crossfadeDuration = Math.max(0.2, Math.min(6.0, sec));
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('melobook_pad_crossfade_duration', String(this.crossfadeDuration));
      }
    } catch {}
    this.notify();
  }

  public getOctaveShift(): number {
    return this.octaveShift;
  }

  public setOctaveShift(oct: number) {
    this.octaveShift = Math.max(-2, Math.min(2, oct));
    if (this.isRunning) {
      this.fadePreviousVoices(this.crossfadeDuration);
      this.spawnVoice(this.currentSemitone, this.currentPreset);
    }
    this.notify();
  }

  public setVolume(val: number) {
    this.currentVolume = Math.max(0, Math.min(1, val));
    if (this.ctx && this.masterGain) {
      const target = this.isMuted ? 0 : this.currentVolume;
      this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
    }
    this.notify();
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    this.setVolume(this.currentVolume);
    this.notify();
    return this.isMuted;
  }

  // Preloads and decodes an audio buffer for an imported pad
  public async preloadCustomPad(pad: CustomPad): Promise<AudioBuffer | null> {
    if (!pad || !pad.id) return null;
    if (this.bufferCache.has(pad.id)) {
      return this.bufferCache.get(pad.id)!;
    }
    if (this.loadingPromises.has(pad.id)) {
      return this.loadingPromises.get(pad.id)!;
    }

    const promise = (async () => {
      try {
        this.initContext();
        if (!this.ctx) return null;

        const audioSource = pad.audioUrl || pad.audioData;
        if (!audioSource) return null;

        let arrayBuffer: ArrayBuffer | null = null;

        // 1. Check local IndexedDB cache first (avoids re-downloading across sessions)
        try {
          arrayBuffer = await getAudioArrayBufferFromIndexedDB(audioSource);
          if (!arrayBuffer && pad.id) {
            arrayBuffer = await getAudioArrayBufferFromIndexedDB(pad.id);
          }
        } catch (dbErr) {
          console.warn('Erreur lecture IndexedDB pad:', dbErr);
        }

        // 2. Fallback to network download if not cached locally
        if (!arrayBuffer) {
          const response = await fetch(audioSource);
          arrayBuffer = await response.arrayBuffer();

          // Save to IndexedDB cache for offline & next session immediate reuse
          try {
            await saveAudioBlobToIndexedDB(audioSource, arrayBuffer, {
              fileName: `${pad.name}.mp3`,
              mimeType: 'audio/mp3'
            });
            if (pad.id) {
              await saveAudioBlobToIndexedDB(pad.id, arrayBuffer, {
                fileName: `${pad.name}.mp3`,
                mimeType: 'audio/mp3'
              });
            }
          } catch (cacheErr) {
            console.warn('Erreur mise en cache IndexedDB pad:', cacheErr);
          }
        }

        const decoded = await this.ctx.decodeAudioData(arrayBuffer.slice(0));
        this.bufferCache.set(pad.id, decoded);
        return decoded;
      } catch (err) {
        console.warn(`Impossible de décoder le pad audio [${pad.name}]:`, err);
        return null;
      } finally {
        this.loadingPromises.delete(pad.id);
      }
    })();

    this.loadingPromises.set(pad.id, promise);
    return promise;
  }

  // Preloads and caches an audio URL for built-in or team pads
  public async preloadAudioUrl(url: string, id: string = url): Promise<AudioBuffer | null> {
    if (!url) return null;
    if (this.bufferCache.has(id)) {
      return this.bufferCache.get(id)!;
    }
    if (this.loadingPromises.has(id)) {
      return this.loadingPromises.get(id)!;
    }

    const promise = (async () => {
      try {
        this.initContext();
        if (!this.ctx) return null;

        let arrayBuffer: ArrayBuffer | null = null;
        try {
          arrayBuffer = await getAudioArrayBufferFromIndexedDB(id);
        } catch (dbErr) {
          console.warn('Erreur lecture cache IndexedDB pad:', dbErr);
        }

        if (!arrayBuffer) {
          const response = await fetch(url);
          arrayBuffer = await response.arrayBuffer();
          try {
            await saveAudioBlobToIndexedDB(id, arrayBuffer, {
              fileName: 'foundations_rewakens_A.mp3',
              mimeType: 'audio/mp3'
            });
          } catch (cacheErr) {
            console.warn('Erreur mise en cache IndexedDB:', cacheErr);
          }
        }

        const decoded = await this.ctx.decodeAudioData(arrayBuffer.slice(0));
        this.bufferCache.set(id, decoded);
        return decoded;
      } catch (err) {
        console.warn(`Impossible de décoder l'audio [${url}]:`, err);
        return null;
      } finally {
        this.loadingPromises.delete(id);
      }
    })();

    this.loadingPromises.set(id, promise);
    return promise;
  }

  public selectSynthPreset(preset: PadPresetId) {
    this.activeMode = 'synth';
    this.activeCustomPad = null;
    this.currentPreset = preset;
    const presetObj = PAD_PRESETS.find(p => p.id === preset);
    if (presetObj?.audioUrl) {
      this.preloadAudioUrl(presetObj.audioUrl, presetObj.audioUrl);
    }
    if (this.isRunning) {
      this.fadePreviousVoices(this.crossfadeDuration);
      this.spawnVoice(this.currentSemitone, preset);
    }
    this.notify();
  }

  public selectCustomPad(pad: CustomPad) {
    this.activeMode = 'custom';
    this.activeCustomPad = pad;
    this.preloadCustomPad(pad);
    if (this.isRunning) {
      this.fadePreviousVoices(1.5);
      this.spawnVoice(this.currentSemitone, this.currentPreset);
    }
    this.notify();
  }

  public changePreset(preset: PadPresetId) {
    this.selectSynthPreset(preset);
  }

  public start(semitone: number, preset: PadPresetId = 'classic_warm') {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    this.currentSemitone = semitone;
    this.currentPreset = preset;
    this.isRunning = true;

    // Crossfade: fade out any previous nodes smoothly
    this.fadePreviousVoices(this.crossfadeDuration);

    // Spawn new voice layer
    this.spawnVoice(semitone, preset);
    this.notify();
  }

  public changeNote(semitone: number) {
    if (!this.isRunning) {
      this.start(semitone, this.currentPreset);
      return;
    }
    if (semitone === this.currentSemitone) return;

    this.initContext();
    this.currentSemitone = semitone;

    // Smooth worship crossfade
    this.fadePreviousVoices(this.crossfadeDuration);
    this.spawnVoice(semitone, this.currentPreset);
    this.notify();
  }

  public stop() {
    this.isRunning = false;
    this.fadePreviousVoices(Math.min(0.8, this.crossfadeDuration));
    this.notify();
  }

  private fadePreviousVoices(duration: number = this.crossfadeDuration) {
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
    const oldSources = [...this.currentSources];
    setTimeout(() => {
      oldOscs.forEach(osc => {
        try {
          osc.stop();
          osc.disconnect();
        } catch {}
      });
      oldSources.forEach(source => {
        try {
          source.stop();
          source.disconnect();
        } catch {}
      });
    }, duration * 1000 + 100);

    this.currentVoiceGains = [];
    this.currentOscillators = [];
    this.currentSources = [];
  }

  private spawnVoice(semitone: number, preset: PadPresetId) {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const xfade = this.crossfadeDuration;

    // Voice sub-master gain node with smooth attack
    const voiceGain = ctx.createGain();
    voiceGain.gain.setValueAtTime(0.0001, now);
    voiceGain.gain.exponentialRampToValueAtTime(1.0, now + xfade);
    voiceGain.connect(this.masterGain);
    this.currentVoiceGains.push(voiceGain);

    // MODE 1: CUSTOM AUDIO SAMPLE PAD WITH PITCH SHIFT
    if (this.activeMode === 'custom' && this.activeCustomPad) {
      const pad = this.activeCustomPad;
      const targetSemitone = semitone;
      const rootSemitone = pad.rootSemitone !== undefined ? pad.rootSemitone : 0;
      
      // Calculate pitch shift ratio: 2^((target - root + octave*12) / 12)
      // Ex: Root C (0) -> Target G (7) = 2^(7/12) ≈ 1.4983
      const semitoneDelta = (targetSemitone - rootSemitone) + (this.octaveShift * 12);
      const playbackRate = Math.pow(2, semitoneDelta / 12);

      const playBuffer = (buffer: AudioBuffer) => {
        if (!this.ctx || !this.isRunning || this.currentSemitone !== targetSemitone) return;
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = this.isLooping;
        source.playbackRate.setValueAtTime(playbackRate, this.ctx.currentTime);
        source.connect(voiceGain);
        source.start(0);
        this.currentSources.push(source);
      };

      if (this.bufferCache.has(pad.id)) {
        playBuffer(this.bufferCache.get(pad.id)!);
      } else {
        this.preloadCustomPad(pad).then((buf) => {
          if (buf) playBuffer(buf);
        });
      }
      return;
    }

    // MODE 2: BUILT-IN AUDIO SAMPLE PRESET (e.g. Foundations - Rewakens)
    const presetObj = PAD_PRESETS.find(p => p.id === preset);
    if (this.activeMode !== 'custom' && presetObj && presetObj.audioUrl) {
      const targetSemitone = semitone;
      const rootSemitone = presetObj.rootSemitone !== undefined ? presetObj.rootSemitone : 9; // Default A
      const semitoneDelta = (targetSemitone - rootSemitone) + (this.octaveShift * 12);
      const playbackRate = Math.pow(2, semitoneDelta / 12);

      const playBuffer = (buffer: AudioBuffer) => {
        if (!this.ctx || !this.isRunning || this.currentSemitone !== targetSemitone) return;
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = this.isLooping;
        source.playbackRate.setValueAtTime(playbackRate, this.ctx.currentTime);
        source.connect(voiceGain);
        source.start(0);
        this.currentSources.push(source);
      };

      const cacheKey = presetObj.audioUrl;
      if (this.bufferCache.has(cacheKey)) {
        playBuffer(this.bufferCache.get(cacheKey)!);
      } else {
        this.preloadAudioUrl(presetObj.audioUrl, cacheKey).then((buf) => {
          if (buf) playBuffer(buf);
        });
      }
      return;
    }

    // MODE 3: SYNTHESIZED HARMONIC DRONES
    const baseFreq = 65.406 * Math.pow(2, (semitone + this.octaveShift * 12) / 12); // Octave 2
    const fifthFreq = baseFreq * 1.498307; // Perfect 5th

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
