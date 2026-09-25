import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight 
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

  // Window state
  const [numOctaves, setNumOctaves] = useState<1 | 2>(window.innerWidth < 640 ? 1 : 2);
  const [baseOctave, setBaseOctave] = useState<number>(4); // C4 is middle C (MIDI 60)

  // Audio settings
  const [volume, setVolume] = useState<number>(0.75);
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

  // Auto adapt numOctaves on screen resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 600 && numOctaves === 2) {
        setNumOctaves(1);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [numOctaves]);

  // Sync audio engine volume & timbre
  useEffect(() => {
    pianoAudio.setVolume(volume);
    pianoAudio.setMuted(false);
    pianoAudio.setTimbre(timbre);
  }, [volume, timbre]);

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

    // Keyboard mapping for Octave 4:
    // White: A(C), S(D), D(E), F(F), G(G), H(A), J(B), K(C5)
    // Black: W(C#), E(D#), T(F#), Y(G#), U(A#)
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
    
    // Add octave root at end if it's a 7-note scale
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
      return `${lastPlayedNote.anglo} (${lastPlayedNote.latin}) • ${lastPlayedNote.freq} Hz`;
    }
    if (selectedRoot !== null) {
      const rAnglo = NOTE_NAMES_ANGLO[selectedRoot];
      const rLatin = NOTE_NAMES_LATIN[selectedRoot];
      const scaleObj = SCALES.find(s => s.id === selectedScaleId);
      return `Tonalité sélectionnée : ${rLatin} (${rAnglo}) — ${scaleObj?.name}`;
    }
    return 'Touchez les touches pour entendre les notes et accords';
  }, [pressedMidis, lastPlayedNote, selectedRoot, selectedScaleId]);

  if (!isPianoOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setIsPianoOpen(false);
        }
      }}
    >
      <div 
        className="w-full sm:max-w-2xl bg-[#141416] border border-[#2B2B30] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[#E0E0E0] animate-in slide-in-from-bottom-6 sm:fade-in duration-200"
        role="dialog"
        aria-modal="true"
        aria-label="Mini Piano"
      >
        {/* Unified Header & Controls Toolbar */}
        <div className="px-3.5 py-2 bg-[#18181B] border-b border-[#26262B] flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Octave Controls */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-gray-400 font-medium">Octave :</span>
            <div className="flex items-center bg-[#1A1A1E] rounded-md border border-[#2D2D33] p-0.5">
              <button
                onClick={() => setBaseOctave(prev => Math.max(1, prev - 1))}
                disabled={baseOctave <= 1}
                className="p-1 rounded text-gray-300 hover:text-white hover:bg-[#25252B] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Octave inférieure (-1)"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <span className="px-2 font-mono text-[11px] font-semibold text-white">
                {numOctaves === 1 ? `C${baseOctave}` : `C${baseOctave} - C${baseOctave + 1}`}
              </span>

              <button
                onClick={() => setBaseOctave(prev => Math.min(6, prev + 1))}
                disabled={baseOctave >= 6}
                className="p-1 rounded text-gray-300 hover:text-white hover:bg-[#25252B] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Octave supérieure (+1)"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick 1 vs 2 octaves toggle */}
            <div className="hidden sm:flex items-center bg-[#1A1A1E] rounded-md border border-[#2D2D33] p-0.5 ml-0.5">
              <button
                onClick={() => setNumOctaves(1)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                  numOctaves === 1 ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                1 oct.
              </button>
              <button
                onClick={() => setNumOctaves(2)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                  numOctaves === 2 ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                2 oct.
              </button>
            </div>
          </div>

          {/* Sound Timbre, Labels, Sustain & Close */}
          <div className="flex items-center gap-1.5 ml-auto">
            {/* Timbre selector */}
            <select
              value={timbre}
              onChange={(e) => setTimbre(e.target.value as TimbreType)}
              className="bg-[#1C1C20] border border-[#2E2E34] text-gray-300 text-[11px] rounded px-1.5 py-1 focus:outline-none focus:border-blue-500 cursor-pointer"
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
              className="px-2 py-1 rounded bg-[#1C1C20] hover:bg-[#26262B] text-gray-300 border border-[#2E2E34] text-[11px] font-medium transition-colors cursor-pointer"
              title="Basculer l'affichage des notes (Do / C / Masqué)"
            >
              {labelMode === 'latin' ? 'Do, Ré' : labelMode === 'anglo' ? 'C, D' : 'Notes: off'}
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
              className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                isSustainOn
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                  : 'bg-[#1F1F24] hover:bg-[#28282F] text-gray-400 border border-[#333]'
              }`}
              title="Tenir la note (Pédale de sustain)"
            >
              <span>Sustain</span>
              {isSustainOn && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
            </button>

            {/* Close button */}
            <button
              onClick={() => setIsPianoOpen(false)}
              className="p-1.5 rounded-md bg-[#1F1F24] hover:bg-rose-900/30 text-gray-400 hover:text-rose-300 border border-[#333] hover:border-rose-500/40 transition-colors cursor-pointer ml-0.5"
              title="Fermer le piano"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* PIANO KEYBOARD VIEWPORT */}
        <div className="p-3 sm:p-4 bg-[#0D0D0E] flex flex-col items-center justify-center overflow-x-auto touch-pan-x">
          <div 
            className="relative select-none"
            style={{ 
              width: '100%', 
              maxWidth: numOctaves === 2 ? '620px' : '360px',
              height: '160px',
              minWidth: numOctaves === 2 ? '500px' : '280px'
            }}
          >
            {/* White Keys Row */}
            <div className="absolute inset-0 flex">
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
                    className={`flex-1 h-full border border-gray-400/30 rounded-b-md flex flex-col justify-end items-center pb-2 transition-all cursor-pointer relative shadow-md active:scale-y-[0.99] origin-top ${
                      isPressed
                        ? 'bg-blue-100 text-blue-900 border-blue-400 translate-y-0.5 shadow-inner'
                        : isInTonality
                          ? isRoot
                            ? 'bg-amber-50 text-amber-950 ring-2 ring-inset ring-amber-400 font-bold'
                            : 'bg-blue-50/95 text-blue-950 ring-1 ring-inset ring-blue-300'
                          : 'bg-white text-gray-800 hover:bg-gray-100'
                    }`}
                  >
                    {/* Tonality / Scale dot indicator */}
                    {isInTonality && (
                      <div className="absolute top-2 flex flex-col items-center">
                        <span className={`w-2 h-2 rounded-full ${isRoot ? 'bg-amber-500 shadow-sm' : 'bg-blue-500'}`} />
                      </div>
                    )}

                    {/* Key Note Label */}
                    {labelMode !== 'none' && (
                      <div className="text-center pointer-events-none select-none">
                        <span className={`block font-bold text-xs leading-none ${isPressed ? 'text-blue-800' : isRoot ? 'text-amber-800' : 'text-gray-900'}`}>
                          {labelMode === 'latin' ? key.latin : key.anglo}
                        </span>
                        <span className="text-[9px] text-gray-500 font-mono leading-tight">
                          {key.octave}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Black Keys Layer */}
            {keyboardKeys.blackKeys.map((key) => {
              const isPressed = pressedMidis.has(key.midi);
              const isInTonality = tonalityNotes.pitchClasses.has(key.pitch);
              const isRoot = tonalityNotes.rootPitch === key.pitch;
              const totalWhite = keyboardKeys.totalWhiteCount;

              // Compute horizontal position centered between adjacent white keys
              // Offset is (whiteIndexBefore + 1) / totalWhite
              const leftPercent = ((key.whiteIndexBefore + 1) / totalWhite) * 100;
              const widthPercent = (1 / totalWhite) * 62; // roughly 60% of a white key width

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
                  className={`rounded-b flex flex-col justify-end items-center pb-1.5 transition-all cursor-pointer shadow-lg active:scale-y-[0.99] origin-top ${
                    isPressed
                      ? 'bg-blue-600 text-white ring-2 ring-blue-300 translate-y-0.5'
                      : isInTonality
                        ? isRoot
                          ? 'bg-amber-600 text-white ring-2 ring-amber-300 font-bold'
                          : 'bg-[#2A2B3D] text-blue-200 ring-1 ring-blue-400'
                        : 'bg-[#1C1C1E] hover:bg-[#28282B] text-gray-300 border-x border-b border-[#0A0A0B]'
                  }`}
                >
                  {/* Tonality indicator for black key */}
                  {isInTonality && (
                    <div className="absolute top-1.5 flex flex-col items-center">
                      <span className={`w-1.5 h-1.5 rounded-full ${isRoot ? 'bg-amber-300 shadow-sm' : 'bg-blue-400'}`} />
                    </div>
                  )}

                  {/* Black key label */}
                  {labelMode !== 'none' && (
                    <span className="text-[9px] font-bold tracking-tighter pointer-events-none select-none">
                      {labelMode === 'latin' ? key.latin : key.anglo}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick instructions / Legend footer */}
          <div className="mt-3 w-full flex items-center justify-between text-[10px] text-gray-500 px-1">
            <span className="sm:hidden">
              Glissez le doigt pour parcourir les touches
            </span>
            {selectedRoot !== null && (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-amber-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span>
                  Fondamentale
                </span>
                <span className="flex items-center gap-1 text-blue-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block"></span>
                  Notes de la tonalité
                </span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
