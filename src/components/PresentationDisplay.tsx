import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  PresentationState, 
  getSavedPresentationState, 
  subscribeToPresentation, 
  requestPresentationSync, 
  buildPresentationSlides,
  fetchPresentationStateFromServer,
  getSavedFontScale,
  getSavedBaseFontSize,
  getSavedBackgroundImage,
  getSavedBackgroundOverlay,
  FONT_SCALE_KEY,
  BASE_FONT_SIZE_KEY,
  MIN_BASE_FONT_SIZE_PX,
  MAX_BASE_FONT_SIZE_PX,
  BACKGROUND_IMAGE_KEY,
  BACKGROUND_OVERLAY_KEY,
  formatRemainingTime,
  getCountdownTheme,
  cleanBibleVerseText,
  getPresentationFontSizeCss
} from '../utils/presentationUtils';
import { BIBLE_TRANSLATIONS } from '../services/bibleService';
import { BIBLE_BOOKS } from '../data/bibleBooksData';
import { stripParentheses } from '../utils/chordUtils';
import { useApp } from '../context/AppContext';
import { requestFullscreenSafe, exitFullscreenSafe, getIsNativeFullscreen } from '../utils/fullscreen';
import { Maximize2, Minimize2, EyeOff, Timer, Clock, Sparkles, BookOpen, Music, Video, Image as ImageIcon, ChevronRight } from 'lucide-react';


export const PresentationDisplay: React.FC = () => {
  const { songs, selectedSong } = useApp();
  
  // 1. État unique de projection avec horodatage strict pour éliminer les race conditions
  const [displayState, setDisplayState] = useState<PresentationState | null>(() => getSavedPresentationState());
  const lastTimestampRef = useRef<number>(displayState?.updatedAt || 0);

  // Horloge locale pour le décompte en temps réel
  const [currentNow, setCurrentNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!displayState?.countdown?.isActive) return;
    const interval = setInterval(() => {
      setCurrentNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [displayState?.countdown?.isActive]);

  // Résolution du nom complet d'une version de Bible
  const getFullBibleVersionName = useCallback((codeOrName?: string): string => {
    if (!codeOrName) return '';
    const clean = codeOrName.trim();
    const found = BIBLE_TRANSLATIONS.find(t => 
      t.shortName.toLowerCase() === clean.toLowerCase() ||
      t.id.toLowerCase() === clean.toLowerCase() ||
      t.apiCode.toLowerCase() === clean.toLowerCase() ||
      t.name.toLowerCase() === clean.toLowerCase()
    );
    return found ? found.name : clean;
  }, []);

  // Détection de la langue d'une version de Bible
  const getBibleVersionLanguage = useCallback((codeOrName?: string): string => {
    if (!codeOrName) return '';
    const clean = codeOrName.trim();
    const found = BIBLE_TRANSLATIONS.find(t => 
      t.shortName.toLowerCase() === clean.toLowerCase() ||
      t.id.toLowerCase() === clean.toLowerCase() ||
      t.apiCode.toLowerCase() === clean.toLowerCase() ||
      t.name.toLowerCase() === clean.toLowerCase()
    );
    return found?.language || '';
  }, []);

  // Localisation du nom de livre dans la référence (ex: "Jean 3:7" -> "Juan 3:7" pour Español)
  const formatLocalizedBibleRef = useCallback((rawRef: string, lang: string): string => {
    const clean = rawRef.replace(/\s*\([^)]*\)\s*$/, '').trim();
    if (!lang || lang === 'Français') return clean;

    const match = clean.match(/^([1-3]?\s*[A-Za-zÀ-ÿ]+(?:\s+des\s+[A-Za-zÀ-ÿ]+)?)\s+(\d+(?::\d+(?:-\d+)?)?)$/);
    if (!match) return clean;

    const rawBookName = match[1].trim();
    const chapterAndVerses = match[2];

    const book = BIBLE_BOOKS.find(b => 
      b.name.toLowerCase() === rawBookName.toLowerCase() ||
      b.aliases.some(a => a.toLowerCase() === rawBookName.toLowerCase())
    );
    if (!book) return clean;

    // Table de traduction pour Español et English
    const ES_BOOKS: Record<number, string> = {
      1: 'Génesis', 2: 'Éxodo', 3: 'Levítico', 4: 'Números', 5: 'Deuteronomio',
      6: 'Josué', 7: 'Jueces', 8: 'Rut', 9: '1 Samuel', 10: '2 Samuel',
      11: '1 Reyes', 12: '2 Reyes', 13: '1 Crónicas', 14: '2 Crónicas', 15: 'Esdras',
      16: 'Nehemías', 17: 'Ester', 18: 'Job', 19: 'Salmos', 20: 'Proverbios',
      21: 'Eclesiastés', 22: 'Cantares', 23: 'Isaías', 24: 'Jeremías', 25: 'Lamentaciones',
      26: 'Ezequiel', 27: 'Daniel', 28: 'Oseas', 29: 'Joel', 30: 'Amós',
      31: 'Abdías', 32: 'Jonás', 33: 'Miqueas', 34: 'Nahúm', 35: 'Habacuc',
      36: 'Sofonías', 37: 'Hageo', 38: 'Zacarías', 39: 'Malaquías',
      40: 'Mateo', 41: 'Marcos', 42: 'Lucas', 43: 'Juan', 44: 'Hechos',
      45: 'Romanos', 46: '1 Corintios', 47: '2 Corintios', 48: 'Gálatas', 49: 'Efesios',
      50: 'Filipenses', 51: 'Colosenses', 52: '1 Tesalonicenses', 53: '2 Tesalonicenses', 54: '1 Timoteo',
      55: '2 Timoteo', 56: 'Tito', 57: 'Filemón', 58: 'Hebreos', 59: 'Santiago',
      60: '1 Pedro', 61: '2 Pedro', 62: '1 Juan', 63: '2 Juan', 64: '3 Juan',
      65: 'Judas', 66: 'Apocalipsis'
    };

    const EN_BOOKS: Record<number, string> = {
      1: 'Genesis', 2: 'Exodus', 3: 'Leviticus', 4: 'Numbers', 5: 'Deuteronomy',
      6: 'Joshua', 7: 'Judges', 8: 'Ruth', 9: '1 Samuel', 10: '2 Samuel',
      11: '1 Kings', 12: '2 Kings', 13: '1 Chronicles', 14: '2 Chronicles', 15: 'Ezra',
      16: 'Nehemiah', 17: 'Esther', 18: 'Job', 19: 'Psalms', 20: 'Proverbs',
      21: 'Ecclesiastes', 22: 'Song of Songs', 23: 'Isaiah', 24: 'Jeremiah', 25: 'Lamentations',
      26: 'Ezekiel', 27: 'Daniel', 28: 'Hosea', 29: 'Joel', 30: 'Amos',
      31: 'Obadiah', 32: 'Jonah', 33: 'Micah', 34: 'Nahum', 35: 'Habakkuk',
      36: 'Zephaniah', 37: 'Haggai', 38: 'Zechariah', 39: 'Malachi',
      40: 'Matthew', 41: 'Mark', 42: 'Luke', 43: 'John', 44: 'Acts',
      45: 'Romans', 46: '1 Corinthians', 47: '2 Corinthians', 48: 'Galatians', 49: 'Ephesians',
      50: 'Philippians', 51: 'Colossians', 52: '1 Thessalonians', 53: '2 Thessalonians', 54: '1 Timothy',
      55: '2 Timothy', 56: 'Titus', 57: 'Philemon', 58: 'Hebrews', 59: 'James',
      60: '1 Peter', 61: '2 Peter', 62: '1 John', 63: '2 John', 64: '3 John',
      65: 'Jude', 66: 'Revelation'
    };

    const localizedName = lang === 'Español' ? ES_BOOKS[book.id] : lang === 'English' ? EN_BOOKS[book.id] : book.name;
    return `${localizedName || book.name} ${chapterAndVerses}`;
  }, []);

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControlsHint, setShowControlsHint] = useState<boolean>(true);
  const [mediaImgError, setMediaImgError] = useState<boolean>(false);

  useEffect(() => {
    setMediaImgError(false);
  }, [displayState?.media?.url]);

  // Échelle et taille de base de police synchronisées depuis l'onglet présentation
  const [fontScale, setFontScale] = useState<number>(() => {
    const savedState = getSavedPresentationState();
    if (typeof savedState?.fontScale === 'number') return savedState.fontScale;
    return getSavedFontScale();
  });

  const [baseFontSize, setBaseFontSize] = useState<number>(() => {
    const savedState = getSavedPresentationState();
    if (typeof savedState?.baseFontSize === 'number') return savedState.baseFontSize;
    return getSavedBaseFontSize();
  });

  // Image d'arrière-plan personnalisée et filtre sombre automatique
  const [backgroundImage, setBackgroundImage] = useState<string>(() => {
    const savedState = getSavedPresentationState();
    if (typeof savedState?.backgroundImage === 'string') return savedState.backgroundImage;
    return getSavedBackgroundImage();
  });

  const [backgroundOverlay, setBackgroundOverlay] = useState<number>(() => {
    const savedState = getSavedPresentationState();
    if (typeof savedState?.backgroundOverlay === 'number') return savedState.backgroundOverlay;
    return getSavedBackgroundOverlay();
  });

  const [isControlsActive, setIsControlsActive] = useState<boolean>(false);
  const userActivityTimerRef = useRef<number | null>(null);

  // Écoute des changements de paramètres dans le localStorage
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === FONT_SCALE_KEY && e.newValue) {
        const val = parseFloat(e.newValue);
        if (!isNaN(val) && val >= 0.5 && val <= 2.5) {
          setFontScale(val);
        }
      } else if (e.key === BASE_FONT_SIZE_KEY && e.newValue) {
        const val = parseFloat(e.newValue);
        if (!isNaN(val) && val >= MIN_BASE_FONT_SIZE_PX && val <= MAX_BASE_FONT_SIZE_PX) {
          setBaseFontSize(Math.round(val));
        }
      } else if (e.key === BACKGROUND_IMAGE_KEY) {
        setBackgroundImage(e.newValue || '');
      } else if (e.key === BACKGROUND_OVERLAY_KEY && e.newValue) {
        const val = parseFloat(e.newValue);
        if (!isNaN(val) && val >= 0.1 && val <= 0.95) {
          setBackgroundOverlay(val);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Activité souris / tactile pour afficher brièvement les contrôles (plein écran)
  const handleUserActivity = useCallback(() => {
    setIsControlsActive(true);
    if (userActivityTimerRef.current) clearTimeout(userActivityTimerRef.current);
    userActivityTimerRef.current = window.setTimeout(() => setIsControlsActive(false), 3000);
  }, []);

  // 2. Initial fallback si aucun état n'est sauvegardé à l'ouverture
  const urlSongId = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('songId');
  }, []);

  useEffect(() => {
    if (!displayState && songs.length > 0) {
      const target = (urlSongId ? songs.find(s => s.id === urlSongId) : null) || selectedSong || songs[0];
      if (target) {
        const slides = buildPresentationSlides(target.contentChordPro || target.content || '', target.title);
        const initial: PresentationState = {
          songTitle: stripParentheses(target.title),
          sectionTitle: slides[0]?.sectionTitle || '',
          lines: slides[0]?.lines || [],
          slideIndex: 0,
          totalSlides: slides.length,
          isBlackout: false,
          updatedAt: Date.now()
        };
        lastTimestampRef.current = initial.updatedAt;
        setDisplayState(initial);
      }
    }
  }, [displayState, songs, urlSongId, selectedSong]);

  // 3. Fonction unique de mise à jour protégée contre les flashs et race conditions
  const updateStateIfNewer = useCallback((incoming: PresentationState | null) => {
    if (!incoming || typeof incoming.updatedAt !== 'number') return;
    // Si le message entrant est plus ancien que l'état courant, on l'ignore (évite tout flash arrière)
    if (incoming.updatedAt < lastTimestampRef.current) return;

    lastTimestampRef.current = incoming.updatedAt;
    if (typeof incoming.fontScale === 'number' && !isNaN(incoming.fontScale)) {
      setFontScale(incoming.fontScale);
    }
    if (typeof incoming.baseFontSize === 'number' && !isNaN(incoming.baseFontSize)) {
      setBaseFontSize(incoming.baseFontSize);
    }
    if (typeof incoming.backgroundImage === 'string') {
      setBackgroundImage(incoming.backgroundImage);
    }
    if (typeof incoming.backgroundOverlay === 'number' && !isNaN(incoming.backgroundOverlay)) {
      setBackgroundOverlay(incoming.backgroundOverlay);
    }
    setDisplayState(prev => {
      // Éviter tout re-render si le contenu visible est identique
      if (
        prev &&
        prev.slideIndex === incoming.slideIndex &&
        prev.songTitle === incoming.songTitle &&
        prev.isBlackout === incoming.isBlackout &&
        prev.itemType === incoming.itemType &&
        prev.bibleReference === incoming.bibleReference &&
        prev.lines.length === incoming.lines.length &&
        prev.lines.every((l, i) => l === incoming.lines[i]) &&
        prev.fontScale === incoming.fontScale &&
        prev.baseFontSize === incoming.baseFontSize &&
        prev.backgroundImage === incoming.backgroundImage &&
        prev.backgroundOverlay === incoming.backgroundOverlay &&
        prev.isBilingual === incoming.isBilingual &&
        prev.bilingualFormat === incoming.bilingualFormat &&
        prev.primaryLanguage === incoming.primaryLanguage &&
        prev.secondaryLanguage === incoming.secondaryLanguage &&
        prev.secondarySongTitle === incoming.secondarySongTitle &&
        prev.secondaryLines?.length === incoming.secondaryLines?.length &&
        (prev.secondaryLines || []).every((l, i) => l === (incoming.secondaryLines || [])[i]) &&
        prev.media?.isActive === incoming.media?.isActive &&
        prev.media?.url === incoming.media?.url &&
        prev.media?.type === incoming.media?.type &&
        prev.media?.title === incoming.media?.title &&
        prev.media?.isLoop === incoming.media?.isLoop &&
        prev.media?.isMuted === incoming.media?.isMuted
      ) {
        return prev;
      }
      return incoming;
    });
  }, []);

  // 4. Écoute postMessage direct (depuis la fenêtre régie)
  useEffect(() => {
    const handleMsg = (e: MessageEvent) => {
      if (e.data?.type === 'MELOBOOK_PRESENTATION_UPDATE' && e.data.state) {
        updateStateIfNewer(e.data.state);
      }
    };

    window.addEventListener('message', handleMsg);

    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: 'MELOBOOK_PRESENTATION_READY' }, '*');
      }
    } catch {}

    return () => window.removeEventListener('message', handleMsg);
  }, [updateStateIfNewer]);

  // 5. Écoute BroadcastChannel & Storage Event
  useEffect(() => {
    requestPresentationSync();
    const unsub = subscribeToPresentation((newState) => {
      updateStateIfNewer(newState);
    });
    return () => unsub();
  }, [updateStateIfNewer]);

  // 6. Polling serveur HTTP de secours (toutes les 800ms, filtré par timestamp)
  useEffect(() => {
    let active = true;
    const poll = async () => {
      const serverState = await fetchPresentationStateFromServer();
      if (active && serverState) {
        updateStateIfNewer(serverState);
      }
    };

    const interval = setInterval(poll, 800);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [updateStateIfNewer]);

  // 7. Navigation locale directe depuis l'écran de projection
  const handleLocalNav = useCallback((newIndex: number) => {
    if (!displayState) return;
    const now = Date.now();
    lastTimestampRef.current = now;

    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ 
          type: 'MELOBOOK_PRESENTATION_NAV', 
          slideIndex: newIndex, 
          isBlackout: displayState.isBlackout 
        }, '*');
      }
    } catch {}
  }, [displayState]);

  const handleNext = useCallback(() => {
    if (displayState && displayState.slideIndex < displayState.totalSlides - 1) {
      handleLocalNav(displayState.slideIndex + 1);
    }
  }, [displayState, handleLocalNav]);

  const handlePrev = useCallback(() => {
    if (displayState && displayState.slideIndex > 0) {
      handleLocalNav(displayState.slideIndex - 1);
    }
  }, [displayState, handleLocalNav]);

  const handleToggleBlackout = useCallback(() => {
    if (!displayState) return;
    const nextBlackout = !displayState.isBlackout;
    const now = Date.now();
    lastTimestampRef.current = now;
    setDisplayState(prev => prev ? { ...prev, isBlackout: nextBlackout, updatedAt: now } : null);

    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ 
          type: 'MELOBOOK_PRESENTATION_NAV', 
          slideIndex: displayState.slideIndex, 
          isBlackout: nextBlackout 
        }, '*');
      }
    } catch {}
  }, [displayState]);

  // Plein écran
  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(getIsNativeFullscreen());
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (getIsNativeFullscreen()) {
      exitFullscreenSafe();
    } else {
      requestFullscreenSafe(document.documentElement);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowControlsHint(false), 4500);
    return () => clearTimeout(timer);
  }, []);

  // Clavier sur la fenêtre de projection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        handleToggleBlackout();
      } else if (['ArrowRight', ' ', 'PageDown', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        handleNext();
      } else if (['ArrowLeft', 'PageUp', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, handleToggleBlackout, toggleFullscreen]);

  // Clic écran : gauche = précédent, droite = suivant
  const handleScreenClick = (e: React.MouseEvent<HTMLDivElement>) => {
    handleUserActivity();
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('header') || target.closest('footer')) return;
    if (e.clientX < window.innerWidth * 0.35) {
      handlePrev();
    } else {
      handleNext();
    }
  };

  const isBlackout = displayState?.isBlackout || false;
  const lines = displayState?.lines || [];
  const title = displayState?.songTitle || '';
  const currentIdx = (displayState?.slideIndex ?? 0) + 1;
  const totalSlides = displayState?.totalSlides ?? 0;

  // Échelle et taille de base effectives garanties (prennent la valeur la plus fraîche entre l'état de projection et le storage)
  const effectiveFontScale = (typeof displayState?.fontScale === 'number' && !isNaN(displayState.fontScale))
    ? displayState.fontScale
    : fontScale;

  const effectiveBaseFontSize = (typeof displayState?.baseFontSize === 'number' && !isNaN(displayState.baseFontSize))
    ? displayState.baseFontSize
    : baseFontSize;

  const isCountdownActive = Boolean(displayState?.countdown?.isActive);
  const countdownTheme = getCountdownTheme(displayState?.countdown?.themeId);
  const countdownRemainingMs = isCountdownActive && displayState?.countdown?.targetTimestamp
    ? Math.max(0, displayState.countdown.targetTimestamp - currentNow)
    : 0;
  const countdownInfo = formatRemainingTime(countdownRemainingMs);

  const isBibleSlide = Boolean(displayState?.itemType === 'bible' || displayState?.bibleReference);
  const isMediaActive = Boolean(displayState?.media?.isActive && !isBlackout && !isCountdownActive);
  const isVisualMediaActive = Boolean(isMediaActive && displayState?.media?.type !== 'audio');
  const isBibleContentActive = Boolean(
    isBibleSlide && !isBlackout && !isCountdownActive && !displayState?.media?.isActive && lines.length > 0
  );
  const bibleRefs = useMemo(() => {
    const baseRef = displayState?.songTitle || displayState?.bibleReference || title;
    const primaryLang = getBibleVersionLanguage(displayState?.primaryLanguage || displayState?.bibleVersion);
    const secondaryLang = getBibleVersionLanguage(displayState?.secondaryLanguage);
    return {
      primaryRef: formatLocalizedBibleRef(baseRef, primaryLang || 'Français'),
      secondaryRef: displayState?.secondarySongTitle
        ? formatLocalizedBibleRef(displayState.secondarySongTitle, secondaryLang)
        : formatLocalizedBibleRef(baseRef, secondaryLang || 'Español'),
      primaryFullName: getFullBibleVersionName(displayState?.primaryLanguage || displayState?.bibleVersion),
      secondaryFullName: getFullBibleVersionName(displayState?.secondaryLanguage),
    };
  }, [displayState, title, getBibleVersionLanguage, formatLocalizedBibleRef, getFullBibleVersionName]);

  const primaryVerseText = useMemo(
    () => lines.map(l => cleanBibleVerseText(l)).filter(Boolean).join(' '),
    [lines]
  );
  const secondaryVerseText = useMemo(
    () => (displayState?.secondaryLines || []).map(l => cleanBibleVerseText(l)).filter(Boolean).join(' '),
    [displayState?.secondaryLines]
  );
  const isShortBibleText = primaryVerseText.length <= 95 && (!secondaryVerseText || secondaryVerseText.length <= 95);

  // Tailles de police uniformes et fixes (avec plancher responsive minimal), indépendantes de l'espace vide ou de la longueur du texte
  const uniformTextFontCss = useMemo(
    () => getPresentationFontSizeCss(effectiveBaseFontSize, effectiveFontScale, 1),
    [effectiveBaseFontSize, effectiveFontScale]
  );
  const uniformBilingualFontCss = useMemo(
    () => getPresentationFontSizeCss(effectiveBaseFontSize, effectiveFontScale, 0.85),
    [effectiveBaseFontSize, effectiveFontScale]
  );
  const uniformSecondarySongFontCss = useMemo(
    () => getPresentationFontSizeCss(effectiveBaseFontSize, effectiveFontScale, 0.72),
    [effectiveBaseFontSize, effectiveFontScale]
  );

  return (
    <div 
      data-presentation-root="true"
      onClick={handleScreenClick}
      onMouseMove={handleUserActivity}
      onTouchStart={handleUserActivity}
      className="fixed inset-0 w-screen h-screen bg-black text-white select-none flex flex-col justify-between overflow-hidden font-sans cursor-pointer bg-cover bg-center bg-no-repeat transition-all duration-500"
      style={backgroundImage ? { backgroundImage: `url("${backgroundImage}")` } : undefined}
    >
      {/* Filtre sombre automatique protecteur de contraste et de lisibilité */}
      {backgroundImage && (
        <div 
          className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-300 z-0"
          style={{ opacity: isBlackout ? 1 : backgroundOverlay }}
        />
      )}

      {/* Barre supérieure discrète */}
      <header 
        onClick={(e) => e.stopPropagation()}
        className={`${
          (isBibleContentActive || isMediaActive)
            ? 'absolute top-2.5 right-3'
            : 'w-full flex items-center justify-end px-4 py-3 relative shrink-0'
        } z-30 transition-opacity duration-300 ${
          isControlsActive ? 'opacity-100' : 'opacity-0 hover:opacity-100 focus-within:opacity-100'
        }`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleFullscreen();
          }}
          className="p-2 rounded-lg bg-gray-900/90 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-700/60 shadow-lg transition-colors cursor-pointer"
          title={isFullscreen ? "Quitter le plein écran (F)" : "Plein écran (F)"}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />}
        </button>
      </header>

      {/* Zone centrale des paroles avec mise à l'échelle dynamique ou Décompte avant événement */}
      <main className={`flex-1 min-h-0 flex relative z-20 ${
        isBibleContentActive
          ? `flex-col px-4 sm:px-6 md:px-8 pt-3 pb-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${isShortBibleText ? 'text-center' : 'text-left'}`
          : isVisualMediaActive
          ? 'items-center justify-center p-0 text-center'
          : 'items-center justify-center px-6 sm:px-12 md:px-20 text-center'
      }`}>
        {isBlackout ? (
          <div className="flex items-center gap-2 text-gray-400 animate-pulse text-sm">
            <EyeOff className="w-4 h-4" />
            <span>Écran masqué</span>
          </div>
        ) : isCountdownActive ? (
          <div className="max-w-6xl w-full flex flex-col items-center justify-center gap-6 sm:gap-9 animate-presentation-slide select-none text-center">
            {/* Badge Titre / Message d'accueil */}
            <div className={`inline-flex items-center gap-3 px-6 sm:px-8 py-2.5 sm:py-3 rounded-full ${countdownTheme.badgeBg} border ${countdownTheme.badgeBorder} ${countdownTheme.badgeText} text-base sm:text-xl md:text-2xl font-black tracking-wider uppercase shadow-2xl backdrop-blur-md`}>
              <Timer className={`w-5 h-5 sm:w-7 sm:h-7 ${countdownTheme.badgeIconColor} animate-pulse shrink-0`} />
              <span>{displayState?.countdown?.title || "Le culte commence dans"}</span>
            </div>

            {/* Grand affichage numérique du décompte : plus grand, très gras, centré, avec effet de lueur */}
            <div className="flex flex-col items-center justify-center gap-4 w-full">
              <div 
                className={`font-mono font-black tracking-widest leading-none drop-shadow-2xl tabular-nums select-none ${countdownTheme.textColor}`}
                style={{
                  fontSize: `calc(clamp(5.5rem, 16vw, 15rem) * ${effectiveFontScale})`,
                  fontWeight: 900,
                  textShadow: countdownTheme.glowCss,
                  letterSpacing: '0.04em'
                }}
              >
                {countdownInfo.formatted}
              </div>
              
              {countdownInfo.isExpired ? (
                <div className="text-emerald-400 font-extrabold text-xl sm:text-3xl md:text-4xl tracking-wider uppercase animate-bounce drop-shadow-lg flex items-center justify-center gap-3 mt-3">
                  <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-300 shrink-0" />
                  <span>L'événement commence !</span>
                </div>
              ) : (
                <div className={`flex items-center justify-center gap-3 text-gray-100 text-base sm:text-xl md:text-2xl font-bold tracking-wide drop-shadow-md bg-black/60 px-6 py-2.5 rounded-2xl border ${countdownTheme.badgeBorder} backdrop-blur-md mt-1`}>
                  <Clock className={`w-5 h-5 sm:w-6 sm:h-6 ${countdownTheme.badgeIconColor} shrink-0`} />
                  <span>Début prévu à <strong className="text-white font-black underline decoration-2 underline-offset-4">{displayState?.countdown?.targetTime}</strong></span>
                </div>
              )}
            </div>
          </div>
        ) : displayState?.media?.isActive ? (
          <div className="w-full h-full flex flex-col items-center justify-center animate-presentation-slide select-none">
            {displayState.media.type === 'video' ? (
              displayState.media.source === 'youtube' ? (
                <div className="w-full h-full bg-black flex items-center justify-center">
                  <iframe
                    src={displayState.media.url}
                    title={displayState.media.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-black">
                  <video
                    src={displayState.media.url}
                    autoPlay
                    loop={displayState.media.isLoop ?? true}
                    muted={displayState.media.isMuted ?? false}
                    playsInline
                    className="w-full h-full object-contain"
                  />
                </div>
              )
            ) : displayState.media.type === 'image' ? (
              <div className="w-full h-full flex items-center justify-center bg-black/40">
                {mediaImgError ? (
                  <div className="flex flex-col items-center justify-center gap-2 p-10 text-gray-400">
                    <ImageIcon className="w-10 h-10 text-gray-500" />
                    <span className="text-sm font-medium text-gray-300">{displayState.media.title}</span>
                    <span className="text-xs text-gray-500">Image indisponible sur cet écran</span>
                  </div>
                ) : (
                  <img
                    key={displayState.media.url}
                    src={displayState.media.url}
                    alt={displayState.media.title}
                    referrerPolicy="no-referrer"
                    onError={() => setMediaImgError(true)}
                    className="w-full h-full object-contain animate-in fade-in zoom-in-95 duration-200"
                  />
                )}
              </div>
            ) : (
              /* Audio : titre uniquement, lecteur caché */
              <div className="max-w-4xl w-full px-6 flex items-center justify-center text-center animate-in fade-in zoom-in-95">
                <h2
                  className="font-extrabold text-white tracking-wide drop-shadow-lg break-words"
                  style={{ fontSize: `calc(clamp(1.75rem, 4vw, 3.25rem) * ${effectiveFontScale})` }}
                >
                  {displayState.media.title}
                </h2>
                {displayState.media.source === 'youtube' ? (
                  <iframe
                    src={displayState.media.url}
                    title={displayState.media.title}
                    className="fixed -left-[9999px] top-0 w-64 h-36 opacity-0 pointer-events-none"
                    allow="autoplay; encrypted-media"
                  />
                ) : (
                  <audio
                    src={displayState.media.url}
                    autoPlay
                    loop={displayState.media.isLoop ?? true}
                    className="hidden"
                  />
                )}
              </div>
            )}
          </div>
        ) : lines.length > 0 ? (
          (displayState?.itemType === 'bible' || Boolean(displayState?.bibleReference)) ? (
            <div className="w-full my-auto flex items-center justify-center">
              <div className={`w-full ${isShortBibleText ? 'text-center' : 'text-left'}`}>
                {displayState?.isBilingual && displayState?.secondaryLines && displayState.secondaryLines.length > 0 ? (
                  displayState.bilingualFormat === 'columns' ? (
                    <div 
                      key={`bible-bi-cols-${displayState?.bibleReference || title}-${displayState?.slideIndex}`}
                      className={`w-full grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 items-start animate-presentation-slide select-none ${isShortBibleText ? 'text-center' : 'text-left'}`}
                    >
                      {/* Left Column : Primary Version */}
                      <div className={`flex flex-col justify-start w-full ${isShortBibleText ? 'items-center text-center' : 'items-start text-left'}`}>
                        <p
                          className={`font-extrabold tracking-normal text-white select-none drop-shadow-md w-full break-words transition-all ${isShortBibleText ? 'text-center' : 'text-left'}`}
                          style={{
                            fontSize: uniformBilingualFontCss,
                            lineHeight: 1.24,
                            textShadow: '0 2px 12px rgba(0, 0, 0, 0.9), 0 4px 25px rgba(0, 0, 0, 0.7)'
                          }}
                        >
                          {primaryVerseText}
                        </p>
                      </div>

                      {/* Right Column : Secondary Version */}
                      <div className={`flex flex-col justify-start md:border-l md:border-amber-400/25 md:pl-6 w-full ${isShortBibleText ? 'items-center text-center' : 'items-start text-left'}`}>
                        <p
                          className={`font-bold tracking-normal text-cyan-100/95 select-none drop-shadow-md w-full break-words transition-all ${isShortBibleText ? 'text-center' : 'text-left'}`}
                          style={{
                            fontSize: uniformBilingualFontCss,
                            lineHeight: 1.24,
                            textShadow: '0 2px 12px rgba(6, 182, 212, 0.4), 0 4px 25px rgba(0, 0, 0, 0.9)'
                          }}
                        >
                          {secondaryVerseText}
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Stacked / Subtitles for Bible */
                    <div 
                      key={`bible-bi-stacked-${displayState?.bibleReference || title}-${displayState?.slideIndex}`}
                      className={`w-full flex flex-col justify-center gap-3 sm:gap-4 animate-presentation-slide select-none ${isShortBibleText ? 'items-center text-center' : 'items-start text-left'}`}
                    >
                      {/* Section 1 : Version Principale */}
                      <p
                        className={`font-black tracking-normal text-white select-none drop-shadow-lg w-full break-words transition-all ${isShortBibleText ? 'text-center' : 'text-left'}`}
                        style={{
                          fontSize: uniformBilingualFontCss,
                          lineHeight: 1.22,
                          textShadow: '0 2px 12px rgba(0, 0, 0, 0.95), 0 4px 30px rgba(0, 0, 0, 0.8)'
                        }}
                      >
                        {primaryVerseText}
                      </p>

                      {/* Section 2 : Version Secondaire */}
                      {secondaryVerseText && (
                        <div className={`w-full pt-3 sm:pt-4 border-t border-amber-500/25 ${isShortBibleText ? 'text-center' : 'text-left'}`}>
                          <p
                            className={`font-semibold tracking-normal text-cyan-200/95 italic select-none w-full break-words transition-all ${isShortBibleText ? 'text-center' : 'text-left'}`}
                            style={{
                              fontSize: uniformBilingualFontCss,
                              lineHeight: 1.22,
                              textShadow: '0 2px 10px rgba(6, 182, 212, 0.5), 0 4px 20px rgba(0, 0, 0, 0.95)'
                            }}
                          >
                            {secondaryVerseText}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                ) : (
                  <div 
                    key={`bible-${displayState?.bibleReference || title}-${displayState?.slideIndex}`}
                    className={`w-full flex flex-col justify-center animate-presentation-slide select-none ${isShortBibleText ? 'items-center text-center' : 'items-start text-left'}`}
                  >
                    <p
                      className={`font-bold tracking-normal text-white select-none w-full break-words transition-all ${isShortBibleText ? 'text-center' : 'text-left'}`}
                      style={{
                        fontSize: uniformTextFontCss,
                        lineHeight: 1.24,
                        textShadow: '0 2px 10px rgba(0, 0, 0, 0.9), 0 6px 30px rgba(0, 0, 0, 0.75)'
                      }}
                    >
                      {primaryVerseText}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : displayState?.isBilingual && displayState?.secondaryLines && displayState.secondaryLines.length > 0 ? (
            displayState.bilingualFormat === 'columns' ? (
              <div 
                key={`bilingual-cols-${title}-${displayState?.slideIndex}`}
                className="max-w-7xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-14 items-center animate-presentation-slide select-none"
              >
                {/* Left Column : Original / Primary */}
                <div className="flex flex-col items-start justify-center text-left space-y-2 sm:space-y-3">
                  <div 
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 font-bold uppercase tracking-wider mb-1 transition-all self-start"
                    style={{ fontSize: `calc(clamp(0.75rem, 1.3vw, 1.15rem) * ${effectiveFontScale})` }}
                  >
                    <span>{displayState.primaryLanguage || 'Original'}</span>
                  </div>
                  {lines.map((line, idx) => (
                    <p
                      key={`p-${idx}`}
                      className="font-extrabold tracking-wide text-white leading-relaxed select-none transition-all drop-shadow-md text-left w-full"
                      style={{
                        fontSize: uniformBilingualFontCss,
                        lineHeight: 1.38,
                        textShadow: '0 2px 12px rgba(0, 0, 0, 0.9), 0 4px 25px rgba(0, 0, 0, 0.7)'
                      }}
                    >
                      {line}
                    </p>
                  ))}
                </div>

                {/* Right Column : Secondary / Translation */}
                <div className="flex flex-col items-start justify-center text-left space-y-2 sm:space-y-3 md:border-l md:border-white/15 md:pl-8">
                  <div 
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-200 font-bold uppercase tracking-wider mb-1 transition-all self-start"
                    style={{ fontSize: `calc(clamp(0.75rem, 1.3vw, 1.15rem) * ${effectiveFontScale})` }}
                  >
                    <span>{displayState.secondaryLanguage || 'Traduction'}</span>
                  </div>
                  {displayState.secondaryLines.map((line, idx) => (
                    <p
                      key={`s-${idx}`}
                      className="font-bold tracking-wide text-cyan-100/95 leading-relaxed select-none transition-all drop-shadow-md text-left w-full"
                      style={{
                        fontSize: uniformBilingualFontCss,
                        lineHeight: 1.38,
                        textShadow: '0 2px 12px rgba(6, 182, 212, 0.4), 0 4px 25px rgba(0, 0, 0, 0.9)'
                      }}
                    >
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            ) : (
              /* Stacked / Subtitles : Lignes originales au dessus, lignes traduites au dessous */
              <div 
                key={`bilingual-stacked-${title}-${displayState?.slideIndex}`}
                className="max-w-6xl w-full flex flex-col items-center justify-center gap-4 sm:gap-6 animate-presentation-slide select-none"
              >
                {lines.map((primaryLine, idx) => {
                  const secondaryLine = displayState.secondaryLines?.[idx];
                  return (
                    <div key={idx} className="flex flex-col items-center text-center space-y-1">
                      <p
                        className="font-black tracking-wide text-white leading-tight select-none drop-shadow-lg transition-all"
                        style={{
                          fontSize: uniformTextFontCss,
                          lineHeight: 1.3,
                          textShadow: '0 2px 12px rgba(0, 0, 0, 0.95), 0 4px 30px rgba(0, 0, 0, 0.8)'
                        }}
                      >
                        {primaryLine}
                      </p>
                      {secondaryLine && (
                        <p
                          className="font-semibold tracking-wide text-cyan-200/90 italic leading-snug select-none transition-all"
                          style={{
                            fontSize: uniformSecondarySongFontCss,
                            lineHeight: 1.35,
                            textShadow: '0 2px 10px rgba(6, 182, 212, 0.5), 0 4px 20px rgba(0, 0, 0, 0.95)'
                          }}
                        >
                          {secondaryLine}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <div 
              key={`${title}-${displayState?.slideIndex}`}
              className="max-w-7xl w-full flex flex-col items-center justify-center gap-3 sm:gap-5 animate-presentation-slide"
            >
              {lines.map((line, idx) => (
                <p
                  key={idx}
                  className="font-bold tracking-wide text-white leading-relaxed select-none transition-all"
                  style={{
                    fontSize: uniformTextFontCss,
                    lineHeight: 1.42,
                    textShadow: '0 2px 10px rgba(0, 0, 0, 0.85), 0 4px 25px rgba(0, 0, 0, 0.65)'
                  }}
                >
                  {line}
                </p>
              ))}
            </div>
          )
        ) : (
          <div className="text-gray-400 text-lg">En attente de diffusion...</div>
        )}
      </main>

      {/* Footer minimaliste (masqué pendant la projection média pour plein écran maximal) */}
      {!isMediaActive && (
      <footer className={`w-full shrink-0 ${isBibleSlide && !isCountdownActive ? 'px-3 sm:px-5 md:px-6 py-2.5 sm:py-3' : 'px-8 py-5'} relative z-20 flex items-center justify-center text-gray-300`}>
        {!isCountdownActive && !displayState?.media?.isActive && isBibleSlide ? (
          <div className="w-full flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <div
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-200 font-bold tracking-wider uppercase backdrop-blur-xs transition-all shadow-md"
              style={{ fontSize: 'clamp(0.75rem, 1.1vw, 0.95rem)' }}
            >
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
              <span>{bibleRefs.primaryRef}</span>
              {bibleRefs.primaryFullName && (
                <span className="text-amber-300/80 font-medium normal-case tracking-normal">
                  · {bibleRefs.primaryFullName}
                </span>
              )}
            </div>

            {displayState?.isBilingual && displayState?.secondaryLines && displayState.secondaryLines.length > 0 && (
              <div
                className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-200 font-bold tracking-wider uppercase backdrop-blur-xs transition-all shadow-md"
                style={{ fontSize: 'clamp(0.75rem, 1.1vw, 0.95rem)' }}
              >
                <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 shrink-0" />
                <span>{bibleRefs.secondaryRef}</span>
                {bibleRefs.secondaryFullName && (
                  <span className="text-cyan-300/80 font-medium normal-case tracking-normal">
                    · {bibleRefs.secondaryFullName}
                  </span>
                )}
              </div>
            )}

            {totalSlides > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (currentIdx < totalSlides) {
                    handleNext();
                  } else {
                    handleLocalNav(0);
                  }
                }}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-gray-100 font-bold tracking-wide backdrop-blur-xs transition-colors shadow-md cursor-pointer"
                style={{ fontSize: 'clamp(0.72rem, 1vw, 0.9rem)' }}
                title={currentIdx < totalSlides ? 'Passer à la slide suivante' : 'Revenir à la première slide'}
              >
                <span className="font-mono">{currentIdx}/{totalSlides}</span>
                {currentIdx < totalSlides && <ChevronRight className="w-3.5 h-3.5 text-amber-300" />}
              </button>
            )}
          </div>
        ) : (
          <div className="min-w-0 max-w-4xl text-center">
            <h2 
              className="font-medium text-gray-200 tracking-wide truncate drop-shadow flex items-center justify-center gap-2 transition-all"
              style={{ fontSize: `calc(clamp(0.875rem, 1.4vw, 1.25rem) * ${effectiveFontScale})` }}
            >
              {isCountdownActive 
                ? (displayState?.countdown?.title || "Bienvenue") 
                : displayState?.isBilingual && displayState?.secondarySongTitle
                ? (
                  <>
                    <span>{title}</span>
                    <span className="text-gray-500">•</span>
                    <span className="text-cyan-300 italic">{displayState.secondarySongTitle}</span>
                    {displayState.secondaryLanguage && (
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-300">
                        {displayState.secondaryLanguage}
                      </span>
                    )}
                  </>
                )
                : title}
            </h2>
          </div>
        )}
      </footer>
      )}

      {showControlsHint && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-gray-900/95 text-gray-300 text-xs px-4 py-2 rounded-full border border-gray-700/80 pointer-events-none transition-opacity shadow-2xl flex items-center gap-2 z-30">
          <span>Touche <strong>F</strong> : Plein écran</span>
          <span className="text-gray-600">•</span>
          <span><strong>B</strong> : Masquer</span>
          <span className="text-gray-600">•</span>
          <span>Flèches / Clic : Défiler</span>
        </div>
      )}
    </div>
  );
};
