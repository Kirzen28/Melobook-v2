import React, { useState, useEffect } from 'react';
import { 
  Power, 
  Volume2, 
  VolumeX, 
  ChevronDown, 
  Sparkles, 
  Lock, 
  Unlock,
  RotateCcw
} from 'lucide-react';
import { 
  padAudio, 
  PAD_PRESETS, 
  CHROMATIC_NOTES, 
  PadPresetId, 
  parseKeyToSemitone 
} from '../utils/padAudio';

interface PadControlProps {
  songKey?: string;
  transposeOffset?: number;
  className?: string;
}

export const PadControl: React.FC<PadControlProps> = ({
  songKey,
  transposeOffset = 0,
  className = ''
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(() => padAudio.getIsRunning());
  const [activeSemitone, setActiveSemitone] = useState<number>(() => {
    return padAudio.getIsRunning() 
      ? padAudio.getCurrentSemitone() 
      : (parseKeyToSemitone(songKey) + transposeOffset + 12) % 12;
  });
  const [currentPreset, setCurrentPreset] = useState<PadPresetId>(() => padAudio.getCurrentPreset());
  const [volume, setVolume] = useState<number>(() => Math.round(padAudio.getCurrentVolume() * 100));
  const [isMuted, setIsMuted] = useState<boolean>(() => padAudio.getIsMuted());
  const [isPresetDropdownOpen, setIsPresetDropdownOpen] = useState(false);
  const [isLockedToSongKey, setIsLockedToSongKey] = useState(false);

  // Calculate song's current target semitone
  const songTargetSemitone = (parseKeyToSemitone(songKey) + transposeOffset + 12) % 12;

  // Sync to song key when song key or transpose changes if not manually playing something else while running
  useEffect(() => {
    if (!isPlaying || isLockedToSongKey) {
      setActiveSemitone(songTargetSemitone);
      if (isPlaying && isLockedToSongKey) {
        padAudio.changeNote(songTargetSemitone);
      }
    }
  }, [songKey, transposeOffset, isLockedToSongKey]);

  // Handle power toggle
  const handleTogglePower = () => {
    if (isPlaying) {
      padAudio.stop();
      setIsPlaying(false);
    } else {
      padAudio.start(activeSemitone, currentPreset);
      setIsPlaying(true);
    }
  };

  // Handle note press (urgent key switch)
  const handleSelectNote = (semitone: number) => {
    setActiveSemitone(semitone);
    if (isPlaying) {
      padAudio.changeNote(semitone);
    } else {
      // Auto-start on note tap if stopped
      padAudio.start(semitone, currentPreset);
      setIsPlaying(true);
    }
  };

  // Handle preset change
  const handleSelectPreset = (presetId: PadPresetId) => {
    setCurrentPreset(presetId);
    padAudio.changePreset(presetId);
    setIsPresetDropdownOpen(false);
  };

  // Handle volume slider
  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    padAudio.setVolume(newVol / 100);
    if (isMuted && newVol > 0) {
      setIsMuted(false);
    }
  };

  // Toggle Mute
  const handleToggleMute = () => {
    const muted = padAudio.toggleMute();
    setIsMuted(muted);
  };

  const selectedPresetObj = PAD_PRESETS.find(p => p.id === currentPreset) || PAD_PRESETS[0];

  return (
    <div className={`w-full bg-[#11141B] border border-[#212735] rounded-2xl p-3 sm:p-4 text-white shadow-xl select-none ${className}`}>
      
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between gap-2.5 mb-3">
        
        {/* Power Button */}
        <button
          type="button"
          onClick={handleTogglePower}
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-md shrink-0 ${
            isPlaying
              ? 'bg-sky-400 text-black shadow-sky-400/40 ring-2 ring-sky-300 scale-102'
              : 'bg-[#1A202C] hover:bg-[#252E3E] text-gray-400 hover:text-gray-200 border border-[#2B3547]'
          }`}
          title={isPlaying ? "Éteindre le Pad" : "Allumer le Pad d'accompagnement"}
          aria-label={isPlaying ? "Éteindre le Pad" : "Allumer le Pad"}
        >
          <Power className={`w-5 h-5 ${isPlaying ? 'stroke-[2.5]' : ''}`} />
        </button>

        {/* Preset Selector Dropdown */}
        <div className="relative flex-1 min-w-0">
          <button
            type="button"
            onClick={() => setIsPresetDropdownOpen(!isPresetDropdownOpen)}
            className="w-full text-left bg-[#171C26] hover:bg-[#1E2533] border border-[#2A3344] rounded-xl px-3 py-1.5 flex items-center justify-between gap-2 transition-colors cursor-pointer"
          >
            <div className="min-w-0">
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none">
                Tonic Pad
              </span>
              <span className="block text-xs sm:text-sm font-bold text-white truncate mt-0.5">
                {selectedPresetObj.name}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${isPresetDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isPresetDropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsPresetDropdownOpen(false)} 
              />
              <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#141822] border border-[#2B3547] rounded-xl shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100">
                {PAD_PRESETS.map((p) => {
                  const isSel = p.id === currentPreset;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPreset(p.id)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                        isSel
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold'
                          : 'hover:bg-[#1D2433] text-gray-300'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="truncate font-semibold">{p.name}</div>
                        <div className="text-[10px] text-gray-500 truncate">{p.description}</div>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#10141C] text-gray-400 border border-[#202735] shrink-0">
                        {p.category}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Lock to song key button */}
        <button
          type="button"
          onClick={() => {
            const next = !isLockedToSongKey;
            setIsLockedToSongKey(next);
            if (next) {
              setActiveSemitone(songTargetSemitone);
              if (isPlaying) padAudio.changeNote(songTargetSemitone);
            }
          }}
          className={`h-11 px-2.5 rounded-xl border text-[10px] font-bold flex flex-col items-center justify-center transition-all cursor-pointer shrink-0 ${
            isLockedToSongKey
              ? 'bg-sky-500/20 border-sky-400/50 text-sky-300'
              : 'bg-[#171C26] hover:bg-[#1E2533] border-[#2A3344] text-gray-400'
          }`}
          title={isLockedToSongKey ? "Verrouillé sur la tonalité du chant" : "Verrouiller sur la tonalité du chant"}
        >
          {isLockedToSongKey ? <Lock className="w-3.5 h-3.5 text-sky-400" /> : <Unlock className="w-3.5 h-3.5" />}
          <span className="mt-0.5 leading-none">Lock</span>
        </button>
      </div>

      {/* Main Area: 12 Chromatic Notes Grid (2 rows x 6 cols) + Fader */}
      <div className="flex gap-2.5 sm:gap-3 items-stretch">
        
        {/* 2x6 Notes Grid */}
        <div className="flex-1 grid grid-cols-6 gap-1.5 sm:gap-2">
          {CHROMATIC_NOTES.map((note) => {
            const isActive = activeSemitone === note.semitone;
            const isSongRoot = songTargetSemitone === note.semitone;

            return (
              <button
                key={note.semitone}
                type="button"
                onClick={() => handleSelectNote(note.semitone)}
                className={`h-12 sm:h-14 rounded-xl flex flex-col items-center justify-center font-bold transition-all cursor-pointer relative shadow-xs active:scale-95 ${
                  isActive
                    ? 'bg-sky-400 text-black shadow-sky-400/30 scale-102 ring-2 ring-sky-300 z-10'
                    : 'bg-[#181D27] hover:bg-[#222836] text-gray-200 border border-[#273041]'
                }`}
                title={`Note : ${note.label} (${note.alt}) ${isSongRoot ? '• Tonalité du chant' : ''}`}
              >
                <span className={`text-sm sm:text-base tracking-tight ${isActive ? 'font-black' : 'font-bold'}`}>
                  {note.label}
                </span>

                {/* Subtext: French note name or song key indicator */}
                <span className={`text-[9px] -mt-0.5 ${isActive ? 'text-black/70 font-semibold' : 'text-gray-500'}`}>
                  {note.alt}
                </span>

                {/* Song Root Dot Badge */}
                {isSongRoot && (
                  <span 
                    className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                      isActive ? 'bg-black' : 'bg-sky-400 ring-1 ring-sky-300'
                    }`} 
                    title="Tonalité du chant"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Volume Fader & Mute Controls (Right side like the screenshot) */}
        <div className="w-12 sm:w-14 bg-[#171C26] border border-[#283141] rounded-xl p-1.5 flex flex-col items-center justify-between shrink-0 shadow-inner">
          
          {/* Vertical Fader Track */}
          <div className="flex-1 w-full flex items-center justify-center py-1">
            <div className="relative w-6 sm:w-7 h-20 sm:h-24 bg-[#10131B] border border-[#252C3A] rounded-lg overflow-hidden flex flex-col justify-end">
              {/* Cyan fill level */}
              <div 
                className={`w-full transition-all duration-75 ${
                  isMuted ? 'bg-gray-600 opacity-40' : 'bg-sky-400'
                }`}
                style={{ height: `${isMuted ? 0 : volume}%` }}
              />
              {/* Invisible native range input rotated */}
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                title={`Volume du Pad : ${volume}%`}
              />
            </div>
          </div>

          {/* Quick Mute & Reset */}
          <div className="w-full flex items-center justify-center gap-1 pt-1.5 border-t border-[#222A38]">
            <button
              type="button"
              onClick={handleToggleMute}
              className={`w-7 h-6 rounded-md text-[10px] font-bold flex items-center justify-center transition-colors cursor-pointer ${
                isMuted
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-[#202735] text-gray-400 hover:text-white'
              }`}
              title={isMuted ? "Rétablir le son" : "Couper le son (Mute)"}
            >
              M
            </button>
          </div>
        </div>

      </div>

      {/* Footer Info & Quick reset to song key */}
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[#1C2230] text-[11px] text-gray-400">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-sky-400 shrink-0" />
          <span>
            {isPlaying ? (
              <span className="text-sky-300 font-medium">
                Pad actif en <strong className="text-white">{CHROMATIC_NOTES[activeSemitone]?.label}</strong> ({selectedPresetObj.name})
              </span>
            ) : (
              <span>Pad en pause • Tonalité prête</span>
            )}
          </span>
        </div>

        {activeSemitone !== songTargetSemitone && (
          <button
            type="button"
            onClick={() => handleSelectNote(songTargetSemitone)}
            className="text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 text-[10px] transition-colors cursor-pointer"
            title="Revenir à la tonalité du chant"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Re-caler ({CHROMATIC_NOTES[songTargetSemitone]?.label})</span>
          </button>
        )}
      </div>

    </div>
  );
};
