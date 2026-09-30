import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Song } from '../types';
import { 
  parseChordPro, 
  transposeChord, 
  metronome,
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
import { getSectionColor, getSectionBorderStyles } from '../utils/displayDefaults';
import { 
  requestFullscreenSafe, 
  exitFullscreenSafe, 
  addFullscreenChangeListener 
} from '../utils/fullscreen';
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
  RectangleVertical,
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
  ChevronUp,
  Trash2,
  Clock,
  Layers,
  Globe,
  Repeat,
  ZoomIn,
  ZoomOut,
  SlidersHorizontal,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import { SetlistPdfModal } from './SetlistPdfModal';
import { ChordModal } from './ChordModal';
import { LanguageVersionModal } from './LanguageVersionModal';
import { PRESET_LANGUAGES, getLanguageMeta, getLinkedSongVersions } from '../utils/languageUtils';

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

const TRANSPOSE_DOWN_STEPS = [-1, -2, -3, -4, -5, -6, -7, -8, -9, -10, -11, -12];
const TRANSPOSE_UP_STEPS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

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
    updateSetlist,
    updateSetlistSongOverride,
    removeSetlistSongOverride,
    stageSettings, 
    updateStageSettings, 
    displaySettings,
    updateDisplaySettings,
    setActiveTab, 
    activeTab,
    currentUser,
    currentGroup,
    setActiveSetlistIndex,
    canManageSongs
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


  // Minimalist Metadata Pop-up Modals States
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showTempoModal, setShowTempoModal] = useState(false);
  const [tempoModalValue, setTempoModalValue] = useState<number>(song?.tempo || 100);
  const [showTimeSigModal, setShowTimeSigModal] = useState(false);
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [durationModalMode, setDurationModalMode] = useState<'auto' | 'custom'>('auto');
  const [durationModalInput, setDurationModalInput] = useState('');

  // Setlist Context & Overrides Determination
  const isInSetlist = Boolean(setlistId || setlistContextName || setlistPosition);
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

  // Setlist Version Choice Modal & Actions
  const [showSetlistVersionModal, setShowSetlistVersionModal] = useState(false);
  const [targetVersionId, setTargetVersionId] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const showFeedbackToast = useCallback((msg: string) => {
    setFeedbackToast(msg);
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => {
      setFeedbackToast(null);
    }, 3500);
  }, []);

  const getCurrentIndexInSetlist = useCallback((): number => {
    if (setlistPosition && setlistPosition.current > 0) {
      return setlistPosition.current - 1;
    }
    if (currentSetlist?.songIds && song) {
      const idx = currentSetlist.songIds.indexOf(song.id);
      if (idx >= 0) return idx;
    }
    return 0;
  }, [setlistPosition, currentSetlist, song]);

  const handleReplaceCurrentSongInSetlist = useCallback(async (targetSong: Song) => {
    if (!currentSetlist || !song) return;
    const idx = getCurrentIndexInSetlist();
    const newSongIds = [...(currentSetlist.songIds || [])];
    
    if (idx >= 0 && idx < newSongIds.length) {
      newSongIds[idx] = targetSong.id;
    } else {
      newSongIds.push(targetSong.id);
    }

    let updatedOverrides = currentSetlist.songOverrides ? { ...currentSetlist.songOverrides } : undefined;
    if (updatedOverrides && updatedOverrides[song.id]) {
      updatedOverrides = {
        ...updatedOverrides,
        [targetSong.id]: { ...updatedOverrides[song.id] }
      };
    }

    await updateSetlist(currentSetlist.id, {
      songIds: newSongIds,
      ...(updatedOverrides ? { songOverrides: updatedOverrides } : {})
    });

    setSelectedSong(targetSong);
    if (setActiveSetlistIndex) {
      setActiveSetlistIndex(idx >= 0 ? idx : 0);
    }

    setShowSetlistVersionModal(false);
    setShowLanguageMenu(false);
    showFeedbackToast(`« ${targetSong.title} » remplace désormais ce chant dans la setlist.`);
  }, [currentSetlist, song, getCurrentIndexInSetlist, updateSetlist, setSelectedSong, setActiveSetlistIndex, showFeedbackToast]);

  const handleAddAfterCurrentSongInSetlist = useCallback(async (targetSong: Song, navigateToIt = true) => {
    if (!currentSetlist || !song) return;
    const idx = getCurrentIndexInSetlist();
    const insertIdx = idx + 1;
    const newSongIds = [...(currentSetlist.songIds || [])];
    newSongIds.splice(insertIdx, 0, targetSong.id);

    await updateSetlist(currentSetlist.id, {
      songIds: newSongIds
    });

    setShowSetlistVersionModal(false);
    setShowLanguageMenu(false);

    if (navigateToIt) {
      setSelectedSong(targetSong);
      if (setActiveSetlistIndex) {
        setActiveSetlistIndex(insertIdx);
      }
    }

    showFeedbackToast(`« ${targetSong.title} » a été ajouté à la suite dans la setlist (position ${insertIdx + 1}/${newSongIds.length}).`);
  }, [currentSetlist, song, getCurrentIndexInSetlist, updateSetlist, setSelectedSong, setActiveSetlistIndex, showFeedbackToast]);

  const handleViewOnlyVersion = useCallback((targetSong: Song) => {
    setSelectedSong(targetSong);
    setShowSetlistVersionModal(false);
    setShowLanguageMenu(false);
    showFeedbackToast(`Affichage de la version « ${targetSong.title} » (non ajoutée à la setlist).`);
  }, [setSelectedSong, showFeedbackToast]);

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

  // Semitone difference for song base key
  const baseKeySemitones = useMemo(() => {
    return getSemitoneDifference(catalogBaseKey, effectiveBaseKey);
  }, [catalogBaseKey, effectiveBaseKey]);

  // Piano-style Transposition: chords displayed in the lyrics remain UNCHANGED by piano transpose offset!
  const visualChordTransposeSemitones = baseKeySemitones % 12;

  // Real acoustic / auditory pitch semitones (for sound synthesis when played)
  const auditoryTransposeSemitones = (baseKeySemitones + effectiveTransposeOffset) % 12;

  // Extract all unique chords in the current song (as written / fingered)
  const allSongChords = useMemo(() => {
    if (!parsedData) return [];
    const set = new Set<string>();
    parsedData.sections.forEach(sec => {
      sec.lines.forEach(l => {
        l.items.forEach(item => {
          if (item.chord) {
            const chordStr = transposeChord(item.chord, visualChordTransposeSemitones, stageSettings.notation);
            if (chordStr && chordStr.trim()) {
              set.add(chordStr.trim());
            }
          }
        });
      });
    });
    return Array.from(set);
  }, [parsedData, visualChordTransposeSemitones, stageSettings.notation]);

  // Local inline duration, tempo, key & notes state
  const [inlineDurationValue, setInlineDurationValue] = useState<string>('03:30');
  const [inlineTempoValue, setInlineTempoValue] = useState<string>('120');
  const [showKeyMenu, setShowKeyMenu] = useState(false);
  const [showTransposeMenu, setShowTransposeMenu] = useState(false);
  const [showTempoMenu, setShowTempoMenu] = useState(false);
  const [showZoomMenu, setShowZoomMenu] = useState(false);

  // Refs for toolbar buttons to calculate viewport-safe placement
  const keyButtonRef = useRef<HTMLButtonElement>(null);
  const transposeButtonRef = useRef<HTMLButtonElement>(null);
  const tempoButtonRef = useRef<HTMLButtonElement>(null);
  const zoomButtonRef = useRef<HTMLButtonElement>(null);

  const calculatePopoverPos = (btn: HTMLButtonElement | null) => {
    if (!btn) return { right: 0, width: 288 };
    const rect = btn.getBoundingClientRect();
    const popoverWidth = Math.min(288, window.innerWidth - 24);
    
    // Desired viewport position: centered under button
    let desiredLeft = rect.left + (rect.width / 2) - (popoverWidth / 2);
    // Clamp to viewport edges with 12px margin
    if (desiredLeft < 12) desiredLeft = 12;
    if (desiredLeft + popoverWidth > window.innerWidth - 12) {
      desiredLeft = window.innerWidth - 12 - popoverWidth;
    }
    
    // Relative to the button's relative parent container
    const relativeLeft = desiredLeft - rect.left;
    return {
      left: `${relativeLeft}px`,
      width: `${popoverWidth}px`,
    };
  };

  const [tempoPopoverStyle, setTempoPopoverStyle] = useState<React.CSSProperties>({ right: 0 });
  const [transposePopoverStyle, setTransposePopoverStyle] = useState<React.CSSProperties>({ left: 0 });
  const [keyPopoverStyle, setKeyPopoverStyle] = useState<React.CSSProperties>({ left: 0 });
  const [zoomPopoverStyle, setZoomPopoverStyle] = useState<React.CSSProperties>({ left: 0 });

  useEffect(() => {
    if (showTempoMenu) {
      const update = () => setTempoPopoverStyle(calculatePopoverPos(tempoButtonRef.current));
      update();
      window.addEventListener('resize', update);
      window.addEventListener('scroll', update, true);
      return () => {
        window.removeEventListener('resize', update);
        window.removeEventListener('scroll', update, true);
      };
    }
  }, [showTempoMenu]);

  useEffect(() => {
    if (showTransposeMenu) {
      const update = () => setTransposePopoverStyle(calculatePopoverPos(transposeButtonRef.current));
      update();
      window.addEventListener('resize', update);
      window.addEventListener('scroll', update, true);
      return () => {
        window.removeEventListener('resize', update);
        window.removeEventListener('scroll', update, true);
      };
    }
  }, [showTransposeMenu]);

  useEffect(() => {
    if (showKeyMenu) {
      const update = () => setKeyPopoverStyle(calculatePopoverPos(keyButtonRef.current));
      update();
      window.addEventListener('resize', update);
      window.addEventListener('scroll', update, true);
      return () => {
        window.removeEventListener('resize', update);
        window.removeEventListener('scroll', update, true);
      };
    }
  }, [showKeyMenu]);

  useEffect(() => {
    if (showZoomMenu) {
      const update = () => setZoomPopoverStyle(calculatePopoverPos(zoomButtonRef.current));
      update();
      window.addEventListener('resize', update);
      window.addEventListener('scroll', update, true);
      return () => {
        window.removeEventListener('resize', update);
        window.removeEventListener('scroll', update, true);
      };
    }
  }, [showZoomMenu]);

  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('melobook_header_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleHeaderCollapsed = () => {
    setIsHeaderCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('melobook_header_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const zoomPercentage = Math.round(((displaySettings.typography?.lyricsSize || 18) / 18) * 100);

  const handleSetZoomPercentage = (newPct: number) => {
    const clampedPct = Math.max(65, Math.min(175, newPct));
    const factor = clampedPct / 100;

    // Scale all typography elements proportionally
    const newLyricsSize = Math.max(11, Math.min(42, Math.round(18 * factor)));
    const newChordSize = Math.max(10, Math.min(38, Math.round(16 * factor)));
    const newHeaderSize = Math.max(9, Math.min(26, Math.round(12 * factor)));

    updateDisplaySettings({
      typography: {
        lyricsSize: newLyricsSize,
        chordSize: newChordSize,
        headerSize: newHeaderSize,
      }
    }, true);
  };

  const handleResetZoom = () => {
    updateDisplaySettings({
      typography: {
        lyricsSize: 18,
        chordSize: 16,
        headerSize: 12,
      }
    }, true);
  };

  useEffect(() => {
    setInlineDurationValue(effectiveDuration);
  }, [effectiveDuration]);

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

  const handleAdjustDurationSeconds = async (deltaSeconds: number) => {
    const currentSec = parseDurationToSeconds(inlineDurationValue || effectiveDuration);
    const newSec = Math.max(30, currentSec + deltaSeconds);
    const formatted = formatDurationToMMSS(newSec);
    await handleSetDurationCustom(formatted);
  };

  const handleEstimateAutoDuration = async () => {
    if (!parsedData || !song) return;
    const chordLinesCount = parsedData.sections.reduce((acc, sec) => {
      return acc + sec.lines.filter(l => l.chords.length > 0 || l.lyrics.trim().length > 0).length;
    }, 0);
    const beatsPerMeasure = 4;
    const estimatedMeasures = Math.max(16, chordLinesCount * 2);
    const beats = estimatedMeasures * beatsPerMeasure;
    const bpm = effectiveTempo || 120;
    const seconds = Math.round((beats / bpm) * 60);
    const formatted = formatDurationToMMSS(Math.max(60, Math.min(900, seconds)));
    await handleSetDurationCustom(formatted);
  };


  // Key & Transposition Handlers
  const handleTransposeDelta = async (delta: number) => {
    const newOffset = (effectiveTransposeOffset + delta) % 12;
    if (isSetlistMode && currentSetlist && song && canManageSongs) {
      await updateSetlistSongOverride(currentSetlist.id, song.id, { transposeOffset: newOffset });
    } else {
      updateStageSettings({ transposeOffset: newOffset });
    }
  };

  const handleResetTranspose = async () => {
    if (isSetlistMode && currentSetlist && song && canManageSongs) {
      await updateSetlistSongOverride(currentSetlist.id, song.id, { transposeOffset: 0 });
    } else {
      updateStageSettings({ transposeOffset: 0 });
    }
  };

  const handleSetTransposeOffset = async (newOffset: number) => {
    if (isSetlistMode && currentSetlist && song && canManageSongs) {
      await updateSetlistSongOverride(currentSetlist.id, song.id, { transposeOffset: newOffset });
    } else {
      updateStageSettings({ transposeOffset: newOffset });
    }
  };

  const handleSetBaseKey = async (targetKey: string) => {
    if (!song) return;

    if (isSetlistMode && currentSetlist && canManageSongs) {
      await updateSetlistSongOverride(currentSetlist.id, song.id, { key: targetKey, transposeOffset: 0 });
    } else if (canManageSongs) {
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
    } else {
      // Pour une personne non connectée ou membre invité :
      // On transpose la chanson en mémoire pour sa propre consultation et jeu, sans modifier le répertoire de la bibliothèque
      const currentBaseKey = (parsedData?.hasExplicitKey && parsedData.key)
        ? parsedData.key
        : (song.key || parsedData?.key || 'C');

      const semitones = getSemitoneDifference(currentBaseKey, targetKey);
      const updatedContent = transposeChordProText(song.contentChordPro, semitones, 'standard', targetKey);

      updateStageSettings({ transposeOffset: 0 });
      if (selectedSong && selectedSong.id === song.id) {
        setSelectedSong({ ...selectedSong, key: targetKey, contentChordPro: updatedContent });
      }
      showFeedbackToast(`Tonalité changée en ${targetKey} (lecture en cours)`);
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

  // Fullscreen event synchronization
  useEffect(() => {
    return addFullscreenChangeListener((isFs) => {
      setIsFullscreen(isFs);
    });
  }, []);

  // Fullscreen Handler
  const toggleFullscreen = (targetState?: boolean) => {
    const shouldBeFs = targetState !== undefined ? targetState : !isFullscreen;
    if (shouldBeFs) {
      requestFullscreenSafe(document.documentElement);
      setIsFullscreen(true);
    } else {
      exitFullscreenSafe();
      setIsFullscreen(false);
    }
  };

  const handleSetColumns = (cols: 1 | 2 | 3 | 4 | 5) => {
    updateStageSettings({ columns: cols });
  };

  const handleSetOneColumnMode = () => {
    updateStageSettings({ columns: 1 });
    if (isFullscreen) {
      toggleFullscreen(false);
    }
  };

  const handleToggleFullscreenMode = () => {
    if (isFullscreen) {
      toggleFullscreen(false);
    } else {
      toggleFullscreen(true);
    }
  };

  const numColumns = (typeof stageSettings.columns === 'number' && stageSettings.columns >= 1 && stageSettings.columns <= 5)
    ? stageSettings.columns
    : (stageSettings.columns === 'auto' ? 2 : 1);

  const isWideLayout = isFullscreen || numColumns > 1;

  const currentSectionSpacing = displaySettings.typography?.sectionSpacing !== undefined
    ? displaySettings.typography.sectionSpacing
    : 4;

  const handleUpdateSectionSpacing = (newSpacing: number) => {
    updateDisplaySettings({
      typography: {
        ...displaySettings.typography,
        sectionSpacing: Math.max(0, Math.min(48, newSpacing))
      }
    });
  };

  const getColumnsGridClass = (cols: number) => {
    switch (cols) {
      case 1:
        return 'w-full flex flex-col';
      case 2:
        return 'grid grid-cols-1 md:grid-cols-2 gap-x-6 lg:gap-x-8 items-start';
      case 3:
        return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 lg:gap-x-6 items-start';
      case 4:
        return 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 lg:gap-x-5 items-start';
      case 5:
        return 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-x-3 lg:gap-x-4 items-start';
      default:
        return 'w-full flex flex-col';
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
    : (isFullscreen ? 'fixed inset-0 top-0 z-50' : 'fixed inset-0 top-16 md:top-16 z-30');

  return (
    <div className={`${containerClasses} flex flex-col ${themeClasses} select-none transition-colors`}>
      
      {/* Progress Bar for Auto-Scroll */}
      <div className="no-print w-full h-0.5 bg-[#222224] overflow-hidden">
        <div 
          className="h-full bg-blue-600 transition-all duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Settings Drawer (Overlay) */}
      {showSettingsDrawer && (
        <div className="no-print bg-[#111112] border-b border-[#242428] px-3 sm:px-4 py-2 sm:py-2.5 text-xs shadow-2xl z-30 animate-in fade-in slide-in-from-top-1 duration-150">
          
          {/* Header with Title and Close Button - ultra-compact single line */}
          <div className="flex items-center justify-between gap-2 pb-1.5 mb-2 border-b border-[#222226]">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5 h-5 rounded-md bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                <Settings2 className="w-3 h-3 text-blue-400" />
              </div>
              <span className="font-bold text-gray-100 text-xs sm:text-sm truncate">
                Réglages du chant
              </span>
              {song.title && (
                <span className="text-gray-400 text-[11px] hidden md:inline truncate max-w-xs">
                  • {stripParentheses(song.title)}
                </span>
              )}
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowSettingsDrawer(false)}
              className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-[#222226] border border-transparent hover:border-[#333] transition-colors cursor-pointer shrink-0"
              title="Fermer les réglages"
              aria-label="Fermer les réglages"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Outils & Affichage de scène - compact layout */}
          <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1.5 text-xs">
            {/* Disposition : Choix de 1 à 5 colonnes */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-gray-400 text-[11px] font-medium shrink-0">Disposition :</span>
              <div className="inline-flex items-center bg-[#1C1C1E] p-0.5 rounded-md border border-[#333]">
                {([1, 2, 3, 4, 5] as const).map((cols) => (
                  <button
                    key={cols}
                    type="button"
                    id={`drawer-stage-${cols}col`}
                    onClick={() => handleSetColumns(cols)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
                      numColumns === cols
                        ? 'bg-blue-600 text-white font-semibold shadow-xs'
                        : 'text-gray-400 hover:text-white'
                    }`}
                    title={`Affichage sur ${cols} colonne${cols > 1 ? 's' : ''}`}
                  >
                    <span>{cols} {cols === 1 ? 'col' : 'cols'}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Réglage de la taille de police : Bouton avec jauge déroulante, jauge rapide et presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-gray-400 text-[11px] font-medium shrink-0 flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3 text-blue-400" />
                <span>Taille :</span>
              </span>

              {/* Bouton unique avec jauge / slider déroulant */}
              <div className="relative inline-block">
                <button
                  ref={zoomButtonRef}
                  type="button"
                  id="drawer-stage-zoom-btn"
                  onClick={() => {
                    const next = !showZoomMenu;
                    setShowZoomMenu(next);
                    if (next) {
                      setZoomPopoverStyle(calculatePopoverPos(zoomButtonRef.current));
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer border ${
                    showZoomMenu
                      ? 'bg-blue-600 text-white font-semibold border-blue-500 shadow-xs ring-1 ring-blue-400/40'
                      : 'bg-[#1C1C1E] border-[#333] hover:border-blue-500/50 text-gray-200 hover:text-white'
                  }`}
                  title="Cliquer pour afficher la jauge de zoom complète"
                >
                  <span className="font-mono font-bold text-blue-400">{zoomPercentage}%</span>
                  <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${showZoomMenu ? 'rotate-180 text-blue-300' : ''}`} />
                </button>

                {showZoomMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowZoomMenu(false)} 
                    />
                    <div 
                      style={zoomPopoverStyle}
                      className="absolute top-full mt-1.5 z-50 w-72 max-w-[calc(100vw-24px)] bg-[#16161A] border border-[#2E2E36] rounded-xl shadow-2xl p-3 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 box-border text-left"
                    >
                      {/* En-tête Popover */}
                      <div className="text-[11px] font-semibold text-gray-400 pb-2 mb-2.5 border-b border-[#282830] flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
                          <span className="text-gray-200">Taille de tous les textes</span>
                        </div>
                        <span className="text-[11px] text-blue-400 font-mono font-bold bg-blue-950/50 border border-blue-500/40 px-1.5 py-0.5 rounded">
                          {zoomPercentage}%
                        </span>
                      </div>

                      {/* Jauge / Slider avec boutons - / + */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1.5">
                          <span className="flex items-center gap-1 font-medium text-gray-300">
                            <Type className="w-3 h-3 text-gray-500" />
                            <span>Jauge de zoom</span>
                          </span>
                          <button
                            type="button"
                            onClick={handleResetZoom}
                            className="text-[10px] text-blue-400 hover:text-blue-300 cursor-pointer transition-colors"
                            title="Rétablir à 100% (par défaut)"
                          >
                            100% (Défaut)
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSetZoomPercentage(zoomPercentage - 5)}
                            disabled={zoomPercentage <= 65}
                            className="p-1.5 rounded-lg bg-[#202026] hover:bg-[#282832] text-gray-300 disabled:opacity-30 border border-[#30303A] cursor-pointer shrink-0 transition-colors"
                            title="Réduire (-5%)"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          {/* Slider Track / Range Input */}
                          <div className="relative flex-1 flex items-center py-1">
                            <input
                              type="range"
                              min="65"
                              max="175"
                              step="5"
                              value={zoomPercentage}
                              onChange={(e) => handleSetZoomPercentage(Number(e.target.value))}
                              className="w-full h-2 bg-[#26262E] rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSetZoomPercentage(zoomPercentage + 5)}
                            disabled={zoomPercentage >= 175}
                            className="p-1.5 rounded-lg bg-[#202026] hover:bg-[#282832] text-gray-300 disabled:opacity-30 border border-[#30303A] cursor-pointer shrink-0 transition-colors"
                            title="Agrandir (+5%)"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Préréglages rapides (Presets) */}
                      <div className="text-[10px] text-gray-400 font-semibold mb-1.5 uppercase tracking-wider flex items-center justify-between">
                        <span>Préréglages rapides</span>
                        <span className="text-[9px] text-gray-500 font-normal">1 clic</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 text-xs mb-3">
                        {[
                          { label: 'Petit', pct: 85 },
                          { label: 'Standard', pct: 100 },
                          { label: 'Grand', pct: 120 },
                          { label: 'Très grand', pct: 140 },
                        ].map((preset) => {
                          const isActive = Math.abs(zoomPercentage - preset.pct) <= 4;
                          return (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => handleSetZoomPercentage(preset.pct)}
                              className={`py-1.5 px-1 rounded-lg transition-all cursor-pointer flex flex-col items-center justify-center ${
                                isActive
                                  ? 'bg-blue-600 text-white font-bold shadow-xs border border-blue-400/50 ring-1 ring-blue-400/30'
                                  : 'bg-[#202026] text-gray-300 hover:bg-[#282832] hover:text-white border border-[#2E2E38]'
                              }`}
                              title={`Préréglage ${preset.label} (${preset.pct}%)`}
                            >
                              <span className="text-[11px] font-medium leading-tight">{preset.label}</span>
                              <span className={`text-[9px] font-mono leading-tight ${isActive ? 'text-blue-100' : 'text-gray-500'}`}>
                                {preset.pct}%
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Détail en temps réel de tous les textes ajustés */}
                      <div className="pt-2 border-t border-[#24242C] grid grid-cols-4 gap-1 text-center font-mono text-[10px]">
                        <div className="p-1 rounded bg-[#18181E] border border-[#282832]">
                          <span className="text-gray-400 block text-[9px] font-sans">Paroles</span>
                          <span className="text-white font-semibold">{displaySettings.typography?.lyricsSize || 18}px</span>
                        </div>
                        <div className="p-1 rounded bg-[#18181E] border border-[#282832]">
                          <span className="text-blue-400/90 block text-[9px] font-sans">Accords</span>
                          <span className="text-blue-300 font-semibold">{displaySettings.typography?.chordSize || 16}px</span>
                        </div>
                        <div className="p-1 rounded bg-[#18181E] border border-[#282832]">
                          <span className="text-amber-400/90 block text-[9px] font-sans">Sections</span>
                          <span className="text-amber-300 font-semibold">{displaySettings.typography?.headerSize || 12}px</span>
                        </div>
                        <div className="p-1 rounded bg-[#18181E] border border-[#282832]">
                          <span className="text-emerald-400/90 block text-[9px] font-sans">Voix</span>
                          <span className="text-emerald-300 font-semibold">{Math.max(10, Math.round((displaySettings.typography?.headerSize || 12) * 0.95))}px</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Jauge rapide directe dans les réglages */}
              <div className="inline-flex items-center gap-1 bg-[#1C1C1E] px-1.5 py-0.5 rounded-md border border-[#333]">
                <button
                  type="button"
                  onClick={() => handleSetZoomPercentage(zoomPercentage - 5)}
                  disabled={zoomPercentage <= 65}
                  className="p-0.5 text-gray-400 hover:text-white disabled:opacity-30 cursor-pointer"
                  title="Diminuer la taille (-5%)"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="range"
                  min="65"
                  max="175"
                  step="5"
                  value={zoomPercentage}
                  onChange={(e) => handleSetZoomPercentage(Number(e.target.value))}
                  className="w-14 sm:w-20 h-1.5 bg-[#26262E] rounded-lg appearance-none cursor-pointer accent-blue-500"
                  title={`Jauge de zoom : ${zoomPercentage}%`}
                />
                <button
                  type="button"
                  onClick={() => handleSetZoomPercentage(zoomPercentage + 5)}
                  disabled={zoomPercentage >= 175}
                  className="p-0.5 text-gray-400 hover:text-white disabled:opacity-30 cursor-pointer"
                  title="Augmenter la taille (+5%)"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {/* Préréglages de taille de police (Presets rapides) */}
              <div className="inline-flex items-center bg-[#1C1C1E] p-0.5 rounded-md border border-[#333]">
                {[
                  { label: 'Petit', pct: 85 },
                  { label: 'Standard', pct: 100 },
                  { label: 'Grand', pct: 120 },
                  { label: 'Très grand', pct: 140 },
                ].map((preset) => {
                  const isActive = Math.abs(zoomPercentage - preset.pct) <= 4;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleSetZoomPercentage(preset.pct)}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white font-semibold shadow-xs'
                          : 'text-gray-400 hover:text-white'
                      }`}
                      title={`Préréglage ${preset.label} (${preset.pct}%)`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Réglage de l'espacement entre sections */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-gray-400 text-[11px] font-medium shrink-0 flex items-center gap-1">
                <Layers className="w-3 h-3 text-cyan-400" />
                <span>Écart sections :</span>
              </span>

              {/* Jauge / Slider rapide */}
              <div className="inline-flex items-center gap-1 bg-[#1C1C1E] px-1.5 py-0.5 rounded-md border border-[#333]">
                <button
                  type="button"
                  onClick={() => handleUpdateSectionSpacing(Math.max(0, currentSectionSpacing - 1))}
                  disabled={currentSectionSpacing <= 0}
                  className="p-0.5 text-gray-400 hover:text-white disabled:opacity-30 cursor-pointer"
                  title="Rapprocher les sections"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="range"
                  min="0"
                  max="32"
                  step="1"
                  value={currentSectionSpacing}
                  onChange={(e) => handleUpdateSectionSpacing(Number(e.target.value))}
                  className="w-14 sm:w-20 h-1.5 bg-[#26262E] rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  title={`Écart entre les sections : ${currentSectionSpacing}px`}
                />
                <button
                  type="button"
                  onClick={() => handleUpdateSectionSpacing(Math.min(32, currentSectionSpacing + 1))}
                  disabled={currentSectionSpacing >= 32}
                  className="p-0.5 text-gray-400 hover:text-white disabled:opacity-30 cursor-pointer"
                  title="Éloigner les sections"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <span className="text-[10px] font-mono font-bold text-cyan-400 w-7 text-right">
                  {currentSectionSpacing}px
                </span>
              </div>

              {/* Préréglages rapides : Collé, Serré, Normal, Aéré */}
              <div className="inline-flex items-center bg-[#1C1C1E] p-0.5 rounded-md border border-[#333]">
                {[
                  { label: 'Collé', val: 0 },
                  { label: 'Serré', val: 4 },
                  { label: 'Normal', val: 8 },
                  { label: 'Aéré', val: 16 }
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handleUpdateSectionSpacing(item.val)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-all cursor-pointer ${
                      currentSectionSpacing === item.val
                        ? 'bg-cyan-600 text-white font-semibold shadow-xs'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Plein écran */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                id="drawer-stage-fullscreen"
                onClick={() => toggleFullscreen()}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer border ${
                  isFullscreen
                    ? 'bg-blue-600 text-white font-semibold border-blue-500 shadow-xs'
                    : 'bg-[#1C1C1E] border-[#333] text-gray-400 hover:text-white'
                }`}
                title="Basculer en mode plein écran"
              >
                {isFullscreen ? <Minimize2 className="w-3 h-3 text-blue-200" /> : <Maximize2 className="w-3 h-3" />}
                <span>Plein écran</span>
              </button>
            </div>

            {/* Chords Visibility */}
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 text-[11px] font-medium shrink-0">Accords :</span>
              <div className="inline-flex items-center bg-[#1C1C1E] p-0.5 rounded-md border border-[#333]">
                <button
                  type="button"
                  onClick={() => updateStageSettings({ showChords: true })}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
                    stageSettings.showChords ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  <span>Afficher</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateStageSettings({ showChords: false })}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
                    !stageSettings.showChords ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <EyeOff className="w-3 h-3" />
                  <span>Masquer</span>
                </button>
              </div>
            </div>

            {/* Auto-Scroll Controller */}
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 text-[11px] font-medium shrink-0">Défilement :</span>
              <div className="inline-flex items-center gap-1.5 bg-[#1C1C1E] px-1.5 py-0.5 rounded-md border border-[#333]">
                <button
                  type="button"
                  onClick={() => updateStageSettings({ isAutoScrolling: !stageSettings.isAutoScrolling })}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                    stageSettings.isAutoScrolling
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-[#2A2A2D] text-gray-200 hover:bg-[#333]'
                  }`}
                >
                  {stageSettings.isAutoScrolling ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
                  <span>{stageSettings.isAutoScrolling ? 'Pause' : 'Lancer'}</span>
                </button>
                <span className="text-[10px] text-gray-400 font-mono">{stageSettings.autoScrollSpeed}x</span>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={stageSettings.autoScrollSpeed}
                  onChange={(e) => updateStageSettings({ autoScrollSpeed: parseInt(e.target.value, 10) })}
                  className="w-14 accent-blue-500 cursor-pointer h-1 bg-[#0A0A0B] rounded-lg"
                  title={`Vitesse: ${stageSettings.autoScrollSpeed}x`}
                />
              </div>
            </div>

            {/* Métronome Visuel & Sonore */}
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 text-[11px] font-medium shrink-0">Métronome :</span>
              <MetronomeStageControl
                initialBpm={effectiveTempo}
                initialTimeSignature={song.timeSignature || parsedData?.timeSignature || '4/4'}
                onBpmChange={handleUpdateTempo}
                onTimeSignatureChange={handleUpdateTimeSignature}
                songTitle={song.title}
              />
            </div>

            {/* Pédalier / Contrôleur MIDI */}
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 text-[11px] font-medium shrink-0">MIDI :</span>
              <MidiStatusIndicator showLabel className="!py-0.5 !text-[11px]" />
            </div>

            {/* Action : PDF */}
            <div className="flex items-center gap-1.5 sm:ml-auto w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-[#222224]">
              <button
                type="button"
                onClick={() => setShowPdfModal(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 py-1 rounded-md bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-200 border border-[#333] font-medium text-[11px] sm:text-xs transition-colors cursor-pointer"
                title="Exporter cette partition en PDF"
              >
                <FileDown className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Exporter PDF</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* Main Chord & Lyrics Canvas (Stage Reader) */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto ${isWideLayout ? 'px-3 sm:px-6 lg:px-8' : 'px-3 sm:px-8 md:px-12'} pt-2 sm:pt-4 pb-28 sm:pb-32 scroll-smooth print-sheet`}
        style={{ 
          lineHeight: displaySettings.typography.lineSpacing 
        }}
      >
        <div className={isWideLayout ? 'w-full max-w-none' : 'max-w-4xl mx-auto'}>
          
          {/* Song Sheet Header : Mode Ultra-Compact ou Déplié */}
          {isHeaderCollapsed ? (
            <div className="no-print border-b border-[#222224] pb-2 mb-2 sm:mb-3">
              <div className="flex items-center justify-between gap-1.5 sm:gap-2 py-1 px-2 sm:px-2.5 rounded-lg bg-[#141418] border border-[#26262E] text-xs">
                {/* Left: Bouton déplier + Titre + Artiste */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <button
                    type="button"
                    onClick={toggleHeaderCollapsed}
                    className="p-1 rounded bg-[#1C1C22] hover:bg-[#282830] text-blue-400 border border-[#333] transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                    title="Agrandir l'en-tête complète"
                    aria-label="Agrandir l'en-tête"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-bold text-white text-xs sm:text-sm truncate">
                    {stripParentheses(parsedData.title || song.title)}
                  </span>
                  {song.artist && (
                    <span className="text-gray-400 hidden md:inline truncate text-[11px]">
                      • {song.artist}
                    </span>
                  )}
                </div>

                {/* Right: Tonalité + Métronome + Actions */}
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setIsHeaderCollapsed(false);
                      setShowKeyMenu(true);
                    }}
                    className="px-2 py-0.5 rounded bg-[#1C1C22] border border-[#2E2E36] font-mono font-bold text-blue-400 hover:border-blue-500/50 cursor-pointer text-xs"
                    title="Tonalité (cliquer pour modifier)"
                  >
                    {baseKeyDisplay}
                    {effectiveTransposeOffset !== 0 && (
                      <span className="text-amber-400 ml-1 text-[10px]">
                        ({effectiveTransposeOffset > 0 ? `+${effectiveTransposeOffset}` : effectiveTransposeOffset})
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsHeaderCollapsed(false);
                      setShowTempoMenu(true);
                    }}
                    className="px-2 py-0.5 rounded bg-[#1C1C22] border border-[#2E2E36] font-mono font-bold text-emerald-400 hover:border-emerald-500/50 cursor-pointer text-xs flex items-center gap-1"
                    title="Tempo / BPM (cliquer pour modifier)"
                  >
                    <Gauge className="w-3 h-3 text-emerald-400" />
                    <span>{effectiveTempo}</span>
                  </button>

                  {/* Plein écran (uniquement en chant individuel hors setlist) */}
                  {!isInSetlist && (
                    <button
                      type="button"
                      id="btn-song-fullscreen-compact"
                      onClick={() => toggleFullscreen()}
                      className={`p-1.5 rounded-lg border text-xs font-medium flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                        isFullscreen
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-[#1C1C1E] hover:bg-[#28282C] text-gray-300 hover:text-white border-[#333]'
                      }`}
                      title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
                      aria-label={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
                    >
                      {isFullscreen ? (
                        <Minimize2 className="w-3.5 h-3.5" />
                      ) : (
                        <Maximize2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}

                  {canManageSongs && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('editor')}
                      className="p-1.5 rounded-lg bg-[#1C1C1E] hover:bg-amber-500/15 text-gray-200 hover:text-amber-300 border border-[#333] hover:border-amber-500/50 transition-all shadow-xs cursor-pointer group flex items-center justify-center"
                      title="Éditer le chant"
                      aria-label="Éditer le chant"
                    >
                      <FileEdit className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform shrink-0" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
                    className={`p-1.5 rounded-lg border transition-all shadow-xs cursor-pointer flex items-center justify-center ${
                      showSettingsDrawer
                        ? 'bg-blue-600 border-blue-500 text-white shadow-blue-500/20'
                        : 'bg-[#1C1C1E] hover:bg-[#28282C] border-[#333] hover:border-[#444] text-gray-200 hover:text-white'
                    }`}
                    title="Ouvrir les options et réglages"
                    aria-label="Options et réglages du chant"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-b border-[#222224] pb-2 sm:pb-3 mb-2.5 sm:mb-4">
              <div className="flex items-start justify-between gap-2 sm:gap-3 mb-1.5 sm:mb-2">
                {/* Left: Title & Artist */}
                <div className="flex-1 min-w-0 pr-1 sm:pr-2">
                  <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 mb-0.5">
                    <h1 
                      className="font-bold tracking-tight text-white leading-tight break-words"
                      style={{ fontSize: `clamp(17px, 3.8vw, ${displaySettings.typography.titleSize}px)` }}
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
                          id="btn-song-language"
                          onClick={() => {
                            if ((isInSetlist || isSetlistMode) && currentSetlist) {
                              setShowSetlistVersionModal(true);
                            } else {
                              setShowLanguageMenu(!showLanguageMenu);
                            }
                          }}
                          className={`inline-flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-md border text-xs font-bold transition-all shadow-xs hover:brightness-110 active:scale-95 cursor-pointer ${lMeta.badgeClass}`}
                          title={`Langue : ${lMeta.name} (${lMeta.code})${linkedVersions.length > 0 ? ` • ${linkedVersions.length} version(s) liée(s)` : ''}`}
                        >
                          <Globe className="w-3.5 h-3.5 shrink-0" />
                          <span className="leading-none text-[11px] font-bold tracking-tight">{lMeta.code}</span>
                        </button>

                        {showLanguageMenu && (
                          <>
                            <div 
                              className="fixed inset-0 z-40" 
                              onClick={() => setShowLanguageMenu(false)} 
                            />
                            <div className="absolute left-0 top-full mt-1.5 z-50 w-76 max-w-[calc(100vw-32px)] bg-[#18181C] border border-[#2E2E36] rounded-xl shadow-2xl p-2.5 backdrop-blur-md">
                              {/* Bannière mode setlist si actif */}
                              {(isInSetlist || isSetlistMode) && currentSetlist && (
                                <div className="mb-2.5 p-2 rounded-lg bg-blue-950/40 border border-blue-500/30 flex items-center justify-between">
                                  <div className="min-w-0 pr-1">
                                    <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Setlist active</div>
                                    <div className="text-xs font-semibold text-white truncate">{currentSetlist.name}</div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setShowLanguageMenu(false);
                                      setShowSetlistVersionModal(true);
                                    }}
                                    className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold shrink-0 transition-colors cursor-pointer"
                                  >
                                    Options
                                  </button>
                                </div>
                              )}

                              {/* Section: Langue du chant actuel & Sélecteur rapide */}
                              <div className="mb-2.5 pb-2.5 border-b border-[#282830]">
                                <div className="flex items-center justify-between mb-1.5 px-1">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                    <Globe className="w-3 h-3 text-blue-400" />
                                    <span>Langue actuelle</span>
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${lMeta.badgeClass}`}>
                                    {lMeta.name} ({lMeta.code})
                                  </span>
                                </div>

                                {canManageSongs ? (
                                  <div className="relative mt-1">
                                    <select
                                      id="select-quick-song-language"
                                      value={song.language || 'Français'}
                                      onChange={async (e) => {
                                        const newLang = e.target.value;
                                        await updateSong(song.id, { language: newLang });
                                      }}
                                      className="w-full h-8 bg-[#121215] border border-[#333] hover:border-blue-500/60 rounded-lg px-2.5 pr-8 text-xs text-white font-medium focus:outline-none focus:border-blue-500 cursor-pointer transition-colors appearance-none"
                                    >
                                      {PRESET_LANGUAGES.map((lang) => (
                                        <option key={lang.code} value={lang.name} className="bg-[#1C1C1E] text-white">
                                          {lang.name} ({lang.code})
                                        </option>
                                      ))}
                                      {song.language && !PRESET_LANGUAGES.some(p => p.name.toLowerCase() === song.language?.toLowerCase() || p.code.toLowerCase() === song.language?.toLowerCase()) && (
                                        <option value={song.language} className="bg-[#1C1C1E] text-white">
                                          {song.language} ({lMeta.code})
                                        </option>
                                      )}
                                    </select>
                                    <ChevronDown className="w-3.5 h-3.5 text-gray-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                                  </div>
                                ) : (
                                  <div className="mt-1 px-2.5 py-1.5 rounded-lg bg-[#141417] border border-[#25252D] text-[11px] text-gray-400 flex items-center justify-between">
                                    <span>{lMeta.name}</span>
                                    <span className="text-[10px] text-gray-500">Lecture seule</span>
                                  </div>
                                )}
                              </div>

                              {/* En-tête versions disponibles */}
                              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1 pb-1 flex items-center justify-between mb-1.5">
                                <span>Versions disponibles</span>
                                {linkedVersions.length > 0 && (
                                  <span className="text-[10px] font-mono font-normal text-indigo-400 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-500/30">
                                    {linkedVersions.length}
                                  </span>
                                )}
                              </div>

                              {/* Autres versions liées disponibles */}
                              {linkedVersions.length > 0 ? (
                                <div className="max-h-52 overflow-y-auto space-y-1.5 pr-0.5 custom-scrollbar">
                                  {linkedVersions.map((lv) => {
                                    const lvMeta = getLanguageMeta(lv.language);
                                    const inSetlist = Boolean((isInSetlist || isSetlistMode) && currentSetlist);

                                    return (
                                      <div
                                        key={lv.id}
                                        className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#141416] border border-[#26262E] hover:border-[#33333E] transition-colors"
                                      >
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 ${lvMeta.badgeClass}`}>
                                            {lvMeta.code}
                                          </span>
                                          <span className="truncate font-semibold text-white text-xs block" title={lv.title}>
                                            {lv.title}
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <button
                                            type="button"
                                            onClick={() => handleViewOnlyVersion(lv)}
                                            className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white text-[11px] font-semibold border border-blue-500/40 transition-colors cursor-pointer"
                                            title="Consulter cette version"
                                          >
                                            Consulter
                                          </button>
                                          {inSetlist && canManageSongs && (
                                            <button
                                              type="button"
                                              onClick={() => handleReplaceCurrentSongInSetlist(lv)}
                                              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold shadow-xs transition-colors cursor-pointer"
                                            >
                                              Remplacer
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="py-2 px-2 text-center text-xs text-gray-400 bg-[#141416] rounded-lg border border-[#26262E]">
                                  Aucune autre version disponible
                                </div>
                              )}

                              {/* Bouton pour ouvrir la gestion des versions : réservé aux personnes autorisées */}
                              {canManageSongs ? (
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
                              ) : (
                                <div className="pt-2 mt-2 border-t border-[#282830] text-center text-[10px] text-gray-500">
                                  Mode consultation • Gestion des versions réservée aux responsables
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })()}

                  {/* Durée estimée : icône + valeur (sans libellé texte) */}
                  <div
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#18181C] border border-[#2A2A30] text-gray-300 shadow-xs"
                    style={{ fontSize: `${displaySettings.typography.metadataSize}px` }}
                    title={`Durée estimée : ${effectiveDuration}`}
                  >
                    <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="text-cyan-300 font-bold font-mono text-xs">
                      {effectiveDuration}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Boutons Plein écran, Édition & Réglages */}
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                {/* Bouton Plein écran (uniquement en lecture de chant individuel hors setlist) */}
                {!isInSetlist && (
                  <button
                    type="button"
                    id="btn-song-fullscreen"
                    onClick={() => toggleFullscreen()}
                    className={`p-1.5 sm:p-2 rounded-lg border text-xs font-medium flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                      isFullscreen
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-[#1C1C1E] hover:bg-[#28282C] text-gray-300 hover:text-white border-[#333]'
                    }`}
                    title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
                    aria-label={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
                  >
                    {isFullscreen ? (
                      <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    ) : (
                      <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    )}
                  </button>
                )}

                {canManageSongs && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('editor')}
                    className="p-1.5 sm:p-2 rounded-lg bg-[#1C1C1E] hover:bg-amber-500/15 text-gray-200 hover:text-amber-300 border border-[#333] hover:border-amber-500/50 transition-all shadow-xs cursor-pointer group flex items-center justify-center"
                    title="Éditer le chant"
                    aria-label="Éditer le chant"
                  >
                    <FileEdit className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 group-hover:scale-110 transition-transform shrink-0" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
                  className={`p-1.5 sm:p-2 rounded-lg border transition-all shadow-xs cursor-pointer flex items-center justify-center ${
                    showSettingsDrawer
                      ? 'bg-blue-600 border-blue-500 text-white shadow-blue-500/20'
                      : 'bg-[#1C1C1E] hover:bg-[#28282C] border-[#333] hover:border-[#444] text-gray-200 hover:text-white'
                  }`}
                  title="Ouvrir les options et réglages du chant"
                  aria-label="Options et réglages du chant"
                >
                  <Settings2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>

            {/* Ligne Artiste & Catégories : sur toute la largeur (w-full) au-dessus des métadonnées Tonalité / Transpose */}
            {(song.artist || (song.tags && song.tags.length > 0)) && (
              <div className="w-full flex items-center gap-1.5 sm:gap-2 flex-wrap mb-1.5 sm:mb-2 text-xs">
                {song.artist && (
                  <div 
                    className="text-gray-300 font-medium break-words shrink-0 text-xs sm:text-sm"
                    style={{ fontSize: `clamp(11px, 2.5vw, ${displaySettings.typography.metadataSize}px)` }}
                  >
                    {song.artist}
                  </div>
                )}

                {song.tags && song.tags.length > 0 && (
                  <div className={`w-full sm:w-auto flex items-center gap-1 sm:gap-1.5 flex-wrap ${song.artist ? 'sm:border-l sm:border-[#2A2A2E] sm:pl-2' : ''}`}>
                    {song.tags.map((cat, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#18181C] border border-[#2A2A30] text-gray-300 text-[11px] sm:text-xs font-medium shadow-xs"
                      >
                        <Tag className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-400" />
                        <span>{cat}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Single Line Toolbar: Stylized Inline Controls with Dropdowns for Tonalité, Transposition & BPM */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              {/* Tonalité : Liste déroulante */}
              <div className="relative inline-block">
                <button
                  ref={keyButtonRef}
                  type="button"
                  onClick={() => {
                    const next = !showKeyMenu;
                    setShowKeyMenu(next);
                    setShowTransposeMenu(false);
                    setShowTempoMenu(false);
                    setShowZoomMenu(false);
                    if (next) {
                      setKeyPopoverStyle(calculatePopoverPos(keyButtonRef.current));
                    }
                  }}
                  className={`h-8 inline-flex items-center gap-1.5 px-2.5 rounded-lg border font-mono shadow-xs transition-all cursor-pointer ${
                    showKeyMenu
                      ? 'bg-[#1C1C22] border-blue-500 text-white ring-1 ring-blue-500/40'
                      : 'bg-[#141416] hover:bg-[#1A1A1E] border-[#242428] hover:border-blue-500/40 text-gray-300'
                  }`}
                  style={{ fontSize: `${displaySettings.typography.metadataSize}px` }}
                  title="Cliquer pour choisir la tonalité - liste déroulante"
                >
                  <Music className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="text-gray-400 font-sans text-xs hidden sm:inline">Tonalité :</span>
                  <span className="text-blue-400 font-bold font-mono text-xs">{baseKeyDisplay}</span>
                  {effectiveTransposeOffset !== 0 && transposedKeyDisplay && (
                    <span 
                      className="text-amber-400 font-bold font-mono text-xs ml-0.5" 
                      title={`Transposition piano : ${effectiveTransposeOffset > 0 ? `+${effectiveTransposeOffset}` : effectiveTransposeOffset} demi-tons (sonorité réelle : ${transposedKeyDisplay})`}
                    >
                      (Sonne {transposedKeyDisplay})
                    </span>
                  )}
                  <ChevronDown className={`w-3 h-3 text-blue-400/80 transition-transform ${showKeyMenu ? 'rotate-180' : ''}`} />
                </button>

                {showKeyMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowKeyMenu(false)} 
                    />
                    <div 
                      style={keyPopoverStyle}
                      className="absolute top-full mt-1.5 z-50 w-72 max-w-[calc(100vw-24px)] bg-[#16161A] border border-[#2E2E36] rounded-xl shadow-2xl p-2.5 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 box-border"
                    >
                      <div className="text-[11px] font-semibold text-gray-400 pb-2 mb-2 border-b border-[#282830] flex items-center justify-between">
                        <span>Choisir la tonalité</span>
                        <span className="text-[10px] text-blue-400 font-mono">Actuelle : {baseKeyDisplay}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {/* Colonne Gauche : Majeur */}
                        <div>
                          <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider px-1 pb-1 mb-1 border-b border-[#282830] text-center">
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
                                      ? 'bg-blue-600 text-white shadow-xs'
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
                          <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider px-1 pb-1 mb-1 border-b border-[#282830] text-center">
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
                                      ? 'bg-indigo-600 text-white shadow-xs'
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

              {/* Transposition : Liste déroulante en deux colonnes */}
              <div className="relative inline-block">
                <button
                  ref={transposeButtonRef}
                  type="button"
                  onClick={() => {
                    const next = !showTransposeMenu;
                    setShowTransposeMenu(next);
                    setShowKeyMenu(false);
                    setShowTempoMenu(false);
                    setShowZoomMenu(false);
                    if (next) {
                      setTransposePopoverStyle(calculatePopoverPos(transposeButtonRef.current));
                    }
                  }}
                  className={`h-8 inline-flex items-center gap-1.5 px-2.5 rounded-lg border font-mono shadow-xs transition-all cursor-pointer ${
                    showTransposeMenu
                      ? 'bg-amber-950/40 border-amber-500 text-amber-300 ring-1 ring-amber-500/40'
                      : effectiveTransposeOffset !== 0
                        ? 'bg-amber-950/30 hover:bg-amber-950/50 border-amber-500/40 text-amber-300'
                        : 'bg-[#141416] hover:bg-[#1A1A1E] border-[#242428] hover:border-amber-500/40 text-gray-300'
                  }`}
                  style={{ fontSize: `${displaySettings.typography.metadataSize}px` }}
                  title="Cliquer pour choisir la transposition (logique piano) - liste déroulante"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-amber-400/90 font-sans text-xs shrink-0 hidden sm:inline">Transpose :</span>
                  <span className={`px-1.5 py-0.5 rounded font-mono font-bold text-xs ${
                    effectiveTransposeOffset !== 0
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-[#18181C] text-gray-300 border border-[#242428]'
                  }`}>
                    {effectiveTransposeOffset === 0 
                      ? '0' 
                      : (effectiveTransposeOffset > 0 ? `+${effectiveTransposeOffset}` : `${effectiveTransposeOffset}`)}
                  </span>
                  {effectiveTransposeOffset !== 0 && transposedKeyDisplay && (
                    <span className="text-amber-300/90 text-[11px] font-mono font-semibold hidden md:inline">
                      (Sonne {transposedKeyDisplay})
                    </span>
                  )}
                  <ChevronDown className={`w-3 h-3 text-amber-400/80 transition-transform ${showTransposeMenu ? 'rotate-180' : ''}`} />
                </button>

                {showTransposeMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowTransposeMenu(false)} 
                    />
                    <div 
                      style={transposePopoverStyle}
                      className="absolute top-full mt-1.5 z-50 w-72 max-w-[calc(100vw-24px)] bg-[#16161A] border border-[#2E2E36] rounded-xl shadow-2xl p-2.5 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 box-border"
                    >
                      <div className="text-[11px] font-semibold text-gray-400 pb-2 mb-2 border-b border-[#282830] flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span>Transposition</span>
                          <span className="text-[10px] text-gray-500 font-normal">(logique piano)</span>
                        </div>
                        {effectiveTransposeOffset !== 0 ? (
                          <button
                            type="button"
                            onClick={() => {
                              handleSetTransposeOffset(0);
                              setShowTransposeMenu(false);
                            }}
                            className="text-[10px] text-amber-400 hover:underline cursor-pointer"
                          >
                            Rétablir à 0
                          </button>
                        ) : (
                          <span className="text-[10px] text-amber-400 font-mono">0</span>
                        )}
                      </div>

                      {/* Info Logique Piano / Clavier */}
                      <div className="mb-2 p-1.5 rounded-lg bg-[#111116] border border-[#262632] text-[10px] text-gray-400 leading-tight">
                        🎹 Les accords écrits restent <strong className="text-blue-300">{baseKeyDisplay}</strong>. Le transpose modifie la sonorité réelle comme sur un piano électronique.
                      </div>

                      {/* Option centrale 0 : Tonalité d'origine */}
                      <div className="mb-2 pb-2 border-b border-[#282830]">
                        <button
                          type="button"
                          onClick={() => {
                            handleSetTransposeOffset(0);
                            setShowTransposeMenu(false);
                          }}
                          className={`w-full py-1.5 px-2 rounded-lg font-mono text-xs transition-colors flex items-center justify-between cursor-pointer ${
                            effectiveTransposeOffset === 0
                              ? 'bg-amber-600 text-white font-bold shadow-xs'
                              : 'bg-[#1C1C22] text-gray-300 hover:bg-[#25252D] hover:text-white border border-[#2E2E36]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold">0</span>
                            <span className="text-gray-400 text-[11px]">Origine</span>
                          </div>
                          {baseKey && (
                            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                              effectiveTransposeOffset === 0 ? 'bg-amber-700/80 text-white' : 'bg-[#202026] text-blue-300 border border-[#2A2A32]'
                            }`}>
                              {baseKeyDisplay}
                            </span>
                          )}
                        </button>
                      </div>

                      {/* Deux colonnes compactes */}
                      <div className="grid grid-cols-2 gap-1.5 text-xs">
                        {/* Colonne Gauche : Baisser */}
                        <div className="grid grid-cols-1 gap-1 max-h-60 overflow-y-auto pr-0.5 custom-scrollbar">
                          {TRANSPOSE_DOWN_STEPS.map((step) => {
                            const isSelected = effectiveTransposeOffset === step;
                            const resultingKey = baseKey ? transposeChord(baseKey, step, stageSettings.notation) : '';
                            return (
                              <button
                                key={step}
                                type="button"
                                onClick={() => {
                                  handleSetTransposeOffset(step);
                                  setShowTransposeMenu(false);
                                }}
                                className={`w-full py-1 px-1.5 rounded-md font-mono text-xs transition-colors flex items-center justify-between cursor-pointer ${
                                  isSelected
                                    ? 'bg-rose-600 text-white font-bold shadow-xs'
                                    : 'text-gray-300 hover:bg-[#25252D] hover:text-white'
                                }`}
                                title={`Accords écrits : ${baseKeyDisplay} • Sonorité produite : ${resultingKey}`}
                              >
                                <span className={isSelected ? 'text-white' : 'text-rose-300/90 font-medium'}>
                                  {step}
                                </span>
                                {resultingKey && (
                                  <span className={`text-[10px] font-bold px-1 rounded ${
                                    isSelected ? 'bg-rose-700/80 text-white' : 'bg-[#202026] text-amber-300 border border-[#2A2A32]'
                                  }`}>
                                    Sonne {resultingKey}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Colonne Droite : Augmenter */}
                        <div className="grid grid-cols-1 gap-1 max-h-60 overflow-y-auto pr-0.5 custom-scrollbar border-l border-[#282830] pl-1.5">
                          {TRANSPOSE_UP_STEPS.map((step) => {
                            const isSelected = effectiveTransposeOffset === step;
                            const resultingKey = baseKey ? transposeChord(baseKey, step, stageSettings.notation) : '';
                            return (
                              <button
                                key={step}
                                type="button"
                                onClick={() => {
                                  handleSetTransposeOffset(step);
                                  setShowTransposeMenu(false);
                                }}
                                className={`w-full py-1 px-1.5 rounded-md font-mono text-xs transition-colors flex items-center justify-between cursor-pointer ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                                    : 'text-gray-300 hover:bg-[#25252D] hover:text-white'
                                }`}
                                title={`Accords écrits : ${baseKeyDisplay} • Sonorité produite : ${resultingKey}`}
                              >
                                <span className={isSelected ? 'text-white' : 'text-emerald-300/90 font-medium'}>
                                  +{step}
                                </span>
                                {resultingKey && (
                                  <span className={`text-[10px] font-bold px-1 rounded ${
                                    isSelected ? 'bg-emerald-700/80 text-white' : 'bg-[#202026] text-amber-300 border border-[#2A2A32]'
                                  }`}>
                                    Sonne {resultingKey}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Tempo / BPM : Module stylisé avec affichage et réglage rapide */}
              <div className="relative inline-block">
                <button
                  ref={tempoButtonRef}
                  type="button"
                  onClick={() => {
                    const next = !showTempoMenu;
                    setShowTempoMenu(next);
                    setShowKeyMenu(false);
                    setShowTransposeMenu(false);
                    setShowZoomMenu(false);
                    if (next) {
                      setTempoPopoverStyle(calculatePopoverPos(tempoButtonRef.current));
                    }
                  }}
                  className={`h-8 inline-flex items-center gap-1.5 px-2.5 rounded-lg border font-mono shadow-xs transition-all cursor-pointer ${
                    showTempoMenu
                      ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/40'
                      : 'bg-[#141416] hover:bg-[#1A1A1E] border-[#242428] hover:border-emerald-500/40 text-gray-300'
                  }`}
                  style={{ fontSize: `${displaySettings.typography.metadataSize}px` }}
                  title="Cliquer pour afficher et régler le tempo (BPM)"
                >
                  <Gauge className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-gray-400 font-sans text-xs hidden sm:inline">Tempo :</span>
                  <span className="text-emerald-400 font-bold font-mono text-xs">{effectiveTempo}</span>
                  <span className="text-gray-400 font-mono text-[11px]">BPM</span>
                  <ChevronDown className={`w-3 h-3 text-emerald-400/80 transition-transform ${showTempoMenu ? 'rotate-180' : ''}`} />
                </button>

                {showTempoMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowTempoMenu(false)} 
                    />
                    <div 
                      style={tempoPopoverStyle}
                      className="absolute top-full mt-1.5 z-50 w-72 max-w-[calc(100vw-24px)] bg-[#16161A] border border-[#2E2E36] rounded-xl shadow-2xl p-3 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 box-border"
                    >
                      <div className="text-[11px] font-semibold text-gray-400 pb-2 mb-2.5 border-b border-[#282830] flex items-center justify-between">
                        <span>Réglage du tempo</span>
                        <span className="text-[10px] text-emerald-400 font-mono font-bold">{effectiveTempo} BPM</span>
                      </div>

                      {/* Stepper rapide */}
                      <div className="flex items-center justify-between gap-1 mb-3">
                        <button
                          type="button"
                          onClick={() => handleUpdateTempo(Math.max(30, effectiveTempo - 10))}
                          className="px-2 py-1 rounded bg-[#202026] hover:bg-[#282832] text-gray-300 text-xs font-mono border border-[#30303A] cursor-pointer shrink-0"
                          title="-10 BPM"
                        >
                          -10
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateTempo(Math.max(30, effectiveTempo - 1))}
                          className="p-1 rounded bg-[#202026] hover:bg-[#282832] text-gray-300 border border-[#30303A] cursor-pointer shrink-0"
                          title="-1 BPM"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <div className="text-center font-mono font-bold text-lg text-emerald-400 min-w-16">
                          {effectiveTempo}
                          <div className="text-[9px] text-gray-500 font-sans uppercase">BPM</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUpdateTempo(Math.min(260, effectiveTempo + 1))}
                          className="p-1 rounded bg-[#202026] hover:bg-[#282832] text-gray-300 border border-[#30303A] cursor-pointer shrink-0"
                          title="+1 BPM"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateTempo(Math.min(260, effectiveTempo + 10))}
                          className="px-2 py-1 rounded bg-[#202026] hover:bg-[#282832] text-gray-300 text-xs font-mono border border-[#30303A] cursor-pointer shrink-0"
                          title="+10 BPM"
                        >
                          +10
                        </button>
                      </div>

                      {/* Tap Tempo */}
                      <button
                        type="button"
                        onClick={handleTapTempo}
                        className="w-full py-2 px-3 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer mb-2.5"
                      >
                        <Gauge className="w-3.5 h-3.5 shrink-0" />
                        <span>Tapez le tempo (Tap)</span>
                      </button>

                      {/* Presets rapides */}
                      <div className="text-[10px] text-gray-500 font-semibold mb-1 uppercase tracking-wider">
                        Tempos usuels
                      </div>
                      <div className="grid grid-cols-5 gap-1.5 text-xs">
                        {[70, 85, 100, 120, 140].map((bpm) => (
                          <button
                            key={bpm}
                            type="button"
                            onClick={() => {
                              handleUpdateTempo(bpm);
                              setShowTempoMenu(false);
                            }}
                            className={`py-1 rounded font-mono text-[11px] transition-colors cursor-pointer text-center ${
                              effectiveTempo === bpm
                                ? 'bg-emerald-600 text-white font-bold'
                                : 'bg-[#202026] text-gray-300 hover:bg-[#282832] border border-[#2E2E38]'
                            }`}
                          >
                            {bpm}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Note / Instructions Section (Lecture seule) */}
            {effectiveNotes ? (
              <div 
                className="mt-2 p-2 rounded-lg bg-[#111112] border border-[#222224] flex items-start gap-2.5 transition-all text-xs"
                style={{ fontSize: `${Math.max(11, displaySettings.typography.metadataSize)}px` }}
              >
                <div className="text-gray-300 font-sans italic flex-1">
                  <span className="text-amber-400/90 font-semibold not-italic mr-1.5">Note :</span>
                  {effectiveNotes}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Structured ChordPro Sections */}
          <div 
            className={getColumnsGridClass(numColumns)}
            style={{ 
              gap: `${currentSectionSpacing}px`, 
              rowGap: `${currentSectionSpacing}px` 
            }}
          >
            {parsedData.sections.map((section, sIdx) => {
              const secColor = getSectionColor(section.type, displaySettings.sectionColors);
              const sectionRepeat = (setlistOverride?.sectionRepeats && setlistOverride.sectionRepeats[sIdx] !== undefined)
                ? setlistOverride.sectionRepeats[sIdx]
                : (section.repeat || 1);

              const isCompact = currentSectionSpacing <= 6;
              const isUltraCompact = currentSectionSpacing <= 2;
              const cardPaddingClass = isUltraCompact 
                ? 'py-2 px-3 sm:py-2.5 sm:px-3.5'
                : isCompact 
                ? 'py-2.5 px-3.5 sm:py-3 sm:px-4' 
                : 'p-4';
              const headerMarginClass = isUltraCompact 
                ? 'mb-1.5' 
                : isCompact 
                ? 'mb-2' 
                : 'mb-3';
              const linesSpacingClass = isUltraCompact 
                ? 'space-y-1.5' 
                : isCompact 
                ? 'space-y-2' 
                : 'space-y-3';

              return (
                <div 
                  key={sIdx}
                  className={`rounded-lg ${cardPaddingClass} transition-all`}
                  style={getSectionBorderStyles(secColor, displaySettings.sectionBorders)}
                >
                  {/* Section Title Header & Vocal Arrangement Pastille & Repeat Badge (Lecture seule) */}
                  <div className={`flex items-center justify-between gap-2 ${headerMarginClass} flex-wrap`}>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {section.title ? (
                        <span
                          className="inline-block font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border shadow-xs text-left select-none"
                          style={{
                            fontSize: `${displaySettings.typography.headerSize}px`,
                            color: secColor,
                            borderColor: `${secColor}50`,
                            backgroundColor: `${secColor}1C`
                          }}
                        >
                          {section.title}
                        </span>
                      ) : <div />}

                      {/* Section Repeat Badge (Lecture seule) */}
                      {sectionRepeat > 1 && (
                        <span 
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded border bg-emerald-950/40 border-emerald-500/50 text-emerald-300 font-bold font-mono select-none"
                          style={{ fontSize: `${Math.max(10, Math.round((displaySettings.typography?.headerSize || 12) * 0.9))}px` }}
                          title={`Répété ${sectionRepeat} fois`}
                        >
                          <Repeat 
                            style={{ 
                              width: `${Math.max(11, Math.round((displaySettings.typography?.headerSize || 12) * 0.9))}px`,
                              height: `${Math.max(11, Math.round((displaySettings.typography?.headerSize || 12) * 0.9))}px` 
                            }}
                            className="text-emerald-400 shrink-0" 
                          />
                          <span>x{sectionRepeat}</span>
                        </span>
                      )}
                    </div>

                    {/* Pastilles Arrangement Vocal en lecture seule */}
                    {((section.vocals && section.vocals.length > 0) || section.vocal) && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(section.vocals && section.vocals.length > 0 ? section.vocals : [section.vocal!]).map((voc, vIdx) => {
                          const vStyle = getVocalBadgeStyle(voc);
                          const vocalFontSize = Math.max(10, Math.round((displaySettings.typography?.headerSize || 12) * 0.95));
                          const vocalIconSize = Math.max(11, Math.round(vocalFontSize * 1.05));
                          return (
                            <span
                              key={vIdx}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${vStyle.bg} border ${vStyle.border} ${vStyle.text} font-semibold shadow-xs select-none`}
                              style={{ fontSize: `${vocalFontSize}px` }}
                            >
                              <Mic 
                                style={{ width: `${vocalIconSize}px`, height: `${vocalIconSize}px` }}
                                className={`${vStyle.icon} shrink-0`} 
                              />
                              <span>{voc}</span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Section Lines */}
                  <div className={`${linesSpacingClass} font-chord leading-relaxed`}>
                    {section.lines.map((line, lIdx) => {
                      if (line.type === 'empty') {
                        return <div key={lIdx} className="h-3" />;
                      }

                      return (
                        <div key={lIdx} className="flex flex-wrap items-end gap-x-0.5">
                          {line.items.map((item, iIdx) => {
                            const displayedChord = item.chord 
                              ? transposeChord(item.chord, visualChordTransposeSemitones, stageSettings.notation) 
                              : '';

                            return (
                              <div key={iIdx} className="inline-flex flex-col">
                                 {/* Chord on top - Clickable to open Chord Library Diagram */}
                                {stageSettings.showChords && (
                                  <button 
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (displayedChord) {
                                        setChordModalData({
                                          isOpen: true,
                                          chord: displayedChord
                                        });
                                      }
                                    }}
                                    className={`chord-badge font-mono font-bold hover:underline select-none leading-none mb-1 pr-1 text-left inline-flex items-center cursor-pointer transition-all active:scale-95 group/chord ${
                                      displayedChord ? 'opacity-100' : 'opacity-0 pointer-events-none'
                                    }`}
                                    style={{ 
                                      fontSize: `${displaySettings.typography.chordSize}px`,
                                      color: displaySettings.chordColor || '#60a5fa'
                                    }}
                                    title={displayedChord 
                                      ? (effectiveTransposeOffset !== 0 && transposedKeyDisplay
                                          ? `Accord joué : ${displayedChord} - Sonnera ${transposeChord(item.chord, auditoryTransposeSemitones, stageSettings.notation)} au clavier`
                                          : `Diagramme de l accord ${displayedChord}`)
                                      : undefined}
                                  >
                                    {displayedChord || '\u00A0'}
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





      {/* Chord Library Modal */}
      <ChordModal
        isOpen={chordModalData.isOpen}
        onClose={() => setChordModalData(prev => ({ ...prev, isOpen: false }))}
        initialChord={chordModalData.chord}
        songChords={allSongChords}
        notation={stageSettings.notation}
        onSelectChord={(ch) => setChordModalData(prev => ({ ...prev, chord: ch }))}
        transposeOffset={effectiveTransposeOffset}
      />

      {/* Language Version & Relations Modal */}
      {song && (
        <LanguageVersionModal
          song={song}
          isOpen={showLanguageModal}
          onClose={() => setShowLanguageModal(false)}
        />
      )}

      {/* Setlist Language Version Modal (Liste simpliste avec boutons Afficher et Remplacer) */}
      {showSetlistVersionModal && song && currentSetlist && (() => {
        const currentLangMeta = getLanguageMeta(song.language);
        const linkedVersions = getLinkedSongVersions(song, songs);

        return (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs"
            onClick={() => setShowSetlistVersionModal(false)}
          >
            <div 
              className="w-full max-w-md bg-[#16161A] border border-[#2E2E38] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header simple */}
              <div className="px-4 py-3.5 bg-[#1B1B20] border-b border-[#282832] flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                    <Globe className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-white leading-none">
                      Versions disponibles
                    </h3>
                    <p className="text-[10px] text-gray-400 truncate mt-0.5">
                      Setlist : {currentSetlist.name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSetlistVersionModal(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#25252D] transition-colors cursor-pointer"
                  aria-label="Fermer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Contenu simple : Liste des versions avec boutons Afficher et Remplacer */}
              <div className="p-3 sm:p-4 space-y-2.5 max-h-[calc(80vh-90px)] overflow-y-auto custom-scrollbar">
                {linkedVersions.length > 0 ? (
                  <>
                    <div className="space-y-2">
                      {linkedVersions.map((lv) => {
                        const lvMeta = getLanguageMeta(lv.language);
                        return (
                          <div
                            key={lv.id}
                            className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-[#121215] border border-[#26262E] hover:border-[#363642] transition-colors"
                          >
                            {/* Version info */}
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 ${lvMeta.badgeClass}`}>
                                {lvMeta.code}
                              </span>
                              <span className="text-xs sm:text-sm font-semibold text-white truncate" title={lv.title}>
                                {lv.title}
                              </span>
                            </div>

                            {/* Les 2 boutons demandés : « Afficher » et « Remplacer » */}
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleViewOnlyVersion(lv)}
                                className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#222228] hover:bg-[#2C2C34] text-gray-200 hover:text-white text-xs font-semibold border border-[#33333E] transition-colors cursor-pointer"
                              >
                                Afficher
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReplaceCurrentSongInSetlist(lv)}
                                className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                              >
                                Remplacer
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Option secondaire discrète : ajouter à la suite ou gérer */}
                    <div className="pt-2 border-t border-[#24242C] flex items-center justify-between text-[11px]">
                      {linkedVersions.length === 1 ? (
                        <button
                          type="button"
                          onClick={() => handleAddAfterCurrentSongInSetlist(linkedVersions[0], true)}
                          className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Ajouter à la suite du chant</span>
                        </button>
                      ) : (
                        <span className="text-gray-500">
                          {linkedVersions.length} versions disponibles
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setShowSetlistVersionModal(false);
                          setShowLanguageModal(true);
                        }}
                        className="text-gray-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Settings2 className="w-3.5 h-3.5" />
                        <span>Gérer les versions</span>
                      </button>
                    </div>
                  </>
                ) : (
                  /* Aucune version liée */
                  <div className="text-center py-6 space-y-3">
                    <p className="text-xs text-gray-400 leading-relaxed max-w-xs mx-auto">
                      Ce chant ({currentLangMeta.name}) n'a pas encore d'autre version liée dans le répertoire.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSetlistVersionModal(false);
                        setShowLanguageModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Lier une version</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Floating Toast Feedback for setlist modifications */}
      {feedbackToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A20]/95 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackToast}</span>
        </div>
      )}

    </div>
  );
};
