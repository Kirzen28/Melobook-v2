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
  Music
} from 'lucide-react';
import { MetronomeIcon } from './MetronomeIcon';
import { useApp } from '../context/AppContext';
import { 
  metronomeAudio, 
  getTempoMarking, 
  MetronomeSound, 
  MetronomeSubdivision 
} from '../utils/metronomeAudio';

const TIME_SIGNATURE_PRESETS = [
  { label: '2/4', beats: 2 },
  { label: '3/4', beats: 3 },
  { label: '4/4', beats: 4 },
  { label: '5/4', beats: 5 },
  { label: '6/8', beats: 6 },
  { label: '7/8', beats: 7 },
  { label: '12/8', beats: 12 },
];

const TEMPO_QUICK_PRESETS = [60, 80, 100, 120, 140, 160];

export const MetronomePopup: React.FC = () => {
  const { isMetronomeOpen, setIsMetronomeOpen, selectedSong } = useApp();

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
  const [enableScreenFlash, setEnableScreenFlash] = useState<boolean>(false);
  const [flashActive, setFlashActive] = useState<boolean>(false);

  // Tap tempo state
  const tapTimesRef = useRef<number[]>([]);
  const [tapFeedback, setTapFeedback] = useState<string | null>(null);
  const tapFeedbackTimerRef = useRef<number | null>(null);

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

  if (!isMetronomeOpen) return null;

  const tempoInfo = getTempoMarking(bpm);

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
        <div className="px-4 py-2.5 bg-[#18181B] border-b border-[#26262B] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-md ${isPlaying ? 'bg-blue-600/20 text-blue-400' : 'bg-[#222] text-gray-400'}`}>
              <MetronomeIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-wide">Métronome</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#222226] text-blue-300 border border-[#333]">
                  {tempoInfo.name}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
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

        {/* Selected Song banner (optional quick load) */}
        {selectedSong && selectedSong.tempo ? (
          <div className="px-4 py-2 bg-blue-950/30 border-b border-blue-900/30 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 truncate">
              <Music className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="text-gray-300 truncate">
                Morceau : <strong className="text-white">{selectedSong.title}</strong> ({selectedSong.tempo} BPM{selectedSong.timeSignature ? ` • ${selectedSong.timeSignature}` : ''})
              </span>
            </div>
            {bpm !== selectedSong.tempo && (
              <button
                onClick={() => {
                  handleBpmChange(selectedSong.tempo);
                  if (selectedSong.timeSignature) {
                    const match = selectedSong.timeSignature.match(/^(\d+)/);
                    if (match) {
                      const b = parseInt(match[1], 10);
                      if (b >= 1 && b <= 16) handleBeatsChange(b);
                    }
                  }
                }}
                className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium shrink-0 transition-colors cursor-pointer text-[11px]"
              >
                Appliquer ({selectedSong.tempo})
              </button>
            )}
          </div>
        ) : null}

        {/* Main Content Area */}
        <div className="p-4 sm:p-5 flex flex-col gap-4">
          
          {/* Visual Beat Indicator Dots */}
          <div className="bg-[#0F0F12] border border-[#222226] rounded-xl p-3 flex flex-col items-center justify-center gap-2">
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

            {/* Flash Screen & Sub-text info */}
            <div className="flex items-center justify-between w-full mt-1 pt-2 border-t border-[#1C1C22] text-[11px] text-gray-400 px-1">
              <span className="font-mono">
                {beatsPerMeasure} temps / mesure
                {subdivision > 1 ? ` • Subdiv. ×${subdivision}` : ''}
              </span>

              <label className="flex items-center gap-1.5 cursor-pointer hover:text-gray-200 transition-colors">
                <input
                  type="checkbox"
                  checked={enableScreenFlash}
                  onChange={(e) => setEnableScreenFlash(e.target.checked)}
                  className="rounded bg-[#222] border-[#444] text-blue-600 focus:ring-0 cursor-pointer w-3.5 h-3.5"
                />
                <Zap className="w-3 h-3 text-amber-400" />
                <span>Flash visuel</span>
              </label>
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

          {/* Quick BPM Presets */}
          <div className="flex items-center justify-between gap-1 bg-[#101014] p-1.5 rounded-lg border border-[#222228]">
            <span className="text-[10px] text-gray-400 font-semibold px-1">Presets :</span>
            <div className="flex items-center gap-1 overflow-x-auto">
              {TEMPO_QUICK_PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => handleBpmChange(p)}
                  className={`px-2 py-1 rounded text-xs font-mono font-medium transition-colors cursor-pointer ${
                    bpm === p 
                      ? 'bg-blue-600 text-white font-bold' 
                      : 'bg-[#1C1C22] text-gray-300 hover:text-white hover:bg-[#26262E]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Controls Accordion / Toolbar */}
          <div className="bg-[#101014] border border-[#222228] rounded-xl p-3 flex flex-col gap-2.5 text-xs">
            {/* Signature & Subdivisions */}
            <div className="grid grid-cols-2 gap-3">
              {/* Chiffrage (Beats per measure) */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-gray-400 font-medium">Signature / Mesure :</label>
                <select
                  value={beatsPerMeasure}
                  onChange={(e) => handleBeatsChange(Number(e.target.value))}
                  className="bg-[#1C1C22] border border-[#2E2E36] rounded-md px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {TIME_SIGNATURE_PRESETS.map((sig) => (
                    <option key={sig.label} value={sig.beats}>
                      {sig.label} ({sig.beats} temps)
                    </option>
                  ))}
                  <option value={1}>1/4 (Pas d'accent)</option>
                  <option value={8}>8/8 (8 temps)</option>
                  <option value={9}>9/8 (9 temps)</option>
                </select>
              </div>

              {/* Subdivisions */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-gray-400 font-medium">Subdivision :</label>
                <select
                  value={subdivision}
                  onChange={(e) => handleSubdivisionChange(Number(e.target.value) as MetronomeSubdivision)}
                  className="bg-[#1C1C22] border border-[#2E2E36] rounded-md px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value={1}>1 • Noires</option>
                  <option value={2}>2 • Croches</option>
                  <option value={3}>3 • Triolets</option>
                  <option value={4}>4 • Doubles-croches</option>
                </select>
              </div>
            </div>

            {/* Sound Timbre & Volume */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#1C1C22]">
              {/* Sound Timbre */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-gray-400 font-medium">Son :</label>
                <select
                  value={sound}
                  onChange={(e) => handleSoundChange(e.target.value as MetronomeSound)}
                  className="bg-[#1C1C22] border border-[#2E2E36] rounded-md px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="woodblock">Woodblock (Clave)</option>
                  <option value="digital">Bip digital</option>
                  <option value="mechanical">Clic mécanique</option>
                  <option value="diapason">Diapason (Cloche)</option>
                </select>
              </div>

              {/* Volume */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[11px] text-gray-400">
                  <span className="font-medium">Volume :</span>
                  <span className="font-mono">{Math.round(volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="w-full h-2 bg-[#232328] rounded-lg appearance-none cursor-pointer accent-blue-500 mt-1"
                />
              </div>
            </div>
          </div>

          {/* Quick Keyboard shortcuts hint */}
          <div className="hidden sm:flex items-center justify-center gap-4 text-[10px] text-gray-500 font-mono">
            <span>[Espace] Play/Stop</span>
            <span>[← / →] Ajuster BPM</span>
            <span>[Échap] Fermer</span>
          </div>

        </div>
      </div>
    </div>
  );
};
