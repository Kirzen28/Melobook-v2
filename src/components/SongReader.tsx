import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Song } from '../types';
import { 
  parseChordPro, 
  transposeChord, 
  metronome,
  updateSectionVocalsInChordPro
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
  Settings2, 
  Music, 
  FileEdit,
  ArrowUp,
  Sparkles,
  Tag,
  Mic,
  FileDown,
  X,
  Check,
  Plus,
  Trash2
} from 'lucide-react';
import { SetlistPdfModal } from './SetlistPdfModal';

const PRESET_VOCAL_ROLES = [
  'Unisson', 
  'Lead', 
  '2e voix', 
  '3e voix', 
  'Soprano', 
  'Alto', 
  'Ténor', 
  'Basse', 
  'Chœur', 
  'Tous', 
  'Harmonie', 
  'Duo', 
  'Femmes', 
  'Hommes', 
  'A cappella'
];

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
    setSelectedSong,
    updateSong,
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
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Vocal Arrangement Pop-up Modal State
  const [vocalModalSection, setVocalModalSection] = useState<{
    index: number;
    title: string;
    vocals: string[];
  } | null>(null);
  const [customVocalInput, setCustomVocalInput] = useState('');

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

  // Vocal Arrangement Helpers
  const handleToggleVocalRole = async (role: string) => {
    if (!vocalModalSection || !song) return;
    const currentVocals = vocalModalSection.vocals || [];
    const updatedVocals = currentVocals.includes(role)
      ? currentVocals.filter(r => r !== role)
      : [...currentVocals, role];

    setVocalModalSection({
      ...vocalModalSection,
      vocals: updatedVocals
    });

    const updatedChordPro = updateSectionVocalsInChordPro(
      song.contentChordPro,
      vocalModalSection.index,
      updatedVocals
    );

    await updateSong(song.id, { contentChordPro: updatedChordPro });
    if (selectedSong && selectedSong.id === song.id) {
      setSelectedSong({
        ...selectedSong,
        contentChordPro: updatedChordPro
      });
    }
  };

  const handleAddCustomVocalRole = async () => {
    if (!vocalModalSection || !song || !customVocalInput.trim()) return;
    const trimmed = customVocalInput.trim();
    const currentVocals = vocalModalSection.vocals || [];
    if (!currentVocals.includes(trimmed)) {
      const updatedVocals = [...currentVocals, trimmed];
      setVocalModalSection({
        ...vocalModalSection,
        vocals: updatedVocals
      });

      const updatedChordPro = updateSectionVocalsInChordPro(
        song.contentChordPro,
        vocalModalSection.index,
        updatedVocals
      );

      await updateSong(song.id, { contentChordPro: updatedChordPro });
      if (selectedSong && selectedSong.id === song.id) {
        setSelectedSong({
          ...selectedSong,
          contentChordPro: updatedChordPro
        });
      }
    }
    setCustomVocalInput('');
  };

  const handleRemoveVocalRole = async (role: string) => {
    if (!vocalModalSection || !song) return;
    const updatedVocals = (vocalModalSection.vocals || []).filter(r => r !== role);
    setVocalModalSection({
      ...vocalModalSection,
      vocals: updatedVocals
    });

    const updatedChordPro = updateSectionVocalsInChordPro(
      song.contentChordPro,
      vocalModalSection.index,
      updatedVocals
    );

    await updateSong(song.id, { contentChordPro: updatedChordPro });
    if (selectedSong && selectedSong.id === song.id) {
      setSelectedSong({
        ...selectedSong,
        contentChordPro: updatedChordPro
      });
    }
  };

  const handleClearSectionVocals = async () => {
    if (!vocalModalSection || !song) return;
    const updatedVocals: string[] = [];
    setVocalModalSection({
      ...vocalModalSection,
      vocals: updatedVocals
    });

    const updatedChordPro = updateSectionVocalsInChordPro(
      song.contentChordPro,
      vocalModalSection.index,
      updatedVocals
    );

    await updateSong(song.id, { contentChordPro: updatedChordPro });
    if (selectedSong && selectedSong.id === song.id) {
      setSelectedSong({
        ...selectedSong,
        contentChordPro: updatedChordPro
      });
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
      
      {/* Progress Bar for Auto-Scroll */}
      <div className="no-print w-full h-0.5 bg-[#222224] overflow-hidden">
        <div 
          className="h-full bg-blue-600 transition-all duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Settings Drawer (Overlay) */}
      {showSettingsDrawer && (
        <div className="no-print bg-[#111112] border-b border-[#222224] px-4 py-3 text-xs shadow-xl z-20">
          
          {/* Header with Title and Close Button */}
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#222224]">
            <div className="flex items-center gap-2">
              <Settings2 className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-semibold text-gray-200 text-xs">
                Réglages du morceau
              </span>
            </div>
            <button
              onClick={() => setShowSettingsDrawer(false)}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-400 hover:text-white border border-[#333] transition-colors"
              title="Fermer les réglages (Échap)"
            >
              <X className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium hidden sm:inline">Fermer</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
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
            <div className="flex items-center gap-1 bg-[#1C1C1E] p-0.5 rounded-md border border-[#333]">
              <button
                onClick={() => setIsMetronomeActive(!isMetronomeActive)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-semibold text-xs transition-all ${
                  isMetronomeActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-300 hover:text-white hover:bg-[#2A2A2D]'
                }`}
                title="Activer/Désactiver le métronome"
              >
                <div 
                  className={`w-2 h-2 rounded-full transition-transform ${
                    isMetronomeActive 
                      ? (currentBeat === 0 ? 'bg-amber-300 scale-125' : 'bg-white scale-100') 
                      : 'bg-gray-500'
                  }`} 
                />
                <span>{isMetronomeActive ? 'Actif' : 'Démarrer'}</span>
                <span className="font-mono opacity-90">({song.tempo || 120} BPM)</span>
              </button>
            </div>
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

          {/* PDF & Edit Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto flex-wrap pt-1 sm:pt-0 border-t sm:border-t-0 border-[#222224]">
            <button
              onClick={() => setShowPdfModal(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-1 rounded-md bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-200 border border-[#333] font-medium text-xs transition-colors"
              title="Exporter cette partition en PDF / Partager sur WhatsApp"
            >
              <FileDown className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Exporter PDF</span>
            </button>
            {currentUser?.role === 'admin' && (
              <button
                onClick={() => setActiveTab('editor')}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-sm transition-colors"
              >
                <FileEdit className="w-3.5 h-3.5 shrink-0" />
                <span>Modifier</span>
              </button>
            )}
          </div>

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
            <div className="flex items-start justify-between gap-3 mb-3">
              {/* Left: Title & Artist */}
              <div className="flex-1 min-w-0 pr-2">
                {setlistPosition && (
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-2 py-0.5 rounded bg-[#1C1C1E] border border-[#333] text-blue-400 text-xs font-bold font-mono">
                      Morceau {setlistPosition.current} sur {setlistPosition.total}
                    </span>
                  </div>
                )}

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

              {/* Right: Bouton Réglages */}
              <button
                type="button"
                onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
                className={`shrink-0 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all shadow-sm ${
                  showSettingsDrawer
                    ? 'bg-blue-600 border-blue-500 text-white shadow-blue-500/20'
                    : 'bg-[#1C1C1E] hover:bg-[#28282C] border-[#333] hover:border-[#444] text-gray-200 hover:text-white'
                }`}
                title="Ouvrir les options et réglages du chant"
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>Réglages</span>
              </button>
            </div>

            {/* Single Line: Tonalité, Tempo, Capo & Catégories */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              {/* Tonalité */}
              <div 
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#141416] border border-[#242428] text-gray-300 font-mono shadow-sm"
                style={{ fontSize: `${displaySettings.typography.metadataSize}px` }}
              >
                <span className="text-gray-400 font-sans text-xs">Tonalité :</span>
                <strong className="text-blue-400 font-bold">{currentKeyDisplay}</strong>
              </div>

              {/* Tempo */}
              {song.tempo && (
                <div 
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#141416] border border-[#242428] text-gray-300 font-mono shadow-sm"
                  style={{ fontSize: `${displaySettings.typography.metadataSize}px` }}
                >
                  <span className="text-gray-400 font-sans text-xs">Tempo :</span>
                  <strong className="text-gray-200">{song.tempo} BPM</strong>
                </div>
              )}

              {/* Capo */}
              {(stageSettings.capo ?? (parsedData.capo || song.capo || 0)) > 0 && (
                <div 
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-950/30 border border-amber-500/30 text-amber-300 font-mono shadow-sm"
                  style={{ fontSize: `${displaySettings.typography.metadataSize}px` }}
                >
                  <span className="text-amber-400/80 font-sans text-xs">Capo :</span>
                  <strong className="text-amber-300 font-semibold">Capo {stageSettings.capo ?? (parsedData.capo || song.capo)}</strong>
                </div>
              )}

              {/* Categories / Tags on the same line */}
              {song.tags && song.tags.length > 0 && (
                <>
                  <div className="hidden sm:block w-px h-4 bg-[#2A2A2E] mx-0.5" />
                  {song.tags.map((cat, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#1C1C1E] border border-[#2A2A2D] text-gray-300 text-xs font-medium"
                    >
                      <Tag className="w-3 h-3 text-blue-400" />
                      <span>{cat}</span>
                    </span>
                  ))}
                </>
              )}
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
                  {/* Section Title Header & Vocal Arrangement Pastille */}
                  <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                    {section.title ? (
                      <button
                        type="button"
                        onClick={() => {
                          const vocalsList = section.vocals && section.vocals.length > 0
                            ? section.vocals
                            : section.vocal ? [section.vocal] : [];
                          setVocalModalSection({
                            index: sIdx,
                            title: section.title || `Section ${sIdx + 1}`,
                            vocals: vocalsList
                          });
                        }}
                        className="inline-block font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border shadow-xs text-left hover:brightness-125 transition-all cursor-pointer"
                        style={{
                          fontSize: `${displaySettings.typography.headerSize}px`,
                          color: secColor,
                          borderColor: `${secColor}50`,
                          backgroundColor: `${secColor}1C`
                        }}
                        title="Cliquer pour gérer l'arrangement vocal de cette section"
                      >
                        {section.title}
                      </button>
                    ) : <div />}

                    {/* Pastilles Arrangement Vocal ou Bouton Micro si aucun arrangement */}
                    {((section.vocals && section.vocals.length > 0) || section.vocal) ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(section.vocals && section.vocals.length > 0 ? section.vocals : [section.vocal!]).map((voc, vIdx) => (
                          <button
                            key={vIdx}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const vocalsList = section.vocals && section.vocals.length > 0
                                ? section.vocals
                                : section.vocal ? [section.vocal] : [];
                              setVocalModalSection({
                                index: sIdx,
                                title: section.title || `Section ${sIdx + 1}`,
                                vocals: vocalsList
                              });
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 hover:text-cyan-200 text-xs font-semibold shadow-xs select-none transition-all active:scale-95 cursor-pointer"
                            title="Modifier l'arrangement vocal"
                          >
                            <Mic className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span>{voc}</span>
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const vocalsList = section.vocals && section.vocals.length > 0
                              ? section.vocals
                              : section.vocal ? [section.vocal] : [];
                            setVocalModalSection({
                              index: sIdx,
                              title: section.title || `Section ${sIdx + 1}`,
                              vocals: vocalsList
                            });
                          }}
                          className="p-1 rounded-full bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-400 hover:text-cyan-300 border border-[#333] hover:border-cyan-500/50 transition-colors"
                          title="Ajouter ou modifier des voix"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setVocalModalSection({
                            index: sIdx,
                            title: section.title || `Section ${sIdx + 1}`,
                            vocals: []
                          });
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#161618] hover:bg-[#222226] border border-[#2E2E32] hover:border-cyan-500/50 text-gray-400 hover:text-cyan-300 text-xs font-medium transition-all cursor-pointer group/vocal"
                        title="Ajouter un arrangement vocal à cette section"
                      >
                        <Mic className="w-3.5 h-3.5 text-cyan-400/70 group-hover/vocal:text-cyan-400" />
                        <span className="text-[11px] text-gray-400 group-hover/vocal:text-cyan-300">+ Voix</span>
                      </button>
                    )}
                  </div>

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

      {/* PDF Export & Share Modal */}
      {showPdfModal && song && (
        <SetlistPdfModal
          setlist={{
            id: 'single-song',
            groupId: song.groupId,
            name: song.title,
            date: new Date().toISOString().split('T')[0],
            songIds: [song.id],
            targetDuration: 5
          }}
          songs={[song]}
          onClose={() => setShowPdfModal(false)}
        />
      )}

      {/* Vocal Arrangement Multi-select Pop-up Modal */}
      {vocalModalSection && song && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150 select-auto"
          onClick={() => setVocalModalSection(null)}
        >
          <div 
            className="bg-[#141416] border border-[#2E2E34] rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#25252A] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-950/60 border border-cyan-500/50 flex items-center justify-center shadow-xs">
                  <Mic className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Arrangement vocal</h3>
                  <p className="text-xs text-cyan-400 font-mono uppercase font-semibold">{vocalModalSection.title}</p>
                </div>
              </div>
              <button 
                onClick={() => setVocalModalSection(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#25252A] transition-colors"
                title="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Currently selected badges preview */}
            {vocalModalSection.vocals && vocalModalSection.vocals.length > 0 ? (
              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">
                  Voix actives sur cette section :
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-[#0D0D0E] border border-[#222226]">
                  {vocalModalSection.vocals.map((voc) => (
                    <span
                      key={voc}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/60 text-cyan-300 text-xs font-semibold shadow-xs"
                    >
                      <Mic className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{voc}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveVocalRole(voc)}
                        className="p-0.5 hover:bg-cyan-900/60 rounded-full text-cyan-400 hover:text-white transition-colors ml-0.5"
                        title={`Supprimer ${voc}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic bg-[#0D0D0E] p-2.5 rounded-xl border border-[#222226]">
                Aucun arrangement vocal pour cette section. Cliquez sur un pupitre ci-dessous pour l'ajouter.
              </p>
            )}

            {/* Preset Vocals Grid (Multiselect) */}
            <div>
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
                Pupitres & Voix (sélection multiple) :
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                {PRESET_VOCAL_ROLES.map((role) => {
                  const isSelected = vocalModalSection.vocals.includes(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => handleToggleVocalRole(role)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        isSelected
                          ? 'bg-cyan-950/70 border-cyan-500 text-cyan-200 shadow-sm shadow-cyan-950/40 font-bold'
                          : 'bg-[#18181C] border-[#2A2A30] text-gray-300 hover:border-cyan-500/40 hover:bg-[#202026]'
                      }`}
                    >
                      <span>{role}</span>
                      {isSelected ? (
                        <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      ) : (
                        <Plus className="w-3 h-3 text-gray-500 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Add Custom Vocal Part */}
            <div className="pt-2 border-t border-[#25252A]">
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">
                Ajouter une voix personnalisée (ex: Solo Sarah, Voix 4...) :
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customVocalInput}
                  onChange={(e) => setCustomVocalInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomVocalRole();
                    }
                  }}
                  placeholder="Nom de la voix ou soliste..."
                  className="flex-1 bg-[#18181C] border border-[#333] focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddCustomVocalRole}
                  disabled={!customVocalInput.trim()}
                  className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:hover:bg-cyan-600 text-slate-950 font-bold text-xs flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter</span>
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-[#25252A]">
              {vocalModalSection.vocals.length > 0 ? (
                <button
                  type="button"
                  onClick={handleClearSectionVocals}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 px-2 py-1 rounded hover:bg-red-950/20"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Effacer les voix</span>
                </button>
              ) : <div />}

              <button
                type="button"
                onClick={() => setVocalModalSection(null)}
                className="px-4 py-2 rounded-xl bg-[#25252A] hover:bg-[#323238] text-white text-xs font-semibold transition-colors ml-auto"
              >
                Terminé
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
