import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Song } from '../types';
import { 
  parseChordPro, 
  transposeChord, 
  metronome 
} from '../utils/chordUtils';
import { getSectionColor } from '../utils/displayDefaults';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronLeft, 
  Maximize2, 
  Minimize2, 
  Eye, 
  EyeOff, 
  Type, 
  Columns, 
  Gauge, 
  Volume2, 
  VolumeX, 
  Printer, 
  Settings2, 
  Music, 
  FileEdit,
  ArrowUp,
  Sliders,
  Sparkles
} from 'lucide-react';

interface SongReaderProps {
  song?: Song | null;
  onBack?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  setlistContextName?: string;
  setlistPosition?: { current: number; total: number };
}

export const SongReader: React.FC<SongReaderProps> = ({
  song: propSong,
  onBack,
  onNext,
  onPrev,
  hasNext,
  hasPrev,
  setlistContextName,
  setlistPosition
}) => {
  const { 
    selectedSong, 
    stageSettings, 
    updateStageSettings, 
    displaySettings,
    setActiveTab, 
    currentUser 
  } = useApp();

  const song = propSong || selectedSong;

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [isMetronomeActive, setIsMetronomeActive] = useState(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollAnimRef = useRef<number | null>(null);
  const lastScrollTimeRef = useRef<number>(performance.now());

  // Parse ChordPro
  const parsedData = useMemo(() => {
    if (!song) return null;
    return parseChordPro(song.contentChordPro);
  }, [song?.contentChordPro]);

  // Transposed Key string
  const currentKeyDisplay = useMemo(() => {
    if (!parsedData) return '';
    const baseKey = song?.key || parsedData.key || 'C';
    if (stageSettings.transposeOffset === 0) {
      return baseKey;
    }
    return transposeChord(baseKey, stageSettings.transposeOffset, stageSettings.notation);
  }, [parsedData, song?.key, stageSettings.transposeOffset, stageSettings.notation]);

  // Metronome Sound / Visual Pulse
  useEffect(() => {
    if (isMetronomeActive && song) {
      const bpm = song.tempo || parsedData?.tempo || 120;
      metronome.start(bpm, 4, (beat) => {
        setCurrentBeat(beat);
      });
    } else {
      metronome.stop();
    }

    return () => {
      metronome.stop();
    };
  }, [isMetronomeActive, song?.tempo, parsedData?.tempo]);

  // Auto-Scroll Loop
  useEffect(() => {
    if (!stageSettings.isAutoScrolling) {
      if (scrollAnimRef.current) {
        cancelAnimationFrame(scrollAnimRef.current);
        scrollAnimRef.current = null;
      }
      return;
    }

    lastScrollTimeRef.current = performance.now();

    const scrollStep = (time: number) => {
      const delta = (time - lastScrollTimeRef.current) / 1000;
      lastScrollTimeRef.current = time;

      if (containerRef.current) {
        // Calculate speed in px per second based on speed 1..10
        // speed 1 = 15px/s, speed 5 = 45px/s, speed 10 = 100px/s
        const pxPerSecond = stageSettings.autoScrollSpeed * 10 + 5;
        containerRef.current.scrollTop += pxPerSecond * delta;

        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        const progress = Math.min(100, Math.round((scrollTop / (scrollHeight - clientHeight)) * 100)) || 0;
        setScrollProgress(progress);

        // Check if reached bottom
        if (scrollTop + clientHeight >= scrollHeight - 2) {
          updateStageSettings({ isAutoScrolling: false });
          return;
        }
      }

      scrollAnimRef.current = requestAnimationFrame(scrollStep);
    };

    scrollAnimRef.current = requestAnimationFrame(scrollStep);

    return () => {
      if (scrollAnimRef.current) {
        cancelAnimationFrame(scrollAnimRef.current);
        scrollAnimRef.current = null;
      }
    };
  }, [stageSettings.isAutoScrolling, stageSettings.autoScrollSpeed, updateStageSettings]);

  // Manual scroll progress tracker
  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const progress = Math.min(100, Math.round((scrollTop / (scrollHeight - clientHeight)) * 100)) || 0;
      setScrollProgress(progress);
    }
  };

  // Keyboard Shortcuts (Space, Up/Down, Left/Right, Page Turner pedals)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        updateStageSettings({ isAutoScrolling: !stageSettings.isAutoScrolling });
      } else if (e.key === 'PageDown' || e.key === 'ArrowRight') {
        if (onNext) {
          e.preventDefault();
          onNext();
        }
      } else if (e.key === 'PageUp' || e.key === 'ArrowLeft') {
        if (onPrev) {
          e.preventDefault();
          onPrev();
        }
      } else if (e.key === 't' || e.key === 'T') {
        // Quick toggle transpose
        updateStageSettings({ transposeOffset: (stageSettings.transposeOffset + 1) % 12 });
      } else if (e.key === 'm' || e.key === 'M') {
        // Toggle chords
        updateStageSettings({ showChords: !stageSettings.showChords });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stageSettings.isAutoScrolling, stageSettings.transposeOffset, stageSettings.showChords, updateStageSettings, onNext, onPrev]);

  // Fullscreen Handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  if (!song || !parsedData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-slate-400">
        <Music className="w-16 h-16 mx-auto mb-4 text-slate-600" />
        <h2 className="text-xl font-bold text-slate-200">Aucun chant sélectionné</h2>
        <p className="text-xs text-slate-500 mt-2 mb-6">
          Sélectionnez un chant dans le répertoire pour l'afficher en mode scène.
        </p>
        <button
          onClick={() => setActiveTab('repertoire')}
          className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-lg transition-all"
        >
          Parcourir le répertoire
        </button>
      </div>
    );
  }

  // Theme backgrounds
  const themeClasses = {
    dark: 'bg-[#0A0A0B] text-[#E0E0E0]',
    oled: 'bg-black text-[#E0E0E0]',
    sepia: 'bg-[#1C1814] text-[#F3EAD8]',
    light: 'bg-[#F4F4F5] text-[#111112]'
  }[stageSettings.theme];

  return (
    <div className={`fixed inset-0 top-16 md:top-16 z-30 flex flex-col ${themeClasses} select-none transition-colors`}>
      
      {/* Top Floating Stage Control Header */}
      <div className="no-print bg-[#111112]/95 backdrop-blur-md border-b border-[#222224] px-2 sm:px-6 py-1.5 sm:py-2 flex items-center justify-between gap-1.5 sm:gap-2 shadow-sm overflow-x-auto scrollbar-none">
        
        {/* Left: Back & Song Info (Title & Metadata hidden on mobile) */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button
            onClick={onBack || (() => setActiveTab('repertoire'))}
            className="p-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-300 hover:text-white border border-[#333] transition-colors"
            title="Retour"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Position indicator in setlist (compact on mobile) */}
          {setlistPosition && (
            <span className="md:hidden px-1.5 py-0.5 rounded bg-[#1C1C1E] border border-[#333] text-blue-400 text-[10px] font-bold">
              {setlistPosition.current}/{setlistPosition.total}
            </span>
          )}

          {/* Title & Metadata (Desktop / Tablet only, hidden on mobile for space optimization) */}
          <div className="hidden md:block">
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-sm font-bold text-white tracking-tight truncate max-w-[180px] sm:max-w-[280px]">
                {parsedData.title || song.title}
              </h1>
              {setlistPosition && (
                <span className="px-1.5 py-0.5 rounded bg-[#1C1C1E] border border-[#333] text-blue-400 text-[10px] font-bold">
                  {setlistPosition.current}/{setlistPosition.total}
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-400 truncate max-w-[200px] sm:max-w-[300px]">
              {parsedData.artist || song.artist || 'Auteur'} • Tonalité: <strong className="text-blue-400 font-bold">{currentKeyDisplay}</strong>
              {stageSettings.transposeOffset !== 0 && (
                <span className="ml-1 text-[10px] text-gray-400 font-medium">
                  ({stageSettings.transposeOffset > 0 ? `+${stageSettings.transposeOffset}` : stageSettings.transposeOffset})
                </span>
              )}
              {song.tempo && ` • ${song.tempo} BPM`}
            </p>
          </div>
        </div>

        {/* Center / Right: Stage Quick Tools (Chords, Auto-scroll, Metronome, Options) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          
          {/* Notation Toggle (Standard A-B-C vs Latin Do-Ré-Mi) - Visible on tablet/desktop, in settings drawer on mobile */}
          <button
            onClick={() => updateStageSettings({ notation: stageSettings.notation === 'standard' ? 'latin' : 'standard' })}
            className={`hidden sm:flex px-2.5 py-1 rounded-md border text-xs font-semibold transition-all ${
              stageSettings.notation === 'latin'
                ? 'bg-[#1C1C1E] border-blue-500/50 text-blue-400'
                : 'bg-[#1C1C1E] border-[#333] text-gray-400 hover:text-white'
            }`}
            title="Basculer entre notation anglophone (C, D, E) et latine (Do, Ré, Mi)"
          >
            {stageSettings.notation === 'latin' ? 'Do' : 'ABC'}
          </button>

          {/* Chords Visibility Toggle - Visible on tablet/desktop, in settings drawer on mobile */}
          <button
            onClick={() => updateStageSettings({ showChords: !stageSettings.showChords })}
            className={`hidden sm:flex p-1.5 rounded-md border transition-all ${
              stageSettings.showChords
                ? 'bg-[#1C1C1E] border-blue-500/50 text-blue-400'
                : 'bg-[#1C1C1E] border-[#333] text-gray-500'
            }`}
            title={stageSettings.showChords ? "Masquer les accords (Mode Paroles)" : "Afficher les accords"}
          >
            {stageSettings.showChords ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>

          {/* Auto-Scroll Play/Pause & Speed - Visible on tablet/desktop, in settings drawer on mobile */}
          <div className="hidden sm:flex items-center bg-[#1C1C1E] border border-[#333] rounded-md p-0.5 gap-1">
            <button
              onClick={() => updateStageSettings({ isAutoScrolling: !stageSettings.isAutoScrolling })}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold transition-all ${
                stageSettings.isAutoScrolling
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-[#2A2A2D] text-gray-200 hover:bg-[#333]'
              }`}
              title="Défilement automatique (Espace)"
            >
              {stageSettings.isAutoScrolling ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span>Scroll</span>
            </button>

            {/* Speed selector */}
            <div className="flex items-center gap-1 px-1">
              <span className="text-[10px] text-gray-400 font-mono">{stageSettings.autoScrollSpeed}x</span>
              <input
                type="range"
                min={1}
                max={10}
                value={stageSettings.autoScrollSpeed}
                onChange={(e) => updateStageSettings({ autoScrollSpeed: parseInt(e.target.value, 10) })}
                className="w-16 accent-blue-500 cursor-pointer h-1.5 bg-[#0A0A0B] rounded-lg"
                title="Vitesse de défilement"
              />
            </div>
          </div>

          {/* Metronome Beat Pulse */}
          <button
            onClick={() => setIsMetronomeActive(!isMetronomeActive)}
            className={`flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1 rounded-md border text-xs font-semibold transition-all ${
              isMetronomeActive
                ? 'bg-[#1C1C1E] border-blue-500/50 text-blue-400'
                : 'bg-[#1C1C1E] border-[#333] text-gray-400 hover:text-white'
            }`}
            title="Activer le métronome audio/visuel"
          >
            <div 
              className={`w-2 h-2 rounded-full transition-transform ${
                isMetronomeActive 
                  ? (currentBeat === 0 ? 'bg-blue-400 scale-125' : 'bg-blue-600 scale-100') 
                  : 'bg-gray-600'
              }`} 
            />
            <span className="hidden sm:inline font-mono">{song.tempo || 120} BPM</span>
          </button>

          {/* Settings Drawer Button */}
          <button
            onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
            className={`p-1.5 rounded-md border transition-colors ${
              showSettingsDrawer
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-[#1C1C1E] border-[#333] text-gray-300 hover:text-white'
            }`}
            title="Options d'affichage"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="hidden sm:block p-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#2A2A2D] border border-[#333] text-gray-300 hover:text-white transition-colors"
            title="Plein écran pour la scène"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

        </div>
      </div>

      {/* Progress Bar for Auto-Scroll */}
      <div className="no-print w-full h-0.5 bg-[#222224] overflow-hidden">
        <div 
          className="h-full bg-blue-600 transition-all duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Settings Drawer (Overlay) */}
      {showSettingsDrawer && (
        <div className="no-print bg-[#111112] border-b border-[#222224] px-4 py-3 text-xs flex flex-wrap items-center gap-x-6 gap-y-3 shadow-xl z-20">
          
          {/* Transposition Control */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-medium">Tonalité :</span>
            <div className="flex items-center bg-[#1C1C1E] border border-blue-500/30 rounded-md p-0.5 text-xs shadow-sm">
              <button
                onClick={() => updateStageSettings({ transposeOffset: stageSettings.transposeOffset - 1 })}
                className="w-6 h-6 flex items-center justify-center rounded bg-[#2A2A2D] hover:bg-[#333] text-gray-200 hover:text-white font-bold text-xs active:scale-95 transition-all"
                title="Transposer -1 demi-ton"
              >
                -1
              </button>
              <button
                onClick={() => updateStageSettings({ transposeOffset: 0 })}
                className="px-2 text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                title="Tonalité : réinitialiser à 0"
              >
                <span className="text-[10px] text-gray-400 font-mono">Ton</span>
                <span>{stageSettings.transposeOffset === 0 ? '0' : (stageSettings.transposeOffset > 0 ? `+${stageSettings.transposeOffset}` : stageSettings.transposeOffset)}</span>
              </button>
              <button
                onClick={() => updateStageSettings({ transposeOffset: stageSettings.transposeOffset + 1 })}
                className="w-6 h-6 flex items-center justify-center rounded bg-[#2A2A2D] hover:bg-[#333] text-gray-200 hover:text-white font-bold text-xs active:scale-95 transition-all"
                title="Transposer +1 demi-ton"
              >
                +1
              </button>
            </div>
          </div>

          {/* Capo Control */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-medium">Capodastre :</span>
            <div className="flex items-center bg-[#1C1C1E] border border-amber-500/30 rounded-md p-0.5 text-xs shadow-sm">
              <button
                onClick={() => {
                  const current = stageSettings.capo ?? (song?.capo || parsedData?.capo || 0);
                  updateStageSettings({ capo: Math.max(0, current - 1) });
                }}
                disabled={(stageSettings.capo ?? (song?.capo || parsedData?.capo || 0)) <= 0}
                className="w-6 h-6 flex items-center justify-center rounded bg-[#2A2A2D] hover:bg-[#333] text-gray-200 hover:text-white font-bold text-xs active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
                title="Diminuer le capo"
              >
                -1
              </button>
              <button
                onClick={() => updateStageSettings({ capo: 0 })}
                className="px-2 text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                title="Capodastre : réinitialiser à 0"
              >
                <span className="text-[10px] text-amber-500/80 font-mono">Capo</span>
                <span>{stageSettings.capo ?? (song?.capo || parsedData?.capo || 0)}</span>
              </button>
              <button
                onClick={() => {
                  const current = stageSettings.capo ?? (song?.capo || parsedData?.capo || 0);
                  updateStageSettings({ capo: Math.min(11, current + 1) });
                }}
                className="w-6 h-6 flex items-center justify-center rounded bg-[#2A2A2D] hover:bg-[#333] text-gray-200 hover:text-white font-bold text-xs active:scale-95 transition-all"
                title="Augmenter le capo (+1)"
              >
                +1
              </button>
            </div>
          </div>

          {/* Metronome */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-medium">Métronome :</span>
            <button
              onClick={() => setIsMetronomeActive(!isMetronomeActive)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-semibold transition-all ${
                isMetronomeActive
                  ? 'bg-[#1C1C1E] border-blue-500/50 text-blue-400'
                  : 'bg-[#1C1C1E] border-[#333] text-gray-400 hover:text-white'
              }`}
              title="Activer/Désactiver le métronome"
            >
              <div 
                className={`w-2 h-2 rounded-full transition-transform ${
                  isMetronomeActive 
                    ? (currentBeat === 0 ? 'bg-blue-400 scale-125' : 'bg-blue-600 scale-100') 
                    : 'bg-gray-600'
                }`} 
              />
              <span className="font-mono">{song.tempo || 120} BPM</span>
            </button>
          </div>

          {/* Notation Selection (Do-Ré-Mi vs ABC) */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-medium">Notation :</span>
            <div className="flex items-center gap-1 bg-[#1C1C1E] p-0.5 rounded-md border border-[#333]">
              <button
                onClick={() => updateStageSettings({ notation: 'latin' })}
                className={`px-2.5 py-1 rounded font-semibold transition-all ${
                  stageSettings.notation === 'latin' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Do Ré Mi
              </button>
              <button
                onClick={() => updateStageSettings({ notation: 'standard' })}
                className={`px-2.5 py-1 rounded font-semibold transition-all ${
                  stageSettings.notation === 'standard' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                A B C
              </button>
            </div>
          </div>

          {/* Chords Visibility */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-medium">Accords :</span>
            <div className="flex items-center gap-1 bg-[#1C1C1E] p-0.5 rounded-md border border-[#333]">
              <button
                onClick={() => updateStageSettings({ showChords: true })}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-semibold transition-all ${
                  stageSettings.showChords ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Afficher</span>
              </button>
              <button
                onClick={() => updateStageSettings({ showChords: false })}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-semibold transition-all ${
                  !stageSettings.showChords ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Masquer</span>
              </button>
            </div>
          </div>

          {/* Auto-Scroll Controller */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-medium">Défilement auto :</span>
            <div className="flex items-center gap-2 bg-[#1C1C1E] p-1 rounded-md border border-[#333]">
              <button
                onClick={() => updateStageSettings({ isAutoScrolling: !stageSettings.isAutoScrolling })}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-semibold transition-all ${
                  stageSettings.isAutoScrolling
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-[#2A2A2D] text-gray-200 hover:bg-[#333]'
                }`}
              >
                {stageSettings.isAutoScrolling ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{stageSettings.isAutoScrolling ? 'Pause' : 'Lancer'}</span>
              </button>
              <div className="flex items-center gap-1 px-1">
                <span className="text-[10px] text-gray-400 font-mono">{stageSettings.autoScrollSpeed}x</span>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={stageSettings.autoScrollSpeed}
                  onChange={(e) => updateStageSettings({ autoScrollSpeed: parseInt(e.target.value, 10) })}
                  className="w-16 accent-blue-500 cursor-pointer h-1.5 bg-[#0A0A0B] rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Font Size Scaling */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-medium">Taille police :</span>
            <div className="flex items-center gap-1 bg-[#1C1C1E] p-0.5 rounded-md border border-[#333]">
              <button
                onClick={() => updateStageSettings({ fontSize: Math.max(13, stageSettings.fontSize - 2) })}
                className="w-6 h-6 rounded bg-[#2A2A2D] text-white font-bold flex items-center justify-center hover:bg-[#333]"
              >
                A-
              </button>
              <span className="px-2 font-mono font-bold text-gray-200">{stageSettings.fontSize}px</span>
              <button
                onClick={() => updateStageSettings({ fontSize: Math.min(32, stageSettings.fontSize + 2) })}
                className="w-6 h-6 rounded bg-[#2A2A2D] text-white font-bold flex items-center justify-center hover:bg-[#333]"
              >
                A+
              </button>
            </div>
          </div>

          {/* Columns Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-medium">Colonnes :</span>
            <div className="flex items-center gap-1 bg-[#1C1C1E] p-0.5 rounded-md border border-[#333]">
              <button
                onClick={() => updateStageSettings({ columns: 1 })}
                className={`px-2.5 py-1 rounded font-semibold transition-all ${
                  stageSettings.columns === 1 ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                1 Col
              </button>
              <button
                onClick={() => updateStageSettings({ columns: 2 })}
                className={`px-2.5 py-1 rounded font-semibold transition-all ${
                  stageSettings.columns === 2 ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                2 Col
              </button>
            </div>
          </div>

          {/* Theme Palette */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-medium">Ambiance :</span>
            <div className="flex items-center gap-1 bg-[#1C1C1E] p-0.5 rounded-md border border-[#333]">
              {(['dark', 'oled', 'sepia', 'light'] as const).map(th => (
                <button
                  key={th}
                  onClick={() => updateStageSettings({ theme: th })}
                  className={`px-2.5 py-1 rounded font-semibold capitalize transition-all ${
                    stageSettings.theme === th ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {th}
                </button>
              ))}
            </div>
          </div>

          {/* Print, Edit & Settings Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('settings')}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-200 border border-[#333] font-medium"
              title="Configurer les tailles de polices et couleurs"
            >
              <Sliders className="w-3.5 h-3.5 text-purple-400" />
              <span>Réglages</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-200 border border-[#333] font-medium"
            >
              <Printer className="w-3.5 h-3.5 text-blue-400" />
              <span>Imprimer</span>
            </button>
            {currentUser?.role === 'admin' && (
              <button
                onClick={() => setActiveTab('editor')}
                className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-sm"
              >
                <FileEdit className="w-3.5 h-3.5" />
                <span>Modifier</span>
              </button>
            )}
          </div>

        </div>
      )}

      {/* Main Chord & Lyrics Canvas (Stage Reader) */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 sm:px-12 py-8 scroll-smooth print-sheet pb-32"
        style={{ 
          lineHeight: displaySettings.typography.lineSpacing 
        }}
      >
        <div className="max-w-4xl mx-auto">
          
          {/* Song Sheet Header */}
          <div className="border-b border-[#222224] pb-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              {/* Left: Title & Artist */}
              <div className="flex-1 min-w-0">
                <h1 
                  className="font-bold tracking-tight text-white leading-tight break-words mb-1"
                  style={{ fontSize: `${displaySettings.typography.titleSize}px` }}
                >
                  {parsedData.title || song.title}
                </h1>
                {song.artist && (
                  <div 
                    className="text-gray-300 font-medium break-words"
                    style={{ fontSize: `${displaySettings.typography.metadataSize}px` }}
                  >
                    {song.artist}
                  </div>
                )}
              </div>

              {/* Right: Metadata Block (Tonalité, Tempo, Capo) */}
              <div 
                className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0 self-start sm:self-auto bg-[#141416] border border-[#242428] px-3 py-1.5 rounded-lg font-mono text-gray-300 shadow-sm"
                style={{ fontSize: `${displaySettings.typography.metadataSize}px` }}
              >
                <div className="flex items-center gap-1">
                  <span className="text-gray-400">Tonalité :</span>
                  <strong className="text-blue-400 font-bold">{currentKeyDisplay}</strong>
                </div>

                {song.tempo && (
                  <>
                    <span className="text-gray-600">•</span>
                    <strong className="text-gray-200">{song.tempo} BPM</strong>
                  </>
                )}

                {(stageSettings.capo ?? (parsedData.capo || song.capo || 0)) > 0 && (
                  <>
                    <span className="text-gray-600">•</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-400 font-semibold border border-amber-500/30 text-[11px]">
                      Capo {stageSettings.capo ?? (parsedData.capo || song.capo)}
                    </span>
                  </>
                )}
              </div>
            </div>

            {song.notes && (
              <div 
                className="mt-3 p-2 rounded-md bg-[#111112] border border-[#222224] text-gray-300 font-sans italic"
                style={{ fontSize: `${Math.max(11, displaySettings.typography.metadataSize)}px` }}
              >
                Note : {song.notes}
              </div>
            )}
          </div>

          {/* Structured ChordPro Sections */}
          <div className={stageSettings.columns === 2 ? 'grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6' : 'space-y-6'}>
            {parsedData.sections.map((section, sIdx) => {
              const secColor = getSectionColor(section.type, displaySettings.sectionColors);

              return (
                <div 
                  key={sIdx}
                  className="rounded-lg p-4 transition-all"
                  style={{
                    borderLeftWidth: '3.5px',
                    borderLeftStyle: 'solid',
                    borderLeftColor: secColor,
                    backgroundColor: `${secColor}0D`
                  }}
                >
                  {/* Section Title Header */}
                  {section.title && (
                    <div className="mb-3">
                      <span 
                        className="inline-block font-bold uppercase tracking-wider px-2 py-0.5 rounded border shadow-sm"
                        style={{
                          fontSize: `${displaySettings.typography.headerSize}px`,
                          color: secColor,
                          borderColor: `${secColor}50`,
                          backgroundColor: `${secColor}1C`
                        }}
                      >
                        {section.title}
                      </span>
                    </div>
                  )}

                  {/* Section Lines */}
                  <div className="space-y-3 font-chord leading-relaxed">
                    {section.lines.map((line, lIdx) => {
                      if (line.type === 'empty') {
                        return <div key={lIdx} className="h-3" />;
                      }

                      return (
                        <div key={lIdx} className="flex flex-wrap items-end gap-x-0.5">
                          {line.items.map((item, iIdx) => {
                            const transposedChord = item.chord 
                              ? transposeChord(item.chord, stageSettings.transposeOffset, stageSettings.notation) 
                              : '';

                            return (
                              <div key={iIdx} className="inline-flex flex-col">
                                {/* Chord on top */}
                                {stageSettings.showChords && (
                                  <span 
                                    className={`chord-badge font-mono font-bold text-blue-500 select-none leading-none mb-1 pr-1 ${
                                      transposedChord ? 'opacity-100' : 'opacity-0'
                                    }`}
                                    style={{ fontSize: `${displaySettings.typography.chordSize}px` }}
                                  >
                                    {transposedChord || '\u00A0'}
                                  </span>
                                )}
                                
                                {/* Syllable / Lyric */}
                                <span 
                                  className="text-[#E0E0E0] font-sans tracking-normal whitespace-pre"
                                  style={{ fontSize: `${displaySettings.typography.lyricsSize}px` }}
                                >
                                  {item.lyrics || (item.chord ? ' ' : '')}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* Floating Bottom Quick Controls (Scroll Reset & Setlist Navigation) */}
      <div className="no-print fixed bottom-4 right-4 z-40 flex items-center gap-2">
        {scrollProgress > 15 && (
          <button
            onClick={() => {
              if (containerRef.current) containerRef.current.scrollTop = 0;
            }}
            className="p-2.5 rounded-full bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-200 border border-[#333] shadow-lg backdrop-blur-md transition-transform active:scale-95"
            title="Revenir en haut du chant"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        )}

        {/* Setlist Next/Prev if in a setlist */}
        {hasPrev && onPrev && (
          <button
            onClick={onPrev}
            className="px-3 py-2 rounded-md bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-200 border border-[#333] shadow-lg text-xs font-semibold transition-all active:scale-95"
          >
            Précédent
          </button>
        )}

        {hasNext && onNext && (
          <button
            onClick={onNext}
            className="px-3.5 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 text-xs font-semibold transition-all active:scale-95 flex items-center gap-1.5"
          >
            <span>Suivant</span>
            <ChevronLeft className="w-3.5 h-3.5 rotate-180" />
          </button>
        )}
      </div>

    </div>
  );
};
