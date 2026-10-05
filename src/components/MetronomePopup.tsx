import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Plus, 
  Minus, 
  RotateCcw,
  Zap,
  Clock,
  Music,
  ChevronDown,
  Check
} from 'lucide-react';
import { MetronomeIcon } from './MetronomeIcon';
import { useApp } from '../context/AppContext';
import { 
  metronomeAudio, 
  MetronomeSound, 
  MetronomeSubdivision 
} from '../utils/metronomeAudio';
import { metronome } from '../utils/chordUtils';

export interface SignatureOption {
  label: string;
  beats: number;
  desc: string;
}

export const SIGNATURE_OPTIONS: SignatureOption[] = [
  { label: '2/4', beats: 2, desc: '2 temps (Marche, Polka)' },
  { label: '3/4', beats: 3, desc: '3 temps (Valse, Ballade)' },
  { label: '4/4', beats: 4, desc: '4 temps (Standard Pop, Rock, Culte)' },
  { label: '5/4', beats: 5, desc: '5 temps (Rythme asymétrique)' },
  { label: '6/8', beats: 6, desc: '6 temps (Balancement ternaire)' },
  { label: '7/8', beats: 7, desc: '7 temps (Rythme complexe)' },
  { label: '9/8', beats: 9, desc: '9 temps (Ternaire composé)' },
  { label: '12/8', beats: 12, desc: '12 temps (Blues, Gospel, Soul)' },
];

export interface SubdivisionOption {
  sub: MetronomeSubdivision;
  label: string;
  notation: string;
  desc: string;
}

export const SUBDIVISION_OPTIONS: SubdivisionOption[] = [
  { sub: 1, label: 'Noires', notation: '♩', desc: '' },
  { sub: 2, label: 'Croches', notation: '♪♪', desc: '' },
  { sub: 3, label: 'Triolets', notation: '³♪', desc: '' },
  { sub: 4, label: 'Doubles', notation: '♬', desc: '' },
];

export interface SoundOption {
  id: MetronomeSound;
  label: string;
  icon: string;
  desc: string;
}

export const SOUND_OPTIONS: SoundOption[] = [
  { id: 'woodblock', label: 'Woodblock', icon: '🪵', desc: 'Bois naturel classique, doux et percutant' },
  { id: 'digital', label: 'Digital', icon: '⚡', desc: 'Bip électronique moderne à haute clarté' },
  { id: 'mechanical', label: 'Mécanique', icon: '⚙️', desc: 'Tic-tac acoustique vintage de studio' },
  { id: 'diapason', label: 'Diapason', icon: '🔔', desc: 'Onde sinusoïdale pure et harmonique' },
];

const TIME_SIGNATURE_PRESETS = SIGNATURE_OPTIONS;

export const MetronomePopup: React.FC = () => {
  const { isMetronomeOpen, setIsMetronomeOpen } = useApp();

  const [isPlaying, setIsPlaying] = useState<boolean>(() => metronomeAudio.getState().isPlaying);
  const [bpm, setBpm] = useState<number>(() => metronomeAudio.getState().bpm);
  const [beatsPerMeasure, setBeatsPerMeasure] = useState<number>(() => metronomeAudio.getState().beatsPerMeasure);
  const [subdivision, setSubdivision] = useState<MetronomeSubdivision>(() => metronomeAudio.getState().subdivision);
  const [sound, setSound] = useState<MetronomeSound>(() => metronomeAudio.getState().sound);
  const [volume, setVolume] = useState<number>(() => metronomeAudio.getState().volume);
  const [isMuted, setIsMuted] = useState<boolean>(() => metronomeAudio.getState().isMuted);

  // Active beat animation state
  const [activeBeat, setActiveBeat] = useState<number>(-1);
  const [isAccentBeat, setIsAccentBeat] = useState<boolean>(false);
  const [activeSubBeat, setActiveSubBeat] = useState<number>(0);
  const [enableScreenFlash, setEnableScreenFlash] = useState<boolean>(() => {
    try {
      return localStorage.getItem('songbook_standalone_metronome_flash') === 'true';
    } catch {
      return false;
    }
  });
  const [flashActive, setFlashActive] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem('songbook_standalone_metronome_flash', enableScreenFlash ? 'true' : 'false');
    } catch {}
  }, [enableScreenFlash]);

  // Tap tempo state
  const tapTimesRef = useRef<number[]>([]);
  const [tapFeedback, setTapFeedback] = useState<string | null>(null);
  const tapFeedbackTimerRef = useRef<number | null>(null);

  // Dropdown states for signature, subdivision, and sound
  const [activeDropdown, setActiveDropdown] = useState<'signature' | 'subdivision' | 'sound' | null>(null);
  const dropdownContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownContainerRef.current && !dropdownContainerRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    if (activeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [activeDropdown]);

  // Sync state from engine
  useEffect(() => {
    const unsubState = metronomeAudio.subscribeState((st) => {
      setIsPlaying(st.isPlaying);
      setBpm(st.bpm);
      setBeatsPerMeasure(st.beatsPerMeasure);
      setSubdivision(st.subdivision);
      setSound(st.sound);
      setVolume(st.volume);
      setIsMuted(st.isMuted);
    });

    const unsubBeats = metronomeAudio.subscribe((beat, isAccent, sub) => {
      setActiveBeat(beat);
      setIsAccentBeat(isAccent);
      setActiveSubBeat(sub);

      if (enableScreenFlash && sub === 0) {
        setFlashActive(true);
        window.setTimeout(() => setFlashActive(false), 70);
      }
    });

    return () => {
      unsubState();
      unsubBeats();
    };
  }, [enableScreenFlash]);

  // Handle play / stop
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      metronomeAudio.stop();
      setActiveBeat(-1);
    } else {
      // Si le métronome du chant en mode scène était actif, l'arrêter pour éviter tout double clic
      if (metronome.getIsPlaying()) {
        metronome.stop();
      }
      metronomeAudio.start(bpm, beatsPerMeasure);
    }
  }, [isPlaying, bpm, beatsPerMeasure]);

  // Adjust BPM
  const handleBpmChange = useCallback((newBpm: number) => {
    const clamped = Math.max(30, Math.min(300, Math.round(newBpm)));
    setBpm(clamped);
    metronomeAudio.setBpm(clamped);
  }, []);

  const handleBpmStep = useCallback((delta: number) => {
    handleBpmChange(bpm + delta);
  }, [bpm, handleBpmChange]);

  // Change signature
  const handleBeatsChange = useCallback((beats: number) => {
    setBeatsPerMeasure(beats);
    metronomeAudio.setBeatsPerMeasure(beats);
  }, []);

  // Change subdivision
  const handleSubdivisionChange = useCallback((sub: MetronomeSubdivision) => {
    setSubdivision(sub);
    metronomeAudio.setSubdivision(sub);
  }, []);

  // Change sound
  const handleSoundChange = useCallback((s: MetronomeSound) => {
    setSound(s);
    metronomeAudio.setSound(s);
  }, []);

  // Volume
  const handleVolumeChange = useCallback((v: number) => {
    setVolume(v);
    metronomeAudio.setVolume(v);
  }, []);

  // Mute
  const handleToggleMute = useCallback(() => {
    const next = !isMuted;
    setIsMuted(next);
    metronomeAudio.setMuted(next);
  }, [isMuted]);

  // Tap Tempo logic
  const handleTap = useCallback(() => {
    const now = performance.now();
    const taps = tapTimesRef.current;

    // Reset if last tap was more than 2.5s ago
    if (taps.length > 0 && now - taps[taps.length - 1] > 2500) {
      tapTimesRef.current = [];
    }

    tapTimesRef.current.push(now);

    // Keep only last 6 taps for responsive average
    if (tapTimesRef.current.length > 6) {
      tapTimesRef.current.shift();
    }

    const currentTaps = tapTimesRef.current;
    if (currentTaps.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < currentTaps.length; i++) {
        intervals.push(currentTaps[i] - currentTaps[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);

      if (calculatedBpm >= 30 && calculatedBpm <= 300) {
        handleBpmChange(calculatedBpm);
        setTapFeedback(`${calculatedBpm} BPM (${currentTaps.length} taps)`);
      }
    } else {
      setTapFeedback('Tapez à nouveau...');
    }

    if (tapFeedbackTimerRef.current) {
      window.clearTimeout(tapFeedbackTimerRef.current);
    }
    tapFeedbackTimerRef.current = window.setTimeout(() => {
      setTapFeedback(null);
    }, 2000);
  }, [handleBpmChange]);

  // Keyboard shortcut listener
  useEffect(() => {
    if (!isMetronomeOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        handleBpmStep(e.shiftKey ? 5 : 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        handleBpmStep(e.shiftKey ? -5 : -1);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsMetronomeOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMetronomeOpen, togglePlay, handleBpmStep, setIsMetronomeOpen]);

  const currentSignature = SIGNATURE_OPTIONS.find(s => s.beats === beatsPerMeasure) || {
    label: `${beatsPerMeasure}/4`,
    beats: beatsPerMeasure,
    desc: `${beatsPerMeasure} temps / mesure`
  };

  const currentSubdivision = SUBDIVISION_OPTIONS.find(s => s.sub === subdivision) || SUBDIVISION_OPTIONS[0];

  const currentSound = SOUND_OPTIONS.find(s => s.id === sound) || SOUND_OPTIONS[0];

  if (!isMetronomeOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setIsMetronomeOpen(false);
        }
      }}
    >
      <div 
        className={`w-full sm:max-w-lg bg-[#141416] border ${
          flashActive ? 'border-amber-400 shadow-amber-500/20' : 'border-[#2B2B30]'
        } rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[#E0E0E0] animate-in slide-in-from-bottom-6 sm:fade-in duration-200 transition-colors`}
        role="dialog"
        aria-modal="true"
        aria-label="Métronome"
      >
        {/* Header Bar */}
        <div className="px-4 py-2.5 bg-[#18181B] border-b border-[#26262B] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-md ${isPlaying ? 'bg-blue-600/20 text-blue-400' : 'bg-[#222] text-gray-400'}`}>
              <MetronomeIcon className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-white tracking-wide">Métronome</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Flash Screen Toggle Button */}
            <button
              type="button"
              onClick={() => setEnableScreenFlash(prev => !prev)}
              className={`p-1.5 rounded-md border transition-all cursor-pointer flex items-center gap-1.5 ${
                enableScreenFlash 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs' 
                  : 'bg-[#1F1F24] hover:bg-[#28282F] text-gray-400 hover:text-white border-[#333]'
              }`}
              title={enableScreenFlash ? "Désactiver le flash visuel de l'écran" : "Activer le flash visuel de l'écran à chaque temps"}
              aria-label="Flash visuel"
            >
              <Zap className={`w-4 h-4 ${enableScreenFlash ? 'text-amber-400 fill-amber-400' : 'text-gray-400'}`} />
              <span className="text-[11px] font-semibold hidden sm:inline">
                {enableScreenFlash ? 'Flash On' : 'Flash'}
              </span>
            </button>

            {/* Volume & Mute */}
            <button
              onClick={handleToggleMute}
              className={`p-1.5 rounded-md border text-gray-300 hover:text-white transition-colors cursor-pointer ${
                isMuted 
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' 
                  : 'bg-[#1F1F24] hover:bg-[#28282F] border-[#333]'
              }`}
              title={isMuted ? 'Activer le son' : 'Couper le son'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-blue-400" />}
            </button>

            {/* Close */}
            <button
              onClick={() => setIsMetronomeOpen(false)}
              className="p-1.5 rounded-md bg-[#1F1F24] hover:bg-rose-900/30 text-gray-400 hover:text-rose-300 border border-[#333] hover:border-rose-500/40 transition-colors cursor-pointer"
              title="Fermer le métronome"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Content Area - Sans barre de défilement ni scroll */}
        <div className="p-4 sm:p-5 flex flex-col gap-3.5 sm:gap-4 overflow-visible">
          
          {/* Visual Beat Indicator Dots */}
          <div className="bg-[#0F0F12] border border-[#222226] rounded-xl p-3 sm:p-4 flex flex-col items-center justify-center">
            <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
              {Array.from({ length: beatsPerMeasure }).map((_, index) => {
                const isCurrent = isPlaying && activeBeat === index;
                const isDownbeat = index === 0;

                return (
                  <div
                    key={index}
                    className={`relative flex flex-col items-center justify-center transition-all duration-75 ${
                      isDownbeat ? 'w-10 h-10 sm:w-12 sm:h-12' : 'w-8 h-8 sm:w-10 sm:h-10'
                    }`}
                  >
                    <div
                      className={`w-full h-full rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all duration-75 ${
                        isCurrent
                          ? isDownbeat
                            ? 'bg-amber-400 text-black scale-110 shadow-lg shadow-amber-400/50 ring-2 ring-amber-300'
                            : 'bg-blue-500 text-white scale-110 shadow-lg shadow-blue-500/50 ring-2 ring-blue-300'
                          : isDownbeat
                          ? 'bg-[#25252B] text-amber-300/80 border border-amber-500/40'
                          : 'bg-[#1C1C20] text-gray-500 border border-[#2C2C32]'
                      }`}
                    >
                      {index + 1}
                    </div>

                    {/* Subdivisions dots if active */}
                    {subdivision > 1 && isCurrent && (
                      <div className="absolute -bottom-2 flex gap-0.5">
                        {Array.from({ length: subdivision }).map((_, sIdx) => (
                          <div
                            key={sIdx}
                            className={`w-1 h-1 rounded-full transition-colors ${
                              activeSubBeat === sIdx ? 'bg-white' : 'bg-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Huge BPM display & adjustment buttons */}
          <div className="flex flex-col items-center justify-center gap-1">
            <div className="flex items-center justify-center gap-3">
              {/* Decrement buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleBpmStep(-5)}
                  className="px-2 py-1.5 rounded-lg bg-[#1B1B1F] hover:bg-[#26262B] text-gray-300 hover:text-white border border-[#2F2F36] text-xs font-semibold transition-all active:scale-95 cursor-pointer"
                  title="-5 BPM"
                >
                  -5
                </button>
                <button
                  onClick={() => handleBpmStep(-1)}
                  className="p-2 rounded-lg bg-[#1B1B1F] hover:bg-[#26262B] text-gray-300 hover:text-white border border-[#2F2F36] transition-all active:scale-95 cursor-pointer"
                  title="-1 BPM"
                >
                  <Minus className="w-4 h-4" />
                </button>
              </div>

              {/* Large BPM number */}
              <div className="flex flex-col items-center px-4 py-1 min-w-[130px]">
                <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white leading-none">
                  {bpm}
                </span>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mt-1">
                  BPM
                </span>
              </div>

              {/* Increment buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleBpmStep(1)}
                  className="p-2 rounded-lg bg-[#1B1B1F] hover:bg-[#26262B] text-gray-300 hover:text-white border border-[#2F2F36] transition-all active:scale-95 cursor-pointer"
                  title="+1 BPM"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleBpmStep(5)}
                  className="px-2 py-1.5 rounded-lg bg-[#1B1B1F] hover:bg-[#26262B] text-gray-300 hover:text-white border border-[#2F2F36] text-xs font-semibold transition-all active:scale-95 cursor-pointer"
                  title="+5 BPM"
                >
                  +5
                </button>
              </div>
            </div>

            {/* Slider */}
            <div className="w-full mt-2 px-1">
              <input
                type="range"
                min={30}
                max={260}
                value={bpm}
                onChange={(e) => handleBpmChange(Number(e.target.value))}
                className="w-full h-2 bg-[#232328] rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[10px] font-mono text-gray-500 mt-1">
                <span>30</span>
                <span>80</span>
                <span>120</span>
                <span>160</span>
                <span>200</span>
                <span>260</span>
              </div>
            </div>
          </div>

          {/* Play/Stop and Tap Tempo Actions */}
          <div className="grid grid-cols-2 gap-3 mt-1">
            {/* Big Play / Stop Button */}
            <button
              onClick={togglePlay}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all active:scale-98 cursor-pointer shadow-lg ${
                isPlaying
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/30'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-5 h-5 fill-current" />
                  <span>Arrêter</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                  <span>Démarrer</span>
                </>
              )}
            </button>

            {/* Tap Tempo Button */}
            <button
              onClick={handleTap}
              className="flex flex-col items-center justify-center py-2.5 rounded-xl bg-[#1D1D22] hover:bg-[#26262D] text-gray-200 hover:text-white border border-[#33333C] transition-all active:scale-95 cursor-pointer"
            >
              <span className="font-bold text-xs uppercase tracking-wider">Tap Tempo</span>
              <span className="text-[10px] text-blue-400 font-mono mt-0.5 truncate max-w-full px-2">
                {tapFeedback || 'Tapez en rythme'}
              </span>
            </button>
          </div>

          {/* Advanced Controls Toolbar - Grille de 3 éléments avec uniquement les textes utiles */}
          <div ref={dropdownContainerRef} className="grid grid-cols-3 gap-2 bg-[#101014] border border-[#222228] rounded-xl p-2.5 sm:p-3 text-xs">
            {/* 1. Mesure */}
            <div className="relative">
              <div className="flex items-center gap-1.5 mb-1.5 text-[11px] font-semibold text-gray-300">
                <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="truncate">Mesure</span>
              </div>

              <button
                type="button"
                onClick={() => setActiveDropdown(prev => prev === 'signature' ? null : 'signature')}
                className={`w-full flex items-center justify-between px-2 sm:px-2.5 py-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                  activeDropdown === 'signature'
                    ? 'bg-[#181822] border-blue-500 ring-2 ring-blue-500/25 text-white'
                    : 'bg-[#141418] hover:bg-[#1A1A22] border-[#252530] hover:border-gray-500 text-gray-200'
                }`}
                aria-expanded={activeDropdown === 'signature'}
                aria-haspopup="listbox"
                aria-label="Sélectionner la mesure"
              >
                <span className="font-mono font-bold text-blue-400 text-xs truncate">
                  {currentSignature.label}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform duration-200 ${activeDropdown === 'signature' ? 'rotate-180 text-blue-400' : ''}`} />
              </button>

              {activeDropdown === 'signature' && (
                <div 
                  role="listbox"
                  aria-label="Mesures disponibles"
                  className="absolute left-0 min-w-full sm:min-w-[120px] bottom-full mb-1.5 z-40 bg-[#141418] border border-[#2B2B36] rounded-xl shadow-2xl p-1 max-h-48 overflow-y-auto custom-scrollbar space-y-0.5 animate-in fade-in zoom-in-95 duration-100"
                >
                  {SIGNATURE_OPTIONS.map((sig) => {
                    const isSelected = beatsPerMeasure === sig.beats;
                    return (
                      <button
                        key={sig.label}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          handleBeatsChange(sig.beats);
                          setActiveDropdown(null);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                          isSelected
                            ? 'bg-blue-600/20 text-blue-300 font-bold border border-blue-500/30 shadow-xs'
                            : 'text-gray-300 hover:text-white hover:bg-[#1A1A22] border border-transparent'
                        }`}
                      >
                        <span className="font-mono font-bold">{sig.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 ml-1.5" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Subdivision */}
            <div className="relative">
              <div className="flex items-center gap-1.5 mb-1.5 text-[11px] font-semibold text-gray-300">
                <Music className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="truncate">Subdivision</span>
              </div>

              <button
                type="button"
                onClick={() => setActiveDropdown(prev => prev === 'subdivision' ? null : 'subdivision')}
                className={`w-full flex items-center justify-between px-2 sm:px-2.5 py-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                  activeDropdown === 'subdivision'
                    ? 'bg-[#181822] border-indigo-500 ring-2 ring-indigo-500/25 text-white'
                    : 'bg-[#141418] hover:bg-[#1A1A22] border-[#252530] hover:border-gray-500 text-gray-200'
                }`}
                aria-expanded={activeDropdown === 'subdivision'}
                aria-haspopup="listbox"
                aria-label="Sélectionner la subdivision"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="font-serif font-bold text-indigo-400 shrink-0">
                    {currentSubdivision.notation}
                  </span>
                  <span className="text-gray-300 truncate text-[11px] sm:text-xs">
                    {currentSubdivision.label}
                  </span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform duration-200 ${activeDropdown === 'subdivision' ? 'rotate-180 text-indigo-400' : ''}`} />
              </button>

              {activeDropdown === 'subdivision' && (
                <div 
                  role="listbox"
                  aria-label="Subdivisions disponibles"
                  className="absolute left-1/2 -translate-x-1/2 min-w-full sm:min-w-[130px] bottom-full mb-1.5 z-40 bg-[#141418] border border-[#2B2B36] rounded-xl shadow-2xl p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-100"
                >
                  {SUBDIVISION_OPTIONS.map((subItem) => {
                    const isSelected = subdivision === subItem.sub;
                    return (
                      <button
                        key={subItem.sub}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          handleSubdivisionChange(subItem.sub);
                          setActiveDropdown(null);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                          isSelected
                            ? 'bg-indigo-600/20 text-indigo-300 font-bold border border-indigo-500/30 shadow-xs'
                            : 'text-gray-300 hover:text-white hover:bg-[#1A1A22] border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-serif font-bold text-indigo-400 w-5 text-center">
                            {subItem.notation}
                          </span>
                          <span>{subItem.label}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0 ml-1.5" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Son */}
            <div className="relative">
              <div className="flex items-center gap-1.5 mb-1.5 text-[11px] font-semibold text-gray-300">
                <Volume2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">Son</span>
              </div>

              <button
                type="button"
                onClick={() => setActiveDropdown(prev => prev === 'sound' ? null : 'sound')}
                className={`w-full flex items-center justify-between px-2 sm:px-2.5 py-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                  activeDropdown === 'sound'
                    ? 'bg-[#181822] border-amber-500 ring-2 ring-amber-500/25 text-white'
                    : 'bg-[#141418] hover:bg-[#1A1A22] border-[#252530] hover:border-gray-500 text-gray-200'
                }`}
                aria-expanded={activeDropdown === 'sound'}
                aria-haspopup="listbox"
                aria-label="Sélectionner le son"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-sm shrink-0">{currentSound.icon}</span>
                  <span className="text-gray-300 truncate text-[11px] sm:text-xs">
                    {currentSound.label}
                  </span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform duration-200 ${activeDropdown === 'sound' ? 'rotate-180 text-amber-400' : ''}`} />
              </button>

              {activeDropdown === 'sound' && (
                <div 
                  role="listbox"
                  aria-label="Sons disponibles"
                  className="absolute right-0 min-w-full sm:min-w-[130px] bottom-full mb-1.5 z-40 bg-[#141418] border border-[#2B2B36] rounded-xl shadow-2xl p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-100"
                >
                  {SOUND_OPTIONS.map((soundItem) => {
                    const isSelected = sound === soundItem.id;
                    return (
                      <button
                        key={soundItem.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          handleSoundChange(soundItem.id);
                          setActiveDropdown(null);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                          isSelected
                            ? 'bg-amber-600/20 text-amber-300 font-bold border border-amber-500/30 shadow-xs'
                            : 'text-gray-300 hover:text-white hover:bg-[#1A1A22] border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{soundItem.icon}</span>
                          <span>{soundItem.label}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 ml-1.5" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

