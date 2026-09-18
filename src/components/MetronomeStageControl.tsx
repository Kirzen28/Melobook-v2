import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Gauge, 
  Zap
} from 'lucide-react';
import { metronome, parseTimeSignatureToBeats, TimeSignatureInfo } from '../utils/chordUtils';

interface MetronomeStageControlProps {
  initialBpm?: number;
  initialTimeSignature?: string;
  onBpmChange?: (bpm: number) => void;
  onTimeSignatureChange?: (signature: string) => void;
  className?: string;
  songTitle?: string;
  readOnly?: boolean;
  onOpenSettings?: () => void;
}

export const MetronomeStageControl: React.FC<MetronomeStageControlProps> = ({
  initialBpm = 120,
  initialTimeSignature = '4/4',
  onBpmChange,
  onTimeSignatureChange,
  className = '',
  readOnly = false,
  onOpenSettings
}) => {
  const [bpm, setBpm] = useState<number>(initialBpm || 120);
  const [timeSignature, setTimeSignature] = useState<string>(initialTimeSignature || '4/4');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume] = useState<number>(0.85);
  const [currentBeat, setCurrentBeat] = useState<number>(0);

  // État du flash écran avec persistance
  const [enableScreenFlash, setEnableScreenFlash] = useState<boolean>(() => {
    try {
      return localStorage.getItem('songbook_metronome_flash') === 'true';
    } catch {
      return false;
    }
  });
  const [flashActive, setFlashActive] = useState<'accent' | 'beat' | null>(null);
  const flashTimeoutRef = useRef<number | null>(null);
  const enableScreenFlashRef = useRef<boolean>(enableScreenFlash);

  useEffect(() => {
    enableScreenFlashRef.current = enableScreenFlash;
    try {
      localStorage.setItem('songbook_metronome_flash', enableScreenFlash ? 'true' : 'false');
    } catch {}
  }, [enableScreenFlash]);

  // Déclenchement d'un flash contour discret et subtil (70ms)
  const triggerScreenFlash = (isAccent: boolean) => {
    if (flashTimeoutRef.current) {
      window.clearTimeout(flashTimeoutRef.current);
    }
    setFlashActive(isAccent ? 'accent' : 'beat');
    flashTimeoutRef.current = window.setTimeout(() => {
      setFlashActive(null);
      flashTimeoutRef.current = null;
    }, 70);
  };

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
      if (flashTimeoutRef.current) {
        window.clearTimeout(flashTimeoutRef.current);
      }
      setFlashActive(null);
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
          if (enableScreenFlashRef.current) {
            triggerScreenFlash(isAccent);
          }
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

  // Muter / Démuter le son
  const handleToggleMute = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    metronome.setMuted(nextMuted);
  };

  // Activer / Désactiver le flash écran avec aperçu immédiat
  const handleToggleScreenFlash = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const nextVal = !enableScreenFlash;
    setEnableScreenFlash(nextVal);
    enableScreenFlashRef.current = nextVal;
    if (nextVal) {
      // Test de flash instantané pour confirmer visuellement que le flash fonctionne
      triggerScreenFlash(true);
    } else {
      if (flashTimeoutRef.current) {
        window.clearTimeout(flashTimeoutRef.current);
      }
      setFlashActive(null);
    }
  };

  // Arrêter le métronome et nettoyer les timers si le composant est démonté
  useEffect(() => {
    return () => {
      metronome.stop();
      if (flashTimeoutRef.current) {
        window.clearTimeout(flashTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Flash contour subtil et discret aux bordures d'écran (aucun filtre de fond) */}
      {flashActive && (
        <div 
          id="metronome-screen-flash-overlay"
          className={`fixed inset-0 pointer-events-none z-[99999] bg-transparent transition-opacity duration-75 ${
            flashActive === 'accent'
              ? 'ring-2 ring-inset ring-amber-400/80 shadow-[inset_0_0_12px_rgba(251,191,36,0.25)]'
              : 'ring-1 sm:ring-2 ring-inset ring-emerald-400/50 shadow-[inset_0_0_8px_rgba(52,211,153,0.15)]'
          }`}
        />
      )}

      {/* Widget Barre Supérieure Compacte */}
      <div 
        id="stage-metronome-bar"
        className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border shadow-sm transition-all select-none ${
          isPlaying 
            ? 'bg-emerald-950/40 border-emerald-500/50 shadow-emerald-950/50' 
            : 'bg-[#141416] border-[#242428] hover:border-emerald-500/40'
        }`}
        title="Métronome visuel, sonore et flash écran (BPM, signature, pulsation)"
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

        {/* BPM interactif ou lecture seule */}
        {readOnly ? (
          <div 
            className="flex items-center gap-1 select-none cursor-default"
            title={onOpenSettings ? "Modifier le tempo dans les réglages du morceau" : undefined}
            onClick={onOpenSettings}
          >
            <Gauge className={`w-3.5 h-3.5 ${isPlaying ? 'text-emerald-400' : 'text-emerald-500/80'} shrink-0`} />
            <span className="text-emerald-400/90 font-medium text-xs hidden sm:inline">Métronome :</span>
            <span className="px-1.5 py-0.5 rounded bg-[#18181C] border border-[#242428] text-emerald-400 font-bold font-mono text-xs">
              {bpm}
            </span>
            <span className="text-[10px] text-gray-400 font-mono">BPM</span>
          </div>
        ) : (
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
        )}

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

        {/* Bouton Flash Écran (Pulsation visuelle plein écran) */}
        <button
          type="button"
          id="metronome-toggle-flash-btn"
          onClick={handleToggleScreenFlash}
          className={`p-1 rounded transition-all cursor-pointer ${
            enableScreenFlash
              ? 'bg-amber-500/25 text-amber-400 border border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
              : 'text-gray-400 hover:text-amber-300 hover:bg-[#202026]'
          }`}
          title={enableScreenFlash ? "Flash écran actif (cliquer pour désactiver)" : "Activer le flash écran au tempo"}
        >
          <Zap className={`w-3.5 h-3.5 ${enableScreenFlash ? 'fill-amber-400 text-amber-400' : ''}`} />
        </button>
      </div>
    </div>
  );
};
