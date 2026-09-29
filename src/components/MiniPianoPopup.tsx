import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight,
  Music,
  Volume2,
  VolumeX,
  Layers,
  Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { 
  pianoAudio, 
  TimbreType, 
  TONALITIES, 
  SCALES, 
  KEY_SIGNATURES,
  NOTE_NAMES_ANGLO, 
  NOTE_NAMES_LATIN, 
  detectChord,
  midiToNoteInfo,
  ActiveNoteInfo
} from '../utils/pianoAudio';

// White keys definition relative to an octave (offsets 0, 2, 4, 5, 7, 9, 11)
const WHITE_KEY_OFFSETS = [
  { pitch: 0, anglo: 'C', latin: 'Do' },
  { pitch: 2, anglo: 'D', latin: 'Ré' },
  { pitch: 4, anglo: 'E', latin: 'Mi' },
  { pitch: 5, anglo: 'F', latin: 'Fa' },
  { pitch: 7, anglo: 'G', latin: 'Sol' },
  { pitch: 9, anglo: 'A', latin: 'La' },
  { pitch: 11, anglo: 'B', latin: 'Si' },
];

// Black keys definition relative to octave
const BLACK_KEY_OFFSETS = [
  { pitch: 1, anglo: 'C#', latin: 'Do#', whiteIndexBefore: 0 },
  { pitch: 3, anglo: 'D#', latin: 'Ré#', whiteIndexBefore: 1 },
  { pitch: 6, anglo: 'F#', latin: 'Fa#', whiteIndexBefore: 3 },
  { pitch: 8, anglo: 'G#', latin: 'Sol#', whiteIndexBefore: 4 },
  { pitch: 10, anglo: 'A#', latin: 'La#', whiteIndexBefore: 5 },
];

export const MiniPianoPopup: React.FC = () => {
  const { isPianoOpen, setIsPianoOpen } = useApp();

  // Responsive default octaves based on screen size and orientation
  const [numOctaves, setNumOctaves] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const isLandscape = window.innerWidth > window.innerHeight;
      if (window.innerWidth >= 1200) return 3;
      if (window.innerWidth >= 768) return isLandscape ? 3 : 2;
      return isLandscape ? 2 : 1;
    }
    return 2;
  });

  const [baseOctave, setBaseOctave] = useState<number>(4); // C4 is middle C (MIDI 60)

  // Audio settings
  const [volume, setVolume] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [timbre, setTimbre] = useState<TimbreType>('acoustic');
  const [isSustainOn, setIsSustainOn] = useState<boolean>(false);

  // Label display mode: 'latin' (Do, Ré), 'anglo' (C, D), 'none'
  const [labelMode, setLabelMode] = useState<'latin' | 'anglo' | 'none'>('latin');

  // Tonality / Scale finder state
  const [isTheoryOpen, setIsTheoryOpen] = useState(false);
  const [selectedRoot, setSelectedRoot] = useState<number | null>(null);
  const [selectedScaleId, setSelectedScaleId] = useState<string>('major');

  // Currently pressed keys (set of MIDI numbers)
  const [pressedMidis, setPressedMidis] = useState<Set<number>>(new Set());
  const [lastPlayedNote, setLastPlayedNote] = useState<ActiveNoteInfo | null>(null);

  // Reference for dragging note slides
  const isPointerDownRef = useRef(false);

  // Adapt on orientation / resize changes
  useEffect(() => {
    const handleResize = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      if (window.innerWidth < 640 && !isLandscape && numOctaves > 2) {
        setNumOctaves(1);
      }
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [numOctaves]);

  // Sync audio engine volume & timbre
  useEffect(() => {
    pianoAudio.setVolume(isMuted ? 0 : volume);
    pianoAudio.setMuted(isMuted);
    pianoAudio.setTimbre(timbre);
  }, [volume, isMuted, timbre]);

  // Clean up sounds when popup closes
  useEffect(() => {
    if (!isPianoOpen) {
      pianoAudio.stopAll();
      setPressedMidis(new Set());
    }
  }, [isPianoOpen]);

  // Global mouse/pointer up listener to stop notes
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      isPointerDownRef.current = false;
      if (!isSustainOn && pressedMidis.size > 0) {
        pressedMidis.forEach(m => pianoAudio.stopNote(m, false, isSustainOn));
        setPressedMidis(new Set());
      }
    };

    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, [isSustainOn, pressedMidis]);

  // Computer keyboard support when modal is open and not typing into an input
  useEffect(() => {
    if (!isPianoOpen) return;

    // Keyboard mapping for Octave 4
    const keyToMidiOffset: Record<string, number> = {
      'a': 0, 'w': 1, 's': 2, 'e': 3, 'd': 4,
      'f': 5, 't': 6, 'g': 7, 'y': 8, 'h': 9, 'u': 10, 'j': 11, 'k': 12
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.repeat) return;

      const k = e.key.toLowerCase();
      if (k in keyToMidiOffset) {
        e.preventDefault();
        const baseMidi = (baseOctave + 1) * 12;
        const midi = baseMidi + keyToMidiOffset[k];
        handleNoteStart(midi);
      } else if (k === 'escape') {
        setIsPianoOpen(false);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const k = e.key.toLowerCase();
      if (k in keyToMidiOffset) {
        const baseMidi = (baseOctave + 1) * 12;
        const midi = baseMidi + keyToMidiOffset[k];
        handleNoteStop(midi);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPianoOpen, baseOctave, isSustainOn]);

  // Calculate notes for current scale / tonality highlighting
  const tonalityNotes = useMemo(() => {
    if (selectedRoot === null) return { pitchClasses: new Set<number>(), rootPitch: null, keySig: null, scaleObj: null };
    const scaleObj = SCALES.find(s => s.id === selectedScaleId) || SCALES[0];
    const pitchClasses = new Set<number>();
    scaleObj.intervals.forEach(interval => {
      pitchClasses.add((selectedRoot + interval) % 12);
    });

    const keySigKey = `${selectedRoot}-${selectedScaleId}`;
    const keySig = KEY_SIGNATURES[keySigKey] || null;

    return { pitchClasses, rootPitch: selectedRoot, keySig, scaleObj };
  }, [selectedRoot, selectedScaleId]);

  // Keys list generation
  const keyboardKeys = useMemo(() => {
    const whiteKeys: Array<{
      midi: number;
      pitch: number;
      octave: number;
      anglo: string;
      latin: string;
      isWhite: true;
      whiteIndex: number;
    }> = [];

    const blackKeys: Array<{
      midi: number;
      pitch: number;
      octave: number;
      anglo: string;
      latin: string;
      isWhite: false;
      whiteIndexBefore: number;
    }> = [];

    let currentWhiteIndex = 0;

    for (let octIdx = 0; octIdx < numOctaves; octIdx++) {
      const currentOct = baseOctave + octIdx;
      const octaveBaseMidi = (currentOct + 1) * 12;

      // Add white keys for this octave
      WHITE_KEY_OFFSETS.forEach(wk => {
        whiteKeys.push({
          midi: octaveBaseMidi + wk.pitch,
          pitch: wk.pitch,
          octave: currentOct,
          anglo: wk.anglo,
          latin: wk.latin,
          isWhite: true,
          whiteIndex: currentWhiteIndex++,
        });
      });

      // Add black keys for this octave
      BLACK_KEY_OFFSETS.forEach(bk => {
        const whiteOffset = octIdx * 7;
        blackKeys.push({
          midi: octaveBaseMidi + bk.pitch,
          pitch: bk.pitch,
          octave: currentOct,
          anglo: bk.anglo,
          latin: bk.latin,
          isWhite: false,
          whiteIndexBefore: whiteOffset + bk.whiteIndexBefore,
        });
      });
    }

    return { whiteKeys, blackKeys, totalWhiteCount: whiteKeys.length };
  }, [baseOctave, numOctaves]);

  // Note triggering
  const handleNoteStart = useCallback((midi: number) => {
    pianoAudio.startNote(midi, 0.85);
    setPressedMidis(prev => new Set(prev).add(midi));
    setLastPlayedNote(midiToNoteInfo(midi));
  }, []);

  const handleNoteStop = useCallback((midi: number) => {
    if (!isSustainOn) {
      pianoAudio.stopNote(midi, false, false);
      setPressedMidis(prev => {
        const next = new Set(prev);
        next.delete(midi);
        return next;
      });
    }
  }, [isSustainOn]);

  // Play scale arpeggio
  const handlePlayScalePreview = useCallback(() => {
    if (selectedRoot === null) return;
    const scaleObj = SCALES.find(s => s.id === selectedScaleId) || SCALES[0];
    const baseMidi = (baseOctave + 1) * 12 + selectedRoot;
    const midisToPlay = scaleObj.intervals.map(int => baseMidi + int);
    
    if (scaleObj.intervals.length >= 7) {
      midisToPlay.push(baseMidi + 12);
    }
    pianoAudio.playSequence(midisToPlay, 220, 500);
  }, [selectedRoot, selectedScaleId, baseOctave]);

  // Readout text for chord/note
  const readoutText = useMemo(() => {
    if (pressedMidis.size > 0) {
      const arr: number[] = Array.from(pressedMidis);
      return detectChord(arr);
    }
    if (lastPlayedNote) {
      return `${lastPlayedNote.anglo} — ${lastPlayedNote.latin} • ${lastPlayedNote.freq} Hz`;
    }
    if (selectedRoot !== null) {
      const rAnglo = NOTE_NAMES_ANGLO[selectedRoot];
      const rLatin = NOTE_NAMES_LATIN[selectedRoot];
      const scaleObj = SCALES.find(s => s.id === selectedScaleId);
      return `Tonalité sélectionnée : ${rLatin} — ${rAnglo} — ${scaleObj?.name}`;
    }
    return 'Touchez les touches pour entendre les notes et accords';
  }, [pressedMidis, lastPlayedNote, selectedRoot, selectedScaleId]);

  if (!isPianoOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 w-screen h-[100dvh] bg-[#0E0E12] text-[#E0E0E0] flex flex-col select-none overflow-hidden touch-none animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label="Piano plein écran"
    >
      {/* 1. Header Toolbar */}
      <header className="shrink-0 px-3 py-2 sm:px-4 sm:py-2.5 bg-[#141418] border-b border-[#24242C] flex items-center justify-between gap-2 flex-wrap text-xs shadow-md z-30">
        {/* Left: Branding & Octave navigation */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 font-bold text-white tracking-wide">
            <div className="w-6 h-6 rounded-md bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Music className="w-3.5 h-3.5" />
            </div>
            <span className="hidden xs:inline text-xs sm:text-sm font-semibold">Piano</span>
          </div>

          {/* Octave Shift Controls */}
          <div className="flex items-center gap-1 bg-[#1A1A20] rounded-lg border border-[#2D2D36] p-0.5">
            <button
              onClick={() => setBaseOctave(prev => Math.max(1, prev - 1))}
              disabled={baseOctave <= 1}
              className="p-1 rounded text-gray-300 hover:text-white hover:bg-[#282832] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              title="Octave inférieure"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="px-2 font-mono text-[11px] sm:text-xs font-bold text-white whitespace-nowrap">
              {numOctaves === 1 ? `C${baseOctave}` : `C${baseOctave} - C${baseOctave + numOctaves - 1}`}
            </span>

            <button
              onClick={() => setBaseOctave(prev => Math.min(7 - numOctaves, prev + 1))}
              disabled={baseOctave >= (7 - numOctaves)}
              className="p-1 rounded text-gray-300 hover:text-white hover:bg-[#282832] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              title="Octave supérieure"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Octaves count selector: 1, 2, 3, 4 */}
          <div className="flex items-center bg-[#1A1A20] rounded-lg border border-[#2D2D36] p-0.5">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={`oct-btn-${n}`}
                onClick={() => {
                  setNumOctaves(n);
                  if (baseOctave + n > 7) {
                    setBaseOctave(Math.max(1, 8 - n));
                  }
                }}
                className={`px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold transition-colors cursor-pointer ${
                  numOctaves === n ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-400 hover:text-white'
                }`}
                title={`${n} octave${n > 1 ? 's' : ''}`}
              >
                {n} oct.
              </button>
            ))}
          </div>
        </div>

        {/* Right: Sound, Notes, Sustain, Theory, Close */}
        <div className="flex items-center gap-1.5 sm:gap-2 ml-auto flex-wrap">
          {/* Timbre selector */}
          <select
            value={timbre}
            onChange={(e) => setTimbre(e.target.value as TimbreType)}
            className="bg-[#1C1C22] border border-[#2E2E38] text-gray-300 text-[11px] rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500 cursor-pointer"
            title="Son du clavier"
          >
            <option value="acoustic">Piano acoustique</option>
            <option value="pure">Diapason pur</option>
          </select>

          {/* Labels toggle */}
          <button
            onClick={() => {
              setLabelMode(prev => prev === 'latin' ? 'anglo' : prev === 'anglo' ? 'none' : 'latin');
            }}
            className="px-2 py-1 rounded-lg bg-[#1C1C22] hover:bg-[#282832] text-gray-300 border border-[#2E2E38] text-[11px] font-medium transition-colors cursor-pointer"
            title="Basculer l'affichage des notes : Do, C ou Masqué"
          >
            {labelMode === 'latin' ? 'Do, Ré' : labelMode === 'anglo' ? 'C, D' : 'Sans notes'}
          </button>

          {/* Sustain toggle */}
          <button
            onClick={() => {
              setIsSustainOn(!isSustainOn);
              if (isSustainOn) {
                pianoAudio.stopAll();
                setPressedMidis(new Set());
              }
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
              isSustainOn
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-xs'
                : 'bg-[#1C1C22] hover:bg-[#282832] text-gray-400 border border-[#2E2E38]'
            }`}
            title="Pédale de sustain : maintenir la note"
          >
            <span>Sustain</span>
            {isSustainOn && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
          </button>

          {/* Tonality / Scale modal toggle */}
          <button
            onClick={() => setIsTheoryOpen(!isTheoryOpen)}
            className={`px-2 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer border ${
              isTheoryOpen || selectedRoot !== null
                ? 'bg-blue-600/20 text-blue-300 border-blue-500/40'
                : 'bg-[#1C1C22] text-gray-300 border-[#2E2E38] hover:bg-[#282832]'
            }`}
            title="Gammes et Tonalités"
          >
            <Sparkles className="w-3 h-3" />
            <span className="hidden sm:inline">Tonalités</span>
          </button>

          {/* Volume toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 rounded-lg bg-[#1C1C22] hover:bg-[#282832] text-gray-300 border border-[#2E2E38] text-[11px] transition-colors cursor-pointer"
            title={isMuted ? 'Rétablir le son' : 'Couper le son'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-blue-400" />}
          </button>

          {/* Close button */}
          <button
            onClick={() => setIsPianoOpen(false)}
            className="p-1.5 rounded-lg bg-[#202028] hover:bg-rose-950/40 text-gray-400 hover:text-rose-300 border border-[#353542] hover:border-rose-500/50 transition-colors cursor-pointer ml-1"
            title="Fermer le piano"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Drawer des tonalités et gammes si activé */}
      {isTheoryOpen && (
        <div className="shrink-0 p-3 sm:p-4 bg-[#14141A] border-b border-[#242430] flex flex-wrap items-center gap-3 animate-in slide-in-from-top-2 duration-150 z-20">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-semibold">Tonalité :</span>
            <div className="flex items-center gap-1 flex-wrap max-w-md">
              <button
                onClick={() => setSelectedRoot(null)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  selectedRoot === null ? 'bg-blue-600 text-white' : 'bg-[#1E1E26] text-gray-300 hover:bg-[#2A2A36]'
                }`}
              >
                Aucune
              </button>
              {TONALITIES.map(t => (
                <button
                  key={`tonal-${t.root}`}
                  onClick={() => setSelectedRoot(t.root)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                    selectedRoot === t.root ? 'bg-amber-500 text-black font-bold' : 'bg-[#1E1E26] text-gray-300 hover:bg-[#2A2A36]'
                  }`}
                >
                  {t.latin}
                </button>
              ))}
            </div>
          </div>

          {selectedRoot !== null && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400 font-semibold">Gamme :</span>
              <select
                value={selectedScaleId}
                onChange={(e) => setSelectedScaleId(e.target.value)}
                className="bg-[#1C1C24] border border-[#333342] text-xs text-white rounded px-2 py-1 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {SCALES.map(sc => (
                  <option key={sc.id} value={sc.id}>
                    {sc.name}
                  </option>
                ))}
              </select>

              <button
                onClick={handlePlayScalePreview}
                className="px-2.5 py-1 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                title="Écouter l'arpege"
              >
                <Sparkles className="w-3 h-3" />
                <span>Écouter</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. Readout & Info strip */}
      <div className="shrink-0 px-4 py-1.5 bg-[#0F0F13] border-b border-[#1C1C24] flex items-center justify-between text-xs text-gray-300 font-mono">
        <div className="flex items-center gap-2 truncate">
          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
          <span className="text-white font-medium truncate">{readoutText}</span>
        </div>

        {selectedRoot !== null && (
          <div className="hidden sm:flex items-center gap-3 text-[11px] text-gray-400">
            <span className="flex items-center gap-1 text-amber-300 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
              Fondamentale
            </span>
            <span className="flex items-center gap-1 text-blue-300 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
              Notes de la tonalité
            </span>
          </div>
        )}
      </div>

      {/* 4. Fullscreen Piano Keyboard Viewport */}
      <div className="flex-1 w-full h-full min-h-0 relative flex flex-col items-stretch justify-stretch p-1 sm:p-2 bg-[#09090B] overflow-hidden">
        <div className="relative w-full h-full select-none flex items-stretch">
          {/* White Keys Row (fills 100% of height) */}
          <div className="w-full h-full flex items-stretch">
            {keyboardKeys.whiteKeys.map((key) => {
              const isPressed = pressedMidis.has(key.midi);
              const isInTonality = tonalityNotes.pitchClasses.has(key.pitch);
              const isRoot = tonalityNotes.rootPitch === key.pitch;

              return (
                <div
                  key={key.midi}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    isPointerDownRef.current = true;
                    handleNoteStart(key.midi);
                  }}
                  onPointerUp={(e) => {
                    e.preventDefault();
                    handleNoteStop(key.midi);
                  }}
                  onPointerEnter={(e) => {
                    if (isPointerDownRef.current) {
                      e.preventDefault();
                      handleNoteStart(key.midi);
                    }
                  }}
                  onPointerLeave={(e) => {
                    if (isPointerDownRef.current) {
                      e.preventDefault();
                      handleNoteStop(key.midi);
                    }
                  }}
                  className={`flex-1 h-full border-r last:border-r-0 border-gray-400/40 rounded-b-md sm:rounded-b-xl flex flex-col justify-end items-center pb-3 sm:pb-5 transition-all cursor-pointer relative shadow-md active:scale-y-[0.99] origin-top select-none touch-none ${
                    isPressed
                      ? 'bg-blue-100 text-blue-900 border-blue-500 translate-y-0.5 shadow-inner'
                      : isInTonality
                        ? isRoot
                          ? 'bg-amber-50 text-amber-950 ring-2 ring-inset ring-amber-400 font-bold'
                          : 'bg-blue-50/95 text-blue-950 ring-1 ring-inset ring-blue-300'
                        : 'bg-gradient-to-b from-gray-100 via-white to-gray-50 text-gray-800 hover:from-white hover:to-gray-100'
                  }`}
                >
                  {/* Tonality / Scale dot indicator */}
                  {isInTonality && (
                    <div className="absolute top-2 sm:top-3 flex flex-col items-center">
                      <span className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${isRoot ? 'bg-amber-500 shadow-md ring-2 ring-amber-300' : 'bg-blue-500 shadow-sm'}`} />
                    </div>
                  )}

                  {/* Key Note Label */}
                  {labelMode !== 'none' && (
                    <div className="text-center pointer-events-none select-none">
                      <span className={`block font-bold text-xs sm:text-base leading-none ${isPressed ? 'text-blue-900' : isRoot ? 'text-amber-900 font-extrabold' : 'text-gray-900'}`}>
                        {labelMode === 'latin' ? key.latin : key.anglo}
                      </span>
                      <span className="text-[10px] sm:text-xs text-gray-500 font-mono leading-tight mt-0.5">
                        {key.octave}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Black Keys Layer (spans 62% height of the keyboard) */}
          {keyboardKeys.blackKeys.map((key) => {
            const isPressed = pressedMidis.has(key.midi);
            const isInTonality = tonalityNotes.pitchClasses.has(key.pitch);
            const isRoot = tonalityNotes.rootPitch === key.pitch;
            const totalWhite = keyboardKeys.totalWhiteCount;

            const leftPercent = ((key.whiteIndexBefore + 1) / totalWhite) * 100;
            const widthPercent = (1 / totalWhite) * 64;

            return (
              <div
                key={key.midi}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  isPointerDownRef.current = true;
                  handleNoteStart(key.midi);
                }}
                onPointerUp={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleNoteStop(key.midi);
                }}
                onPointerEnter={(e) => {
                  if (isPointerDownRef.current) {
                    e.stopPropagation();
                    e.preventDefault();
                    handleNoteStart(key.midi);
                  }
                }}
                onPointerLeave={(e) => {
                  if (isPointerDownRef.current) {
                    e.stopPropagation();
                    e.preventDefault();
                    handleNoteStop(key.midi);
                  }
                }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: `${leftPercent}%`,
                  width: `${widthPercent}%`,
                  height: '62%',
                  transform: 'translateX(-50%)',
                  zIndex: 20
                }}
                className={`rounded-b-md sm:rounded-b-lg flex flex-col justify-end items-center pb-2 sm:pb-3.5 transition-all cursor-pointer shadow-xl active:scale-y-[0.99] origin-top select-none touch-none ${
                  isPressed
                    ? 'bg-blue-600 text-white ring-2 ring-blue-300 translate-y-0.5 shadow-blue-500/30'
                    : isInTonality
                      ? isRoot
                        ? 'bg-amber-600 text-white ring-2 ring-amber-300 font-bold'
                        : 'bg-[#26283C] text-blue-200 ring-1 ring-blue-400'
                      : 'bg-gradient-to-b from-[#101014] to-[#1E1E24] hover:to-[#2A2A32] text-gray-300 border-x border-b border-black'
                }`}
              >
                {/* Tonality indicator for black key */}
                {isInTonality && (
                  <div className="absolute top-2 flex flex-col items-center">
                    <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${isRoot ? 'bg-amber-300 shadow-md ring-1 ring-white' : 'bg-blue-400'}`} />
                  </div>
                )}

                {/* Black key label */}
                {labelMode !== 'none' && (
                  <span className="text-[10px] sm:text-xs font-bold tracking-tight pointer-events-none select-none">
                    {labelMode === 'latin' ? key.latin : key.anglo}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
