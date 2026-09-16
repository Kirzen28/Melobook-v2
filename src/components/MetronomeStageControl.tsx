import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Gauge, 
  Music2, 
  Plus, 
  Minus, 
  Sliders, 
  ChevronDown, 
  X, 
  Check, 
  Sparkles,
  Radio
} from 'lucide-react';
import { metronome, parseTimeSignatureToBeats, TimeSignatureInfo } from '../utils/chordUtils';

interface MetronomeStageControlProps {
  initialBpm?: number;
  initialTimeSignature?: string;
  onBpmChange?: (bpm: number) => void;
  onTimeSignatureChange?: (signature: string) => void;
  className?: string;
  songTitle?: string;
}

const PRESET_SIGNATURES = [
  { value: '4/4', label: '4/4', desc: 'Standard (Pop, Rock, Louange)' },
  { value: '3/4', label: '3/4', desc: 'Valse / Ballade' },
  { value: '6/8', label: '6/8', desc: 'Ternaire / Ballade lente' },
  { value: '2/4', label: '2/4', desc: 'Marche / Rythme binaire' },
  { value: '12/8', label: '12/8', desc: 'Blues / Gospel lent' },
  { value: '5/4', label: '5/4', desc: 'Asymétrique' }
];

function getTempoName(bpm: number): string {
  if (bpm < 60) return 'Largo (Très lent)';
  if (bpm < 76) return 'Adagio (Lent)';
  if (bpm < 108) return 'Andante (Modéré)';
  if (bpm < 120) return 'Moderato (Allant)';
  if (bpm < 168) return 'Allegro (Rapide)';
  return 'Presto (Très rapide)';
}

export const MetronomeStageControl: React.FC<MetronomeStageControlProps> = ({
  initialBpm = 120,
  initialTimeSignature = '4/4',
  onBpmChange,
  onTimeSignatureChange,
  className = '',
  songTitle
}) => {
  const [bpm, setBpm] = useState<number>(initialBpm || 120);
  const [timeSignature, setTimeSignature] = useState<string>(initialTimeSignature || '4/4');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.85);
  const [currentBeat, setCurrentBeat] = useState<number>(0);
  const [isAccentBeat, setIsAccentBeat] = useState<boolean>(false);
  const [showFullPanel, setShowFullPanel] = useState<boolean>(false);
  const [enableScreenFlash, setEnableScreenFlash] = useState<boolean>(false);

  // Tap Tempo state
  const tapTimesRef = useRef<number[]>([]);
  const [tapCount, setTapCount] = useState<number>(0);
  const [lastTapBpm, setLastTapBpm] = useState<number | null>(null);

  // Synchronisation avec les props entrantes
  useEffect(() => {
    if (initialBpm && initialBpm > 0) {
      setBpm(initialBpm);
      if (isPlaying) {
        metronome.setBpm(initialBpm);
      }
    }
  }, [initialBpm]);

  useEffect(() => {
    if (initialTimeSignature) {
      setTimeSignature(initialTimeSignature);
      const sigInfo = parseTimeSignatureToBeats(initialTimeSignature);
      if (isPlaying) {
        metronome.setSignature(sigInfo.beatsPerMeasure, sigInfo.accents);
      }
    }
  }, [initialTimeSignature]);

  // Analyse de la signature active
  const sigInfo: TimeSignatureInfo = useMemo(() => {
    return parseTimeSignatureToBeats(timeSignature);
  }, [timeSignature]);

  // Démarrer ou arrêter le métronome
  const handleTogglePlay = () => {
    if (isPlaying) {
      metronome.stop();
      setIsPlaying(false);
      setCurrentBeat(0);
      setIsAccentBeat(false);
    } else {
      const validBpm = Math.max(30, Math.min(280, bpm));
      metronome.setMuted(isMuted);
      metronome.setVolume(volume);
      metronome.start(
        validBpm,
        sigInfo.beatsPerMeasure,
        sigInfo.accents,
        (beat, isAccent) => {
          setCurrentBeat(beat);
          setIsAccentBeat(isAccent);
        }
      );
      setIsPlaying(true);
    }
  };

  // Mettre à jour le BPM
  const handleBpmUpdate = (newBpm: number) => {
    const clamped = Math.max(30, Math.min(280, Math.round(newBpm)));
    setBpm(clamped);
    if (isPlaying) {
      metronome.setBpm(clamped);
    }
    onBpmChange?.(clamped);
  };

  // Mettre à jour la signature rythmique
  const handleSignatureUpdate = (newSig: string) => {
    setTimeSignature(newSig);
    const newSigInfo = parseTimeSignatureToBeats(newSig);
    if (isPlaying) {
      metronome.setSignature(newSigInfo.beatsPerMeasure, newSigInfo.accents);
    }
    onTimeSignatureChange?.(newSig);
  };

  // Muter / Démuter le son
  const handleToggleMute = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    metronome.setMuted(nextMuted);
  };

  // Ajuster le volume sonore
  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    metronome.setVolume(newVol);
    if (newVol === 0 && !isMuted) {
      setIsMuted(true);
      metronome.setMuted(true);
    } else if (newVol > 0 && isMuted) {
      setIsMuted(false);
      metronome.setMuted(false);
    }
  };

  // Logique Tap Tempo
  const handleTap = () => {
    const now = performance.now();
    const recentTaps = tapTimesRef.current.filter(t => now - t < 3000);
    recentTaps.push(now);
    tapTimesRef.current = recentTaps;
    setTapCount(recentTaps.length);

    if (recentTaps.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < recentTaps.length; i++) {
        intervals.push(recentTaps[i] - recentTaps[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);
      const clampedBpm = Math.max(30, Math.min(280, calculatedBpm));
      setLastTapBpm(clampedBpm);
      handleBpmUpdate(clampedBpm);
    }
  };

  // Arrêter le métronome si le composant est démonté
  useEffect(() => {
    return () => {
      metronome.stop();
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Flash visuel discret en haut d'écran sur le premier temps si activé */}
      {enableScreenFlash && isPlaying && isAccentBeat && (
        <div className="fixed top-0 left-0 right-0 h-1.5 bg-emerald-400 shadow-[0_0_15px_#34d399] pointer-events-none z-50 animate-pulse" />
      )}

      {/* Widget Barre Supérieure Compacte */}
      <div 
        id="stage-metronome-bar"
        className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border shadow-sm transition-all select-none ${
          isPlaying 
            ? 'bg-emerald-950/40 border-emerald-500/50 shadow-emerald-950/50' 
            : 'bg-[#141416] border-[#242428] hover:border-emerald-500/40'
        }`}
        title="Métronome visuel et sonore (BPM, signature, pulsation et tap tempo)"
      >
        {/* Bouton Play/Pause du métronome */}
        <button
          type="button"
          id="metronome-toggle-play-btn"
          onClick={handleTogglePlay}
          className={`w-6 h-6 rounded-md flex items-center justify-center transition-all cursor-pointer ${
            isPlaying
              ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-xs ring-2 ring-emerald-400/40 animate-pulse'
              : 'bg-[#222226] hover:bg-emerald-950/60 hover:text-emerald-300 text-gray-300'
          }`}
          title={isPlaying ? 'Mettre en pause le métronome' : 'Démarrer le métronome'}
        >
          {isPlaying ? (
            <Pause className="w-3.5 h-3.5 fill-current" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
          )}
        </button>

        {/* BPM interactif */}
        <div className="flex items-center gap-1">
          <Gauge className={`w-3.5 h-3.5 ${isPlaying ? 'text-emerald-400' : 'text-emerald-500/80'} shrink-0`} />
          <span className="text-emerald-400/90 font-medium text-xs hidden sm:inline">Métronome :</span>
          <input
            type="number"
            min={30}
            max={280}
            value={bpm}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val)) handleBpmUpdate(val);
            }}
            className="w-11 bg-[#18181C] hover:bg-[#202026] text-emerald-400 font-bold font-mono text-xs border border-emerald-500/40 focus:border-emerald-400 rounded px-1 py-0.5 text-center focus:outline-none transition-colors"
            title="Cliquer pour ajuster le tempo (BPM)"
          />
          <span className="text-[10px] text-gray-400 font-mono">BPM</span>
        </div>

        {/* Signature rythmique active */}
        <div className="flex items-center gap-1 border-l border-[#242428] pl-2">
          <Music2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <select
            value={timeSignature}
            onChange={(e) => handleSignatureUpdate(e.target.value)}
            className="bg-[#18181C] hover:bg-[#202026] text-purple-300 font-bold font-mono text-xs border border-purple-500/30 focus:border-purple-400 rounded py-0.5 px-1 cursor-pointer focus:outline-none transition-colors"
            title="Signature rythmique"
          >
            {PRESET_SIGNATURES.map(sig => (
              <option key={sig.value} value={sig.value} className="bg-[#18181C] text-gray-200">
                {sig.label}
              </option>
            ))}
          </select>
        </div>

        {/* Indicateur visuel de battements (LEDs de mesure dynamiques) */}
        <div 
          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#0D0D10] border border-[#202024]"
          title={`Mesure : ${currentBeat + 1} / ${sigInfo.beatsPerMeasure}`}
        >
          {Array.from({ length: sigInfo.beatsPerMeasure }).map((_, idx) => {
            const isCurrent = isPlaying && currentBeat === idx;
            const isAccent = sigInfo.accents.includes(idx);

            let dotClass = 'bg-[#28282E] scale-90 opacity-40';
            if (isCurrent) {
              if (isAccent) {
                dotClass = 'bg-emerald-400 ring-2 ring-emerald-300/80 shadow-[0_0_8px_#34d399] scale-125 opacity-100';
              } else {
                dotClass = 'bg-blue-400 ring-2 ring-blue-300/80 shadow-[0_0_8px_#60a5fa] scale-110 opacity-100';
              }
            } else if (isAccent) {
              dotClass = 'bg-[#3A3A42] opacity-70';
            }

            return (
              <span
                key={idx}
                className={`w-2 h-2 rounded-full transition-all duration-75 inline-block ${dotClass}`}
              />
            );
          })}
        </div>

        {/* Bouton Toggle Sonore (Mute / Unmute) */}
        <button
          type="button"
          id="metronome-toggle-sound-btn"
          onClick={handleToggleMute}
          className={`p-1 rounded transition-colors cursor-pointer ${
            isMuted
              ? 'text-gray-500 hover:text-gray-300'
              : 'text-emerald-400 bg-emerald-950/40 hover:bg-emerald-950/60'
          }`}
          title={isMuted ? 'Activer le clic sonore (son coupé)' : 'Couper le son (métronome visuel uniquement)'}
        >
          {isMuted ? (
            <VolumeX className="w-3.5 h-3.5 text-gray-400" />
          ) : (
            <Volume2 className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Bouton pour ouvrir le grand panneau de réglages métronome */}
        <button
          type="button"
          id="metronome-open-settings-btn"
          onClick={() => setShowFullPanel(!showFullPanel)}
          className={`p-1 rounded transition-colors cursor-pointer ${
            showFullPanel
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-400 hover:text-white hover:bg-[#202026]'
          }`}
          title="Ouvrir le panneau complet du métronome (Tap tempo, slider, volume...)"
        >
          <Sliders className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Panneau Popover / Tiroir Complet de Réglages Métronome */}
      {showFullPanel && (
        <div 
          id="metronome-full-drawer"
          className="absolute right-0 top-full mt-2 z-40 w-80 sm:w-96 bg-[#161619] border border-[#2B2B32] rounded-xl p-4 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Header du panneau */}
          <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#24242A]">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${isPlaying ? 'bg-emerald-400 animate-ping' : 'bg-gray-500'}`} />
              <h3 className="text-xs font-bold text-white tracking-wide">
                Métronome de Scène
              </h3>
              {songTitle && (
                <span className="text-[10px] text-gray-400 truncate max-w-[140px]">
                  • {songTitle}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowFullPanel(false)}
              className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#25252A] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Grand affichage visuel du tempo et battement en cours */}
            <div className="bg-[#0E0E11] border border-[#222228] rounded-xl p-3 text-center relative overflow-hidden">
              {/* Effet d'impulsion visuelle en arrière-plan sur chaque temps */}
              {isPlaying && (
                <div 
                  className={`absolute inset-0 pointer-events-none transition-opacity duration-100 ${
                    isAccentBeat 
                      ? 'bg-emerald-500/10 opacity-100' 
                      : 'bg-blue-500/5 opacity-60'
                  }`} 
                />
              )}

              <div className="flex items-center justify-center gap-3">
                <span className="text-3xl font-black font-mono tracking-tight text-white">
                  {bpm}
                </span>
                <div className="text-left">
                  <span className="text-[11px] font-bold text-emerald-400 block leading-none">BPM</span>
                  <span className="text-[10px] text-gray-400 font-mono">{getTempoName(bpm)}</span>
                </div>
              </div>

              {/* Grandes pastilles de battements visuels */}
              <div className="flex items-center justify-center gap-2.5 mt-3">
                {Array.from({ length: sigInfo.beatsPerMeasure }).map((_, idx) => {
                  const isCurrent = isPlaying && currentBeat === idx;
                  const isAccent = sigInfo.accents.includes(idx);

                  let sizeClass = 'w-4 h-4 text-[10px]';
                  let styleClass = 'bg-[#1C1C22] text-gray-500 border border-[#2D2D35]';

                  if (isCurrent) {
                    if (isAccent) {
                      styleClass = 'bg-emerald-500 text-white font-bold border-emerald-300 shadow-[0_0_12px_#10b981] scale-125';
                    } else {
                      styleClass = 'bg-blue-500 text-white font-bold border-blue-300 shadow-[0_0_10px_#3b82f6] scale-110';
                    }
                  } else if (isAccent) {
                    styleClass = 'bg-[#2A2A33] text-gray-300 border-emerald-900/50';
                  }

                  return (
                    <div
                      key={idx}
                      className={`rounded-full flex items-center justify-center font-mono transition-all duration-75 ${sizeClass} ${styleClass}`}
                    >
                      {idx + 1}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Boutons d'ajustement rapide du tempo */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-300">
                <span className="font-semibold">Réglage du tempo</span>
                <span className="font-mono text-gray-400 text-[11px]">{bpm} BPM</span>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleBpmUpdate(bpm - 5)}
                  className="py-1.5 bg-[#1C1C20] hover:bg-[#25252C] text-gray-200 border border-[#2E2E36] rounded-lg text-xs font-semibold transition-colors"
                >
                  -5
                </button>
                <button
                  type="button"
                  onClick={() => handleBpmUpdate(bpm - 1)}
                  className="py-1.5 bg-[#1C1C20] hover:bg-[#25252C] text-gray-200 border border-[#2E2E36] rounded-lg text-xs font-semibold transition-colors"
                >
                  -1
                </button>
                <button
                  type="button"
                  onClick={() => handleBpmUpdate(bpm + 1)}
                  className="py-1.5 bg-[#1C1C20] hover:bg-[#25252C] text-gray-200 border border-[#2E2E36] rounded-lg text-xs font-semibold transition-colors"
                >
                  +1
                </button>
                <button
                  type="button"
                  onClick={() => handleBpmUpdate(bpm + 5)}
                  className="py-1.5 bg-[#1C1C20] hover:bg-[#25252C] text-gray-200 border border-[#2E2E36] rounded-lg text-xs font-semibold transition-colors"
                >
                  +5
                </button>
              </div>

              {/* Slider de BPM */}
              <input
                type="range"
                min={30}
                max={260}
                value={bpm}
                onChange={(e) => handleBpmUpdate(parseInt(e.target.value, 10))}
                className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-[#25252C] rounded-lg"
              />
            </div>

            {/* Tap Tempo Tactile */}
            <div className="pt-1">
              <button
                type="button"
                id="metronome-tap-tempo-btn"
                onClick={handleTap}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-950/70 to-blue-950/70 hover:from-emerald-900/80 hover:to-blue-900/80 border border-emerald-500/40 hover:border-emerald-400 text-white font-bold text-xs flex items-center justify-between shadow-sm active:scale-98 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <div className="text-left">
                    <p className="leading-tight">Tap Tempo</p>
                    <p className="text-[10px] text-gray-400 font-normal">Tapez au rythme du chant</p>
                  </div>
                </div>
                <div className="text-right">
                  {lastTapBpm ? (
                    <span className="font-mono text-emerald-300 text-sm font-black">{lastTapBpm} BPM</span>
                  ) : (
                    <span className="text-[10px] text-gray-400">Tapez {Math.max(0, 4 - tapCount)}x</span>
                  )}
                </div>
              </button>
            </div>

            {/* Signature Rythmique */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-gray-300">
                <span className="font-semibold">Signature rythmique</span>
                <span className="font-mono text-purple-300 text-xs font-bold">{timeSignature}</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {PRESET_SIGNATURES.map(sig => {
                  const isSelected = timeSignature === sig.value;
                  return (
                    <button
                      key={sig.value}
                      type="button"
                      onClick={() => handleSignatureUpdate(sig.value)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-purple-900/40 border-purple-500 text-purple-200 shadow-sm'
                          : 'bg-[#1C1C20] hover:bg-[#25252C] text-gray-300 border-[#2E2E36]'
                      }`}
                      title={sig.desc}
                    >
                      {sig.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Réglages Sonores & Flash Visuel */}
            <div className="pt-2 border-t border-[#24242A] space-y-3">
              {/* Volume Sonore */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-gray-300">
                  <span className="flex items-center gap-1.5">
                    {isMuted ? <VolumeX className="w-3.5 h-3.5 text-gray-500" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                    <span>Volume du clic</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleMute}
                    className="text-[10px] font-semibold text-blue-400 hover:text-blue-300 underline cursor-pointer"
                  >
                    {isMuted ? 'Activer le son' : 'Couper le son'}
                  </button>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  disabled={isMuted}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer h-1.5 bg-[#25252C] rounded-lg disabled:opacity-40"
                />
              </div>

              {/* Flash visuel bordure écran */}
              <div className="flex items-center justify-between pt-1 text-xs text-gray-300">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Flash visuel en haut d'écran</span>
                </span>
                <input
                  type="checkbox"
                  checked={enableScreenFlash}
                  onChange={(e) => setEnableScreenFlash(e.target.checked)}
                  className="rounded bg-[#25252C] border-[#3A3A42] text-emerald-500 focus:ring-0 cursor-pointer w-4 h-4"
                />
              </div>
            </div>

            {/* Bouton Démarrer / Arrêter général */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleTogglePlay}
                className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
                  isPlaying
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
                }`}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Arrêter le métronome</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Démarrer le métronome ({bpm} BPM • {timeSignature})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
