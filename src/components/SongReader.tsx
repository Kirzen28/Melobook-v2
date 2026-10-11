import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Song } from '../types';
import { 
  parseChordPro, 
  transposeChord, 
  metronome,
  updateSectionRepeatInChordPro,
  updateSectionMetaInChordPro,
  getVocalBadgeStyle,
  getSongDuration,
  parseDurationToSeconds,
  formatSecondsToMinutes,
  formatDurationToMMSS,
  calculateSongAutoDuration,
  LATIN_NOTES,
  getSemitoneDifference,
  transposeChordProText,
  stripParentheses,
  parseTimeSignatureToBeats
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
import { VocalArrangementSelector } from './editor/VocalArrangementSelector';
import { metronomeAudio } from '../utils/metronomeAudio';
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
  ArrowRight,
  Zap,
  Shield,
  Copyright,
  Radio,
  Tv,
  ExternalLink
} from 'lucide-react';
import { 
  buildPresentationSlides, 
  broadcastPresentationState, 
  listenForSyncRequests, 
  subscribeToPresentation 
} from '../utils/presentationUtils';
import { SetlistPdfModal } from './SetlistPdfModal';
import { ChordModal } from './ChordModal';
import { LanguageVersionModal } from './LanguageVersionModal';
import { PadControl } from './PadControl';
import { PRESET_LANGUAGES, getLanguageMeta, getLinkedSongVersions } from '../utils/languageUtils';
import { DEFAULT_SONG_METADATA_VISIBILITY } from '../utils/displayDefaults';

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
    canManageSongs,
    canManageSetlists
  } = useApp();

  const metaVis = displaySettings.metadataVisibility || DEFAULT_SONG_METADATA_VISIBILITY;

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
  const scrollPosRef = useRef<number>(0);

  // Parse ChordPro
  const parsedData = useMemo(() => {
    if (!song) return null;
    return parseChordPro(song.contentChordPro);
  }, [song?.contentChordPro]);

  // Base parameters
  const catalogBaseKey = (parsedData?.hasExplicitKey && parsedData.key) || song?.key || parsedData?.key || 'C';
  const effectiveBaseKey = setlistOverride?.key || catalogBaseKey;
  const effectiveTransposeOffset = stageSettings.transposeOffset !== 0
    ? stageSettings.transposeOffset
    : (setlistOverride?.transposeOffset !== undefined ? setlistOverride.transposeOffset : 0);
  const effectiveTempo = setlistOverride?.tempo || song?.tempo || parsedData?.tempo || 120;
  const rawDuration = setlistOverride?.duration || song?.duration || parsedData?.duration || '03:30';
  const effectiveDuration = useMemo(() => formatDurationToMMSS(rawDuration), [rawDuration]);
  const effectiveCcli = (song?.ccli || parsedData?.ccli || '').trim();
  const effectiveCopyright = (song?.copyright || parsedData?.copyright || '').trim();

  // Durée du chant en secondes pour le calcul du défilement automatique
  const songDurationSeconds = useMemo(() => {
    const parsedSec = parseDurationToSeconds(effectiveDuration);
    if (parsedSec && parsedSec > 0) return parsedSec;
    if (song?.contentChordPro) {
      const autoCalc = calculateSongAutoDuration(song.contentChordPro, effectiveTempo, song?.timeSignature);
      if (autoCalc && autoCalc.seconds > 0) return autoCalc.seconds;
    }
    return 210; // 3 min 30 s par défaut
  }, [effectiveDuration, song?.contentChordPro, effectiveTempo, song?.timeSignature]);

  const handleToggleAutoScroll = useCallback(() => {
    if (!stageSettings.isAutoScrolling && containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      // Si on est déjà tout en bas (à moins de 10px de la fin), on repart du début du chant
      if (scrollTop + clientHeight >= scrollHeight - 10) {
        containerRef.current.scrollTop = 0;
        scrollPosRef.current = 0;
      } else {
        scrollPosRef.current = scrollTop;
      }
    }
    updateStageSettings({ isAutoScrolling: !stageSettings.isAutoScrolling });
  }, [stageSettings.isAutoScrolling, updateStageSettings]);
  const effectiveNotes = setlistOverride?.notes !== undefined ? setlistOverride.notes : (song?.notes || '');
  const personalCapo = stageSettings.capo || 0;
  const effectiveCapo = personalCapo > 0 
    ? personalCapo 
    : (setlistOverride?.capo !== undefined ? setlistOverride.capo : (song?.capo || 0));

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
  const [showCapoMenu, setShowCapoMenu] = useState(false);
  const [showTempoMenu, setShowTempoMenu] = useState(false);
  const [showZoomMenu, setShowZoomMenu] = useState(false);

  // État du métronome et du flash écran
  const [isMetronomePlaying, setIsMetronomePlaying] = useState<boolean>(() => metronome.getIsPlaying());
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

  // Édition directe du tempo dans le popover "Réglage du tempo"
  const [isEditingTempoPopover, setIsEditingTempoPopover] = useState(false);
  const [tempoInputValue, setTempoInputValue] = useState(String(effectiveTempo));
  const tempoInputRef = useRef<HTMLInputElement>(null);

  // Refs for toolbar buttons to calculate viewport-safe placement
  const keyButtonRef = useRef<HTMLButtonElement>(null);
  const transposeButtonRef = useRef<HTMLButtonElement>(null);
  const capoButtonRef = useRef<HTMLButtonElement>(null);
  const tempoButtonRef = useRef<HTMLButtonElement>(null);
  const zoomButtonRef = useRef<HTMLButtonElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

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
  const [capoPopoverStyle, setCapoPopoverStyle] = useState<React.CSSProperties>({ left: 0 });
  const [keyPopoverStyle, setKeyPopoverStyle] = useState<React.CSSProperties>({ left: 0 });
  const [zoomPopoverStyle, setZoomPopoverStyle] = useState<React.CSSProperties>({ left: 0 });
  const [settingsPopoverStyle, setSettingsPopoverStyle] = useState<React.CSSProperties>({ right: 0 });

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
    if (showCapoMenu) {
      const update = () => setCapoPopoverStyle(calculatePopoverPos(capoButtonRef.current));
      update();
      window.addEventListener('resize', update);
      window.addEventListener('scroll', update, true);
      return () => {
        window.removeEventListener('resize', update);
        window.removeEventListener('scroll', update, true);
      };
    }
  }, [showCapoMenu]);

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
    if (isSetlistMode && currentSetlist && song && canManageSetlists) {
      await updateSetlistSongOverride(currentSetlist.id, song.id, { transposeOffset: newOffset });
    } else {
      updateStageSettings({ transposeOffset: newOffset });
      showFeedbackToast(`Transposition : ${newOffset > 0 ? `+${newOffset}` : newOffset} (personnel)`);
    }
  };

  const handleResetTranspose = async () => {
    if (isSetlistMode && currentSetlist && song && canManageSetlists) {
      await updateSetlistSongOverride(currentSetlist.id, song.id, { transposeOffset: 0 });
    } else {
      updateStageSettings({ transposeOffset: 0 });
      showFeedbackToast('Transposition remise à zéro (personnel)');
    }
  };

  const handleSetTransposeOffset = async (newOffset: number) => {
    if (isSetlistMode && currentSetlist && song && canManageSetlists) {
      await updateSetlistSongOverride(currentSetlist.id, song.id, { transposeOffset: newOffset });
    } else {
      updateStageSettings({ transposeOffset: newOffset });
      showFeedbackToast(`Transposition : ${newOffset > 0 ? `+${newOffset}` : newOffset} (personnel)`);
    }
  };

  const handleSetBaseKey = async (targetKey: string) => {
    if (!song) return;

    if (isSetlistMode && currentSetlist && canManageSetlists) {
      await updateSetlistSongOverride(currentSetlist.id, song.id, { key: targetKey, transposeOffset: 0 });
      showFeedbackToast(`Tonalité par défaut de la setlist définie sur ${targetKey}`);
    } else if (canManageSongs && !isSetlistMode) {
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
      showFeedbackToast(`Tonalité enregistrée dans le répertoire : ${targetKey}`);
    } else {
      // Pour un membre, régie ou mode lecture seule :
      // On calcule le décalage de transposition pour son jeu personnel
      const currentBaseKey = (parsedData?.hasExplicitKey && parsedData.key)
        ? parsedData.key
        : (song.key || parsedData?.key || 'C');

      const semitones = getSemitoneDifference(currentBaseKey, targetKey);
      updateStageSettings({ transposeOffset: semitones });
      showFeedbackToast(`Tonalité ${targetKey} appliquée (votre affichage personnel)`);
    }
  };

  const handleSetCapo = async (fret: number) => {
    if (!song) return;
    if (isSetlistMode && currentSetlist && canManageSetlists) {
      await updateSetlistSongOverride(currentSetlist.id, song.id, { capo: fret });
      showFeedbackToast(fret > 0 ? `Capo ${fret} fixé pour la setlist` : 'Capo retiré de la setlist');
    } else {
      updateStageSettings({ capo: fret });
      showFeedbackToast(fret > 0 ? `Capo ${fret} (votre réglage personnel 🎵)` : 'Capodastre retiré');
    }
    setShowCapoMenu(false);
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

  // Section Vocals Handler
  const handleUpdateSectionVocals = async (sectionIdx: number, newVocals: string[]) => {
    if (!song || !canManageSongs) return;
    const updatedContent = updateSectionMetaInChordPro(song.contentChordPro, sectionIdx, { newVocals });
    await updateSong(song.id, { contentChordPro: updatedContent });
    if (selectedSong && selectedSong.id === song.id) {
      setSelectedSong({ ...selectedSong, contentChordPro: updatedContent });
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

  // Synchronisation avec la préférence du flash écran
  useEffect(() => {
    enableScreenFlashRef.current = enableScreenFlash;
    try {
      localStorage.setItem('songbook_metronome_flash', enableScreenFlash ? 'true' : 'false');
    } catch {}
  }, [enableScreenFlash]);

  // Déclenchement du flash écran visuel discret
  const triggerScreenFlash = useCallback((isAccent: boolean) => {
    if (flashTimeoutRef.current) {
      window.clearTimeout(flashTimeoutRef.current);
    }
    setFlashActive(isAccent ? 'accent' : 'beat');
    flashTimeoutRef.current = window.setTimeout(() => {
      setFlashActive(null);
      flashTimeoutRef.current = null;
    }, 75);
  }, []);

  // Synchronisation globale du métronome et des pulsations de beat
  useEffect(() => {
    const unsubState = metronome.subscribeState((playing) => {
      setIsMetronomePlaying(playing);
      if (!playing) {
        setFlashActive(null);
      }
    });

    const unsubBeat = metronome.subscribeBeat((_beat, isAccent) => {
      if (enableScreenFlashRef.current) {
        triggerScreenFlash(isAccent);
      }
    });

    return () => {
      unsubState();
      unsubBeat();
      metronome.stop();
      if (flashTimeoutRef.current) {
        window.clearTimeout(flashTimeoutRef.current);
      }
    };
  }, [triggerScreenFlash]);

  // Démarrer ou arrêter le métronome
  const handleToggleMetronome = useCallback(() => {
    if (metronome.getIsPlaying()) {
      metronome.stop();
    } else {
      // Arrêter le métronome externe autonome s'il est en cours pour éviter tout mélange sonore
      if (metronomeAudio.getState().isPlaying) {
        metronomeAudio.stop();
      }
      const validBpm = Math.max(30, Math.min(280, effectiveTempo));
      const sigInfo = parseTimeSignatureToBeats(song?.timeSignature || parsedData?.timeSignature || '4/4');
      metronome.start(validBpm, sigInfo.beatsPerMeasure, sigInfo.accents);
    }
  }, [effectiveTempo, song?.timeSignature, parsedData?.timeSignature]);

  // Activer ou désactiver le flash écran avec aperçu instantané
  const handleToggleScreenFlash = useCallback(() => {
    const nextVal = !enableScreenFlash;
    setEnableScreenFlash(nextVal);
    enableScreenFlashRef.current = nextVal;
    try {
      localStorage.setItem('songbook_metronome_flash', nextVal ? 'true' : 'false');
    } catch {}
    if (nextVal) {
      triggerScreenFlash(true);
    } else {
      if (flashTimeoutRef.current) {
        window.clearTimeout(flashTimeoutRef.current);
      }
      setFlashActive(null);
    }
  }, [enableScreenFlash, triggerScreenFlash]);

  // Validation de la saisie libre du tempo
  const commitTempoInput = useCallback(async () => {
    const parsed = parseInt(tempoInputValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      const clamped = Math.max(30, Math.min(280, parsed));
      setTempoInputValue(String(clamped));
      await handleUpdateTempo(clamped);
    } else {
      setTempoInputValue(String(effectiveTempo));
    }
    setIsEditingTempoPopover(false);
  }, [tempoInputValue, effectiveTempo, handleUpdateTempo]);

  // Synchronisation de la valeur affichée du tempo tant qu'on n'est pas en train d'écrire
  useEffect(() => {
    if (!isEditingTempoPopover) {
      setTempoInputValue(String(effectiveTempo));
    }
  }, [effectiveTempo, isEditingTempoPopover]);

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

  // Auto-Scroll Loop : vitesse calculée précisément selon la durée du chant
  useEffect(() => {
    if (!stageSettings.isAutoScrolling) {
      if (scrollAnimRef.current) {
        cancelAnimationFrame(scrollAnimRef.current);
        scrollAnimRef.current = null;
      }
      return;
    }

    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 10) {
        containerRef.current.scrollTop = 0;
        scrollPosRef.current = 0;
      } else {
        scrollPosRef.current = scrollTop;
      }
    }

    lastScrollTimeRef.current = performance.now();

    const scrollStep = (time: number) => {
      const delta = (time - lastScrollTimeRef.current) / 1000;
      lastScrollTimeRef.current = time;

      if (containerRef.current) {
        const { scrollHeight, clientHeight } = containerRef.current;
        const totalScrollable = Math.max(0, scrollHeight - clientHeight);

        if (totalScrollable <= 0) {
          updateStageSettings({ isAutoScrolling: false });
          return;
        }

        const durationSec = Math.max(10, songDurationSeconds);
        // Vitesse en pixels par seconde calée précisément sur la durée totale du chant
        const pxPerSecond = totalScrollable / durationSec;

        scrollPosRef.current += pxPerSecond * delta;
        containerRef.current.scrollTop = scrollPosRef.current;

        const currentTop = containerRef.current.scrollTop;
        const progress = Math.min(100, Math.round((currentTop / totalScrollable) * 100)) || 0;
        setScrollProgress(progress);

        // Détection arrivée en bas de page
        if (currentTop + clientHeight >= scrollHeight - 2) {
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
  }, [stageSettings.isAutoScrolling, songDurationSeconds, updateStageSettings]);

  // Manual scroll progress tracker
  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      scrollPosRef.current = scrollTop;
      const totalScrollable = Math.max(1, scrollHeight - clientHeight);
      const progress = Math.min(100, Math.round((scrollTop / totalScrollable) * 100)) || 0;
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
        handleToggleAutoScroll();
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
      handleToggleAutoScroll();
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
      
      {/* Flash écran contour rythmé (métronome) */}
      {flashActive && (
        <div 
          id="songreader-screen-flash-overlay"
          className={`fixed inset-0 pointer-events-none z-[99999] bg-transparent transition-opacity duration-75 ${
            flashActive === 'accent'
              ? 'ring-4 sm:ring-8 ring-inset ring-amber-400/90 shadow-[inset_0_0_24px_rgba(251,191,36,0.35)]'
              : 'ring-2 sm:ring-4 ring-inset ring-emerald-400/70 shadow-[inset_0_0_16px_rgba(52,211,153,0.25)]'
          }`}
        />
      )}

      {/* Progress Bar for Auto-Scroll */}
      <div className="no-print w-full h-0.5 bg-[#222224] overflow-hidden">
        <div 
          className="h-full bg-blue-600 transition-all duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Settings Popover (compact, anchored to the settings button) */}
      {showSettingsDrawer && (
        <>
          {/* Backdrop to close */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowSettingsDrawer(false)}
          />
          <div
            style={settingsPopoverStyle}
            className="no-print absolute z-50 w-[340px] sm:w-[420px] max-w-[calc(100vw-20px)] max-h-[85vh] overflow-y-auto custom-scrollbar bg-[#16161A] border border-[#2E2E36] rounded-2xl shadow-2xl p-3 sm:p-4 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 box-border text-xs"
          >
            {/* En-tête */}
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#282830]">
              <div className="flex items-center gap-1.5">
                <Settings2 className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-semibold text-gray-200 text-[11px]">Réglages du chant</span>
                {song.title && (
                  <span className="text-[10px] text-gray-400 font-normal truncate max-w-[120px]">
                    — {stripParentheses(song.title)}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsDrawer(false)}
                className="p-1 rounded-md text-gray-500 hover:text-white hover:bg-[#252530] transition-all cursor-pointer"
                title="Fermer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Pad d'accompagnement (Tonic Pad) */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-sky-400" />
                  <span>Pad d'accompagnement</span>
                </span>
                <span className="text-[10px] text-sky-400/90 font-mono font-bold bg-sky-950/40 border border-sky-500/30 px-1.5 py-0.5 rounded">
                  Tonalité {baseKeyDisplay}
                </span>
              </div>
              <PadControl 
                songKey={parsedData.key || song.key} 
                transposeOffset={effectiveTransposeOffset}
              />
            </div>

            {/* Accords */}
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-gray-400 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span>Accords</span>
              </span>
              <div className="inline-flex items-center p-0.5 rounded-lg bg-[#1A1A20] border border-[#2B2B34]">
                <button
                  type="button"
                  onClick={() => updateStageSettings({ showChords: true })}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    stageSettings.showChords
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  <span>Affichés</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateStageSettings({ showChords: false })}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    !stageSettings.showChords
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <EyeOff className="w-3 h-3" />
                  <span>Masqués</span>
                </button>
              </div>
            </div>

            {/* Taille du texte */}
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-gray-400 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
                <span>Taille</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSetZoomPercentage(zoomPercentage - 5)}
                  disabled={zoomPercentage <= 65}
                  className="p-1 rounded bg-[#202026] hover:bg-[#282832] text-gray-300 disabled:opacity-30 border border-[#30303A] cursor-pointer transition-colors"
                  title="Réduire (-5%)"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono font-bold text-blue-400 text-xs w-10 text-center">
                  {zoomPercentage}%
                </span>
                <button
                  type="button"
                  onClick={() => handleSetZoomPercentage(zoomPercentage + 5)}
                  disabled={zoomPercentage >= 175}
                  className="p-1 rounded bg-[#202026] hover:bg-[#282832] text-gray-300 disabled:opacity-30 border border-[#30303A] cursor-pointer transition-colors"
                  title="Agrandir (+5%)"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="text-[10px] text-blue-400 hover:text-blue-300 cursor-pointer transition-colors shrink-0"
                  title="Rétablir à 100%"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Slider zoom */}
            <div className="mb-3">
              <input
                type="range"
                min="65"
                max="175"
                step="5"
                value={zoomPercentage}
                onChange={(e) => handleSetZoomPercentage(Number(e.target.value))}
                className="w-full h-2 bg-[#26262E] rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[9px] text-gray-600 mt-0.5 px-0.5">
                <span>65%</span>
                <span>100%</span>
                <span>175%</span>
              </div>
            </div>

            {/* Séparateur */}
            <div className="border-t border-[#282830] mb-2.5" />

            {/* Défilement automatique */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Play className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="text-gray-400 font-medium">Défilement</span>
                <span className="text-[10px] font-mono text-gray-500 ml-0.5 truncate" title={`Vitesse calée sur la durée du chant (${effectiveDuration})`}>
                  ({effectiveDuration})
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggleAutoScroll}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 shadow-xs ${
                  stageSettings.isAutoScrolling
                    ? 'bg-amber-600 hover:bg-amber-500 text-white ring-1 ring-amber-400/40'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white ring-1 ring-emerald-400/30'
                }`}
                title={stageSettings.isAutoScrolling ? "Mettre en pause le défilement" : `Lancer le défilement calé sur la durée (${effectiveDuration})`}
              >
                {stageSettings.isAutoScrolling ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Play</span>
                  </>
                )}
              </button>
            </div>

            {/* Écouter le chant (Recherche rapide YouTube & Spotify) */}
            <div className="border-t border-[#282830] mt-3 pt-2.5">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Écouter le chant</span>
                <span className="text-[10px] text-gray-500 font-normal">Recherche directe</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent([parsedData.title || song.title, parsedData.artist || song.artist].filter(Boolean).join(' '))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-[#1C1C22] hover:bg-[#FF0000]/15 text-gray-200 hover:text-[#FF4E4E] border border-[#2E2E36] hover:border-[#FF0000]/40 text-xs font-semibold transition-all cursor-pointer group shadow-xs"
                  title={`Rechercher « ${song.title} » sur YouTube (nouvel onglet / application)`}
                >
                  <svg className="w-3.5 h-3.5 text-red-500 fill-current shrink-0 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  <span>YouTube</span>
                </a>

                <a
                  href={`https://open.spotify.com/search/${encodeURIComponent([parsedData.title || song.title, parsedData.artist || song.artist].filter(Boolean).join(' '))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-[#1C1C22] hover:bg-[#1DB954]/15 text-gray-200 hover:text-[#1ED760] border border-[#2E2E36] hover:border-[#1DB954]/40 text-xs font-semibold transition-all cursor-pointer group shadow-xs"
                  title={`Rechercher « ${song.title} » sur Spotify (nouvel onglet / application)`}
                >
                  <svg className="w-3.5 h-3.5 text-emerald-400 fill-current shrink-0 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                  </svg>
                  <span>Spotify</span>
                </a>
              </div>
            </div>

            {/* Actions du chant : Éditer & Exporter en PDF (particulièrement en mode mobile) */}
            <div className="border-t border-[#282830] mt-3 pt-2.5 flex flex-col gap-1.5">
              {canManageSongs && (
                <button
                  type="button"
                  onClick={() => {
                    setShowSettingsDrawer(false);
                    setActiveTab('editor');
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#1C1C22] hover:bg-amber-500/15 border border-[#2E2E36] hover:border-amber-500/50 text-gray-200 hover:text-amber-300 transition-all cursor-pointer group"
                  title="Éditer le chant"
                >
                  <span className="flex items-center gap-2">
                    <FileEdit className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                    <span className="font-medium text-xs">Éditer le chant</span>
                  </span>
                  <span className="text-[10px] text-gray-500 group-hover:text-amber-400/80">Ouvrir</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowSettingsDrawer(false);
                  setShowPdfModal(true);
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#1C1C22] hover:bg-emerald-500/15 border border-[#2E2E36] hover:border-emerald-500/50 text-gray-200 hover:text-emerald-300 transition-all cursor-pointer group"
                title="Exporter en PDF"
              >
                <span className="flex items-center gap-2">
                  <FileDown className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span className="font-medium text-xs">Exporter en PDF</span>
                </span>
                <span className="text-[10px] text-gray-500 group-hover:text-emerald-400/80">PDF</span>
              </button>
            </div>
          </div>
        </>
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
                {/* Left: Bouton déplier + Titre */}
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
                  {metaVis.title !== false && (
                    <span className="font-bold text-white text-xs sm:text-sm truncate">
                      {stripParentheses(parsedData.title || song.title)}
                    </span>
                  )}
                </div>

                {/* Right: Tonalité + Métronome + Actions */}
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                  {metaVis.controlsBar && (
                    <>
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
                    </>
                  )}

                  {metaVis.actions && (
                    <>
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
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="border-b border-[#222224] pb-2 sm:pb-3 mb-2.5 sm:mb-4">
              <div className="flex items-start justify-between gap-2 sm:gap-3 mb-1.5 sm:mb-2">
                {/* Left: Title & Artist */}
                <div className="flex-1 min-w-0 pr-1 sm:pr-2">
                  <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 mb-0.5">
                    {metaVis.title !== false && (
                      <h1 
                        className="font-bold tracking-tight text-white leading-tight break-words"
                        style={{ fontSize: `clamp(17px, 3.8vw, ${displaySettings.typography.titleSize}px)` }}
                      >
                        {stripParentheses(parsedData.title || song.title)}
                      </h1>
                    )}

                  {/* Liste dépliante : Langue et versions du chant à la suite du titre */}
                  {metaVis.language && (() => {
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
                  {metaVis.duration && (
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
                  )}
                </div>
              </div>

              {/* Right: Boutons Plein écran, Édition & Réglages */}
              {metaVis.actions && (
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
              )}
            </div>

            {/* Ligne Artiste, Catégories, CCLI & Copyright */}
            {((metaVis.artist && song.artist) || (metaVis.tags && song.tags && song.tags.length > 0) || (metaVis.ccli && effectiveCcli) || (metaVis.copyright && effectiveCopyright)) && (
              <div className="w-full flex items-center gap-1.5 sm:gap-2 flex-wrap mb-1.5 sm:mb-2 text-xs">
                {metaVis.artist && song.artist && (
                  <div 
                    className="text-gray-300 font-medium break-words shrink-0"
                    style={{ fontSize: `${displaySettings.typography.metadataSize}px` }}
                  >
                    {song.artist}
                  </div>
                )}

                {metaVis.tags && song.tags && song.tags.length > 0 && (
                  <div 
                    className={`w-full sm:w-auto flex items-center gap-1 sm:gap-1.5 flex-wrap ${metaVis.artist && song.artist ? 'sm:border-l sm:border-[#2A2A2E] sm:pl-2' : ''}`}
                    style={{ fontSize: `${displaySettings.typography.metadataSize}px` }}
                  >
                    {song.tags.map((cat, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#18181C] border border-[#2A2A30] text-gray-300 font-medium shadow-xs"
                        style={{ fontSize: `${displaySettings.typography.metadataSize}px` }}
                      >
                        <Tag className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-400" />
                        <span>{cat}</span>
                      </span>
                    ))}
                  </div>
                )}

                {metaVis.ccli && effectiveCcli && (
                  <div 
                    className={`flex items-center gap-1 ${(metaVis.artist && song.artist) || (metaVis.tags && song.tags && song.tags.length > 0) ? 'sm:border-l sm:border-[#2A2A2E] sm:pl-2' : ''}`}
                    style={{ fontSize: `${displaySettings.typography.metadataSize}px` }}
                  >
                    <a
                      href={`https://songselect.ccli.com/Songs/${effectiveCcli.replace(/\D/g, '') || effectiveCcli}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#18181C] hover:bg-[#222228] border border-[#2A2A30] hover:border-blue-500/50 text-gray-300 transition-colors group cursor-pointer shadow-xs"
                      style={{ fontSize: `${displaySettings.typography.metadataSize}px` }}
                      title={`Numéro CCLI : #${effectiveCcli} (Cliquer pour ouvrir sur SongSelect)`}
                    >
                      <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-400 group-hover:scale-110 transition-transform" />
                      <span className="text-blue-300 font-mono font-semibold" style={{ fontSize: `${displaySettings.typography.metadataSize}px` }}>CCLI #{effectiveCcli}</span>
                    </a>
                  </div>
                )}

                {metaVis.copyright && effectiveCopyright && (
                  <div 
                    className={`flex items-center gap-1 ${((metaVis.artist && song.artist) || (metaVis.tags && song.tags && song.tags.length > 0) || (metaVis.ccli && effectiveCcli)) ? 'sm:border-l sm:border-[#2A2A2E] sm:pl-2' : ''}`}
                    style={{ fontSize: `${displaySettings.typography.metadataSize}px` }}
                  >
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#18181C] border border-[#2A2A30] text-gray-400 max-w-[260px] sm:max-w-md truncate shadow-xs"
                      style={{ fontSize: `${displaySettings.typography.metadataSize}px` }}
                      title={`Copyright : ${effectiveCopyright}`}
                    >
                      <Copyright className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-500 shrink-0" />
                      <span className="truncate">{effectiveCopyright}</span>
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Single Line Toolbar: Stylized Inline Controls with Dropdowns for Tonalité, Transposition & BPM */}
            {metaVis.controlsBar && (
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
                    setShowCapoMenu(false);
                    setShowTempoMenu(false);
                    setShowZoomMenu(false);
                    if (next) {
                      setKeyPopoverStyle(calculatePopoverPos(keyButtonRef.current));
                    }
                  }}
                  className={`min-h-[32px] py-1 inline-flex items-center gap-1.5 px-2.5 rounded-lg border font-mono shadow-xs transition-all cursor-pointer ${
                    showKeyMenu
                      ? 'bg-[#1C1C22] border-blue-500 text-white ring-1 ring-blue-500/40'
                      : 'bg-[#141416] hover:bg-[#1A1A1E] border-[#242428] hover:border-blue-500/40 text-gray-300'
                  }`}
                  style={{ fontSize: `${displaySettings.typography.metadataSize}px` }}
                  title="Cliquer pour choisir la tonalité - liste déroulante"
                >
                  <Music className="w-3.5 h-3.5 text-blue-400 shrink-0" style={{ width: `${Math.max(12, Math.round(displaySettings.typography.metadataSize * 0.9))}px`, height: `${Math.max(12, Math.round(displaySettings.typography.metadataSize * 0.9))}px` }} />
                  <span className="text-gray-400 font-sans hidden sm:inline" style={{ fontSize: `${displaySettings.typography.metadataSize}px` }}>Tonalité :</span>
                  <span className="text-blue-400 font-bold font-mono" style={{ fontSize: `${displaySettings.typography.metadataSize}px` }}>{baseKeyDisplay}</span>
                  {effectiveTransposeOffset !== 0 && transposedKeyDisplay && (
                    <span 
                      className="text-amber-400 font-bold font-mono ml-0.5" 
                      style={{ fontSize: `${displaySettings.typography.metadataSize}px` }}
                      title={`Transposition piano : ${effectiveTransposeOffset > 0 ? `+${effectiveTransposeOffset}` : effectiveTransposeOffset} demi-tons (sonorité réelle : ${transposedKeyDisplay})`}
                    >
                      (Sonne {transposedKeyDisplay})
                    </span>
                  )}
                  <ChevronDown className={`w-3 h-3 text-blue-400/80 transition-transform ${showKeyMenu ? 'rotate-180' : ''}`} style={{ width: `${Math.max(11, Math.round(displaySettings.typography.metadataSize * 0.8))}px`, height: `${Math.max(11, Math.round(displaySettings.typography.metadataSize * 0.8))}px` }} />
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
                    setShowCapoMenu(false);
                    setShowTempoMenu(false);
                    setShowZoomMenu(false);
                    if (next) {
                      setTransposePopoverStyle(calculatePopoverPos(transposeButtonRef.current));
                    }
                  }}
                  className={`min-h-[32px] py-1 inline-flex items-center gap-1.5 px-2.5 rounded-lg border font-mono shadow-xs transition-all cursor-pointer ${
                    showTransposeMenu
                      ? 'bg-amber-950/40 border-amber-500 text-amber-300 ring-1 ring-amber-500/40'
                      : effectiveTransposeOffset !== 0
                        ? 'bg-amber-950/30 hover:bg-amber-950/50 border-amber-500/40 text-amber-300'
                        : 'bg-[#141416] hover:bg-[#1A1A1E] border-[#242428] hover:border-amber-500/40 text-gray-300'
                  }`}
                  style={{ fontSize: `${displaySettings.typography.metadataSize}px` }}
                  title="Cliquer pour choisir la transposition (logique piano) - liste déroulante"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-amber-400 shrink-0" style={{ width: `${Math.max(12, Math.round(displaySettings.typography.metadataSize * 0.9))}px`, height: `${Math.max(12, Math.round(displaySettings.typography.metadataSize * 0.9))}px` }} />
                  <span className="text-amber-400/90 font-sans shrink-0 hidden sm:inline" style={{ fontSize: `${displaySettings.typography.metadataSize}px` }}>Transpose :</span>
                  <span className={`px-1.5 py-0.5 rounded font-mono font-bold ${
                    effectiveTransposeOffset !== 0
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-[#18181C] text-gray-300 border border-[#242428]'
                  }`}
                  style={{ fontSize: `${displaySettings.typography.metadataSize}px` }}
                  >
                    {effectiveTransposeOffset === 0 
                      ? '0' 
                      : (effectiveTransposeOffset > 0 ? `+${effectiveTransposeOffset}` : `${effectiveTransposeOffset}`)}
                  </span>
                  {effectiveTransposeOffset !== 0 && transposedKeyDisplay && (
                    <span className="text-amber-300/90 font-mono font-semibold hidden md:inline" style={{ fontSize: `${Math.max(10, displaySettings.typography.metadataSize - 1)}px` }}>
                      (Sonne {transposedKeyDisplay})
                    </span>
                  )}
                  <ChevronDown className={`w-3 h-3 text-amber-400/80 transition-transform ${showTransposeMenu ? 'rotate-180' : ''}`} style={{ width: `${Math.max(11, Math.round(displaySettings.typography.metadataSize * 0.8))}px`, height: `${Math.max(11, Math.round(displaySettings.typography.metadataSize * 0.8))}px` }} />
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

              {/* Capodastre : Module stylisé avec affichage et sélection */}
              <div className="relative inline-block">
                <button
                  ref={capoButtonRef}
                  id="btn-song-capo"
                  type="button"
                  onClick={() => {
                    const next = !showCapoMenu;
                    setShowCapoMenu(next);
                    setShowKeyMenu(false);
                    setShowTransposeMenu(false);
                    setShowTempoMenu(false);
                    setShowZoomMenu(false);
                    if (next) {
                      setCapoPopoverStyle(calculatePopoverPos(capoButtonRef.current));
                    }
                  }}
                  className={`min-h-[32px] py-1 inline-flex items-center gap-1.5 px-2.5 rounded-lg border font-mono shadow-xs transition-all cursor-pointer ${
                    showCapoMenu
                      ? 'bg-purple-950/40 border-purple-500 text-purple-300 ring-1 ring-purple-500/40'
                      : effectiveCapo > 0
                      ? 'bg-purple-950/30 border-purple-500/50 text-purple-300'
                      : 'bg-[#141416] hover:bg-[#1A1A1E] border-[#242428] hover:border-purple-500/40 text-gray-300'
                  }`}
                  style={{ fontSize: `${displaySettings.typography.metadataSize}px` }}
                  title="Cliquer pour afficher et régler le capodastre"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400 shrink-0" style={{ width: `${Math.max(12, Math.round(displaySettings.typography.metadataSize * 0.9))}px`, height: `${Math.max(12, Math.round(displaySettings.typography.metadataSize * 0.9))}px` }} />
                  <span className="text-gray-400 font-sans hidden sm:inline" style={{ fontSize: `${displaySettings.typography.metadataSize}px` }}>Capo :</span>
                  <span className="text-purple-400 font-bold font-mono" style={{ fontSize: `${displaySettings.typography.metadataSize}px` }}>
                    {effectiveCapo > 0 ? effectiveCapo : '0'}
                  </span>
                  {personalCapo > 0 && (
                    <span className="px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-sans hidden sm:inline" style={{ fontSize: `${Math.max(9, displaySettings.typography.metadataSize - 2)}px` }}>
                      Perso
                    </span>
                  )}
                  <ChevronDown className={`w-3 h-3 text-purple-400/80 transition-transform ${showCapoMenu ? 'rotate-180' : ''}`} style={{ width: `${Math.max(11, Math.round(displaySettings.typography.metadataSize * 0.8))}px`, height: `${Math.max(11, Math.round(displaySettings.typography.metadataSize * 0.8))}px` }} />
                </button>

                {showCapoMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowCapoMenu(false)} 
                    />
                    <div 
                      style={capoPopoverStyle}
                      className="absolute top-full mt-1.5 z-50 w-72 max-w-[calc(100vw-24px)] bg-[#16161A] border border-[#2E2E36] rounded-xl shadow-2xl p-2.5 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 box-border"
                    >
                      <div className="text-[11px] font-semibold text-gray-400 pb-2 mb-2 border-b border-[#282830] flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-purple-300">
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          <span>Capodastre ({isSetlistMode && canManageSetlists ? 'Défaut Setlist' : 'Personnel'})</span>
                        </span>
                        <span className="text-[10px] text-purple-400 font-mono">Actuel : {effectiveCapo > 0 ? `Case ${effectiveCapo}` : 'Aucun'}</span>
                      </div>

                      <div className="grid grid-cols-4 gap-1.5 text-xs mb-2">
                        {[0, 1, 2, 3, 4, 5, 6, 7].map((fret) => {
                          const isSelected = effectiveCapo === fret;
                          return (
                            <button
                              key={fret}
                              type="button"
                              onClick={() => handleSetCapo(fret)}
                              className={`py-1.5 px-2 rounded-lg font-mono text-xs transition-colors cursor-pointer flex flex-col items-center justify-center ${
                                isSelected
                                  ? 'bg-purple-600 text-white font-bold shadow-xs'
                                  : 'bg-[#1C1C22] text-gray-300 hover:bg-[#25252D] hover:text-white border border-[#2E2E36]'
                              }`}
                            >
                              <span className="text-xs font-bold">{fret === 0 ? 'Sans' : fret}</span>
                              <span className="text-[9px] text-gray-400">{fret === 0 ? 'Capo' : `Case ${fret}`}</span>
                            </button>
                          );
                        })}
                      </div>

                      <p className="text-[10px] text-gray-400 bg-[#101014] p-1.5 rounded border border-[#222228] leading-tight">
                        🎸 {isSetlistMode && canManageSetlists 
                          ? "En tant que responsable, vous fixez le capodastre par défaut pour cette setlist." 
                          : "Ce réglage est mémorisé sur votre appareil et n'affecte pas les autres musiciens."}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Tempo / BPM : Module stylisé avec affichage et réglage rapide */}
              <div className="relative inline-block">
                <button
                  ref={tempoButtonRef}
                  id="btn-song-tempo"
                  type="button"
                  onClick={() => {
                    const next = !showTempoMenu;
                    setShowTempoMenu(next);
                    setShowKeyMenu(false);
                    setShowTransposeMenu(false);
                    setShowCapoMenu(false);
                    setShowZoomMenu(false);
                    if (next) {
                      setTempoPopoverStyle(calculatePopoverPos(tempoButtonRef.current));
                    }
                  }}
                  className={`min-h-[32px] py-1 inline-flex items-center gap-1.5 px-2.5 rounded-lg border font-mono shadow-xs transition-all cursor-pointer ${
                    showTempoMenu
                      ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/40'
                      : isMetronomePlaying
                        ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-300 ring-1 ring-emerald-500/40 shadow-xs'
                        : 'bg-[#141416] hover:bg-[#1A1A1E] border-[#242428] hover:border-emerald-500/40 text-gray-300'
                  }`}
                  style={{ fontSize: `${displaySettings.typography.metadataSize}px` }}
                  title="Cliquer pour afficher et régler le tempo (BPM)"
                >
                  <Gauge className={`w-3.5 h-3.5 text-emerald-400 shrink-0 ${isMetronomePlaying ? 'animate-pulse' : ''}`} style={{ width: `${Math.max(12, Math.round(displaySettings.typography.metadataSize * 0.9))}px`, height: `${Math.max(12, Math.round(displaySettings.typography.metadataSize * 0.9))}px` }} />
                  <span className="text-gray-400 font-sans hidden sm:inline" style={{ fontSize: `${displaySettings.typography.metadataSize}px` }}>Tempo :</span>
                  <span className="text-emerald-400 font-bold font-mono" style={{ fontSize: `${displaySettings.typography.metadataSize}px` }}>{effectiveTempo}</span>
                  <span className="text-gray-400 font-mono" style={{ fontSize: `${Math.max(10, Math.round(displaySettings.typography.metadataSize * 0.9))}px` }}>BPM</span>
                  {isMetronomePlaying && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block shrink-0" />
                  )}
                  <ChevronDown className={`w-3 h-3 text-emerald-400/80 transition-transform ${showTempoMenu ? 'rotate-180' : ''}`} style={{ width: `${Math.max(11, Math.round(displaySettings.typography.metadataSize * 0.8))}px`, height: `${Math.max(11, Math.round(displaySettings.typography.metadataSize * 0.8))}px` }} />
                </button>

                {showTempoMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => {
                        setShowTempoMenu(false);
                        setIsEditingTempoPopover(false);
                      }} 
                    />
                    <div 
                      style={tempoPopoverStyle}
                      className="absolute top-full mt-1.5 z-50 w-72 max-w-[calc(100vw-24px)] bg-[#16161A] border border-[#2E2E36] rounded-xl shadow-2xl p-3 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 box-border"
                    >
                      {/* En-tête */}
                      <div className="text-[11px] font-semibold text-gray-400 pb-2 mb-2 border-b border-[#282830] flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Métronome Scène (Chant)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isMetronomePlaying && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-sans font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Actif
                            </span>
                          )}
                          <span className="text-[10px] text-emerald-400 font-mono font-bold">{effectiveTempo} BPM</span>
                        </div>
                      </div>
                      <div className="text-[10px] text-gray-400 mb-2.5 leading-tight">
                        Tempo spécifique à ce chant. Le métronome général indépendant reste accessible via le menu haut.
                      </div>

                      {/* Stepper rapide avec Tempo Éditable au clic */}
                      <div className="flex items-center justify-between gap-1 mb-2.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateTempo(Math.max(30, effectiveTempo - 10))}
                          className="px-2 py-1.5 rounded bg-[#202026] hover:bg-[#282832] text-gray-300 text-xs font-mono border border-[#30303A] cursor-pointer shrink-0"
                          title="-10 BPM"
                        >
                          -10
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateTempo(Math.max(30, effectiveTempo - 1))}
                          className="p-1.5 rounded bg-[#202026] hover:bg-[#282832] text-gray-300 border border-[#30303A] cursor-pointer shrink-0"
                          title="-1 BPM"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>

                        {/* Valeur du tempo : Clic pour éditer directement */}
                        {isEditingTempoPopover ? (
                          <div className="flex flex-col items-center justify-center min-w-20">
                            <div className="flex items-center gap-1">
                              <input
                                ref={tempoInputRef}
                                type="number"
                                min="30"
                                max="280"
                                value={tempoInputValue}
                                onChange={(e) => setTempoInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    commitTempoInput();
                                  } else if (e.key === 'Escape') {
                                    setIsEditingTempoPopover(false);
                                    setTempoInputValue(String(effectiveTempo));
                                  }
                                }}
                                onBlur={commitTempoInput}
                                autoFocus
                                className="w-16 px-1 py-0.5 text-center font-mono font-bold text-base text-emerald-400 bg-[#0E0E12] border-2 border-emerald-500 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-400 shadow-inner"
                              />
                              <button
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  commitTempoInput();
                                }}
                                className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-xs"
                                title="Valider"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <span className="text-[8px] text-emerald-400/80 font-sans tracking-tight mt-0.5">
                              Entrée pour valider
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setTempoInputValue(String(effectiveTempo));
                              setIsEditingTempoPopover(true);
                              setTimeout(() => {
                                tempoInputRef.current?.focus();
                                tempoInputRef.current?.select();
                              }, 50);
                            }}
                            className="group flex flex-col items-center justify-center px-2 py-0.5 rounded-lg hover:bg-[#202028] border border-transparent hover:border-emerald-500/40 transition-all cursor-pointer min-w-16"
                            title="Cliquer pour saisir directement une valeur de tempo"
                          >
                            <div className="flex items-center gap-1">
                              <span className="font-mono font-bold text-lg text-emerald-400 group-hover:text-emerald-300 transition-colors">
                                {effectiveTempo}
                              </span>
                              <FileEdit className="w-3 h-3 text-gray-500 group-hover:text-emerald-400 transition-colors" />
                            </div>
                            <div className="text-[9px] text-gray-500 group-hover:text-gray-400 font-sans uppercase">
                              BPM
                            </div>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleUpdateTempo(Math.min(260, effectiveTempo + 1))}
                          className="p-1.5 rounded bg-[#202026] hover:bg-[#282832] text-gray-300 border border-[#30303A] cursor-pointer shrink-0"
                          title="+1 BPM"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateTempo(Math.min(260, effectiveTempo + 10))}
                          className="px-2 py-1.5 rounded bg-[#202026] hover:bg-[#282832] text-gray-300 text-xs font-mono border border-[#30303A] cursor-pointer shrink-0"
                          title="+10 BPM"
                        >
                          +10
                        </button>
                      </div>

                      {/* Boutons Play Métronome & Flash Écran */}
                      <div className="grid grid-cols-2 gap-2 mb-2.5">
                        <button
                          type="button"
                          onClick={handleToggleMetronome}
                          className={`py-2 px-3 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            isMetronomePlaying
                              ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-md shadow-emerald-500/25 ring-2 ring-emerald-400/40 animate-pulse'
                              : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                          }`}
                          title={isMetronomePlaying ? 'Arrêter le métronome' : 'Lancer le métronome'}
                        >
                          {isMetronomePlaying ? (
                            <>
                              <Pause className="w-3.5 h-3.5 fill-current" />
                              <span>Pause</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                              <span>Play</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={handleToggleScreenFlash}
                          className={`py-2 px-3 rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            enableScreenFlash
                              ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 shadow-xs'
                              : 'bg-[#202026] hover:bg-[#282832] text-gray-400 hover:text-gray-200 border border-[#30303A]'
                          }`}
                          title={enableScreenFlash ? 'Flash d’écran actif (cliquer pour désactiver)' : 'Activer le flash d’écran sur le tempo'}
                        >
                          <Zap className={`w-3.5 h-3.5 ${enableScreenFlash ? 'fill-amber-400 text-amber-400' : 'text-gray-400'}`} />
                          <span>{enableScreenFlash ? 'Flash actif' : 'Flash écran'}</span>
                        </button>
                      </div>

                      {/* Tap Tempo */}
                      <button
                        type="button"
                        onClick={handleTapTempo}
                        className="w-full py-1.5 px-3 rounded-lg bg-[#202026] hover:bg-[#282832] text-gray-300 hover:text-emerald-300 border border-[#30303A] hover:border-emerald-500/40 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Gauge className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                        <span>Tapez le tempo (Tap)</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
            )}

            {/* Note / Instructions Section (Lecture seule) */}
            {metaVis.notes && effectiveNotes ? (
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

              // Résolution robuste du nom de la section (ex: "Intro", "Couplet 1", "Refrain", "Pont", etc.)
              const sectionTitle = (section.title && section.title.trim()) || (
                section.type === 'verse' ? `Couplet ${sIdx + 1}` :
                section.type === 'chorus' ? 'Refrain' :
                section.type === 'bridge' ? 'Pont' :
                section.type === 'pre_chorus' ? 'Pré-refrain' :
                section.type === 'intro' ? 'Intro' :
                section.type === 'outro' ? 'Outro' :
                section.type === 'solo' ? 'Solo' :
                section.type === 'interlude' ? 'Interlude' :
                section.type === 'instrumental' ? 'Instrumental' :
                section.type === 'tag' ? 'Tag' :
                section.type === 'finale' ? 'Finale' :
                section.type && section.type !== 'general' ? section.type : ''
              );

              // Le nom des sections doit être visible
              const isSectionHeaderVisible = metaVis.sectionHeaders !== false;
              const hasVisibleHeader = Boolean(
                (isSectionHeaderVisible && sectionTitle) ||
                sectionRepeat > 1 || 
                (metaVis.vocalArrangement && (section.vocals?.length || section.vocal))
              );

              const isCompact = currentSectionSpacing <= 6;
              const isUltraCompact = currentSectionSpacing <= 2;
              const cardPaddingClass = !hasVisibleHeader
                ? (isUltraCompact ? 'py-1.5 px-3 sm:py-2 sm:px-3.5' : isCompact ? 'py-2 px-3.5 sm:py-2.5 sm:px-4' : 'py-2.5 px-4')
                : (isUltraCompact ? 'py-2 px-3 sm:py-2.5 sm:px-3.5' : isCompact ? 'py-2.5 px-3.5 sm:py-3 sm:px-4' : 'p-4');
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
                  {hasVisibleHeader && (
                    <div className={`flex items-center justify-between gap-2 ${headerMarginClass} flex-wrap`}>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isSectionHeaderVisible && sectionTitle ? (
                          <span
                            className="inline-block font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border shadow-xs text-left select-none"
                            style={{
                              fontSize: `${displaySettings.typography.headerSize}px`,
                              color: secColor,
                              borderColor: `${secColor}50`,
                              backgroundColor: `${secColor}1C`
                            }}
                          >
                            {sectionTitle}
                          </span>
                        ) : null}

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

                      {/* Pastilles Arrangement Vocal dans le coin supérieur droit */}
                      {metaVis.vocalArrangement && (
                        <div className="flex items-center gap-1.5 flex-wrap ml-auto">
                          <VocalArrangementSelector
                            vocals={section.vocals || (section.vocal ? [section.vocal] : [])}
                            onChange={(newVocals) => handleUpdateSectionVocals(sIdx, newVocals)}
                            canEdit={canManageSongs}
                            discreet={true}
                          />
                        </div>
                      )}
                    </div>
                  )}

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
                              <div key={iIdx} className="inline-flex flex-col items-start">
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

          {/* Song Sheet Legal Footer: CCLI & Copyright */}
          {((metaVis.ccli && effectiveCcli) || (metaVis.copyright && effectiveCopyright)) && (
            <div className="mt-8 pt-4 border-t border-[#222226] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-gray-400 print:text-gray-700">
              {metaVis.copyright && effectiveCopyright && (
                <div className="flex items-center gap-2 text-gray-400 min-w-0">
                  <Copyright className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  <span className="truncate">{effectiveCopyright}</span>
                </div>
              )}
              {metaVis.ccli && effectiveCcli && (
                <div className="flex items-center gap-2 shrink-0 sm:ml-auto">
                  <Shield className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>
                    Chant CCLI N°{' '}
                    <a
                      href={`https://songselect.ccli.com/Songs/${effectiveCcli.replace(/\D/g, '') || effectiveCcli}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono font-bold text-blue-400 hover:underline"
                    >
                      {effectiveCcli}
                    </a>
                  </span>
                </div>
              )}
            </div>
          )}

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
          mode="song"
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
