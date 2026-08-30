import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  X, 
  Volume2, 
  ChevronLeft, 
  ChevronRight
} from 'lucide-react';
import { 
  getChordData, 
  chordSynth, 
  GuitarVoicing, 
  PianoVoicing,
  getNotePitchClass
} from '../utils/chordDictionary';
import { LATIN_NOTES } from '../utils/chordUtils';
import { NotationSystem } from '../types';

interface ChordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialChord?: string;
  songChords?: string[];
  notation?: NotationSystem;
  onSelectChord?: (chord: string) => void;
}

const STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'e'];

// White keys notes for 2-octave piano keyboard (C3 to B4)
const PIANO_WHITE_KEYS = [
  { note: 'C', offset: 0 },
  { note: 'D', offset: 2 },
  { note: 'E', offset: 4 },
  { note: 'F', offset: 5 },
  { note: 'G', offset: 7 },
  { note: 'A', offset: 9 },
  { note: 'B', offset: 11 },
  { note: 'C', offset: 12 },
  { note: 'D', offset: 14 },
  { note: 'E', offset: 16 },
  { note: 'F', offset: 17 },
  { note: 'G', offset: 19 },
  { note: 'A', offset: 21 },
  { note: 'B', offset: 23 },
];

const PIANO_BLACK_KEYS = [
  { note: 'C#', offset: 1, leftRatio: 1 / 14 },
  { note: 'D#', offset: 3, leftRatio: 2 / 14 },
  { note: 'F#', offset: 6, leftRatio: 4 / 14 },
  { note: 'G#', offset: 8, leftRatio: 5 / 14 },
  { note: 'A#', offset: 10, leftRatio: 6 / 14 },
  { note: 'C#', offset: 13, leftRatio: 8 / 14 },
  { note: 'D#', offset: 15, leftRatio: 9 / 14 },
  { note: 'F#', offset: 18, leftRatio: 11 / 14 },
  { note: 'G#', offset: 20, leftRatio: 12 / 14 },
  { note: 'A#', offset: 22, leftRatio: 13 / 14 },
];

export const ChordModal: React.FC<ChordModalProps> = ({
  isOpen,
  onClose,
  initialChord = 'C',
  notation = 'standard'
}) => {
  const [currentChordStr, setCurrentChordStr] = useState<string>(initialChord || 'C');
  const [instrument, setInstrument] = useState<'guitar' | 'piano'>('guitar');
  const [guitarVoicingIndex, setGuitarVoicingIndex] = useState<number>(0);
  const [pianoVoicingIndex, setPianoVoicingIndex] = useState<number>(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  useEffect(() => {
    if (initialChord) {
      setCurrentChordStr(initialChord);
      setGuitarVoicingIndex(0);
      setPianoVoicingIndex(0);
    }
  }, [initialChord, isOpen]);

  const chordData = useMemo(() => {
    return getChordData(currentChordStr);
  }, [currentChordStr]);

  const activeGuitarVoicing: GuitarVoicing = useMemo(() => {
    const voicings = chordData.guitarVoicings;
    if (!voicings || voicings.length === 0) {
      return { frets: [-1, -1, -1, -1, -1, -1], baseFret: 1, positionName: 'Standard' };
    }
    const idx = Math.min(Math.max(0, guitarVoicingIndex), voicings.length - 1);
    return voicings[idx];
  }, [chordData.guitarVoicings, guitarVoicingIndex]);

  const activePianoVoicing: PianoVoicing = useMemo(() => {
    const voicings = chordData.pianoVoicings;
    if (!voicings || voicings.length === 0) {
      return { keys: [0, 4, 7], rootKey: 0, notes: ['C', 'E', 'G'], inversion: 0, inversionName: 'Fondamentale' };
    }
    const idx = Math.min(Math.max(0, pianoVoicingIndex), voicings.length - 1);
    return voicings[idx];
  }, [chordData.pianoVoicings, pianoVoicingIndex]);

  const handlePlaySound = useCallback(() => {
    setIsPlayingAudio(true);
    if (instrument === 'guitar') {
      chordSynth.playGuitar(activeGuitarVoicing, getNotePitchClass(chordData.root));
    } else {
      chordSynth.playPiano(activePianoVoicing.keys, activePianoVoicing.rootKey);
    }
    setTimeout(() => {
      setIsPlayingAudio(false);
    }, 1200);
  }, [instrument, activeGuitarVoicing, activePianoVoicing, chordData.root]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === ' ' && !['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        handlePlaySound();
      } else if (e.key === 'ArrowLeft' && instrument === 'guitar') {
        setGuitarVoicingIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight' && instrument === 'guitar') {
        setGuitarVoicingIndex(prev => Math.min(chordData.guitarVoicings.length - 1, prev + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handlePlaySound, instrument, chordData.guitarVoicings.length]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs select-none animate-fade-in">
      <div 
        className="fixed inset-0" 
        onClick={onClose} 
      />

      <div className="relative w-full max-w-sm flex flex-col bg-[#121215] border border-[#26262B] rounded-2xl shadow-2xl overflow-hidden z-10 text-gray-200">
        
        {/* Minimalist Top Header: Chord Name, Sound & Close Button */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#202025] bg-[#17171B]">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black font-mono text-white tracking-tight">
              {chordData.formattedName}
            </span>
            {notation === 'latin' && chordData.latinName && (
              <span className="text-xs font-semibold text-blue-400">
                {chordData.latinName}
              </span>
            )}
            <button
              type="button"
              onClick={handlePlaySound}
              className={`p-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 transition-all cursor-pointer ${
                isPlayingAudio ? 'scale-110 text-emerald-300 bg-emerald-950/60' : ''
              }`}
              title="Écouter l'accord"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-[#202025] hover:bg-[#2C2C33] text-gray-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Minimalist Instrument Switcher directly on top of the diagram */}
        <div className="px-4 pt-3 pb-1 flex items-center justify-center">
          <div className="inline-flex items-center p-1 rounded-xl bg-[#0B0B0D] border border-[#222227] shadow-inner">
            <button
              type="button"
              onClick={() => setInstrument('guitar')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                instrument === 'guitar'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <span>🎸 Guitare</span>
            </button>
            <button
              type="button"
              onClick={() => setInstrument('piano')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                instrument === 'piano'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <span>🎹 Piano</span>
            </button>
          </div>
        </div>

        {/* Diagram Area */}
        <div className="p-4 flex flex-col items-center">
          {instrument === 'guitar' ? (
            <div className="flex flex-col items-center w-full">
              {/* Position selector if multiple positions exist */}
              {chordData.guitarVoicings.length > 1 && (
                <div className="flex items-center justify-between w-full px-2 mb-2">
                  <span className="text-[11px] font-mono text-gray-400">
                    Position {guitarVoicingIndex + 1} / {chordData.guitarVoicings.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={guitarVoicingIndex === 0}
                      onClick={() => setGuitarVoicingIndex(prev => Math.max(0, prev - 1))}
                      className="p-1 rounded bg-[#1C1C22] hover:bg-[#2A2A32] text-gray-300 disabled:opacity-25 transition-colors cursor-pointer"
                      title="Position précédente"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={guitarVoicingIndex === chordData.guitarVoicings.length - 1}
                      onClick={() => setGuitarVoicingIndex(prev => Math.min(chordData.guitarVoicings.length - 1, prev + 1))}
                      className="p-1 rounded bg-[#1C1C22] hover:bg-[#2A2A32] text-gray-300 disabled:opacity-25 transition-colors cursor-pointer"
                      title="Position suivante"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Guitar SVG Diagram */}
              <div className="p-3 bg-[#0A0A0C] border border-[#1E1E23] rounded-xl flex items-center justify-center shadow-inner">
                <GuitarDiagram voicing={activeGuitarVoicing} rootNote={chordData.root} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center w-full">
              {/* Inversion selector if multiple inversions exist */}
              {chordData.pianoVoicings.length > 1 && (
                <div className="flex items-center justify-center gap-1 mb-2.5">
                  {chordData.pianoVoicings.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPianoVoicingIndex(idx)}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                        pianoVoicingIndex === idx
                          ? 'bg-cyan-600 text-white'
                          : 'bg-[#1C1C22] text-gray-400 hover:text-white'
                      }`}
                    >
                      {idx === 0 ? 'Fondamentale' : `Renv. ${idx}`}
                    </button>
                  ))}
                </div>
              )}

              {/* Piano SVG Keyboard */}
              <div className="p-3 bg-[#0A0A0C] border border-[#1E1E23] rounded-xl flex items-center justify-center w-full shadow-inner">
                <PianoDiagram voicing={activePianoVoicing} notation={notation} />
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

// SVG Guitar Diagram Component
interface GuitarDiagramProps {
  voicing: GuitarVoicing;
  rootNote: string;
}

const GuitarDiagram: React.FC<GuitarDiagramProps> = ({ voicing }) => {
  const width = 210;
  const height = 240;
  const numFrets = 5;
  const numStrings = 6;

  const marginX = 36;
  const marginTop = 40;
  const gridWidth = 138;
  const gridHeight = 155;

  const stringSpacing = gridWidth / (numStrings - 1);
  const fretSpacing = gridHeight / numFrets;

  const isNut = voicing.baseFret === 1;

  return (
    <svg 
      width={width} 
      height={height} 
      viewBox={`0 0 ${width} ${height}`} 
      className="drop-shadow-md select-none"
    >
      {/* Starting Fret Indicator on left if not open */}
      {!isNut && (
        <text
          x={marginX - 10}
          y={marginTop + fretSpacing * 0.7}
          fill="#F59E0B"
          fontSize="11"
          fontWeight="bold"
          fontFamily="monospace"
          textAnchor="end"
        >
          {voicing.baseFret}fr
        </text>
      )}

      {/* String Status Markers (Top X and O) */}
      {voicing.frets.map((fret, stringIdx) => {
        const x = marginX + stringIdx * stringSpacing;
        const y = marginTop - 12;

        if (fret === -1) {
          return (
            <text
              key={stringIdx}
              x={x}
              y={y}
              fill="#EF4444"
              fontSize="12"
              fontWeight="bold"
              fontFamily="sans-serif"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              ✕
            </text>
          );
        } else if (fret === 0) {
          return (
            <circle
              key={stringIdx}
              cx={x}
              cy={y}
              r="4"
              fill="none"
              stroke="#10B981"
              strokeWidth="1.8"
            />
          );
        }
        return null;
      })}

      {/* Fret Grid Background */}
      <rect
        x={marginX}
        y={marginTop}
        width={gridWidth}
        height={gridHeight}
        fill="#161619"
        stroke="#2E2E36"
        strokeWidth="1.2"
        rx="2"
      />

      {/* Nut (Thick Bar if open position) */}
      {isNut ? (
        <rect
          x={marginX - 1}
          y={marginTop - 3}
          width={gridWidth + 2}
          height={5}
          fill="#D1D5DB"
          rx="1"
        />
      ) : (
        <line
          x1={marginX}
          y1={marginTop}
          x2={marginX + gridWidth}
          y2={marginTop}
          stroke="#4B5563"
          strokeWidth="1.5"
        />
      )}

      {/* Horizontal Frets Lines */}
      {Array.from({ length: numFrets }).map((_, fIdx) => {
        const y = marginTop + (fIdx + 1) * fretSpacing;
        return (
          <line
            key={fIdx}
            x1={marginX}
            y1={y}
            x2={marginX + gridWidth}
            y2={y}
            stroke="#374151"
            strokeWidth="1.2"
          />
        );
      })}

      {/* Vertical Strings Lines */}
      {Array.from({ length: numStrings }).map((_, sIdx) => {
        const x = marginX + sIdx * stringSpacing;
        const strokeWidth = 2.0 - sIdx * 0.22;
        return (
          <line
            key={sIdx}
            x1={x}
            y1={marginTop}
            x2={x}
            y2={marginTop + gridHeight}
            stroke="#9CA3AF"
            strokeWidth={strokeWidth}
          />
        );
      })}

      {/* Barre Chords rendering */}
      {voicing.barres && voicing.barres.map((barre, bIdx) => {
        const leftStringIdx = 6 - barre.fromString;
        const rightStringIdx = 6 - barre.toString;
        const minIdx = Math.min(leftStringIdx, rightStringIdx);
        const maxIdx = Math.max(leftStringIdx, rightStringIdx);

        const x1 = marginX + minIdx * stringSpacing;
        const x2 = marginX + maxIdx * stringSpacing;
        
        const relFret = barre.fret - (voicing.baseFret - 1);
        if (relFret < 1 || relFret > numFrets) return null;

        const y = marginTop + (relFret - 0.5) * fretSpacing;

        return (
          <g key={bIdx}>
            <rect
              x={x1 - 5}
              y={y - 7}
              width={x2 - x1 + 10}
              height={14}
              rx="7"
              fill="#2563EB"
              fillOpacity="0.9"
              stroke="#60A5FA"
              strokeWidth="1.2"
            />
            <text
              x={(x1 + x2) / 2}
              y={y}
              fill="#FFFFFF"
              fontSize="9"
              fontWeight="bold"
              fontFamily="sans-serif"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              1
            </text>
          </g>
        );
      })}

      {/* Fingered Dots */}
      {voicing.frets.map((fret, stringIdx) => {
        if (fret <= 0) return null;

        const relFret = fret - (voicing.baseFret - 1);
        if (relFret < 1 || relFret > numFrets) return null;

        const x = marginX + stringIdx * stringSpacing;
        const y = marginTop + (relFret - 0.5) * fretSpacing;
        const finger = voicing.fingers ? voicing.fingers[stringIdx] : '';

        const isBarred = voicing.barres?.some(b => b.fret === fret);
        if (isBarred && finger === '1') {
          return null;
        }

        return (
          <g key={stringIdx}>
            <circle
              cx={x}
              cy={y}
              r="8"
              fill="#2563EB"
              stroke="#60A5FA"
              strokeWidth="1.2"
            />
            {finger && (
              <text
                x={x}
                y={y}
                fill="#FFFFFF"
                fontSize="10"
                fontWeight="bold"
                fontFamily="sans-serif"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {finger}
              </text>
            )}
          </g>
        );
      })}

      {/* String Names at Bottom */}
      {STRING_NAMES.map((name, sIdx) => {
        const x = marginX + sIdx * stringSpacing;
        const y = marginTop + gridHeight + 14;
        return (
          <text
            key={sIdx}
            x={x}
            y={y}
            fill="#6B7280"
            fontSize="9"
            fontWeight="600"
            fontFamily="monospace"
            textAnchor="middle"
          >
            {name}
          </text>
        );
      })}
    </svg>
  );
};

// SVG Piano Diagram Component
interface PianoDiagramProps {
  voicing: PianoVoicing;
  notation?: NotationSystem;
}

const PianoDiagram: React.FC<PianoDiagramProps> = ({ voicing, notation = 'standard' }) => {
  const width = 340;
  const height = 120;
  
  const whiteKeyWidth = width / 14;
  const whiteKeyHeight = 112;
  const blackKeyWidth = whiteKeyWidth * 0.62;
  const blackKeyHeight = whiteKeyHeight * 0.62;

  return (
    <svg 
      width="100%" 
      height="100%" 
      viewBox={`0 0 ${width} ${height}`} 
      className="drop-shadow-lg select-none"
    >
      {/* Piano Base Border */}
      <rect
        x="0"
        y="0"
        width={width}
        height={whiteKeyHeight}
        fill="#09090B"
        rx="5"
      />

      {/* 1. White Keys */}
      {PIANO_WHITE_KEYS.map((wk, idx) => {
        const isPressed = voicing.keys.includes(wk.offset);
        const isRoot = voicing.rootKey === wk.offset;
        const isBass = voicing.bassKey === wk.offset;

        const x = idx * whiteKeyWidth;

        let fill = '#F3F4F6';
        let stroke = '#D1D5DB';

        if (isPressed) {
          if (isRoot) {
            fill = '#F59E0B';
            stroke = '#FBBF24';
          } else if (isBass) {
            fill = '#A855F7';
            stroke = '#C084FC';
          } else {
            fill = '#06B6D4';
            stroke = '#22D3EE';
          }
        }

        return (
          <g key={idx}>
            <rect
              x={x + 1}
              y={2}
              width={whiteKeyWidth - 2}
              height={whiteKeyHeight - 4}
              rx="2.5"
              fill={fill}
              stroke={stroke}
              strokeWidth="1"
            />
            {isPressed && (
              <text
                x={x + whiteKeyWidth / 2}
                y={whiteKeyHeight - 10}
                fill={isRoot || isPressed ? '#09090B' : '#6B7280'}
                fontSize="9.5"
                fontWeight="bold"
                fontFamily="sans-serif"
                textAnchor="middle"
              >
                {notation === 'latin' ? (LATIN_NOTES[wk.note] || wk.note) : wk.note}
              </text>
            )}
          </g>
        );
      })}

      {/* 2. Black Keys */}
      {PIANO_BLACK_KEYS.map((bk, idx) => {
        const isPressed = voicing.keys.includes(bk.offset);
        const isRoot = voicing.rootKey === bk.offset;
        const isBass = voicing.bassKey === bk.offset;

        const x = bk.leftRatio * width - blackKeyWidth / 2;

        let fill = '#1F2937';
        let stroke = '#111827';

        if (isPressed) {
          if (isRoot) {
            fill = '#D97706';
            stroke = '#F59E0B';
          } else if (isBass) {
            fill = '#9333EA';
            stroke = '#A855F7';
          } else {
            fill = '#0891B2';
            stroke = '#06B6D4';
          }
        }

        return (
          <g key={idx}>
            <rect
              x={x}
              y={2}
              width={blackKeyWidth}
              height={blackKeyHeight}
              rx="1.5"
              fill={fill}
              stroke={stroke}
              strokeWidth="1.2"
            />
            {isPressed && (
              <>
                <circle
                  cx={x + blackKeyWidth / 2}
                  cy={blackKeyHeight - 12}
                  r="3.5"
                  fill="#FFFFFF"
                />
                <text
                  x={x + blackKeyWidth / 2}
                  y={blackKeyHeight - 18}
                  fill="#FFFFFF"
                  fontSize="8"
                  fontWeight="bold"
                  fontFamily="sans-serif"
                  textAnchor="middle"
                >
                  {notation === 'latin' ? (LATIN_NOTES[bk.note] || bk.note) : bk.note}
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
};
