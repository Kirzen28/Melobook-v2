import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Song } from '../types';
import { 
  parseChordPro, 
  transposeChord, 
  metronome,
  updateSectionVocalsInChordPro,
  updateSectionRepeatInChordPro,
  getVocalBadgeStyle,
  getSongDuration,
  parseDurationToSeconds,
  formatSecondsToMinutes,
  formatDurationToMMSS,
  LATIN_NOTES,
  getSemitoneDifference,
  transposeChordProText,
  stripParentheses
} from '../utils/chordUtils';
import { cacheSongInWorker } from '../utils/pwaCache';
import { getSectionColor } from '../utils/displayDefaults';
import { MetronomeStageControl } from './MetronomeStageControl';
import { MidiStatusIndicator } from './MidiStatusIndicator';
import { useMidi } from '../context/MidiContext';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
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
  Music2,
  FileEdit,
  ArrowUp,
  ArrowUpDown,
  Sparkles,
  Tag,
  Mic,
  FileDown,
  X,
  Check,
  Plus,
  Minus,
  ChevronDown,
  Trash2,
  Clock,
  Layers,
  Pencil,
  Globe,
  Repeat,
  Battery
} from 'lucide-react';
import { SetlistPdfModal } from './SetlistPdfModal';
import { ChordModal } from './ChordModal';
import { LanguageVersionModal } from './LanguageVersionModal';
import { BatteryIndicator } from './BatteryIndicator';
import { getLanguageMeta, getLinkedSongVersions } from '../utils/languageUtils';

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

const MAJOR_KEYS = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'];
const MINOR_KEYS = ['Cm', 'C#m', 'Dbm', 'Dm', 'D#m', 'Ebm', 'Em', 'Fm', 'F#m', 'Gbm', 'Gm', 'G#m', 'Abm', 'Am', 'A#m', 'Bbm', 'Bm'];

interface SongReaderProps {
  song?: Song | null;
  setlistId?: string;
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
  setlistId,
  onBack,
  onNext,
  onPrev,
  hasNext,
  hasPrev,
  setlistContextName,
  setlistPosition
}) => {
  const { 
    songs,
    selectedSong, 
    setSelectedSong,
    updateSong,
    setlists,
    selectedSetlist,
    updateSetlistSongOverride,
    removeSetlistSongOverride,
    stageSettings, 
    updateStageSettings, 
    displaySettings,
    setActiveTab, 
    activeTab,
    currentUser,
    currentGroup
  } = useApp();

  const { registerActionHandler } = useMidi();

  const rawSong = propSong || selectedSong;
  const song = useMemo(() => {
    if (!rawSong) return null;
    return songs.find(s => s.id === rawSong.id) || rawSong;
  }, [songs, rawSong]);

  useEffect(() => {
    if (song) {
      cacheSongInWorker(song);
    }
  }, [song]);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Interactive Chord Library Modal State
  const [chordModalData, setChordModalData] = useState<{
    isOpen: boolean;
    chord: string;
  }>({
    isOpen: false,
    chord: 'C'
  });

  // Vocal Arrangement Pop-up Modal State
  const [vocalModalSection, setVocalModalSection] = useState<{
    index: number;
    title: string;
    vocals: string[];
  } | null>(null);
  const [customVocalInput, setCustomVocalInput] = useState('');

  // Section Repetition Pop-up Modal State removed in favor of direct dropdown

  // Minimalist Metadata Pop-up Modals States
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showTempoModal, setShowTempoModal] = useState(false);
  const [tempoModalValue, setTempoModalValue] = useState<number>(song?.tempo || 100);
  const [showCapoModal, setShowCapoModal] = useState(false);
  const [showTimeSigModal, setShowTimeSigModal] = useState(false);
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [durationModalMode, setDurationModalMode] = useState<'auto' | 'custom'>('auto');
  const [durationModalInput, setDurationModalInput] = useState('');

  // Setlist Context & Overrides Determination
  const isSetlistMode = Boolean(setlistId || setlistContextName || (selectedSetlist && (activeTab === 'setlists' || activeTab === 'stage')));
  const currentSetlist = (setlistId ? setlists.find(st => st.id === setlistId) : null) || selectedSetlist;
  const setlistOverride = (isSetlistMode && currentSetlist && song) ? currentSetlist.songOverrides?.[song.id] : undefined;
  
  const hasSetlistOverrides = Boolean(
    setlistOverride && (
      setlistOverride.key !== undefined ||
      setlistOverride.tempo !== undefined ||
      setlistOverride.capo !== undefined ||
      setlistOverride.transposeOffset !== undefined ||
      setlistOverride.duration !== undefined ||
      setlistOverride.notes !== undefined ||
      (setlistOverride.sectionRepeats && Object.keys(setlistOverride.sectionRepeats).length > 0)
    )
  );

  // Tap Tempo state
  const tapTimesRef = useRef<number[]>([]);
  const [tapCount, setTapCount] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollAnimRef = useRef<number | null>(null);
  const lastScrollTimeRef = useRef<number>(performance.now());

  // Parse ChordPro
  const parsedData = useMemo(() => {
    if (!song) return null;
    return parseChordPro(song.contentChordPro);
  }, [song?.contentChordPro]);

  // Base parameters
  const catalogBaseKey = (parsedData?.hasExplicitKey && parsedData.key) || song?.key || parsedData?.key || 'C';
  const effectiveBaseKey = setlistOverride?.key || catalogBaseKey;
  const effectiveTransposeOffset = setlistOverride?.transposeOffset !== undefined ? setlistOverride.transposeOffset : stageSettings.transposeOffset;
  const effectiveTempo = setlistOverride?.tempo || song?.tempo || parsedData?.tempo || 120;
  const rawDuration = setlistOverride?.duration || song?.duration || parsedData?.duration || '03:30';
  const effectiveDuration = useMemo(() => formatDurationToMMSS(rawDuration), [rawDuration]);
  const effectiveNotes = setlistOverride?.notes !== undefined ? setlistOverride.notes : (song?.notes || '');
  const effectiveCapo = setlistOverride?.capo !== undefined ? setlistOverride.capo : (song?.capo || 0);

  // Semitone difference for live transposed chords
  const baseKeySemitones = useMemo(() => {
    return getSemitoneDifference(catalogBaseKey, effectiveBaseKey);
  }, [catalogBaseKey, effectiveBaseKey]);

  const totalTransposeSemitones = (baseKeySemitones + effectiveTransposeOffset) % 12;

  // Extract all unique chords in the current song
  const allSongChords = useMemo(() => {
    if (!parsedData) return [];
    const set = new Set<string>();
    parsedData.sections.forEach(sec => {
      sec.lines.forEach(l => {
        l.items.forEach(item => {
          if (item.chord) {
            const transposed = transposeChord(item.chord, totalTransposeSemitones, stageSettings.notation);
            if (transposed && transposed.trim()) {
              set.add(transposed.trim());
            }
          }
        });
      });
    });
    return Array.from(set);
  }, [parsedData, totalTransposeSemitones, stageSettings.notation]);

  // Local inline duration, tempo, key & notes state
  const [inlineDurationValue, setInlineDurationValue] = useState<string>('03:30');
  const [inlineTempoValue, setInlineTempoValue] = useState<string>('120');
  const [showKeyMenu, setShowKeyMenu] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesInput, setNotesInput] = useState('');

  useEffect(() => {
    setInlineDurationValue(effectiveDuration);
    setNotesInput(effectiveNotes);
  }, [effectiveDuration, effectiveNotes]);

  useEffect(() => {
    setInlineTempoValue(String(effectiveTempo));
  }, [effectiveTempo]);

  const handleCommitTempo = async () => {
    const parsed = parseInt(inlineTempoValue, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.max(30, Math.min(260, parsed));
      setInlineTempoValue(String(clamped));
      await handleUpdateTempo(clamped);
    } else {
      setInlineTempoValue(String(effectiveTempo));
    }
  };

  const handleSetDurationCustom = async (newDuration: string) => {
    if (!song) return;
    const formatted = formatDurationToMMSS(newDuration.trim() || '03:30');
    setInlineDurationValue(formatted);
    if (isSetlistMode && currentSetlist) {
      await updateSetlistSongOverride(currentSetlist.id, song.id, { duration: formatted });
    } else {
      await updateSong(song.id, { duration: formatted, durationMode: 'custom' });
      if (selectedSong && selectedSong.id === song.id) {
        setSelectedSong({ ...selectedSong, duration: formatted, durationMode: 'custom' });
      }
    }
  };

  const handleSaveNotes = async () => {
    if (!song) return;
    const trimmed = notesInput.trim();
    if (isSetlistMode && currentSetlist) {
      await updateSetlistSongOverride(currentSetlist.id, song.id, { notes: trimmed || undefined });
    } else {
      await updateSong(song.id, { notes: trimmed || undefined });
      if (selectedSong && selectedSong.id === song.id) {
        setSelectedSong({ ...selectedSong, notes: trimmed || undefined });
      }
    }
    setIsEditingNotes(false);
  };

  const handleDeleteNotes = async () => {
    if (!song) return;
    setNotesInput('');
    if (isSetlistMode && currentSetlist) {
      await updateSetlistSongOverride(currentSetlist.id, song.id, { notes: undefined });
    } else {
      await updateSong(song.id, { notes: undefined });
      if (selectedSong && selectedSong.id === song.id) {
        setSelectedSong({ ...selectedSong, notes: undefined });
      }
    }
    setIsEditingNotes(false);
  };

  // Key & Transposition Handlers
  const handleTransposeDelta = async (delta: number) => {
    const newOffset = (effectiveTransposeOffset + delta) % 12;
    if (isSetlistMode && currentSetlist && song) {
      await updateSetlistSongOverride(currentSetlist.id, song.id, { transposeOffset: newOffset });
    } else {
      updateStageSettings({ transposeOffset: newOffset });
    }
  };

  const handleResetTranspose = async () => {
    if (isSetlistMode && currentSetlist && song) {
      await updateSetlistSongOverride(currentSetlist.id, song.id, { transposeOffset: 0 });
    } else {
      updateStageSettings({ transposeOffset: 0 });
    }
  };

  const handleSetBaseKey = async (targetKey: string) => {
    if (!song) return;

    if (isSetlistMode && currentSetlist) {
      await updateSetlistSongOverride(currentSetlist.id, song.id, { key: targetKey, transposeOffset: 0 });
    } else {
      const currentBaseKey = (parsedData?.hasExplicitKey && parsedData.key)
        ? parsedData.key
        : (song.key || parsedData?.key || 'C');

      const semitones = getSemitoneDifference(currentBaseKey, targetKey);
      const updatedContent = transposeChordProText(song.contentChordPro, semitones, 'standard', targetKey);

      await updateSong(song.id, { key: targetKey, contentChordPro: updatedContent });
      updateStageSettings({ transposeOffset: 0 });
      if (selectedSong && selectedSong.id === song.id) {
        setSelectedSong({ ...selectedSong, key: targetKey, contentChordPro: updatedContent });
      }
    }
  };

  // Section Repeat Handler
  const handleUpdateSectionRepeat = async (sectionIdx: number, newRepeat: number) => {
    if (!song) return;
    const clampedRepeat = Math.max(1, Math.min(16, newRepeat));

    if (isSetlistMode && currentSetlist) {
      const currentRepeats = setlistOverride?.sectionRepeats || {};
      const updatedRepeats = { ...currentRepeats, [sectionIdx]: clampedRepeat };
      await updateSetlistSongOverride(currentSetlist.id, song.id, { sectionRepeats: updatedRepeats });
    } else {
      const updatedContent = updateSectionRepeatInChordPro(song.contentChordPro, sectionIdx, clampedRepeat);
      await updateSong(song.id, { contentChordPro: updatedContent });
      if (selectedSong && selectedSong.id === song.id) {
        setSelectedSong({ ...selectedSong, contentChordPro: updatedContent });
      }
    }
  };

  // Reset Overrides
  const handleResetOverridesToDefaults = async () => {
    if (!isSetlistMode || !currentSetlist || !song) return;
    await removeSetlistSongOverride(currentSetlist.id, song.id);
  };

  // Save Overrides to Master Catalog
  const handleSaveOverridesToMasterCatalog = async () => {
    if (!isSetlistMode || !currentSetlist || !song) return;
    const updates: Partial<Song> = {};
    if (setlistOverride?.tempo) updates.tempo = setlistOverride.tempo;
    if (setlistOverride?.duration) updates.duration = setlistOverride.duration;
    if (setlistOverride?.capo !== undefined) updates.capo = setlistOverride.capo;
    if (setlistOverride?.notes !== undefined) updates.notes = setlistOverride.notes;

    let contentToUpdate = song.contentChordPro;

    if (setlistOverride?.key && setlistOverride.key !== catalogBaseKey) {
      const semitones = getSemitoneDifference(catalogBaseKey, setlistOverride.key);
      contentToUpdate = transposeChordProText(contentToUpdate, semitones, 'standard', setlistOverride.key);
      updates.key = setlistOverride.key;
    }

    if (setlistOverride?.sectionRepeats) {
      Object.entries(setlistOverride.sectionRepeats).forEach(([sIdxStr, rep]) => {
        const sIdx = parseInt(sIdxStr, 10);
        const repNum = Number(rep);
        if (!isNaN(sIdx) && !isNaN(repNum) && repNum > 0) {
          contentToUpdate = updateSectionRepeatInChordPro(contentToUpdate, sIdx, repNum);
        }
      });
    }

    updates.contentChordPro = contentToUpdate;

    await updateSong(song.id, updates);
    if (selectedSong && selectedSong.id === song.id) {
      setSelectedSong({ ...selectedSong, ...updates });
    }

    await removeSetlistSongOverride(currentSetlist.id, song.id);
  };

  // Key & Mode Helpers
  const rawKey = effectiveBaseKey;
  const isCurrentKeyMinor = rawKey.endsWith('m') && rawKey !== 'm' && !rawKey.endsWith('dim');
  const currentRootNote = isCurrentKeyMinor ? rawKey.slice(0, -1) : rawKey;
  const currentMode = isCurrentKeyMinor ? 'mineur' : 'majeur';

  const handleKeyRootChange = async (newRoot: string) => {
    const newKey = isCurrentKeyMinor ? `${newRoot}m` : newRoot;
    await handleSetBaseKey(newKey);
  };

  const handleKeyModeChange = async (newMode: 'majeur' | 'mineur') => {
    const newKey = newMode === 'mineur' ? `${currentRootNote}m` : currentRootNote;
    await handleSetBaseKey(newKey);
  };

  // Tempo & BPM Handlers
  const handleUpdateTempo = async (newBpm: number) => {
    if (!song) return;
    const clamped = Math.max(30, Math.min(260, newBpm));
    setTempoModalValue(clamped);

    if (isSetlistMode && currentSetlist) {
      await updateSetlistSongOverride(currentSetlist.id, song.id, { tempo: clamped });
    } else {
      await updateSong(song.id, { tempo: clamped });
      if (selectedSong && selectedSong.id === song.id) {
        setSelectedSong({ ...selectedSong, tempo: clamped });
      }
    }

    metronome.setBpm(clamped);
  };

  // Tap Tempo logic
  const handleTapTempo = () => {
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
      const clampedBpm = Math.max(40, Math.min(240, calculatedBpm));
      handleUpdateTempo(clampedBpm);
    }
  };

  // Capo Handlers
  const handleUpdateCapo = async (capoVal: number) => {
    if (!song) return;
    const safeCapo = Math.max(0, Math.min(11, capoVal));
    if (isSetlistMode && currentSetlist) {
      await updateSetlistSongOverride(currentSetlist.id, song.id, { capo: safeCapo });
    } else {
      updateStageSettings({ capo: safeCapo });
      await updateSong(song.id, { capo: safeCapo });
      if (selectedSong && selectedSong.id === song.id) {
        setSelectedSong({ ...selectedSong, capo: safeCapo });
      }
    }
  };

  // Time Signature Handlers
  const handleUpdateTimeSignature = async (newSig: string) => {
    if (!song) return;
    await updateSong(song.id, { timeSignature: newSig });
    if (selectedSong && selectedSong.id === song.id) {
      setSelectedSong({ ...selectedSong, timeSignature: newSig });
    }
  };

  // Base key and Transposed key calculations
  const baseKey = effectiveBaseKey;

  // Base Key display formatted according to current notation system
  const baseKeyDisplay = useMemo(() => {
    if (stageSettings.notation === 'latin') {
      return LATIN_NOTES[baseKey] || baseKey;
    }
    return baseKey;
  }, [baseKey, stageSettings.notation]);

  // Transposed Key display (only when transposeOffset !== 0)
  const transposedKeyDisplay = useMemo(() => {
    if (!baseKey) return '';
    if (effectiveTransposeOffset === 0) return '';
    return transposeChord(baseKey, effectiveTransposeOffset, stageSettings.notation);
  }, [baseKey, effectiveTransposeOffset, stageSettings.notation]);

  const currentKeyDisplay = transposedKeyDisplay || baseKeyDisplay;

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

  // MIDI Remote Control Handlers for SongReader (Scroll & Navigation)
  useEffect(() => {
    const unsubToggleAuto = registerActionHandler('toggle_autoscroll', () => {
      updateStageSettings({ isAutoScrolling: !stageSettings.isAutoScrolling });
    });

    const unsubSpeedUp = registerActionHandler('speed_up_autoscroll', () => {
      updateStageSettings({ 
        autoScrollSpeed: Math.min(10, (stageSettings.autoScrollSpeed || 3) + 1) 
      });
    });

    const unsubSpeedDown = registerActionHandler('speed_down_autoscroll', () => {
      updateStageSettings({ 
        autoScrollSpeed: Math.max(1, (stageSettings.autoScrollSpeed || 3) - 1) 
      });
    });

    const unsubScrollDown = registerActionHandler('scroll_down', () => {
      if (containerRef.current) {
        containerRef.current.scrollBy({ top: 350, behavior: 'smooth' });
      }
    });

    const unsubScrollUp = registerActionHandler('scroll_up', () => {
      if (containerRef.current) {
        containerRef.current.scrollBy({ top: -350, behavior: 'smooth' });
      }
    });

    const unsubNext = registerActionHandler('next_song', () => {
      if (onNext) {
        onNext();
      }
    });

    const unsubPrev = registerActionHandler('prev_song', () => {
      if (onPrev) {
        onPrev();
      }
    });

    return () => {
      unsubToggleAuto();
      unsubSpeedUp();
      unsubSpeedDown();
      unsubScrollDown();
      unsubScrollUp();
      unsubNext();
      unsubPrev();
    };
  }, [stageSettings.isAutoScrolling, stageSettings.autoScrollSpeed, updateStageSettings, onNext, onPrev, registerActionHandler]);

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
  const isSystemLight = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  const effectiveTheme = stageSettings.theme === 'system'
    ? (isSystemLight ? 'light' : 'dark')
    : (stageSettings.theme || 'dark');

  const themeClasses = {
    dark: 'bg-[#0A0A0B] text-[#E0E0E0]',
    oled: 'bg-black text-[#E0E0E0]',
    sepia: 'bg-[#1C1814] text-[#F3EAD8]',
    light: 'bg-[#F4F4F5] text-[#111112]'
  }[effectiveTheme as 'dark' | 'oled' | 'sepia' | 'light'] || 'bg-[#0A0A0B] text-[#E0E0E0]';

  const isEmbedded = Boolean(propSong || setlistId || onBack);
  const containerClasses = isEmbedded
    ? 'relative flex-1 w-full h-full min-h-0'
    : 'fixed inset-0 top-16 md:top-16 z-30';

  return (
    <div className={`${containerClasses} flex flex-col ${themeClasses} select-none transition-colors`}>
      
      {/* Progress Bar for Auto-Scroll */}
      <div className="no-print w-full h-0.5 bg-[#222224] overflow-hidden">
        <div 
          className="h-full bg-blue-600 transition-all duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Indicateur de batterie dans le coin de l'interface en mode scène */}
      {!isEmbedded && stageSettings.showBatteryIndicator !== false && (
        <div className="no-print absolute top-2.5 right-3 sm:top-3 sm:right-5 z-40 pointer-events-auto">
          <BatteryIndicator />
        </div>
      )}

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
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-400 hover:text-white border border-[#333] transition-colors cursor-pointer"
              title="Fermer les réglages"
            >
              <X className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium hidden sm:inline">Fermer</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
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

            {/* Battery Indicator Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-gray-400 font-medium">Batterie scène :</span>
              <div className="flex items-center gap-1 bg-[#1C1C1E] p-0.5 rounded-md border border-[#333]">
                <button
                  type="button"
                  onClick={() => updateStageSettings({ showBatteryIndicator: true })}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-semibold transition-all cursor-pointer ${
                    stageSettings.showBatteryIndicator !== false ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Battery className="w-3.5 h-3.5" />
                  <span>Afficher</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateStageSettings({ showBatteryIndicator: false })}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-semibold transition-all cursor-pointer ${
                    stageSettings.showBatteryIndicator === false ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
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

            {/* Pédalier / Contrôleur MIDI */}
            <div className="flex items-center gap-2">
              <span className="text-gray-400 font-medium">MIDI :</span>
              <MidiStatusIndicator showLabel />
            </div>

            {/* Actions : PDF & Edit */}
            <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto flex-wrap pt-1 sm:pt-0 border-t sm:border-t-0 border-[#222224]">
              <button
                type="button"
                onClick={() => setShowPdfModal(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-1 rounded-md bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-200 border border-[#333] font-medium text-xs transition-colors cursor-pointer"
                title="Exporter cette partition en PDF"
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
                <div className="flex items-center flex-wrap gap-2.5 mb-1">
                  <h1 
                    className="font-bold tracking-tight text-white leading-tight break-words"
                    style={{ fontSize: `${displaySettings.typography.titleSize}px` }}
                  >
                    {stripParentheses(parsedData.title || song.title)}
                  </h1>

                  {/* Liste dépliante : Langue et versions du chant à la suite du titre */}
                  {(() => {
                    const lMeta = getLanguageMeta(song.language);
                    const linkedVersions = getLinkedSongVersions(song, songs);

                    return (
                      <div className="relative inline-block">
                        <button
                          type="button"
                          onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-xs font-semibold transition-all shadow-sm hover:brightness-110 active:scale-95 cursor-pointer ${lMeta.badgeClass}`}
                          title="Versions disponibles"
                        >
                          <Globe className="w-3.5 h-3.5 shrink-0 opacity-80" />
                          <span>{lMeta.name}</span>
                          {linkedVersions.length > 0 && (
                            <span className="bg-white/20 text-white text-[10px] px-1 py-0.2 rounded font-bold">
                              +{linkedVersions.length}
                            </span>
                          )}
                          <ChevronDown className={`w-3 h-3 transition-transform ${showLanguageMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {showLanguageMenu && (
                          <>
                            <div 
                              className="fixed inset-0 z-40" 
                              onClick={() => setShowLanguageMenu(false)} 
                            />
                            <div className="absolute left-0 top-full mt-1.5 z-50 w-64 bg-[#18181C] border border-[#2E2E36] rounded-xl shadow-2xl p-2.5 backdrop-blur-md">
                              {/* En-tête */}
                              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1 pb-1.5 border-b border-[#282830] mb-2 flex items-center justify-between">
                                <span>Versions disponibles</span>
                                {linkedVersions.length > 0 && (
                                  <span className="text-[10px] font-mono font-normal text-indigo-400 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-500/30">
                                    {linkedVersions.length}
                                  </span>
                                )}
                              </div>

                              {/* Autres versions liées disponibles */}
                              {linkedVersions.length > 0 ? (
                                <div className="max-h-48 overflow-y-auto space-y-1 pr-0.5 custom-scrollbar">
                                  {linkedVersions.map((lv) => {
                                    const lvMeta = getLanguageMeta(lv.language);
                                    return (
                                      <button
                                        key={lv.id}
                                        type="button"
                                        onClick={() => {
                                          setSelectedSong(lv);
                                          setShowLanguageMenu(false);
                                        }}
                                        className="w-full py-1.5 px-2 rounded-lg bg-[#141416] hover:bg-[#202026] text-gray-300 hover:text-white transition-colors flex items-center justify-between text-xs border border-[#26262E] cursor-pointer text-left group"
                                      >
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${lvMeta.badgeClass}`}>
                                            {lvMeta.name}
                                          </span>
                                          <span className="truncate group-hover:text-blue-300">{lv.title}</span>
                                        </div>
                                        <span className="text-[10px] text-blue-400 shrink-0 ml-1 font-medium">Afficher</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="py-2.5 px-2 text-center text-xs text-gray-400 bg-[#141416] rounded-lg border border-[#26262E]">
                                  Aucune autre version disponible
                                </div>
                              )}

                              {/* Bouton pour ouvrir la fenêtre complète de gestion des versions */}
                              <div className="pt-2 mt-2 border-t border-[#282830]">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowLanguageMenu(false);
                                    setShowLanguageModal(true);
                                  }}
                                  className="w-full py-1.5 px-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Gérer les versions</span>
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>
                {song.artist && (
                  <div 
                    className="text-gray-300 font-medium break-words"
                    style={{ fontSize: `${displaySettings.typography.metadataSize}px` }}
                  >
                    {song.artist}
                  </div>
                )}
              </div>

              {/* Right: Boutons Réglages */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
                  className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all shadow-sm cursor-pointer ${
                    showSettingsDrawer
                      ? 'bg-blue-600 border-blue-500 text-white shadow-blue-500/20'
                      : 'bg-[#1C1C1E] hover:bg-[#28282C] border-[#333] hover:border-[#444] text-gray-200 hover:text-white'
                  }`}
                  title="Ouvrir les options et réglages du chant"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Réglages</span>
                </button>
              </div>
            </div>

            {/* Single Line Toolbar: Stylized Inline Controls for Tonalité, Transpose, Tempo, Durée, Mesure & Catégories */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              {/* Tonalité : Menu déroulant liste à 2 colonnes */}
              <div className="relative inline-block">
                <button
                  type="button"
                  onClick={() => setShowKeyMenu(!showKeyMenu)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#141416] hover:bg-[#1C1C20] border border-[#242428] hover:border-blue-500/50 text-gray-300 font-mono shadow-sm transition-all cursor-pointer"
                  style={{ fontSize: `${displaySettings.typography.metadataSize}px` }}
                  title="Choisir la tonalité"
                >
                  <Music className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="text-gray-400 font-sans text-xs hidden sm:inline">Tonalité :</span>
                  <span className="text-blue-400 font-bold font-mono text-xs">{baseKeyDisplay}</span>
                  {stageSettings.transposeOffset !== 0 && transposedKeyDisplay && (
                    <span className="text-amber-400 font-bold font-mono text-xs ml-1">{transposedKeyDisplay}</span>
                  )}
                  <ChevronDown className="w-3 h-3 text-blue-400/80" />
                </button>

                {showKeyMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowKeyMenu(false)} 
                    />
                    <div className="absolute left-0 top-full mt-1.5 z-50 w-64 bg-[#18181C] border border-[#2E2E36] rounded-xl shadow-2xl p-2.5 backdrop-blur-md">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {/* Colonne Gauche : Majeur */}
                        <div>
                          <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider px-1 pb-1.5 border-b border-[#282830] mb-1.5 text-center">
                            Majeur
                          </div>
                          <div className="grid grid-cols-1 gap-1 max-h-56 overflow-y-auto pr-0.5 custom-scrollbar">
                            {MAJOR_KEYS.map((k) => {
                              const isSelected = baseKey === k;
                              const displayLabel = stageSettings.notation === 'latin' ? (LATIN_NOTES[k] || k) : k;
                              return (
                                <button
                                  key={k}
                                  type="button"
                                  onClick={() => {
                                    handleSetBaseKey(k);
                                    setShowKeyMenu(false);
                                  }}
                                  className={`w-full py-1 px-2 rounded-md font-mono font-bold text-xs transition-colors flex items-center justify-between cursor-pointer ${
                                    isSelected
                                      ? 'bg-blue-600 text-white shadow-sm'
                                      : 'text-gray-300 hover:bg-[#25252D] hover:text-white'
                                  }`}
                                >
                                  <span>{displayLabel}</span>
                                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Colonne Droite : Mineur */}
                        <div className="border-l border-[#282830] pl-2">
                          <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider px-1 pb-1.5 border-b border-[#282830] mb-1.5 text-center">
                            Mineur
                          </div>
                          <div className="grid grid-cols-1 gap-1 max-h-56 overflow-y-auto pr-0.5 custom-scrollbar">
                            {MINOR_KEYS.map((k) => {
                              const isSelected = baseKey === k;
                              const displayLabel = stageSettings.notation === 'latin' ? (LATIN_NOTES[k] || k) : k;
                              return (
                                <button
                                  key={k}
                                  type="button"
                                  onClick={() => {
                                    handleSetBaseKey(k);
                                    setShowKeyMenu(false);
                                  }}
                                  className={`w-full py-1 px-2 rounded-md font-mono font-bold text-xs transition-colors flex items-center justify-between cursor-pointer ${
                                    isSelected
                                      ? 'bg-indigo-600 text-white shadow-sm'
                                      : 'text-gray-300 hover:bg-[#25252D] hover:text-white'
                                  }`}
                                >
                                  <span>{displayLabel}</span>
                                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Transposition rapide : Boutons +/- demi-ton en temps réel (Placé côte à côte avec Tonalité) */}
              <div 
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-gray-300 font-mono shadow-sm transition-colors ${
                  stageSettings.transposeOffset !== 0
                    ? 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                    : 'bg-[#141416] border-[#242428]'
                }`}
                style={{ fontSize: `${displaySettings.typography.metadataSize}px` }}
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-amber-400 shrink-0" title="Transposition" />
                <span className="text-amber-400/90 font-sans text-xs shrink-0 hidden sm:inline">Transpose :</span>
                
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleTransposeDelta(-1)}
                    className="w-5 h-5 rounded bg-[#202024] hover:bg-[#2C2C32] active:scale-95 text-gray-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                    title="Transposer d'un demi-ton vers le bas"
                  >
                    <Minus className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={handleResetTranspose}
                    className={`min-w-[24px] px-1.5 py-0.5 rounded font-mono font-bold text-xs text-center transition-colors cursor-pointer ${
                      stageSettings.transposeOffset !== 0
                        ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                    title={stageSettings.transposeOffset !== 0 ? "Cliquer pour réinitialiser la transposition à 0" : "Transposition à 0"}
                  >
                    {stageSettings.transposeOffset === 0 
                      ? '0' 
                      : (stageSettings.transposeOffset > 0 ? `+${stageSettings.transposeOffset}` : `${stageSettings.transposeOffset}`)}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTransposeDelta(1)}
                    className="w-5 h-5 rounded bg-[#202024] hover:bg-[#2C2C32] active:scale-95 text-gray-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                    title="Transposer d'un demi-ton vers le haut"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Métronome Visuel & Sonore : Tempo BPM, Signature Rythmique, LEDs de battement & Tap */}
              <MetronomeStageControl
                initialBpm={effectiveTempo}
                initialTimeSignature={song.timeSignature || parsedData?.timeSignature || '4/4'}
                onBpmChange={handleUpdateTempo}
                onTimeSignatureChange={handleUpdateTimeSignature}
                songTitle={song.title}
              />

              {/* Durée : Saisie manuelle directe */}
              <div 
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#141416] border border-[#242428] text-gray-300 font-mono shadow-sm"
                style={{ fontSize: `${displaySettings.typography.metadataSize}px` }}
              >
                <div className="flex items-center gap-1 text-cyan-400">
                  <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="text-cyan-400 font-sans text-xs hidden sm:inline">
                    Durée :
                  </span>
                </div>

                {/* Editable Duration Input */}
                <input
                  type="text"
                  value={inlineDurationValue}
                  onChange={(e) => setInlineDurationValue(e.target.value)}
                  onBlur={() => {
                    if (inlineDurationValue.trim()) {
                      handleSetDurationCustom(inlineDurationValue.trim());
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  placeholder="03:30"
                  className="w-14 bg-[#18181C] hover:bg-[#222228] text-cyan-300 font-bold font-mono text-xs border border-cyan-500/30 focus:border-cyan-400 rounded-md px-1.5 py-0.5 text-center focus:outline-none shadow-sm transition-all"
                  title="Cliquer pour entrer ou modifier la durée ex: 03:30"
                />
              </div>


              {/* Bouton Note / Instructions si aucune note n'est encore rédigée */}
              {!song.notes && !isEditingNotes && (
                <button
                  type="button"
                  onClick={() => {
                    setNotesInput('');
                    setIsEditingNotes(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#141416] hover:bg-[#1C1C20] border border-[#242428] hover:border-amber-500/50 text-gray-400 hover:text-amber-300 font-mono shadow-sm transition-all cursor-pointer"
                  style={{ fontSize: `${displaySettings.typography.metadataSize}px` }}
                  title="Ajouter une note ou instruction pour ce chant"
                >
                  <Pencil className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
                  <span className="text-gray-300 font-sans text-xs hidden sm:inline">Note</span>
                </button>
              )}


              {/* Categories / Tags : sur sa propre ligne en mobile et à la suite sur écran large */}
              {song.tags && song.tags.length > 0 && (
                <div className="w-full sm:w-auto flex items-center gap-1.5 flex-wrap pt-1 sm:pt-0 sm:border-l sm:border-[#2A2A2E] sm:pl-2">
                  {song.tags.map((cat, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#1C1C1E] border border-[#2A2A2D] text-gray-300 text-xs font-medium"
                    >
                      <Tag className="w-3 h-3 text-blue-400" />
                      <span>{cat}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Note / Instructions Section */}
            {isEditingNotes ? (
              <div className="mt-3 p-3 rounded-lg bg-[#141418] border border-amber-500/40 shadow-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Instructions / Notes pour le chant :</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingNotes(false)}
                    className="text-gray-400 hover:text-white p-0.5 rounded cursor-pointer transition-colors"
                    title="Fermer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <textarea
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Ex: Commencer directement par le refrain doux au piano..."
                  rows={2}
                  className="w-full bg-[#0D0D10] text-gray-200 text-xs border border-[#2E2E36] focus:border-amber-500/60 rounded-md p-2 focus:outline-none custom-scrollbar"
                  autoFocus
                />
                <div className="flex items-center justify-between gap-2 pt-1">
                  {song.notes ? (
                    <button
                      type="button"
                      onClick={handleDeleteNotes}
                      className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-950/20 transition-colors cursor-pointer flex items-center gap-1"
                      title="Supprimer la note"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Supprimer</span>
                    </button>
                  ) : <div />}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingNotes(false)}
                      className="px-2.5 py-1 rounded text-xs font-semibold text-gray-400 hover:text-white hover:bg-[#202026] transition-colors cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveNotes}
                      className="px-3 py-1 rounded text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow-sm flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                      <span>Enregistrer</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : song.notes ? (
              <div 
                className="mt-3 p-2.5 rounded-lg bg-[#111112] border border-[#222224] flex items-start justify-between gap-3 group transition-all"
                style={{ fontSize: `${Math.max(11, displaySettings.typography.metadataSize)}px` }}
              >
                <div className="text-gray-300 font-sans italic flex-1">
                  <span className="text-amber-400/90 font-semibold not-italic mr-1.5">Note :</span>
                  {song.notes}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNotesInput(song.notes || '');
                    setIsEditingNotes(true);
                  }}
                  className="p-1 rounded bg-[#1C1C1E] hover:bg-[#2A2A2E] text-gray-400 hover:text-amber-300 border border-[#2C2C30] hover:border-amber-500/40 shrink-0 transition-colors cursor-pointer"
                  title="Modifier les instructions / notes"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : null}
          </div>

          {/* Structured ChordPro Sections */}
          <div className={stageSettings.columns === 2 ? 'grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6' : 'space-y-6'}>
            {parsedData.sections.map((section, sIdx) => {
              const secColor = getSectionColor(section.type, displaySettings.sectionColors);
              const sectionRepeat = (setlistOverride?.sectionRepeats && setlistOverride.sectionRepeats[sIdx] !== undefined)
                ? setlistOverride.sectionRepeats[sIdx]
                : (section.repeat || 1);

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
                  {/* Section Title Header & Vocal Arrangement Pastille & Repeat Badge */}
                  <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
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

                      {/* Section Repeat Selector */}
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-colors ${
                          sectionRepeat > 1 
                            ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300' 
                            : 'bg-[#18181B] border-[#2B2B30] text-gray-400 hover:border-gray-600'
                        }`}
                      >
                        <Repeat className={`w-3 h-3 ${sectionRepeat > 1 ? 'text-emerald-400' : 'text-gray-500'} shrink-0`} />
                        <select
                          value={sectionRepeat}
                          onChange={(e) => handleUpdateSectionRepeat(sIdx, parseInt(e.target.value, 10))}
                          className={`bg-transparent text-xs font-bold font-mono focus:outline-none cursor-pointer ${
                            sectionRepeat > 1 ? 'text-emerald-300' : 'text-gray-400 hover:text-gray-200'
                          }`}
                          title="Nombre de répétitions pour cette section"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 16].map((n) => (
                            <option key={n} value={n} className="bg-[#141416] text-white">
                              x{n}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Pastilles Arrangement Vocal alignées côte à côte */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {((section.vocals && section.vocals.length > 0) || section.vocal) ? (
                        <>
                          {(section.vocals && section.vocals.length > 0 ? section.vocals : [section.vocal!]).map((voc, vIdx) => {
                            const vStyle = getVocalBadgeStyle(voc);
                            return (
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
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${vStyle.bg} border ${vStyle.border} ${vStyle.text} text-xs font-semibold shadow-xs select-none transition-all active:scale-95 cursor-pointer`}
                                title="Modifier l'arrangement vocal"
                              >
                                <Mic className={`w-3.5 h-3.5 ${vStyle.icon} shrink-0`} />
                                <span>{voc}</span>
                              </button>
                            );
                          })}
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
                            className="w-6 h-6 flex items-center justify-center rounded-full bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-400 hover:text-cyan-300 border border-[#333] hover:border-cyan-500/50 transition-colors shadow-xs cursor-pointer"
                            title="Ajouter d'autres voix à cette section"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </>
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
                              ? transposeChord(item.chord, totalTransposeSemitones, stageSettings.notation) 
                              : '';

                            return (
                              <div key={iIdx} className="inline-flex flex-col">
                                {/* Chord on top - Clickable to open Chord Library Diagram */}
                                {stageSettings.showChords && (
                                  <button 
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (transposedChord) {
                                        setChordModalData({
                                          isOpen: true,
                                          chord: transposedChord
                                        });
                                      }
                                    }}
                                    className={`chord-badge font-mono font-bold text-blue-400 hover:text-cyan-300 hover:underline select-none leading-none mb-1 pr-1 text-left inline-flex items-center cursor-pointer transition-all active:scale-95 group/chord ${
                                      transposedChord ? 'opacity-100' : 'opacity-0 pointer-events-none'
                                    }`}
                                    style={{ fontSize: `${displaySettings.typography.chordSize}px` }}
                                    title={transposedChord ? `Diagramme de l'accord ${transposedChord}` : undefined}
                                  >
                                    {transposedChord || '\u00A0'}
                                  </button>
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
            type="button"
            onClick={onPrev}
            className="p-2.5 rounded-lg bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-200 border border-[#333] shadow-lg backdrop-blur-md transition-all active:scale-95 flex items-center justify-center cursor-pointer"
            title="Chant précédent"
            aria-label="Chant précédent"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {hasNext && onNext && (
          <button
            type="button"
            onClick={onNext}
            className="p-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 backdrop-blur-md transition-all active:scale-95 flex items-center justify-center cursor-pointer"
            title="Chant suivant"
            aria-label="Chant suivant"
          >
            <ChevronRight className="w-4 h-4" />
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
                <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl bg-[#0D0D0E] border border-[#222226]">
                  {vocalModalSection.vocals.map((voc) => {
                    const vStyle = getVocalBadgeStyle(voc);
                    return (
                      <span
                        key={voc}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${vStyle.bg} border ${vStyle.border} ${vStyle.text} text-xs font-semibold shadow-xs`}
                      >
                        <Mic className={`w-3.5 h-3.5 ${vStyle.icon}`} />
                        <span>{voc}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveVocalRole(voc)}
                          className="p-0.5 hover:bg-white/10 rounded-full text-current hover:text-white transition-colors ml-0.5"
                          title={`Supprimer ${voc}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
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
                Pupitres & Voix - sélection multiple :
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
                Ajouter une voix personnalisée : Solo Sarah, Voix 4...
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



      {/* Chord Library Modal */}
      <ChordModal
        isOpen={chordModalData.isOpen}
        onClose={() => setChordModalData(prev => ({ ...prev, isOpen: false }))}
        initialChord={chordModalData.chord}
        songChords={allSongChords}
        notation={stageSettings.notation}
        onSelectChord={(ch) => setChordModalData(prev => ({ ...prev, chord: ch }))}
      />

      {/* Language Version & Relations Modal */}
      {song && (
        <LanguageVersionModal
          song={song}
          isOpen={showLanguageModal}
          onClose={() => setShowLanguageModal(false)}
        />
      )}

    </div>
  );
};
