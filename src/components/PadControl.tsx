import React, { useState, useEffect, useRef } from 'react';
import { 
  Power, 
  Square,
  Volume2, 
  VolumeX, 
  ChevronDown, 
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Check,
  Music
} from 'lucide-react';
import { 
  padAudio, 
  CHROMATIC_NOTES, 
  parseKeyToSemitone,
  PAD_PRESETS,
  PadPresetId
} from '../utils/padAudio';

interface PadControlProps {
  songKey?: string;
  transposeOffset?: number;
  className?: string;
  onToggleCollapse?: () => void;
}

export const PadControl: React.FC<PadControlProps> = ({
  songKey,
  transposeOffset = 0,
  className = ''
}) => {
  // Target semitone calculated directly from the current song key and transpose
  const songTargetSemitone = (parseKeyToSemitone(songKey) + transposeOffset + 12) % 12;

  // Track if user manually picked a different note for this song
  const [isManualOverride, setIsManualOverride] = useState<boolean>(false);
  const [manualSemitone, setManualSemitone] = useState<number>(songTargetSemitone);

  // Active semitone: manual note if user selected one, otherwise always follows the song
  const activeSemitone = isManualOverride ? manualSemitone : songTargetSemitone;

  const [isPlaying, setIsPlaying] = useState<boolean>(() => padAudio.getIsRunning());
  const [currentPreset, setCurrentPreset] = useState<PadPresetId>(() => padAudio.getCurrentPreset());
  const [volume, setVolume] = useState<number>(() => Math.round(padAudio.getCurrentVolume() * 100));
  const [isMuted, setIsMuted] = useState<boolean>(() => padAudio.getIsMuted());
  const [crossfadeDuration, setCrossfadeDuration] = useState<number>(() => padAudio.getCrossfadeDuration());
  
  const [showNotePicker, setShowNotePicker] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  const pickerRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Sync state with padAudio engine singleton
  useEffect(() => {
    return padAudio.subscribe(() => {
      setIsPlaying(padAudio.getIsRunning());
      setCurrentPreset(padAudio.getCurrentPreset());
      setVolume(Math.round(padAudio.getCurrentVolume() * 100));
      setIsMuted(padAudio.getIsMuted());
      setCrossfadeDuration(padAudio.getCrossfadeDuration());
    });
  }, []);

  // When changing song (slide, next/prev, or key change):
  // Reset manual override and automatically adapt the pad to the new song's key with crossfade fade-in
  useEffect(() => {
    setIsManualOverride(false);
    setManualSemitone(songTargetSemitone);

    // If already playing, immediately adapt note with smooth crossfade
    if (padAudio.getIsRunning() && padAudio.getCurrentSemitone() !== songTargetSemitone) {
      padAudio.changeNote(songTargetSemitone);
    }
  }, [songKey, transposeOffset, songTargetSemitone]);

  // Close note picker and settings popovers on outside click
  useEffect(() => {
    if (!showNotePicker && !showSettings) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (showNotePicker && pickerRef.current && !pickerRef.current.contains(target)) {
        setShowNotePicker(false);
      }
      if (showSettings && settingsRef.current && !settingsRef.current.contains(target)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotePicker, showSettings]);

  // Handle power toggle (simple on/off)
  const handleTogglePower = () => {
    if (isPlaying) {
      padAudio.stop();
      setIsPlaying(false);
    } else {
      padAudio.start(activeSemitone, currentPreset);
      setIsPlaying(true);
    }
  };

  // Handle choosing a specific manual note
  const handleSelectCustomNote = (semitone: number) => {
    if (semitone === songTargetSemitone) {
      setIsManualOverride(false);
    } else {
      setIsManualOverride(true);
      setManualSemitone(semitone);
    }
    setShowNotePicker(false);

    if (isPlaying) {
      padAudio.changeNote(semitone);
    }
  };

  // Reset to the song's key
  const handleResetToSongKey = () => {
    setIsManualOverride(false);
    setManualSemitone(songTargetSemitone);
    setShowNotePicker(false);

    if (isPlaying && padAudio.getCurrentSemitone() !== songTargetSemitone) {
      padAudio.changeNote(songTargetSemitone);
    }
  };

  // Select sound preset
  const handleSelectPreset = (pId: PadPresetId) => {
    setCurrentPreset(pId);
    padAudio.selectSynthPreset(pId);
  };

  // Volume change
  const handleVolumeChange = (newVal: number) => {
    setVolume(newVal);
    padAudio.setVolume(newVal / 100);
    if (isMuted && newVal > 0) {
      setIsMuted(false);
    }
  };

  // Mute toggle
  const handleToggleMute = () => {
    const muted = padAudio.toggleMute();
    setIsMuted(muted);
  };

  // Crossfade duration change
  const handleCrossfadeChange = (sec: number) => {
    const clamped = Math.max(0.4, Math.min(6.0, sec));
    setCrossfadeDuration(clamped);
    padAudio.setCrossfadeDuration(clamped);
  };

  const activeNoteObj = CHROMATIC_NOTES[activeSemitone] || CHROMATIC_NOTES[0];
  const songKeyObj = CHROMATIC_NOTES[songTargetSemitone] || CHROMATIC_NOTES[0];
  const activePresetObj = PAD_PRESETS.find(p => p.id === currentPreset) || PAD_PRESETS[0];

  const getCrossfadeLabel = (sec: number) => {
    if (sec <= 1.0) return 'Court';
    if (sec >= 3.0) return 'Long';
    return 'Moyen';
  };

  return (
    <div className={`w-full bg-[#11141C] border border-[#222A3A] rounded-2xl p-3 sm:p-4 text-white shadow-xl select-none box-border space-y-3 ${className}`}>
      
      {/* Ligne 1 : Bouton d'activation / Arrêt (Stop quand actif) + Bouton note + Bouton paramètres */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        
        {/* Bouton d'activation / Stop */}
        <button
          type="button"
          onClick={handleTogglePower}
          className={`h-11 w-12 rounded-xl flex items-center justify-center font-bold transition-all cursor-pointer shadow-md active:scale-95 shrink-0 ${
            isPlaying
              ? 'bg-rose-600 hover:bg-rose-500 text-white border border-rose-400 shadow-rose-950/60 ring-2 ring-rose-500/50'
              : 'bg-sky-400 hover:bg-sky-300 text-black font-extrabold ring-2 ring-sky-300/60 shadow-sky-400/25'
          }`}
          title={isPlaying ? "Arrêter le pad (STOP)" : "Démarrer le pad d'accompagnement"}
          aria-label={isPlaying ? "Arrêter le pad" : "Démarrer le pad"}
        >
          {isPlaying ? (
            <Square className="w-4 h-4 fill-current text-white animate-pulse" />
          ) : (
            <Power className="w-5 h-5 text-black stroke-[2.5]" />
          )}
        </button>

        {/* Bouton Note (compact, prend le minimum de place) */}
        <div className="relative shrink-0" ref={pickerRef}>
          <button
            type="button"
            onClick={() => {
              setShowNotePicker(!showNotePicker);
              setShowSettings(false);
            }}
            className={`h-11 px-2.5 sm:px-3 rounded-xl border flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
              isManualOverride
                ? 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40 text-amber-300'
                : 'bg-[#181D29] hover:bg-[#202738] border-[#2B3547] text-gray-200'
            }`}
            title="Modifier la note du pad"
          >
            <span className="text-xs sm:text-sm font-extrabold text-white">
              {activeNoteObj.label}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform shrink-0 ${showNotePicker ? 'rotate-180' : ''}`} />
          </button>

          {/* Menu popover de sélection de note */}
          {showNotePicker && (
            <div className="absolute left-0 top-full mt-2 z-50 w-64 bg-[#141822] border border-[#2B3547] rounded-xl shadow-2xl p-2.5 space-y-2 animate-in fade-in zoom-in-95 duration-100 box-border">
              
              <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 pb-1.5 border-b border-[#202738]">
                <span>Changer la note du pad</span>
                <span className="text-sky-400 font-mono text-[10px]">
                  Chant : {songKeyObj.label}
                </span>
              </div>

              {/* Bouton pour revenir à la tonalité du chant */}
              {isManualOverride && (
                <button
                  type="button"
                  onClick={handleResetToSongKey}
                  className="w-full py-1.5 px-2 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3 text-sky-400" />
                  <span>Suivre la tonalité du chant ({songKeyObj.label} / {songKeyObj.alt})</span>
                </button>
              )}

              {/* Grille des 12 notes chromatiques */}
              <div className="grid grid-cols-4 gap-1 pt-1">
                {CHROMATIC_NOTES.map(note => {
                  const isSelected = activeSemitone === note.semitone;
                  const isSongKey = songTargetSemitone === note.semitone;

                  return (
                    <button
                      key={note.semitone}
                      type="button"
                      onClick={() => handleSelectCustomNote(note.semitone)}
                      className={`py-1.5 px-1 rounded-lg flex flex-col items-center justify-center text-xs transition-colors cursor-pointer border ${
                        isSelected
                          ? 'bg-sky-400 text-black font-bold border-sky-300 shadow-xs'
                          : isSongKey
                          ? 'bg-sky-950/40 border-sky-500/40 text-sky-300 hover:bg-sky-900/40 font-semibold'
                          : 'bg-[#181D29] hover:bg-[#222A3B] border-[#252E3E] text-gray-300'
                      }`}
                    >
                      <span className="font-bold leading-none">{note.label}</span>
                      <span className={`text-[8px] mt-0.5 leading-none ${isSelected ? 'text-black/70' : 'text-gray-400'}`}>
                        {note.alt}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Bouton Réglages du pad avec nom de la nappe affiché */}
        <div className="relative flex-1 min-w-0" ref={settingsRef}>
          <button
            type="button"
            onClick={() => {
              setShowSettings(!showSettings);
              setShowNotePicker(false);
            }}
            className={`w-full h-11 px-3 rounded-xl border flex items-center justify-between gap-2 transition-colors cursor-pointer min-w-0 ${
              showSettings
                ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                : 'bg-[#181D29] hover:bg-[#202738] border-[#2B3547] text-gray-200'
            }`}
            title={`Paramètres du pad : ${activePresetObj.name} (Fondu : ${crossfadeDuration.toFixed(1)}s)`}
            aria-label="Paramètres du pad"
          >
            <div className="flex items-center gap-2 min-w-0 overflow-hidden">
              <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="text-xs sm:text-sm font-semibold text-white truncate text-left">
                {activePresetObj.name}
              </span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform ${showSettings ? 'rotate-180' : ''}`} />
          </button>

          {/* Menu popover des paramètres du pad */}
          {showSettings && (
            <div className="absolute right-0 top-full mt-2 z-50 w-76 sm:w-80 bg-[#141822] border border-[#2B3547] rounded-xl shadow-2xl p-3 space-y-3 animate-in fade-in zoom-in-95 duration-100 box-border text-left">
              
              {/* Section 1 : Choix de la nappe sonore */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#202738]">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-gray-200">
                    <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                    <span>Nappe d'accompagnement</span>
                  </span>
                  <span className="text-[10px] text-sky-400 font-mono">
                    {PAD_PRESETS.length} sons
                  </span>
                </div>

                <div className="space-y-1 max-h-44 overflow-y-auto pr-0.5 custom-scrollbar">
                  {PAD_PRESETS.map((p) => {
                    const isSel = currentPreset === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPreset(p.id)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer border ${
                          isSel
                            ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 font-semibold'
                            : 'bg-[#181D29] hover:bg-[#202738] text-gray-300 border-[#252E3E]'
                        }`}
                      >
                        <div className="min-w-0 pr-1.5">
                          <div className="truncate font-semibold flex items-center gap-1.5">
                            <span>{p.name}</span>
                            {p.audioUrl ? (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-sky-950/80 text-sky-300 border border-sky-500/40 font-mono font-bold">
                                Boucle 1 min
                              </span>
                            ) : null}
                          </div>
                          <div className="text-[9px] text-gray-400 truncate leading-tight">
                            {p.description}
                          </div>
                        </div>
                        {isSel && <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 2 : Durée du fondu (Crossfade) */}
              <div className="pt-2 border-t border-[#202738] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-200">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />
                    <span>Fondu (Crossfade)</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-sky-400 bg-sky-950/60 border border-sky-500/30 px-1.5 py-0.5 rounded">
                    {crossfadeDuration.toFixed(1)} s
                  </span>
                </div>

                <div className="text-[10px] text-gray-400 leading-tight">
                  Transition lors du slide ou changement de morceau :
                </div>

                {/* Presets rapides Court / Moyen / Long */}
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { label: 'Court', sec: 0.8, desc: 'Rapide' },
                    { label: 'Moyen', sec: 1.8, desc: 'Standard' },
                    { label: 'Long', sec: 3.5, desc: 'Planant' }
                  ].map(preset => {
                    const isSelected = Math.abs(crossfadeDuration - preset.sec) < 0.25;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => handleCrossfadeChange(preset.sec)}
                        className={`p-1.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                          isSelected
                            ? 'bg-sky-400 text-black border-sky-300 font-bold shadow-xs'
                            : 'bg-[#181D29] hover:bg-[#202738] text-gray-300 border-[#2A3345]'
                        }`}
                      >
                        <span className="text-xs font-bold leading-none">{preset.label}</span>
                        <span className={`text-[9px] mt-1 font-mono ${isSelected ? 'text-black/80 font-semibold' : 'text-gray-400'}`}>
                          {preset.sec}s
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Curseur continu */}
                <div className="pt-0.5 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                    <span>Court (0.4s)</span>
                    <span>Long (6.0s)</span>
                  </div>
                  <input
                    type="range"
                    min="0.4"
                    max="6.0"
                    step="0.1"
                    value={crossfadeDuration}
                    onChange={(e) => handleCrossfadeChange(parseFloat(e.target.value))}
                    className="w-full accent-sky-400 h-1.5 bg-[#10131B] rounded-lg cursor-pointer"
                  />
                </div>
              </div>

            </div>
          )}
        </div>

      </div>

      {/* Ligne 2 : Gestion du volume du pad d'accompagnement */}
      <div className="bg-[#161B26] border border-[#232B3B] rounded-xl px-3 py-2 flex items-center gap-3">
        {/* Bouton Mute */}
        <button
          type="button"
          onClick={handleToggleMute}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer shrink-0 border ${
            isMuted
              ? 'bg-rose-600 border-rose-500 text-white'
              : 'bg-[#1D2332] hover:bg-[#262E40] border-[#2C364A] text-gray-300 hover:text-white'
          }`}
          title={isMuted ? "Rétablir le son" : "Couper le son (Mute)"}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-sky-400" />}
        </button>

        {/* Curseur curseur horizontal */}
        <div className="flex-1 min-w-0">
          <input
            type="range"
            min="0"
            max="100"
            value={isMuted ? 0 : volume}
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
            className="w-full accent-sky-400 h-1.5 bg-[#10131B] rounded-lg cursor-pointer"
            title={`Volume du Pad : ${volume}%`}
          />
        </div>

        {/* Affichage du pourcentage */}
        <span className="text-[11px] font-mono font-bold text-gray-300 tabular-nums shrink-0 w-9 text-right">
          {isMuted ? 'MUTE' : `${volume}%`}
        </span>
      </div>

    </div>
  );
};
