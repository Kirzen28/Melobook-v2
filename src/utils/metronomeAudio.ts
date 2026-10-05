// Precision Metronome Engine using Web Audio API Lookahead Scheduler
// Outil externe autonome indépendant des morceaux et du mode scène

export type MetronomeSound = 'woodblock' | 'digital' | 'mechanical' | 'diapason';
export type MetronomeSubdivision = 1 | 2 | 3 | 4; // 1: quarter, 2: eighths, 3: triplets, 4: sixteenths

export interface MetronomeState {
  isPlaying: boolean;
  bpm: number;
  beatsPerMeasure: number;
  subdivision: MetronomeSubdivision;
  currentBeat: number; // 0 to beatsPerMeasure - 1
  currentSubBeat: number; // 0 to subdivision - 1
  sound: MetronomeSound;
  volume: number;
  isMuted: boolean;
}

export type BeatCallback = (beat: number, isAccent: boolean, subBeat: number, totalBeats: number) => void;

const STANDALONE_METRONOME_STORAGE_KEY = 'songbook_standalone_metronome_settings';

interface StoredMetronomeSettings {
  bpm?: number;
  beatsPerMeasure?: number;
  subdivision?: MetronomeSubdivision;
  sound?: MetronomeSound;
  volume?: number;
  isMuted?: boolean;
}

function loadStoredSettings(): StoredMetronomeSettings {
  try {
    const raw = localStorage.getItem(STANDALONE_METRONOME_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveStoredSettings(partial: StoredMetronomeSettings) {
  try {
    const current = loadStoredSettings();
    localStorage.setItem(STANDALONE_METRONOME_STORAGE_KEY, JSON.stringify({ ...current, ...partial }));
  } catch {}
}

class MetronomeAudioEngine {
  private audioCtx: AudioContext | null = null;
  private isPlaying = false;
  private isMuted = false;
  private volume = 0.85;
  private bpm = 120;
  private beatsPerMeasure = 4;
  private subdivision: MetronomeSubdivision = 1;
  private sound: MetronomeSound = 'woodblock';

  // Scheduling state
  private nextNoteTime = 0;
  private currentBeat = 0;
  private currentSubBeat = 0;
  private lookaheadMs = 25;
  private scheduleAheadTime = 0.1; // seconds
  private timerId: number | null = null;

  // Listeners
  private beatListeners: Set<BeatCallback> = new Set();
  private stateListeners: Set<(state: MetronomeState) => void> = new Set();

  constructor() {
    const saved = loadStoredSettings();
    if (typeof saved.bpm === 'number' && saved.bpm >= 30 && saved.bpm <= 300) {
      this.bpm = saved.bpm;
    }
    if (typeof saved.beatsPerMeasure === 'number' && saved.beatsPerMeasure >= 1 && saved.beatsPerMeasure <= 16) {
      this.beatsPerMeasure = saved.beatsPerMeasure;
    }
    if (saved.subdivision && [1, 2, 3, 4].includes(saved.subdivision)) {
      this.subdivision = saved.subdivision;
    }
    if (saved.sound && ['woodblock', 'digital', 'mechanical', 'diapason'].includes(saved.sound)) {
      this.sound = saved.sound;
    }
    if (typeof saved.volume === 'number') {
      this.volume = Math.max(0, Math.min(1, saved.volume));
    }
    if (typeof saved.isMuted === 'boolean') {
      this.isMuted = saved.isMuted;
    }
  }

  private initCtx() {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public subscribe(cb: BeatCallback): () => void {
    this.beatListeners.add(cb);
    return () => this.beatListeners.delete(cb);
  }

  public subscribeState(cb: (state: MetronomeState) => void): () => void {
    this.stateListeners.add(cb);
    cb(this.getState());
    return () => this.stateListeners.delete(cb);
  }

  private notifyState() {
    const s = this.getState();
    this.stateListeners.forEach(cb => cb(s));
  }

  public getState(): MetronomeState {
    return {
      isPlaying: this.isPlaying,
      bpm: this.bpm,
      beatsPerMeasure: this.beatsPerMeasure,
      subdivision: this.subdivision,
      currentBeat: this.currentBeat,
      currentSubBeat: this.currentSubBeat,
      sound: this.sound,
      volume: this.volume,
      isMuted: this.isMuted,
    };
  }

  public start(bpm?: number, beatsPerMeasure?: number) {
    this.initCtx();
    if (bpm) this.bpm = Math.max(30, Math.min(300, bpm));
    if (beatsPerMeasure) this.beatsPerMeasure = Math.max(1, Math.min(16, beatsPerMeasure));

    this.isPlaying = true;
    this.currentBeat = 0;
    this.currentSubBeat = 0;
    this.nextNoteTime = this.audioCtx ? this.audioCtx.currentTime + 0.05 : 0;

    this.scheduleLoop();
    this.notifyState();
  }

  public stop() {
    this.isPlaying = false;
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.currentBeat = 0;
    this.currentSubBeat = 0;
    this.notifyState();
  }

  public toggle(bpm?: number, beatsPerMeasure?: number) {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.start(bpm, beatsPerMeasure);
    }
  }

  public setBpm(newBpm: number) {
    this.bpm = Math.max(30, Math.min(300, Math.round(newBpm)));
    saveStoredSettings({ bpm: this.bpm });
    this.notifyState();
  }

  public setBeatsPerMeasure(beats: number) {
    this.beatsPerMeasure = Math.max(1, Math.min(16, beats));
    if (this.currentBeat >= this.beatsPerMeasure) {
      this.currentBeat = 0;
    }
    saveStoredSettings({ beatsPerMeasure: this.beatsPerMeasure });
    this.notifyState();
  }

  public setSubdivision(sub: MetronomeSubdivision) {
    this.subdivision = sub;
    this.currentSubBeat = 0;
    saveStoredSettings({ subdivision: this.subdivision });
    this.notifyState();
  }

  public setSound(sound: MetronomeSound) {
    this.sound = sound;
    saveStoredSettings({ sound: this.sound });
    this.notifyState();
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    saveStoredSettings({ volume: this.volume });
    this.notifyState();
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    saveStoredSettings({ isMuted: this.isMuted });
    this.notifyState();
  }

  private scheduleLoop = () => {
    if (!this.isPlaying || !this.audioCtx) return;

    while (this.nextNoteTime < this.audioCtx.currentTime + this.scheduleAheadTime) {
      const isDownbeat = this.currentBeat === 0 && this.currentSubBeat === 0;
      const isSub = this.currentSubBeat > 0;

      // Play audio click at exact scheduled time
      if (!this.isMuted) {
        this.playClick(this.nextNoteTime, isDownbeat, isSub);
      }

      // Schedule UI beat event precisely
      const beat = this.currentBeat;
      const sub = this.currentSubBeat;
      const total = this.beatsPerMeasure;
      const delayMs = Math.max(0, (this.nextNoteTime - this.audioCtx.currentTime) * 1000);

      window.setTimeout(() => {
        if (this.isPlaying) {
          this.beatListeners.forEach(cb => cb(beat, isDownbeat && sub === 0, sub, total));
        }
      }, delayMs);

      // Advance to next subdivision or beat
      const secondsPerBeat = 60.0 / this.bpm;
      const secondsPerSub = secondsPerBeat / this.subdivision;
      this.nextNoteTime += secondsPerSub;

      this.currentSubBeat++;
      if (this.currentSubBeat >= this.subdivision) {
        this.currentSubBeat = 0;
        this.currentBeat = (this.currentBeat + 1) % this.beatsPerMeasure;
      }
    }

    this.timerId = window.setTimeout(this.scheduleLoop, this.lookaheadMs);
  };

  private playClick(time: number, isAccent: boolean, isSubdivision: boolean) {
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;

    try {
      const vol = this.volume * (isSubdivision ? 0.45 : isAccent ? 1.0 : 0.75);

      if (this.sound === 'woodblock') {
        // Organic percussion block
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const baseFreq = isAccent ? 1050 : isSubdivision ? 650 : 800;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq * 1.3, time);
        osc.frequency.exponentialRampToValueAtTime(baseFreq, time + 0.015);

        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.linearRampToValueAtTime(vol * 0.9, time + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + (isAccent ? 0.06 : 0.038));

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(time);
        osc.stop(time + 0.07);
      } else if (this.sound === 'mechanical') {
        // Crisp mechanical tick
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(isAccent ? 2200 : isSubdivision ? 1100 : 1500, time);
        osc.frequency.exponentialRampToValueAtTime(200, time + 0.02);

        filter.type = 'highpass';
        filter.frequency.setValueAtTime(800, time);

        gain.gain.setValueAtTime(vol * 0.85, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.025);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(time);
        osc.stop(time + 0.03);
      } else if (this.sound === 'diapason') {
        // Pure chime bell tone
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const freq = isAccent ? 880 : isSubdivision ? 440 : 587.33;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.linearRampToValueAtTime(vol * 0.7, time + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + (isAccent ? 0.12 : 0.08));

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(time);
        osc.stop(time + 0.13);
      } else {
        // Default 'digital' beep
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const freq = isAccent ? 1500 : isSubdivision ? 750 : 1000;

        osc.type = isAccent ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(vol * 0.8, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + (isAccent ? 0.05 : 0.03));

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(time);
        osc.stop(time + 0.055);
      }
    } catch {
      // AudioContext state safety
    }
  }
}

export const metronomeAudio = new MetronomeAudioEngine();

// Tempo name helper (Italian tempo markings)
export function getTempoMarking(bpm: number): { name: string; range: string } {
  if (bpm < 40) return { name: 'Larghissimo', range: '< 40 BPM' };
  if (bpm < 60) return { name: 'Largo', range: '40 - 59 BPM' };
  if (bpm < 66) return { name: 'Larghetto', range: '60 - 65 BPM' };
  if (bpm < 76) return { name: 'Adagio', range: '66 - 75 BPM' };
  if (bpm < 108) return { name: 'Andante', range: '76 - 107 BPM' };
  if (bpm < 120) return { name: 'Moderato', range: '108 - 119 BPM' };
  if (bpm < 156) return { name: 'Allegro', range: '120 - 155 BPM' };
  if (bpm < 176) return { name: 'Vivace', range: '156 - 175 BPM' };
  if (bpm < 200) return { name: 'Presto', range: '176 - 199 BPM' };
  return { name: 'Prestissimo', range: '200+ BPM' };
}
