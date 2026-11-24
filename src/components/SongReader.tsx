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
  parseTimeSignatureToBeats,
  getYouTubeEmbedUrl,
  getSpotifyEmbedUrl,
  isDirectAudioUrl,
  isChordGridToken,
  parseStrumToken,
  StrumStep
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
import { KeySelectorKeypad } from './KeySelectorKeypad';
import { metronomeAudio } from '../utils/metronomeAudio';
import { includesIgnoreAccents } from '../utils/songSearchUtils';
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
  FileText,
  ArrowUp,
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
  Search,
  ExternalLink,
  Pencil,
  Disc,
  Share2
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
import { padAudio, CHROMATIC_NOTES } from '../utils/padAudio';
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
  autoScrollPanelOpen?: boolean;
  onAutoScrollPanelChange?: (open: boolean) => void;
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
  setlistPosition,
  autoScrollPanelOpen,
  onAutoScrollPanelChange
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
    setEditorSubTab,
    setEditorReturnTarget,
    currentUser,
    currentGroup,
    setActiveSetlistIndex,
    canManageSongs,
    canManageSetlists,
    linkSongs,
    unlinkSongs,
    createLanguageVersion,
    personalCapos,
    setPersonalCapo
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

  // Mode Bilingue (2 colonnes : normale à gauche, version traduite à droite)
  const [isBilingualMode, setIsBilingualMode] = useState<boolean>(false);
  const [selectedTranslatedSongId, setSelectedTranslatedSongId] = useState<string | null>(null);
  const [showAddTranslationModal, setShowAddTranslationModal] = useState(false);
  const [bilingualSearchQuery, setBilingualSearchQuery] = useState('');
  const [bilingualNewLang, setBilingualNewLang] = useState('Anglais');
  const [bilingualNewTitle, setBilingualNewTitle] = useState('');
  const [isCreatingTranslation, setIsCreatingTranslation] = useState(false);

  const handleToggleBilingualMode = useCallback(() => {
    setIsBilingualMode(prev => {
      const next = !prev;
      try {
        localStorage.setItem('melobook_bilingual_mode', String(next));
      } catch {}
      return next;
    });
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
  const isAutoScrollingRef = useRef<boolean>(false);
  const [scrollSpeedMultiplier, setScrollSpeedMultiplier] = useState<number>(1);
  const [localShowFloatingAutoScroll, setLocalShowFloatingAutoScroll] = useState<boolean>(false);
  const showFloatingAutoScroll = autoScrollPanelOpen !== undefined ? autoScrollPanelOpen : localShowFloatingAutoScroll;
  const setShowFloatingAutoScroll = useCallback((open: boolean) => {
    if (onAutoScrollPanelChange) {
      onAutoScrollPanelChange(open);
    } else {
      setLocalShowFloatingAutoScroll(open);
    }
  }, [onAutoScrollPanelChange]);

  // Parse ChordPro
  const parsedData = useMemo(() => {
    if (!song) return null;
    return parseChordPro(song.contentChordPro);
  }, [song?.contentChordPro]);

  // Versions liées linguistiques
  const linkedVersions = useMemo(() => {
    if (!song) return [];
    return getLinkedSongVersions(song, songs);
  }, [song, songs]);

  // Version traduite active pour le mode bilingue
  const translatedSong = useMemo(() => {
    if (!isBilingualMode) return null;
    if (selectedTranslatedSongId) {
      const found = songs.find(s => s.id === selectedTranslatedSongId);
      if (found) return found;
    }
    if (linkedVersions.length > 0) {
      return linkedVersions[0];
    }
    return null;
  }, [isBilingualMode, selectedTranslatedSongId, songs, linkedVersions]);

  // Données ChordPro de la version traduite
  const parsedTranslatedData = useMemo(() => {
    if (!translatedSong?.contentChordPro) return null;
    return parseChordPro(translatedSong.contentChordPro);
  }, [translatedSong?.contentChordPro]);

  const handleLinkExistingAsTranslation = useCallback(async (targetSongId: string) => {
    if (!song) return;
    try {
      await linkSongs(song.id, targetSongId);
      setSelectedTranslatedSongId(targetSongId);
      setShowAddTranslationModal(false);
      showFeedbackToast('Version traduite liée avec succès !');
    } catch (e) {
      console.error(e);
    }
  }, [song, linkSongs, showFeedbackToast]);

  const handleCreateNewTranslationFromReader = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!song) return;
    setIsCreatingTranslation(true);
    try {
      const title = bilingualNewTitle.trim() || `${song.title} - ${bilingualNewLang}`;
      const newId = await createLanguageVersion(song.id, bilingualNewLang, title);
      setSelectedTranslatedSongId(newId);
      setShowAddTranslationModal(false);
      setBilingualNewTitle('');
      showFeedbackToast(`Version ${bilingualNewLang} créée et affichée à droite !`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCreatingTranslation(false);
    }
  }, [song, bilingualNewTitle, bilingualNewLang, createLanguageVersion, showFeedbackToast]);

  const availableSongsToLinkBilingual = useMemo(() => {
    if (!song) return [];
    const linkedIds = new Set([song.id, ...linkedVersions.map(v => v.id)]);
    const filtered = songs.filter(s => !linkedIds.has(s.id));
    if (!bilingualSearchQuery.trim()) return filtered.slice(0, 10);
    return filtered.filter(s =>
      includesIgnoreAccents(s.title, bilingualSearchQuery) ||
      includesIgnoreAccents(s.artist, bilingualSearchQuery) ||
      includesIgnoreAccents(s.language, bilingualSearchQuery)
    ).slice(0, 15);
  }, [song, linkedVersions, songs, bilingualSearchQuery]);

  // Base parameters
  const catalogBaseKey = (parsedData?.hasExplicitKey && parsedData.key) || song?.key || parsedData?.key || 'C';
  const isSongOriginallyMinor = useMemo(() => {
    const raw = (song?.key || catalogBaseKey || 'C').trim();
    return raw.endsWith('m') || raw.toLowerCase().includes('min');
  }, [song?.key, catalogBaseKey]);
  const capoStorageKey = isSetlistMode && currentSetlist && song
    ? `setlist:${currentSetlist.id}:${song.id}`
    : (song ? `song:${song.id}` : '');

  const [personalKeys, setPersonalKeys] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem('melobook_personal_keys');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const defaultBaseKey = (isSetlistMode && setlistOverride?.key) ? setlistOverride.key : catalogBaseKey;
  const personalKey = capoStorageKey ? personalKeys[capoStorageKey] : undefined;
  const effectiveBaseKey = personalKey || defaultBaseKey;
  const effectiveTempo = setlistOverride?.bpm || setlistOverride?.tempo || song?.bpm || song?.tempo || parsedData?.tempo || 120;
  const rawDuration = setlistOverride?.duration || song?.duration || parsedData?.duration || '03:30';
  const effectiveDuration = useMemo(() => formatDurationToMMSS(rawDuration), [rawDuration]);
  const effectiveCcli = (song?.ccli || parsedData?.ccli || '').trim();
  const effectiveCopyright = (song?.copyright || parsedData?.copyright || '').trim();
  const effectiveYoutubeUrl = (song?.youtubeUrl || parsedData?.youtubeUrl || '').trim();
  const hasYoutubeEmbed = Boolean(getYouTubeEmbedUrl(effectiveYoutubeUrl));
  const effectiveAudioUrl = (song?.audioUrl || parsedData?.audioUrl || '').trim();
  const effectiveSpotifyUrl = (song?.spotifyUrl || parsedData?.spotifyUrl || (setlistOverride as any)?.spotifyUrl || '').trim();
  const hasSpotifyEmbed = Boolean(getSpotifyEmbedUrl(effectiveSpotifyUrl));
  const hasAudioLink = Boolean(effectiveAudioUrl || effectiveYoutubeUrl || hasSpotifyEmbed);

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
    const nextState = !stageSettings.isAutoScrolling;
    if (nextState) {
      setShowFloatingAutoScroll(true);
      if (containerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        // Si on est déjà tout en bas (à moins de 10px de la fin), on repart du début du chant
        if (scrollTop + clientHeight >= scrollHeight - 10) {
          containerRef.current.scrollTop = 0;
          scrollPosRef.current = 0;
        } else {
          scrollPosRef.current = scrollTop;
        }
      }
    }
    updateStageSettings({ isAutoScrolling: nextState });
  }, [stageSettings.isAutoScrolling, updateStageSettings, setShowFloatingAutoScroll]);
  const effectiveNotes = setlistOverride?.notes !== undefined ? setlistOverride.notes : (song?.notes || '');
  const effectiveCapo = (capoStorageKey && personalCapos[capoStorageKey] !== undefined)
    ? personalCapos[capoStorageKey]
    : 0;

  // Semitone difference for song base key
  const baseKeySemitones = useMemo(() => {
    return getSemitoneDifference(catalogBaseKey, effectiveBaseKey);
  }, [catalogBaseKey, effectiveBaseKey]);

  // Visual chords shift down by effectiveCapo semitones while the song keeps its real sounding key
  const visualChordTransposeSemitones = ((baseKeySemitones - effectiveCapo) % 12 + 12) % 12;

  // Extract all unique chords in the current song (as written / fingered)
  const allSongChords = useMemo(() => {
    if (!parsedData) return [];
    const set = new Set<string>();
    parsedData.sections.forEach(sec => {
      const secOffset = visualChordTransposeSemitones + (sec.transposeOffset || 0);
      sec.lines.forEach(l => {
        if (l.type === 'grid_row' && l.gridBars) {
          if (l.isStrumRow) return;
          l.gridBars.forEach(bar => {
            bar.beats.forEach(beat => {
              if (isChordGridToken(beat) && !parseStrumToken(beat, false)) {
                const chordStr = transposeChord(beat, secOffset, stageSettings.notation);
                if (chordStr && chordStr.trim()) {
                  set.add(chordStr.trim());
                }
              }
            });
          });
          return;
        }
        l.items.forEach(item => {
          if (item.chord) {
            const chordStr = transposeChord(item.chord, secOffset, stageSettings.notation);
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
  const [showCapoMenu, setShowCapoMenu] = useState(false);
  const [showTempoMenu, setShowTempoMenu] = useState(false);
  const [showZoomMenu, setShowZoomMenu] = useState(false);
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const [isAudioPlayerMinimized, setIsAudioPlayerMinimized] = useState(false);
  const [activeAudioSource, setActiveAudioSource] = useState<'youtube' | 'spotify' | 'audio'>('youtube');
  const [showSpotifyConfig, setShowSpotifyConfig] = useState(false);
  const [spotifyInputUrl, setSpotifyInputUrl] = useState('');
  const [isSavingSpotify, setIsSavingSpotify] = useState(false);
  const [showYoutubeConfig, setShowYoutubeConfig] = useState(false);
  const [youtubeInputUrl, setYoutubeInputUrl] = useState('');
  const [isSavingYoutube, setIsSavingYoutube] = useState(false);

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

  // État du module Pad (replier / déplier - plié par défaut)
  const [isPadCollapsed, setIsPadCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('melobook_pad_collapsed_v2');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });
  const [isPadPlaying, setIsPadPlaying] = useState<boolean>(() => padAudio.getIsRunning());
  const [activePadSemitone, setActivePadSemitone] = useState<number>(() => padAudio.getCurrentSemitone());

  useEffect(() => {
    return padAudio.subscribe(() => {
      setIsPadPlaying(padAudio.getIsRunning());
      setActivePadSemitone(padAudio.getCurrentSemitone());
    });
  }, []);

  const togglePadCollapse = () => {
    setIsPadCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('melobook_pad_collapsed_v2', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleSaveSpotifyUrl = async (urlToSave?: string) => {
    const clean = (urlToSave !== undefined ? urlToSave : spotifyInputUrl).trim();
    if (!song) return;
    if (clean && !getSpotifyEmbedUrl(clean)) {
      showFeedbackToast('Lien Spotify invalide');
      return;
    }
    if (!canManageSongs) {
      showFeedbackToast("Droits d'édition requis pour enregistrer le lien");
      return;
    }
    setIsSavingSpotify(true);
    try {
      await updateSong(song.id, { spotifyUrl: clean });
      if (selectedSong && selectedSong.id === song.id) {
        setSelectedSong({ ...selectedSong, spotifyUrl: clean });
      }
      setShowSpotifyConfig(false);
      if (clean) {
        setActiveAudioSource('spotify');
        setShowSettingsDrawer(false);
        setShowAudioPlayer(true);
        setIsAudioPlayerMinimized(false);
      }
      showFeedbackToast(clean ? 'Lien Spotify enregistré !' : 'Lien Spotify retiré');
    } catch (err) {
      console.error('Failed to save Spotify url:', err);
      showFeedbackToast('Erreur lors de la sauvegarde');
    } finally {
      setIsSavingSpotify(false);
    }
  };

  const handleSaveYoutubeUrl = async (urlToSave?: string) => {
    const clean = (urlToSave !== undefined ? urlToSave : youtubeInputUrl).trim();
    if (!song) return;
    if (clean && !getYouTubeEmbedUrl(clean)) {
      showFeedbackToast('Lien YouTube invalide');
      return;
    }
    if (!canManageSongs) {
      showFeedbackToast("Droits d'édition requis pour enregistrer le lien");
      return;
    }
    setIsSavingYoutube(true);
    try {
      await updateSong(song.id, { youtubeUrl: clean });
      if (selectedSong && selectedSong.id === song.id) {
        setSelectedSong({ ...selectedSong, youtubeUrl: clean });
      }
      setShowYoutubeConfig(false);
      if (clean) {
        setActiveAudioSource('youtube');
        setShowSettingsDrawer(false);
        setShowAudioPlayer(true);
        setIsAudioPlayerMinimized(false);
      }
      showFeedbackToast(clean ? 'Lien YouTube enregistré !' : 'Lien YouTube retiré');
    } catch (err) {
      console.error('Failed to save YouTube url:', err);
      showFeedbackToast('Erreur lors de la sauvegarde');
    } finally {
      setIsSavingYoutube(false);
    }
  };

  // Refs for toolbar buttons to calculate viewport-safe placement
  const keyButtonRef = useRef<HTMLButtonElement>(null);
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
    const clampedPct = Math.max(60, Math.min(180, Math.round(newPct / 10) * 10));
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


  const updatePersonalKeys = (updater: (prev: Record<string, string>) => Record<string, string>) => {
    setPersonalKeys(prev => {
      const next = updater(prev);
      try {
        localStorage.setItem('melobook_personal_keys', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Key & Capo Handlers
  const handleSetBaseKey = async (targetKey: string) => {
    if (!song) return;

    if (isSetlistMode && currentSetlist && canManageSetlists) {
      await updateSetlistSongOverride(currentSetlist.id, song.id, { key: targetKey });
      if (capoStorageKey && personalKeys[capoStorageKey] !== undefined) {
        updatePersonalKeys(prev => {
          const copy = { ...prev };
          delete copy[capoStorageKey];
          return copy;
        });
      }
      showFeedbackToast(`Tonalité par défaut de la setlist définie sur ${targetKey}`);
    } else if (canManageSongs && !isSetlistMode) {
      const currentBaseKey = (parsedData?.hasExplicitKey && parsedData.key)
        ? parsedData.key
        : (song.key || parsedData?.key || 'C');

      const semitones = getSemitoneDifference(currentBaseKey, targetKey);
      const updatedContent = transposeChordProText(song.contentChordPro, semitones, 'standard', targetKey);

      await updateSong(song.id, { key: targetKey, contentChordPro: updatedContent });
      if (capoStorageKey && personalKeys[capoStorageKey] !== undefined) {
        updatePersonalKeys(prev => {
          const copy = { ...prev };
          delete copy[capoStorageKey];
          return copy;
        });
      }
      if (selectedSong && selectedSong.id === song.id) {
        setSelectedSong({ ...selectedSong, key: targetKey, contentChordPro: updatedContent });
      }
      showFeedbackToast(`Tonalité enregistrée dans le répertoire : ${targetKey}`);
    } else if (capoStorageKey) {
      if (targetKey === defaultBaseKey) {
        updatePersonalKeys(prev => {
          const copy = { ...prev };
          delete copy[capoStorageKey];
          return copy;
        });
      } else {
        updatePersonalKeys(prev => ({ ...prev, [capoStorageKey]: targetKey }));
      }
      showFeedbackToast(`Tonalité ${targetKey} appliquée (votre affichage personnel)`);
    }
  };

  const handleSetCapo = async (fret: number) => {
    if (!song || !capoStorageKey) return;
    await setPersonalCapo(capoStorageKey, fret);
    showFeedbackToast(fret > 0 ? `Capo ${fret} enregistré (votre compte)` : 'Capo retiré (0)');
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

  // Played chord key shape when Capo > 0 (e.g. Song in E with Capo 2 -> played shapes in D)
  const capoPlayedKey = useMemo(() => {
    if (!baseKey || effectiveCapo <= 0) return '';
    return transposeChord(baseKey, -effectiveCapo, stageSettings.notation);
  }, [baseKey, effectiveCapo, stageSettings.notation]);

  // Sync auto-scrolling ref and open floating widget when started
  useEffect(() => {
    isAutoScrollingRef.current = stageSettings.isAutoScrolling;
    if (stageSettings.isAutoScrolling) {
      setShowFloatingAutoScroll(true);
    }
  }, [stageSettings.isAutoScrolling, setShowFloatingAutoScroll]);

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
      const delta = Math.min(0.1, (time - lastScrollTimeRef.current) / 1000);
      lastScrollTimeRef.current = time;

      if (containerRef.current) {
        const { scrollHeight, clientHeight } = containerRef.current;
        const totalScrollable = Math.max(0, scrollHeight - clientHeight);

        if (totalScrollable <= 0) {
          updateStageSettings({ isAutoScrolling: false });
          return;
        }

        const durationSec = Math.max(10, songDurationSeconds);
        // Vitesse en pixels par seconde calée précisément sur la durée totale du chant * multiplicateur
        const pxPerSecond = (totalScrollable / durationSec) * scrollSpeedMultiplier;

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
  }, [stageSettings.isAutoScrolling, songDurationSeconds, scrollSpeedMultiplier, updateStageSettings]);

  // Manual scroll progress tracker (ne pas écraser les sous-pixels pendant le défilement auto)
  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      if (!isAutoScrollingRef.current || Math.abs(scrollTop - scrollPosRef.current) > 25) {
        scrollPosRef.current = scrollTop;
      }
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
      } else if (e.key === 'm' || e.key === 'M') {
        // Toggle chords
        updateStageSettings({ showChords: !stageSettings.showChords });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stageSettings.isAutoScrolling, stageSettings.showChords, updateStageSettings, onNext, onPrev]);

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

  const isWideLayout = isFullscreen || numColumns > 1 || isBilingualMode;

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

  const renderStrumGlyph = (step: StrumStep, stepIdx: number) => {
    const isLightStroke = step.raw === 'd' || step.raw === 'u';
    const isAccented = step.type === 'down_accent' || step.type === 'up_accent';

    if (step.type === 'down' || step.type === 'down_accent') {
      return (
        <span
          key={stepIdx}
          className={`inline-flex flex-col items-center justify-center leading-none ${
            isAccented
              ? 'text-amber-300 print:text-black'
              : isLightStroke
                ? 'text-sky-300/70 print:text-neutral-600'
                : 'text-sky-300 print:text-black'
          }`}
          title={isAccented ? 'Coup vers le bas accentué (↓)' : 'Coup vers le bas (↓)'}
          aria-label="Bas"
        >
          {isAccented && (
            <span className="text-[8px] font-black leading-none -mb-0.5 select-none">&gt;</span>
          )}
          <svg
            viewBox="0 0 16 20"
            className={`${isLightStroke ? 'w-3 h-4' : 'w-3.5 h-[18px]'} shrink-0`}
            fill="none"
            stroke="currentColor"
            strokeWidth={isAccented ? 2.4 : isLightStroke ? 1.65 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="8" y1="2.5" x2="8" y2="16.5" />
            <polyline points="4,12.5 8,17 12,12.5" />
          </svg>
        </span>
      );
    }

    if (step.type === 'up' || step.type === 'up_accent') {
      return (
        <span
          key={stepIdx}
          className={`inline-flex flex-col items-center justify-center leading-none ${
            isAccented
              ? 'text-amber-300 print:text-black'
              : isLightStroke
                ? 'text-emerald-300/70 print:text-neutral-600'
                : 'text-emerald-300 print:text-black'
          }`}
          title={isAccented ? 'Coup vers le haut accentué (↑)' : 'Coup vers le haut (↑)'}
          aria-label="Haut"
        >
          {isAccented && (
            <span className="text-[8px] font-black leading-none -mb-0.5 select-none">&gt;</span>
          )}
          <svg
            viewBox="0 0 16 20"
            className={`${isLightStroke ? 'w-3 h-4' : 'w-3.5 h-[18px]'} shrink-0`}
            fill="none"
            stroke="currentColor"
            strokeWidth={isAccented ? 2.4 : isLightStroke ? 1.65 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="8" y1="17.5" x2="8" y2="3.5" />
            <polyline points="4,7.5 8,3 12,7.5" />
          </svg>
        </span>
      );
    }

    if (step.type === 'mute') {
      return (
        <span
          key={stepIdx}
          className="inline-flex items-center justify-center text-rose-400 font-bold text-xs px-0.5 print:text-black"
          title="Étouffé / Mute (✕)"
          aria-label="Étouffé"
        >
          ✕
        </span>
      );
    }

    if (step.type === 'hold') {
      return (
        <span
          key={stepIdx}
          className="inline-flex items-center justify-center text-gray-400 font-mono text-xs px-0.5 print:text-neutral-600"
          title="Tenue / Prolongation (—)"
          aria-label="Tenue"
        >
          —
        </span>
      );
    }

    if (step.type === 'dot') {
      return (
        <span
          key={stepIdx}
          className="inline-flex items-center justify-center text-gray-500 text-xs px-0.5 print:text-neutral-500"
          title="Temps (•)"
          aria-label="Temps"
        >
          •
        </span>
      );
    }

    if (step.type === 'slash') {
      return (
        <span
          key={stepIdx}
          className="inline-flex items-center justify-center text-gray-400 font-mono font-bold text-xs px-0.5 print:text-neutral-600"
          title="Marque rythmique (/)"
        >
          /
        </span>
      );
    }

    if (step.type === 'repeat_measure') {
      return (
        <span
          key={stepIdx}
          className="inline-flex items-center justify-center text-amber-300/90 font-mono font-bold text-xs px-1 print:text-black"
          title="Répéter la mesure précédente (%)"
        >
          ·/·
        </span>
      );
    }

    return (
      <span
        key={stepIdx}
        className="inline-flex items-center justify-center text-gray-400 font-mono text-xs px-0.5 print:text-neutral-600"
        title="Silence"
      >
        𝄽
      </span>
    );
  };

  const renderSectionLinesList = (section: any, effectiveSectionOffset: number, linesSpacingClass: string, isTranslatedCol: boolean) => {
    const groupedLines: Array<
      | { kind: 'line'; line: any; key: number }
      | { kind: 'tab_block'; rows: string[]; key: number }
      | { kind: 'grid_block'; rows: any[]; key: number }
    > = [];

    (section.lines || []).forEach((line: any, lIdx: number) => {
      if (line.type === 'tab_row') {
        const prev = groupedLines[groupedLines.length - 1];
        if (prev && prev.kind === 'tab_block') {
          prev.rows.push(line.tabText || '');
        } else {
          groupedLines.push({ kind: 'tab_block', rows: [line.tabText || ''], key: lIdx });
        }
      } else if (line.type === 'grid_row' && line.gridBars) {
        const prev = groupedLines[groupedLines.length - 1];
        if (prev && prev.kind === 'grid_block') {
          prev.rows.push(line);
        } else {
          groupedLines.push({ kind: 'grid_block', rows: [line], key: lIdx });
        }
      } else {
        groupedLines.push({ kind: 'line', line, key: lIdx });
      }
    });

    return (
      <div className={`${linesSpacingClass} font-chord leading-relaxed print:space-y-1.5`}>
        {groupedLines.map((entry) => {
          if (entry.kind === 'tab_block') {
            return (
              <pre
                key={`tab-${entry.key}`}
                className="font-mono text-xs sm:text-sm text-sky-200/95 bg-[#101014]/70 border border-[#24242C] rounded-md px-3 py-2 overflow-x-auto leading-snug whitespace-pre print:bg-transparent print:border-neutral-300 print:text-black"
              >
                {entry.rows.join('\n')}
              </pre>
            );
          }

          if (entry.kind === 'grid_block') {
            const maxBars = Math.max(1, ...entry.rows.map((r: any) => r.gridBars?.length || 0));
            const hasPrefix = entry.rows.some((r: any) => Boolean(r.gridPrefix));
            const hasSuffix = entry.rows.some((r: any) => Boolean(r.gridSuffix));
            const hasStrumVisuals = entry.rows.some(
              (r: any) =>
                r.isStrumRow ||
                r.gridBars?.some((b: any) =>
                  b.beats?.some((beat: string) => {
                    const steps = parseStrumToken(beat, r.isStrumRow);
                    return Boolean(steps && steps.some(s => s.type !== 'dot' && s.type !== 'slash' && s.type !== 'repeat_measure'));
                  })
                )
            );
            const gridTemplateColumns = [
              hasPrefix ? 'auto' : null,
              `repeat(${maxBars}, minmax(76px, 1fr))`,
              hasSuffix ? 'auto' : null
            ].filter(Boolean).join(' ');

            return (
              <div
                key={`grid-${entry.key}`}
                className="rounded-lg bg-[#101014]/75 border border-[#24242C] px-2.5 py-2.5 overflow-x-auto print:bg-transparent print:border-neutral-300 print:px-1.5 print:py-1.5"
              >
                <div
                  className="grid gap-y-1.5 items-stretch min-w-fit"
                  style={{ gridTemplateColumns }}
                >
                  {entry.rows.map((row: any, rIdx: number) => {
                    const bars: any[] = row.gridBars || [];
                    const emptyTailCount = Math.max(0, maxBars - bars.length);

                    return (
                      <React.Fragment key={rIdx}>
                        {hasPrefix && (
                          <div className="flex items-center pr-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 whitespace-nowrap print:text-neutral-700">
                            {row.gridPrefix || ''}
                          </div>
                        )}

                        {bars.map((bar: any, bIdx: number) => {
                          const isLastRenderedBar = bIdx === bars.length - 1;
                          return (
                            <div
                              key={bIdx}
                              className={`relative flex items-center justify-between min-h-[28px] px-1.5 py-0.5 ${
                                row.isStrumRow
                                  ? 'bg-[#17171F]/65 rounded-xs print:bg-transparent'
                                  : ''
                              }`}
                            >
                              {/* Barre de mesure gauche */}
                              {bar.repeatStart ? (
                                <span
                                  className="font-mono font-black text-amber-400 mr-1.5 select-none shrink-0 print:text-black"
                                  title="Début de reprise"
                                >
                                  |:
                                </span>
                              ) : bar.doubleBarStart ? (
                                <span className="font-mono font-bold text-gray-400 mr-1.5 select-none shrink-0 print:text-neutral-700">
                                  ||
                                </span>
                              ) : (
                                <span className="w-[1px] self-stretch bg-gray-600/70 mr-1.5 shrink-0 print:bg-neutral-400" />
                              )}

                              {/* Temps / Accords / Coups de strumming */}
                              <div className="flex-1 flex items-center justify-evenly gap-1.5 min-w-0">
                                {bar.beats.map((beat: string, beatIdx: number) => {
                                  const strumSteps = parseStrumToken(beat, Boolean(row.isStrumRow));

                                  if (!row.isStrumRow && isChordGridToken(beat)) {
                                    const displayedBeat = transposeChord(beat, effectiveSectionOffset, stageSettings.notation);
                                    if (!stageSettings.showChords) {
                                      return (
                                        <span key={beatIdx} className="text-gray-500 font-mono px-0.5 print:text-neutral-500">
                                          /
                                        </span>
                                      );
                                    }
                                    return (
                                      <button
                                        key={beatIdx}
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (displayedBeat) {
                                            setChordModalData({ isOpen: true, chord: displayedBeat });
                                          }
                                        }}
                                        className="font-mono font-bold hover:underline cursor-pointer px-0.5 transition-all active:scale-95 whitespace-nowrap print:cursor-default print:hover:no-underline print:text-blue-800"
                                        style={{
                                          fontSize: `${displaySettings.typography.chordSize}px`,
                                          color: displaySettings.chordColor || '#60a5fa'
                                        }}
                                        title={`Diagramme de l'accord ${displayedBeat}`}
                                      >
                                        {displayedBeat}
                                      </button>
                                    );
                                  }

                                  if (strumSteps) {
                                    return (
                                      <div
                                        key={beatIdx}
                                        className="inline-flex items-center gap-0.5 px-0.5 shrink-0"
                                      >
                                        {strumSteps.map((step, sIdx) => renderStrumGlyph(step, sIdx))}
                                      </div>
                                    );
                                  }

                                  return (
                                    <span key={beatIdx} className="text-gray-400 font-mono text-xs px-0.5 whitespace-nowrap print:text-neutral-700">
                                      {beat}
                                    </span>
                                  );
                                })}
                              </div>

                              {/* Barre de mesure droite (reprise, double barre ou clôture sur dernière mesure) */}
                              {bar.repeatEnd ? (
                                <span
                                  className="font-mono font-black text-amber-400 ml-1.5 select-none shrink-0 print:text-black"
                                  title="Fin de reprise"
                                >
                                  :|
                                </span>
                              ) : bar.doubleBarEnd ? (
                                <span className="font-mono font-bold text-gray-400 ml-1.5 select-none shrink-0 print:text-neutral-700">
                                  ||
                                </span>
                              ) : isLastRenderedBar ? (
                                <span className="w-[1px] self-stretch bg-gray-600/70 ml-1.5 shrink-0 print:bg-neutral-400" />
                              ) : null}
                            </div>
                          );
                        })}

                        {emptyTailCount > 0 &&
                          Array.from({ length: emptyTailCount }).map((_, emptyIdx) => (
                            <div key={`empty-${emptyIdx}`} />
                          ))}

                        {hasSuffix && (
                          <div className="flex items-center pl-2 text-xs font-mono font-semibold text-emerald-300/90 whitespace-nowrap print:text-neutral-800">
                            {row.gridSuffix || ''}
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                {hasStrumVisuals && (
                  <div className="mt-2 pt-1.5 border-t border-[#24242C]/80 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-400 print:border-neutral-300 print:text-neutral-600">
                    <span className="inline-flex items-center gap-1">
                      <span className="text-sky-300 font-bold print:text-black">↓</span> Bas
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="text-emerald-300 font-bold print:text-black">↑</span> Haut
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="text-rose-400 font-bold print:text-black">✕</span> Étouffé
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="text-gray-300 font-mono print:text-black">—</span> Tenue
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="text-gray-400 print:text-black">•</span> Temps
                    </span>
                  </div>
                )}
              </div>
            );
          }

          const { line, key: lIdx } = entry;

          if (line.type === 'empty') {
            return <div key={lIdx} className="h-3 print:h-2" />;
          }

          if (line.type === 'comment') {
            return (
              <p key={lIdx} className="text-xs sm:text-sm text-sky-300/90 font-medium print:text-neutral-700">
                {line.comment}
              </p>
            );
          }

          if (line.type === 'comment_italic') {
            return (
              <p key={lIdx} className="text-xs sm:text-sm italic text-cyan-300/90 print:text-neutral-700">
                {line.comment}
              </p>
            );
          }

          if (line.type === 'comment_box') {
            return (
              <div
                key={lIdx}
                className="inline-block px-2.5 py-1 rounded border border-amber-500/40 bg-amber-950/20 text-xs sm:text-sm font-medium text-amber-200 print:border-neutral-400 print:bg-neutral-50 print:text-black"
              >
                {line.comment}
              </div>
            );
          }

          return (
            <div key={lIdx} className="flex flex-wrap items-end gap-x-0.5 print:leading-tight">
              {line.items.map((item: any, iIdx: number) => {
                const displayedChord = item.chord
                  ? transposeChord(item.chord, effectiveSectionOffset, stageSettings.notation)
                  : '';

                return (
                  <div key={iIdx} className="inline-flex flex-col items-start">
                    {item.annotation && (
                      <span className="text-[11px] italic text-amber-300/90 leading-none mb-0.5 pr-1 print:text-neutral-700">
                        ({item.annotation})
                      </span>
                    )}
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
                        className={`chord-badge font-mono font-bold hover:underline select-none leading-none mb-1 pr-1 text-left inline-flex items-center cursor-pointer transition-all active:scale-95 group/chord print:cursor-default print:hover:no-underline print:text-blue-800 print:mb-0.5 ${
                          displayedChord ? 'opacity-100' : 'opacity-0 pointer-events-none'
                        }`}
                        style={{
                          fontSize: `${displaySettings.typography.chordSize}px`,
                          color: displaySettings.chordColor || '#60a5fa'
                        }}
                        title={displayedChord
                          ? (!isTranslatedCol && effectiveCapo > 0
                              ? `Accord joué : ${displayedChord} (Capo ${effectiveCapo}) • Son réel : ${transposeChord(item.chord, baseKeySemitones + (section.transposeOffset || 0), stageSettings.notation)}`
                              : `Diagramme de l'accord ${displayedChord}`)
                          : undefined}
                      >
                        {displayedChord || '\u00A0'}
                      </button>
                    )}

                    <span
                      className="text-[#E0E0E0] font-sans tracking-normal whitespace-pre print:text-black print:font-normal"
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
    );
  };

  const renderSongSections = (sectionsToRender: any[], semitonesOffset: number, isTranslatedCol: boolean) => {
    return sectionsToRender.map((section, sIdx) => {
      const secColor = getSectionColor(section.type, displaySettings.sectionColors);
      const sectionRepeat = (!isTranslatedCol && setlistOverride?.sectionRepeats && setlistOverride.sectionRepeats[sIdx] !== undefined)
        ? setlistOverride.sectionRepeats[sIdx]
        : (section.repeat || 1);
      const effectiveSectionOffset = semitonesOffset + (section.transposeOffset || 0);

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
        section.type === 'grid' ? 'Grille' :
        section.type === 'tab' ? 'Tablature' :
        section.type && section.type !== 'general' ? section.type : ''
      );

      const hasSectionMeta = Boolean(section.isChorusRecall || section.key || section.tempo || section.timeSignature || section.transposeOffset || section.gridShape?.raw);
      const isSectionHeaderVisible = metaVis.sectionHeaders !== false;
      const hasVisibleHeader = Boolean(
        (isSectionHeaderVisible && sectionTitle) ||
        sectionRepeat > 1 ||
        hasSectionMeta ||
        (!isTranslatedCol && metaVis.vocalArrangement && (section.vocals?.length || section.vocal))
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
          data-section-card="true"
          className={`rounded-lg ${cardPaddingClass} transition-all ${isTranslatedCol ? 'bg-[#121217]/60' : ''} print:break-inside-avoid print:page-break-inside-avoid print:p-0 print:mb-3 print:bg-transparent print:border-none print:shadow-none`}
          style={getSectionBorderStyles(secColor, displaySettings.sectionBorders)}
        >
          {hasVisibleHeader && (
            <div className={`flex items-center justify-between gap-2 ${headerMarginClass} flex-wrap print:mb-1 print:gap-1.5`}>
              <div className="flex items-center gap-1.5 flex-wrap">
                {isSectionHeaderVisible && sectionTitle ? (
                  <span
                    className="inline-block font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border shadow-xs text-left select-none print:px-2 print:py-0.5 print:bg-neutral-100 print:text-neutral-900 print:border-neutral-300 print:text-[9.5pt] print:shadow-none"
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

                {section.isChorusRecall && (
                  <span className="text-[10px] font-medium uppercase tracking-wider text-blue-300/80 border border-blue-500/30 bg-blue-950/30 px-1.5 py-0.5 rounded print:text-neutral-700 print:border-neutral-400">
                    Rappel
                  </span>
                )}

                {sectionRepeat > 1 && (
                  <span 
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded border bg-emerald-950/40 border-emerald-500/50 text-emerald-300 font-bold font-mono select-none print:bg-neutral-100 print:border-neutral-400 print:text-neutral-900 print:text-[9.5pt]"
                    style={{ fontSize: `${Math.max(10, Math.round((displaySettings.typography?.headerSize || 12) * 0.9))}px` }}
                    title={`Répété ${sectionRepeat} fois`}
                  >
                    <Repeat 
                      style={{ 
                        width: `${Math.max(11, Math.round((displaySettings.typography?.headerSize || 12) * 0.9))}px`,
                        height: `${Math.max(11, Math.round((displaySettings.typography?.headerSize || 12) * 0.9))}px` 
                      }}
                      className="text-emerald-400 shrink-0 print:text-neutral-800" 
                    />
                    <span>x{sectionRepeat}</span>
                  </span>
                )}

                {(section.key || section.transposeOffset || section.tempo || section.timeSignature || section.gridShape?.raw) && (
                  <span className="text-[11px] font-mono text-gray-300/90 print:text-neutral-700">
                    {[
                      section.gridShape?.raw ? `Grille ${section.gridShape.raw}` : '',
                      section.key ? `Ton: ${transposeChord(section.key, semitonesOffset, stageSettings.notation)}` : '',
                      section.transposeOffset ? `${section.transposeOffset > 0 ? '+' : ''}${section.transposeOffset}t` : '',
                      section.tempo ? `${section.tempo} BPM` : '',
                      section.timeSignature || ''
                    ].filter(Boolean).join(' · ')}
                  </span>
                )}
              </div>

              {!isTranslatedCol && metaVis.vocalArrangement && (
                <div className="no-print flex items-center gap-1.5 flex-wrap ml-auto">
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

          {renderSectionLinesList(section, effectiveSectionOffset, linesSpacingClass, isTranslatedCol)}
        </div>
      );
    });
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
    <div 
      data-song-reader-root="true"
      className={`${containerClasses} flex flex-col ${themeClasses} select-none transition-colors print:static print:inset-auto print:top-0 print:w-full print:h-auto print:bg-white print:text-black print:overflow-visible`}
    >
      
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

            {/* Actions principales : Éditer le chant & Exporter PDF */}
            <div className="mb-3.5 pb-3 border-b border-[#282830]">
              <div className={`grid ${canManageSongs ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
                {canManageSongs && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowSettingsDrawer(false);
                      if (song) {
                        setSelectedSong(song);
                      }
                      setEditorReturnTarget(isInSetlist ? 'setlistLive' : 'stage');
                      setActiveTab('editor');
                    }}
                    className="flex items-center gap-2 p-2 sm:p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 via-amber-600/10 to-[#18181F] hover:from-amber-500/30 hover:via-amber-600/20 border border-amber-500/40 hover:border-amber-400 text-left transition-all cursor-pointer group shadow-md shadow-amber-950/30 active:scale-98"
                    title="Éditer le chant dans l'éditeur"
                  >
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-110 transition-transform shadow-xs">
                      <FileEdit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-[11px] sm:text-xs text-white group-hover:text-amber-200 transition-colors leading-tight">
                        Éditer le chant
                      </div>
                    </div>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowSettingsDrawer(false);
                    setShowPdfModal(true);
                  }}
                  className="flex items-center gap-2 p-2 sm:p-2.5 rounded-xl bg-gradient-to-br from-blue-500/20 via-indigo-600/10 to-[#18181F] hover:from-blue-500/30 hover:via-indigo-600/20 border border-blue-500/40 hover:border-blue-400 text-left transition-all cursor-pointer group shadow-md shadow-blue-950/30 active:scale-98"
                  title="Partager (QR code, lien, PDF ou ChordPro)"
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 group-hover:scale-110 transition-transform shadow-xs">
                    <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-[11px] sm:text-xs text-white group-hover:text-blue-200 transition-colors leading-tight">
                      Partager
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Pad d'accompagnement (Tonic Pad) */}
            <div className="mb-3 rounded-xl bg-gradient-to-br from-sky-500/20 via-sky-600/10 to-[#18181F] hover:from-sky-500/25 hover:via-sky-600/15 border border-sky-500/40 hover:border-sky-400 p-2 sm:p-2.5 transition-all shadow-md shadow-sky-950/30">
              <button
                type="button"
                onClick={togglePadCollapse}
                className="w-full flex items-center justify-between text-left cursor-pointer group rounded-lg p-0.5 transition-colors"
                aria-expanded={!isPadCollapsed}
                title={isPadCollapsed ? "Déplier le module Pad" : "Replier le module Pad"}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 shadow-xs ${
                    isPadPlaying 
                      ? 'bg-sky-400 text-black shadow-md shadow-sky-400/30' 
                      : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  }`}>
                    <Radio className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isPadPlaying ? 'animate-pulse' : ''}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-[11px] sm:text-xs text-white group-hover:text-sky-200 transition-colors leading-tight">
                        Pad d'accompagnement
                      </span>
                      {isPadPlaying && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-sky-500/30 text-sky-200 border border-sky-400/50">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
                          Actif • {CHROMATIC_NOTES[activePadSemitone]?.label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-6 h-6 rounded-lg bg-sky-500/20 group-hover:bg-sky-500/30 border border-sky-500/30 flex items-center justify-center text-sky-300 group-hover:text-white transition-all shadow-xs">
                    {isPadCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                  </div>
                </div>
              </button>

              <div className={isPadCollapsed ? 'hidden' : 'mt-2.5 pt-2.5 border-t border-sky-500/20'}>
                <PadControl 
                  songKey={effectiveBaseKey} 
                  onToggleCollapse={togglePadCollapse}
                />
              </div>
            </div>

            {/* Section Affichage & Lecture */}
            <div className="border-t border-[#282830] pt-3 mb-2.5">
              <div className="text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
                <span>Affichage & Lecture</span>
              </div>

              <div className="space-y-2">
                {/* Accords */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#141418] border border-[#23232C] hover:border-[#2E2E3A] transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                      <Eye className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-gray-200">Accords</div>
                    </div>
                  </div>
                  <div className="inline-flex items-center p-0.5 rounded-lg bg-[#0E0E12] border border-[#262630] shadow-inner">
                    <button
                      type="button"
                      onClick={() => updateStageSettings({ showChords: true })}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                        stageSettings.showChords
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs font-bold'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Eye className="w-3 h-3" />
                      <span>Affichés</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStageSettings({ showChords: false })}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                        !stageSettings.showChords
                          ? 'bg-[#24242E] text-white shadow-xs font-bold'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <EyeOff className="w-3 h-3" />
                      <span>Masqués</span>
                    </button>
                  </div>
                </div>

                {/* Taille du texte */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#141418] border border-[#23232C] hover:border-[#2E2E3A] transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-gray-200">Taille du texte</div>
                    </div>
                  </div>
                  <div className="inline-flex items-center p-0.5 rounded-lg bg-[#0E0E12] border border-[#262630] gap-1 shadow-inner">
                    <button
                      type="button"
                      onClick={() => handleSetZoomPercentage(zoomPercentage - 10)}
                      disabled={zoomPercentage <= 60}
                      className="w-6 h-6 rounded-md bg-[#1C1C24] hover:bg-[#282834] flex items-center justify-center text-gray-300 disabled:opacity-30 transition-colors cursor-pointer"
                      title="Réduire (-10%)"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono font-bold text-blue-400 text-xs w-9 text-center">
                      {zoomPercentage}%
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSetZoomPercentage(zoomPercentage + 10)}
                      disabled={zoomPercentage >= 180}
                      className="w-6 h-6 rounded-md bg-[#1C1C24] hover:bg-[#282834] flex items-center justify-center text-gray-300 disabled:opacity-30 transition-colors cursor-pointer"
                      title="Agrandir (+10%)"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    {zoomPercentage !== 100 && (
                      <button
                        type="button"
                        onClick={handleResetZoom}
                        className="text-[9px] font-bold text-blue-400 hover:text-blue-300 px-1 py-0.5 rounded hover:bg-blue-950/40 transition-colors"
                        title="Rétablir à 100%"
                      >
                        100%
                      </button>
                    )}
                  </div>
                </div>

                {/* Défilement automatique */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#141418] border border-[#23232C] hover:border-[#2E2E3A] transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      stageSettings.isAutoScrolling 
                        ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400' 
                        : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                    }`}>
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-gray-200">Défilement auto</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!stageSettings.isAutoScrolling) {
                        setShowSettingsDrawer(false);
                      }
                      handleToggleAutoScroll();
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 shadow-sm active:scale-95 ${
                      stageSettings.isAutoScrolling
                        ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/25 ring-1 ring-amber-400/40'
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/40 ring-1 ring-emerald-400/40'
                    }`}
                    title={stageSettings.isAutoScrolling ? "Mettre en pause le défilement" : `Lancer le défilement calé sur la durée (${effectiveDuration})`}
                  >
                    {stageSettings.isAutoScrolling ? (
                      <>
                        <Pause className="w-3.5 h-3.5 fill-current" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Play</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Écouter le chant (Recherche rapide YouTube & Spotify / Lecteur intégré) */}
            <div className="border-t border-[#282830] mt-3.5 pt-3">
              <div className="text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-blue-400" />
                  <span>Écouter le chant</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      if (hasYoutubeEmbed) {
                        setActiveAudioSource('youtube');
                        setShowSettingsDrawer(false);
                        setShowAudioPlayer(true);
                        setIsAudioPlayerMinimized(false);
                      } else {
                        setShowSpotifyConfig(false);
                        setShowYoutubeConfig(prev => !prev);
                        setYoutubeInputUrl(effectiveYoutubeUrl || '');
                      }
                    }}
                    className={`w-full flex items-center gap-2 p-2.5 ${hasYoutubeEmbed && canManageSongs ? 'pr-8' : ''} rounded-xl bg-gradient-to-br from-red-600/25 via-red-900/15 to-[#16161C] hover:from-red-600/35 hover:via-red-900/25 border border-red-500/40 hover:border-red-400 text-white font-bold text-xs transition-all cursor-pointer group shadow-md shadow-red-950/30 hover:shadow-red-950/50 active:scale-98 text-left`}
                    title={hasYoutubeEmbed ? "Lancer le lecteur YouTube" : "Ajouter un lien YouTube pour ce chant"}
                  >
                    <div className="w-7 h-7 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500 shrink-0 group-hover:scale-110 group-hover:bg-red-600/30 transition-transform shadow-xs">
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs text-white group-hover:text-red-200 transition-colors">
                        YouTube
                      </div>
                      {!hasYoutubeEmbed && (
                        <div className="text-[10px] font-normal text-red-300/80 truncate">
                          + Ajouter lien
                        </div>
                      )}
                    </div>
                  </button>
                  {hasYoutubeEmbed && canManageSongs && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowSpotifyConfig(false);
                        setShowYoutubeConfig(prev => !prev);
                        setYoutubeInputUrl(effectiveYoutubeUrl || '');
                      }}
                      className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors cursor-pointer ${
                        showYoutubeConfig
                          ? 'bg-red-500/30 text-white'
                          : 'text-red-300/80 hover:text-white hover:bg-red-500/20'
                      }`}
                      title="Modifier le lien YouTube"
                      aria-label="Modifier le lien YouTube"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="relative">
                  <a
                    href={`https://open.spotify.com/search/${encodeURIComponent([parsedData.title || song.title, parsedData.artist || song.artist].filter(Boolean).join(' '))}`}
                    onClick={(e) => {
                      e.preventDefault();
                      if (hasSpotifyEmbed) {
                        setActiveAudioSource('spotify');
                        setShowSettingsDrawer(false);
                        setShowAudioPlayer(true);
                        setIsAudioPlayerMinimized(false);
                      } else {
                        setShowYoutubeConfig(false);
                        setShowSpotifyConfig(prev => !prev);
                        setSpotifyInputUrl(effectiveSpotifyUrl || '');
                      }
                    }}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full flex items-center gap-2 p-2.5 ${hasSpotifyEmbed && canManageSongs ? 'pr-8' : ''} rounded-xl bg-gradient-to-br from-emerald-600/25 via-emerald-900/15 to-[#16161C] hover:from-emerald-600/35 hover:via-emerald-900/25 border border-emerald-500/40 hover:border-emerald-400 text-white font-bold text-xs transition-all cursor-pointer group shadow-md shadow-emerald-950/30 hover:shadow-emerald-950/50 active:scale-98`}
                    title={hasSpotifyEmbed ? "Écouter sur le petit lecteur Spotify sans quitter l'app" : "Ajouter un lien Spotify pour ce chant"}
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-110 group-hover:bg-emerald-600/30 transition-transform shadow-xs">
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs text-white group-hover:text-emerald-200 transition-colors">
                        Spotify
                      </div>
                      {!hasSpotifyEmbed && (
                        <div className="text-[10px] font-normal text-emerald-300/80 truncate">
                          + Ajouter lien
                        </div>
                      )}
                    </div>
                  </a>
                  {hasSpotifyEmbed && canManageSongs && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowYoutubeConfig(false);
                        setShowSpotifyConfig(prev => !prev);
                        setSpotifyInputUrl(effectiveSpotifyUrl || '');
                      }}
                      className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors cursor-pointer ${
                        showSpotifyConfig
                          ? 'bg-emerald-500/30 text-white'
                          : 'text-emerald-300/80 hover:text-white hover:bg-emerald-500/20'
                      }`}
                      title="Modifier le lien Spotify"
                      aria-label="Modifier le lien Spotify"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {effectiveAudioUrl && !effectiveYoutubeUrl && !hasSpotifyEmbed && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveAudioSource('audio');
                      setShowSettingsDrawer(false);
                      setShowAudioPlayer(true);
                      setIsAudioPlayerMinimized(false);
                    }}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-gradient-to-br from-blue-600/25 via-blue-900/15 to-[#16161C] hover:from-blue-600/35 hover:via-blue-900/25 border border-blue-500/40 hover:border-blue-400 text-white font-bold text-xs transition-all cursor-pointer group shadow-md shadow-blue-950/30 hover:shadow-blue-950/50 active:scale-98 col-span-2"
                    title="Écouter le fichier audio MP3 dans le lecteur"
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 group-hover:scale-110 group-hover:bg-blue-600/30 transition-transform shadow-xs">
                      <Music className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="font-bold text-xs text-white group-hover:text-blue-200 transition-colors">
                        Fichier Audio (MP3)
                      </div>
                    </div>
                  </button>
                )}
              </div>

              {/* Panneau de configuration rapide YouTube */}
              {showYoutubeConfig && (
                <div className="mt-2.5 p-2.5 rounded-xl bg-[#1A1416] border border-red-500/40 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <div className="text-[11px] font-bold text-red-400 mb-1 flex items-center justify-between">
                    <span>Lier une vidéo YouTube</span>
                    <button 
                      type="button" 
                      onClick={() => setShowYoutubeConfig(false)}
                      className="text-gray-400 hover:text-white p-0.5 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 mb-2 leading-relaxed">
                    Collez le lien YouTube pour l'enregistrer et l'écouter directement dans l'application.
                  </p>
                  <div className="flex gap-1.5 mb-2">
                    <input
                      type="url"
                      value={youtubeInputUrl}
                      onChange={(e) => setYoutubeInputUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && youtubeInputUrl.trim()) {
                          e.preventDefault();
                          handleSaveYoutubeUrl();
                        }
                      }}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#1C1C22] border border-[#3A3A44] text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500 font-mono"
                    />
                    <button
                      type="button"
                      disabled={!youtubeInputUrl.trim() || isSavingYoutube}
                      onClick={() => handleSaveYoutubeUrl()}
                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs cursor-pointer transition-colors shrink-0 shadow-xs"
                    >
                      {isSavingYoutube ? '...' : 'Écouter'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <a
                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent([parsedData.title || song.title, parsedData.artist || song.artist].filter(Boolean).join(' '))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-400 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Chercher sur YouTube pour copier le lien</span>
                    </a>
                    {effectiveYoutubeUrl && (
                      <button
                        type="button"
                        onClick={() => handleSaveYoutubeUrl('')}
                        className="text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
                      >
                        Retirer le lien
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Panneau de configuration rapide Spotify */}
              {showSpotifyConfig && (
                <div className="mt-2.5 p-2.5 rounded-xl bg-[#141822] border border-emerald-500/40 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <div className="text-[11px] font-bold text-emerald-400 mb-1 flex items-center justify-between">
                    <span>Lier un morceau ou album Spotify</span>
                    <button 
                      type="button" 
                      onClick={() => setShowSpotifyConfig(false)}
                      className="text-gray-400 hover:text-white p-0.5 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 mb-2 leading-relaxed">
                    Collez le lien Spotify pour l'enregistrer et l'écouter directement dans le petit lecteur.
                  </p>
                  <div className="flex gap-1.5 mb-2">
                    <input
                      type="url"
                      value={spotifyInputUrl}
                      onChange={(e) => setSpotifyInputUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && spotifyInputUrl.trim()) {
                          e.preventDefault();
                          handleSaveSpotifyUrl();
                        }
                      }}
                      placeholder="https://open.spotify.com/track/..."
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#1C1C22] border border-[#3A3A44] text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                    <button
                      type="button"
                      disabled={!spotifyInputUrl.trim() || isSavingSpotify}
                      onClick={() => handleSaveSpotifyUrl()}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs cursor-pointer transition-colors shrink-0 shadow-xs"
                    >
                      {isSavingSpotify ? '...' : 'Écouter'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <a
                      href={`https://open.spotify.com/search/${encodeURIComponent([parsedData.title || song.title, parsedData.artist || song.artist].filter(Boolean).join(' '))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Chercher sur Spotify pour copier le lien</span>
                    </a>
                    {effectiveSpotifyUrl && (
                      <button
                        type="button"
                        onClick={() => handleSaveSpotifyUrl('')}
                        className="text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
                      >
                        Retirer le lien
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}


      {/* Main Chord & Lyrics Canvas (Stage Reader) */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto ${isWideLayout ? 'px-3 sm:px-6 lg:px-8' : 'px-3 sm:px-8 md:px-12'} pt-2 sm:pt-4 pb-28 sm:pb-32 ${stageSettings.isAutoScrolling ? 'scroll-auto' : 'scroll-smooth'} print-sheet print:p-0 print:m-0 print:overflow-visible print:h-auto print:w-full print:max-w-none`}
        style={{ 
          lineHeight: displaySettings.typography.lineSpacing,
          scrollBehavior: stageSettings.isAutoScrolling ? 'auto' : undefined
        }}
      >
        <div className={`${isWideLayout ? 'w-full max-w-none' : 'max-w-4xl mx-auto'} print:w-full print:max-w-none`}>
          
          {/* En-tête d'impression spécifique A4 (Invisible à l'écran, actif uniquement à l'impression papier) */}
          <div className="hidden print:block w-full mb-4 pb-3 border-b-2 border-neutral-900 break-inside-avoid text-black">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold tracking-tight text-black leading-tight">
                  {stripParentheses(parsedData.title || song.title)}
                </h1>
                {(song.artist || (metaVis.album !== false && (song.album || parsedData.album))) && (
                  <p className="text-sm font-semibold text-neutral-700 italic mt-0.5">
                    {[
                      song.artist,
                      metaVis.album !== false ? (song.album || parsedData.album || '').trim() : ''
                    ].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
              {isInSetlist && (currentSetlist?.name || setlistContextName) && (
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                    {setlistContextName || currentSetlist?.name}
                  </span>
                  {setlistPosition && (
                    <span className="text-xs text-neutral-600 ml-1.5 font-mono">
                      (Chant {setlistPosition.current}/{setlistPosition.total})
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Badges métadonnées formatés pour papier A4 */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-2.5 pt-2 border-t border-neutral-300 text-xs text-neutral-900">
              <div className="flex items-center gap-1">
                <span className="font-semibold text-neutral-500 uppercase text-[10px] tracking-wider">Tonalité :</span>
                <span className="font-mono font-bold text-black text-sm">{baseKeyDisplay}</span>
              </div>
              {effectiveCapo > 0 && (
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-neutral-500 uppercase text-[10px] tracking-wider">Capo :</span>
                  <span className="font-mono font-bold text-black">{effectiveCapo}</span>
                  {capoPlayedKey && (
                    <span className="text-neutral-600 font-mono text-[11px]">(Joué {capoPlayedKey})</span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-1">
                <span className="font-semibold text-neutral-500 uppercase text-[10px] tracking-wider">Tempo :</span>
                <span className="font-mono font-bold text-black">{effectiveTempo} BPM</span>
              </div>
              {(song.timeSignature || parsedData.timeSignature) && (
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-neutral-500 uppercase text-[10px] tracking-wider">Mesure :</span>
                  <span className="font-mono font-bold text-black">{song.timeSignature || parsedData.timeSignature}</span>
                </div>
              )}
              {effectiveDuration && (
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-neutral-500 uppercase text-[10px] tracking-wider">Durée :</span>
                  <span className="font-mono font-bold text-black">{effectiveDuration}</span>
                </div>
              )}
              {song.language && (
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-neutral-500 uppercase text-[10px] tracking-wider">Langue :</span>
                  <span className="text-neutral-900 font-medium">{song.language}</span>
                </div>
              )}
            </div>

            {/* Note / consigne si présente */}
            {metaVis.notes && effectiveNotes && (
              <div className="mt-2 text-xs italic text-neutral-800 bg-neutral-100 p-2 rounded border border-neutral-300">
                <strong className="not-italic font-semibold text-neutral-900 mr-1">Note :</strong>
                {effectiveNotes}
              </div>
            )}
          </div>

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
                  {hasAudioLink && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowAudioPlayer(!showAudioPlayer);
                        setIsAudioPlayerMinimized(false);
                      }}
                      className={`p-1 rounded-md text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center justify-center border ${
                        showAudioPlayer
                          ? 'bg-red-600 border-red-500 text-white shadow-xs'
                          : 'bg-red-500/15 hover:bg-red-500/25 text-red-400 border-red-500/40 hover:border-red-400'
                      }`}
                      title={`Écouter l'enregistrement (${effectiveYoutubeUrl ? 'YouTube' : 'Audio'})`}
                      aria-label="Écouter l'enregistrement"
                    >
                      <Play className="w-3 h-3 fill-current" />
                    </button>
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
                        {effectiveCapo > 0 && (
                          <span className="text-purple-400 ml-1 text-[10px]">
                            (Capo {effectiveCapo})
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
            <div className="no-print border-b border-[#222224] pb-2 sm:pb-3 mb-2.5 sm:mb-4">
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
                      <div className="flex items-center gap-1.5 flex-wrap">
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

            {/* Ligne Artiste & Album */}
            {((metaVis.artist && song.artist) || (metaVis.album !== false && (song.album || parsedData.album))) && (
              <div className="w-full flex items-center gap-1.5 sm:gap-2 flex-wrap mb-1.5 sm:mb-2 text-xs">
                {metaVis.artist && song.artist && (
                  <div 
                    className="text-gray-300 font-medium break-words shrink-0"
                    style={{ fontSize: `${displaySettings.typography.metadataSize}px` }}
                  >
                    {song.artist}
                  </div>
                )}
                {metaVis.artist && song.artist && metaVis.album !== false && (song.album || parsedData.album) && (
                  <span className="text-gray-600 select-none">·</span>
                )}
                {metaVis.album !== false && (song.album || parsedData.album) && (
                  <div
                    className="inline-flex items-center gap-1 text-gray-400 break-words shrink-0"
                    style={{ fontSize: `${displaySettings.typography.metadataSize}px` }}
                    title={`Album : ${(song.album || parsedData.album || '').trim()}`}
                  >
                    <Disc className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                    <span>{(song.album || parsedData.album || '').trim()}</span>
                  </div>
                )}
              </div>
            )}

            {/* Single Line Toolbar: Stylized Inline Controls with Dropdowns for Tonalité, Capo & BPM */}
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
                      className="absolute top-full mt-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 box-border"
                    >
                      <KeySelectorKeypad
                        currentKey={baseKey}
                        onKeyChange={(targetKey) => {
                          handleSetBaseKey(targetKey);
                        }}
                        onClose={() => setShowKeyMenu(false)}
                        modeLock={isSongOriginallyMinor ? 'minor' : 'major'}
                        title="Tonalité :"
                      />
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
                  {effectiveCapo > 0 && capoPlayedKey && (
                    <span className="text-purple-300/90 font-mono font-semibold hidden md:inline" style={{ fontSize: `${Math.max(10, displaySettings.typography.metadataSize - 1)}px` }}>
                      (Joué {capoPlayedKey})
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
                          <span>Capodastre (Personnel)</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-1.5 text-xs">
                        {[0, 1, 2, 3, 4, 5, 6, 7].map((fret) => {
                          const isSelected = effectiveCapo === fret;
                          return (
                            <button
                              key={fret}
                              type="button"
                              onClick={() => handleSetCapo(fret)}
                              className={`py-2 px-1.5 rounded-lg font-mono transition-colors cursor-pointer flex items-center justify-center whitespace-nowrap ${
                                isSelected
                                  ? 'bg-purple-600 text-white font-bold shadow-xs'
                                  : 'bg-[#1C1C22] text-gray-300 hover:bg-[#25252D] hover:text-white border border-[#2E2E36]'
                              }`}
                            >
                              <span className={`font-bold ${fret === 0 ? 'text-[11px] font-sans' : 'text-xs'}`}>
                                {fret === 0 ? 'Sans capo' : fret}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {effectiveCapo > 0 && capoPlayedKey && (
                        <div className="mt-2 p-1.5 rounded bg-purple-500/10 border border-purple-500/25 text-[10px] text-purple-200 leading-tight">
                          Capo {effectiveCapo} : accords affichés en <strong className="font-mono text-white">{capoPlayedKey}</strong> (sonne en <strong className="font-mono text-blue-300">{baseKeyDisplay}</strong>).
                        </div>
                      )}
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
                className="no-print mt-2 p-2 rounded-lg bg-[#111112] border border-[#222224] flex items-start gap-2.5 transition-all text-xs"
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

        {/* Structured ChordPro Sections : Standard ou Mode Bilingue */}
        {!isBilingualMode ? (
          <div 
            className={`${getColumnsGridClass(numColumns)} ${numColumns > 1 ? 'print:grid print:grid-cols-2 print:gap-x-6 print:gap-y-3' : 'print:flex print:flex-col print:gap-3'}`}
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
              const effectiveSectionOffset = visualChordTransposeSemitones + (section.transposeOffset || 0);

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
                section.type === 'grid' ? 'Grille' :
                section.type === 'tab' ? 'Tablature' :
                section.type && section.type !== 'general' ? section.type : ''
              );

              const hasSectionMeta = Boolean(section.isChorusRecall || section.key || section.tempo || section.timeSignature || section.transposeOffset || section.gridShape?.raw);
              // Le nom des sections doit être visible
              const isSectionHeaderVisible = metaVis.sectionHeaders !== false;
              const hasVisibleHeader = Boolean(
                (isSectionHeaderVisible && sectionTitle) ||
                sectionRepeat > 1 ||
                hasSectionMeta ||
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
                  data-section-card="true"
                  className={`rounded-lg ${cardPaddingClass} transition-all print:break-inside-avoid print:page-break-inside-avoid print:p-0 print:mb-3 print:bg-transparent print:border-none print:shadow-none`}
                  style={getSectionBorderStyles(secColor, displaySettings.sectionBorders)}
                >
                  {/* Section Title Header & Vocal Arrangement Pastille & Repeat Badge (Lecture seule) */}
                  {hasVisibleHeader && (
                    <div className={`flex items-center justify-between gap-2 ${headerMarginClass} flex-wrap print:mb-1 print:gap-1.5`}>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isSectionHeaderVisible && sectionTitle ? (
                          <span
                            className="inline-block font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border shadow-xs text-left select-none print:px-2 print:py-0.5 print:bg-neutral-100 print:text-neutral-900 print:border-neutral-300 print:text-[9.5pt] print:shadow-none"
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

                        {section.isChorusRecall && (
                          <span className="text-[10px] font-medium uppercase tracking-wider text-blue-300/80 border border-blue-500/30 bg-blue-950/30 px-1.5 py-0.5 rounded print:text-neutral-700 print:border-neutral-400">
                            Rappel
                          </span>
                        )}

                        {/* Section Repeat Badge (Lecture seule) */}
                        {sectionRepeat > 1 && (
                          <span 
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded border bg-emerald-950/40 border-emerald-500/50 text-emerald-300 font-bold font-mono select-none print:bg-neutral-100 print:border-neutral-400 print:text-neutral-900 print:text-[9.5pt]"
                            style={{ fontSize: `${Math.max(10, Math.round((displaySettings.typography?.headerSize || 12) * 0.9))}px` }}
                            title={`Répété ${sectionRepeat} fois`}
                          >
                            <Repeat 
                              style={{ 
                                width: `${Math.max(11, Math.round((displaySettings.typography?.headerSize || 12) * 0.9))}px`,
                                height: `${Math.max(11, Math.round((displaySettings.typography?.headerSize || 12) * 0.9))}px` 
                              }}
                              className="text-emerald-400 shrink-0 print:text-neutral-800" 
                            />
                            <span>x{sectionRepeat}</span>
                          </span>
                        )}

                        {(section.key || section.transposeOffset || section.tempo || section.timeSignature || section.gridShape?.raw) && (
                          <span className="text-[11px] font-mono text-gray-300/90 print:text-neutral-700">
                            {[
                              section.gridShape?.raw ? `Grille ${section.gridShape.raw}` : '',
                              section.key ? `Ton: ${transposeChord(section.key, visualChordTransposeSemitones, stageSettings.notation)}` : '',
                              section.transposeOffset ? `${section.transposeOffset > 0 ? '+' : ''}${section.transposeOffset}t` : '',
                              section.tempo ? `${section.tempo} BPM` : '',
                              section.timeSignature || ''
                            ].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </div>

                      {/* Pastilles Arrangement Vocal dans le coin supérieur droit */}
                      {metaVis.vocalArrangement && (
                        <div className="no-print flex items-center gap-1.5 flex-wrap ml-auto">
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
                  {renderSectionLinesList(section, effectiveSectionOffset, linesSpacingClass, false)}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 items-start">
            {/* Colonne GAUCHE : Version Normale */}
            <div className="w-full flex flex-col space-y-3">
              <div className="sticky top-0 z-10 py-2 px-3 rounded-xl bg-[#141418]/95 backdrop-blur-md border border-blue-500/30 flex items-center justify-between text-xs shadow-md">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 ${getLanguageMeta(song.language).badgeClass}`}>
                    {getLanguageMeta(song.language).code}
                  </span>
                  <div className="min-w-0">
                    <span className="font-bold text-white text-xs truncate block">
                      {stripParentheses(parsedData.title || song.title)}
                    </span>
                    <span className="text-[10px] text-blue-300 font-medium">
                      Version normale ({getLanguageMeta(song.language).name})
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-950/50 px-2 py-0.5 rounded-md border border-blue-500/40">
                    Tonalité {baseKeyDisplay}
                  </span>
                </div>
              </div>

              <div 
                className="w-full flex flex-col"
                style={{ 
                  gap: `${currentSectionSpacing}px`, 
                  rowGap: `${currentSectionSpacing}px` 
                }}
              >
                {renderSongSections(parsedData.sections, visualChordTransposeSemitones, false)}
              </div>
            </div>

            {/* Colonne DROITE : Version Traduite */}
            <div className="w-full flex flex-col space-y-3">
              {translatedSong && parsedTranslatedData ? (
                <>
                  <div className="sticky top-0 z-10 py-2 px-3 rounded-xl bg-[#151522]/95 backdrop-blur-md border border-indigo-500/40 flex items-center justify-between text-xs shadow-md">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 ${getLanguageMeta(translatedSong.language).badgeClass}`}>
                        {getLanguageMeta(translatedSong.language).code}
                      </span>
                      <div className="min-w-0">
                        <span className="font-bold text-white text-xs truncate block">
                          {stripParentheses(parsedTranslatedData.title || translatedSong.title)}
                        </span>
                        <span className="text-[10px] text-indigo-300 font-medium">
                          Version traduite ({getLanguageMeta(translatedSong.language).name})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {linkedVersions.length > 1 && (
                        <select
                          value={translatedSong.id}
                          onChange={(e) => setSelectedTranslatedSongId(e.target.value)}
                          className="bg-[#1C1C26] border border-indigo-500/40 rounded-lg px-2 py-1 text-[11px] font-medium text-indigo-200 cursor-pointer focus:outline-none"
                          title="Changer de version traduite"
                        >
                          {linkedVersions.map((lv) => {
                            const meta = getLanguageMeta(lv.language);
                            return (
                              <option key={lv.id} value={lv.id} className="bg-[#141418] text-white">
                                {meta.code} - {lv.title}
                              </option>
                            );
                          })}
                        </select>
                      )}

                      <button
                        type="button"
                        onClick={() => setShowAddTranslationModal(true)}
                        className="p-1.5 rounded-lg bg-[#222232] hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-colors cursor-pointer"
                        title="Ajouter ou lier une autre version traduite"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsBilingualMode(false)}
                        className="p-1.5 rounded-lg bg-[#202026] hover:bg-[#2A2A34] text-gray-400 hover:text-white transition-colors cursor-pointer"
                        title="Quitter la vue bilingue"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div 
                    className="w-full flex flex-col"
                    style={{ 
                      gap: `${currentSectionSpacing}px`, 
                      rowGap: `${currentSectionSpacing}px` 
                    }}
                  >
                    {renderSongSections(
                      parsedTranslatedData.sections, 
                      ((getSemitoneDifference((parsedTranslatedData.key || translatedSong.key || catalogBaseKey), effectiveBaseKey) - effectiveCapo) % 12 + 12) % 12, 
                      true
                    )}
                  </div>
                </>
              ) : (
                /* Card pour ajouter/lier la version traduite */
                <div className="p-4 sm:p-5 rounded-2xl bg-[#14141A] border border-indigo-500/30 shadow-xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#242432]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white">Ajouter la version traduite</h4>
                        <p className="text-[11px] text-gray-400">Présentez la version normale à gauche et la traduction ici à droite</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsBilingualMode(false)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#202028] transition-colors cursor-pointer"
                      title="Quitter la vue bilingue"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-3.5">
                    {/* 1. Lier un chant existant */}
                    <div className="p-3 rounded-xl bg-[#181822] border border-[#282838] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">
                          1. Lier un chant existant du répertoire
                        </span>
                        <span className="text-[10px] text-gray-500">Recherche rapide</span>
                      </div>
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Rechercher par titre ou langue..."
                          value={bilingualSearchQuery}
                          onChange={(e) => setBilingualSearchQuery(e.target.value)}
                          className="w-full bg-[#111116] border border-[#333] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                        {availableSongsToLinkBilingual.length === 0 ? (
                          <div className="text-center py-3 text-[11px] text-gray-500">
                            Aucun chant correspondant disponible
                          </div>
                        ) : (
                          availableSongsToLinkBilingual.map((item) => {
                            const lMeta = getLanguageMeta(item.language);
                            return (
                              <div
                                key={item.id}
                                className="p-2 rounded-lg bg-[#121218] hover:bg-[#1A1A24] border border-[#262634] flex items-center justify-between gap-2 text-xs transition-colors"
                              >
                                <div className="min-w-0 flex items-center gap-2">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 ${lMeta.badgeClass}`}>
                                    {lMeta.code}
                                  </span>
                                  <div className="min-w-0">
                                    <div className="text-xs font-semibold text-white truncate">{item.title}</div>
                                    <div className="text-[10px] text-gray-400 truncate">{item.artist || 'Auteur inconnu'} • {lMeta.name}</div>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleLinkExistingAsTranslation(item.id)}
                                  className="px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition-colors shrink-0 shadow-xs cursor-pointer"
                                >
                                  Afficher
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* 2. Créer une nouvelle version traduite */}
                    {canManageSongs && (
                      <form onSubmit={handleCreateNewTranslationFromReader} className="p-3 rounded-xl bg-[#181822] border border-[#282838] space-y-2.5">
                        <span className="text-[11px] font-bold text-blue-300 uppercase tracking-wider block">
                          2. Ou créer une nouvelle version traduite
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-medium text-gray-400 block mb-1">Langue cible</label>
                            <select
                              value={bilingualNewLang}
                              onChange={(e) => setBilingualNewLang(e.target.value)}
                              className="w-full bg-[#111116] border border-[#333] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                            >
                              {PRESET_LANGUAGES.filter(l => l.name.toLowerCase() !== song.language?.toLowerCase()).map((lang) => (
                                <option key={lang.code} value={lang.name} className="bg-[#141416]">
                                  {lang.name} ({lang.code})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-medium text-gray-400 block mb-1">Titre de la nouvelle version</label>
                            <input
                              type="text"
                              placeholder={`${song.title} - ${bilingualNewLang}`}
                              value={bilingualNewTitle}
                              onChange={(e) => setBilingualNewTitle(e.target.value)}
                              className="w-full bg-[#111116] border border-[#333] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>
                        <button
                          type="submit"
                          disabled={isCreatingTranslation}
                          className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{isCreatingTranslation ? 'Création en cours...' : 'Créer et afficher à droite'}</span>
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

          {/* Song Sheet Legal Footer: CCLI & Copyright */}
          {((metaVis.ccli && effectiveCcli) || (metaVis.copyright && effectiveCopyright)) && (
            <div className="mt-8 pt-4 border-t border-[#222226] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-gray-400 print:text-neutral-600 print:border-neutral-300 print:mt-4 print:pt-2 print:break-inside-avoid">
              {metaVis.copyright && effectiveCopyright && (
                <div className="flex items-center gap-2 text-gray-400 min-w-0 print:text-neutral-600">
                  <Copyright className="w-3.5 h-3.5 text-gray-500 shrink-0 print:text-neutral-600" />
                  <span className="truncate">{effectiveCopyright}</span>
                </div>
              )}
              {metaVis.ccli && effectiveCcli && (
                <div className="flex items-center gap-2 shrink-0 sm:ml-auto print:text-neutral-600">
                  <Shield className="w-3.5 h-3.5 text-blue-400 shrink-0 print:text-neutral-600" />
                  <span>
                    Chant CCLI N°{' '}
                    <a
                      href={`https://songselect.ccli.com/Songs/${effectiveCcli.replace(/\D/g, '') || effectiveCcli}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono font-bold text-blue-400 hover:underline print:text-neutral-900"
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

      {/* Floating Auto-Scroll Control Widget (toujours disponible lors de l'activation) */}
      {(showFloatingAutoScroll || stageSettings.isAutoScrolling) && (
        <div className="no-print fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-1.5 pl-3 rounded-2xl bg-[#16161C]/95 border border-[#33333F] shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-200 text-xs max-w-[calc(100vw-32px)]">
          {/* Status Indicator & Progress */}
          <div className="flex items-center gap-2 shrink-0">
            <span className={`w-2 h-2 rounded-full shrink-0 ${
              stageSettings.isAutoScrolling ? 'bg-amber-400 animate-ping' : 'bg-gray-500'
            }`} />
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-white text-[11px] flex items-center gap-1.5 leading-tight">
                <span>Défilement</span>
                <span className="text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-500/30 px-1 rounded">
                  {scrollProgress}%
                </span>
              </span>
              <span className="text-[9px] text-gray-400 font-mono leading-tight">
                {stageSettings.isAutoScrolling ? 'En cours' : 'En pause'} • {effectiveDuration}
              </span>
            </div>
          </div>

          {/* Multiplicateur de vitesse */}
          <div className="flex items-center bg-[#101014] border border-[#262630] rounded-lg p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setScrollSpeedMultiplier(prev => Math.max(0.5, Number((prev - 0.25).toFixed(2))))}
              className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#202028] transition-colors font-bold text-xs cursor-pointer"
              title="Ralentir (-0.25x)"
            >
              -
            </button>
            <span className="text-[10px] font-mono font-bold text-blue-400 min-w-[28px] text-center px-0.5">
              {scrollSpeedMultiplier}x
            </span>
            <button
              type="button"
              onClick={() => setScrollSpeedMultiplier(prev => Math.min(3, Number((prev + 0.25).toFixed(2))))}
              className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#202028] transition-colors font-bold text-xs cursor-pointer"
              title="Accélérer (+0.25x)"
            >
              +
            </button>
          </div>

          {/* Bouton bascule Pause / Reprendre */}
          <button
            type="button"
            onClick={handleToggleAutoScroll}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-md active:scale-95 shrink-0 ${
              stageSettings.isAutoScrolling
                ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/25 ring-1 ring-amber-400/40'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40 ring-1 ring-emerald-400/40'
            }`}
            title={stageSettings.isAutoScrolling ? "Mettre en pause le défilement" : "Reprendre le défilement"}
          >
            {stageSettings.isAutoScrolling ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Reprendre</span>
              </>
            )}
          </button>

          {/* Revenir au début */}
          <button
            type="button"
            onClick={() => {
              if (containerRef.current) {
                containerRef.current.scrollTop = 0;
                scrollPosRef.current = 0;
              }
            }}
            className="p-1.5 rounded-lg bg-[#202028] hover:bg-[#2A2A36] text-gray-300 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Revenir au début du chant"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Arrêter et désactiver */}
          <button
            type="button"
            onClick={() => {
              updateStageSettings({ isAutoScrolling: false });
              setShowFloatingAutoScroll(false);
            }}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#202028] transition-colors cursor-pointer shrink-0"
            title="Désactiver et fermer le défilement"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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

      {/* Modals & Popups (Hidden in Print) */}
      <div className="no-print">
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
          allowCover={isInSetlist}
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
        capo={effectiveCapo}
      />

      {/* Language Version & Relations Modal */}
      {song && (
        <LanguageVersionModal
          song={song}
          isOpen={showLanguageModal}
          onClose={() => setShowLanguageModal(false)}
        />
      )}

      {/* Quick Add Translation Modal (Bilingual Mode) */}
      {showAddTranslationModal && song && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-100"
          onClick={() => setShowAddTranslationModal(false)}
        >
          <div 
            className="w-full max-w-md bg-[#16161A] border border-[#2E2E38] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 bg-[#1C1C22] border-b border-[#282832] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs sm:text-sm font-bold text-white">Ajouter une version traduite</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddTranslationModal(false)}
                className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#25252D] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
              {/* Option 1: Lier un chant */}
              <div className="p-3 rounded-xl bg-[#141418] border border-[#282834] space-y-2">
                <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider block">
                  1. Lier un chant existant
                </span>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Rechercher par titre ou langue..."
                    value={bilingualSearchQuery}
                    onChange={(e) => setBilingualSearchQuery(e.target.value)}
                    className="w-full bg-[#111116] border border-[#333] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {availableSongsToLinkBilingual.length === 0 ? (
                    <div className="text-center py-2 text-[11px] text-gray-500">
                      Aucun chant disponible
                    </div>
                  ) : (
                    availableSongsToLinkBilingual.map((item) => {
                      const lMeta = getLanguageMeta(item.language);
                      return (
                        <div key={item.id} className="p-2 rounded-lg bg-[#111115] hover:bg-[#1A1A22] border border-[#22222C] flex items-center justify-between gap-2 text-xs">
                          <div className="min-w-0 flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 ${lMeta.badgeClass}`}>
                              {lMeta.code}
                            </span>
                            <span className="truncate text-white font-medium">{item.title}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleLinkExistingAsTranslation(item.id)}
                            className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold shrink-0 cursor-pointer"
                          >
                            Afficher
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Option 2: Créer une nouvelle version */}
              {canManageSongs && (
                <form onSubmit={handleCreateNewTranslationFromReader} className="p-3 rounded-xl bg-[#141418] border border-[#282834] space-y-2.5">
                  <span className="text-[11px] font-bold text-blue-300 uppercase tracking-wider block">
                    2. Ou créer une nouvelle version traduite
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-medium text-gray-400 block mb-1">Langue cible</label>
                      <select
                        value={bilingualNewLang}
                        onChange={(e) => setBilingualNewLang(e.target.value)}
                        className="w-full bg-[#111116] border border-[#333] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        {PRESET_LANGUAGES.filter(l => l.name.toLowerCase() !== song.language?.toLowerCase()).map((lang) => (
                          <option key={lang.code} value={lang.name} className="bg-[#141416]">
                            {lang.name} ({lang.code})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-gray-400 block mb-1">Titre de la nouvelle version</label>
                      <input
                        type="text"
                        placeholder={`${song.title} - ${bilingualNewLang}`}
                        value={bilingualNewTitle}
                        onChange={(e) => setBilingualNewTitle(e.target.value)}
                        className="w-full bg-[#111116] border border-[#333] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isCreatingTranslation}
                    className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isCreatingTranslation ? 'Création en cours...' : 'Créer et afficher à droite'}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
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

              {/* Contenu : Mode Bilingue et Liste des versions */}
              <div className="p-3 sm:p-4 space-y-3 max-h-[calc(80vh-90px)] overflow-y-auto custom-scrollbar">

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

                            {/* Boutons : « Afficher » et « Remplacer » */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleViewOnlyVersion(lv)}
                                className="px-2 sm:px-2.5 py-1.5 rounded-lg bg-[#222228] hover:bg-[#2C2C34] text-gray-200 hover:text-white text-xs font-semibold border border-[#33333E] transition-colors cursor-pointer"
                              >
                                Afficher
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReplaceCurrentSongInSetlist(lv)}
                                className="px-2 sm:px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
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
                  <div className="text-center py-5 space-y-3">
                    <p className="text-xs text-gray-400 leading-relaxed max-w-xs mx-auto">
                      Ce chant ({currentLangMeta.name}) n'a pas encore d'autre version liée dans le répertoire.
                    </p>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          setIsBilingualMode(true);
                          setShowSetlistVersionModal(false);
                          showFeedbackToast('Mode bilingue activé : ajoutez ou liez la version traduite à droite.');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer shadow-md"
                      >
                        <Columns className="w-3.5 h-3.5" />
                        <span>Ouvrir en 2 colonnes & traduire</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowSetlistVersionModal(false);
                          setShowLanguageModal(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#202028] hover:bg-[#282832] text-gray-200 text-xs font-semibold border border-[#333] transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Lier une version</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
      </div>

      {/* Floating Toast Feedback for setlist modifications */}
      {feedbackToast && (
        <div className="no-print fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A20]/95 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Floating Audio, YouTube & Spotify Player */}
      {showAudioPlayer && (
        isAudioPlayerMinimized ? (
          <div className={`no-print fixed bottom-3 right-3 sm:bottom-6 sm:right-6 z-50 flex items-center gap-2 p-1.5 pl-3 rounded-full bg-[#16161A]/95 shadow-2xl backdrop-blur-md animate-in fade-in duration-150 border ${
            activeAudioSource === 'spotify' ? 'border-emerald-500/50' : 'border-red-500/50'
          }`}>
            <span className={`w-2 h-2 rounded-full animate-ping shrink-0 ${
              activeAudioSource === 'spotify' ? 'bg-emerald-400' : 'bg-red-500'
            }`} />
            <span className="text-xs font-bold text-white max-w-[130px] truncate">{song.title}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
              activeAudioSource === 'spotify' 
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                : 'bg-red-500/20 text-red-300 border border-red-500/30'
            }`}>
              {activeAudioSource === 'spotify' ? 'Spotify' : (activeAudioSource === 'youtube' ? 'YouTube' : 'Audio')}
            </span>
            <button
              type="button"
              onClick={() => setIsAudioPlayerMinimized(false)}
              className="p-1 rounded-full text-gray-300 hover:text-white hover:bg-[#282830] transition-colors cursor-pointer"
              title="Agrandir le lecteur"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setShowAudioPlayer(false)}
              className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-[#282830] transition-colors cursor-pointer"
              title="Fermer le lecteur"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="no-print fixed bottom-3 right-3 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-24px)] sm:w-96 max-w-sm bg-[#16161A]/95 border border-[#333] shadow-2xl rounded-2xl p-3 backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-200">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#282830]">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  activeAudioSource === 'spotify' 
                    ? 'bg-emerald-600/20 text-emerald-400' 
                    : 'bg-red-600/20 text-red-400'
                }`}>
                  {activeAudioSource === 'spotify' ? (
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">{song.title}</div>
                  <div className="text-[10px] text-gray-400 truncate">
                    {activeAudioSource === 'spotify' 
                      ? 'Lecteur Spotify' 
                      : (activeAudioSource === 'youtube' ? 'Vidéo YouTube' : 'Piste Audio')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {activeAudioSource === 'spotify' && effectiveSpotifyUrl && (
                  <a
                    href={effectiveSpotifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#25252D] transition-colors"
                    title="Ouvrir dans Spotify (nouvel onglet)"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                {activeAudioSource === 'youtube' && (
                  <a
                    href={effectiveYoutubeUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent([parsedData.title || song.title, parsedData.artist || song.artist].filter(Boolean).join(' '))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#25252D] transition-colors"
                    title="Ouvrir sur YouTube (nouvel onglet)"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                {activeAudioSource === 'audio' && effectiveAudioUrl && (
                  <a
                    href={effectiveAudioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#25252D] transition-colors"
                    title="Ouvrir dans un nouvel onglet"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setIsAudioPlayerMinimized(true)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#25252D] transition-colors cursor-pointer"
                  title="Réduire"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowAudioPlayer(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#25252D] transition-colors cursor-pointer"
                  title="Fermer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Switcher de source si plusieurs sources configurées */}
            {[Boolean(effectiveYoutubeUrl), hasSpotifyEmbed, Boolean(effectiveAudioUrl)].filter(Boolean).length > 1 && (
              <div className="flex items-center gap-1 mb-2 p-1 bg-[#101014] rounded-lg border border-[#25252E]">
                {effectiveYoutubeUrl && (
                  <button
                    type="button"
                    onClick={() => setActiveAudioSource('youtube')}
                    className={`flex-1 py-1 px-2 rounded-md text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                      activeAudioSource === 'youtube'
                        ? 'bg-red-600/30 text-red-200 border border-red-500/40'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <svg className="w-3 h-3 text-red-500 fill-current" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                    <span>YouTube</span>
                  </button>
                )}
                {hasSpotifyEmbed && (
                  <button
                    type="button"
                    onClick={() => setActiveAudioSource('spotify')}
                    className={`flex-1 py-1 px-2 rounded-md text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                      activeAudioSource === 'spotify'
                        ? 'bg-emerald-600/30 text-emerald-200 border border-emerald-500/40'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <svg className="w-3 h-3 text-emerald-400 fill-current" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                    <span>Spotify</span>
                  </button>
                )}
                {effectiveAudioUrl && (
                  <button
                    type="button"
                    onClick={() => setActiveAudioSource('audio')}
                    className={`flex-1 py-1 px-2 rounded-md text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                      activeAudioSource === 'audio'
                        ? 'bg-blue-600/30 text-blue-200 border border-blue-500/40'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Music className="w-3 h-3 text-blue-400" />
                    <span>Audio</span>
                  </button>
                )}
              </div>
            )}

            {/* Spotify Player Embed */}
            {activeAudioSource === 'spotify' && hasSpotifyEmbed && (
              <div className="rounded-xl overflow-hidden border border-[#2A2A32] bg-[#121212] mb-1.5 shadow-md">
                <iframe
                  src={getSpotifyEmbedUrl(effectiveSpotifyUrl)!}
                  title={`Spotify: ${song.title}`}
                  className="w-full h-[152px] border-0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                />
              </div>
            )}

            {/* Video Embed YouTube */}
            {activeAudioSource === 'youtube' && (() => {
              const query = [parsedData.title || song.title, parsedData.artist || song.artist].filter(Boolean).join(' ');
              const embedUrl = effectiveYoutubeUrl 
                ? getYouTubeEmbedUrl(effectiveYoutubeUrl) 
                : `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(query)}&autoplay=1`;
              
              if (embedUrl) {
                return (
                  <div>
                    <div className="rounded-lg overflow-hidden border border-[#2A2A32] bg-black aspect-video mb-2 shadow-md">
                      <iframe
                        src={embedUrl}
                        title={song.title}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                    {!effectiveYoutubeUrl && (
                      <div className="flex items-center justify-between text-[10px] text-gray-400 px-1 mb-1">
                        <span className="flex items-center gap-1 text-red-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                          Recherche automatique YouTube
                        </span>
                        <a
                          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-white hover:underline flex items-center gap-0.5"
                        >
                          <span>Voir sur YouTube</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <div className="p-3 bg-[#111114] rounded-lg text-center mb-2">
                  <a
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Ouvrir sur YouTube</span>
                  </a>
                </div>
              );
            })()}

            {/* Direct Audio Stream */}
            {activeAudioSource === 'audio' && effectiveAudioUrl && (
              <div>
                <div className="text-[10px] text-gray-400 font-medium mb-1 flex items-center justify-between">
                  <span>Piste audio directe</span>
                  {isDirectAudioUrl(effectiveAudioUrl) && <span className="text-[9px] text-emerald-400 font-mono">Fichier direct</span>}
                </div>
                <audio
                  controls
                  autoPlay
                  src={effectiveAudioUrl}
                  className="w-full h-9 rounded"
                />
              </div>
            )}
          </div>
        )
      )}

    </div>
  );
};
