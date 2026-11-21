import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Song, Setlist } from '../types';
import { 
  buildPresentationSlides, 
  buildBilingualPresentationSlides,
  buildBiblePresentationSlides,
  buildBilingualBiblePresentationSlides,
  cleanBibleVerseText,
  broadcastPresentationState, 
  pushPresentationStateToServer,
  PresentationSlide,
  PresentationState,
  getSavedFontScale,
  saveFontScale,
  getSavedAutoLayout,
  saveAutoLayout,
  getSavedBackgroundImage,
  saveBackgroundImage,
  getSavedBackgroundOverlay,
  saveBackgroundOverlay,
  getTargetTimestampFromTime,
  formatRemainingTime,
  CountdownState,
  CountdownThemeId,
  COUNTDOWN_THEMES,
  getCountdownTheme,
  MediaPresentationState
} from '../utils/presentationUtils';
import { stripParentheses } from '../utils/chordUtils';
import { getLinkedSongVersions, getLanguageMeta, PRESET_LANGUAGES } from '../utils/languageUtils';
import { includesIgnoreAccents, getSongSearchScore } from '../utils/songSearchUtils';
import { PresentationBackgroundModal } from './PresentationBackgroundModal';
import { BibleProjectionModule } from './BibleProjectionModule';
import { MediaProjectionModule } from './MediaProjectionModule';
import { AiTranslationModal } from './AiTranslationModal';
import {
  AiSongTranslation,
  buildChordProFromTranslation,
  toVirtualTranslatedSong,
  getSavedAiTranslations,
  saveAiTranslationToStorage,
  deleteAiTranslationFromStorage
} from '../utils/aiTranslationUtils';
import { BiblePassageData } from '../types';
import { 
  Tv, 
  Film,
  ExternalLink, 
  EyeOff, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  ListMusic, 
  Search, 
  ArrowUp, 
  ArrowDown, 
  Music, 
  Check, 
  Sparkles,
  Maximize2,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Type,
  Image as ImageIcon,
  Sliders,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Timer,
  Clock,
  Play,
  Square,
  Palette,
  BookOpen,
  Columns,
  Globe,
  Lock,
  Languages,
  Edit3,
  LayoutGrid
} from 'lucide-react';

export interface QueueItem {
  uid: string;
  type?: 'song' | 'bible';
  songId?: string;
  bibleData?: BiblePassageData;
  secondaryBibleData?: BiblePassageData | null;
  bilingualBibleFormat?: 'stacked' | 'columns';
  setlistName: string;
  setlistId?: string;
}


const getTodayDateString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const PresentationManager: React.FC = () => {
  const {
    songs,
    setlists,
    selectedSetlist,
    showNotification,
    linkSongs,
    createSong,
    updateSong,
    currentUser,
    isGuest
  } = useApp();

  const songsById = useMemo(() => new Map(songs.map(s => [s.id, s])), [songs]);

  // File de chants pour la projection avec support multi-setlists
  const [queueItems, setQueueItems] = useState<QueueItem[]>(() => {
    const todayStr = getTodayDateString();
    const initialSongIds = new Set(songs.map(s => s.id));
    const todaySetlists = setlists.filter(st => 
      st.date && 
      (st.date === todayStr || st.date.startsWith(todayStr)) && 
      st.songIds && 
      st.songIds.length > 0
    );

    if (todaySetlists.length > 0) {
      const items: QueueItem[] = [];
      todaySetlists.forEach(st => {
        const validIds = initialSongIds.size > 0
          ? st.songIds.filter(songId => initialSongIds.has(songId))
          : st.songIds;
        validIds.forEach((songId, idx) => {
          items.push({
            uid: `${st.id}_${songId}_${idx}`,
            songId,
            setlistName: st.name,
            setlistId: st.id
          });
        });
      });
      return items;
    }

    return [];
  });

  // Suivi de l'empreinte synchronisée des setlists du jour pour déclencher la notification toast
  const lastSyncedTodaySigRef = useRef<string>('');

  // Synchronisation automatique des setlists pour la date du jour vers la file de projection
  useEffect(() => {
    const todayStr = getTodayDateString();
    const todaySetlists = setlists
      .filter(st => st.date && (st.date === todayStr || st.date.startsWith(todayStr)))
      .map(st => ({
        ...st,
        validSongIds: songsById.size > 0
          ? (st.songIds || []).filter(id => songsById.has(id))
          : (st.songIds || [])
      }))
      .filter(st => st.validSongIds.length > 0);

    if (todaySetlists.length === 0) return;

    const todaySig = todaySetlists
      .map(st => `${st.id}:${st.name}:${st.validSongIds.join(',')}`)
      .join('|');

    if (lastSyncedTodaySigRef.current !== todaySig) {
      lastSyncedTodaySigRef.current = todaySig;

      const todayItems: QueueItem[] = [];
      todaySetlists.forEach(st => {
        st.validSongIds.forEach((songId, idx) => {
          todayItems.push({
            uid: `${st.id}_${songId}_${idx}`,
            songId,
            setlistName: st.name,
            setlistId: st.id
          });
        });
      });

      setQueueItems(prev => {
        if (prev.length === 0) {
          return todayItems;
        }

        const todaySetlistIds = new Set(todaySetlists.map(s => s.id));
        const nonTodayItems = prev.filter(item => !item.setlistId || !todaySetlistIds.has(item.setlistId));
        const hadTodayItems = prev.some(item => item.setlistId && todaySetlistIds.has(item.setlistId));

        if (hadTodayItems) {
          return [...nonTodayItems, ...todayItems];
        }

        return [...prev, ...todayItems];
      });

      showNotification?.({
        title: 'File de projection mise à jour pour la date du jour',
        message: 'Projection queue updated for the current date',
        type: 'info'
      });
    }
  }, [setlists, songsById, showNotification]);

  // Synchronisation continue des autres setlists et purge des chants supprimés dans la file
  useEffect(() => {
    setQueueItems(prev => {
      if (prev.length === 0) return prev;
      const todayStr = getTodayDateString();
      const todaySetlistIds = new Set(
        setlists
          .filter(st => st.date && (st.date === todayStr || st.date.startsWith(todayStr)))
          .map(st => st.id)
      );

      const otherSetlistIdsInQueue = Array.from(
        new Set(prev.map(i => i.setlistId).filter((id): id is string => Boolean(id) && !todaySetlistIds.has(id)))
      );

      let hasChanges = false;
      let nextQueue: QueueItem[] = [];

      for (const item of prev) {
        if (songsById.size > 0 && item.type !== 'bible' && (!item.songId || !songsById.has(item.songId))) {
          hasChanges = true;
          continue;
        }
        if (!item.setlistId || todaySetlistIds.has(item.setlistId)) {
          nextQueue.push(item);
        }
      }

      // Reconstruire les chants pour chaque setlist selon son état actuel
      for (const sId of otherSetlistIdsInQueue) {
        const foundSetlist = setlists.find(s => s.id === sId);
        const validSetlistSongIds = foundSetlist
          ? (songsById.size > 0 ? (foundSetlist.songIds || []).filter(id => songsById.has(id)) : (foundSetlist.songIds || []))
          : [];

        if (foundSetlist && validSetlistSongIds.length > 0) {
          const currentItemsForSetlist = prev.filter(
            i => i.setlistId === sId && (songsById.size === 0 || (i.songId && songsById.has(i.songId)))
          );
          const currentSongIds = currentItemsForSetlist.map(i => i.songId);
          const isIdentical = 
            currentSongIds.length === validSetlistSongIds.length &&
            currentSongIds.every((id, idx) => id === validSetlistSongIds[idx]);

          if (isIdentical) {
            nextQueue.push(...currentItemsForSetlist);
          } else {
            hasChanges = true;
            validSetlistSongIds.forEach((songId, idx) => {
              nextQueue.push({
                uid: `${foundSetlist.id}_${songId}_${idx}`,
                songId,
                setlistName: foundSetlist.name,
                setlistId: foundSetlist.id
              });
            });
          }
        } else {
          hasChanges = true;
        }
      }

      return hasChanges ? nextQueue : prev;
    });
  }, [setlists, songsById]);

  const [activeSongIndex, setActiveSongIndex] = useState<number>(0);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [isBlackout, setIsBlackout] = useState<boolean>(false);

  // Projection directe biblique & Onglet pupitre
  const [liveDirectBible, setLiveDirectBible] = useState<BiblePassageData | null>(null);
  const [liveDirectSecondaryBible, setLiveDirectSecondaryBible] = useState<BiblePassageData | null>(null);
  const [liveDirectBibleFormat, setLiveDirectBibleFormat] = useState<'stacked' | 'columns'>('stacked');
  const [liveDirectSlideIndex, setLiveDirectSlideIndex] = useState<number>(0);
  const [activePupitreTab, setActivePupitreTab] = useState<'songs' | 'bible' | 'media'>('songs');

  // Projection directe de Médias (Vidéos, Images, Audio)
  const [liveDirectMedia, setLiveDirectMedia] = useState<MediaPresentationState | null>(() => {
    try {
      const saved = localStorage.getItem('presentation_media_active');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });


  // Échelle de police globale pour l'écran externe (pilotée depuis la régie)
  const [fontScale, setFontScale] = useState<number>(() => getSavedFontScale());
  const [isFontScaleMenuOpen, setIsFontScaleMenuOpen] = useState<boolean>(false);
  const fontMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isFontScaleMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (fontMenuRef.current && !fontMenuRef.current.contains(e.target as Node)) {
        setIsFontScaleMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
  }, [isFontScaleMenuOpen]);

  // Menu / Popover du décompte avant événement (accessible via bouton icône)
  const [isCountdownMenuOpen, setIsCountdownMenuOpen] = useState<boolean>(false);
  const countdownMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isCountdownMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (countdownMenuRef.current && !countdownMenuRef.current.contains(e.target as Node)) {
        setIsCountdownMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCountdownMenuOpen]);

  // Référence de la colonne droite pour limiter la hauteur max de la file de projection
  const rightColRef = useRef<HTMLDivElement>(null);
  const [maxQueueHeight, setMaxQueueHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const el = rightColRef.current;
    if (!el) return;

    const updateHeight = () => {
      if (window.innerWidth >= 1024) {
        setMaxQueueHeight(el.offsetHeight);
      } else {
        setMaxQueueHeight(undefined);
      }
    };

    updateHeight();

    const observer = new ResizeObserver(() => {
      updateHeight();
    });
    observer.observe(el);
    window.addEventListener('resize', updateHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, []);

  // Image d'arrière-plan personnalisée et filtre sombre automatique
  const [backgroundImage, setBackgroundImage] = useState<string>(() => getSavedBackgroundImage());
  const [backgroundOverlay, setBackgroundOverlay] = useState<number>(() => getSavedBackgroundOverlay());
  const [isBackgroundModalOpen, setIsBackgroundModalOpen] = useState<boolean>(false);

  // Mode Bilingue en projection (chant original + version traduite)
  const [isBilingualMode, setIsBilingualMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('melobook_presentation_bilingual_mode') === 'true';
    } catch {
      return false;
    }
  });

  const [bilingualFormat, setBilingualFormat] = useState<'stacked' | 'columns'>(() => {
    try {
      const saved = localStorage.getItem('melobook_presentation_bilingual_format');
      if (saved === 'columns' || saved === 'stacked') return saved;
    } catch {}
    return 'stacked';
  });

  const [selectedSecondarySongId, setSelectedSecondarySongId] = useState<string | null>(null);
  const [showBilingualModal, setShowBilingualModal] = useState<boolean>(false);
  const [bilingualSearchQuery, setBilingualSearchQuery] = useState<string>('');

  // Traduction automatique par IA & édition manuelle locale (persistance localStorage)
  const [aiTranslations, setAiTranslations] = useState<Record<string, AiSongTranslation>>(() =>
    getSavedAiTranslations()
  );
  const [isAiTranslateModalOpen, setIsAiTranslateModalOpen] = useState<boolean>(false);
  const [aiTranslateInitialEdit, setAiTranslateInitialEdit] = useState<boolean>(false);

  const canSaveTranslationToLibrary = Boolean(
    !isGuest && currentUser && ['admin', 'leader', 'editor'].includes(currentUser.role)
  );

  // Mise en page automatique équilibrée (divise selon la longueur du texte)
  const [autoLayout, setAutoLayout] = useState<boolean>(() => getSavedAutoLayout());

  const handleToggleAutoLayout = useCallback(() => {
    setAutoLayout(prev => {
      const next = !prev;
      saveAutoLayout(next);
      setActiveSlideIndex(0);
      showNotification?.({
        title: next ? 'Mise en page auto activée' : 'Mise en page standard (4 lignes max)',
        message: next
          ? 'Les paroles sont divisées en slides équilibrées selon la longueur du chant.'
          : 'Découpage fixe classique par blocs de 4 lignes.',
        type: 'info'
      });
      return next;
    });
  }, [showNotification]);

  const handleToggleBilingualMode = useCallback(() => {
    setIsBilingualMode(prev => {
      const next = !prev;
      try {
        localStorage.setItem('melobook_presentation_bilingual_mode', String(next));
      } catch {}
      return next;
    });
  }, []);

  const handleSetBilingualFormat = useCallback((format: 'stacked' | 'columns') => {
    setBilingualFormat(format);
    try {
      localStorage.setItem('melobook_presentation_bilingual_format', format);
    } catch {}
  }, []);

  const handleAdjustFontScale = useCallback((delta: number) => {
    setFontScale(prev => {
      const next = Math.max(0.5, Math.min(2.5, Math.round((prev + delta) * 20) / 20));
      saveFontScale(next);
      return next;
    });
  }, []);

  const handleResetFontScale = useCallback(() => {
    setFontScale(1.0);
    saveFontScale(1.0);
  }, []);

  const handleSetFontScalePreset = useCallback((preset: number) => {
    setFontScale(preset);
    saveFontScale(preset);
  }, []);

  const handleSelectBackground = useCallback((url: string) => {
    setBackgroundImage(url);
    saveBackgroundImage(url);
  }, []);

  const handleAdjustBackgroundOverlay = useCallback((overlay: number) => {
    setBackgroundOverlay(overlay);
    saveBackgroundOverlay(overlay);
  }, []);

  // Modal d'ajout d'un chant séparé (hors-setlist)
  const [isAddSongModalOpen, setIsAddSongModalOpen] = useState<boolean>(false);
  const [songModalSearch, setSongModalSearch] = useState<string>('');

  // Sélecteur de setlist
  const [selectedSetlistId, setSelectedSetlistId] = useState<string>(selectedSetlist?.id || '');
  const [isSetlistDropdownOpen, setIsSetlistDropdownOpen] = useState<boolean>(false);
  const setlistDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (setlistDropdownRef.current && !setlistDropdownRef.current.contains(e.target as Node)) {
        setIsSetlistDropdownOpen(false);
      }
    };
    if (isSetlistDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isSetlistDropdownOpen]);

  // État pliable de la file de projection
  const [isQueueCollapsed, setIsQueueCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('presentation_queue_collapsed');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const toggleQueueCollapse = useCallback(() => {
    setIsQueueCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('presentation_queue_collapsed', String(next)); } catch {}
      return next;
    });
  }, []);

  // Décompte avant événement
  const [countdownActive, setCountdownActive] = useState<boolean>(() => {
    try {
      return localStorage.getItem('presentation_countdown_active') === 'true';
    } catch {
      return false;
    }
  });

  const [countdownTime, setCountdownTime] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('presentation_countdown_time');
      if (saved) return saved;
    } catch {}
    const now = new Date();
    now.setMinutes(Math.ceil((now.getMinutes() + 10) / 5) * 5, 0, 0);
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  });

  const [countdownTitle, setCountdownTitle] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('presentation_countdown_title');
      if (saved) return saved;
    } catch {}
    return 'Le culte commence dans';
  });

  // Thème visuel / style du décompte
  const [countdownThemeId, setCountdownThemeId] = useState<CountdownThemeId>(() => {
    try {
      const saved = localStorage.getItem('presentation_countdown_theme');
      if (saved && COUNTDOWN_THEMES.some(t => t.id === saved)) {
        return saved as CountdownThemeId;
      }
    } catch {}
    return 'neon-cyan';
  });

  const handleSelectCountdownTheme = useCallback((themeId: CountdownThemeId) => {
    setCountdownThemeId(themeId);
    try { localStorage.setItem('presentation_countdown_theme', themeId); } catch {}
  }, []);

  // Horloge locale régie pour rafraîchir l'affichage du décompte chaque seconde
  const [regieNow, setRegieNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setRegieNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleCountdown = useCallback(() => {
    setCountdownActive(prev => {
      const next = !prev;
      try { localStorage.setItem('presentation_countdown_active', String(next)); } catch {}
      if (next) {
        showNotification?.({
          title: 'Décompte diffusé sur l\'écran',
          message: `Début prévu à ${countdownTime}`,
          type: 'info'
        });
      } else {
        showNotification?.({
          title: 'Décompte arrêté',
          message: 'Diffusion standard des paroles',
          type: 'info'
        });
      }
      return next;
    });
  }, [countdownTime, showNotification]);

  const handleSetCountdownTime = useCallback((time: string) => {
    setCountdownTime(time);
    try { localStorage.setItem('presentation_countdown_time', time); } catch {}
  }, []);

  const handleAddMinutes = useCallback((mins: number) => {
    const target = new Date(Date.now() + mins * 60 * 1000);
    const hh = String(target.getHours()).padStart(2, '0');
    const mm = String(target.getMinutes()).padStart(2, '0');
    const formatted = `${hh}:${mm}`;
    setCountdownTime(formatted);
    try { localStorage.setItem('presentation_countdown_time', formatted); } catch {}
  }, []);

  const handleSetCountdownTitle = useCallback((title: string) => {
    setCountdownTitle(title);
    try { localStorage.setItem('presentation_countdown_title', title); } catch {}
  }, []);


  // Référence vers la pop-up de projection
  const popupRef = useRef<Window | null>(null);

  // Éléments visibles (résolus) dans la file de projection
  const visibleQueueCount = useMemo(() => {
    return queueItems.filter(item =>
      item.type === 'bible' ? Boolean(item.bibleData) : Boolean(item.songId && songsById.has(item.songId))
    ).length;
  }, [queueItems, songsById]);

  // Chants résolus dans la file
  const queueSongs: Song[] = useMemo(() => {
    return queueItems
      .filter(item => item.type !== 'bible' && Boolean(item.songId))
      .map(item => songsById.get(item.songId!))
      .filter((s): s is Song => Boolean(s));
  }, [queueItems, songsById]);

  // Élément actif dans la file de projection
  const currentQueueItem: QueueItem | null = useMemo(() => {
    if (queueItems.length === 0) return null;
    const clamped = Math.max(0, Math.min(queueItems.length - 1, activeSongIndex));
    return queueItems[clamped] || null;
  }, [queueItems, activeSongIndex]);

  // Chant actuellement sélectionné (si l'élément est un chant)
  const currentSong: Song | null = useMemo(() => {
    if (!currentQueueItem || currentQueueItem.type === 'bible' || !currentQueueItem.songId) return null;
    return songs.find(s => s.id === currentQueueItem.songId) || null;
  }, [currentQueueItem, songs]);

  useEffect(() => {
    setSelectedSecondarySongId(null);
  }, [currentSong?.id]);

  // Slides calculées pour le live direct biblique
  const liveDirectSlides: PresentationSlide[] = useMemo(() => {
    if (!liveDirectBible) return [];
    if (liveDirectSecondaryBible) {
      return buildBilingualBiblePresentationSlides(
        liveDirectBible,
        liveDirectSecondaryBible,
        liveDirectBibleFormat
      );
    }
    return buildBiblePresentationSlides(liveDirectBible);
  }, [liveDirectBible, liveDirectSecondaryBible, liveDirectBibleFormat]);

  // Versions liées linguistiques disponibles pour le chant actif
  const availableLinkedVersions = useMemo(() => {
    if (!currentSong) return [];
    return getLinkedSongVersions(currentSong, songs);
  }, [currentSong, songs]);

  const activeAiTranslation = useMemo(() => {
    if (!currentSong) return null;
    return aiTranslations[currentSong.id] || null;
  }, [currentSong, aiTranslations]);

  // Version traduite sélectionnée pour la projection bilingue (liée ou traduction IA)
  const secondarySong: Song | null = useMemo(() => {
    if (!isBilingualMode || !currentSong) return null;
    if (selectedSecondarySongId === `ai_${currentSong.id}` && activeAiTranslation) {
      return toVirtualTranslatedSong(currentSong, activeAiTranslation);
    }
    if (selectedSecondarySongId) {
      const found = songs.find(s => s.id === selectedSecondarySongId);
      if (found) return found;
    }
    if (availableLinkedVersions.length > 0) {
      return availableLinkedVersions[0];
    }
    if (activeAiTranslation) {
      return toVirtualTranslatedSong(currentSong, activeAiTranslation);
    }
    return null;
  }, [isBilingualMode, currentSong, selectedSecondarySongId, songs, availableLinkedVersions, activeAiTranslation]);

  const handleApplyAiTranslation = useCallback((translation: AiSongTranslation) => {
    const nextMap = saveAiTranslationToStorage(translation);
    setAiTranslations(nextMap);
    setSelectedSecondarySongId(`ai_${translation.sourceSongId}`);
    setIsBilingualMode(true);
    try {
      localStorage.setItem('melobook_presentation_bilingual_mode', 'true');
    } catch {}
    showNotification?.({
      title: 'Traduction appliquée en projection',
      message: `${translation.translatedTitle} (${translation.targetLanguage})`,
      type: 'success'
    });
  }, [showNotification]);

  const handleSaveAiTranslationToLibrary = useCallback(async (translation: AiSongTranslation) => {
    if (!currentSong) return;
    const chordPro = buildChordProFromTranslation(translation.translatedTitle, translation.blocks);
    const existingLinkedId =
      translation.linkedSongId ||
      (secondarySong && !secondarySong.id.startsWith('ai_') ? secondarySong.id : undefined);

    let targetId = existingLinkedId;
    if (existingLinkedId) {
      await updateSong(existingLinkedId, {
        title: translation.translatedTitle,
        language: translation.targetLanguage,
        contentChordPro: chordPro
      });
    } else {
      targetId = await createSong({
        title: translation.translatedTitle,
        artist: currentSong.artist,
        key: currentSong.key,
        tempo: currentSong.tempo,
        timeSignature: currentSong.timeSignature,
        tags: currentSong.tags ? [...currentSong.tags] : [],
        language: translation.targetLanguage,
        linkedSongIds: [currentSong.id],
        notes: `Traduction IA (${translation.targetLanguage})`,
        contentChordPro: chordPro
      });
      if (targetId) {
        await linkSongs(currentSong.id, targetId);
      }
    }

    if (targetId) {
      const savedMap = saveAiTranslationToStorage({
        ...translation,
        linkedSongId: targetId
      });
      setAiTranslations(savedMap);
      setSelectedSecondarySongId(targetId);
    }
    setIsBilingualMode(true);
    try {
      localStorage.setItem('melobook_presentation_bilingual_mode', 'true');
    } catch {}
    showNotification?.({
      title: existingLinkedId ? 'Chant traduit mis à jour' : 'Traduction enregistrée et liée',
      message: `${translation.translatedTitle} (${translation.targetLanguage})`,
      type: 'success'
    });
  }, [currentSong, secondarySong, updateSong, createSong, linkSongs, showNotification]);

  const handleDeleteLocalAiTranslation = useCallback((sourceSongId: string) => {
    const nextMap = deleteAiTranslationFromStorage(sourceSongId);
    setAiTranslations(nextMap);
    if (selectedSecondarySongId === `ai_${sourceSongId}`) {
      setSelectedSecondarySongId(null);
    }
    showNotification?.({
      title: 'Traduction locale supprimée',
      message: 'Vous pouvez relancer une traduction IA à tout moment.',
      type: 'info'
    });
  }, [selectedSecondarySongId, showNotification]);

  // Slides calculées pour l'élément actif de la file
  const queueItemSlides: PresentationSlide[] = useMemo(() => {
    if (!currentQueueItem) return [];
    if (currentQueueItem.type === 'bible' && currentQueueItem.bibleData) {
      if (currentQueueItem.secondaryBibleData) {
        return buildBilingualBiblePresentationSlides(
          currentQueueItem.bibleData,
          currentQueueItem.secondaryBibleData,
          currentQueueItem.bilingualBibleFormat || 'stacked'
        );
      }
      return buildBiblePresentationSlides(currentQueueItem.bibleData);
    }
    if (currentSong) {
      if (isBilingualMode && secondarySong) {
        return buildBilingualPresentationSlides(
          currentSong.contentChordPro || currentSong.content || '',
          secondarySong.contentChordPro || secondarySong.content || '',
          currentSong.title,
          secondarySong.title,
          currentSong.language || 'Français',
          secondarySong.language || 'Anglais',
          bilingualFormat,
          bilingualFormat === 'stacked' ? 3 : 4,
          { autoLayout }
        );
      }
      return buildPresentationSlides(
        currentSong.contentChordPro || currentSong.content || '',
        currentSong.title,
        undefined,
        { autoLayout }
      );
    }
    return [];
  }, [currentQueueItem, currentSong, isBilingualMode, secondarySong, bilingualFormat, autoLayout]);

  // Slides actuellement diffusées : priorité au Live Direct Biblique si actif
  const currentSlides: PresentationSlide[] = liveDirectBible ? liveDirectSlides : queueItemSlides;
  const effectiveSlideIndex = liveDirectBible ? liveDirectSlideIndex : activeSlideIndex;
  const clampedSlideIndex = Math.max(0, Math.min(Math.max(0, currentSlides.length - 1), effectiveSlideIndex));
  const activeSlide: PresentationSlide | null = currentSlides[clampedSlideIndex] || currentSlides[0] || null;

  // Diffusion de l'état vers tous les canaux
  const broadcastCurrentState = useCallback((
    targetItem: QueueItem | null,
    targetSong: Song | null,
    slideIdx: number,
    blackout: boolean,
    scale: number,
    bgImg: string,
    bgOverlay: number,
    isCdActive: boolean,
    cdTime: string,
    cdTitle: string,
    cdThemeId: CountdownThemeId,
    liveBible: BiblePassageData | null,
    liveSecondaryBible: BiblePassageData | null,
    liveBibleFmt: 'stacked' | 'columns',
    liveBibleIdx: number,
    liveMedia: MediaPresentationState | null,
    pupitreTab: 'songs' | 'bible' | 'media'
  ) => {
    const cdPayload: CountdownState | undefined = isCdActive ? {
      isActive: true,
      targetTime: cdTime,
      targetTimestamp: getTargetTimestampFromTime(cdTime),
      title: cdTitle.trim() || 'Le culte commence dans',
      themeId: cdThemeId
    } : undefined;

    // Priorité 0 : Live Direct Média si actif
    if (liveMedia?.isActive) {
      const statePayload: PresentationState = {
        songTitle: liveMedia.title,
        sectionTitle: liveMedia.type.toUpperCase(),
        lines: [],
        slideIndex: 0,
        totalSlides: 1,
        isBlackout: blackout,
        fontScale: scale,
        backgroundImage: bgImg,
        backgroundOverlay: bgOverlay,
        countdown: cdPayload,
        media: liveMedia,
        itemType: 'media',
        updatedAt: Date.now()
      };

      broadcastPresentationState(statePayload);
      pushPresentationStateToServer(statePayload);
      try {
        if (popupRef.current && !popupRef.current.closed) {
          popupRef.current.postMessage({
            type: 'MELOBOOK_PRESENTATION_UPDATE',
            state: statePayload
          }, '*');
        }
      } catch {}
      return;
    }

    // Priorité 1 : Live Direct Biblique
    if (liveBible) {
      const bSlides = liveSecondaryBible
        ? buildBilingualBiblePresentationSlides(liveBible, liveSecondaryBible, liveBibleFmt)
        : buildBiblePresentationSlides(liveBible);
      const validIdx = Math.max(0, Math.min(Math.max(0, bSlides.length - 1), liveBibleIdx));
      const slide = bSlides[validIdx] || bSlides[0];

      const statePayload: PresentationState = {
        songTitle: liveBible.referenceText,
        sectionTitle: slide?.sectionTitle || '',
        lines: slide?.lines || [],
        slideIndex: validIdx,
        totalSlides: bSlides.length,
        isBlackout: blackout,
        fontScale: scale,
        backgroundImage: bgImg,
        backgroundOverlay: bgOverlay,
        countdown: cdPayload,
        itemType: 'bible',
        bibleReference: slide?.bibleReference || `${liveBible.referenceText} (${liveBible.version})`,
        bibleVersion: slide?.version || liveBible.version,
        isBilingual: Boolean(liveSecondaryBible && slide?.isBilingual),
        bilingualFormat: slide?.bilingualFormat || liveBibleFmt,
        primaryLanguage: slide?.primaryLanguage || liveBible.version,
        secondaryLanguage: slide?.secondaryLanguage || liveSecondaryBible?.version,
        secondarySongTitle: liveSecondaryBible?.referenceText,
        secondaryLines: slide?.secondaryLines,
        updatedAt: Date.now()
      };

      broadcastPresentationState(statePayload);
      pushPresentationStateToServer(statePayload);
      try {
        if (popupRef.current && !popupRef.current.closed) {
          popupRef.current.postMessage({
            type: 'MELOBOOK_PRESENTATION_UPDATE',
            state: statePayload
          }, '*');
        }
      } catch {}
      return;
    }

    // Dans l'onglet Média, si aucun média n'est en direct : écran noir
    if (pupitreTab === 'media') {
      const emptyState: PresentationState = {
        songTitle: '',
        sectionTitle: '',
        lines: [],
        slideIndex: 0,
        totalSlides: 0,
        isBlackout: true,
        fontScale: scale,
        backgroundImage: bgImg,
        backgroundOverlay: bgOverlay,
        countdown: cdPayload,
        itemType: 'media',
        updatedAt: Date.now()
      };
      broadcastPresentationState(emptyState);
      pushPresentationStateToServer(emptyState);
      try {
        if (popupRef.current && !popupRef.current.closed) {
          popupRef.current.postMessage({
            type: 'MELOBOOK_PRESENTATION_UPDATE',
            state: emptyState
          }, '*');
        }
      } catch {}
      return;
    }

    // Dans l'onglet Bible, si aucun passage n'est en direct : écran noir (ne pas diffuser un chant inopiné)
    if (pupitreTab === 'bible') {
      const emptyState: PresentationState = {
        songTitle: '',
        sectionTitle: '',
        lines: [],
        slideIndex: 0,
        totalSlides: 0,
        isBlackout: true,
        fontScale: scale,
        backgroundImage: bgImg,
        backgroundOverlay: bgOverlay,
        countdown: cdPayload,
        itemType: 'bible',
        updatedAt: Date.now()
      };
      broadcastPresentationState(emptyState);
      pushPresentationStateToServer(emptyState);
      try {
        if (popupRef.current && !popupRef.current.closed) {
          popupRef.current.postMessage({
            type: 'MELOBOOK_PRESENTATION_UPDATE',
            state: emptyState
          }, '*');
        }
      } catch {}
      return;
    }

    // Priorité 2 : Élément de file de type Bible
    if (targetItem?.type === 'bible' && targetItem.bibleData) {
      const bSlides = targetItem.secondaryBibleData
        ? buildBilingualBiblePresentationSlides(
            targetItem.bibleData,
            targetItem.secondaryBibleData,
            targetItem.bilingualBibleFormat || 'stacked'
          )
        : buildBiblePresentationSlides(targetItem.bibleData);
      const validIdx = Math.max(0, Math.min(Math.max(0, bSlides.length - 1), slideIdx));
      const slide = bSlides[validIdx] || bSlides[0];

      const statePayload: PresentationState = {
        songTitle: targetItem.bibleData.referenceText,
        sectionTitle: slide?.sectionTitle || '',
        lines: slide?.lines || [],
        slideIndex: validIdx,
        totalSlides: bSlides.length,
        isBlackout: blackout,
        fontScale: scale,
        backgroundImage: bgImg,
        backgroundOverlay: bgOverlay,
        countdown: cdPayload,
        itemType: 'bible',
        bibleReference: slide?.bibleReference || `${targetItem.bibleData.referenceText} (${targetItem.bibleData.version})`,
        bibleVersion: slide?.version || targetItem.bibleData.version,
        isBilingual: Boolean(targetItem.secondaryBibleData && slide?.isBilingual),
        bilingualFormat: slide?.bilingualFormat || targetItem.bilingualBibleFormat || 'stacked',
        primaryLanguage: slide?.primaryLanguage || targetItem.bibleData.version,
        secondaryLanguage: slide?.secondaryLanguage || targetItem.secondaryBibleData?.version,
        secondarySongTitle: targetItem.secondaryBibleData?.referenceText,
        secondaryLines: slide?.secondaryLines,
        updatedAt: Date.now()
      };

      broadcastPresentationState(statePayload);
      pushPresentationStateToServer(statePayload);
      try {
        if (popupRef.current && !popupRef.current.closed) {
          popupRef.current.postMessage({
            type: 'MELOBOOK_PRESENTATION_UPDATE',
            state: statePayload
          }, '*');
        }
      } catch {}
      return;
    }

    // Priorité 3 : Chant
    if (!targetSong) {
      const emptyState: PresentationState = {
        songTitle: '',
        sectionTitle: '',
        lines: [],
        slideIndex: 0,
        totalSlides: 0,
        isBlackout: blackout,
        fontScale: scale,
        backgroundImage: bgImg,
        backgroundOverlay: bgOverlay,
        countdown: cdPayload,
        itemType: 'song',
        updatedAt: Date.now()
      };
      broadcastPresentationState(emptyState);
      pushPresentationStateToServer(emptyState);
      return;
    }

    const slides = (isBilingualMode && secondarySong)
      ? buildBilingualPresentationSlides(
          targetSong.contentChordPro || targetSong.content || '',
          secondarySong.contentChordPro || secondarySong.content || '',
          targetSong.title,
          secondarySong.title,
          targetSong.language || 'Français',
          secondarySong.language || 'Anglais',
          bilingualFormat,
          bilingualFormat === 'stacked' ? 3 : 4,
          { autoLayout }
        )
      : buildPresentationSlides(
          targetSong.contentChordPro || targetSong.content || '',
          targetSong.title,
          undefined,
          { autoLayout }
        );
    const validIdx = Math.max(0, Math.min(Math.max(0, slides.length - 1), slideIdx));
    const slide = slides[validIdx] || slides[0];

    const statePayload: PresentationState = {
      songTitle: stripParentheses(targetSong.title),
      sectionTitle: slide?.sectionTitle || '',
      lines: slide?.lines || [],
      slideIndex: validIdx,
      totalSlides: slides.length,
      isBlackout: blackout,
      fontScale: scale,
      backgroundImage: bgImg,
      backgroundOverlay: bgOverlay,
      countdown: cdPayload,
      itemType: 'song',
      isBilingual: Boolean(isBilingualMode && secondarySong),
      bilingualFormat: bilingualFormat,
      primaryLanguage: targetSong.language || 'Français',
      secondarySongTitle: secondarySong ? stripParentheses(secondarySong.title) : undefined,
      secondaryLanguage: secondarySong?.language || undefined,
      secondaryLines: slide?.secondaryLines || undefined,
      updatedAt: Date.now()
    };

    // 1. BroadcastChannel + localStorage
    broadcastPresentationState(statePayload);
    // 2. Serveur Express HTTP
    pushPresentationStateToServer(statePayload);
    // 3. PostMessage direct vers la pop-up
    try {
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.postMessage({
          type: 'MELOBOOK_PRESENTATION_UPDATE',
          state: statePayload
        }, '*');
      }
    } catch {}
  }, [isBilingualMode, secondarySong, bilingualFormat, autoLayout]);

  // Synchronisation continue dès que le chant, la slide, l'échelle, le fond, le décompte, le live biblique ou le média change
  useEffect(() => {
    broadcastCurrentState(
      currentQueueItem,
      currentSong, 
      activeSlideIndex, 
      isBlackout, 
      fontScale, 
      backgroundImage, 
      backgroundOverlay, 
      countdownActive, 
      countdownTime, 
      countdownTitle, 
      countdownThemeId,
      liveDirectBible,
      liveDirectSecondaryBible,
      liveDirectBibleFormat,
      liveDirectSlideIndex,
      liveDirectMedia,
      activePupitreTab
    );
  }, [
    currentQueueItem,
    currentSong, 
    activeSlideIndex, 
    isBlackout, 
    fontScale, 
    backgroundImage, 
    backgroundOverlay, 
    countdownActive, 
    countdownTime, 
    countdownTitle, 
    countdownThemeId,
    liveDirectBible,
    liveDirectSecondaryBible,
    liveDirectBibleFormat,
    liveDirectSlideIndex,
    liveDirectMedia,
    activePupitreTab,
    isBilingualMode,
    secondarySong,
    bilingualFormat,
    autoLayout,
    broadcastCurrentState
  ]);

  // Écoute des messages venant de la pop-up
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'MELOBOOK_PRESENTATION_READY' || e.data?.type === 'REQUEST_SYNC') {
        if (e.source) {
          popupRef.current = e.source as Window;
        }
        broadcastCurrentState(
          currentQueueItem,
          currentSong, 
          activeSlideIndex, 
          isBlackout, 
          fontScale, 
          backgroundImage, 
          backgroundOverlay, 
          countdownActive, 
          countdownTime, 
          countdownTitle, 
          countdownThemeId,
          liveDirectBible,
          liveDirectSecondaryBible,
          liveDirectBibleFormat,
          liveDirectSlideIndex,
          liveDirectMedia,
          activePupitreTab
        );
      } else if (e.data?.type === 'MELOBOOK_PRESENTATION_NAV') {
        if (typeof e.data.slideIndex === 'number') {
          if (liveDirectBible) {
            setLiveDirectSlideIndex(e.data.slideIndex);
          } else {
            setActiveSlideIndex(e.data.slideIndex);
          }
        }
        if (typeof e.data.isBlackout === 'boolean') {
          setIsBlackout(e.data.isBlackout);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [currentQueueItem, currentSong, activeSlideIndex, isBlackout, fontScale, backgroundImage, backgroundOverlay, countdownActive, countdownTime, countdownTitle, countdownThemeId, liveDirectBible, liveDirectSecondaryBible, liveDirectBibleFormat, liveDirectSlideIndex, liveDirectMedia, activePupitreTab, broadcastCurrentState]);

  // Raccourcis clavier pour naviguer dans la régie
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)) return;

      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        setIsBlackout(prev => !prev);
      } else if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') {
        e.preventDefault();
        handleAdjustFontScale(0.1);
      } else if (e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract') {
        e.preventDefault();
        handleAdjustFontScale(-0.1);
      } else if (e.key === '0' || e.code === 'Numpad0') {
        e.preventDefault();
        handleResetFontScale();
      } else if (['ArrowRight', ' ', 'PageDown', 'ArrowDown'].includes(e.key)) {
        if (activePupitreTab === 'bible' || activePupitreTab === 'media') return;
        e.preventDefault();
        goToNextSlide();
      } else if (['ArrowLeft', 'PageUp', 'ArrowUp'].includes(e.key)) {
        if (activePupitreTab === 'bible' || activePupitreTab === 'media') return;
        e.preventDefault();
        goToPrevSlide();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Navigation dans les slides (gère à la fois le direct biblique et la file)
  const goToNextSlide = () => {
    if (liveDirectBible) {
      if (liveDirectSlideIndex < liveDirectSlides.length - 1) {
        setLiveDirectSlideIndex(i => i + 1);
      }
      return;
    }
    if (activeSlideIndex < currentSlides.length - 1) {
      setActiveSlideIndex(i => i + 1);
    } else if (activeSongIndex < queueItems.length - 1) {
      // Passer au chant / élément suivant
      setActiveSongIndex(i => i + 1);
      setActiveSlideIndex(0);
    }
  };

  const goToPrevSlide = () => {
    if (liveDirectBible) {
      if (liveDirectSlideIndex > 0) {
        setLiveDirectSlideIndex(i => i - 1);
      }
      return;
    }
    if (activeSlideIndex > 0) {
      setActiveSlideIndex(i => i - 1);
    } else if (activeSongIndex > 0) {
      const prevIdx = activeSongIndex - 1;
      const prevItem = queueItems[prevIdx];
      let prevSlidesCount = 1;
      if (prevItem.type === 'bible' && prevItem.bibleData) {
        prevSlidesCount = prevItem.secondaryBibleData
          ? buildBilingualBiblePresentationSlides(
              prevItem.bibleData,
              prevItem.secondaryBibleData,
              prevItem.bilingualBibleFormat || 'stacked'
            ).length
          : buildBiblePresentationSlides(prevItem.bibleData).length;
      } else if (prevItem.songId) {
        const prevSong = songs.find(s => s.id === prevItem.songId);
        if (prevSong) {
          prevSlidesCount = buildPresentationSlides(
            prevSong.contentChordPro || prevSong.content || '',
            prevSong.title,
            undefined,
            { autoLayout }
          ).length;
        }
      }
      setActiveSongIndex(prevIdx);
      setActiveSlideIndex(Math.max(0, prevSlidesCount - 1));
    }
  };

  // Actions Bibliques pour le Module
  const handleProjectLiveBible = useCallback((
    passage: BiblePassageData,
    secondaryPassage?: BiblePassageData | null,
    format?: 'stacked' | 'columns'
  ) => {
    const chosenFormat = format || 'stacked';
    const chosenSecondary = secondaryPassage || null;
    setLiveDirectBible(passage);
    setLiveDirectSecondaryBible(chosenSecondary);
    setLiveDirectBibleFormat(chosenFormat);
    setLiveDirectSlideIndex(0);
    setIsBlackout(false);
    broadcastCurrentState(
      currentQueueItem,
      currentSong,
      activeSlideIndex,
      false,
      fontScale,
      backgroundImage,
      backgroundOverlay,
      countdownActive,
      countdownTime,
      countdownTitle,
      countdownThemeId,
      passage,
      chosenSecondary,
      chosenFormat,
      0,
      liveDirectMedia,
      'bible'
    );
    showNotification?.({
      title: secondaryPassage ? 'Passage biblique bilingue en direct' : 'Passage biblique diffusé en direct',
      message: secondaryPassage 
        ? `${passage.referenceText} (${passage.version} • ${secondaryPassage.version}) est à l'écran`
        : `${passage.referenceText} (${passage.version}) est à l'écran`,
      type: 'info'
    });
  }, [
    currentQueueItem,
    currentSong,
    activeSlideIndex,
    fontScale,
    backgroundImage,
    backgroundOverlay,
    countdownActive,
    countdownTime,
    countdownTitle,
    countdownThemeId,
    liveDirectMedia,
    broadcastCurrentState,
    showNotification
  ]);

  const handleStopLiveBible = useCallback(() => {
    setLiveDirectBible(null);
    setLiveDirectSecondaryBible(null);
    setLiveDirectSlideIndex(0);
    broadcastCurrentState(
      currentQueueItem,
      currentSong,
      activeSlideIndex,
      isBlackout,
      fontScale,
      backgroundImage,
      backgroundOverlay,
      countdownActive,
      countdownTime,
      countdownTitle,
      countdownThemeId,
      null,
      null,
      'stacked',
      0,
      liveDirectMedia,
      activePupitreTab
    );
    showNotification?.({
      title: 'Diffusion biblique terminée',
      message: 'Retour au pupitre',
      type: 'info'
    });
  }, [
    currentQueueItem,
    currentSong,
    activeSlideIndex,
    isBlackout,
    fontScale,
    backgroundImage,
    backgroundOverlay,
    countdownActive,
    countdownTime,
    countdownTitle,
    countdownThemeId,
    liveDirectMedia,
    activePupitreTab,
    broadcastCurrentState,
    showNotification
  ]);

  const handleNextLiveVerse = useCallback(() => {
    if (liveDirectBible && liveDirectSlideIndex < liveDirectSlides.length - 1) {
      setLiveDirectSlideIndex(i => i + 1);
    }
  }, [liveDirectBible, liveDirectSlideIndex, liveDirectSlides.length]);

  const handlePrevLiveVerse = useCallback(() => {
    if (liveDirectBible && liveDirectSlideIndex > 0) {
      setLiveDirectSlideIndex(i => i - 1);
    }
  }, [liveDirectBible, liveDirectSlideIndex]);

  const handleAddBibleToQueue = useCallback((
    passage: BiblePassageData,
    secondaryPassage?: BiblePassageData | null,
    format?: 'stacked' | 'columns'
  ) => {
    const newItems: QueueItem[] = [];

    // Si le passage contient plusieurs versets sélectionnés, on ajoute chaque verset individuellement
    // pour que l'utilisateur puisse déplacer chaque verset où il le souhaite dans la file de projection !
    if (passage.verses && passage.verses.length > 1) {
      passage.verses.forEach((v) => {
        const singleVersePassage: BiblePassageData = {
          bookId: passage.bookId,
          bookName: passage.bookName,
          chapter: passage.chapter,
          verseStart: v.verseNumber,
          verseEnd: v.verseNumber,
          version: passage.version,
          referenceText: `${passage.bookName} ${passage.chapter}:${v.verseNumber}`,
          text: `${v.verseNumber}. ${v.text}`,
          verses: [v]
        };

        let singleSecondaryPassage: BiblePassageData | undefined = undefined;
        if (secondaryPassage) {
          const secV = secondaryPassage.verses.find(sv => sv.verseNumber === v.verseNumber);
          singleSecondaryPassage = {
            bookId: secondaryPassage.bookId,
            bookName: secondaryPassage.bookName,
            chapter: secondaryPassage.chapter,
            verseStart: v.verseNumber,
            verseEnd: v.verseNumber,
            version: secondaryPassage.version,
            referenceText: `${secondaryPassage.bookName} ${secondaryPassage.chapter}:${v.verseNumber}`,
            text: secV ? `${v.verseNumber}. ${secV.text}` : '',
            verses: secV ? [secV] : []
          };
        }

        newItems.push({
          uid: `bible_${passage.bookId}_${passage.chapter}_${v.verseNumber}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          type: 'bible',
          bibleData: singleVersePassage,
          secondaryBibleData: singleSecondaryPassage,
          bilingualBibleFormat: format || 'stacked',
          setlistName: 'Passages bibliques'
        });
      });
    } else {
      newItems.push({
        uid: `bible_${passage.bookId}_${passage.chapter}_${passage.verseStart}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: 'bible',
        bibleData: passage,
        secondaryBibleData: secondaryPassage || undefined,
        bilingualBibleFormat: format || 'stacked',
        setlistName: 'Passages bibliques'
      });
    }

    setQueueItems(prev => {
      const next = [...prev, ...newItems];
      if (prev.length === 0) {
        setActiveSongIndex(0);
        setActiveSlideIndex(0);
      }
      return next;
    });

    showNotification?.({
      title: newItems.length > 1 ? `${newItems.length} versets ajoutés à la file` : 'Verset ajouté à la file',
      message: secondaryPassage
        ? `${passage.referenceText} (${passage.version} • ${secondaryPassage.version}) ajouté en mode bilingue.`
        : (newItems.length > 1 
          ? `${newItems.length} éléments individuels ajoutés. Vous pouvez les déplacer librement dans la file.`
          : `${passage.referenceText} (${passage.version}) ajouté comme élément individuel repositionnable.`),
      type: 'success'
    });
  }, [showNotification]);

  // Actions Média pour le Module Média
  const handleProjectMedia = useCallback((media: MediaPresentationState) => {
    setLiveDirectMedia(media);
    setIsBlackout(false);
    try { localStorage.setItem('presentation_media_active', JSON.stringify(media)); } catch {}
    showNotification?.({
      title: 'Média diffusé sur l\'écran',
      message: `${media.title} (${media.type.toUpperCase()})`,
      type: 'info'
    });
  }, [showNotification]);

  const handleStopMedia = useCallback(() => {
    setLiveDirectMedia(null);
    try { localStorage.removeItem('presentation_media_active'); } catch {}
    showNotification?.({
      title: 'Diffusion du média arrêtée',
      message: 'Retour à l\'affichage standard',
      type: 'info'
    });
  }, [showNotification]);

  // Ouvrir la pop-up de projection
  const handleOpenProjectionWindow = () => {
    const targetUrl = currentSong 
      ? `${window.location.origin}${window.location.pathname}?mode=presentation&songId=${encodeURIComponent(currentSong.id)}`
      : `${window.location.origin}${window.location.pathname}?mode=presentation`;

    broadcastCurrentState(
      currentQueueItem,
      currentSong, 
      activeSlideIndex, 
      isBlackout, 
      fontScale, 
      backgroundImage, 
      backgroundOverlay, 
      countdownActive, 
      countdownTime, 
      countdownTitle,
      countdownThemeId,
      liveDirectBible,
      liveDirectSecondaryBible,
      liveDirectBibleFormat,
      liveDirectSlideIndex,
      liveDirectMedia,
      activePupitreTab
    );

    const win = window.open(
      targetUrl,
      'melobook_presentation_window',
      'width=1280,height=720,menubar=no,toolbar=no,location=no'
    );
    if (win) {
      popupRef.current = win;
    }
  };

  // Ajouter une setlist entière à la file
  const handleAddSetlist = (setlistId: string) => {
    const target = setlists.find(s => s.id === setlistId);
    if (!target || !target.songIds || target.songIds.length === 0) return;

    const validSongIds = target.songIds.filter(songId => songsById.has(songId));
    if (validSongIds.length === 0) {
      showNotification?.({
        title: target.name,
        message: 'Cette setlist ne contient aucun chant disponible.',
        type: 'info'
      });
      return;
    }

    const newItems: QueueItem[] = validSongIds.map((songId, idx) => ({
      uid: `${target.id}_${songId}_${Date.now()}_${idx}`,
      songId,
      setlistName: target.name,
      setlistId: target.id
    }));

    setQueueItems(prev => {
      const next = [...prev, ...newItems];
      if (prev.length === 0) {
        setActiveSongIndex(0);
        setActiveSlideIndex(0);
      }
      return next;
    });
    setSelectedSetlistId('');
  };

  // Retirer une setlist entière de la file
  const handleRemoveSetlistFromQueue = (setlistName: string, setlistId?: string) => {
    setQueueItems(prev => {
      const next = prev.filter(item =>
        setlistId ? item.setlistId !== setlistId : item.setlistName !== setlistName
      );
      if (activeSongIndex >= next.length) {
        setActiveSongIndex(Math.max(0, next.length - 1));
        setActiveSlideIndex(0);
      }
      return next;
    });
  };

  // Liste filtrée pour le modal d'ajout de chant séparé
  const filteredModalSongs = useMemo(() => {
    const q = songModalSearch.trim();
    if (!q) return songs;
    return songs.filter(s =>
      getSongSearchScore(s, q) > 0 ||
      includesIgnoreAccents(s.title, q) ||
      includesIgnoreAccents(s.artist, q) ||
      includesIgnoreAccents(s.content, q)
    );
  }, [songs, songModalSearch]);

  // Ajouter un chant individuel séparé (hors-setlist)
  const handleAddIndividualSong = useCallback((song: Song) => {
    const newItem: QueueItem = {
      uid: `manual_${song.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'song',
      songId: song.id,
      setlistName: ''
    };
    setQueueItems(prev => {
      const next = [...prev, newItem];
      if (prev.length === 0) {
        setActiveSongIndex(0);
        setActiveSlideIndex(0);
      }
      return next;
    });
    setIsAddSongModalOpen(false);
    setSongModalSearch('');
    showNotification?.({
      title: 'Chant séparé ajouté',
      message: `"${song.title}" ajouté à la file de projection (déplaçable et retirable).`,
      type: 'success'
    });
  }, [showNotification]);

  // Retirer un chant de la file
  const handleRemoveSong = (indexToRemove: number) => {
    setQueueItems(prev => {
      const next = prev.filter((_, idx) => idx !== indexToRemove);
      if (activeSongIndex >= next.length) {
        setActiveSongIndex(Math.max(0, next.length - 1));
        setActiveSlideIndex(0);
      }
      return next;
    });
  };

  // Déplacer une setlist entière vers le haut ou vers le bas dans la file (préserve l'ordre interne des chants)
  const handleMoveSetlist = (setlistName: string, setlistId: string | undefined, direction: 'up' | 'down') => {
    const isTarget = (item: QueueItem) =>
      setlistId ? item.setlistId === setlistId : item.setlistName === setlistName;

    const startIndex = queueItems.findIndex(isTarget);
    if (startIndex === -1) return;

    let endIndex = startIndex;
    while (endIndex < queueItems.length - 1 && isTarget(queueItems[endIndex + 1])) {
      endIndex++;
    }

    const setlistSongs = queueItems.slice(startIndex, endIndex + 1);
    const count = setlistSongs.length;
    const currentUid = queueItems[activeSongIndex]?.uid;

    if (direction === 'up') {
      if (startIndex === 0) return;
      const prevIndex = startIndex - 1;
      const prevItem = queueItems[prevIndex];
      let targetInsertIndex = prevIndex;

      // Si l'élément précédent appartient à une autre setlist, remonter avant toute cette autre setlist
      if (prevItem.type !== 'bible' && (prevItem.setlistId || prevItem.setlistName)) {
        let otherStart = prevIndex;
        const isPrevSetlist = (i: QueueItem) =>
          prevItem.setlistId ? i.setlistId === prevItem.setlistId : i.setlistName === prevItem.setlistName;
        while (otherStart > 0 && isPrevSetlist(queueItems[otherStart - 1])) {
          otherStart--;
        }
        targetInsertIndex = otherStart;
      }

      setQueueItems(prev => {
        const remaining = prev.filter((_, i) => i < startIndex || i > endIndex);
        remaining.splice(targetInsertIndex, 0, ...setlistSongs);
        const newActive = remaining.findIndex(i => i.uid === currentUid);
        if (newActive !== -1) setActiveSongIndex(newActive);
        return remaining;
      });
    } else {
      if (endIndex >= queueItems.length - 1) return;
      const nextIndex = endIndex + 1;
      const nextItem = queueItems[nextIndex];
      let targetInsertAfterIndex = nextIndex;

      // Si l'élément suivant appartient à une autre setlist, descendre après toute cette autre setlist
      if (nextItem.type !== 'bible' && (nextItem.setlistId || nextItem.setlistName)) {
        let otherEnd = nextIndex;
        const isNextSetlist = (i: QueueItem) =>
          nextItem.setlistId ? i.setlistId === nextItem.setlistId : i.setlistName === nextItem.setlistName;
        while (otherEnd < queueItems.length - 1 && isNextSetlist(queueItems[otherEnd + 1])) {
          otherEnd++;
        }
        targetInsertAfterIndex = otherEnd;
      }

      setQueueItems(prev => {
        const remaining = prev.filter((_, i) => i < startIndex || i > endIndex);
        const insertAt = targetInsertAfterIndex - count + 1;
        remaining.splice(insertAt, 0, ...setlistSongs);
        const newActive = remaining.findIndex(i => i.uid === currentUid);
        if (newActive !== -1) setActiveSongIndex(newActive);
        return remaining;
      });
    }
  };

  // Déplacer un élément individuel (ex: verset biblique) dans la file
  const handleMoveSong = (index: number, direction: 'up' | 'down') => {
    const currentUid = queueItems[activeSongIndex]?.uid;
    const item = queueItems[index];
    if (!item) return;

    if (direction === 'up') {
      if (index <= 0) return;
      const prevIndex = index - 1;
      const prevItem = queueItems[prevIndex];
      let targetIndex = prevIndex;

      // Si l'élément précédent appartient à une setlist, sauter par-dessus toute la setlist pour ne pas la diviser
      if (prevItem.type !== 'bible' && (prevItem.setlistId || prevItem.setlistName)) {
        let otherStart = prevIndex;
        const isSetlist = (i: QueueItem) =>
          prevItem.setlistId ? i.setlistId === prevItem.setlistId : i.setlistName === prevItem.setlistName;
        while (otherStart > 0 && isSetlist(queueItems[otherStart - 1])) {
          otherStart--;
        }
        targetIndex = otherStart;
      }

      setQueueItems(prev => {
        const next = [...prev];
        const [moved] = next.splice(index, 1);
        next.splice(targetIndex, 0, moved);
        const newActive = next.findIndex(i => i.uid === currentUid);
        if (newActive !== -1) setActiveSongIndex(newActive);
        return next;
      });
    } else {
      if (index >= queueItems.length - 1) return;
      const nextIndex = index + 1;
      const nextItem = queueItems[nextIndex];
      let targetIndex = nextIndex;

      // Si l'élément suivant appartient à une setlist, sauter après toute la setlist pour ne pas la diviser
      if (nextItem.type !== 'bible' && (nextItem.setlistId || nextItem.setlistName)) {
        let otherEnd = nextIndex;
        const isSetlist = (i: QueueItem) =>
          nextItem.setlistId ? i.setlistId === nextItem.setlistId : i.setlistName === nextItem.setlistName;
        while (otherEnd < queueItems.length - 1 && isSetlist(queueItems[otherEnd + 1])) {
          otherEnd++;
        }
        targetIndex = otherEnd;
      }

      setQueueItems(prev => {
        const next = [...prev];
        const [moved] = next.splice(index, 1);
        next.splice(targetIndex, 0, moved);
        const newActive = next.findIndex(i => i.uid === currentUid);
        if (newActive !== -1) setActiveSongIndex(newActive);
        return next;
      });
    }
  };

  // Support du glisser-déposer (Drag & Drop) pour les versets individuels et les setlists entières
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggedSetlistKey, setDraggedSetlistKey] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedIndex(index);
  };

  const handleSetlistDragStart = (e: React.DragEvent, setlistName: string, setlistId?: string) => {
    const key = setlistId || setlistName;
    e.dataTransfer.setData('text/plain', `setlist:${key}`);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedSetlistKey(key);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    const rawData = e.dataTransfer.getData('text/plain');
    setDraggedIndex(null);
    setDraggedSetlistKey(null);

    if (!rawData) return;

    const currentUid = queueItems[activeSongIndex]?.uid;

    if (rawData.startsWith('setlist:')) {
      const draggedKey = rawData.replace('setlist:', '');
      const isTarget = (item: QueueItem) =>
        (item.setlistId || item.setlistName) === draggedKey;

      const startIndex = queueItems.findIndex(isTarget);
      if (startIndex === -1) return;

      let endIndex = startIndex;
      while (endIndex < queueItems.length - 1 && isTarget(queueItems[endIndex + 1])) {
        endIndex++;
      }

      const setlistSongs = queueItems.slice(startIndex, endIndex + 1);

      setQueueItems(prev => {
        const remaining = prev.filter((_, i) => i < startIndex || i > endIndex);
        const adjustedTarget = targetIndex > startIndex 
          ? Math.max(0, targetIndex - setlistSongs.length)
          : targetIndex;
        remaining.splice(adjustedTarget, 0, ...setlistSongs);
        const newActive = remaining.findIndex(i => i.uid === currentUid);
        if (newActive !== -1) setActiveSongIndex(newActive);
        return remaining;
      });
      return;
    }

    // Déplacement d'un élément individuel (ex: verset biblique)
    const sourceIndex = parseInt(rawData, 10);
    if (isNaN(sourceIndex) || sourceIndex === targetIndex) return;

    setQueueItems(prev => {
      const next = [...prev];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      const newActive = next.findIndex(i => i.uid === currentUid);
      if (newActive !== -1) setActiveSongIndex(newActive);
      return next;
    });
  };

  const cdRemaining = Math.max(0, getTargetTimestampFromTime(countdownTime) - regieNow);
  const cdInfo = formatRemainingTime(cdRemaining);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 pb-12 text-[#E0E0E0] min-h-[calc(100vh-64px)]">
      
      {/* 1. Barre d'en-tête de régie */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2 sm:gap-2.5">
            <Tv className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 shrink-0" />
            <span>Mode Projection</span>
          </h1>
        </div>

        {/* Bouton d'action d'ouverture de l'écran externe */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleOpenProjectionWindow}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition-all active:scale-95 whitespace-nowrap cursor-pointer"
            title="Ouvrir la fenêtre d'affichage pour l'écran externe"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Ouvrir l'écran de projection</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </button>
        </div>
      </div>

      {/* 2. Corps principal : 2/3 Choix des slides + 1/3 (Moniteur en direct & File de projection) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Module Actif : Pupitre (Chants) OU Bible OU Média (pleine largeur) */}
        <div className="col-span-1 lg:col-span-8 w-full flex flex-col gap-4">
          <div className="bg-[#121215] border border-[#222226] rounded-2xl p-4 sm:p-5 shadow-md space-y-4 w-full">
            {/* En-tête harmonisé avec sélecteur de modules et actions contextuelles */}
            <div className="flex items-center justify-between flex-wrap gap-2.5 pb-2.5 border-b border-[#202028]">
              <div className="flex items-center gap-3 flex-wrap">
                {/* Onglets sélecteurs de modules (Pupitre, Bible, Média) */}
                <div className="flex items-center gap-1 bg-[#16161D] p-1 border border-[#262632] rounded-xl shadow-inner">
                  <button
                    type="button"
                    onClick={() => setActivePupitreTab('songs')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      activePupitreTab === 'songs'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30 ring-1 ring-blue-400/40'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-[#20202A]'
                    }`}
                  >
                    <Music className="w-3.5 h-3.5" />
                    <span>Pupitre</span>
                    {visibleQueueCount > 0 && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-black/40 text-blue-200">
                        {visibleQueueCount}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivePupitreTab('bible')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      activePupitreTab === 'bible'
                        ? 'bg-amber-600 text-white shadow-md shadow-amber-900/30 ring-1 ring-amber-400/40'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-[#20202A]'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                    <span>Bible</span>
                    {liveDirectBible && (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-400 text-black uppercase animate-pulse">
                        En direct
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivePupitreTab('media')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      activePupitreTab === 'media'
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30 ring-1 ring-purple-400/40'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-[#20202A]'
                    }`}
                  >
                    <Film className="w-3.5 h-3.5 text-purple-400" />
                    <span>Média</span>
                    {liveDirectMedia?.isActive && (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-purple-400 text-black uppercase animate-pulse">
                        En direct
                      </span>
                    )}
                  </button>
                </div>

                {/* Info contextuelle module Pupitre */}
                {activePupitreTab === 'songs' && (
                  <div className="hidden md:flex items-center gap-2 pl-2 border-l border-[#242430] text-xs text-gray-400 font-medium">
                    {currentQueueItem?.type === 'bible' && currentQueueItem.bibleData ? (
                      <span className="flex items-center gap-1.5 text-amber-300">
                        <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                        <span>Verset : {currentQueueItem.bibleData.referenceText} ({currentSlides.length})</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-gray-300">
                        <Music className="w-3.5 h-3.5 text-blue-400" />
                        <span>Slides ({currentSlides.length})</span>
                        {isBilingualMode && secondarySong && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                            Bilingue {getLanguageMeta(currentSong?.language).code} + {getLanguageMeta(secondarySong.language).code}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Actions Pupitre à droite */}
              {activePupitreTab === 'songs' && (
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Sélecteur et chargement de setlist déplacé dans le Pupitre */}
                  <div className="flex items-center gap-1.5" ref={setlistDropdownRef}>
                    {(() => {
                      const selectedSetlistObject = setlists.find(st => st.id === selectedSetlistId);
                      return (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setIsSetlistDropdownOpen(prev => !prev)}
                            className={`flex items-center justify-between gap-2 bg-[#16161D] hover:bg-[#1C1C24] border rounded-xl pl-3 pr-2.5 py-1.5 text-xs font-medium transition-all duration-150 cursor-pointer shadow-inner min-w-[170px] sm:min-w-[210px] ${
                              isSetlistDropdownOpen
                                ? 'border-blue-500 ring-2 ring-blue-500/25 text-white'
                                : selectedSetlistObject
                                ? 'border-[#333342] text-white'
                                : 'border-[#2D2D3A] text-gray-400 hover:text-gray-300'
                            }`}
                          >
                            <span className="truncate flex items-center gap-1.5">
                              <ListMusic className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              <span className="truncate">
                                {selectedSetlistObject ? selectedSetlistObject.name : '-- Choisir une setlist --'}
                              </span>
                            </span>
                            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform shrink-0 ml-1 ${isSetlistDropdownOpen ? 'rotate-180 text-blue-400' : ''}`} />
                          </button>

                          {isSetlistDropdownOpen && (
                            <div className="absolute left-0 top-full mt-1.5 bg-[#14141A] border border-[#2B2B38] rounded-xl shadow-2xl p-2 z-50 w-72 sm:w-80 max-w-[calc(100vw-2.5rem)] max-h-80 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-1">
                              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 py-0.5">
                                Choisir une setlist
                              </div>

                              <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar pr-0.5">
                                {setlists.length === 0 ? (
                                  <div className="px-3 py-4 text-center text-xs text-gray-500">
                                    Aucune setlist disponible
                                  </div>
                                ) : (
                                  setlists.map((st) => {
                                    const isSelected = selectedSetlistId === st.id;
                                    return (
                                      <div
                                        key={st.id}
                                        onClick={() => setSelectedSetlistId(st.id)}
                                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer group border ${
                                          isSelected
                                            ? 'bg-blue-600/20 text-blue-200 border-blue-500/40'
                                            : 'text-gray-200 hover:bg-[#1E1E28] hover:text-white border-transparent'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2 min-w-0 pr-1 flex-1">
                                          <ListMusic className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-300' : 'text-blue-400'}`} />
                                          <span className="truncate font-medium">{st.name}</span>
                                          <span className="text-[10px] text-gray-500 font-mono shrink-0">
                                            ({(st.songIds || []).filter(id => songsById.has(id)).length})
                                          </span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedSetlistId(st.id);
                                            handleAddSetlist(st.id);
                                            setIsSetlistDropdownOpen(false);
                                          }}
                                          className="px-2 py-1 rounded-md bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-[11px] font-bold transition-all shrink-0 flex items-center gap-1 shadow-xs cursor-pointer"
                                          title={`Ajouter les chants de « ${st.name} » à la file`}
                                        >
                                          <Plus className="w-3 h-3" />
                                          <span>Ajouter</span>
                                        </button>
                                      </div>
                                    );
                                  })
                                )}
                              </div>

                              {/* Bouton Ajouter intégré directement dans la dropdown */}
                              <div className="pt-2 border-t border-[#22222E] mt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (selectedSetlistId) {
                                      handleAddSetlist(selectedSetlistId);
                                      setIsSetlistDropdownOpen(false);
                                    }
                                  }}
                                  disabled={!selectedSetlistId}
                                  className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all shadow-md shadow-blue-900/25 flex items-center justify-center gap-1.5"
                                  title="Ajouter tous les chants de cette setlist à la file de projection"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Ajouter la setlist à la file</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    <button
                      type="button"
                      onClick={() => {
                        setSongModalSearch('');
                        setIsAddSongModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/40 hover:border-emerald-500/60 text-emerald-300 hover:text-emerald-200 text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 shrink-0 active:scale-95 shadow-xs"
                      title="Ajouter un chant individuel (hors-liste) à la file de projection"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Chant libre</span>
                    </button>
                  </div>

                  {/* Contrôles Mode Bilingue & Traduction IA (uniquement pour les chants) */}
                  {currentSong && currentQueueItem?.type !== 'bible' && (
                    <div className="flex items-center gap-2 flex-wrap pl-2 border-l border-[#202028]">
                      {/* Bouton Traduction IA (pour traduire automatiquement un chant sans version liée ou générer/revoir une traduction) */}
                      <button
                        type="button"
                        onClick={() => {
                          setAiTranslateInitialEdit(false);
                          setIsAiTranslateModalOpen(true);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                          availableLinkedVersions.length === 0
                            ? 'bg-gradient-to-r from-cyan-600/25 to-indigo-600/25 hover:from-cyan-600/40 hover:to-indigo-600/40 text-cyan-200 border-cyan-500/50 shadow-xs'
                            : 'bg-[#181822] hover:bg-cyan-950/30 text-cyan-300 border-cyan-500/30'
                        }`}
                        title={
                          availableLinkedVersions.length === 0
                            ? "Traduire automatiquement les paroles par IA (tokens gratuits)"
                            : "Traduire ce chant par IA dans une autre langue"
                        }
                      >
                        <Languages className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Traduire IA</span>
                        {activeAiTranslation && (
                          <span className="text-[9px] font-mono px-1 rounded bg-cyan-500/25 text-cyan-200">
                            {getLanguageMeta(activeAiTranslation.targetLanguage).code}
                          </span>
                        )}
                      </button>

                      {/* Bouton Mode Édition manuelle de la traduction */}
                      {(activeAiTranslation || (isBilingualMode && secondarySong)) && (
                        <button
                          type="button"
                          onClick={() => {
                            setAiTranslateInitialEdit(true);
                            setIsAiTranslateModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border bg-amber-600/15 hover:bg-amber-600/30 text-amber-200 border-amber-500/40"
                          title="Éditer manuellement la traduction des paroles"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                          <span>Éditer trad.</span>
                        </button>
                      )}

                      {/* Bouton Mise en page automatique équilibrée */}
                      <button
                        type="button"
                        onClick={handleToggleAutoLayout}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                          autoLayout
                            ? 'bg-emerald-600/25 border-emerald-500/50 text-emerald-200 shadow-xs'
                            : 'bg-[#181822] hover:bg-emerald-950/30 text-gray-300 border-[#2D2D3A]'
                        }`}
                        title={
                          autoLayout
                            ? 'Mise en page auto active : divise les paroles en slides équilibrées selon la longueur du chant'
                            : 'Activer la mise en page automatique équilibrée'
                        }
                      >
                        <LayoutGrid className={`w-3.5 h-3.5 ${autoLayout ? 'text-emerald-400' : 'text-gray-400'}`} />
                        <span>Mise en page auto</span>
                      </button>

                      {/* Bouton Toggle Bilingue */}
                      <button
                        type="button"
                        onClick={handleToggleBilingualMode}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                          isBilingualMode
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-xs ring-1 ring-indigo-400/50'
                            : 'bg-[#181822] hover:bg-indigo-950/30 text-indigo-300 border-indigo-500/30'
                        }`}
                        title={isBilingualMode ? "Désactiver le mode bilingue" : "Activer la projection bilingue (original + traduction)"}
                      >
                        <Columns className="w-3.5 h-3.5" />
                        <span>Bilingue</span>
                        {isBilingualMode && (
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        )}
                      </button>

                      {/* Options quand bilingue est actif */}
                      {isBilingualMode && (
                        <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-100">
                          {/* Sélecteur de version traduite */}
                          {(availableLinkedVersions.length > 0 || activeAiTranslation) ? (
                            <div className="relative">
                              <select
                                value={secondarySong?.id || ''}
                                onChange={(e) => setSelectedSecondarySongId(e.target.value)}
                                className="bg-[#181824] border border-indigo-500/40 rounded-lg px-2.5 py-1 text-xs text-indigo-200 cursor-pointer focus:outline-none focus:border-indigo-400 font-medium appearance-none pr-6"
                                title="Changer la version traduite à projeter"
                              >
                                {availableLinkedVersions.map((lv) => {
                                  const lMeta = getLanguageMeta(lv.language);
                                  return (
                                    <option key={lv.id} value={lv.id} className="bg-[#141418] text-white">
                                      {lMeta.code} • {lv.title}
                                    </option>
                                  );
                                })}
                                {activeAiTranslation && (
                                  <option value={`ai_${currentSong.id}`} className="bg-[#141418] text-cyan-200">
                                    IA ({getLanguageMeta(activeAiTranslation.targetLanguage).code}) • {activeAiTranslation.translatedTitle}
                                  </option>
                                )}
                              </select>
                              <ChevronDown className="w-3 h-3 text-indigo-400 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setShowBilingualModal(true)}
                              className="px-2 py-1 rounded-lg bg-indigo-950/50 hover:bg-indigo-900/50 border border-indigo-500/40 text-[11px] font-medium text-indigo-300 flex items-center gap-1 cursor-pointer"
                              title="Lier ou choisir une version traduite"
                            >
                              <Globe className="w-3 h-3 text-indigo-400" />
                              <span>{secondarySong ? `${getLanguageMeta(secondarySong.language).code} • ${secondarySong.title}` : 'Lier une traduction'}</span>
                            </button>
                          )}

                          {/* Bouton pour ouvrir la recherche dans tout le répertoire */}
                          <button
                            type="button"
                            onClick={() => setShowBilingualModal(true)}
                            className="p-1 rounded-lg bg-[#181824] hover:bg-[#202030] text-indigo-300 border border-indigo-500/40 transition-colors cursor-pointer"
                            title="Lier un autre chant du répertoire pour la projection bilingue"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>

                          {/* Choix du format : Sous-titres intercalés OU 2 Colonnes */}
                          <div className="flex items-center rounded-lg bg-[#16161E] border border-[#2B2B38] p-0.5 text-[11px]">
                            <button
                              type="button"
                              onClick={() => handleSetBilingualFormat('stacked')}
                              className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                                bilingualFormat === 'stacked'
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'text-gray-400 hover:text-white'
                              }`}
                              title="Sous-titres : paroles originales en grand, traduction sous chaque ligne"
                            >
                              Sous-titres
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetBilingualFormat('columns')}
                              className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                                bilingualFormat === 'columns'
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'text-gray-400 hover:text-white'
                              }`}
                              title="2 Colonnes : original à gauche, traduction à droite"
                            >
                              2 Colonnes
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Corps du module actif : Bible OU Média OU Grille de slides */}
            {activePupitreTab === 'bible' ? (
              <BibleProjectionModule
                onProjectLive={handleProjectLiveBible}
                onAddToQueue={handleAddBibleToQueue}
                activeLiveBibleRef={liveDirectBible ? (liveDirectSecondaryBible ? `${liveDirectBible.referenceText} (${liveDirectBible.version} • ${liveDirectSecondaryBible.version})` : `${liveDirectBible.referenceText} (${liveDirectBible.version})`) : null}
                onStopLive={handleStopLiveBible}
                onNextLiveVerse={handleNextLiveVerse}
                onPrevLiveVerse={handlePrevLiveVerse}
                className="bg-transparent border-0 p-0 shadow-none"
              />
            ) : activePupitreTab === 'media' ? (
              <MediaProjectionModule
                activeMedia={liveDirectMedia}
                onProjectMedia={handleProjectMedia}
                onStopMedia={handleStopMedia}
                className="bg-transparent border-0 p-0 shadow-none"
              />
            ) : (
              currentSlides.length === 0 ? (
                <div className="text-center py-10 text-gray-600 text-xs">
                  Sélectionnez un élément dans la file pour afficher ses sections.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
                  {currentSlides.map((slide, sIdx) => {
                    const isCurrent = sIdx === clampedSlideIndex;
                    const isBibleSlide = slide.itemType === 'bible';

                    return (
                      <button
                        key={slide.id || sIdx}
                        type="button"
                        onClick={() => {
                          if (liveDirectBible) {
                            setLiveDirectSlideIndex(sIdx);
                          } else {
                            setActiveSlideIndex(sIdx);
                          }
                          setIsBlackout(false);
                        }}
                        className={`text-left p-3.5 rounded-xl border flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group ${
                          isCurrent
                            ? isBibleSlide
                              ? 'bg-amber-950/50 border-amber-400 ring-2 ring-amber-500/40 text-white shadow-lg shadow-amber-950/50'
                              : 'bg-blue-950/50 border-blue-400 ring-2 ring-blue-500/40 text-white shadow-lg shadow-blue-950/50'
                            : 'bg-[#16161B] hover:bg-[#1E1E24] border-[#2A2A33] text-gray-300 hover:text-white'
                        }`}
                      >
                        {/* En-tête de la slide card */}
                        <div className="flex items-center justify-between w-full mb-2">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isCurrent 
                              ? isBibleSlide ? 'bg-amber-500 text-black font-extrabold' : 'bg-blue-600 text-white' 
                              : 'bg-[#22222A] text-gray-400 group-hover:text-blue-300'
                          }`}>
                            {slide.sectionTitle || `Slide ${sIdx + 1}`}
                          </span>
                          <span className="text-[10px] font-mono text-gray-500">
                            #{sIdx + 1}
                          </span>
                        </div>

                        {/* Lignes de paroles ou verset */}
                        <div className="space-y-0.5 flex-1">
                          {slide.lines.slice(0, 2).map((line, lIdx) => (
                            <p key={lIdx} className="text-xs leading-snug line-clamp-1 opacity-90 font-medium">
                              {line}
                            </p>
                          ))}
                          {slide.isBilingual && slide.secondaryLines && slide.secondaryLines.length > 0 && (
                            <div className="pt-1 border-t border-indigo-500/20 mt-1 space-y-0.5">
                              {slide.secondaryLines.slice(0, 2).map((sLine, slIdx) => (
                                <p key={slIdx} className="text-[11px] leading-snug line-clamp-1 text-cyan-300 italic opacity-85">
                                  {sLine}
                                </p>
                              ))}
                            </div>
                          )}
                          {!slide.isBilingual && slide.lines.length > 2 && (
                            <p className="text-[10px] text-gray-500 italic">+{slide.lines.length - 2} ligne(s)</p>
                          )}
                        </div>

                        {isCurrent && (
                          <div className="absolute top-1 right-1">
                            <span className="flex h-2 w-2 relative">
                              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isBibleSlide ? 'bg-amber-400' : 'bg-blue-400'}`} />
                              <span className={`relative inline-flex rounded-full h-2 w-2 ${isBibleSlide ? 'bg-amber-500' : 'bg-blue-500'}`} />
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )
            )}
                    </div>
        </div>

        {/* Colonne 1/3 (4 cols) : Aperçu en direct & File de projection */}
        <div className="col-span-1 lg:col-span-4 flex flex-col gap-4">
          <div className="bg-[#121215] border border-[#222226] rounded-2xl p-4 sm:p-5 shadow-md flex flex-col gap-4">
            
            {/* Barre de navigation et contrôles rapides */}
            <div className="flex items-center justify-between gap-1.5 sm:gap-2 border-b border-[#202026] pb-3">
              {/* Outils d'affichage & projection (Blackout, Décompte, Police, Fond) */}
              <div className="flex items-center gap-1 bg-[#16161D] p-1 rounded-xl border border-[#262632] shrink-0">
                <button
                  type="button"
                  onClick={() => setIsBlackout(b => !b)}
                  className={`w-8 h-8 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                    isBlackout
                      ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-xs ring-1 ring-amber-400/50'
                      : 'text-gray-400 hover:text-white hover:bg-[#22222A]'
                  }`}
                  title="Masquer ou afficher l'écran externe (Touche B)"
                >
                  <EyeOff className="w-4 h-4" />
                </button>

                {/* Module Décompte */}
                <div className="relative" ref={countdownMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsCountdownMenuOpen(v => !v)}
                    className={`w-8 h-8 rounded-lg transition-all cursor-pointer flex items-center justify-center relative ${
                      countdownActive
                        ? 'bg-blue-600/30 hover:bg-blue-600/40 text-blue-300 ring-1 ring-blue-500/50'
                        : isCountdownMenuOpen
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-[#22222A]'
                    }`}
                    title={countdownActive ? `Décompte actif (${cdInfo.formatted}) - Cliquer pour gérer` : "Décompte avant événement"}
                  >
                    <Timer className={`w-4 h-4 ${countdownActive ? 'text-blue-400 animate-pulse' : ''}`} />
                    {countdownActive && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-[#121215] animate-ping" />
                    )}
                  </button>

                  {isCountdownMenuOpen && (
                    <div className="absolute left-0 top-full mt-2 w-80 sm:w-96 bg-[#14141A] border border-[#2B2B38] rounded-2xl p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-3.5 text-xs text-gray-200">
                      {/* En-tête popover */}
                      <div className="flex items-center justify-between pb-2 border-b border-[#22222E]">
                        <div className="flex items-center gap-2">
                          <Timer className={`w-4 h-4 ${countdownActive ? 'text-blue-400 animate-pulse' : 'text-gray-400'}`} />
                          <h2 className="text-xs font-bold text-gray-200 uppercase tracking-wider">
                            Décompte avant événement
                          </h2>
                        </div>
                        <div className="flex items-center gap-2">
                          {countdownActive && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 animate-pulse shrink-0">
                              Diffusé
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => setIsCountdownMenuOpen(false)}
                            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#202028] transition-colors cursor-pointer"
                            title="Fermer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Statut & Grand bouton d'action */}
                      <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                        countdownActive
                          ? 'bg-blue-950/30 border-blue-500/40 shadow-inner'
                          : 'bg-[#18181C] border-[#25252B]'
                      }`}>
                        <div className="min-w-0">
                          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                            {countdownActive ? 'Diffusion en direct' : 'Prêt à diffuser'}
                          </span>
                          <div className="flex items-baseline gap-2 mt-0.5">
                            <span className="font-mono font-black text-2xl text-white tracking-wider tabular-nums">
                              {cdInfo.formatted}
                            </span>
                            <span className="text-[11px] text-gray-400 truncate">
                              {cdInfo.isExpired ? '• Événement commencé' : `• Début prévu à ${countdownTime}`}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleToggleCountdown}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shrink-0 ${
                            countdownActive
                              ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/30 ring-1 ring-amber-400/40'
                              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/30 ring-1 ring-blue-400/40'
                          }`}
                          title={countdownActive ? 'Arrêter la projection du décompte' : 'Projeter ce décompte sur le grand écran'}
                        >
                          {countdownActive ? (
                            <>
                              <Square className="w-3.5 h-3.5 fill-current" />
                              <span>Arrêter</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Diffuser</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Sélecteur d'heure de début */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-gray-300">
                          <label htmlFor="countdown-time-input" className="text-[11px] font-semibold text-gray-400 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-blue-400" />
                            <span>Heure de début</span>
                          </label>
                          <span className="text-[10px] font-mono text-gray-500">HH:MM</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <input
                            id="countdown-time-input"
                            type="time"
                            value={countdownTime}
                            onChange={(e) => handleSetCountdownTime(e.target.value)}
                            className="flex-1 bg-[#18181E] border border-[#2B2B38] rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-blue-500 transition-colors"
                          />

                          <div className="flex items-center gap-1 shrink-0">
                            {[5, 10, 15, 30].map(mins => (
                              <button
                                key={mins}
                                type="button"
                                onClick={() => handleAddMinutes(mins)}
                                className="px-2 py-2 rounded-lg bg-[#1C1C24] hover:bg-[#252530] text-gray-300 hover:text-white border border-[#2D2D3A] text-[11px] font-medium transition-colors cursor-pointer"
                                title={`Régler l'heure à dans ${mins} minutes`}
                              >
                                +{mins}m
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Intitulé / Message affiché */}
                      <div className="space-y-1.5">
                        <label htmlFor="countdown-title-input" className="text-[11px] font-semibold text-gray-400 block">
                          Message / Intitulé affiché
                        </label>
                        <input
                          id="countdown-title-input"
                          type="text"
                          value={countdownTitle}
                          onChange={(e) => handleSetCountdownTitle(e.target.value)}
                          placeholder="Ex: Le culte commence dans"
                          className="w-full bg-[#18181E] border border-[#2B2B38] rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500 transition-colors placeholder:text-gray-600"
                        />

                        {/* Presets de messages rapides */}
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {[
                            'Le culte commence dans',
                            'Début de la célébration',
                            'Bienvenue',
                            'Début du concert'
                          ].map(preset => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => handleSetCountdownTitle(preset)}
                              className={`text-[10px] px-2 py-1 rounded-md border transition-colors cursor-pointer ${
                                countdownTitle === preset
                                  ? 'bg-blue-600/20 border-blue-500/40 text-blue-300 font-semibold'
                                  : 'bg-[#181820] border-[#262630] text-gray-400 hover:text-gray-200 hover:bg-[#202028]'
                              }`}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Bibliothèque de styles / thèmes */}
                      <div className="space-y-2 pt-2 border-t border-[#22222B]">
                        <div className="flex items-center justify-between text-gray-300">
                          <label className="text-[11px] font-semibold text-gray-400 flex items-center gap-1.5">
                            <Palette className="w-3.5 h-3.5 text-blue-400" />
                            <span>Style & Lueur ({COUNTDOWN_THEMES.length} thèmes)</span>
                          </label>
                          <span className="text-[10px] text-gray-400 font-medium">
                            {getCountdownTheme(countdownThemeId).name}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-0.5">
                          {COUNTDOWN_THEMES.map(th => {
                            const isSelected = countdownThemeId === th.id;
                            return (
                              <button
                                key={th.id}
                                type="button"
                                onClick={() => handleSelectCountdownTheme(th.id)}
                                className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                                  isSelected
                                    ? 'bg-blue-600/25 border-blue-400/80 ring-1 ring-blue-500/50 text-white shadow-xs'
                                    : 'bg-[#181820] border-[#272733] text-gray-300 hover:bg-[#20202A] hover:border-gray-600'
                                }`}
                              >
                                <span
                                  className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/30"
                                  style={{
                                    backgroundColor: th.accentHex,
                                    boxShadow: isSelected ? `0 0 10px ${th.accentHex}` : 'none'
                                  }}
                                />
                                <div className="min-w-0 flex-1">
                                  <span className="text-[11px] font-bold block truncate leading-tight">
                                    {th.name}
                                  </span>
                                  <span className="text-[9px] text-gray-500 block truncate leading-tight">
                                    {th.category}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Module Taille de texte */}
                <div className="relative" ref={fontMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsFontScaleMenuOpen(v => !v)}
                    className={`w-8 h-8 rounded-lg transition-all cursor-pointer flex items-center justify-center relative ${
                      isFontScaleMenuOpen
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-[#22222A]'
                    }`}
                    title="Ajuster la taille de la police du texte projeté (paroles, mode bilingue, Bible)"
                  >
                    <Type className="w-4 h-4" />
                    {Math.abs(fontScale - 1.0) > 0.05 && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-[#121215]" />
                    )}
                  </button>

                  {isFontScaleMenuOpen && (
                    <div className="absolute left-0 top-full mt-2 w-60 max-w-[calc(100vw-32px)] bg-[#16161E] border border-[#2B2B38] rounded-xl p-3 shadow-2xl z-50 animate-in fade-in duration-100 flex flex-col gap-2.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-gray-200">
                        <span className="flex items-center gap-1.5">
                          <Type className="w-3.5 h-3.5 text-blue-400" />
                          <span>Taille du texte</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-blue-400 font-bold">{Math.round(fontScale * 100)}%</span>
                          {Math.abs(fontScale - 1.0) > 0.02 && (
                            <button
                              type="button"
                              onClick={handleResetFontScale}
                              className="text-[10px] text-gray-400 hover:text-white p-0.5 rounded cursor-pointer transition-colors"
                              title="Réinitialiser à 100%"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-[10px] text-gray-400 leading-tight">
                        S'applique à tout le texte projeté : paroles, mode bilingue et passages bibliques.
                      </p>

                      {/* Presets rapides */}
                      <div className="grid grid-cols-3 gap-1">
                        {[
                          { label: 'Petit', val: 0.8 },
                          { label: 'Normal', val: 1.0 },
                          { label: 'Grand', val: 1.35 },
                        ].map(preset => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => handleSetFontScalePreset(preset.val)}
                            className={`py-1 text-[11px] font-semibold rounded-lg border transition-colors cursor-pointer text-center ${
                              Math.abs(fontScale - preset.val) < 0.06
                                ? 'bg-blue-600 border-blue-500 text-white'
                                : 'bg-[#1E1E28] border-[#2A2A38] text-gray-300 hover:text-white'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      {/* Stepper + Slider */}
                      <div className="flex items-center gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={() => handleAdjustFontScale(-0.1)}
                          disabled={fontScale <= 0.5}
                          className="w-7 h-7 rounded-lg bg-[#20202C] hover:bg-[#2A2A3A] disabled:opacity-30 text-gray-300 hover:text-white flex items-center justify-center border border-[#2D2D3E] cursor-pointer"
                          title="Diminuer (-)"
                        >
                          <ZoomOut className="w-3.5 h-3.5" />
                        </button>

                        <input
                          type="range"
                          min="0.5"
                          max="2.2"
                          step="0.05"
                          value={fontScale}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setFontScale(val);
                            saveFontScale(val);
                          }}
                          className="flex-1 h-1.5 bg-[#252533] rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />

                        <button
                          type="button"
                          onClick={() => handleAdjustFontScale(0.1)}
                          disabled={fontScale >= 2.2}
                          className="w-7 h-7 rounded-lg bg-[#20202C] hover:bg-[#2A2A3A] disabled:opacity-30 text-gray-300 hover:text-white flex items-center justify-center border border-[#2D2D3E] cursor-pointer"
                          title="Agrandir (+)"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bouton Arrière-plan */}
                <button
                  type="button"
                  onClick={() => setIsBackgroundModalOpen(true)}
                  className={`w-8 h-8 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                    backgroundImage
                      ? 'bg-purple-600/30 hover:bg-purple-600/40 text-purple-200 border border-purple-500/50'
                      : 'text-gray-400 hover:text-white hover:bg-[#22222A]'
                  }`}
                  title="Changer l'arrière-plan de projection"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Titre au centre (si élément actif) */}
              {(currentSong || liveDirectBible || liveDirectMedia?.isActive || (currentQueueItem?.type === 'bible' && currentQueueItem.bibleData)) ? (
                <div className="text-center min-w-0 flex-1 px-1 sm:px-2">
                  <span className="text-[11px] font-bold text-white truncate block">
                    {liveDirectMedia?.isActive
                      ? liveDirectMedia.title
                      : liveDirectBible
                      ? liveDirectBible.referenceText
                      : currentQueueItem?.type === 'bible' && currentQueueItem.bibleData
                      ? currentQueueItem.bibleData.referenceText
                      : currentSong
                      ? stripParentheses(currentSong.title)
                      : ''}
                  </span>
                  <span className="text-[9px] font-mono text-gray-400 truncate block">
                    {liveDirectBible
                      ? `Diapo ${liveDirectSlideIndex + 1}/${liveDirectSlides.length}`
                      : currentSong
                      ? `Diapo ${activeSlideIndex + 1}/${currentSlides.length}`
                      : ''}
                  </span>
                </div>
              ) : (
                <div className="flex-1" />
              )}

              {/* Navigation & Statut à droite */}
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="flex items-center gap-1 bg-[#16161D] p-1 rounded-xl border border-[#262632]">
                  <button
                    type="button"
                    onClick={goToPrevSlide}
                    disabled={liveDirectBible ? liveDirectSlideIndex === 0 : (activeSongIndex === 0 && activeSlideIndex === 0)}
                    className="w-8 h-8 rounded-lg text-gray-300 hover:text-white hover:bg-[#22222A] disabled:opacity-25 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center"
                    title="Précédent (Flèche Gauche)"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={goToNextSlide}
                    disabled={liveDirectBible ? liveDirectSlideIndex >= liveDirectSlides.length - 1 : (activeSongIndex >= queueItems.length - 1 && activeSlideIndex >= currentSlides.length - 1)}
                    className={`w-8 h-8 rounded-lg text-white disabled:opacity-25 disabled:cursor-not-allowed font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center ${
                      liveDirectBible ? 'bg-amber-600 hover:bg-amber-500' : 'bg-blue-600 hover:bg-blue-500'
                    }`}
                    title="Suivant (Flèche Droite / Espace)"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Moniteur Miniature de l'écran externe (Aperçu en direct 16:9) */}
            <div 
              className="w-full aspect-[16/9] max-h-56 sm:max-h-64 bg-black border-2 rounded-xl relative overflow-hidden flex flex-col justify-between p-4 sm:p-6 shadow-inner text-center select-none group bg-cover bg-center transition-all duration-300"
              style={{
                borderColor: liveDirectMedia?.isActive ? 'rgba(168, 85, 247, 0.7)' : liveDirectBible ? 'rgba(245, 158, 11, 0.7)' : 'rgba(59, 130, 246, 0.5)',
                backgroundImage: backgroundImage ? `url("${backgroundImage}")` : undefined
              }}
            >
              {/* Filtre sombre automatique sur le moniteur */}
              {backgroundImage && (
                <div 
                  className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-300 z-0"
                  style={{ opacity: isBlackout ? 1 : backgroundOverlay }}
                />
              )}

              <div className="text-[10px] font-mono text-gray-300 drop-shadow absolute top-2 left-3 flex items-center gap-1.5 z-10">
                <span className={`w-2 h-2 rounded-full ${isBlackout ? 'bg-amber-500' : liveDirectMedia?.isActive ? 'bg-purple-400 animate-ping' : liveDirectBible ? 'bg-amber-400 animate-ping' : countdownActive ? 'bg-blue-400 animate-pulse' : 'bg-emerald-500 animate-pulse'}`} />
                <span>
                  MONITEUR {isBlackout ? '(MASQUÉ)' : liveDirectMedia?.isActive ? '(MÉDIA EN DIRECT)' : liveDirectBible ? '(BIBLE EN DIRECT)' : countdownActive ? '(DÉCOMPTE)' : '(EN DIRECT)'}
                </span>
              </div>

              {/* Contenu projeté */}
              <div className="flex-1 flex items-center justify-center px-4 relative z-10">
                {isBlackout ? (
                  <span className="text-gray-400 text-xs font-mono drop-shadow">[ Écran masqué ]</span>
                ) : countdownActive ? (() => {
                  const activeCdTheme = getCountdownTheme(countdownThemeId);
                  return (
                    <div className="flex flex-col items-center justify-center gap-1.5 animate-presentation-slide text-center">
                      <span className={`text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full ${activeCdTheme.badgeBg} border ${activeCdTheme.badgeBorder} ${activeCdTheme.badgeText}`}>
                        {countdownTitle || "Le culte commence dans"}
                      </span>
                      <span 
                        className={`font-mono font-black text-3xl sm:text-4xl tracking-wider drop-shadow tabular-nums ${activeCdTheme.textColor}`}
                        style={{ 
                          textShadow: activeCdTheme.glowCss,
                          fontWeight: 900
                        }}
                      >
                        {formatRemainingTime(Math.max(0, getTargetTimestampFromTime(countdownTime) - regieNow)).formatted}
                      </span>
                      <span className="text-[10px] text-gray-200 drop-shadow flex items-center justify-center gap-1 font-semibold bg-black/60 px-2 py-0.5 rounded-md border border-white/10">
                        <Clock className={`w-3 h-3 ${activeCdTheme.badgeIconColor}`} />
                        Début prévu à <strong className="text-white font-bold">{countdownTime}</strong>
                      </span>
                    </div>
                  );
                })() : liveDirectMedia?.isActive ? (
                  <div className="flex flex-col items-center justify-center gap-2 max-w-sm w-full animate-in fade-in duration-150">
                    {liveDirectMedia.type === 'video' ? (
                      <div className="relative w-44 aspect-video rounded-lg overflow-hidden border border-purple-500/50 bg-black flex items-center justify-center shadow-lg">
                        {liveDirectMedia.source === 'youtube' && liveDirectMedia.thumbnail ? (
                          <img src={liveDirectMedia.thumbnail} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <video src={liveDirectMedia.url} className="w-full h-full object-cover" muted autoPlay loop />
                        )}
                        <span className="absolute bottom-1 right-1 text-[8px] font-mono font-bold bg-black/80 px-1 rounded text-purple-300">VIDÉO</span>
                      </div>
                    ) : liveDirectMedia.type === 'image' ? (
                      <div className="w-36 h-20 rounded-lg overflow-hidden border border-purple-500/50 bg-black shadow-lg">
                        <img src={liveDirectMedia.url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-900/50 border border-purple-400/40 text-purple-200 shadow-lg">
                        <Music className="w-4 h-4 animate-pulse text-purple-300" />
                        <span className="text-[11px] font-bold truncate max-w-[160px]">{liveDirectMedia.title}</span>
                      </div>
                    )}
                    <span className="text-[10px] text-purple-200 font-bold truncate max-w-[200px] drop-shadow">
                      {liveDirectMedia.title}
                    </span>
                  </div>
                ) : activeSlide && activeSlide.lines.length > 0 ? (
                  <div className="space-y-1 sm:space-y-1.5 max-w-lg">
                    {(liveDirectBible || activeSlide.itemType === 'bible') && (
                      <div 
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 font-bold uppercase mb-0.5 transition-all"
                        style={{ fontSize: `calc(10px * ${Math.max(0.75, Math.min(1.3, fontScale))})` }}
                      >
                        <BookOpen className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>{liveDirectBible?.referenceText || activeSlide.bibleReference || activeSlide.songTitle}</span>
                      </div>
                    )}
                    {activeSlide.isBilingual && activeSlide.secondaryLines && activeSlide.secondaryLines.length > 0 ? (
                      activeSlide.bilingualFormat === 'columns' ? (
                        <div className="grid grid-cols-2 gap-2 text-left">
                          <div className="space-y-0.5">
                            <span 
                              className="font-bold uppercase text-blue-400 block mb-0.5 transition-all"
                              style={{ fontSize: `calc(8px * ${fontScale})` }}
                            >
                              {activeSlide.primaryLanguage || 'FR'}
                            </span>
                            {activeSlide.lines.map((l, i) => (
                              <p 
                                key={i} 
                                className="font-bold text-white leading-tight truncate transition-all"
                                style={{ 
                                  fontSize: `calc(0.72rem * ${fontScale})`,
                                  textShadow: '0 1px 3px rgba(0,0,0,0.85)'
                                }}
                              >
                                {cleanBibleVerseText(l)}
                              </p>
                            ))}
                          </div>
                          <div className="border-l border-white/20 pl-2 space-y-0.5">
                            <span 
                              className="font-bold uppercase text-cyan-400 block mb-0.5 transition-all"
                              style={{ fontSize: `calc(8px * ${fontScale})` }}
                            >
                              {activeSlide.secondaryLanguage || 'TR'}
                            </span>
                            {activeSlide.secondaryLines.map((l, i) => (
                              <p 
                                key={i} 
                                className="font-medium text-cyan-200 leading-tight truncate transition-all"
                                style={{ 
                                  fontSize: `calc(0.72rem * ${fontScale})`,
                                  textShadow: '0 1px 3px rgba(6,182,212,0.4)'
                                }}
                              >
                                {cleanBibleVerseText(l)}
                              </p>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {activeSlide.lines.map((l, i) => (
                            <div key={i} className="space-y-0.5">
                              <p 
                                className="font-bold text-white leading-tight transition-all"
                                style={{ 
                                  fontSize: `calc(0.82rem * ${fontScale})`,
                                  textShadow: '0 1px 3px rgba(0,0,0,0.85)'
                                }}
                              >
                                {cleanBibleVerseText(l)}
                              </p>
                              {activeSlide.secondaryLines?.[i] && (
                                <p 
                                  className="font-medium text-cyan-200 italic leading-tight transition-all"
                                  style={{ 
                                    fontSize: `calc(0.70rem * ${fontScale})`,
                                    textShadow: '0 1px 3px rgba(6,182,212,0.4)'
                                  }}
                                >
                                  {cleanBibleVerseText(activeSlide.secondaryLines[i])}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )
                    ) : (
                      activeSlide.lines.map((l, i) => (
                        <p 
                          key={i} 
                          className="font-bold text-white drop-shadow transition-all leading-snug"
                          style={{ 
                            fontSize: `calc(0.95rem * ${fontScale})`,
                            textShadow: '0 1px 4px rgba(0,0,0,0.85)'
                          }}
                        >
                          {l}
                        </p>
                      ))
                    )}
                  </div>
                ) : (
                  <span className="text-gray-400 text-xs drop-shadow">Aucun contenu en diffusion</span>
                )}
              </div>

            </div>
          </div>

          {/* File de projection */}



          <div className="bg-[#121215] border border-[#222226] rounded-2xl shadow-md transition-all duration-150 flex flex-col">
            {/* En-tête harmonisé avec bouton Dérouler/Enrouler */}
            <div
              onClick={toggleQueueCollapse}
              className="flex items-center justify-between p-3.5 sm:p-4 select-none cursor-pointer hover:bg-white/[0.02] transition-colors rounded-2xl shrink-0"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <Music className="w-3.5 h-3.5" />
                </div>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs font-bold text-gray-200 uppercase tracking-wide truncate">
                    File de projection
                  </span>
                  {visibleQueueCount > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {visibleQueueCount}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {visibleQueueCount > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setQueueItems([]);
                      setActiveSongIndex(0);
                      setActiveSlideIndex(0);
                    }}
                    className="text-[10px] text-gray-500 hover:text-red-400 cursor-pointer px-1.5 py-0.5 rounded hover:bg-red-500/10 transition-colors"
                    title="Vider la file de projection"
                  >
                    Vider
                  </button>
                )}
                <button
                  type="button"
                  aria-label={isQueueCollapsed ? "Dérouler" : "Enrouler"}
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#202028] transition-colors"
                >
                  {isQueueCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Corps du bloc déroulable */}
            {!isQueueCollapsed && (
              <div className="px-3.5 sm:px-4 pb-3.5 sm:pb-4 pt-0 space-y-3 border-t border-[#1E1E26] mt-0.5 flex-1 min-h-0 flex flex-col">
                {visibleQueueCount === 0 ? (
                  <div className="text-center py-7 text-gray-500 text-xs flex-1 flex flex-col items-center justify-center">
                    <Music className="w-8 h-8 mx-auto mb-2 opacity-30 text-emerald-400" />
                    <span>Aucun chant ou passage dans la file.</span>
                    <p className="text-[10px] mt-1 text-gray-600">Sélectionnez une setlist ou ajoutez un chant libre / passage dans le Pupitre.</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 overflow-y-auto pr-0.5 custom-scrollbar pt-1 flex-1 min-h-0 max-lg:max-h-[460px]">
                    {(() => {
                      const visibleEntries = queueItems
                        .map((item, rawIdx) => {
                          const isBible = item.type === 'bible' && Boolean(item.bibleData);
                          const song = !isBible && item.songId ? songsById.get(item.songId) || null : null;
                          if (!isBible && !song) return null;
                          return { item, idx: rawIdx, isBible, song };
                        })
                        .filter((e): e is { item: QueueItem; idx: number; isBible: boolean; song: Song | null } => e !== null);

                      return visibleEntries.map(({ item, idx, isBible, song }, visibleIdx) => {
                      const isSetlistSong = !isBible && Boolean(item.setlistId);
                      const isIndividualItem = isBible || !item.setlistId;
                      const prevEntry = visibleIdx > 0 ? visibleEntries[visibleIdx - 1] : null;
                      const prevItem = prevEntry ? prevEntry.item : null;
                      const isFirstOfSetlist = isSetlistSong && (
                        !prevItem || 
                        prevItem.type === 'bible' || 
                        prevItem.setlistId !== item.setlistId
                      );

                      const isActive = idx === activeSongIndex && !liveDirectBible;
                      const isBeingDragged = draggedIndex === idx;
                      const isDraggedOver = dragOverIndex === idx;

                      // Calcul de la possibilité de déplacement de la setlist entière
                      let canSetlistMoveUp = false;
                      let canSetlistMoveDown = false;

                      if (isFirstOfSetlist) {
                        canSetlistMoveUp = idx > 0;
                        let setlistEndIdx = idx;
                        while (setlistEndIdx < queueItems.length - 1) {
                          const nextIt = queueItems[setlistEndIdx + 1];
                          const same = item.setlistId 
                            ? nextIt.setlistId === item.setlistId 
                            : nextIt.setlistName === item.setlistName;
                          if (same) setlistEndIdx++;
                          else break;
                        }
                        canSetlistMoveDown = setlistEndIdx < queueItems.length - 1;
                      }

                      return (
                        <React.Fragment key={item.uid}>
                          {isFirstOfSetlist && (
                            <div
                              draggable
                              onDragStart={(e) => handleSetlistDragStart(e, item.setlistName, item.setlistId)}
                              onDragOver={(e) => handleDragOver(e, idx)}
                              onDrop={(e) => handleDrop(e, idx)}
                              className="flex items-center justify-between px-2.5 py-1.5 mt-2.5 first:mt-0 rounded-lg border text-xs font-bold bg-[#181820] hover:bg-[#1C1C26] border-[#2A2A38] text-blue-300 transition-colors shadow-xs group/setlist"
                            >
                              <div className="flex items-center gap-1.5 min-w-0 pr-2">
                                <div
                                  className="cursor-grab active:cursor-grabbing text-blue-400/60 hover:text-blue-300 p-0.5 rounded shrink-0"
                                  title="Glisser-déposer pour déplacer toute la liste"
                                >
                                  <GripVertical className="w-3.5 h-3.5" />
                                </div>
                                <ListMusic className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                <span className="truncate">{item.setlistName}</span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveSetlist(item.setlistName, item.setlistId, 'up');
                                  }}
                                  disabled={!canSetlistMoveUp}
                                  className="p-1 rounded text-gray-400 hover:text-white disabled:opacity-20 cursor-pointer transition-colors"
                                  title="Déplacer toute la liste vers le haut"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveSetlist(item.setlistName, item.setlistId, 'down');
                                  }}
                                  disabled={!canSetlistMoveDown}
                                  className="p-1 rounded text-gray-400 hover:text-white disabled:opacity-20 cursor-pointer transition-colors"
                                  title="Déplacer toute la liste vers le bas"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveSetlistFromQueue(item.setlistName, item.setlistId);
                                  }}
                                  className="text-[10px] text-gray-500 hover:text-red-400 font-normal px-1.5 py-0.5 rounded hover:bg-red-500/10 transition-colors shrink-0 cursor-pointer ml-1"
                                  title={`Retirer tous les chants de la setlist "${item.setlistName}"`}
                                >
                                  Retirer
                                </button>
                              </div>
                            </div>
                          )}

                          <div
                            draggable={isIndividualItem}
                            onDragStart={(e) => {
                              if (isIndividualItem) handleDragStart(e, idx);
                            }}
                            onDragOver={(e) => handleDragOver(e, idx)}
                            onDrop={(e) => handleDrop(e, idx)}
                            onDragEnd={() => {
                              setDraggedIndex(null);
                              setDragOverIndex(null);
                            }}
                            onClick={() => {
                              setLiveDirectBible(null);
                              setActiveSongIndex(idx);
                              setActiveSlideIndex(0);
                              setActivePupitreTab('songs');
                            }}
                            className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer group select-none ${
                              isBeingDragged ? 'opacity-40 border-dashed border-gray-500' : ''
                            } ${
                              isDraggedOver ? 'ring-2 ring-blue-500 bg-blue-950/40 border-blue-400' : ''
                            } ${
                              isActive
                                ? isBible
                                  ? 'bg-amber-950/40 border-amber-500/70 text-white shadow-md'
                                  : 'bg-blue-950/40 border-blue-500/70 text-white shadow-md'
                                : isBible
                                ? 'bg-[#181824] hover:bg-[#202030] border-amber-500/30 hover:border-amber-500/60 text-gray-200'
                                : isIndividualItem
                                ? 'bg-[#181822] hover:bg-[#1E1E2C] border-emerald-500/25 hover:border-emerald-500/40 text-gray-200'
                                : 'bg-[#18181D] hover:bg-[#202026] border-[#26262E] text-gray-300'
                            }`}
                            title={
                              isBible 
                                ? "Verset individuel - Glisser pour déplacer dans la file" 
                                : isIndividualItem
                                ? "Chant séparé - Glisser ou utiliser les flèches pour déplacer"
                                : `Chant de "${item.setlistName}" - Ordre fixé par le responsable de louange`
                            }
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-2 flex-1">
                              {/* Poignée de déplacement drag & drop réservée aux éléments individuels */}
                              {isIndividualItem && (
                                <div
                                  className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-300 p-0.5 rounded shrink-0"
                                  title="Glisser-déposer pour réordonner cet élément"
                                >
                                  <GripVertical className="w-3.5 h-3.5" />
                                </div>
                              )}

                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold font-mono shrink-0 ${
                                isActive 
                                  ? isBible ? 'bg-amber-500 text-black font-extrabold' : 'bg-blue-600 text-white' 
                                  : isBible ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : isIndividualItem ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-[#25252D] text-gray-400'
                              }`}>
                                {visibleIdx + 1}
                              </span>
                              <div className="min-w-0 flex-1">
                                {isBible ? (
                                  <>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-[9px] font-bold font-mono uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                                        Verset
                                      </span>
                                      <p className="font-bold text-xs truncate leading-snug text-amber-200 flex items-center gap-1">
                                        <BookOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                        <span>{item.bibleData!.referenceText}</span>
                                        <span className="text-[9px] font-mono px-1 py-0.2 bg-black/40 rounded border border-amber-500/30 text-amber-300">
                                          {item.bibleData!.version}
                                        </span>
                                      </p>
                                    </div>
                                    <p className="text-[10px] text-gray-400 truncate italic mt-0.5">
                                      {item.bibleData!.verses[0]?.text || item.bibleData!.text}
                                    </p>
                                  </>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      {isIndividualItem && (
                                        <span className="text-[9px] font-bold font-mono uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                                          Séparé
                                        </span>
                                      )}
                                      <p className="font-semibold text-xs truncate leading-snug">{song!.title}</p>
                                    </div>
                                    {song!.artist && <p className="text-[10px] text-gray-500 truncate">{song!.artist}</p>}
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                              {/* Boutons de réordonnancement et suppression pour les éléments individuels */}
                              {isIndividualItem ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMoveSong(idx, 'up');
                                    }}
                                    disabled={idx === 0}
                                    className="p-1 rounded text-gray-400 hover:text-white disabled:opacity-20 cursor-pointer transition-colors"
                                    title="Déplacer vers le haut"
                                  >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMoveSong(idx, 'down');
                                    }}
                                    disabled={idx === queueItems.length - 1}
                                    className="p-1 rounded text-gray-400 hover:text-white disabled:opacity-20 cursor-pointer transition-colors"
                                    title="Déplacer vers le bas"
                                  >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveSong(idx);
                                    }}
                                    className="p-1 rounded text-gray-400 hover:text-red-400 cursor-pointer transition-colors"
                                    title={isBible ? "Retirer ce verset de la file" : "Retirer ce chant de la file"}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                /* Chant appartenant à une setlist : ordre et contenu protégés */
                                <div
                                  className="p-1 text-gray-500 hover:text-gray-400 cursor-help"
                                  title={`Chant de "${item.setlistName}" — l'ordre et le contenu sont gérés par le responsable de louange`}
                                >
                                  <Lock className="w-3.5 h-3.5 opacity-60" />
                                </div>
                              )}
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    });
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de sélection d'arrière-plan et filtre sombre */}
      <PresentationBackgroundModal
        isOpen={isBackgroundModalOpen}
        onClose={() => setIsBackgroundModalOpen(false)}
        currentBackground={backgroundImage}
        onSelectBackground={handleSelectBackground}
        currentOverlay={backgroundOverlay}
        onAdjustOverlay={handleAdjustBackgroundOverlay}
      />

      {/* Modal de sélection de chant traduit pour la projection bilingue */}
      {showBilingualModal && currentSong && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowBilingualModal(false)}
        >
          <div 
            className="w-full max-w-lg bg-[#14141A] border border-[#2B2B38] rounded-2xl shadow-2xl p-5 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#22222E]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Columns className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Projection Bilingue</h3>
                  <p className="text-[11px] text-gray-400">
                    Chant principal : <strong className="text-white">{currentSong.title}</strong> ({getLanguageMeta(currentSong.language).name})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBilingualModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#202028] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Versions déjà liées */}
            <div className="py-3 border-b border-[#22222E] space-y-2">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                Versions traduites liées
              </span>
              {availableLinkedVersions.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 italic">Aucune version n'est encore liée à ce chant.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBilingualModal(false);
                      setAiTranslateInitialEdit(false);
                      setIsAiTranslateModalOpen(true);
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-600/25 to-indigo-600/25 hover:from-cyan-600/40 hover:to-indigo-600/40 border border-cyan-500/40 text-cyan-200 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Traduire automatiquement par IA</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                  {availableLinkedVersions.map((lv) => {
                    const lMeta = getLanguageMeta(lv.language);
                    const isSelected = secondarySong?.id === lv.id;
                    return (
                      <div
                        key={lv.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                          isSelected
                            ? 'bg-indigo-950/50 border-indigo-500 text-white shadow-xs'
                            : 'bg-[#181822] border-[#2A2A38] text-gray-200 hover:border-indigo-500/40'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${lMeta.badgeClass}`}>
                            {lMeta.code}
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold truncate">{lv.title}</div>
                            <div className="text-[10px] text-gray-400">{lMeta.name}</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSecondarySongId(lv.id);
                            setIsBilingualMode(true);
                            setShowBilingualModal(false);
                            showNotification?.({
                              title: 'Projection bilingue activée',
                              message: `Version ${lMeta.name} sélectionnée`,
                              type: 'info'
                            });
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-[#222232] hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40'
                          }`}
                        >
                          {isSelected ? 'Sélectionné' : 'Projeter'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Rechercher et lier un autre chant du répertoire */}
            <div className="pt-3 flex-1 flex flex-col min-h-0 space-y-2">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                Ou choisir un chant du répertoire à projeter / lier
              </span>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher par titre ou langue..."
                  value={bilingualSearchQuery}
                  onChange={(e) => setBilingualSearchQuery(e.target.value)}
                  className="w-full bg-[#181820] border border-[#2E2E3C] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-1 max-h-52">
                {songs
                  .filter(s => s.id !== currentSong.id)
                  .filter(s => {
                    if (!bilingualSearchQuery.trim()) return true;
                    return (
                      includesIgnoreAccents(s.title, bilingualSearchQuery) ||
                      includesIgnoreAccents(s.language, bilingualSearchQuery)
                    );
                  })
                  .slice(0, 15)
                  .map(songItem => {
                    const lMeta = getLanguageMeta(songItem.language);
                    return (
                      <div
                        key={songItem.id}
                        className="p-2 rounded-xl bg-[#16161E] hover:bg-[#1E1E28] border border-[#252532] flex items-center justify-between gap-2 text-xs transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${lMeta.badgeClass}`}>
                            {lMeta.code}
                          </span>
                          <div className="min-w-0">
                            <div className="font-semibold text-white truncate">{songItem.title}</div>
                            <div className="text-[10px] text-gray-400">{lMeta.name}</div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={async () => {
                            if (linkSongs) {
                              try {
                                await linkSongs(currentSong.id, songItem.id);
                              } catch {}
                            }
                            setSelectedSecondarySongId(songItem.id);
                            setIsBilingualMode(true);
                            setShowBilingualModal(false);
                            showNotification?.({
                              title: 'Traduction liée et projetée',
                              message: `${songItem.title} affiché en mode bilingue`,
                              type: 'info'
                            });
                          }}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition-colors shrink-0 shadow-xs cursor-pointer"
                        >
                          Lier & Projeter
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'ajout d'un chant séparé (hors-setlist) */}
      {isAddSongModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsAddSongModalOpen(false)}
        >
          <div 
            className="w-full max-w-lg bg-[#14141A] border border-[#2B2B38] rounded-2xl shadow-2xl p-5 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#22222E]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Music className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Ajouter un chant séparé</h3>
                  <p className="text-[11px] text-gray-400">
                    Chant individuel hors-liste (librement repositionnable et retirable)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddSongModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#202028] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Barre de recherche */}
            <div className="pt-3 pb-2">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={songModalSearch}
                  onChange={(e) => setSongModalSearch(e.target.value)}
                  placeholder="Rechercher par titre, artiste, paroles..."
                  className="w-full bg-[#1A1A24] border border-[#303042] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Liste des chants */}
            <div className="space-y-1.5 overflow-y-auto custom-scrollbar flex-1 min-h-0 py-2">
              {filteredModalSongs.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-xs">
                  Aucun chant trouvé pour "{songModalSearch}"
                </div>
              ) : (
                filteredModalSongs.map((song) => {
                  const lMeta = getLanguageMeta(song.language);
                  return (
                    <div
                      key={song.id}
                      onClick={() => handleAddIndividualSong(song)}
                      className="p-2.5 rounded-xl border border-[#252532] hover:border-emerald-500/50 bg-[#16161F] hover:bg-[#1E1E2B] transition-all flex items-center justify-between gap-3 cursor-pointer group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${lMeta.badgeClass}`}>
                            {lMeta.code}
                          </span>
                          <span className="text-xs font-semibold text-white group-hover:text-emerald-300 transition-colors truncate">
                            {song.title}
                          </span>
                        </div>
                        {song.artist && (
                          <div className="text-[10px] text-gray-400 mt-0.5 truncate pl-7">
                            {song.artist}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddIndividualSong(song);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600/20 group-hover:bg-emerald-600 text-emerald-300 group-hover:text-white border border-emerald-500/40 text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Ajouter</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de traduction automatique par IA et d'édition manuelle */}
      {currentSong && (
        <AiTranslationModal
          isOpen={isAiTranslateModalOpen}
          onClose={() => setIsAiTranslateModalOpen(false)}
          song={currentSong}
          existingAiTranslation={activeAiTranslation}
          existingLinkedSong={
            secondarySong && !secondarySong.id.startsWith('ai_') ? secondarySong : null
          }
          initialEditMode={aiTranslateInitialEdit}
          canSaveToLibrary={canSaveTranslationToLibrary}
          onApplyForProjection={handleApplyAiTranslation}
          onSaveToLibrary={handleSaveAiTranslationToLibrary}
          onDeleteLocalTranslation={handleDeleteLocalAiTranslation}
        />
      )}

    </div>
  );
};
